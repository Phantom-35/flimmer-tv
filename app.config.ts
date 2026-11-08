/**
 * ZENTRALE KONFIGURATION
 *
 * Betreiberangaben für Impressum, Datenschutzerklärung und Kontaktseite.
 * Werte in [ECKIGEN KLAMMERN] gelten als Platzhalter: Solange einer
 * enthalten ist, zeigt die App auf diesen Seiten einen Warnhinweis an.
 */
export const APP_CONFIG = {
  appName: 'Flimmer',
  tagline: 'Das TV-Programm. Aufgeräumt.',

  /** Angaben für Impressum (§ 5 DDG) und Datenschutz (Art. 13 DSGVO). */
  operator: {
    name: 'Ben Griese',
    street: 'Burghofweg 1',
    city: '53340 Meckenheim',
    country: 'Deutschland',
    email: 'phandevstudios@gmx.de',
    /** Optional, sonst leer lassen. */
    phone: '',
  },

  /** Zuständige Datenschutz-Aufsichtsbehörde (Sitz des Betreibers). */
  supervisoryAuthority: {
    name: 'Landesbeauftragte für Datenschutz und Informationsfreiheit Nordrhein-Westfalen',
    url: 'https://www.ldi.nrw.de',
  },

  /** Hoster der statischen Seite (für die Datenschutzerklärung). */
  hosting: {
    name: 'Cloudflare, Inc.',
    address: '101 Townsend St., San Francisco, CA 94107, USA',
    privacyUrl: 'https://www.cloudflare.com/de-de/privacypolicy/',
  },

  /** Link zum Quellcode (leer lassen, solange das Repo privat ist). */
  repositoryUrl: '',
  /** Optional: Link für Fehlermeldungen (z. B. GitHub Issues), sonst E-Mail. */
  feedbackUrl: '',
} as const;

export const PLACEHOLDER_RE = /\[[A-ZÄÖÜ -]+\]/;

export function hasPlaceholders(): boolean {
  return Object.values(APP_CONFIG.operator).some((v) => PLACEHOLDER_RE.test(v));
}
