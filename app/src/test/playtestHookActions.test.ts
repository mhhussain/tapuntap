import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createSession, loadSession, saveSession } from "../features/playtest/store";
import { applyGameAction } from "../features/playtest/engine/actions";
import { usePlaytestSession } from "../features/playtest/usePlaytestSession";
import type { Deck } from "../types";

const deck: Deck = { id: "d1", ownerUid: "u", name: "D1", format: "standard", commander: null, cards: [{ cardId: "a", name: "A", quantity: 3 }], version: 1 };
beforeEach(() => localStorage.clear());

describe("playtest hook actions round-trip", () => {
  it("action -> save -> load round-trip preserves state", () => {
    const s = createSession("S", "standard", [{ deck }, { deck }]);
    const after = applyGameAction(s, "seat-1", { type: "draw", gameId: s.id, count: 1 });
    saveSession(after);
    const loaded = loadSession(s.id)!;
    expect(loaded.privates["seat-1"].hand).toHaveLength(1);
    expect(loaded.players["seat-1"].handCount).toBe(1);
    expect(loaded.log.length).toBe(2);
  });

  it("two synchronous mutations in the same tick both persist (no lost update)", () => {
    const s = createSession("S", "standard", [{ deck }, { deck }]);
    const { result } = renderHook(() => usePlaytestSession(s.id));

    act(() => {
      // Fired synchronously in the same tick, e.g. a double-click. Both must
      // land; previously the second call closed over the same stale
      // pre-mutation `session` state and clobbered the first commit.
      result.current.actions.action({ type: "draw", gameId: s.id, count: 1 });
      result.current.actions.action({ type: "draw", gameId: s.id, count: 1 });
    });

    expect(result.current.session!.privates["seat-1"].hand).toHaveLength(2);
    expect(result.current.session!.players["seat-1"].handCount).toBe(2);

    const loaded = loadSession(s.id)!;
    expect(loaded.privates["seat-1"].hand).toHaveLength(2);
    expect(loaded.players["seat-1"].handCount).toBe(2);
  });
});
