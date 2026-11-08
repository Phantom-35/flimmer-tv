import type { GenreKey } from './types';

export const GENRES: { key: GenreKey; label: string; short: string }[] = [
  { key: 'film', label: 'Spielfilm', short: 'Film' },
  { key: 'serie', label: 'Serie', short: 'Serie' },
  { key: 'sport', label: 'Sport', short: 'Sport' },
  { key: 'doku', label: 'Doku', short: 'Doku' },
  { key: 'nachrichten', label: 'Nachrichten', short: 'News' },
  { key: 'kinder', label: 'Kinder', short: 'Kinder' },
  { key: 'show', label: 'Unterhaltung', short: 'Show' },
  { key: 'magazin', label: 'Magazin', short: 'Magazin' },
  { key: 'musik', label: 'Musik', short: 'Musik' },
  { key: 'sonstiges', label: 'Sonstiges', short: 'Sonst.' },
];

export const GENRE_LABEL: Record<GenreKey, string> = Object.fromEntries(
  GENRES.map((g) => [g.key, g.label]),
) as Record<GenreKey, string>;

/**
 * Reihenfolge ist wichtig: spezifischere Regeln zuerst
 * ("Dokusoap" ist Unterhaltung, "Krimiserie" ist Serie, nicht Film).
 */
const CATEGORY_RULES: [GenreKey | 'skip', RegExp][] = [
  ['sonstiges', /werbesendung|teleshopping|shopping|erotic|erotik/],
  ['kinder', /kinder|children|zeichentrick|animationsserie|animated|animation|jugendserie|anime|cartoon|série d'animation/],
  ['show', /dokusoap|doku-soap|reality|scripted|kuppel|dating/],
  ['doku', /doku|dokument|documentar|reportage|natur|tier|reise|geschichte|history|wissenschaft|science|feature/],
  ['sport', /sport|fußball|fussball|soccer|tennis|formel|handball|basketball|eishockey|hockey|ski|biathlon|boxen|darts|golf|radsport|leichtathletik|olymp|motor|wrestling|snooker|volleyball|football|rugby|kampfsport|reiten/],
  ['nachrichten', /nachricht|news|wetter|informations$|^information$|journal/],
  ['serie', /serie|series|sitcom|soap|telenovela|série|episod/],
  ['magazin', /magazin|magazine|boulevard|ratgeber|verbraucher|lifestyle|kochen|koch|essen|garten|wohnen|gesundheit|auto|fashion|mode/],
  ['musik', /musik|music|konzert|concert|oper|clip|schlager|volksmusik/],
  ['show', /show|unterhaltung|entertainment|quiz|comedy|talk|kabarett|spiel|game|late night|satire|gala|casting/],
  ['film', /film|movie|thriller|drama|komödie|comedy|western|horror|krimi|abenteuer|adventure|action|romance|romantik|fantasy|science.fiction|sci-fi|melodram|liebe|mystery|kriegs|historien|biografie|biopic|heimat|märchen|crime/],
];

/** Ordnet rohe Genre-Bezeichnungen (de/en/fr) einem App-Genre zu. */
export function genreFromCategories(categories: string[]): GenreKey | undefined {
  for (const raw of categories) {
    const c = raw.toLowerCase().trim();
    if (!c) continue;
    for (const [key, re] of CATEGORY_RULES) {
      if (re.test(c)) return key === 'skip' ? undefined : key;
    }
  }
  return undefined;
}

const TITLE_RULES: [GenreKey, RegExp][] = [
  ['nachrichten', /^(tagesschau|tagesthemen|heute( |-journal|$)|heute journal|nachtmagazin|zib|zeit im bild|10 vor 10|wetter|logo!|rundschau|aktuell|punkt 12|newstime|rtl aktuell|sat\.1 nachrichten|mdr aktuell|hessenschau|nordmagazin|landesschau|abendschau|lokalzeit|hallo niedersachsen|hamburg journal|schleswig-holstein magazin|buten un binnen|sachsenspiegel|thüringen journal|sachsen-anhalt heute|brandenburg aktuell|rbb24|sr info|aktueller bericht|niedersachsen 18|nachrichten)/i],
  ['nachrichten', /(nachrichten|tagesschau|news)\b/i],
  ['sport', /(sportschau|sportstudio|bundesliga|fußball|fussball|biathlon|ski alpin|skispringen|handball|formel 1|olympi|tennis|boxen|darts|eishockey|leichtathletik|sport)/i],
  ['film', /^(tatort|polizeiruf 110|der staatsanwalt|spielfilm|fernsehfilm|filmmittwoch|der kroatien-krimi|der usedom-krimi)/i],
  ['film', /(krimi|thriller)$/i],
  ['doku', /(doku|dokumentation|reportage|terra x|planet e|expedition|universum|erlebnis erde|abenteuer erde|die story|37°|zdfzeit|quarks|w wie wissen|xenius|360°|gefragt – gejagt)/i],
  ['magazin', /(magazin|markt|plusminus|panorama|monitor|report |kontraste|frontal|brisant|visite|ratgeber|kulturzeit|nano|titel, thesen|ttt|mittagsmagazin|morgenmagazin|moma|mima|drehscheibe|hallo deutschland|leute heute|volle kanne|live nach neun|elf 99)/i],
  ['show', /(show|quiz|talk|lanz|maischberger|illner|hart aber fair|caren miosga|wer weiß denn sowas|gefragt – gejagt|verstehen sie spaß|wetten, dass|kabarett|comedy|satire|heute-show|extra 3|die anstalt|riverboat|kölner treff|nachtcafé|3nach9|zimmer frei)/i],
  ['musik', /(konzert|musik|schlager|carmen nebel|florian silbereisen|feste der|klassik)/i],
  ['kinder', /(sendung mit der maus|sandmännchen|tigerenten|peppa|paw patrol|feuerwehrmann sam|biene maja|wickie|heidi|die pfefferkörner|checker|löwenzahn|logo!)/i],
  ['serie', /\(\d+\/\d+\)|\bstaffel\b|folge \d+/i],
  ['serie', /^(in aller freundschaft|um himmels willen|sturm der liebe|rote rosen|großstadtrevier|die rosenheim-cops|soko|notruf hafenkante|der bergdoktor|watzmann|hubert ohne staller|die bergretter|lindenstraße|verbotene liebe|gzsz|gute zeiten|alles was zählt|unter uns|köln 50667|berlin – tag & nacht|die simpsons|navy cis|criminal minds|the big bang theory|two and a half men|family guy|bones|castle|grey's anatomy|monk|rizzoli)/i],
];

/** Fallback, wenn die Quelle kein Genre liefert (z. B. ARD-Programm-API). */
export function genreFromTitle(title: string, subtitle?: string): GenreKey | undefined {
  for (const [key, re] of TITLE_RULES) {
    if (re.test(title)) return key;
  }
  if (subtitle) {
    for (const [key, re] of TITLE_RULES) {
      if (key !== 'serie' && re.test(subtitle)) return key;
    }
  }
  return undefined;
}
