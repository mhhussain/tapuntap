import type { ReactNode } from "react";

const ICONS: Record<string, ReactNode> = {
  // Original paths
  home: <path d="M3 9l9-7 9 7v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />,
  decks: <path d="M4 4v16M10 4v16M16 6v14" />,
  games: <><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18" /></>,
  play: <polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none" />,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  next: <path d="M5 12h14M13 5l7 7-7 7" />,
  prev: <path d="M19 12H5M11 6l-6 6 6 6" />,
  trash: <><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  // Design additions
  library: <><rect x="4" y="4" width="4" height="16" /><rect x="10" y="4" width="4" height="16" /><rect x="16" y="6" width="4" height="14" /></>,
  duplicate: <><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  export: <path d="M12 3v12M7 8l5-5 5 5M5 21h14" />,
  import: <path d="M12 21V9M7 14l5 5 5-5M5 3h14" />,
  history: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></>,
  check: <path d="M5 12l5 5 9-13" />,
  "arrow-right": <path d="M5 12h14M13 5l7 7-7 7" />,
  tap: <path d="M12 3l3 5h-2v6h2l-3 5-3-5h2V8h-2l3-5" />,
  cards: <><rect x="3" y="6" width="13" height="14" rx="1" /><path d="M8 3h13v14" /></>,
  "dots-grid": <><circle cx="6" cy="6" r="1" /><circle cx="12" cy="6" r="1" /><circle cx="18" cy="6" r="1" /><circle cx="6" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="18" cy="12" r="1" /><circle cx="6" cy="18" r="1" /><circle cx="12" cy="18" r="1" /><circle cx="18" cy="18" r="1" /></>,
  graveyard: <><path d="M6 20V10a6 6 0 0 1 12 0v10" /><path d="M3 20h18M9 14h6M9 17h6" /></>,
  exile: <><circle cx="12" cy="12" r="9" /><path d="M5 5l14 14" /></>,
  deck: <><rect x="6" y="3" width="12" height="18" rx="1" /><path d="M9 3v18M15 3v18" /></>,
  token: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></>,
  scry: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  note: <><path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" /><path d="M9 10h6M9 14h6M9 18h4" /></>,
  save: <><path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" /><path d="M8 3v5h8V3M8 21v-7h8v7" /></>,
  undo: <path d="M3 7l4-4M3 7l4 4M3 7h11a6 6 0 0 1 0 12h-3" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="1" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  command: <><path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" /></>,
  edit: <><path d="M17 3a2.8 2.8 0 0 1 4 4L7.5 20.5 3 21l.5-4.5L17 3z" /></>,
  "chevron-left": <path d="M15 6l-6 6 6 6" />,
};

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const content = ICONS[name] ?? <rect x="3" y="3" width="18" height="18" rx="2" />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {content}
    </svg>
  );
}
