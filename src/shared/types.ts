/**
 * Datenformat zwischen Daten-Job (pipeline/) und App (src/app/).
 * Kurze Schlüssel halten die JSON-Dateien klein; die Bedeutung steht hier.
 * Bei inkompatiblen Änderungen DATA_VERSION erhöhen.
 */
export const DATA_VERSION = 1;

export type GenreKey =
  | 'film'
  | 'serie'
  | 'sport'
  | 'doku'
  | 'nachrichten'
  | 'kinder'
  | 'show'
  | 'magazin'
  | 'musik'
  | 'sonstiges';

export type ChannelGroup =
  | 'haupt'
  | 'oeffentlich'
  | 'dritte'
  | 'privat'
  | 'info'
  | 'sport'
  | 'kinder'
  | 'spezial';

export interface Channel {
  /** Stabile, URL-taugliche ID, z. B. "daserste". */
  id: string;
  /** Anzeigename. */
  name: string;
  /** Kürzel für das Monogramm (max. 4 Zeichen). */
  short: string;
  group: ChannelGroup;
  /** Farbton (0–359) für das Monogramm, bewusst keine Markenfarbe. */
  hue: number;
}

export interface Programme {
  /** Stabile ID: `${channelId}-${start}` (Start in Sekunden). */
  i: string;
  /** Start, Unix-Sekunden (UTC). */
  s: number;
  /** Ende, Unix-Sekunden (UTC). */
  e: number;
  /** Titel. */
  t: string;
  /** Untertitel / Episodentitel. */
  st?: string;
  /** Beschreibung (Klartext, Absätze mit \n). */
  d?: string;
  /** Normalisiertes Genre. */
  g: GenreKey;
  /** Ursprüngliche Genre-Bezeichnung der Quelle, z. B. "Krimiserie". */
  gr?: string;
  /** Staffel/Folge, lesbar, z. B. "S2 F5/10" oder "Folge 8/13". */
  ep?: string;
  /** Produktionsjahr. */
  y?: number;
  /** Produktionsland/-länder, z. B. "D, A". */
  c?: string;
  /** Altersfreigabe (FSK/FSF) in Jahren. */
  fsk?: number;
  /** Wiederholung. */
  r?: 1;
  /** Neu / Erstausstrahlung. */
  n?: 1;
  /** Live. */
  l?: 1;
  /** Untertitel verfügbar. */
  ut?: 1;
  /** Audiodeskription verfügbar. */
  ad?: 1;
  /** Gebärdensprache. */
  dgs?: 1;
  /** IMDb-Wertung (0–10), sofern von der Quelle geliefert. */
  imdb?: number;
  /** Regie. */
  dir?: string;
  /** Darsteller (max. 6). */
  cast?: string[];
  /** Begründung, falls als Tipp markiert (z. B. "Spielfilm · IMDb 7,6"). */
  tip?: string;
  /** Punktwert für die Tipp-Sortierung. */
  ts?: number;
  /** Parallel laufende Regionalsendungen (z. B. NDR-Landesprogramme). */
  reg?: string[];
}

export interface DayFile {
  v: number;
  /** TV-Tag (beginnt 05:00 Uhr Berliner Zeit), Format YYYY-MM-DD. */
  day: string;
  generatedAt: string;
  /** Sendungen je Sender-ID, nach Start sortiert (ohne d/dir/cast, siehe DetailsFile). */
  p: Record<string, Programme[]>;
}

/** Ausführliche Felder je Sendung, getrennt geladen (details/<TV-Tag>.json). */
export interface ProgrammeDetails {
  d?: string;
  dir?: string;
  cast?: string[];
}

export interface DetailsFile {
  v: number;
  day: string;
  /** Sendungs-ID -> Details. */
  x: Record<string, ProgrammeDetails>;
}

export interface SourceStatus {
  id: string;
  name: string;
  ok: boolean;
  /** Anzahl geladener Sendungen. */
  count: number;
  message?: string;
}

export interface DataIndex {
  v: number;
  generatedAt: string;
  /** Verfügbare TV-Tage, aufsteigend. */
  days: string[];
  channels: Channel[];
  sources: SourceStatus[];
  /** Sender-IDs, deren Daten aus dem letzten guten Stand übernommen wurden. */
  stale: string[];
}
