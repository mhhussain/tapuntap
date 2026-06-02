export function fmtTime(ms: number | string | null | undefined): string {
  if (!ms) return "";
  const d = typeof ms === "number" ? new Date(ms) : new Date(ms);
  return d.toLocaleString();
}

// Aligned to design --mana-* tokens (styles.css)
const COLOR_TONES: Record<string, string> = {
  W: "oklch(0.92 0.02 85)",   // bone
  U: "oklch(0.62 0.10 240)",  // slate-blue
  B: "oklch(0.40 0.04 320)",  // plum
  R: "oklch(0.60 0.16 30)",   // rust
  G: "oklch(0.58 0.10 150)",  // moss
};

export function colorTone(colors: string[]): string {
  if (!colors || colors.length === 0) return "oklch(0.65 0.01 80)"; // --mana-c colorless
  if (colors.length > 1) return "oklch(0.78 0.14 75)";              // multicolor → accent
  return COLOR_TONES[colors[0]] || "oklch(0.65 0.01 80)";
}
