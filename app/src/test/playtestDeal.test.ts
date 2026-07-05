import { describe, it, expect } from "vitest";
import { cardInstance, buildSeatState, newSession } from "../features/playtest/engine/deal";
import type { Deck } from "../types";

function deck(over: Partial<Deck> = {}): Deck {
  return {
    id: "d1", ownerUid: "u1", name: "Test Deck", format: "commander",
    commander: { cardId: "cmd", name: "Cmdr", quantity: 1 },
    cards: [
      { cardId: "cmd", name: "Cmdr", quantity: 1 },
      { cardId: "a", name: "Card A", quantity: 3 },
      { cardId: "b", name: "Card B", quantity: 2 },
    ],
    version: 1, ...over,
  };
}

describe("cardInstance", () => {
  it("fills defaults and unique instanceIds", () => {
    const a = cardInstance({ cardId: "a", name: "A", quantity: 1 });
    const b = cardInstance({ cardId: "a", name: "A", quantity: 1 });
    expect(a.instanceId).not.toEqual(b.instanceId);
    expect(a.tapped).toBe(false);
    expect(a.counters).toEqual({});
    expect(a.token).toBe(false);
  });
});

describe("buildSeatState", () => {
  it("commander deck: 40 life, commander in command zone, excluded from library", () => {
    const { publicDoc, privateDoc } = buildSeatState("seat-1", 1, "Player 1", deck(), "commander");
    expect(publicDoc.life).toBe(40);
    expect(publicDoc.command).toHaveLength(1);
    expect(publicDoc.command[0].name).toBe("Cmdr");
    expect(privateDoc.library).toHaveLength(5); // 3 + 2, commander excluded
    expect(publicDoc.libraryCount).toBe(5);
    expect(publicDoc.handCount).toBe(0);
    expect(privateDoc.hand).toHaveLength(0);
    expect(publicDoc.uid).toBe("seat-1");
    expect(publicDoc.seat).toBe(1);
  });
  it("non-commander: 20 life, empty command zone", () => {
    const { publicDoc } = buildSeatState("seat-1", 1, "P1", deck({ commander: null, format: "standard" }), "standard");
    expect(publicDoc.life).toBe(20);
    expect(publicDoc.command).toHaveLength(0);
  });
});

describe("newSession", () => {
  it("builds 2-seat active session with turn order and log entry", () => {
    const s = newSession("My Test", "commander", [{ deck: deck() }, { deck: deck({ id: "d2", name: "Deck 2" }) }]);
    expect(s.game.status).toBe("active");
    expect(s.game.seatUids).toEqual(["seat-1", "seat-2"]);
    expect(s.game.turnOrder).toEqual(["seat-1", "seat-2"]);
    expect(s.game.turn).toBe(1);
    expect(s.game.phase).toBe("beginning");
    expect(s.game.phases).toEqual(["beginning", "main1", "combat", "main2", "end"]);
    expect(Object.keys(s.players)).toHaveLength(2);
    expect(Object.keys(s.privates)).toHaveLength(2);
    expect(s.game.seats[1].deckName).toBe("Deck 2");
    expect(s.log).toHaveLength(1);
  });
});
