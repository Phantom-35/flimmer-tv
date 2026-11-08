import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dayLabel, tvDayOf } from '../../shared/time';
import type { GenreKey, Programme } from '../../shared/types';
import { EmptyState, PageHeader } from '../components/bits';
import { GenreFilter } from '../components/Filters';
import { Icon } from '../components/Icon';
import { ProgrammeLine } from '../components/ProgrammeRow';
import { prepareField, prepareQuery, scoreDocument } from '../lib/search';
import { route, setQuery } from '../router';
import { myChannels, visibleChannels } from '../store/channels';
import { channelsById, dataVersion, getDetailsLoaded, index, loadDay, loadDetails, loadedDays, now, today } from '../store/data';
import { settings, updateSettings } from '../store/settings';
import { announce } from '../store/ui';

const SUGGESTIONS = ['Tatort', 'Bundesliga', 'Dokumentation', 'Harry Potter', 'Quiz', 'Krimi'];

interface Hit {
  p: Programme;
  ch: string;
  score: number;
}

export function SearchView() {
  const r = route.value;
  const qParam = r.query.get('q') ?? '';
  const genre = (r.query.get('genre') ?? '') as GenreKey | '';
  const onlyMine = r.query.get('sender') !== 'alle';
  const [input, setInput] = useState(qParam);
  const [loadingAll, setLoadingAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const days = index.value?.days ?? [];
  const t = today.value;
  const nowMs = now.value;
  const withDesc = settings.value.searchDescriptions;
  void dataVersion.value;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Alle Tage ab heute laden (klein, gecacht) – heute und morgen zuerst, damit Treffer
  // chronologisch von oben wachsen (kein Springen). Beschreibungen nur auf Wunsch.
  useEffect(() => {
    let cancelled = false;
    const upcoming = days.filter((d) => d >= t);
    setLoadingAll(true);
    void (async () => {
      await Promise.all(upcoming.slice(0, 2).map(loadDay));
      for (const d of upcoming.slice(2)) {
        if (cancelled) return;
        await loadDay(d);
      }
      if (withDesc) await Promise.all(upcoming.map(loadDetails));
      if (!cancelled) setLoadingAll(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [days.join(), t, withDesc]);

  // Eingabe entprellt in die URL übernehmen.
  useEffect(() => {
    const id = setTimeout(() => {
      if (input !== qParam) setQuery({ q: input || undefined });
    }, 180);
    return () => clearTimeout(id);
  }, [input]);

  const allowed = useMemo(
    () => new Set((onlyMine ? myChannels.value : visibleChannels.value).map((c) => c.id)),
    [onlyMine, myChannels.value, visibleChannels.value],
  );

  const hits = useMemo<Hit[]>(() => {
    const q = prepareQuery(qParam);
    if (!q.tokens.length) return [];
    const nowSec = Date.now() / 1000;
    const out: Hit[] = [];
    const seen = new Set<string>();
    for (const file of loadedDays()) {
      if (file.day < t) continue;
      const details = withDesc ? getDetailsLoaded(file.day) : undefined;
      for (const [ch, progs] of Object.entries(file.p)) {
        if (!allowed.has(ch)) continue;
        for (const p of progs) {
          if (p.e < nowSec || seen.has(p.i)) continue;
          if (genre && p.g !== genre) continue;
          const sec = [p.st, p.gr, p.ep].filter(Boolean).join(' ');
          const desc = details?.x[p.i];
          const tert = desc ? [desc.d, desc.dir, desc.cast?.join(' ')].filter(Boolean).join(' ') : undefined;
          const score = scoreDocument(q, prepareField(p.t), prepareField(sec), tert ? prepareField(tert) : undefined);
          if (score > 0) {
            seen.add(p.i);
            out.push({ p, ch, score });
          }
        }
      }
    }
    // Relevanz in Stufen, innerhalb einer Stufe chronologisch.
    const max = Math.max(0, ...out.map((h) => h.score));
    return out
      .filter((h) => h.score >= max * 0.35)
      .sort((a, b) => a.p.s - b.p.s)
      .slice(0, 300);
  }, [qParam, genre, allowed, withDesc, dataVersion.value, t]);

  useEffect(() => {
    if (qParam) announce(hits.length ? `${hits.length} Treffer` : 'Keine Treffer');
  }, [hits.length, qParam]);

  // Nach Tag gruppieren
  const groups = new Map<string, Hit[]>();
  for (const h of hits) {
    const d = tvDayOf(h.p.s * 1000);
    if (!groups.has(d)) groups.set(d, []);
    groups.get(d)!.push(h);
  }

  return (
    <div class="view view-search">
      <PageHeader title="Suche" />
      <form
        class="searchbox"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery({ q: input || undefined });
          inputRef.current?.blur();
        }}
      >
        <Icon name="search" size={20} />
        <label class="sr-only" for="q">
          Sendung suchen
        </label>
        <input
          id="q"
          ref={inputRef}
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellcheck={false}
          placeholder="Sendung, Serie, Film …"
          value={input}
          onInput={(e) => setInput((e.target as HTMLInputElement).value)}
        />
        {input ? (
          <button type="button" class="icon-btn" aria-label="Eingabe löschen" onClick={() => { setInput(''); setQuery({ q: undefined }); inputRef.current?.focus(); }}>
            <Icon name="close" size={18} />
          </button>
        ) : null}
      </form>
      <div class="toolbar toolbar-wrap">
        <label class="switch">
          <input type="checkbox" checked={onlyMine} onChange={(e) => setQuery({ sender: (e.target as HTMLInputElement).checked ? undefined : 'alle' })} />
          <span>Nur meine Sender</span>
        </label>
        <label class="switch">
          <input type="checkbox" checked={withDesc} onChange={(e) => updateSettings({ searchDescriptions: (e.target as HTMLInputElement).checked })} />
          <span>Beschreibungen durchsuchen <small>(lädt ca. 3 MB)</small></span>
        </label>
      </div>
      <div class="toolbar filters">
        <GenreFilter value={genre} onChange={(g) => setQuery({ genre: g || undefined })} />
      </div>
      {!qParam ? (
        <div class="search-suggest">
          <p class="muted">Vorschläge:</p>
          <div class="chips">
            {SUGGESTIONS.map((s) => (
              <button type="button" class="chip" key={s} onClick={() => { setInput(s); setQuery({ q: s }); }}>
                {s}
              </button>
            ))}
          </div>
          <p class="muted small">Tippfehler sind kein Problem: „Tatrot“ findet auch „Tatort“. Die Suche läuft komplett auf deinem Gerät – auch offline.</p>
        </div>
      ) : !hits.length ? (
        loadingAll ? (
          <p class="muted pad" role="status">Suche läuft …</p>
        ) : (
          <EmptyState icon="search" title={`Nichts gefunden für „${qParam}“`}>
            {onlyMine ? 'Probiere „Nur meine Sender“ auszuschalten' : 'Probiere einen anderen Suchbegriff'}
            {!withDesc ? ' oder durchsuche auch die Beschreibungen.' : '.'}
          </EmptyState>
        )
      ) : (
        <div class="search-results">
          <p class="muted small" aria-hidden="true">
            {hits.length === 300 ? 'Mehr als 300' : hits.length} Treffer
          </p>
          {[...groups.entries()].map(([d, list]) => (
            <section key={d} aria-labelledby={`sg-${d}`}>
              <h2 class="section-title sticky-title" id={`sg-${d}`}>
                {dayLabel(d, t, true)}
              </h2>
              <ul class="lines">
                {list.map((h) => (
                  <ProgrammeLine key={h.p.i} p={h.p} channel={channelsById.value.get(h.ch)} nowMs={nowMs} showChannel />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
