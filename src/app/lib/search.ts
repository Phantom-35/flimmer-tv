/**
 * Client-seitige, fehlertolerante Suche ohne Abhängigkeiten.
 * - Normalisierung: Kleinschreibung, Umlaute (ä→ae, ß→ss), Akzente, Satzzeichen
 * - Jedes Suchwort muss passen: Wortanfang, Teilwort oder (ab 4 Zeichen)
 *   Tippfehler mit Editierdistanz 1 (ab 8 Zeichen: 2)
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * Begrenzte Damerau-Levenshtein-Distanz (Optimal String Alignment):
 * Vertauschte Nachbarbuchstaben ("tatrot" -> "tatort") zählen als 1 Fehler.
 * Bricht ab, sobald max sicher überschritten ist.
 */
export function withinDistance(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let prevMin = 0;
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2]! + 1);
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    // Vertauschungen greifen auf die vorletzte Zeile zurück -> erst abbrechen, wenn beide zu groß sind.
    if (rowMin > max && prevMin > max) return false;
    prevMin = rowMin;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length]! <= max;
}

/** Punktzahl eines Suchworts gegenüber den Wörtern eines Feldes (0 = kein Treffer). */
export function tokenScore(token: string, words: string[], joined: string): number {
  let best = 0;
  for (const w of words) {
    if (w === token) return 10;
    if (w.startsWith(token)) best = Math.max(best, 8);
    else if (token.length >= 3 && w.includes(token)) best = Math.max(best, 5);
    else if (token.length >= 4) {
      const max = token.length >= 8 ? 2 : 1;
      // Tippfehler gegen ganzes Wort oder gleich langen Wortanfang
      if (withinDistance(token, w, max) || (w.length > token.length && withinDistance(token, w.slice(0, token.length), max))) {
        best = Math.max(best, 3);
      }
    }
  }
  if (!best && token.length >= 3 && joined.includes(token)) best = 4; // über Wortgrenzen ("tatortreiniger")
  return best;
}

export interface SearchFields {
  title: string;
  secondary?: string;
  tertiary?: string;
}

export interface PreparedQuery {
  tokens: string[];
  phrase: string;
}

export function prepareQuery(q: string): PreparedQuery {
  return { tokens: tokenize(q), phrase: normalize(q) };
}

export function prepareField(text: string | undefined): { words: string[]; joined: string } {
  const n = normalize(text ?? '');
  return { words: n ? n.split(' ') : [], joined: n.replace(/ /g, '') };
}

/**
 * Bewertet ein Dokument. Titeltreffer zählen am meisten.
 * Rückgabe 0 = kein Treffer.
 */
export function scoreDocument(
  q: PreparedQuery,
  title: { words: string[]; joined: string },
  secondary?: { words: string[]; joined: string },
  tertiary?: { words: string[]; joined: string },
): number {
  if (!q.tokens.length) return 0;
  let total = 0;
  for (const token of q.tokens) {
    const t = tokenScore(token, title.words, title.joined) * 3;
    const s = secondary ? tokenScore(token, secondary.words, secondary.joined) * 1.5 : 0;
    const d = tertiary ? tokenScore(token, tertiary.words, tertiary.joined) * 0.6 : 0;
    const best = Math.max(t, s, d);
    if (!best) return 0;
    total += best;
  }
  const titleNorm = title.words.join(' ');
  if (titleNorm === q.phrase) total += 40;
  else if (titleNorm.startsWith(q.phrase)) total += 20;
  return total;
}
