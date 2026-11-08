/**
 * Flimmer-Worker: liefert die statischen Dateien aus (Assets) und stellt eine kleine
 * Push-API bereit. Pro Gerät gibt es ein Durable Object, das Push-Abo und
 * Erinnerungszeiten speichert und sich per Alarm genau zur Erinnerungszeit weckt.
 *
 * Datensparsam: keine Konten, keine IP-Adressen, keine Nutzungsdaten. Gespeichert wird
 * nur, was für die Zustellung nötig ist; alles verfällt automatisch (siehe RETENTION).
 */
import { DurableObject } from 'cloudflare:workers';
import { sendPush, type PushTarget } from './webpush';

export interface Env {
  ASSETS: Fetcher;
  REMINDERS: DurableObjectNamespace<ReminderBox>;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  VAPID_SUBJECT: string;
  /** Nur lokal: beliebige Push-Endpunkte erlauben (Tests). */
  ALLOW_ANY_PUSH_ENDPOINT?: string;
}

export interface Reminder {
  /** Sendungs-ID */
  id: string;
  /** Zeitpunkt der Benachrichtigung, Unix-ms */
  at: number;
  title: string;
  body: string;
  url: string;
}

const MAX_REMINDERS = 300;
const MAX_BODY_BYTES = 64 * 1024;
/** Ohne Kontakt zum Gerät werden alle Daten nach 60 Tagen gelöscht. */
const RETENTION_MS = 60 * 24 * 3600 * 1000;
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];
const DEVICE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });

export function validateSubscription(sub: unknown, allowAny = false): PushTarget {
  const s = sub as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  if (!s || typeof s.endpoint !== 'string' || typeof s.keys?.p256dh !== 'string' || typeof s.keys?.auth !== 'string') {
    throw new Error('Ungültiges Push-Abo');
  }
  const url = new URL(s.endpoint);
  if (!allowAny && (url.protocol !== 'https:' || !PUSH_HOSTS.some((re) => re.test(url.hostname)))) {
    throw new Error('Unbekannter Push-Dienst');
  }
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(s.keys.p256dh) || !/^[A-Za-z0-9_-]{20,24}$/.test(s.keys.auth)) {
    throw new Error('Ungültige Schlüssel');
  }
  return { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } };
}

export function validateReminders(list: unknown, now = Date.now()): Reminder[] {
  if (!Array.isArray(list)) throw new Error('Erinnerungen fehlen');
  if (list.length > MAX_REMINDERS) throw new Error('Zu viele Erinnerungen');
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');
  return list
    .map((r) => {
      const x = r as Partial<Reminder>;
      return {
        id: str(x.id, 80),
        at: Number(x.at),
        title: str(x.title, 140),
        body: str(x.body, 240),
        url: str(x.url, 200).startsWith('/') ? str(x.url, 200) : '/',
      };
    })
    .filter((r) => r.id && r.title && Number.isFinite(r.at) && r.at > now - 3600_000 && r.at < now + 20 * 86400_000)
    .sort((a, b) => a.at - b.at);
}

export class ReminderBox extends DurableObject<Env> {
  async sync(subscription: PushTarget, reminders: Reminder[]): Promise<void> {
    await this.ctx.storage.put({ sub: subscription, reminders, seen: Date.now() });
    await this.schedule(reminders);
  }

  async remove(): Promise<void> {
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.deleteAll();
  }

  async test(): Promise<number> {
    const sub = await this.ctx.storage.get<PushTarget>('sub');
    if (!sub) return 404;
    const status = await this.push(sub, {
      title: 'Flimmer',
      body: 'Benachrichtigungen funktionieren. Du wirst vor deinen Sendungen erinnert.',
      url: '/#/merkliste',
      tag: 'flimmer-test',
    });
    if (status === 404 || status === 410) await this.remove();
    return status;
  }

  private async schedule(reminders: Reminder[]): Promise<void> {
    const seen = (await this.ctx.storage.get<number>('seen')) ?? Date.now();
    const next = reminders[0]?.at;
    // Nächste Erinnerung oder – ohne Erinnerungen – Löschtermin
    await this.ctx.storage.setAlarm(Math.max(Date.now() + 1000, next ?? seen + RETENTION_MS));
  }

  private push(sub: PushTarget, payload: { title: string; body: string; url: string; tag: string }): Promise<number> {
    return sendPush(sub, payload, {
      subject: this.env.VAPID_SUBJECT,
      publicKey: this.env.VAPID_PUBLIC_KEY,
      privateKey: this.env.VAPID_PRIVATE_KEY,
    });
  }

  async alarm(): Promise<void> {
    const now = Date.now();
    const sub = await this.ctx.storage.get<PushTarget>('sub');
    const reminders = (await this.ctx.storage.get<Reminder[]>('reminders')) ?? [];
    const seen = (await this.ctx.storage.get<number>('seen')) ?? 0;
    if (!sub || (!reminders.length && now - seen > RETENTION_MS)) {
      await this.remove();
      return;
    }
    const due = reminders.filter((r) => r.at <= now + 15_000);
    const rest = reminders.filter((r) => r.at > now + 15_000);
    for (const r of due) {
      if (now - r.at > 15 * 60_000) continue; // viel zu spät -> nicht mehr stören
      const status = await this.push(sub, { title: r.title, body: r.body, url: r.url, tag: r.id });
      if (status === 404 || status === 410) {
        await this.remove(); // Abo abgelaufen oder widerrufen
        return;
      }
    }
    await this.ctx.storage.put('reminders', rest);
    await this.schedule(rest);
  }
}

async function handleApi(req: Request, env: Env, url: URL): Promise<Response> {
  if (url.pathname === '/api/push/config' && req.method === 'GET') {
    return json({ publicKey: env.VAPID_PUBLIC_KEY });
  }
  const m = /^\/api\/push\/device\/([^/]+)(\/test)?$/.exec(url.pathname);
  if (!m || !DEVICE_RE.test(m[1]!)) return json({ error: 'Nicht gefunden' }, 404);
  // Nur Anfragen von der eigenen Seite (einfacher Schutz gegen Missbrauch fremder Seiten)
  const origin = req.headers.get('Origin');
  if (req.method !== 'GET' && origin && origin !== url.origin) return json({ error: 'Falscher Ursprung' }, 403);
  const box = env.REMINDERS.get(env.REMINDERS.idFromName(m[1]!));

  if (m[2] && req.method === 'POST') {
    const status = await box.test();
    return json({ status }, status >= 200 && status < 300 ? 200 : 502);
  }
  if (req.method === 'PUT') {
    const len = Number(req.headers.get('Content-Length') ?? 0);
    if (len > MAX_BODY_BYTES) return json({ error: 'Zu groß' }, 413);
    try {
      const data = (await req.json()) as { subscription?: unknown; reminders?: unknown };
      const sub = validateSubscription(data.subscription, env.ALLOW_ANY_PUSH_ENDPOINT === '1');
      const reminders = validateReminders(data.reminders);
      await box.sync(sub, reminders);
      return json({ ok: true, scheduled: reminders.length });
    } catch (err) {
      return json({ error: (err as Error).message }, 400);
    }
  }
  if (req.method === 'DELETE') {
    await box.remove();
    return json({ ok: true });
  }
  return json({ error: 'Methode nicht erlaubt' }, 405);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(req, env, url);
      } catch {
        return json({ error: 'Serverfehler' }, 500);
      }
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
