export function fmtTime(ms: number | string | null | undefined): string {
  if (!ms) return "";
  const d = typeof ms === "number" ? new Date(ms) : new Date(ms);
  return d.toLocaleString();
}

const COLOR_TONES: Record<string, string> = {
  W: "oklch(0.9 0.05 90)", U: "oklch(0.6 0.13 250)", B: "oklch(0.35 0.02 300)",
  R: "oklch(0.6 0.2 25)", G: "oklch(0.55 0.13 150)",
};

export function colorTone(colors: string[]): string {
  if (!colors || colors.length === 0) return "oklch(0.55 0.02 90)";
  if (colors.length > 1) return "oklch(0.7 0.13 80)";
  return COLOR_TONES[colors[0]] || "oklch(0.5 0.02 250)";
}
