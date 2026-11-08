import { describe, expect, it } from 'vitest';
import { b64urlDecode, b64urlEncode, encryptPayload, vapidAuthorization, type Bytes } from '../../worker/webpush';

/** Unabhängige Entschlüsselung (Sicht des Browsers) zur Gegenprobe. */
async function decrypt(body: Bytes, uaPrivateJwk: JsonWebKey, uaPublic: Bytes, auth: Bytes): Promise<string> {
  const salt = body.slice(0, 16);
  const idlen = body[20]!;
  const asPublic = body.slice(21, 21 + idlen);
  const cipher = body.slice(21 + idlen);
  const priv = await crypto.subtle.importKey('jwk', uaPrivateJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits']);
  const pub = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, priv, 256));
  const h = async (s: Bytes, ikm: Bytes, info: string | Bytes, n: number) => {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    const i = typeof info === 'string' ? (new TextEncoder().encode(info) as Bytes) : info;
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info: i }, k, n * 8));
  };
  const keyInfo = new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...uaPublic, ...asPublic]);
  const ikm = await h(auth, ecdh, keyInfo, 32);
  const cek = await h(salt, ikm, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = await h(salt, ikm, 'Content-Encoding: nonce\0', 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher));
  expect(plain[plain.length - 1]).toBe(2); // Begrenzer des letzten Datensatzes
  return new TextDecoder().decode(plain.slice(0, -1));
}

describe('Web Push (RFC 8291)', () => {
  it('erzeugt exakt den Testvektor aus RFC 8291, Anhang A', async () => {
    const asPublicRaw = b64urlDecode('BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8');
    const privateJwk: JsonWebKey = {
      kty: 'EC',
      crv: 'P-256',
      d: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
      x: b64urlEncode(asPublicRaw.slice(1, 33)),
      y: b64urlEncode(asPublicRaw.slice(33, 65)),
    };
    const body = await encryptPayload(
      (new TextEncoder().encode('When I grow up, I want to be a watermelon') as Bytes),
      { p256dh: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4', auth: 'BTBZMqHH6r4Tts7J_aSIgg' },
      { salt: b64urlDecode('DGv6ra1nlYgDCS1FRnbzlw'), serverKeys: { privateJwk, publicRaw: asPublicRaw } },
    );
    expect(b64urlEncode(body)).toBe(
      'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
    );
  });

  it('lässt sich vom Empfänger entschlüsseln (zufällige Schlüssel)', async () => {
    const ua = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair;
    const uaPublic = new Uint8Array((await crypto.subtle.exportKey('raw', ua.publicKey)) as ArrayBuffer);
    const uaPrivJwk = (await crypto.subtle.exportKey('jwk', ua.privateKey)) as JsonWebKey;
    const auth = crypto.getRandomValues(new Uint8Array(16)) as Bytes;
    const msg = JSON.stringify({ title: 'Tatort', body: '20:15 · Das Erste – beginnt in 5 Min.' });
    const body = await encryptPayload(new TextEncoder().encode(msg) as Bytes, { p256dh: b64urlEncode(uaPublic), auth: b64urlEncode(auth) });
    expect(await decrypt(body, uaPrivJwk, uaPublic, auth)).toBe(msg);
  });

  it('signiert ein gültiges VAPID-JWT', async () => {
    const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair;
    const pub = b64urlEncode((await crypto.subtle.exportKey('raw', pair.publicKey)) as ArrayBuffer);
    const d = ((await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey).d!;
    const header = await vapidAuthorization('https://web.push.apple.com/abc', 'mailto:test@example.org', pub, d);
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(header)!;
    expect(m[4]).toBe(pub);
    const claims = JSON.parse(new TextDecoder().decode(b64urlDecode(m[2]!)));
    expect(claims.aud).toBe('https://web.push.apple.com');
    expect(claims.sub).toBe('mailto:test@example.org');
    const ok = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      pair.publicKey,
      b64urlDecode(m[3]!),
      new TextEncoder().encode(`${m[1]}.${m[2]}`) as Bytes,
    );
    expect(ok).toBe(true);
  });
});
