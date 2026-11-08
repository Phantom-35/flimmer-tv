import { describe, expect, it } from 'vitest';
import { buildIcs, escapeIcs, foldLine, safeFilename } from '../../src/app/lib/ics';
import { normalize, prepareField, prepareQuery, scoreDocument, withinDistance } from '../../src/app/lib/search';

describe('Suche', () => {
  it('normalisiert Umlaute und Satzzeichen', () => {
    expect(normalize('Großstadtrevier: Ärger!')).toBe('grossstadtrevier aerger');
    expect(normalize('Café')).toBe('cafe');
  });
  it('erlaubt Tippfehler inkl. Buchstabendreher', () => {
    expect(withinDistance('tatrot', 'tatort', 1)).toBe(true);
    expect(withinDistance('tatot', 'tatort', 1)).toBe(true);
    expect(withinDistance('tagesschau', 'tagesschua', 1)).toBe(true);
    expect(withinDistance('abc', 'xyz', 1)).toBe(false);
  });
  const score = (q: string, title: string, sec = '', desc = '') =>
    scoreDocument(prepareQuery(q), prepareField(title), prepareField(sec), desc ? prepareField(desc) : undefined);
  it('findet über Titel, Untertitel und Beschreibung', () => {
    expect(score('tatort', 'Tatort: Frei wie ein Adler')).toBeGreaterThan(0);
    expect(score('tatrot', 'Tatort')).toBeGreaterThan(0);
    expect(score('adler', 'Tatort: Frei wie ein Adler')).toBeGreaterThan(0);
    expect(score('herzstück', 'Mein Lokal', '"Restaurant Herzstück"')).toBeGreaterThan(0);
    expect(score('voldemort', 'Harry Potter', '', 'Harry träumt von Lord Voldemort')).toBeGreaterThan(0);
    expect(score('harry potter feuerkelch', 'Harry Potter und der Feuerkelch')).toBeGreaterThan(0);
    expect(score('harry krimi', 'Harry Potter')).toBe(0); // alle Wörter müssen passen
    expect(score('', 'Egal')).toBe(0);
  });
  it('bewertet exakte Titel höher', () => {
    expect(score('tagesschau', 'Tagesschau')).toBeGreaterThan(score('tagesschau', 'Tagesschau vor 20 Jahren'));
    expect(score('tagesschau', 'Tagesschau vor 20 Jahren')).toBeGreaterThan(score('tagesschau', 'Magazin', 'mit Tagesschau'));
  });
});

describe('Kalender-Export', () => {
  it('erzeugt gültiges iCalendar mit Alarm', () => {
    const ics = buildIcs(
      [
        {
          uid: 'zdf-1',
          start: Date.UTC(2026, 10, 8, 19, 15) / 1000,
          end: Date.UTC(2026, 10, 8, 20, 45) / 1000,
          title: 'Film; mit, Sonderzeichen',
          alarmMinutes: 10,
        },
      ],
      Date.UTC(2026, 10, 8, 12, 0),
    );
    expect(ics).toContain('BEGIN:VCALENDAR\r\n');
    expect(ics).toContain('DTSTART:20261108T191500Z');
    expect(ics).toContain('DTEND:20261108T204500Z');
    expect(ics).toContain('SUMMARY:Film\\; mit\\, Sonderzeichen');
    expect(ics).toContain('TRIGGER:-PT10M');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('faltet lange Zeilen', () => {
    const folded = foldLine(`DESCRIPTION:${'ä'.repeat(100)}`);
    for (const line of folded.split('\r\n')) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
  });
  it('maskiert und erzeugt Dateinamen', () => {
    expect(escapeIcs('a\nb')).toBe('a\\nb');
    expect(safeFilename('Tatort: Frei wie ein Adler!')).toBe('Tatort-Frei-wie-ein-Adler');
  });
});
