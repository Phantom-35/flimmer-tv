import { useEffect, useRef } from 'preact/hooks';
import { GENRES } from '../../shared/genres';
import { dayLabel, parseIsoDate, shortWeekday } from '../../shared/time';
import type { GenreKey } from '../../shared/types';
import { hasFavorites } from '../store/channels';
import { index, today } from '../store/data';

export function GenreChips({
  value,
  onChange,
  counts,
}: {
  value: GenreKey | '';
  onChange: (g: GenreKey | '') => void;
  counts?: Partial<Record<GenreKey, number>>;
}) {
  const options = GENRES.filter((g) => g.key !== 'sonstiges' && (!counts || (counts[g.key] ?? 0) > 0 || value === g.key));
  return (
    <div class="chips" role="group" aria-label="Nach Genre filtern">
      <button type="button" class={`chip${value === '' ? ' active' : ''}`} aria-pressed={value === ''} onClick={() => onChange('')}>
        Alle
      </button>
      {options.map((g) => (
        <button
          type="button"
          key={g.key}
          class={`chip chip-genre g-${g.key}${value === g.key ? ' active' : ''}`}
          aria-pressed={value === g.key}
          onClick={() => onChange(value === g.key ? '' : g.key)}
        >
          {g.label}
          {counts?.[g.key] ? <span class="chip-count">{counts[g.key]}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function ScopeToggle({ value, onChange }: { value: 'meine' | 'alle'; onChange: (v: 'meine' | 'alle') => void }) {
  if (!hasFavorites.value) return null;
  return (
    <div class="scope" role="group" aria-label="Senderauswahl">
      <button type="button" class={value === 'meine' ? 'active' : ''} aria-pressed={value === 'meine'} onClick={() => onChange('meine')}>
        Meine Sender
      </button>
      <button type="button" class={value === 'alle' ? 'active' : ''} aria-pressed={value === 'alle'} onClick={() => onChange('alle')}>
        Alle
      </button>
    </div>
  );
}

export function DayPicker({ value, onChange }: { value: string; onChange: (day: string) => void }) {
  const days = index.value?.days ?? [];
  const t = today.value;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current?.querySelector<HTMLElement>('[aria-current="date"]');
    el?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' as ScrollBehavior });
  }, [value]);
  return (
    <nav class="daypicker" aria-label="Tag wählen" ref={ref}>
      {days
        .filter((d) => d >= t || d === value || days.indexOf(d) === days.indexOf(t) - 1)
        .map((d) => {
          const label = dayLabel(d, t);
          const { d: dd, m } = parseIsoDate(d);
          const relative = label === 'Heute' || label === 'Morgen' || label === 'Gestern';
          return (
            <button
              type="button"
              key={d}
              class={`day${d === value ? ' active' : ''}`}
              aria-current={d === value ? 'date' : undefined}
              onClick={() => onChange(d)}
              aria-label={`${label}${relative ? `, ${shortWeekday(d)} ${dd}.${m}.` : ''}`}
            >
              <span class="day-top">{relative ? label : shortWeekday(d)}</span>
              <span class="day-bottom">
                {dd}.{m}.
              </span>
            </button>
          );
        })}
    </nav>
  );
}
