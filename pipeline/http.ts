export const USER_AGENT =
  'FlimmerEPG/1.0 (privates, nicht-kommerzielles TV-Programm-Projekt; 1 Abruf je Quelle alle 6 h)';

export interface FetchOptions {
  timeoutMs?: number;
  retries?: number;
  init?: RequestInit;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** fetch mit Timeout und exponentiellem Backoff. 404 wird nicht wiederholt. */
export async function fetchWithRetry(url: string, opts: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = 30000, retries = 3, init } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*', ...(init?.headers ?? {}) },
      });
      if (res.ok || res.status === 404) return res;
      lastErr = new Error(`HTTP ${res.status} für ${url}`);
      if (res.status < 500 && res.status !== 429) break;
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
    if (attempt < retries) await sleep(1000 * 2 ** attempt);
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** Führt Aufgaben mit begrenzter Parallelität aus (schont die Quellen). */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const idx = next++;
      results[idx] = await fn(items[idx] as T);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
