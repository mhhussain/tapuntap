const SYM_TO_CLASS: Record<string, string> = {
  W: "pip-w",
  U: "pip-u",
  B: "pip-b",
  R: "pip-r",
  G: "pip-g",
  C: "pip-c",
};

export interface PipDescriptor {
  sym: string;
  cls: string;
}

/** Parse a Scryfall mana cost string like "{2}{U}{U}" into pip descriptors. */
export function manaPips(cost: string): PipDescriptor[] {
  if (!cost) return [];
  const matches = cost.match(/\{[^}]+\}/g);
  if (!matches) return [];
  return matches.map((token) => {
    const sym = token.slice(1, -1).toUpperCase();
    // Generic numeric pips → colorless styling
    const cls = SYM_TO_CLASS[sym] ?? "pip-c";
    return { sym, cls };
  });
}

export function ManaCost({ cost }: { cost: string }) {
  const pips = manaPips(cost);
  if (pips.length === 0) return null;
  return (
    <span className="pip-row">
      {pips.map((p, i) => (
        <span key={i} className={`pip ${p.cls}`}>
          {p.sym}
        </span>
      ))}
    </span>
  );
}
