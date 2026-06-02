import { describe, it, expect } from "vitest";
import { isLand, shuffle, newInstanceId } from "../lib/cards";

describe("isLand", () => {
  it("detects land type lines", () => {
    expect(isLand("Basic Land — Island")).toBe(true);
    expect(isLand("Creature — Elf")).toBe(false);
    expect(isLand("")).toBe(false);
  });
});

describe("shuffle", () => {
  it("returns same multiset, new array", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("newInstanceId", () => {
  it("returns a unique-ish string", () => {
    expect(newInstanceId()).not.toEqual(newInstanceId());
  });
});
