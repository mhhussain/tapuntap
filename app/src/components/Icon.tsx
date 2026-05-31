const PATHS: Record<string, string> = {
  home: "M3 9l9-7 9 7v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  decks: "M4 4v16M10 4v16M16 6v14",
  games: "M12 3v18M3 12h18",
  play: "M6 4l14 8-14 8z",
  settings: "M12 1v4M12 19v4M4.2 4.2l2.8 2.8M1 12h4M19 12h4",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  next: "M9 6l6 6-6 6",
  prev: "M15 6l-6 6 6 6",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
};

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name] || ""} />
    </svg>
  );
}
