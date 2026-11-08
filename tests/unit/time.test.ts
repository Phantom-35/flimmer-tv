import { describe, expect, it } from 'vitest';
import {
  addDays,
  berlinOffsetMinutes,
  berlinParts,
  berlinToUtc,
  dayLabel,
  diffDays,
  formatDuration,
  formatTime,
  progress,
  tvDayOf,
  tvDayRange,
  tvDayTime,
} from '../../src/shared/time';

const H = 3600_000;

describe('Berliner Zeit', () => {
  it('kennt Winter- und Sommerzeit', () => {
    expect(berlinOffsetMinutes(Date.UTC(2026, 0, 15, 12))).toBe(60);
    expect(berlinOffsetMinutes(Date.UTC(2026, 6, 15, 12))).toBe(120);
  });

  it('wandelt Wanduhrzeit in UTC um', () => {
    expect(berlinToUtc(2026, 11, 8, 20, 15)).toBe(Date.UTC(2026, 10, 8, 19, 15));
    expect(berlinToUtc(2026, 7, 1, 20, 15)).toBe(Date.UTC(2026, 6, 1, 18, 15));
  });

  it('behandelt die Umstellung im März (02:00 -> 03:00)', () => {
    // 29.03.2026: 02:30 existiert nicht -> wird nach vorne verschoben
    const t = berlinToUtc(2026, 3, 29, 2, 30);
    expect(berlinParts(t).h).toBe(3);
    expect(berlinToUtc(2026, 3, 29, 3, 0)).toBe(Date.UTC(2026, 2, 29, 1, 0));
    expect(berlinToUtc(2026, 3, 29, 1, 59)).toBe(Date.UTC(2026, 2, 29, 0, 59));
  });

  it('behandelt die Umstellung im Oktober (03:00 -> 02:00)', () => {
    // 25.10.2026: 02:30 gibt es zweimal -> erste (Sommerzeit-)Variante
    expect(berlinToUtc(2026, 10, 25, 2, 30)).toBe(Date.UTC(2026, 9, 25, 0, 30));
    expect(berlinToUtc(2026, 10, 25, 4, 0)).toBe(Date.UTC(2026, 9, 25, 3, 0));
  });
});

describe('TV-Tag (05:00–05:00)', () => {
  it('ordnet Nachtsendungen dem Vortag zu', () => {
    expect(tvDayOf(berlinToUtc(2026, 11, 9, 4, 59))).toBe('2026-11-08');
    expect(tvDayOf(berlinToUtc(2026, 11, 9, 5, 0))).toBe('2026-11-09');
    expect(tvDayOf(berlinToUtc(2026, 11, 8, 23, 30))).toBe('2026-11-08');
  });

  it('hat 24, 23 bzw. 25 Stunden', () => {
    const len = (d: string) => {
      const [a, b] = tvDayRange(d);
      return (b - a) / H;
    };
    expect(len('2026-11-08')).toBe(24);
    expect(len('2026-03-28')).toBe(23); // reicht über die Nacht der Umstellung
    expect(len('2026-10-24')).toBe(25);
  });

  it('legt Uhrzeiten nach Mitternacht auf den Folgetag', () => {
    expect(tvDayTime('2026-11-08', 20, 15)).toBe(Date.UTC(2026, 10, 8, 19, 15));
    expect(tvDayTime('2026-11-08', 1, 0)).toBe(Date.UTC(2026, 10, 9, 0, 0));
  });

  it('rechnet Kalendertage über Monats- und Jahresgrenzen', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-11-08', '2026-11-15')).toBe(7);
  });
});

describe('Formatierung', () => {
  it('formatiert Uhrzeiten in Berliner Zeit', () => {
    expect(formatTime(Date.UTC(2026, 10, 8, 19, 15))).toBe('20:15');
    expect(formatTime(Date.UTC(2026, 10, 8, 19, 15), true)).toMatch(/8:15/);
  });
  it('benennt Tage relativ', () => {
    expect(dayLabel('2026-11-08', '2026-11-08')).toBe('Heute');
    expect(dayLabel('2026-11-09', '2026-11-08')).toBe('Morgen');
    expect(dayLabel('2026-11-07', '2026-11-08')).toBe('Gestern');
    expect(dayLabel('2026-11-10', '2026-11-08')).toBe('Di. 10.11.');
  });
  it('formatiert Dauer und Fortschritt', () => {
    expect(formatDuration(45)).toBe('45 Min.');
    expect(formatDuration(90)).toBe('1 Std. 30 Min.');
    expect(formatDuration(120)).toBe('2 Std.');
    expect(progress(0, 100, 25)).toBe(0.25);
    expect(progress(0, 100, 200)).toBe(1);
    expect(progress(0, 100, -5)).toBe(0);
  });
});
