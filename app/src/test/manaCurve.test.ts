import { describe, it, expect } from "vitest";
import { computeManaCurve, parseCmcFromManaCost } from "../lib/cards";

describe("computeManaCurve", () => {
  it("buckets by cmc with 6+ grouped", () => {
    const curve = computeManaCurve([
      { cmc: 0, quantity: 2 }, { cmc: 3, quantity: 4 }, { cmc: 8, quantity: 1 },
    ] as any);
    expect(curve[0]).toBe(2);
    expect(curve[3]).toBe(4);
    expect(curve["6+"]).toBe(1);
  });

  it("returns 0 for empty buckets", () => {
    const curve = computeManaCurve([]);
    expect(curve[0]).toBe(0);
    expect(curve[1]).toBe(0);
    expect(curve["6+"]).toBe(0);
  });

  it("treats missing cmc as 0", () => {
    const curve = computeManaCurve([{ quantity: 3 }] as any);
    expect(curve[0]).toBe(3);
  });

  it("accumulates multiple entries in the same bucket", () => {
    const curve = computeManaCurve([
      { cmc: 2, quantity: 2 }, { cmc: 2, quantity: 1 },
    ] as any);
    expect(curve[2]).toBe(3);
  });
});

describe("parseCmcFromManaCost", () => {
  it("sums generic and colored pips", () => {
    expect(parseCmcFromManaCost("{2}{U}{U}")).toBe(4);
    expect(parseCmcFromManaCost("{G}")).toBe(1);
  });

  it("ignores X and handles hybrid/phyrexian as 1 (or generic side)", () => {
    expect(parseCmcFromManaCost("{X}{R}{R}")).toBe(2);
    expect(parseCmcFromManaCost("{W/U}{W/U}")).toBe(2);
    expect(parseCmcFromManaCost("{2/W}")).toBe(2);
    expect(parseCmcFromManaCost("{G/P}")).toBe(1);
  });

  it("returns 0 for empty/null", () => {
    expect(parseCmcFromManaCost("")).toBe(0);
    expect(parseCmcFromManaCost(null)).toBe(0);
    expect(parseCmcFromManaCost(undefined)).toBe(0);
  });
});

describe("computeManaCurve manaCost fallback", () => {
  it("falls back to parsing manaCost when cmc missing", () => {
    const curve = computeManaCurve([{ manaCost: "{2}{U}", quantity: 2 }] as any);
    expect(curve[3]).toBe(2);
    expect(curve[0]).toBe(0);
  });

  it("prefers explicit cmc over manaCost", () => {
    const curve = computeManaCurve([{ cmc: 5, manaCost: "{1}{U}", quantity: 1 }] as any);
    expect(curve[5]).toBe(1);
  });
});
