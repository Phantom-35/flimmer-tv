/** Eigenes, schlankes Icon-Set (24×24, Linien). Keine externe Icon-Bibliothek. */
const PATHS = {
  now: 'M4 7h16v11H4zM8 21h8M9 3l3 3 3-3',
  grid: 'M4 5h16M4 12h16M4 19h16M9 3v18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.2-4.2',
  bookmark: 'M7 4h10v16l-5-3.5L7 20z',
  bookmarkFilled: 'M7 4h10v16l-5-3.5L7 20z',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  bellOff: 'M6 16V11a6 6 0 0 1 9.5-4.9M18 11v5l1.5 2H8M10 20.5a2 2 0 0 0 4 0M4 4l16 16',
  calendar: 'M5 6h14v14H5zM5 10h14M9 3v4M15 3v4',
  share: 'M12 15V4m0 0-4 4m4-4 4 4M6 12v7h12v-7',
  close: 'M6 6l12 12M18 6 6 18',
  back: 'M15 5l-7 7 7 7',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  chevronDown: 'M5 9l7 7 7-7',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z',
  eyeOff: 'M4 4l16 16M10.6 6.1A9.6 9.6 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-3 3.6M6.5 7.6C4 9.3 2.5 12 2.5 12S6 18 12 18c1.6 0 3-.4 4.2-1',
  drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  up: 'M6 15l6-6 6 6',
  down: 'M6 9l6 6 6-6',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7 7 0 0 1-2.1 1.2L14.7 21h-4l-.3-2.4a7 7 0 0 1-2.1-1.2l-1.9.7-2-3.4 1.6-1.2a7 7 0 0 1 0-2.4L4.4 9.9l2-3.4 1.9.7a7 7 0 0 1 2.1-1.2L10.7 3h4l.3 2.4a7 7 0 0 1 2.1 1.2l1.9-.7 2 3.4-1.6 1.2a7 7 0 0 1 0 2.4z',
  tv: 'M3 7h18v12H3zM8 3l4 4 4-4',
  info: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 11v5M12 8h.01',
  help: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5v.4M12 17h.01',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6',
  shield: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6z',
  doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
  download: 'M12 4v11m0 0-4-4m4 4 4-4M5 20h14',
  upload: 'M12 20V9m0 0-4 4m4-4 4 4M5 4h14',
  trash: 'M5 7h14M10 11v6M14 11v6M7 7l1 13h8l1-13M9 7V4h6v3',
  keyboard: 'M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M7 14h10',
  install: 'M12 3v12m0 0-4-4m4 4 4-4M5 17v3h14v-3',
  offline: 'M4 4l16 16M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 4-2.3M19 13a10 10 0 0 0-3.4-2.1M2 9.5a15 15 0 0 1 4.5-2.8M22 9.5A15 15 0 0 0 12 6c-.6 0-1.2 0-1.8.1M12 20h.01',
  refresh: 'M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5',
  sparkle: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18',
  clock: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM12 8v4l3 2',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  filter: 'M4 5h16l-6 7v6l-4 2v-8z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  check: 'M5 12l5 5 9-10',
  plus: 'M12 5v14M5 12h14',
  zoomIn: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.2-4.2M11 8v6M8 11h6',
  zoomOut: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.2-4.2M8 11h6',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 22, class: cls }: { name: IconName; size?: number; class?: string }) {
  const filled = name === 'bookmarkFilled' || name === 'star';
  return (
    <svg
      class={`icon${cls ? ` ${cls}` : ''}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      stroke-width={name === 'more' ? 3 : 1.8}
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
