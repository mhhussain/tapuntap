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

/** Compute a mana curve from an array of cards with `cmc` and `quantity` fields. */
export function computeManaCurve(cards: Array<{ cmc?: number; quantity?: number }>): ManaCurve {
  const curve: ManaCurve = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, "6+": 0 };
  for (const card of cards) {
    const cmc = Math.max(0, Math.floor(card.cmc ?? 0));
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
