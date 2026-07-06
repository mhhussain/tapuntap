import type { DeckCardEntry } from "../types";

export function isLand(typeLine: string | undefined | null): boolean {
  return !!typeLine && typeLine.includes("Land");
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function newInstanceId(): string {
  return crypto.randomUUID();
}

export type ManaCurve = Record<0 | 1 | 2 | 3 | 4 | 5 | "6+", number>;
type ManaCurveBucket = 0 | 1 | 2 | 3 | 4 | 5;

/** Parse a Scryfall mana cost string like "{2}{U}{U}" into a numeric CMC. Fallback for entries missing `cmc`. */
export function parseCmcFromManaCost(manaCost: string | undefined | null): number {
  if (!manaCost) return 0;
  const symbols = manaCost.match(/\{([^}]+)\}/g) ?? [];
  let total = 0;
  for (const raw of symbols) {
    const sym = raw.slice(1, -1);
    if (sym === "X" || sym === "Y" || sym === "Z") continue;
    const first = sym.split("/")[0];
    const num = Number(first);
    total += Number.isNaN(num) ? 1 : num;
  }
  return total;
}

/** Compute a mana curve from an array of cards with `cmc` and `quantity` fields. */
export function computeManaCurve(cards: Array<{ cmc?: number; manaCost?: string; quantity?: number }>): ManaCurve {
  const curve: ManaCurve = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, "6+": 0 };
  for (const card of cards) {
    const cmc = Math.max(0, Math.floor(card.cmc ?? parseCmcFromManaCost(card.manaCost)));
    const qty = card.quantity ?? 1;
    if (cmc >= 6) {
      curve["6+"] += qty;
    } else {
      curve[cmc as ManaCurveBucket] += qty;
    }
  }
  return curve;
}

const GROUP_ORDER = ["Creatures", "Instants", "Sorceries", "Enchantments", "Artifacts", "Planeswalkers", "Lands", "Other"];

/**
 * Group deck cards by their primary type into ordered sections
 * (Creatures, Instants, …, Lands, Other). Preserves card order within a group.
 */
export function groupCardsByType<T extends { typeLine?: string | null }>(cards: T[]): Array<{ group: string; cards: T[] }> {
  const grouped: Record<string, T[]> = {};
  for (const c of cards) {
    const typeLine = c.typeLine ?? "";
    const grp = isLand(typeLine) ? "Lands" : typeLine.split(" ")[0] ? typeLine.split(" ")[0] + "s" : "Other";
    (grouped[grp] ??= []).push(c);
  }
  const rank = (g: string) => (GROUP_ORDER.indexOf(g) === -1 ? 99 : GROUP_ORDER.indexOf(g));
  return Object.keys(grouped)
    .sort((a, b) => rank(a) - rank(b))
    .map((group) => ({ group, cards: grouped[group] }));
}

export function toEntry(card: any, quantity = 1): DeckCardEntry {
  return {
    cardId: card.id,
    name: card.name,
    quantity,
    manaCost: card.mana_cost || "",
    cmc: card.cmc || 0,
    typeLine: card.type_line || "",
    colors: card.colors || [],
    imageUri: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null,
    imageUriBack: card.card_faces?.[1]?.image_uris?.normal ?? null,
    power: card.power ?? null,
    toughness: card.toughness ?? null,
    loyalty: card.loyalty ?? null,
  };
}
