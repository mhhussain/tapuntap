import { describe, it, expect, beforeEach } from "vitest";
import { listSessions, loadSession, saveSession, deleteSession, createSession } from "../features/playtest/store";
import type { Deck } from "../types";

const deck: Deck = { id: "d1", ownerUid: "u", name: "D1", format: "standard", commander: null, cards: [{ cardId: "a", name: "A", quantity: 2 }], version: 1 };

beforeEach(() => localStorage.clear());

describe("playtest store", () => {
  it("createSession persists and lists", () => {
    const s = createSession("S1", "standard", [{ deck }, { deck }]);
    const list = listSessions();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(s.id);
    expect(list[0].deckNames).toEqual(["D1", "D1"]);
    expect(loadSession(s.id)?.game.name).toBe("S1");
  });
  it("saveSession updates index updatedAt and sorts desc", () => {
    const a = createSession("A", "standard", [{ deck }, { deck }]);
    const b = createSession("B", "standard", [{ deck }, { deck }]);
    saveSession({ ...a, updatedAt: Date.now() + 1000 });
    expect(listSessions()[0].id).toBe(a.id);
    expect(listSessions()[1].id).toBe(b.id);
  });
  it("deleteSession removes session and index entry", () => {
    const s = createSession("S", "standard", [{ deck }, { deck }]);
    deleteSession(s.id);
    expect(listSessions()).toHaveLength(0);
    expect(loadSession(s.id)).toBeNull();
  });
  it("loadSession returns null for corrupt JSON", () => {
    localStorage.setItem("tapuntap.playtest.session.bad", "{not json");
    expect(loadSession("bad")).toBeNull();
  });
});
