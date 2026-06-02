import { describe, it, expect } from "vitest";
import { colorTone, fmtTime } from "../lib/format";

describe("colorTone", () => {
  it("handles colorless, mono, multi", () => {
    expect(colorTone([])).toContain("oklch");
    expect(colorTone(["U"])).toContain("oklch");
    expect(colorTone(["U", "R"])).toContain("oklch");
  });
});

describe("fmtTime", () => {
  it("returns empty for falsy", () => {
    expect(fmtTime(null)).toBe("");
    expect(fmtTime(0)).toBe("");
  });
});
