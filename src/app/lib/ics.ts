/**
 * iCalendar-Export (RFC 5545). Zeiten in UTC, Erinnerung als VALARM.
 * Funktioniert auf iOS, Android und Desktop ohne Server.
 */
export interface IcsEvent {
  uid: string;
  start: number; // Unix-Sekunden
  end: number;
  title: string;
  location?: string;
  description?: string;
  url?: string;
  alarmMinutes?: number;
}

function icsDate(sec: number): string {
  return new Date(sec * 1000).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function escapeIcs(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Zeilen auf 75 Oktette falten (vereinfachend nach Zeichen, UTF-8-sicher). */
export function foldLine(line: string): string {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const b = new TextEncoder().encode(ch).length;
    if (bytes + b > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += b;
  }
  out.push(current);
  return out.join('\r\n ');
}

export function buildIcs(events: IcsEvent[], stampMs = Date.now()): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Flimmer//TV-Programm//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}@flimmer`,
      `DTSTAMP:${icsDate(Math.floor(stampMs / 1000))}`,
      `DTSTART:${icsDate(e.start)}`,
      `DTEND:${icsDate(e.end)}`,
      `SUMMARY:${escapeIcs(e.title)}`,
    );
    if (e.location) lines.push(`LOCATION:${escapeIcs(e.location)}`);
    if (e.description) lines.push(`DESCRIPTION:${escapeIcs(e.description)}`);
    if (e.url) lines.push(`URL:${e.url}`);
    if (e.alarmMinutes !== undefined) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeIcs(e.title)}`, `TRIGGER:-PT${Math.max(0, e.alarmMinutes)}M`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function safeFilename(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'sendung'
  );
}
