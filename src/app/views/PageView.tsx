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
      <h2>Hinweise</h2>
      <p>
        {APP_CONFIG.appName} ist ein privates, nicht-kommerzielles Projekt ohne Werbung. Die Programmdaten stammen aus den unter{' '}
        <a href="#/seite/quellen">Datenquellen</a> genannten Quellen und werden automatisch verarbeitet. Für Richtigkeit, Vollständigkeit und Aktualität
        der Programmangaben wird keine Gewähr übernommen; maßgeblich sind die Angaben der Sender.
      </p>
      <p>
        Für Inhalte verlinkter externer Seiten sind ausschließlich deren Betreiber verantwortlich. Senderbezeichnungen sind Marken bzw. Namen der
        jeweiligen Inhaber und werden nur zur Identifikation genannt. Es werden keine Senderlogos verwendet.
      </p>
    </>
  );
}

function Datenschutz() {
  return (
    <>
      <PlaceholderWarning />
      <p class="lead">Kurz gesagt: Flimmer setzt keine Cookies, nutzt kein Tracking, keine Analyse-Dienste, keine Werbung und braucht kein Konto. Deine Einstellungen und deine Merkliste bleiben auf deinem Gerät.</p>

      <h2>1. Verantwortlicher</h2>
      <Address />
      <p>E-Mail: {op.email}</p>

      <h2>2. Bereitstellung der App (Hosting)</h2>
      <p>
        Die App und die Programmdaten werden als statische Dateien über {APP_CONFIG.hosting.name}, {APP_CONFIG.hosting.address}, ausgeliefert. Beim Abruf
        verarbeitet der Hoster technisch notwendig Verbindungsdaten (insbesondere IP-Adresse, Zeitpunkt, abgerufene Datei, Browser-Kennung), um die
        Dateien auszuliefern und Angriffe abzuwehren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an einer sicheren und
        stabilen Bereitstellung). Der Betreiber selbst wertet diese Daten nicht aus und erstellt keine Nutzungsprofile.
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
        Programmdaten für die Offline-Nutzung. Diese Daten werden nicht an den Betreiber oder Dritte übertragen.
      </p>
      <p>
        Die Speicherung ist für den von dir ausdrücklich gewünschten Dienst unbedingt erforderlich (§ 25 Abs. 2 Nr. 2 TDDDG). Du kannst alle Daten
        jederzeit unter <a href="#/einstellungen">Einstellungen → Alle Daten löschen</a> oder über die Browser-Einstellungen entfernen.
      </p>

      <h2>4. Benachrichtigungen, Kalender und Teilen</h2>
      <p>
        Erinnerungen werden lokal auf deinem Gerät ausgelöst; es gibt keinen Push-Server und keine Übermittlung an Dritte. Die Erlaubnis für
        Benachrichtigungen erteilst und widerrufst du in deinem Browser. Kalenderdateien (.ics) werden auf deinem Gerät erzeugt. Beim Teilen
        übergibt Flimmer Titel, Sendezeit und Link an die Teilen-Funktion deines Betriebssystems; was dann geschieht, bestimmst du.
      </p>

      <h2>5. Keine externen Inhalte</h2>
      <p>
        Flimmer lädt keine Schriftarten, Skripte, Bilder oder sonstigen Inhalte von Drittanbietern. Alle Dateien kommen vom oben genannten Hoster.
        Links zu externen Seiten werden erst beim Anklicken aufgerufen.
      </p>

      <h2>6. Kontakt per E-Mail</h2>
      <p>
        Wenn du eine E-Mail schreibst, werden deine Angaben (E-Mail-Adresse, Inhalt) zur Bearbeitung deiner Anfrage verarbeitet (Art. 6 Abs. 1 lit. b
        bzw. f DSGVO) und gelöscht, sobald sie nicht mehr erforderlich sind.
      </p>

      <h2>7. Deine Rechte</h2>
      <p>
        Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18),
        Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Außerdem kannst du dich bei einer Datenschutz-Aufsichtsbehörde beschweren
        (Art. 77 DSGVO), etwa bei der Behörde deines Wohnorts.
      </p>
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
        Flimmer zeigt bewusst keine Senderlogos und keine Sendungsbilder, weil deren Nutzung marken- und urheberrechtlich nicht eindeutig erlaubt ist.
        Stattdessen gibt es neutrale Kürzel. Senderbezeichnungen dienen nur der Identifikation.
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
        Tippe in einer Sendung auf „Erinnern“. Solange Flimmer geöffnet ist oder im Hintergrund läuft, bekommst du eine Benachrichtigung. Web-Apps
        können ohne eigenen Server nicht benachrichtigen, wenn sie ganz geschlossen sind – daher gibt es den Kalender-Export: Der Termin landet mit Alarm
        in deinem Kalender und erinnert dich zuverlässig.
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
      <Faq q="Warum gibt es keine Senderlogos?">
        Logos sind Marken der Sender, deren Nutzung nicht eindeutig erlaubt ist. Die farbigen Kürzel sind eine saubere Alternative.
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
      <a class="backlink" href="#/mehr">
        <Icon name="back" size={18} /> Mehr
      </a>
      <PageHeader title={page.title} />
      <article class="prose">{page.render()}</article>
    </div>
  );
}
