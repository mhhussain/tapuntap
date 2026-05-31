import { describe, it, expect } from "vitest";
import { moveWithinPublicZones } from "../features/game/useGameActions";
import type { PlayerPublic, CardInstance } from "../types";

function card(id: string, type = "Creature — X"): CardInstance {
  return { instanceId: id, cardId: id, name: id, manaCost: "", cmc: 0, typeLine: type, colors: [],
    imageUri: null, imageUriBack: null, power: null, toughness: null, loyalty: null,
    tapped: false, transformed: false, faceDown: false, counters: {}, attachedTo: null, token: false };
}

describe("moveWithinPublicZones", () => {
  it("moves a card from battlefield to graveyard and cleans tap/counters", () => {
    const pub = { battlefield: [{ ...card("a"), tapped: true, counters: { "+1/+1": 2 } }], graveyard: [], exile: [], command: [] } as unknown as PlayerPublic;
    const next = moveWithinPublicZones(pub, "a", "battlefield", "graveyard");
    expect(next.battlefield.length).toBe(0);
    expect(next.graveyard.length).toBe(1);
    expect(next.graveyard[0].tapped).toBe(false);
    expect(Object.keys(next.graveyard[0].counters)).toHaveLength(0);
  });
});
