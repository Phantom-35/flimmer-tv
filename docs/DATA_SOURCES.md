# Datenquellen

## Übersicht

| | ARD-Programm-API | XMLTV (epgshare01) |
|---|---|---|
| URL | `https://programm-api.ard.de/program/api/program?day=YYYY-MM-DD&channelIds=<id>` | `https://epgshare01.online/epgshare01/epg_ripper_DE1.xml.gz` (per `XMLTV_URL` änderbar) |
| Format | JSON, je Sender und Tag | XMLTV, gzip, ~3,6 MB (22 MB entpackt) |
| Auth | keine | keine |
| Kosten | keine | keine |
| Abrufe je Lauf | 17 Sender × 11 Tage = 187 kleine Requests (max. 4 parallel) | 1 Datei |
| Vorschau | heute −1 bis ca. +8 Tage | ca. 3–4 Tage |
| Stabilität | interne API von programm.ard.de, undokumentiert | Hobby-Projekt, seit Jahren betrieben |
| Ursprung der Daten | ARD / beteiligte Sender | Aggregation (u. a. Programmdaten großer Programmzeitschriften) |

## Sender-Zuordnung

Siehe `pipeline/channels.ts` – 59 kuratierte Sender mit ID je Quelle. Neuen Sender aufnehmen: Eintrag ergänzen, `npm run data` ausführen, im Log prüfen, dass keine Warnung `keine Daten für …` erscheint.

ARD-Kanal-IDs: `daserste, one, tagesschau24, alpha, ndr, wdr, br, hr, mdr, rbb, swr, sr, radiobremen, 3sat, arte, kika, phoenix`. `zdf`, `zdfneo`, `zdfinfo` liefern dort **keine** Daten (→ XMLTV).

## Datenqualität (Stichprobe 08.11.2026)

- Das Erste 20:15 „Tatort: Frei wie ein Adler“ – ARD-API und XMLTV übereinstimmend (Start 20:15, Ende 21:45, FSK 12, UT/AD) ✔
- ZDF 22:15 „The Zone of Interest“ (Drama, IMDb 7,3) ✔
- RTL 11:45–14:30 „Harry Potter und der Feuerkelch“, danach 14:30 „American Football: NFL“ ✔
- NDR 19:30: vier parallele Regionalmagazine → zusammengefasst als „Nordmagazin“ + „Parallel: Hamburg Journal, …“ ✔
- Bekannte Eigenheiten der XMLTV-Quelle: teils englische/französische Genrebezeichnungen, verwaiste `\"`-Escapes (werden bereinigt), Jahr = aktuelles Jahr bei Nachrichten (wird nur bei Film/Serie/Doku übernommen).

## Bereinigung (pipeline/normalize.ts)

1. Sortieren, Dubletten (gleicher Start + Titel) entfernen
2. Regionalfenster (gleicher Start, `isLocal`) zusammenfassen
3. Fehlendes Ende → Start der nächsten Sendung (max. 4 h) bzw. +30 min
4. Überlappungen kappen, Einträge < 1 min oder > 24 h verwerfen
5. Genre aus Kategorien (de/en/fr) → Titelregeln → „Folge“ ⇒ Serie → Senderstandard
6. Folgen aus Titeln wie „Rote Rosen (4417)“ lösen
7. Tipps nach festen Regeln berechnen

## Monitoring

`--strict` beendet den Job mit Code 2, wenn eine Quelle gestört ist oder < 85 % der Sender Daten für heute bzw. < 80 % für morgen haben. Der Workflow veröffentlicht trotzdem (mit Fallback) und schlägt dann fehl → E-Mail von GitHub. `status.json` liegt öffentlich unter `/data/status.json` und im Job-Summary.

## Rechtliche Einschätzung (keine Rechtsberatung)

- **ARD-API:** öffentlich, ohne Zugangsschranke vom Rundfunk selbst ausgeliefert. Keine ausdrücklichen Nutzungsbedingungen für die API gefunden. Moderate, identifizierbare Abrufe (User-Agent `FlimmerEPG/1.0`). Risiko: gering.
- **epgshare01:** frei angebotene Dateien; die Inhalte stammen aber ursprünglich von Dritten (Programmzeitschriften), deren AGB eine Weiterverbreitung untersagen dürften. Risiko: **mittel** – deshalb: keine Bilder, gekürzte Beschreibungen, keine Redaktionswertungen/-tipps, nicht-kommerziell, Quellenangabe. Bei Abmahnung oder Wunsch nach Rechtssicherheit: `XMLTV_URL` leeren bzw. Sender ohne ARD-Quelle entfernen (dann nur öffentlich-rechtliche Sender) oder eine lizenzierte Quelle einbinden.
- **Logos/Bilder:** nicht verwendet.
