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

let _catalogCache: Promise<Set<string> | null> | null = null;

export function _resetCatalogCache(): void {
  _catalogCache = null;
}

export function fetchCardNameCatalog(): Promise<Set<string> | null> {
  if (!_catalogCache) {
    _catalogCache = fetch("https://api.scryfall.com/catalog/card-names")
      .then((r) => r.json())
      .then((data: { data: string[] }) => new Set(data.data.map((n) => n.toLowerCase())))
      .catch(() => null);
  }
  return _catalogCache;
}

export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  colors?: string[];
  image_uris?: { normal?: string; small?: string };
  card_faces?: Array<{ image_uris?: { normal?: string; small?: string } }>;
  power?: string;
  toughness?: string;
  loyalty?: string;
}

export const RESOLVE_CAP = 20;

export async function resolveCards(names: string[]): Promise<Map<string, ScryfallCard | null>> {
  const unique = [...new Set(names)];
  const result = new Map<string, ScryfallCard | null>();
  if (!unique.length) return result;

  const settled = await Promise.allSettled(
    unique.map((name) =>
      fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((card: ScryfallCard) => ({ name, card }))
        .catch(() => ({ name, card: null }))
    )
  );
  for (const outcome of settled) {
    if (outcome.status === "fulfilled") {
      result.set(outcome.value.name, outcome.value.card);
    }
  }

  return result;
}
