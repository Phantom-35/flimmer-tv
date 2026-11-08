// Ermittelt aktuelle Senderlogos über Wikidata (P154) und prüft Lizenz auf Commons.
// Aufruf: node scripts/fetch-logos.mjs logos.json  – Ergebnis manuell in src/shared/logos.ts übernehmen
// (nur "Public domain"-Dateien, die zum Sender passen).
const terms = {daserste:'Das Erste',zdf:'ZDF',rtl:'RTL (Fernsehsender)',sat1:'Sat.1',prosieben:'ProSieben',vox:'VOX (Fernsehsender)',kabeleins:'Kabel eins',rtlzwei:'RTL Zwei','3sat':'3sat',arte:'Arte',zdfneo:'ZDFneo',zdfinfo:'ZDFinfo',one:'One (Fernsehsender)',phoenix:'Phoenix (Fernsehsender)',tagesschau24:'tagesschau24',ardalpha:'ARD alpha',wdr:'WDR Fernsehen',ndr:'NDR Fernsehen',br:'BR Fernsehen',hr:'hr-fernsehen',mdr:'MDR Fernsehen',rbb:'rbb Fernsehen',swr:'SWR Fernsehen',sr:'SR Fernsehen',radiobremen:'Radio Bremen TV',rtlup:'RTLup',voxup:'VOXup',sixx:'sixx',sat1gold:'Sat.1 Gold',prosiebenmaxx:'ProSieben Maxx',kabeleinsdoku:'Kabel eins Doku',nitro:'Nitro (Fernsehsender)',tele5:'Tele 5',dmax:'DMAX (Fernsehsender)',tlc:'TLC Deutschland',servustv:'ServusTV',comedycentral:'Comedy Central Deutschland',anixe:'Anixe',ntv:'n-tv',welt:'Welt (Fernsehsender)',n24doku:'N24 Doku',euronews:'Euronews',sport1:'Sport1 (Fernsehsender)',eurosport1:'Eurosport 1',eurosport2:'Eurosport 2',skysportnews:'Sky Sport News',kika:'KiKA',superrtl:'Super RTL',toggoplus:'Toggo plus',nick:'Nickelodeon Deutschland',disney:'Disney Channel Deutschland',deluxemusic:'Deluxe Music',mtv:'MTV Germany',orf1:'ORF 1',orf2:'ORF 2',srf1:'SRF 1',skyone:'Sky One',skyatlantic:'Sky Atlantic',skycinema:'Sky Cinema Premieren'};
const H = { 'User-Agent': 'FlimmerLogoLookup/1.0 (privates Projekt, einmaliger Abgleich)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  for (let i = 0; i < 5; i++) {
    const r = await fetch(url, { headers: H });
    const t = await r.text();
    if (t.startsWith('{')) return JSON.parse(t);
    await sleep(5000 * (i + 1));
  }
  throw new Error('rate limited');
}
function currentLogo(claims) {
  if (!claims?.length) return null;
  const live = claims.filter((c) => c.rank !== 'deprecated' && !c.qualifiers?.P582);
  const pref = live.find((c) => c.rank === 'preferred') ?? live[live.length - 1];
  return pref?.mainsnak?.datavalue?.value ?? null;
}
const out = {};
for (const [id, t] of Object.entries(terms)) {
  await sleep(1200);
  const s = await get(`https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=de&uselang=de&limit=4&search=${encodeURIComponent(t)}`);
  const ids = (s.search || []).map((x) => x.id);
  let found = null;
  if (ids.length) {
    await sleep(1200);
    const e = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims|labels|descriptions&languages=de&ids=${ids.join('|')}`);
    for (const q of ids) {
      const logo = currentLogo(e.entities[q]?.claims?.P154);
      if (logo) { found = { q, label: e.entities[q].labels?.de?.value, desc: e.entities[q].descriptions?.de?.value, file: logo }; break; }
    }
  }
  if (found) {
    await sleep(1200);
    const ii = await get(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=${encodeURIComponent('File:' + found.file)}`);
    const page = Object.values(ii.query.pages)[0];
    found.onCommons = !page.missing;
    found.license = page.imageinfo?.[0]?.extmetadata?.LicenseShortName?.value ?? null;
  }
  out[id] = found;
  console.log(id.padEnd(14), found ? `${found.label} (${(found.desc || '').slice(0, 30)}) => ${found.file} [${found.onCommons ? found.license : 'nicht auf Commons'}]` : '—');
}
(await import('node:fs')).writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
