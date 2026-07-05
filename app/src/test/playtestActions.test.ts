import { describe, it, expect, beforeEach } from "vitest";
import { newSession } from "../features/playtest/engine/deal";
import { applyGameAction } from "../features/playtest/engine/actions";
import type { PlaytestSession } from "../features/playtest/engine/types";
import type { Deck } from "../types";

function deck(id: string): Deck {
  return {
    id, ownerUid: "u1", name: `Deck ${id}`, format: "standard", commander: null,
    cards: [
      { cardId: "a", name: "Card A", quantity: 4 },
      { cardId: "b", name: "Card B", quantity: 4 },
    ],
    version: 1,
  };
}

let s: PlaytestSession;
const gid = "x"; // gameId inside actions is ignored by the local engine
beforeEach(() => { s = newSession("t", "standard", [{ deck: deck("d1") }, { deck: deck("d2") }]); });

describe("applyGameAction", () => {
  it("draw moves top of library to hand and syncs counts", () => {
    const top = s.privates["seat-1"].library[0].instanceId;
    const out = applyGameAction(s, "seat-1", { type: "draw", gameId: gid, count: 2 });
    expect(out.privates["seat-1"].hand).toHaveLength(2);
    expect(out.privates["seat-1"].hand[0].instanceId).toBe(top);
    expect(out.players["seat-1"].handCount).toBe(2);
    expect(out.players["seat-1"].libraryCount).toBe(6);
    expect(s.privates["seat-1"].hand).toHaveLength(0); // input not mutated
    expect(out.log.length).toBe(s.log.length + 1);
  });

  it("mill moves top cards to graveyard", () => {
    const out = applyGameAction(s, "seat-1", { type: "mill", gameId: gid, count: 3 });
    expect(out.players["seat-1"].graveyard).toHaveLength(3);
    expect(out.players["seat-1"].libraryCount).toBe(5);
  });

  it("playFromHand puts card on battlefield", () => {
    let out = applyGameAction(s, "seat-1", { type: "draw", gameId: gid, count: 1 });
    const cid = out.privates["seat-1"].hand[0].instanceId;
    out = applyGameAction(out, "seat-1", { type: "playFromHand", gameId: gid, instanceId: cid, toZone: "battlefield" });
    expect(out.players["seat-1"].battlefield).toHaveLength(1);
    expect(out.players["seat-1"].handCount).toBe(0);
  });

  it("moveToHand from battlefield resets tapped/counters", () => {
    let out = applyGameAction(s, "seat-1", { type: "draw", gameId: gid, count: 1 });
    const cid = out.privates["seat-1"].hand[0].instanceId;
    out = applyGameAction(out, "seat-1", { type: "playFromHand", gameId: gid, instanceId: cid, toZone: "battlefield", tapped: true });
    out = applyGameAction(out, "seat-1", { type: "moveToHand", gameId: gid, instanceId: cid, fromZone: "battlefield" });
    expect(out.privates["seat-1"].hand[0].tapped).toBe(false);
    expect(out.players["seat-1"].battlefield).toHaveLength(0);
  });

  it("moveToLibrary top/bottom from hand", () => {
    let out = applyGameAction(s, "seat-1", { type: "draw", gameId: gid, count: 1 });
    const cid = out.privates["seat-1"].hand[0].instanceId;
    out = applyGameAction(out, "seat-1", { type: "moveToLibrary", gameId: gid, instanceId: cid, fromZone: "hand", position: "top" });
    expect(out.privates["seat-1"].library[0].instanceId).toBe(cid);
    expect(out.players["seat-1"].handCount).toBe(0);
  });

  it("scry reorders and rejects mismatched ids", () => {
    const [c1, c2] = s.privates["seat-1"].library.slice(0, 2).map((c) => c.instanceId);
    const out = applyGameAction(s, "seat-1", { type: "scry", gameId: gid, order: [c2], toBottom: [c1] });
    expect(out.privates["seat-1"].library[0].instanceId).toBe(c2);
    expect(out.privates["seat-1"].library.at(-1)!.instanceId).toBe(c1);
    expect(() => applyGameAction(s, "seat-1", { type: "scry", gameId: gid, order: [c2], toBottom: [] }))
      .toThrow("scry order must reference exactly the scried cards");
  });

  it("shuffleGraveyardIntoLibrary empties graveyard back into library", () => {
    let out = applyGameAction(s, "seat-1", { type: "mill", gameId: gid, count: 3 });
    out = applyGameAction(out, "seat-1", { type: "shuffleGraveyardIntoLibrary", gameId: gid });
    expect(out.players["seat-1"].graveyard).toHaveLength(0);
    expect(out.players["seat-1"].libraryCount).toBe(8);
  });

  it("adjustOpponentLife sets target life", () => {
    const out = applyGameAction(s, "seat-1", { type: "adjustOpponentLife", gameId: gid, targetUid: "seat-2", delta: -3 });
    expect(out.players["seat-2"].life).toBe(17);
  });

  it("advancePhase gated to turn seat; overflow ends turn", () => {
    expect(() => applyGameAction(s, "seat-2", { type: "advancePhase", gameId: gid, direction: "next" }))
      .toThrow("Not your turn");
    let out = s;
    for (let i = 0; i < 4; i++) out = applyGameAction(out, "seat-1", { type: "advancePhase", gameId: gid, direction: "next" });
    expect(out.game.phase).toBe("end");
    out = applyGameAction(out, "seat-1", { type: "advancePhase", gameId: gid, direction: "next" }); // overflow -> endTurn
    expect(out.game.activeSeat).toBe(1);
    expect(out.game.phase).toBe("beginning");
  });

  it("endTurn advances seat, bumps turn on wrap, untaps incoming player", () => {
    let out = applyGameAction(s, "seat-2", { type: "draw", gameId: gid, count: 1 });
    const cid = out.privates["seat-2"].hand[0].instanceId;
    out = applyGameAction(out, "seat-2", { type: "playFromHand", gameId: gid, instanceId: cid, toZone: "battlefield", tapped: true });
    out = applyGameAction(out, "seat-1", { type: "endTurn", gameId: gid });
    expect(out.game.activeSeat).toBe(1);
    expect(out.game.turn).toBe(1);
    expect(out.players["seat-2"].battlefield[0].tapped).toBe(false); // incoming player untapped
    out = applyGameAction(out, "seat-2", { type: "endTurn", gameId: gid });
    expect(out.game.activeSeat).toBe(0);
    expect(out.game.turn).toBe(2); // wrapped
  });
});
