import { describe, it, expect } from "vitest";
import { buildScryResult } from "../features/game/components/ScryModal";

describe("buildScryResult", () => {
  it("splits into order(top) and toBottom by decision", () => {
    const top = [{ instanceId: "a" }, { instanceId: "b" }] as any;
    const r = buildScryResult(top, { a: "top", b: "bottom" });
    expect(r.order).toEqual(["a"]);
    expect(r.toBottom).toEqual(["b"]);
  });

  it("all top preserves order", () => {
    const top = [{ instanceId: "x" }, { instanceId: "y" }, { instanceId: "z" }] as any;
    const r = buildScryResult(top, { x: "top", y: "top", z: "top" });
    expect(r.order).toEqual(["x", "y", "z"]);
    expect(r.toBottom).toEqual([]);
  });

  it("all bottom preserves order", () => {
    const top = [{ instanceId: "x" }, { instanceId: "y" }] as any;
    const r = buildScryResult(top, { x: "bottom", y: "bottom" });
    expect(r.order).toEqual([]);
    expect(r.toBottom).toEqual(["x", "y"]);
  });
});
