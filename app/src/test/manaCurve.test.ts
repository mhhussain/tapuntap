import { describe, it, expect } from "vitest";
import { computeManaCurve } from "../lib/cards";

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
