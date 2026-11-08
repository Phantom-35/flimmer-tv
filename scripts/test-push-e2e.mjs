/**
 * Ende-zu-Ende-Test der Push-Erinnerungen gegen `wrangler dev` (lokal, mit Durable Object + Alarm).
 * Ein Mock-Push-Dienst nimmt die Nachricht entgegen, prüft die VAPID-Signatur und entschlüsselt sie
 * mit dem privaten Schlüssel des "Browsers" – genau wie ein echter Browser.
 *
 *   1) .dev.vars mit VAPID_PRIVATE_KEY und ALLOW_ANY_PUSH_ENDPOINT=1 anlegen
 *   2) npx wrangler dev --port 8787
 *   3) node scripts/test-push-e2e.mjs
 */
import http from 'node:http';
import { randomUUID } from 'node:crypto';

const API = process.env.API ?? 'http://127.0.0.1:8787';
const b64u = (b) => Buffer.from(b).toString('base64url');
const fromB64u = (s) => new Uint8Array(Buffer.from(s, 'base64url'));

// "Browser"-Schlüssel
const ua = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
const uaPublic = new Uint8Array(await crypto.subtle.exportKey('raw', ua.publicKey));
const auth = crypto.getRandomValues(new Uint8Array(16));

async function decrypt(body) {
  const salt = body.slice(0, 16);
  const idlen = body[20];
  const asPublic = body.slice(21, 21 + idlen);
  const cipher = body.slice(21 + idlen);
  const pub = await crypto.subtle.importKey('raw', asPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: pub }, ua.privateKey, 256));
  const h = async (s, ikm, info, n) => {
    const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
    return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: s, info: typeof info === 'string' ? new TextEncoder().encode(info) : info }, k, n * 8));
  };
  const ikm = await h(auth, ecdh, new Uint8Array([...new TextEncoder().encode('WebPush: info\0'), ...uaPublic, ...asPublic]), 32);
  const cek = await h(salt, ikm, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = await h(salt, ikm, 'Content-Encoding: nonce\0', 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt']);
  const plain = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, key, cipher));
  return JSON.parse(new TextDecoder().decode(plain.slice(0, -1)));
}

const received = [];
const server = http.createServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = new Uint8Array(Buffer.concat(chunks));
  const authz = req.headers.authorization ?? '';
  const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(authz);
  let vapidOk = false;
  if (m) {
    const key = await crypto.subtle.importKey('raw', fromB64u(m[4]), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    vapidOk = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromB64u(m[3]), new TextEncoder().encode(`${m[1]}.${m[2]}`));
  }
  try {
    received.push({ at: Date.now(), vapidOk, encoding: req.headers['content-encoding'], ttl: req.headers.ttl, payload: await decrypt(body) });
  } catch (e) {
    received.push({ error: String(e) });
  }
  res.writeHead(201).end();
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const endpoint = `http://127.0.0.1:${server.address().port}/push/${randomUUID()}`;
const subscription = { endpoint, keys: { p256dh: b64u(uaPublic), auth: b64u(auth) } };
const device = randomUUID();
const call = (method, path, body) =>
  fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json() }));

const fails = [];
const check = (cond, msg) => (cond ? console.log('  ✔', msg) : (fails.push(msg), console.log('  ✘', msg)));

console.log('Push-E2E gegen', API);
const cfg = await call('GET', '/api/push/config');
check(cfg.status === 200 && cfg.json.publicKey?.length === 87, 'Konfiguration liefert öffentlichen VAPID-Schlüssel');

const bad = await call('PUT', `/api/push/device/${device}`, { subscription: { endpoint: 'x' }, reminders: [] });
check(bad.status === 400, 'Ungültiges Abo wird abgelehnt');

const at = Date.now() + 4000;
const put = await call('PUT', `/api/push/device/${device}`, {
  subscription,
  reminders: [
    { id: 'zdf-1', at, title: 'Tatort', body: '20:15 · Das Erste – beginnt in 5 Min.', url: '/#/merkliste' },
    { id: 'zdf-2', at: Date.now() + 3600_000, title: 'Später', body: 'x', url: '/' },
  ],
});
check(put.status === 200 && put.json.scheduled === 2, 'Abo + 2 Erinnerungen gespeichert');

const test = await call('POST', `/api/push/device/${device}/test`);
check(test.status === 200, 'Test-Benachrichtigung zugestellt');

await new Promise((r) => setTimeout(r, 9000));
const t = received.find((r) => r.payload?.tag === 'flimmer-test');
check(t && t.vapidOk && t.encoding === 'aes128gcm', 'Test-Push: VAPID gültig, aes128gcm, entschlüsselbar');
const due = received.find((r) => r.payload?.tag === 'zdf-1');
check(due && due.payload.title === 'Tatort' && due.vapidOk, 'Erinnerung kam per Alarm zum geplanten Zeitpunkt');
check(due && Math.abs(due.at - at) < 5000, `Pünktlich (Abweichung ${due ? Math.round((due.at - at) / 1000) : '?'} s)`);
check(!received.some((r) => r.payload?.tag === 'zdf-2'), 'Spätere Erinnerung noch nicht gesendet');
check(!received.some((r) => r.error), 'Alle Nachrichten entschlüsselbar');

const del = await call('DELETE', `/api/push/device/${device}`);
const after = await call('POST', `/api/push/device/${device}/test`);
check(del.status === 200 && after.json.status === 404, 'Löschen entfernt Abo und Erinnerungen');

server.close();
console.log(fails.length ? `\n${fails.length} Fehler` : '\nAlles ok');
process.exit(fails.length ? 1 : 0);
