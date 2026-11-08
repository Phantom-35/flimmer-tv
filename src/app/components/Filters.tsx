import { useEffect, useRef } from 'preact/hooks';
import { GENRES } from '../../shared/genres';
import { dayLabel, parseIsoDate, shortWeekday } from '../../shared/time';
import type { GenreKey } from '../../shared/types';
import { hasFavorites } from '../store/channels';
import { index, today } from '../store/data';
import { Icon } from './Icon';

/** Kompakter Genre-Filter als natives Auswahlfeld (zugänglich, platzsparend). */
export function GenreFilter({
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
    <label class={`select${value ? ' select-active' : ''}`}>
      <span class="sr-only">Genre</span>
      <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as GenreKey | '')}>
        <option value="">Alle Genres</option>
        {options.map((g) => (
          <option key={g.key} value={g.key}>
            {g.label}
            {counts?.[g.key] ? ` (${counts[g.key]})` : ''}
          </option>
        ))}
      </select>
      <Icon name="chevronDown" size={16} />
    </label>
  );
}

export function ScopeFilter({ value, onChange }: { value: 'meine' | 'alle'; onChange: (v: 'meine' | 'alle') => void }) {
  if (!hasFavorites.value) return null;
  return (
    <label class="select">
      <span class="sr-only">Senderauswahl</span>
      <select value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value as 'meine' | 'alle')}>
        <option value="meine">Meine Sender</option>
        <option value="alle">Alle Sender</option>
      </select>
      <Icon name="chevronDown" size={16} />
    </label>
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
