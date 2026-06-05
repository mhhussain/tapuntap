export interface ParsedCard {
  quantity: number;
  name: string;
}

const SECTION_HEADERS = new Set(["deck", "sideboard", "commander", "companion"]);

export function parseMtgArena(text: string): ParsedCard[] {
  const results: ParsedCard[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("//")) continue;
    if (SECTION_HEADERS.has(line.toLowerCase())) continue;
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    results.push({ quantity: parseInt(match[1], 10), name: match[2].trim() });
  }
  return results;
}
