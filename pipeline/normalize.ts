import { genreFromCategories, genreFromTitle } from '../src/shared/genres.ts';
import { berlinParts, formatDuration } from '../src/shared/time.ts';
import type { GenreKey, Programme } from '../src/shared/types.ts';
import type { RawProgramme } from './raw.ts';

const MAX_DURATION = 24 * 3600;
const DEFAULT_DURATION = 30 * 60;
const MAX_GAP_FILL = 4 * 3600;

/** Titel für Vergleiche vereinfachen. */
export function normTitle(t: string): string {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function similarTitles(a: string, b: string): boolean {
  const na = normTitle(a);
  const nb = normTitle(b);
  if (!na || !nb) return false;
  if (na === nb || na.startsWith(nb) || nb.startsWith(na)) return true;
  const ta = new Set(na.split(' ').filter((w) => w.length > 2));
  const tb = nb.split(' ').filter((w) => w.length > 2);
  if (!ta.size || !tb.length) return false;
  const common = tb.filter((w) => ta.has(w)).length;
  return common / Math.min(ta.size, tb.length) >= 0.6;
}

/**
 * Reichert Sendungen der Hauptquelle mit Feldern der Zusatzquelle an
 * (gleicher Sender, Startzeit ±10 Min., ähnlicher Titel).
 */
export function enrich(base: RawProgramme[], extra: RawProgramme[]): RawProgramme[] {
  const sorted = [...extra].sort((a, b) => a.s - b.s);
  return base.map((p) => {
    let best: RawProgramme | undefined;
    let bestDelta = Infinity;
    for (const x of sorted) {
      if (x.s < p.s - 600) continue;
      if (x.s > p.s + 600) break;
      const delta = Math.abs(x.s - p.s);
      if (delta < bestDelta && similarTitles(p.t, x.t)) {
        best = x;
        bestDelta = delta;
      }
    }
    if (!best) return p;
    const out: RawProgramme = { ...p };
    if (best.cats) out.cats = best.cats;
    if (!out.ep && best.ep) out.ep = best.ep;
    if (!out.st && best.st) out.st = best.st;
    if (!out.d && best.d) out.d = best.d;
    if (best.y) out.y = best.y;
    if (best.c) out.c = best.c;
    if (best.imdb) out.imdb = best.imdb;
    if (best.tipFlag) out.tipFlag = 1;
    if (best.r) out.r = 1;
    if (best.n) out.n = 1;
    if (best.l) out.l = 1;
    if (best.dir) out.dir = best.dir;
    if (best.cast) out.cast = best.cast;
    if (out.fsk === undefined && best.fsk !== undefined) out.fsk = best.fsk;
    return out;
  });
}

export function detectGenre(p: RawProgramme, fallback?: GenreKey): GenreKey {
  return (
    genreFromCategories(p.cats ?? []) ??
    genreFromTitle(p.t, p.st) ??
    (p.ep ? 'serie' : undefined) ??
    fallback ??
    'sonstiges'
  );
}

/** Tipp-Logik: nachvollziehbare Gründe statt Clickbait. */
export function computeTip(p: Programme): { tip: string; ts: number } | undefined {
  const dur = p.e - p.s;
  if (dur < 40 * 60) return undefined;
  const { h, mi } = berlinParts(p.s * 1000);
  const minutes = h * 60 + mi;
  const evening = minutes >= 19 * 60 && minutes <= 23 * 60 + 30;
  if (!evening) return undefined;
  const reasons: string[] = [];
  let score = 0;
  if (p.g === 'film') {
    if (p.imdb && p.imdb >= 7) {
      score += 40 + p.imdb * 5;
      reasons.push(`Spielfilm · IMDb ${p.imdb.toFixed(1).replace('.', ',')}`);
    } else if (p.imdb && p.imdb >= 6.5 && !p.r) {
      score += 30 + p.imdb * 3;
      reasons.push(`Spielfilm · IMDb ${p.imdb.toFixed(1).replace('.', ',')}`);
    }
    if (p.n) {
      score += 25;
      reasons.push('Erstausstrahlung');
    }
  }
  if (p.g === 'sport' && p.l) {
    score += 50;
    reasons.push(`Live-Sport · ${formatDuration(dur / 60)}`);
  }
  if ((p.g === 'serie' || p.g === 'doku') && p.n && !p.r) {
    score += 35;
    reasons.push(p.g === 'serie' ? 'Neue Folge' : 'Neue Doku');
  }
  if (p.imdb === undefined && p.g === 'film' && /^(tatort|polizeiruf 110)\b/i.test(p.t) && !p.r) {
    score += 55;
    reasons.push('Sonntagskrimi');
  }
  if (score < 50 || !reasons.length) return undefined;
  if (minutes >= 20 * 60 && minutes <= 20 * 60 + 30) score += 5;
  return { tip: reasons.join(' · '), ts: Math.round(score) };
}

/** Bereinigt eine Senderliste: Sortierung, Dubletten, Lücken, Überlappungen. */
export function finalizeChannel(channelId: string, raws: RawProgramme[], fallbackGenre?: GenreKey): Programme[] {
  const sorted = raws
    .filter((p) => Number.isFinite(p.s) && p.t)
    .sort((a, b) => a.s - b.s || (a.local ? 1 : 0) - (b.local ? 1 : 0));

  // Regionalfenster (mehrere Sendungen mit identischem Start) zusammenfassen.
  const grouped: (RawProgramme & { reg?: string[] })[] = [];
  for (const p of sorted) {
    const prev = grouped[grouped.length - 1];
    if (prev && prev.s === p.s) {
      if (normTitle(prev.t) !== normTitle(p.t) && (p.local || prev.local)) {
        prev.reg = [...(prev.reg ?? []), p.t].filter((t, i, a) => a.indexOf(t) === i);
      }
      if (!prev.e && p.e) prev.e = p.e;
      continue;
    }
    grouped.push({ ...p });
  }

  const out: Programme[] = [];
  for (let i = 0; i < grouped.length; i++) {
    const p = grouped[i]!;
    const next = grouped[i + 1];
    let e = p.e;
    if (!e || e <= p.s) {
      e = next && next.s - p.s <= MAX_GAP_FILL ? next.s : p.s + DEFAULT_DURATION;
    }
    if (next && e > next.s) e = next.s; // Überlappung kappen
    if (e - p.s < 60 || e - p.s > MAX_DURATION) continue;
    const g = detectGenre(p, fallbackGenre);
    const prog: Programme = { i: `${channelId}-${p.s}`, s: p.s, e, t: p.t, g };
    if (p.st) prog.st = p.st;
    if (p.d) prog.d = p.d;
    const rawGenre = p.cats?.[0];
    if (rawGenre && rawGenre.length < 40) prog.gr = rawGenre;
    if (p.ep) prog.ep = p.ep;
    if (p.y && (g === 'film' || g === 'serie' || g === 'doku' || g === 'kinder')) prog.y = p.y;
    if (p.c && (g === 'film' || g === 'serie' || g === 'doku')) prog.c = p.c;
    if (p.fsk !== undefined) prog.fsk = p.fsk;
    if (p.r) prog.r = 1;
    if (p.n) prog.n = 1;
    if (p.l) prog.l = 1;
    if (p.ut) prog.ut = 1;
    if (p.ad) prog.ad = 1;
    if (p.dgs) prog.dgs = 1;
    if (p.imdb && (g === 'film' || g === 'serie' || g === 'doku')) prog.imdb = p.imdb;
    if (p.dir) prog.dir = p.dir;
    if (p.cast) prog.cast = p.cast;
    if (p.reg?.length) prog.reg = p.reg;
    const tip = computeTip(prog);
    if (tip) {
      prog.tip = tip.tip;
      prog.ts = tip.ts;
    }
    out.push(prog);
  }
  return out;
}
