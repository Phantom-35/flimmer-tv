import { describe, expect, it } from 'vitest';
import { mapArdSlot } from '../../pipeline/ard';
import { computeTip, detectGenre, enrich, finalizeChannel, similarTitles } from '../../pipeline/normalize';
import { cleanText, splitEpisodeFromTitle, type RawProgramme } from '../../pipeline/raw';
import { formatOnscreenEpisode, parseXmltv, parseXmltvTime, shortenDescription } from '../../pipeline/xmltv';
import { genreFromCategories, genreFromTitle } from '../../src/shared/genres';
import type { Programme } from '../../src/shared/types';

const T = (iso: string) => Math.floor(Date.parse(iso) / 1000);

describe('Textbereinigung', () => {
  it('entfernt HTML, Escapes und doppelte Leerzeichen', () => {
    expect(cleanText('Hallo<br/>Welt  &amp; mehr\\n\\nNeu')).toBe('Hallo\nWelt & mehr\n\nNeu');
    expect(cleanText('\\"Restaurant Herzstück\\')).toBe('"Restaurant Herzstück"');
    expect(cleanText('   ')).toBeUndefined();
    expect(cleanText(42)).toBeUndefined();
  });
  it('löst Folgennummern aus Titeln', () => {
    expect(splitEpisodeFromTitle('Rote Rosen (4417)')).toEqual({ title: 'Rote Rosen', ep: 'Folge 4417' });
    expect(splitEpisodeFromTitle('Wilder Westen (9/15)')).toEqual({ title: 'Wilder Westen', ep: 'Folge 9/15' });
    expect(splitEpisodeFromTitle('Tagesschau')).toEqual({ title: 'Tagesschau' });
  });
});

describe('XMLTV', () => {
  it('parst Zeiten mit Offset', () => {
    expect(parseXmltvTime('20261108191500 +0000')).toBe(T('2026-11-08T19:15:00Z'));
    expect(parseXmltvTime('20261108201500 +0100')).toBe(T('2026-11-08T19:15:00Z'));
    expect(parseXmltvTime('kaputt')).toBeUndefined();
  });
  it('formatiert Staffel/Folge', () => {
    expect(formatOnscreenEpisode('S1 E3/30')).toBe('Staffel 1, Folge 3/30');
    expect(formatOnscreenEpisode('E2')).toBe('Folge 2');
    expect(formatOnscreenEpisode('S12')).toBe('Staffel 12');
  });
  it('kürzt Beschreibungen auf den ersten Absatz', () => {
    expect(shortenDescription('Inhalt.\n\nKritik der Redaktion.')).toBe('Inhalt.');
    const long = 'Satz eins ist hier. '.repeat(40);
    const out = shortenDescription(long)!;
    expect(out.length).toBeLessThanOrEqual(500);
    expect(out.endsWith('.')).toBe(true);
  });
  it('liest ein vollständiges Dokument', () => {
    const xml = `<?xml version="1.0"?><tv>
      <programme start="20261108191500 +0000" stop="20261108204500 +0000" channel="ZDF.de">
        <title lang="de">Ein Film</title><sub-title lang="de">Teil 1</sub-title>
        <desc lang="de">Handlung.\\n\\nKritik.</desc>
        <category lang="de">Thriller</category><date>2019</date><country>D</country>
        <episode-num system="onscreen">S2 E5/10</episode-num>
        <rating system="FSK"><value>12</value></rating>
        <rating system="IMDB"><value>7.4</value></rating>
        <previously-shown />
        <credits><director>Jane Doe</director><actor role="A">Max Muster</actor><actor>Erika Muster</actor></credits>
      </programme>
      <programme start="20261108204500 +0000" channel="Fremd.de"><title>X</title></programme>
    </tv>`;
    const res = parseXmltv(xml, new Set(['ZDF.de']));
    expect([...res.keys()]).toEqual(['ZDF.de']);
    const p = res.get('ZDF.de')![0]!;
    expect(p).toMatchObject({
      t: 'Ein Film',
      st: 'Teil 1',
      d: 'Handlung.',
      cats: ['Thriller'],
      y: 2019,
      c: 'D',
      ep: 'Staffel 2, Folge 5/10',
      fsk: 12,
      imdb: 7.4,
      r: 1,
      dir: 'Jane Doe',
      cast: ['Max Muster', 'Erika Muster'],
    });
    expect(p.e! - p.s).toBe(90 * 60);
  });
});

describe('ARD-Programm-API', () => {
  it('übersetzt einen Slot', () => {
    const p = mapArdSlot({
      title: 'Tierdetektive (8/13)',
      subline: 'Katze Tara',
      synopsis: 'Text',
      broadcastedOn: '2026-11-08T05:30:00+01:00',
      broadcastEnd: '2026-11-08T05:55:00+01:00',
      maturityContentRating: 'FSK6',
      binaryFeatures: ['UT', 'AD'],
    })!;
    expect(p).toMatchObject({ t: 'Tierdetektive', ep: 'Folge 8/13', st: 'Katze Tara', fsk: 6, ut: 1, ad: 1 });
    expect(p.s).toBe(T('2026-11-08T04:30:00Z'));
    expect(mapArdSlot({ title: 'ohne Zeit' })).toBeUndefined();
  });
});

describe('Genres', () => {
  it('erkennt Genres aus Kategorien (spezifisch vor allgemein)', () => {
    expect(genreFromCategories(['Krimiserie'])).toBe('serie');
    expect(genreFromCategories(['Dokusoap'])).toBe('show');
    expect(genreFromCategories(['Dokumentarfilm'])).toBe('doku');
    expect(genreFromCategories(['Thriller'])).toBe('film');
    expect(genreFromCategories(['Fußball'])).toBe('sport');
    expect(genreFromCategories(['Zeichentrickserie'])).toBe('kinder');
    expect(genreFromCategories(['Kuppelsoap'])).toBe('show');
    expect(genreFromCategories(['Jugendmagazin'])).toBe('magazin');
    expect(genreFromCategories([])).toBeUndefined();
  });
  it('erkennt Genres aus Titeln', () => {
    expect(genreFromTitle('Tagesschau')).toBe('nachrichten');
    expect(genreFromTitle('Tatort: Frei wie ein Adler')).toBe('film');
    expect(genreFromTitle('Sportschau')).toBe('sport');
    expect(genreFromTitle('In aller Freundschaft')).toBe('serie');
    expect(genreFromTitle('Irgendwas')).toBeUndefined();
  });
  it('fällt auf Senderstandard zurück', () => {
    expect(detectGenre({ s: 0, t: 'Unbekannt' }, 'kinder')).toBe('kinder');
    expect(detectGenre({ s: 0, t: 'Unbekannt', ep: 'Folge 2' })).toBe('serie');
    expect(detectGenre({ s: 0, t: 'Unbekannt' })).toBe('sonstiges');
  });
});

describe('Bereinigen & Zusammenführen', () => {
  const base = T('2026-11-08T19:00:00Z');
  it('sortiert, füllt fehlende Enden, kappt Überlappungen und entfernt Unsinn', () => {
    const raws: RawProgramme[] = [
      { s: base + 3600, t: 'B' },
      { s: base, e: base + 4000, t: 'A' }, // überlappt B
      { s: base + 7200, e: base + 7200, t: 'C' }, // Ende == Start -> wird aufgefüllt
      { s: base + 9000, e: base + 9000 + 30 * 3600, t: 'D' }, // > 24 h -> verworfen
    ];
    const out = finalizeChannel('x', raws);
    expect(out.map((p) => p.t)).toEqual(['A', 'B', 'C']);
    expect(out[0]!.e).toBe(base + 3600);
    expect(out[1]!.e).toBe(base + 7200);
    expect(out[2]!.e).toBe(base + 9000);
    expect(out[0]!.i).toBe(`x-${base}`);
  });
  it('fasst Regionalfenster zusammen', () => {
    const out = finalizeChannel('ndr', [
      { s: base, e: base + 1800, t: 'Nordmagazin', local: true },
      { s: base, e: base + 1800, t: 'Hamburg Journal', local: true },
      { s: base, e: base + 1800, t: 'Hallo Niedersachsen', local: true },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.reg).toEqual(['Hamburg Journal', 'Hallo Niedersachsen']);
  });
  it('ergänzt ARD-Daten aus XMLTV', () => {
    const ard: RawProgramme[] = [{ s: base, e: base + 5400, t: 'Tatort: Frei wie ein Adler', d: 'ARD-Text' }];
    const xml: RawProgramme[] = [{ s: base + 120, t: 'Tatort', cats: ['Krimi'], y: 2026, c: 'CH', d: 'Andere' }];
    const [p] = enrich(ard, xml);
    expect(p).toMatchObject({ cats: ['Krimi'], y: 2026, c: 'CH', d: 'ARD-Text' });
    expect(enrich(ard, [{ s: base + 3600, t: 'Tatort' }])[0]!.cats).toBeUndefined();
  });
  it('vergleicht Titel tolerant', () => {
    expect(similarTitles('Tatort: Frei wie ein Adler', 'Tatort')).toBe(true);
    expect(similarTitles('Die Sendung mit der Maus', 'Sendung mit der Maus, Die')).toBe(true);
    expect(similarTitles('Tagesschau', 'Sportschau')).toBe(false);
  });
});

describe('Tipps', () => {
  const at2015 = T('2026-11-08T19:15:00Z');
  const film = (over: Partial<Programme>): Programme => ({ i: 'x', s: at2015, e: at2015 + 6000, t: 'Film', g: 'film', ...over });
  it('begründet Tipps nachvollziehbar', () => {
    expect(computeTip(film({ imdb: 7.8 }))?.tip).toBe('Spielfilm · IMDb 7,8');
    expect(computeTip(film({ t: 'Tatort: Neu' }))?.tip).toBe('Sonntagskrimi');
    expect(computeTip(film({ g: 'sport', l: 1 }))?.tip).toMatch(/^Live-Sport/);
  });
  it('vergibt keine Tipps ohne Grund oder außerhalb des Abends', () => {
    expect(computeTip(film({ imdb: 5.5 }))).toBeUndefined();
    expect(computeTip(film({ imdb: 8, s: T('2026-11-08T09:00:00Z'), e: T('2026-11-08T11:00:00Z') }))).toBeUndefined();
    expect(computeTip(film({ t: 'Tatort: Alt', r: 1 }))).toBeUndefined();
  });
});
