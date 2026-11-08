import type { GenreKey } from '../src/shared/types.ts';

/** Zwischenformat aller Quellen vor dem Zusammenführen. Zeiten in Unix-Sekunden. */
export interface RawProgramme {
  s: number;
  e?: number;
  t: string;
  st?: string;
  d?: string;
  cats?: string[];
  g?: GenreKey;
  ep?: string;
  y?: number;
  c?: string;
  fsk?: number;
  r?: 1;
  n?: 1;
  l?: 1;
  ut?: 1;
  ad?: 1;
  dgs?: 1;
  imdb?: number;
  tipFlag?: 1;
  dir?: string;
  cast?: string[];
  local?: boolean;
}

/** Text säubern: HTML-Reste, literale "\n", doppelte Leerzeichen. */
export function cleanText(input: unknown): string | undefined {
  if (typeof input !== 'string') return undefined;
  const out = input
    .replace(/\\n/g, '\n')
    .replace(/\\(["'])/g, '$1')
    .replace(/\\+(?=\s|$)/g, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  // Einzelnes, nicht geschlossenes Anführungszeichen am Anfang schließen ("Titel -> "Titel")
  const balanced = out.startsWith('"') && out.split('"').length === 2 ? `${out}"` : out;
  return balanced || undefined;
}

/** Folgennummer aus Titeln wie "Rote Rosen (4417)" oder "Serie (9/15)" herauslösen. */
export function splitEpisodeFromTitle(title: string): { title: string; ep?: string } {
  const m = /^(.*\S)\s*\((\d{1,5})(?:\/(\d{1,5}))?\)$/.exec(title);
  if (!m || !m[1]) return { title };
  return { title: m[1], ep: m[3] ? `Folge ${m[2]}/${m[3]}` : `Folge ${m[2]}` };
}
