import type { ComponentChildren } from 'preact';
import { APP_CONFIG, hasPlaceholders } from '../../../app.config';
import { EmptyState, PageHeader } from '../components/bits';
import { Icon } from '../components/Icon';
import { CHANGELOG } from '../content/changelog';
import { route } from '../router';
import { index } from '../store/data';
import { DataStamp } from '../components/Shell';

const op = APP_CONFIG.operator;

function PlaceholderWarning() {
  if (!hasPlaceholders()) return null;
  return (
    <p class="note note-warn" role="note">
      <Icon name="info" size={18} />
      <span>
        <strong>Vorlage:</strong> Die Angaben in [ECKIGEN KLAMMERN] sind Platzhalter und müssen vom Betreiber in <code>app.config.ts</code> ausgefüllt
        werden. Die Texte sind sorgfältig erstellt, ersetzen aber keine Rechtsberatung.
      </span>
    </p>
  );
}

function Address() {
  return (
    <address>
      {op.name}
      <br />
      {op.street}
      <br />
      {op.city}
      <br />
      {op.country}
    </address>
  );
}

function Impressum() {
  return (
    <>
      <PlaceholderWarning />
      <h2>Angaben gemäß § 5 DDG</h2>
      <Address />
      <h2>Kontakt</h2>
      <p>
        E-Mail: {op.email.startsWith('[') ? op.email : <a href={`mailto:${op.email}`}>{op.email}</a>}
        {op.phone ? (
          <>
            <br />
            Telefon: {op.phone}
          </>
        ) : null}
      </p>
      <h2>Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV</h2>
      <p>
        {op.name}, Anschrift wie oben.
      </p>
      <h2>Über das Projekt</h2>
      <p>
        {APP_CONFIG.appName} ist ein privates, nicht-kommerzielles Projekt. Die App ist kostenlos, enthält keine Werbung und steht in keiner Verbindung
        zu den genannten Fernsehsendern.
      </p>
      <h2>Verbraucherstreitbeilegung</h2>
      <p>Ich bin nicht bereit und nicht verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      <h2>Haftung für Inhalte</h2>
      <p>
        Die Inhalte wurden mit größter Sorgfalt erstellt. Die Programmangaben werden automatisch aus den unter{' '}
        <a href="#/seite/quellen">Datenquellen</a> genannten externen Quellen übernommen und können sich kurzfristig ändern. Für ihre Richtigkeit,
        Vollständigkeit und Aktualität kann ich keine Gewähr übernehmen. Maßgeblich sind die Angaben der Sender.
      </p>
      <h2>Haftung für Links</h2>
      <p>
        Die App enthält Links zu externen Seiten Dritter, auf deren Inhalte ich keinen Einfluss habe. Für diese Inhalte ist stets der jeweilige Anbieter
        verantwortlich. Bei Bekanntwerden von Rechtsverletzungen entferne ich solche Links umgehend.
      </p>
      <h2>Marken und Daten</h2>
      <p>
        Senderbezeichnungen sind Marken bzw. Namen der jeweiligen Inhaber und werden nur zur Identifikation genannt. Es werden keine Senderlogos und
        keine Sendungsbilder verwendet. Programmdaten: ARD-Programm-API und XMLTV-Sammlung von epgshare01 (Rechte bei den jeweiligen Sendern).
      </p>
      <h2>Urheberrecht</h2>
      <p>
        Gestaltung, Texte und Programmcode von {APP_CONFIG.appName} unterliegen dem deutschen Urheberrecht. Eine Vervielfältigung oder Verwendung
        außerhalb der Grenzen des Urheberrechts bedarf meiner vorherigen Zustimmung.
      </p>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <PlaceholderWarning />
      <p class="lead">
        Kurz gesagt: Flimmer setzt keine Cookies, nutzt kein Tracking, keine Analyse-Dienste, keine Werbung und braucht kein Konto. Deine
        Einstellungen und deine Merkliste bleiben auf deinem Gerät. Nur wenn du Mitteilungen einschaltest, speichert der Server die dafür nötigen
        Erinnerungszeiten.
      </p>

      <h2>1. Verantwortlicher</h2>
      <Address />
      <p>E-Mail: {op.email.startsWith('[') ? op.email : <a href={`mailto:${op.email}`}>{op.email}</a>}</p>
      <p>Ein Datenschutzbeauftragter ist nicht bestellt und gesetzlich nicht erforderlich.</p>

      <h2>2. Bereitstellung der App (Hosting)</h2>
      <p>
        Die App und die Programmdaten werden als statische Dateien über {APP_CONFIG.hosting.name}, {APP_CONFIG.hosting.address}, ausgeliefert. Beim Abruf
        verarbeitet der Hoster technisch notwendig Verbindungsdaten (insbesondere IP-Adresse, Zeitpunkt, abgerufene Datei, Browser-Kennung), um die
        Dateien auszuliefern und Angriffe abzuwehren. Diese Protokolle werden nur kurzzeitig gespeichert. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren und
        stabilen Bereitstellung). Ich selbst werte diese Daten nicht aus und erstelle keine Nutzungsprofile.
      </p>
      <p>
        Der Hoster ist ein Unternehmen mit Sitz in den USA. Eine Übermittlung in die USA ist möglich; sie stützt sich auf den
        Angemessenheitsbeschluss der EU-Kommission zum EU-U.S. Data Privacy Framework, unter dem der Hoster zertifiziert ist, sowie auf
        Standardvertragsklauseln. Mehr dazu:{' '}
        <a href={APP_CONFIG.hosting.privacyUrl} target="_blank" rel="noopener noreferrer">
          Datenschutzhinweise des Hosters
        </a>
        .
      </p>

      <h2>3. Speicherung auf deinem Gerät</h2>
      <p>
        Flimmer speichert folgende Daten ausschließlich lokal in deinem Browser (Local Storage und Cache Storage): deine Einstellungen (z. B.
        Farbschema, Schriftgröße), deine Senderauswahl und -reihenfolge, deine Merkliste mit Erinnerungen sowie die App-Dateien und
        Programmdaten für die Offline-Nutzung. Diese Daten werden weder an mich noch an Dritte übertragen.
      </p>
      <p>
        Die Speicherung ist für den von dir ausdrücklich gewünschten Dienst unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst alle Daten
        jederzeit unter <a href="#/einstellungen">Einstellungen → Alle Daten löschen</a> oder über die Browser-Einstellungen entfernen.
      </p>

      <h2>4. Mitteilungen (Push)</h2>
      <p>
        Nur wenn du unter Einstellungen „Mitteilungen“ einschaltest bzw. bei einer Sendung „Erinnern“ wählst und dein Gerät die Erlaubnis erteilt,
        speichert der Server von Flimmer (Cloudflare, siehe Abschnitt 2): eine zufällige Geräte-Kennung, die technische Push-Adresse deines
        Browsers mit den zugehörigen Schlüsseln sowie für jede Erinnerung Zeitpunkt, Titel, Sender und Sendezeit. Namen, E-Mail-Adressen oder
        IP-Adressen werden dabei nicht gespeichert.
      </p>
      <p>
        Zugestellt wird die Mitteilung über den Push-Dienst deines Browsers bzw. Betriebssystems (z. B. Apple, Google oder Mozilla). Der Inhalt
        ist dabei Ende-zu-Ende verschlüsselt; der Push-Dienst kann ihn nicht lesen.
      </p>
      <p>
        Rechtsgrundlage ist deine Einwilligung (Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TDDDG). Du kannst sie jederzeit widerrufen: Mitteilungen in
        den Einstellungen ausschalten (dann löscht der Server sofort alle Daten deines Geräts) oder in den Mitteilungs-Einstellungen deines Geräts.
        Gesendete Erinnerungen werden sofort entfernt. Ungültig gewordene Push-Adressen löscht der Server automatisch, ebenso alle Daten eines
        Geräts, das sich 60 Tage lang nicht gemeldet hat.
      </p>

      <h2>5. Kalender und Teilen</h2>
      <p>
        Kalenderdateien (.ics) werden auf deinem Gerät erzeugt. Beim Teilen übergibt Flimmer Titel, Sendezeit und Link an die Teilen-Funktion deines
        Betriebssystems; was dann geschieht, bestimmst du.
      </p>

      <h2>6. Inhalte Dritter: Senderlogos (optional)</h2>
      <p>
        Standardmäßig lädt Flimmer keine Schriftarten, Skripte, Bilder oder sonstigen Inhalte von Drittanbietern. Nur wenn du in den Einstellungen
        „Senderlogos“ einschaltest, lädt dein Gerät die Logos direkt von Wikimedia Commons (Wikimedia Foundation, Inc., San Francisco, USA).
        Dabei erhält die Wikimedia Foundation deine IP-Adresse und übliche technische Angaben deines Browsers. Rechtsgrundlage ist deine Einwilligung
        durch das Einschalten (Art. 6 Abs. 1 lit. a DSGVO), die du durch Ausschalten jederzeit widerrufen kannst. Mehr dazu:{' '}
        <a href="https://foundation.wikimedia.org/wiki/Policy:Privacy_policy/de" target="_blank" rel="noopener noreferrer">
          Datenschutzrichtlinie der Wikimedia Foundation
        </a>
        . Links zu externen Seiten werden erst beim Anklicken aufgerufen.
      </p>

      <h2>7. Kontakt per E-Mail</h2>
      <p>
        Wenn du eine E-Mail schreibst, werden deine Angaben (E-Mail-Adresse, Inhalt) zur Bearbeitung deiner Anfrage verarbeitet (Art. 6 Abs. 1 lit. b
        bzw. f DSGVO) und gelöscht, sobald sie nicht mehr erforderlich sind.
      </p>

      <h2>8. Deine Rechte</h2>
      <p>Du hast jederzeit das Recht auf</p>
      <ul class="plain">
        <li>Auskunft über deine gespeicherten Daten (Art. 15 DSGVO),</li>
        <li>Berichtigung (Art. 16 DSGVO) und Löschung (Art. 17 DSGVO),</li>
        <li>Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
        <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
        <li>Widerspruch gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO),</li>
        <li>Widerruf einer Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3 DSGVO).</li>
      </ul>
      <p>
        Eine kurze Nachricht an {op.email} genügt. Da Flimmer ohne Konto auskommt und deine Einstellungen nur auf deinem Gerät liegen, speichere ich
        über dich in der Regel keine Daten.
      </p>
      <p>
        Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren (Art. 77 DSGVO), zum Beispiel bei der für mich zuständigen Behörde:{' '}
        <a href={APP_CONFIG.supervisoryAuthority.url} target="_blank" rel="noopener noreferrer">
          {APP_CONFIG.supervisoryAuthority.name}
        </a>
        .
      </p>

      <h2>9. Änderungen</h2>
      <p>Wenn sich die App oder die Rechtslage ändert, passe ich diese Erklärung an. Es gilt die jeweils hier veröffentlichte Fassung.</p>
      <p class="muted small">Stand: November 2026</p>
    </>
  );
}

function Quellen() {
  const sources = index.value?.sources ?? [];
  return (
    <>
      <h2>Programmdaten</h2>
      <p>
        <DataStamp long />
      </p>
      <ul class="plain">
        <li>
          <strong>ARD-Programm-API</strong> (programm.ard.de) – Das Erste, Dritte Programme, ONE, ARD alpha, tagesschau24, 3sat, arte, KiKA und phoenix.
          Programmangaben © ARD und die jeweiligen Sender.
        </li>
        <li>
          <strong>XMLTV-Sammlung von epgshare01</strong> (epgshare01.online) – alle weiteren Sender sowie Ergänzungen wie Genre, Staffel/Folge,
          Jahr, Land und Besetzung. Programmangaben © der jeweiligen Sender bzw. Rechteinhaber. IMDb-Wertungen stammen aus diesen Daten; IMDb ist eine
          Marke der IMDb.com, Inc.
        </li>
      </ul>
      {sources.length ? (
        <p class="muted small">
          Letzter Abruf: {sources.map((s) => `${s.name} ${s.ok ? '✓' : '⚠'} (${s.count} Sendungen)`).join(' · ')}
        </p>
      ) : null}
      <p>
        Die Daten werden automatisch alle sechs Stunden abgerufen, vereinheitlicht und als statische Dateien bereitgestellt. Angaben ohne Gewähr –
        kurzfristige Programmänderungen der Sender sind möglich.
      </p>
      <h2>Senderlogos und Bilder</h2>
      <p>
        Standardmäßig zeigt Flimmer neutrale Kürzel statt Senderlogos und keine Sendungsbilder. Wer möchte, kann in den Einstellungen Senderlogos
        einschalten: Sie werden dann direkt von Wikimedia Commons geladen und nicht von Flimmer verbreitet. Die Logos sind Marken der jeweiligen
        Sender und werden nur zur Identifikation angezeigt; Lizenzangaben stehen auf der jeweiligen Commons-Dateiseite.
      </p>
      <h2>Open-Source-Software</h2>
      <p>In der App enthalten (jeweils MIT-Lizenz):</p>
      <ul class="plain">
        <li>Preact und @preact/signals – © Jason Miller und Mitwirkende</li>
        <li>Workbox (Service Worker) – © Google LLC</li>
        <li>vite-plugin-pwa – © Anthony Fu und Mitwirkende</li>
      </ul>
      <p>Für Build, Tests und Daten-Job: Vite, TypeScript, Vitest, Playwright, ESLint, fast-xml-parser, tsx – alle MIT- bzw. Apache-2.0-lizenziert.</p>
      <h2>Danke</h2>
      <p>An die Sender für ihre öffentlich zugänglichen Programmangaben und an alle, die freie EPG-Daten und Open-Source-Software pflegen.</p>
    </>
  );
}

function Ueber() {
  return (
    <>
      <p class="lead">{APP_CONFIG.tagline} Flimmer zeigt dir in zwei Sekunden, was gerade läuft und was heute Abend kommt – ohne Werbung, ohne Clickbait, ohne Tracking.</p>
      <dl class="facts">
        <dt>Version</dt>
        <dd>{__APP_VERSION__}</dd>
        <dt>Gebaut</dt>
        <dd>{new Date(__BUILD_DATE__).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })}</dd>
        <dt>Daten</dt>
        <dd>
          <DataStamp long />
        </dd>
        <dt>Lizenz</dt>
        <dd>MIT</dd>
      </dl>
      <h2>Prinzipien</h2>
      <ul class="plain">
        <li>Das Wichtigste zuerst: Jetzt, 20:15, deine Sender.</li>
        <li>Keine Werbung, keine gekauften Tipps, keine Konten, keine Tracker.</li>
        <li>Schnell auch im schwachen Netz, offline nutzbar.</li>
        <li>Barrierearm: gut lesbar, per Tastatur und Screenreader bedienbar.</li>
      </ul>
      <h2>Änderungen</h2>
      {CHANGELOG.map((c) => (
        <section key={c.version} class="changelog">
          <h3>
            {c.version} <span class="muted small">· {new Date(c.date).toLocaleDateString('de-DE')}</span>
          </h3>
          <ul class="plain">
            {c.items.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Faq({ q, children }: { q: string; children: ComponentChildren }) {
  return (
    <details class="faq">
      <summary>{q}</summary>
      <div>{children}</div>
    </details>
  );
}

function Hilfe() {
  return (
    <>
      <Faq q="Woher kommen die Daten und wie aktuell sind sie?">
        Aus der ARD-Programm-API und einer freien XMLTV-Sammlung (siehe <a href="#/seite/quellen">Datenquellen</a>). Sie werden alle sechs Stunden
        aktualisiert; den Stand siehst du unter „Mehr“.
      </Faq>
      <Faq q="Warum reicht das Programm mancher Sender nur ein paar Tage?">
        Für die öffentlich-rechtlichen Sender gibt es rund 8 Tage Vorschau, für private Sender liefert die freie Quelle meist 3–4 Tage. Neue Tage kommen
        automatisch dazu.
      </Faq>
      <Faq q="Wie lege ich meine Sender fest?">
        Unter <a href="#/sender-verwalten">Sender verwalten</a>: Mit dem Stern landet ein Sender in „Meine Sender“, mit dem Auge blendest du ihn ganz aus.
        Die Reihenfolge änderst du per Ziehen am Griff oder mit den Pfeil-Buttons.
      </Faq>
      <Faq q="Wie funktionieren Erinnerungen?">
        Tippe in einer Sendung auf „Erinnern“ und erlaube Mitteilungen. Du bekommst dann vor Beginn eine Mitteilung – auch wenn Flimmer geschlossen
        ist. Auf dem iPhone/iPad geht das nur, wenn Flimmer über Safari → Teilen → „Zum Home-Bildschirm“ installiert ist (ab iOS 16.4). Den Vorlauf
        stellst du in den Einstellungen ein; dort kannst du auch eine Test-Mitteilung schicken. Alternativ: „Kalender“ übernimmt den Termin mit Alarm.
      </Faq>
      <Faq q="Wie installiere ich Flimmer?">
        <strong>Android/Chrome/Edge:</strong> Menü → „App installieren“ bzw. der Button unter „Mehr“. <strong>iPhone/iPad:</strong> In Safari auf Teilen →
        „Zum Home-Bildschirm“. <strong>Desktop:</strong> Install-Symbol in der Adressleiste.
      </Faq>
      <Faq q="Funktioniert Flimmer offline?">
        Ja. Die App selbst und alle bereits geladenen Programmtage bleiben verfügbar. Heute und morgen werden automatisch vorgeladen.
      </Faq>
      <Faq q="Was bedeuten die Tipps?">
        Tipps sind keine Werbung. Sie entstehen nach festen Regeln, z. B. Spielfilm mit guter IMDb-Wertung zur besten Sendezeit, Live-Sport oder
        Erstausstrahlung. Der Grund steht immer dabei.
      </Faq>
      <Faq q="Kann ich Senderlogos sehen?">
        Ja, unter Einstellungen → „Senderlogos“. Sie werden dann von Wikimedia Commons geladen (dabei sieht Wikimedia deine IP-Adresse). Für Sender
        ohne freies Logo bleibt das Kürzel.
      </Faq>
      <Faq q="Was passiert mit meinen Daten?">
        Nichts – sie bleiben auf deinem Gerät. Details in der <a href="#/seite/datenschutz">Datenschutzerklärung</a>. Unter Einstellungen kannst du sie
        exportieren, importieren (z. B. auf ein anderes Gerät) oder löschen.
      </Faq>
      <Faq q="Welche Tastaturkürzel gibt es?">
        <kbd>?</kbd> zeigt alle Kürzel. Die wichtigsten: <kbd>/</kbd> Suche, <kbd>J</kbd> Jetzt, <kbd>P</kbd> Programm, <kbd>M</kbd> Merkliste, im Raster{' '}
        <kbd>N</kbd> springt zu jetzt und die Pfeiltasten bewegen sich durch die Sendungen.
      </Faq>
      <Faq q="Eine Sendung stimmt nicht – was tun?">
        Kurzfristige Änderungen der Sender kommen mit der nächsten Aktualisierung. Bleibt ein Fehler, freuen wir uns über{' '}
        <a href="#/seite/feedback">Feedback</a>.
      </Faq>
    </>
  );
}

function Feedback() {
  const mail = op.email.startsWith('[') ? '' : op.email;
  const subject = encodeURIComponent(`Flimmer ${__APP_VERSION__}: Feedback`);
  const body = encodeURIComponent(`\n\n---\nVersion: ${__APP_VERSION__}\nGerät/Browser: ${navigator.userAgent}`);
  return (
    <>
      <PlaceholderWarning />
      <p class="lead">Fehler gefunden, Wunsch, Lob? Gerne her damit.</p>
      <div class="button-list">
        {mail ? (
          <a class="btn btn-accent" href={`mailto:${mail}?subject=${subject}&body=${body}`}>
            <Icon name="mail" size={18} /> E-Mail schreiben
          </a>
        ) : (
          <p class="muted">E-Mail: {op.email}</p>
        )}
        {APP_CONFIG.feedbackUrl ? (
          <a class="btn" href={APP_CONFIG.feedbackUrl} target="_blank" rel="noopener noreferrer">
            <Icon name="external" size={18} /> Fehler melden
          </a>
        ) : null}
      </div>
      <p class="muted small">Die E-Mail enthält automatisch Version und Browser, damit Fehler leichter nachvollziehbar sind. Du kannst das vor dem Senden löschen.</p>
    </>
  );
}

const PAGES: Record<string, { title: string; render: () => ComponentChildren }> = {
  impressum: { title: 'Impressum', render: Impressum },
  datenschutz: { title: 'Datenschutz', render: Datenschutz },
  quellen: { title: 'Datenquellen & Lizenzen', render: Quellen },
  ueber: { title: 'Über Flimmer', render: Ueber },
  hilfe: { title: 'Hilfe & FAQ', render: Hilfe },
  feedback: { title: 'Feedback & Kontakt', render: Feedback },
};

export function PageView() {
  const slug = route.value.path[1] ?? '';
  const page = PAGES[slug];
  if (!page) {
    return (
      <div class="view">
        <EmptyState title="Seite nicht gefunden" action={<a class="btn" href="#/mehr">Zur Übersicht</a>} />
      </div>
    );
  }
  return (
    <div class="view view-page">
      <PageHeader title={page.title} />
      <article class="prose">{page.render()}</article>
    </div>
  );
}
