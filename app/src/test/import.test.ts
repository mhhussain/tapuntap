import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseMtgArena } from "../lib/import";

describe("parseMtgArena", () => {
  it("parses quantity and name from standard lines", () => {
    const result = parseMtgArena("4 Lightning Bolt\n2 Island");
    expect(result).toEqual([
      { quantity: 4, name: "Lightning Bolt" },
      { quantity: 2, name: "Island" },
    ]);
  });

  it("skips blank lines", () => {
    const result = parseMtgArena("4 Lightning Bolt\n\n2 Island");
    expect(result).toHaveLength(2);
  });

  it("skips section headers: Deck, Sideboard, Commander, Companion", () => {
    const result = parseMtgArena("Deck\n4 Lightning Bolt\nSideboard\n2 Duress\nCommander\n1 Sol Ring\nCompanion\n1 Lurrus");
    expect(result).toEqual([
      { quantity: 4, name: "Lightning Bolt" },
      { quantity: 2, name: "Duress" },
      { quantity: 1, name: "Sol Ring" },
      { quantity: 1, name: "Lurrus" },
    ]);
  });

  it("skips lines starting with //", () => {
    const result = parseMtgArena("// This is a comment\n4 Lightning Bolt");
    expect(result).toEqual([{ quantity: 4, name: "Lightning Bolt" }]);
  });

  it("skips lines with no leading quantity token", () => {
    const result = parseMtgArena("Lightning Bolt");
    expect(result).toHaveLength(0);
  });

  it("handles multi-word card names", () => {
    const result = parseMtgArena("1 Black Lotus");
    expect(result).toEqual([{ quantity: 1, name: "Black Lotus" }]);
  });

  it("returns empty array for empty or whitespace-only input", () => {
    expect(parseMtgArena("")).toEqual([]);
    expect(parseMtgArena("  \n  \n  ")).toEqual([]);
  });
});
