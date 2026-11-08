import { useRef, useState } from 'preact/hooks';
import type { Channel, ChannelGroup } from '../../shared/types';
import { ChannelBadge, PageHeader } from '../components/bits';
import { Icon } from '../components/Icon';
import { normalize } from '../lib/search';
import {
  channelPrefs,
  DEFAULT_FAVORITES,
  moveWithin,
  orderedChannels,
  resetChannelPrefs,
  setFavoriteOrder,
  setFavorites,
  toggleFavorite,
  toggleHidden,
} from '../store/channels';
import { showToast } from '../store/ui';

export const GROUP_LABEL: Record<ChannelGroup, string> = {
  haupt: 'Hauptsender',
  oeffentlich: 'Öffentlich-rechtlich',
  dritte: 'Dritte Programme',
  privat: 'Private Spartensender',
  info: 'Nachrichten & Doku',
  sport: 'Sport',
  kinder: 'Kinder',
  spezial: 'Musik, Österreich/Schweiz, Pay-TV',
};

/** Sortierbare Liste "Meine Sender": Ziehen (Maus/Touch) oder Pfeil-Buttons/Tastatur. */
function SortableFavorites({ list }: { list: Channel[] }) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const ids = list.map((c) => c.id);

  const onPointerDown = (e: PointerEvent, id: string) => {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDragId(id);
    setOverIdx(ids.indexOf(id));
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!dragId || !listRef.current) return;
    const items = Array.from(listRef.current.children) as HTMLElement[];
    let idx = items.length;
    for (let i = 0; i < items.length; i++) {
      const r = items[i]!.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        idx = i;
        break;
      }
    }
    setOverIdx(idx);
    // Autoscroll am Rand
    if (e.clientY < 80) window.scrollBy(0, -8);
    else if (e.clientY > window.innerHeight - 100) window.scrollBy(0, 8);
  };
  const onPointerUp = () => {
    if (dragId && overIdx !== null) {
      const from = ids.indexOf(dragId);
      const insertAt = overIdx > from ? overIdx - 1 : overIdx;
      if (insertAt !== from) {
        const next = ids.filter((x) => x !== dragId);
        next.splice(insertAt, 0, dragId);
        setFavoriteOrder(next);
      }
    }
    setDragId(null);
    setOverIdx(null);
  };

  if (!list.length) {
    return <p class="muted pad">Noch keine Sender ausgewählt. Markiere unten Sender mit dem Stern.</p>;
  }
  return (
    <ol class="sortable" ref={listRef} aria-label="Meine Sender, sortierbar">
      {list.map((c, i) => (
        <li
          key={c.id}
          class={`sort-item${dragId === c.id ? ' dragging' : ''}${overIdx === i && dragId && dragId !== c.id ? ' drop-target' : ''}`}
        >
          <span
            class="drag-handle"
            onPointerDown={(e) => onPointerDown(e, c.id)}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            aria-hidden="true"
            title="Ziehen zum Sortieren"
          >
            <Icon name="drag" size={22} />
          </span>
          <ChannelBadge channel={c} size="sm" />
          <span class="sort-name">{c.name}</span>
          <span class="sort-pos" aria-hidden="true">
            {i + 1}
          </span>
          <button
            type="button"
            class="icon-btn"
            aria-label={`${c.name} nach oben`}
            disabled={i === 0}
            onClick={(e) => {
              moveWithin(ids, c.id, -1);
              const btn = e.currentTarget as HTMLElement;
              requestAnimationFrame(() => btn.focus());
            }}
          >
            <Icon name="up" size={20} />
          </button>
          <button
            type="button"
            class="icon-btn"
            aria-label={`${c.name} nach unten`}
            disabled={i === list.length - 1}
            onClick={() => moveWithin(ids, c.id, 1)}
          >
            <Icon name="down" size={20} />
          </button>
          <button type="button" class="icon-btn" aria-label={`${c.name} aus „Meine Sender“ entfernen`} onClick={() => toggleFavorite(c.id)}>
            <Icon name="close" size={20} />
          </button>
        </li>
      ))}
    </ol>
  );
}

export function ChannelsManageView() {
  const [filter, setFilter] = useState('');
  const prefs = channelPrefs.value;
  const fav = new Set(prefs.favorites);
  const hidden = new Set(prefs.hidden);
  const favorites = orderedChannels.value.filter((c) => fav.has(c.id));
  const nf = normalize(filter);
  const groups = new Map<ChannelGroup, Channel[]>();
  for (const c of orderedChannels.value) {
    if (nf && !normalize(c.name).includes(nf)) continue;
    if (!groups.has(c.group)) groups.set(c.group, []);
    groups.get(c.group)!.push(c);
  }
  return (
    <div class="view view-manage">
      <PageHeader title="Sender verwalten" sub="Lege fest, welche Sender du siehst und in welcher Reihenfolge." />
      <section aria-labelledby="fav-h" class="card">
        <h2 id="fav-h" class="section-title">
          <Icon name="star" size={18} /> Meine Sender <span class="count">{favorites.length}</span>
        </h2>
        <p class="muted small">Ziehen am Griff oder Pfeiltasten zum Sortieren. Diese Reihenfolge gilt überall in der App.</p>
        <SortableFavorites list={favorites} />
      </section>

      <section aria-labelledby="all-h" class="card">
        <h2 id="all-h" class="section-title">
          Alle Sender
        </h2>
        <div class="searchbox searchbox-small">
          <Icon name="search" size={18} />
          <label class="sr-only" for="chfilter">
            Sender filtern
          </label>
          <input id="chfilter" type="search" placeholder="Sender filtern …" value={filter} onInput={(e) => setFilter((e.target as HTMLInputElement).value)} />
        </div>
        {[...groups.entries()].map(([g, list]) => (
          <div key={g} class="chgroup">
            <h3 class="chgroup-title">{GROUP_LABEL[g]}</h3>
            <ul class="chlist">
              {list.map((c) => (
                <li key={c.id} class={hidden.has(c.id) ? 'is-hidden' : ''}>
                  <ChannelBadge channel={c} size="sm" />
                  <a class="chlist-name" href={`#/sender/${c.id}`}>
                    {c.name}
                  </a>
                  <button
                    type="button"
                    class={`icon-btn${fav.has(c.id) ? ' on' : ''}`}
                    aria-pressed={fav.has(c.id)}
                    aria-label={`${c.name}: ${fav.has(c.id) ? 'aus Meine Sender entfernen' : 'zu Meine Sender hinzufügen'}`}
                    onClick={() => toggleFavorite(c.id)}
                  >
                    <Icon name="star" size={20} class={fav.has(c.id) ? '' : 'icon-outline'} />
                  </button>
                  <button
                    type="button"
                    class={`icon-btn${hidden.has(c.id) ? ' on-muted' : ''}`}
                    aria-pressed={hidden.has(c.id)}
                    aria-label={`${c.name}: ${hidden.has(c.id) ? 'wieder einblenden' : 'ausblenden'}`}
                    onClick={() => toggleHidden(c.id)}
                  >
                    <Icon name={hidden.has(c.id) ? 'eyeOff' : 'eye'} size={20} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
      <div class="row-actions">
        <button
          type="button"
          class="btn btn-ghost"
          onClick={() => {
            setFavorites(DEFAULT_FAVORITES);
            showToast('Standardauswahl übernommen');
          }}
        >
          Standardauswahl
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          onClick={() => {
            if (confirm('Senderauswahl, Reihenfolge und ausgeblendete Sender zurücksetzen?')) {
              resetChannelPrefs();
              showToast('Senderliste zurückgesetzt');
            }
          }}
        >
          Alles zurücksetzen
        </button>
      </div>
    </div>
  );
}
