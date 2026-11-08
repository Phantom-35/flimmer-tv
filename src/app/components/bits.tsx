import type { ComponentChildren } from 'preact';
import { GENRE_LABEL } from '../../shared/genres';
import { formatTime, progress } from '../../shared/time';
import type { Channel, GenreKey, Programme } from '../../shared/types';
import { settings } from '../store/settings';
import { Icon, type IconName } from './Icon';

/** Sender-Monogramm statt Logo (Markenrecht, siehe docs/DECISIONS.md). */
export function ChannelBadge({ channel, size = 'md' }: { channel: Channel | undefined; size?: 'sm' | 'md' | 'lg' }) {
  if (!channel) return <span class={`badge badge-${size}`} aria-hidden="true" />;
  const len = channel.short.length;
  return (
    <span
      class={`badge badge-${size}${len >= 4 ? ' badge-long' : ''}`}
      style={{ '--hue': String(channel.hue) }}
      aria-hidden="true"
    >
      {channel.short}
    </span>
  );
}

export function Time({ ms }: { ms: number }) {
  return <time dateTime={new Date(ms).toISOString()}>{formatTime(ms, settings.value.h12)}</time>;
}

export function TimeRange({ p }: { p: Pick<Programme, 's' | 'e'> }) {
  return (
    <span class="time-range">
      <Time ms={p.s * 1000} />–<Time ms={p.e * 1000} />
    </span>
  );
}

export function ProgressBar({ p, nowMs, label }: { p: Pick<Programme, 's' | 'e'>; nowMs: number; label?: string }) {
  const v = progress(p.s * 1000, p.e * 1000, nowMs);
  return (
    <div
      class="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={label ?? 'Fortschritt der Sendung'}
    >
      <span style={{ transform: `scaleX(${v})` }} />
    </div>
  );
}

/** Genre als schlichter Text (bewusst ohne farbige Pillen). */
export function GenreTag({ g, raw }: { g: GenreKey; raw?: string | undefined }) {
  if (g === 'sonstiges' && !raw) return null;
  return (
    <span class="meta-genre" title={raw}>
      {g === 'sonstiges' ? raw : GENRE_LABEL[g]}
    </span>
  );
}

export function Flags({ p }: { p: Programme }) {
  return (
    <>
      {p.l ? <span class="flag flag-live">Live</span> : null}
      {p.n ? <span class="flag flag-new">Neu</span> : null}
      {p.r ? <span class="flag">Wdh.</span> : null}
    </>
  );
}

export function minutesLeft(p: Pick<Programme, 'e'>, nowMs: number): string {
  const m = Math.max(0, Math.round((p.e * 1000 - nowMs) / 60000));
  if (m < 60) return `noch ${m} Min.`;
  const h = Math.floor(m / 60);
  return `noch ${h} Std. ${m % 60} Min.`;
}

export function Skeleton({ rows = 6, variant = 'row' }: { rows?: number; variant?: 'row' | 'card' }) {
  return (
    <div class={`skeleton-list skeleton-${variant}`} role="status" aria-busy="true" aria-label="Lädt …">
      {Array.from({ length: rows }, (_, i) => (
        <div class="skeleton-item" key={i}>
          <span class="sk sk-badge" />
          <span class="sk-lines">
            <span class="sk sk-line" style={{ width: `${55 + ((i * 17) % 35)}%` }} />
            <span class="sk sk-line sk-thin" style={{ width: `${30 + ((i * 23) % 30)}%` }} />
          </span>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  icon = 'tv',
  title,
  children,
  action,
}: {
  icon?: IconName;
  title: string;
  children?: ComponentChildren;
  action?: ComponentChildren;
}) {
  return (
    <div class="empty" role="status">
      <span class="empty-icon">
        <Icon name={icon} size={30} />
      </span>
      <h2>{title}</h2>
      {children ? <div class="empty-text">{children}</div> : null}
      {action ? <div class="empty-action">{action}</div> : null}
    </div>
  );
}

export function PageHeader({ title, sub, children }: { title: string; sub?: ComponentChildren; children?: ComponentChildren }) {
  return (
    <header class="page-header">
      <div class="page-header-text">
        <h1 tabIndex={-1} data-autofocus>
          {title}
        </h1>
        {sub ? <p class="page-sub">{sub}</p> : null}
      </div>
      {children ? <div class="page-header-actions">{children}</div> : null}
    </header>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div class="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          role="radio"
          aria-checked={o.value === value}
          class={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => {
            const i = options.findIndex((x) => x.value === value);
            const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
            if (!dir) return;
            e.preventDefault();
            const next = options[(i + dir + options.length) % options.length]!;
            onChange(next.value);
            const parent = (e.currentTarget as HTMLElement).parentElement;
            requestAnimationFrame(() => (parent?.querySelector('[aria-checked="true"]') as HTMLElement | null)?.focus());
          }}
          tabIndex={o.value === value ? 0 : -1}
          key={o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
