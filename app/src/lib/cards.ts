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

/** Compute a mana curve from an array of cards with `cmc` and `quantity` fields. */
export function computeManaCurve(cards: Array<{ cmc?: number; quantity?: number }>): ManaCurve {
  const curve: ManaCurve = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, "6+": 0 };
  for (const card of cards) {
    const cmc = card.cmc ?? 0;
    const qty = card.quantity ?? 1;
    if (cmc >= 6) {
      curve["6+"] += qty;
    } else {
      (curve as any)[cmc] = ((curve as any)[cmc] ?? 0) + qty;
    }
  }
  return curve;
}
