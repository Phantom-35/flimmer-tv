# Entscheidungen (ADR-light)

Jede Entscheidung: **Was**, **Warum**, **Alternativen**. Stand: 08.11.2026.

---

## 1. Datenquellen: ARD-Programm-API + XMLTV (epgshare01)

**Entscheidung:** Zwei Quellen, zusammengeführt im Daten-Job.

| Quelle | Sender | Vorschau | Felder |
|---|---|---|---|
| ARD-Programm-API (`programm-api.ard.de`) | Das Erste, alle Dritten, ONE, ARD alpha, tagesschau24, 3sat, arte, KiKA, phoenix | ~8 Tage | Titel, Untertitel, Beschreibung, FSK, UT/AD/DGS, Regionalfenster |
| XMLTV-Sammlung von epgshare01 (`epg_ripper_DE1.xml.gz`) | 266 Sender, davon 59 kuratiert genutzt (inkl. ZDF-Familie, Private, Sport, Kinder) | ~3–4 Tage | Titel, Untertitel, Beschreibung, Genre, Staffel/Folge, Jahr, Land, FSK, IMDb, Wiederholung, Besetzung |

**Warum:**
- Für die öffentlich-rechtlichen Sender ist die ARD-API die offiziellste frei erreichbare Quelle (die Sender veröffentlichen sie selbst für programm.ard.de, kein Login, kein Scraping von HTML).
- Für Privatsender gibt es **keine** offizielle, kostenlose, frei nutzbare Schnittstelle. Die XMLTV-Sammlung ist die beste stabile Alternative (eine Datei, 1 Abruf je Lauf, keine AGB-Umgehung durch eigenes Scraping).
- ARD-Daten werden mit XMLTV angereichert (Genre, Jahr, Folge …), da die ARD-API kein Genre liefert. Fehlt ein ARD-Tag, springt XMLTV ein.

**Real getestet (08.11.2026):** ARD 5.808 Sendungen / 17 Sender / 10 Tage; XMLTV 6.277 Sendungen für 49 genutzte Sender; 59/59 Sender mit Daten für heute.

**Alternativen geprüft:**
- *open-epg.com (germany1.xml):* erreichbar, aber nur ~500 Sendungen/2 Tage im Gratis-Umfang → zu dünn.
- *iptv-org/epg-Grabber (magentatv, tvspielfilm, hoerzu …):* wäre eigenes Scraping der Anbieter-Webseiten/Apps; AGB-widrig und fragil.
- *MagentaTV-API:* verlangt Session/Login → raus.
- *TV-Spielfilm-App-API:* nicht erreichbar, außerdem AGB-Risiko.
- *ZDF-API (`api.zdf.de`):* benötigt aus der Website extrahierten Token → bewusst nicht genutzt.
- *DVB-EIT (Antenne/Satellit):* rechtlich sauber, aber braucht Empfangshardware und einen laufenden Server → widerspricht „kostenlos, ohne Server“.
- *Schedules Direct:* kostenpflichtig.

**Fallback:** `--previous <URL>` lädt den zuletzt veröffentlichten Stand; Sender/Tage ohne neue Daten werden übernommen und in der App gekennzeichnet.

## 2. Rechtliches zu Daten, Texten, Logos, Bildern

- **Programmfakten** (Titel, Zeiten, Genre) sind als bloße Informationen kaum schutzfähig.
- **Beschreibungstexte** können urheberrechtlich geschützt sein. Die XMLTV-Beschreibungen enthalten teils redaktionelle Kritiken. Deshalb wird **nur der erste (inhaltliche) Absatz, max. ~500 Zeichen**, übernommen (`shortenDescription`). ARD-Texte stammen vom Sender selbst und werden vollständig gezeigt.
- **Senderlogos** sind Marken → **nicht verwendet**, stattdessen neutrale Kürzel-Monogramme mit Farbton aus Hash (keine Markenfarben).
- **Sendungsbilder** (Bild-URLs in beiden Quellen) → **nicht verwendet** (Urheberrecht unklar, außerdem Drittanbieter-Requests = Datenschutz).
- Ergebnis: Restrisiko bei der XMLTV-Quelle bleibt (siehe `DATA_SOURCES.md`); für ein privates, werbefreies Projekt vertretbar, für kommerzielle Nutzung **nicht**.

## 3. Backend: kein Server – geplanter Job + statische JSON-Dateien

**Entscheidung:** GitHub Actions (Cron, 4×/Tag) holt, normalisiert und schreibt statische JSON-Dateien, baut die App und veröffentlicht alles zusammen.

**Warum:** Keine Datenbank, keine Serverfunktionen, nichts, das laufen/abstürzen/kosten kann. TV-Programm ändert sich selten; 6-h-Takt reicht. Clients bekommen einfache, cachebare Dateien.

**Datenformat:** `index.json` (Sender, Tage, Quellenstatus), `days/<TV-Tag>.json` (schlank, ~60 KB gz) und `details/<TV-Tag>.json` (Beschreibung, Besetzung; nur bei Bedarf). TV-Tag = 05:00–05:00 Uhr Berliner Zeit wie in Programmzeitschriften.

**Alternativen:** Supabase/Firebase (unnötig, Free-Tier pausiert/limitiert), Cloudflare Workers mit KV (möglich, aber mehr bewegliche Teile), Daten ins Repo committen (bläht Git-Historie auf).

## 4. Hosting: Cloudflare Pages (Direct Upload aus GitHub Actions)

**Warum:**
- Repo ist **privat** → GitHub Pages geht für private Repos nur mit kostenpflichtigem Plan.
- Cloudflare Pages Free: unbegrenzte Bandbreite/Requests für statische Dateien, 500 Builds/Monat, 20.000 Dateien, 25 MiB/Datei, kein Kreditkartenzwang. Wir nutzen ~130 Deployments/Monat und ~25 Dateien.
- `_headers` erlaubt strenge Sicherheits-Header (CSP mit Hash) und Cache-Steuerung.
- Brotli/Gzip automatisch; europäische Edge-Standorte.

**Alternativen:** Netlify Free (100 GB Bandbreite, Build-Minuten-Limit), Vercel Hobby (nur nicht-kommerziell, Bandbreitenlimit), GitHub Pages (privat kostenpflichtig).

**GitHub Actions (privates Repo):** GitHub Free enthält 2.000 Minuten/Monat. Verbrauch: Daten-Job ≈ 2 min × 4/Tag ≈ 240 min/Monat; CI ≈ 4 min je Push. Ohne hinterlegte Zahlungsmethode wird bei Erreichen des Kontingents gestoppt, nicht berechnet.

## 5. Frontend-Stack: Preact + Signals + Vite + TypeScript, kein CSS-Framework

**Warum:** ~40 KB JS (gzip) inkl. allem; React-kompatible API (wartbar, bekannt); Signals für feingranulare Reaktivität ohne Store-Bibliothek; Vite + `vite-plugin-pwa` (Workbox) für Build und Service Worker. Eigenes CSS mit Custom Properties statt Tailwind/Komponentenbibliothek → eigene Designsprache, kleine Datei.

**Alternativen:** React (3× größer), Svelte/SvelteKit (gut, aber Preact passt besser zur Wartbarkeit für viele), Vanilla TS (zu viel Eigenbau), Lit (Web Components, für Listen/Raster weniger ergonomisch).

## 6. Routing: Hash-Router

`#/jetzt`, `#/programm/2026-11-09`, `?d=<Sendung>` für die Detailansicht. Funktioniert ohne Server-Rewrites auf jedem Hoster und offline; Detail-Links sind teilbar und der Zurück-Button schließt das Detail.

## 7. Suche: eigene, client-seitige Fuzzy-Suche

Normalisierung (Umlaute, Akzente), Präfix-/Teilworttreffer und Damerau-Levenshtein (Buchstabendreher). Keine Bibliothek nötig (Fuse.js o. ä. wäre +10 KB). Beschreibungen nur auf Wunsch, weil sie ~3 MB (gzip) für alle Tage bedeuten.

## 8. Erinnerungen (v1.0 – abgelöst durch Abschnitt 15)

- Web-Apps können **ohne eigenen Push-Server** keine Benachrichtigung auslösen, wenn sie geschlossen sind. Die „Notification Triggers“-API wurde nie ausgeliefert. iOS erlaubt Web-Push nur für installierte PWAs und auch nur über einen Push-Server.
- Ein Push-Server bräuchte Backend, Speicherung von Push-Abos (personenbezogen) und Zeitsteuerung → widerspricht „kein Server, keine Daten“.
- **Umsetzung:** (1) **Kalender-Export (.ics) mit Alarm** – zuverlässig auf allen Geräten; (2) lokale Benachrichtigung, solange die App offen/im Hintergrund ist; beides klar so beschriftet.

## 9. Tipps ohne Clickbait

Feste, sichtbare Regeln (Spielfilm mit IMDb ≥ 7 bzw. ≥ 6,5 ohne Wiederholung, Live-Sport am Abend, neue Folge/Erstausstrahlung, Sonntagskrimi). Der Grund steht immer am Tipp. Keine Redaktionstipps der Quelle (Fremdinhalt).

## 10. Datenschutz by Design

Keine Cookies, kein Tracking, keine Webfonts/CDNs, keine Bilder Dritter, `Referrer-Policy: no-referrer`, alles Persönliche in `localStorage`. Daher keine Einwilligungsbanner nötig.

## 11. Lizenz: MIT

Einfach, verbreitet, erlaubt Wiederverwendung des Codes. Die **Daten** fallen nicht unter die Lizenz (Rechte der Sender/Quellen). Solange das Repo privat ist, hat die Lizenz nur Bedeutung für eine spätere Veröffentlichung.

## 4b. Nachtrag: Cloudflare Workers statt Pages

Das Projekt wurde als Cloudflare **Worker mit statischen Assets** angelegt (Cloudflare empfiehlt Workers inzwischen auch für reine statische Seiten). Funktional identisch: `_headers` gilt weiter, statische Requests sind kostenlos. `wrangler.jsonc` beschreibt das Deployment; `not_found_handling: none`, damit fehlende Daten ehrlich 404 liefern.

## 12. Branches & Commits

`main` = veröffentlichter Stand (Deploy), `develop` = Integration; Feature-Branches → PR → `develop` → `main`. Conventional Commits.

## 13. Bekannte `npm audit`-Meldungen (akzeptiert)

`npm audit` meldet moderate Schwachstellen in `deepmerge` und `glob` – beide nur transitiv über `workbox-build` (Build-Zeit von `vite-plugin-pwa`). Sie landen nicht im ausgelieferten Code und verarbeiten nur eigene Projektdateien. Der vorgeschlagene „Fix“ wäre ein Downgrade von `vite-plugin-pwa` auf 1.x. Entscheidung: nicht downgraden, bei neuer Workbox-Version aktualisieren.

## 14. Senderlogos: optional, von Wikimedia Commons (v1.2)

**Rechtslage (Recherche 08.11.2026, keine Rechtsberatung):**
- *Markenrecht* greift nur bei Nutzung „im geschäftlichen Verkehr“ (§ 14 MarkenG). Eine rein private, nicht-kommerzielle Nutzung ist nicht erfasst; allerdings können auch kostenlose, öffentlich erreichbare Angebote als geschäftlich gelten.
- *Urheberrecht:* Die meisten deutschen Senderlogos sind reine Text-/Formlogos unterhalb der Schöpfungshöhe und auf Wikimedia Commons als gemeinfrei („PD-textlogo“) gekennzeichnet. Verlässlich ist das nur, wo Commons es so führt.
- Flimmer ist öffentlich erreichbar (workers.dev-Adresse) → nicht „rein privat“.

**Entscheidung:** Logos sind eine **freiwillige Einstellung (Standard: aus)**. Eingeschaltet lädt das Gerät die Logos **direkt von Wikimedia Commons** (Flimmer hostet/verbreitet sie nicht). Übernommen wurden nur Dateien, die Commons als „Public domain“ führt (47 von 59 Sendern, ermittelt über Wikidata P154, aktuelles Logo, `scripts/fetch-logos.mjs`). CC-BY-SA-Dateien (Sat.1, ServusTV) und unpassende Treffer bleiben außen vor; dort bleibt das Kürzel. Datenschutz: Wikimedia sieht die IP – daher Einwilligung durch das Einschalten, Hinweis in der Datenschutzerklärung.

**Alternative für mehr Sicherheit:** App hinter Cloudflare Access (kostenlos bis 50 Nutzer) wirklich privat machen – dann wäre auch eigenes Hosting der Logos vertretbar.

## 15. Echte Push-Mitteilungen über den eigenen Worker (v1.2)

**Entscheidung:** Web Push (VAPID, RFC 8291/8292) über den bestehenden Cloudflare-Worker. Je Gerät ein **Durable Object** (SQLite, im Free-Tarif enthalten), das Push-Abo und Erinnerungen speichert und sich per **Alarm** genau zur Erinnerungszeit weckt.

**Warum so:**
- Kein Cron-Polling (ein Minuten-Cron mit KV würde das KV-Free-Limit von 1.000 List-Operationen/Tag reißen), keine Datenbank-Einrichtung (D1), punktgenau (im lokalen Test 0 s Abweichung).
- Eigene Implementierung der Verschlüsselung mit WebCrypto (~150 Zeilen, keine Abhängigkeit), byte-genau gegen den Testvektor aus RFC 8291 geprüft; lokaler Ende-zu-Ende-Test (`scripts/test-push-e2e.mjs`) mit Mock-Push-Dienst, der wie ein Browser entschlüsselt und die VAPID-Signatur prüft.
- Datensparsam: zufällige Geräte-ID, Push-Adresse, Erinnerungen (Titel, Zeit, Sender) – keine Konten, keine IPs. Gesendete Erinnerungen werden gelöscht, ungültige Abos und 60 Tage inaktive Geräte automatisch entfernt. Rechtsgrundlage Einwilligung.
- Schutz: nur bekannte Push-Dienste (Apple, Google, Mozilla, Microsoft) als Ziel, Größen-/Anzahllimits, Origin-Prüfung.

**iOS:** Web Push nur für installierte Web-Apps (Home-Bildschirm, ab iOS 16.4) und nach Nutzeraktion. Die App erkennt das und erklärt den Weg, statt still zu scheitern.

**Free-Tier-Verbrauch:** je Erinnerung 1 Alarm + 1 ausgehender Request; Durable Objects Free: 100.000 Requests/Tag, 5 GB Speicher – weit mehr als nötig.

## 16. Seitenübergänge per CSS statt View-Transitions-API (v1.2)

Die View-Transitions-API (Schieben alter + neuer Seite) brachte die WebKit-Engine im Test reproduzierbar zum Absturz (Überblenden nicht). Da iOS-Safari WebKit ist und das nicht auf echten Geräten überprüfbar war, animiert stattdessen nur die neue Seite per CSS (vorwärts von rechts, zurück von links, Tabs blenden). Dazu: Scroll-Position je Verlaufseintrag, Zurück-Leiste, Wisch-zurück vom linken Rand, Sheet per Wischen schließen.
