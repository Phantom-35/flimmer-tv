/**
 * Web Push ohne Abhängigkeiten, nur mit WebCrypto (läuft in Cloudflare Workers und Node ≥ 20).
 * - Nachrichtenverschlüsselung nach RFC 8291 (aes128gcm, RFC 8188)
 * - Absenderauthentifizierung per VAPID (RFC 8292, ES256-JWT)
 */

const enc = new TextEncoder();
/** Byte-Array mit normalem ArrayBuffer (für WebCrypto-Typen). */
export type Bytes = Uint8Array<ArrayBuffer>;
const utf8 = (t: string): Bytes => enc.encode(t) as Bytes;

export function b64urlEncode(data: ArrayBuffer | Uint8Array): string {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function b64urlDecode(s: string): Bytes {
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, length: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export interface EncryptOptions {
  /** Nur für Tests (RFC-Testvektor): fester Salt und festes Server-Schlüsselpaar. */
  salt?: Bytes;
  serverKeys?: { privateJwk: JsonWebKey; publicRaw: Bytes };
}

/** Verschlüsselt eine Nachricht für ein Push-Abo (Content-Encoding: aes128gcm). */
export async function encryptPayload(plaintext: Bytes, keys: PushSubscriptionKeys, opts: EncryptOptions = {}): Promise<Bytes> {
  const uaPublic = b64urlDecode(keys.p256dh);
  const authSecret = b64urlDecode(keys.auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16) throw new Error('Ungültige Abo-Schlüssel');

  let asPrivate: CryptoKey;
  let asPublic: Bytes;
  if (opts.serverKeys) {
    asPrivate = await crypto.subtle.importKey('jwk', opts.serverKeys.privateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
    asPublic = opts.serverKeys.publicRaw;
  } else {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    asPrivate = pair.privateKey;
    asPublic = new Uint8Array((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer);
  }
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  // 'public' (Web-Standard) und '$public' (Name in den Cloudflare-Typen) – beide setzen.
  const ecdhParams = { name: 'ECDH', public: uaKey, $public: uaKey } as unknown as Parameters<typeof crypto.subtle.deriveBits>[0];
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(ecdhParams, asPrivate, 256));

  const keyInfo = concat(utf8('WebPush: info\0'), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const salt: Bytes = opts.salt ?? (crypto.getRandomValues(new Uint8Array(16)) as Bytes);
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  // Ein einziger Datensatz: Klartext + Begrenzer 0x02 (letzter Datensatz)
  const padded = concat(plaintext, new Uint8Array([2]));
  const aesKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded));

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cipher);
}

/** Erzeugt den VAPID-Authorization-Header (gültig 12 h). */
export async function vapidAuthorization(endpoint: string, subject: string, publicKey: string, privateKeyD: string): Promise<string> {
  const pub = b64urlDecode(publicKey);
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    d: privateKeyD,
    x: b64urlEncode(pub.slice(1, 33)),
    y: b64urlEncode(pub.slice(33, 65)),
    ext: true,
  };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64urlEncode(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64urlEncode(
    utf8(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: subject })),
  );
  const unsigned = `${header}.${claims}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(unsigned));
  return `vapid t=${unsigned}.${b64urlEncode(sig)}, k=${publicKey}`;
}

export interface PushTarget {
  endpoint: string;
  keys: PushSubscriptionKeys;
}

export interface VapidConfig {
  subject: string;
  publicKey: string;
  privateKey: string;
}

/** Sendet eine Push-Nachricht. Rückgabe: HTTP-Status des Push-Dienstes. */
export async function sendPush(target: PushTarget, payload: unknown, vapid: VapidConfig, ttlSeconds = 3600): Promise<number> {
  const body = await encryptPayload(utf8(JSON.stringify(payload)), target.keys);
  const res = await fetch(target.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidAuthorization(target.endpoint, vapid.subject, vapid.publicKey, vapid.privateKey),
      TTL: String(ttlSeconds),
      Urgency: 'high',
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
    },
    body,
  });
  return res.status;
}
