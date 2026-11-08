import type { Channel, ChannelGroup } from '../src/shared/types.ts';

/**
 * Kuratierte Senderliste. Reihenfolge = Standard-Reihenfolge in der App.
 * `ard`: Kanal-ID der ARD-Programm-API, `xmltv`: Kanal-ID im XMLTV-Feed.
 * Ist beides gesetzt, ist die ARD-API die Hauptquelle und XMLTV ergänzt
 * Genre, Staffel/Folge, Jahr usw.
 */
export interface ChannelSource {
  id: string;
  name: string;
  short: string;
  group: ChannelGroup;
  ard?: string;
  xmltv?: string;
  /** Standardgenre, falls nichts erkannt wird (z. B. Kindersender). */
  defaultGenre?: 'kinder' | 'nachrichten' | 'doku' | 'sport' | 'musik';
}

export const CHANNELS: ChannelSource[] = [
  // Hauptsender
  { id: 'daserste', name: 'Das Erste', short: 'ARD', group: 'haupt', ard: 'daserste', xmltv: 'Das.Erste.de' },
  { id: 'zdf', name: 'ZDF', short: 'ZDF', group: 'haupt', xmltv: 'ZDF.de' },
  { id: 'rtl', name: 'RTL', short: 'RTL', group: 'haupt', xmltv: 'RTL.de' },
  { id: 'sat1', name: 'SAT.1', short: 'SAT1', group: 'haupt', xmltv: 'SAT.1.de' },
  { id: 'prosieben', name: 'ProSieben', short: 'P7', group: 'haupt', xmltv: 'ProSieben.de' },
  { id: 'vox', name: 'VOX', short: 'VOX', group: 'haupt', xmltv: 'VOX.de' },
  { id: 'kabeleins', name: 'Kabel Eins', short: 'K1', group: 'haupt', xmltv: 'kabel.eins.de' },
  { id: 'rtlzwei', name: 'RTLZWEI', short: 'RTL2', group: 'haupt', xmltv: 'RTLZWEI.de' },
  // Weitere öffentlich-rechtliche
  { id: '3sat', name: '3sat', short: '3sat', group: 'oeffentlich', ard: '3sat', xmltv: '3sat.de' },
  { id: 'arte', name: 'arte', short: 'arte', group: 'oeffentlich', ard: 'arte', xmltv: 'ARTE.de' },
  { id: 'zdfneo', name: 'ZDFneo', short: 'neo', group: 'oeffentlich', xmltv: 'ZDFneo.de' },
  { id: 'zdfinfo', name: 'ZDFinfo', short: 'info', group: 'oeffentlich', xmltv: 'ZDFinfo.de', defaultGenre: 'doku' },
  { id: 'one', name: 'ONE', short: 'ONE', group: 'oeffentlich', ard: 'one', xmltv: 'ONE.de' },
  { id: 'phoenix', name: 'phoenix', short: 'phx', group: 'oeffentlich', ard: 'phoenix', xmltv: 'PHOENIX.de', defaultGenre: 'doku' },
  { id: 'tagesschau24', name: 'tagesschau24', short: 'ts24', group: 'oeffentlich', ard: 'tagesschau24', xmltv: 'tagesschau24.de', defaultGenre: 'nachrichten' },
  { id: 'ardalpha', name: 'ARD alpha', short: 'α', group: 'oeffentlich', ard: 'alpha', xmltv: 'ARD.alpha.de', defaultGenre: 'doku' },
  // Dritte Programme
  { id: 'wdr', name: 'WDR', short: 'WDR', group: 'dritte', ard: 'wdr', xmltv: 'WDR.de' },
  { id: 'ndr', name: 'NDR', short: 'NDR', group: 'dritte', ard: 'ndr', xmltv: 'NDR.de' },
  { id: 'br', name: 'BR', short: 'BR', group: 'dritte', ard: 'br', xmltv: 'BR.de' },
  { id: 'hr', name: 'hr', short: 'hr', group: 'dritte', ard: 'hr', xmltv: 'HR.de' },
  { id: 'mdr', name: 'MDR', short: 'MDR', group: 'dritte', ard: 'mdr', xmltv: 'MDR.de' },
  { id: 'rbb', name: 'rbb', short: 'rbb', group: 'dritte', ard: 'rbb', xmltv: 'RBB.de' },
  { id: 'swr', name: 'SWR', short: 'SWR', group: 'dritte', ard: 'swr', xmltv: 'SWR/SR.de' },
  { id: 'sr', name: 'SR', short: 'SR', group: 'dritte', ard: 'sr' },
  { id: 'radiobremen', name: 'Radio Bremen TV', short: 'RB', group: 'dritte', ard: 'radiobremen' },
  // Private Spartensender
  { id: 'rtlup', name: 'RTLup', short: 'up', group: 'privat', xmltv: 'RTLup.de' },
  { id: 'voxup', name: 'VOXup', short: 'VXup', group: 'privat', xmltv: 'VOXup.de' },
  { id: 'sixx', name: 'sixx', short: 'sixx', group: 'privat', xmltv: 'sixx.de' },
  { id: 'sat1gold', name: 'SAT.1 Gold', short: 'S1G', group: 'privat', xmltv: 'SAT.1.Gold.de' },
  { id: 'prosiebenmaxx', name: 'ProSieben MAXX', short: 'P7M', group: 'privat', xmltv: 'ProSieben.MAXX.de' },
  { id: 'kabeleinsdoku', name: 'Kabel Eins Doku', short: 'K1D', group: 'privat', xmltv: 'kabel.eins.Doku.de', defaultGenre: 'doku' },
  { id: 'nitro', name: 'NITRO', short: 'NITR', group: 'privat', xmltv: 'NITRO.de' },
  { id: 'tele5', name: 'Tele 5', short: 'T5', group: 'privat', xmltv: 'Tele.5.de' },
  { id: 'dmax', name: 'DMAX', short: 'DMAX', group: 'privat', xmltv: 'DMAX.de' },
  { id: 'tlc', name: 'TLC', short: 'TLC', group: 'privat', xmltv: 'TLC.de' },
  { id: 'servustv', name: 'ServusTV', short: 'STV', group: 'privat', xmltv: 'Servus.TV.Österreich.de' },
  { id: 'comedycentral', name: 'Comedy Central', short: 'CC', group: 'privat', xmltv: 'Comedy.Central.de' },
  { id: 'anixe', name: 'ANIXE', short: 'ANX', group: 'privat', xmltv: 'ANIXE.de' },
  // Nachrichten & Doku
  { id: 'ntv', name: 'n-tv', short: 'ntv', group: 'info', xmltv: 'ntv.de', defaultGenre: 'nachrichten' },
  { id: 'welt', name: 'WELT', short: 'WELT', group: 'info', xmltv: 'WELT.de', defaultGenre: 'nachrichten' },
  { id: 'n24doku', name: 'N24 Doku', short: 'N24D', group: 'info', xmltv: 'N24.DOKU.de', defaultGenre: 'doku' },
  { id: 'euronews', name: 'euronews', short: 'enws', group: 'info', xmltv: 'euronews.(ger).de', defaultGenre: 'nachrichten' },
  // Sport
  { id: 'sport1', name: 'SPORT1', short: 'S1', group: 'sport', xmltv: 'SPORT1.de', defaultGenre: 'sport' },
  { id: 'eurosport1', name: 'Eurosport 1', short: 'ES1', group: 'sport', xmltv: 'Eurosport.1.de', defaultGenre: 'sport' },
  { id: 'eurosport2', name: 'Eurosport 2', short: 'ES2', group: 'sport', xmltv: 'Eurosport.2.de', defaultGenre: 'sport' },
  { id: 'skysportnews', name: 'Sky Sport News', short: 'SSN', group: 'sport', xmltv: 'Sky.Sport.News.de', defaultGenre: 'sport' },
  // Kinder
  { id: 'kika', name: 'KiKA', short: 'KiKA', group: 'kinder', ard: 'kika', xmltv: 'KIKA.de', defaultGenre: 'kinder' },
  { id: 'superrtl', name: 'Super RTL', short: 'SRTL', group: 'kinder', xmltv: 'SUPER.RTL.de', defaultGenre: 'kinder' },
  { id: 'toggoplus', name: 'Toggo plus', short: 'TGO+', group: 'kinder', xmltv: 'TOGGO.plus.de', defaultGenre: 'kinder' },
  { id: 'nick', name: 'Nickelodeon', short: 'nick', group: 'kinder', xmltv: 'nick.de', defaultGenre: 'kinder' },
  { id: 'disney', name: 'Disney Channel', short: 'DIS', group: 'kinder', xmltv: 'Disney.Channel.de', defaultGenre: 'kinder' },
  // Spezial: Musik, Österreich/Schweiz, Pay-TV
  { id: 'deluxemusic', name: 'Deluxe Music', short: 'DLX', group: 'spezial', xmltv: 'DELUXE.MUSIC.de', defaultGenre: 'musik' },
  { id: 'mtv', name: 'MTV', short: 'MTV', group: 'spezial', xmltv: 'MTV.de' },
  { id: 'orf1', name: 'ORF 1', short: 'ORF1', group: 'spezial', xmltv: 'ORF.1.de' },
  { id: 'orf2', name: 'ORF 2', short: 'ORF2', group: 'spezial', xmltv: 'ORF.2.de' },
  { id: 'srf1', name: 'SRF 1', short: 'SRF1', group: 'spezial', xmltv: 'SRF.1.de' },
  { id: 'skyone', name: 'Sky One', short: 'Sky1', group: 'spezial', xmltv: 'Sky.One.de' },
  { id: 'skyatlantic', name: 'Sky Atlantic', short: 'SkyA', group: 'spezial', xmltv: 'Sky.Atlantic.HD.de' },
  { id: 'skycinema', name: 'Sky Cinema Premiere', short: 'SkyC', group: 'spezial', xmltv: 'Sky.Cinema.Premiere.HD.de' },
];

/** Deterministischer Farbton aus der ID (FNV-1a), bewusst keine Markenfarben. */
export function hueFor(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0) % 360;
}

export function toPublicChannel(c: ChannelSource): Channel {
  return { id: c.id, name: c.name, short: c.short, group: c.group, hue: hueFor(c.id) };
}
