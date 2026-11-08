/**
 * ZENTRALE KONFIGURATION – bitte vor dem Livegang ausfüllen!
 *
 * Alle Werte in [ECKIGEN KLAMMERN] sind bewusst markierte Platzhalter.
 * Sie erscheinen im Impressum, in der Datenschutzerklärung und auf der
 * Kontaktseite. Solange Platzhalter enthalten sind, zeigt die App auf
 * diesen Seiten einen deutlichen Hinweis an.
 */
export const APP_CONFIG = {
  appName: 'Flimmer',
  tagline: 'Das TV-Programm. Aufgeräumt.',

  /** Angaben für Impressum (§ 5 DDG) und Datenschutz (Art. 13 DSGVO). */
  operator: {
    name: '[NAME]',
    street: '[STRASSE HAUSNUMMER]',
    city: '[PLZ ORT]',
    country: 'Deutschland',
    email: '[E-MAIL]',
    /** Optional, sonst leer lassen. */
    phone: '',
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
