/**
 * Senderlogos auf Wikimedia Commons (nur angezeigt, wenn der Nutzer "Senderlogos" einschaltet).
 * Ermittelt über Wikidata (Eigenschaft P154, aktuelles Logo); nur Dateien, die auf Commons liegen.
 * Aktualisieren: node scripts/fetch-logos.mjs
 */
// Stand: 08.11.2026 – alle Dateien auf Commons als gemeinfrei (PD-textlogo) gekennzeichnet.
export const LOGOS: Record<string, string> = {
  "daserste": "Das Erste 2014.svg",
  "zdf": "ZDF logo.svg",
  "prosieben": "ProSieben Logo 2015.svg",
  "kabeleins": "Kabel eins Logo 2015.svg",
  "rtlzwei": "RTLZWEI Logo 2019.svg",
  "3sat": "3sat 2019.svg",
  "arte": "Arte Logo 2026.svg",
  "zdfneo": "ZDFneo 2017.svg",
  "zdfinfo": "ZDFinfo 2011.svg",
  "tagesschau24": "Tagesschau24-2012.svg",
  "ardalpha": "ARD alpha.svg",
  "wdr": "Wdr fernsehen logo 2016.svg",
  "ndr": "Logo NDR Fernsehen 2017.svg",
  "br": "Logo Bayerischer Rundfunk 2024.svg",
  "hr": "HR-Fernsehen Logo 2023.svg",
  "mdr": "MDR Logo 2017.svg",
  "rbb": "Rbb Fernsehen Logo 2017.08.svg",
  "swr": "SWR Logo 2023.svg",
  "sr": "SR Fernsehen Logo 2023.svg",
  "radiobremen": "Logo Radio Bremen TV.svg",
  "rtlup": "RTLup Logo 2021 stacked.svg",
  "sixx": "Sixx Logo.svg",
  "sat1gold": "SAT.1 Gold 2019.svg",
  "prosiebenmaxx": "ProSieben MAXX Logo.svg",
  "kabeleinsdoku": "Kabel eins Doku Logo 2016.svg",
  "tele5": "Tele 5 Logo 2021.svg",
  "tlc": "TLC-Logo 2016.svg",
  "comedycentral": "Comedy Central 2018.svg",
  "ntv": "N-tv logo-september2017.svg",
  "n24doku": "N24Doku.svg",
  "euronews": "Euronews 2022.svg",
  "eurosport1": "Eurosport 1 Logo 2015.svg",
  "eurosport2": "Eurosport 2 Logo 2015.svg",
  "skysportnews": "Sky Sport News DE Logo 2020.svg",
  "superrtl": "Super RTL Logo orange 2019.svg",
  "toggoplus": "ToggoPlus Logo 2019.svg",
  "nick": "Nickelodeon 2023 logo (outline).svg",
  "disney": "2017 Disney Channel logo.svg",
  "deluxemusic": "Deluxe Music Logo 2019.svg",
  "mtv": "MTV Logo 2010.svg",
  "orf1": "ORF 1 2019.svg",
  "orf2": "ORF2 logo.svg",
  "srf1": "Logo SRF 1.svg",
  "skyone": "Sky One 2026 II.svg",
  "rtl": "RTL Logo 2021.svg",
  "vox": "VOX Logo 2013.svg",
  "welt": "Welt TV Logo 2016.svg",
};

export function logoUrl(channelId: string, width = 96): string | undefined {
  const file = LOGOS[channelId];
  return file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}` : undefined;
}
