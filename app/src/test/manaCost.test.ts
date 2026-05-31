import { describe, it, expect } from "vitest";
import { manaPips } from "../components/ManaCost";
describe("manaPips", () => {
  it("parses colored and generic symbols", () => {
    const pips = manaPips("{2}{U}{U}");
    expect(pips.map((p) => p.sym)).toEqual(["2", "U", "U"]);
    expect(pips[1].cls).toContain("pip-u");
  });
  it("handles empty cost", () => {
    expect(manaPips("")).toEqual([]);
  });
});
