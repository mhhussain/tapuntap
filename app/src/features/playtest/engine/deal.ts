import type { CardInstance, Deck, DeckCardEntry, PlayerPublic, PlayerPrivate } from "../../../types";
import type { PlaytestSession, SeatSetup } from "./types";

export const PHASES = ["beginning", "main1", "combat", "main2", "end"];

export function shuffleInPlace<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

export function cardInstance(entry: DeckCardEntry & { token?: boolean }): CardInstance {
  return {
    instanceId: crypto.randomUUID(),
    cardId: entry.cardId, name: entry.name,
    manaCost: entry.manaCost || "", cmc: entry.cmc || 0,
    typeLine: entry.typeLine || "", colors: entry.colors || [],
    imageUri: entry.imageUri || null, imageUriBack: entry.imageUriBack || null,
    power: entry.power || null, toughness: entry.toughness || null, loyalty: entry.loyalty || null,
    tapped: false, transformed: false, faceDown: false,
    counters: {}, attachedTo: null, token: entry.token || false,
  };
}

export function buildSeatState(seatUid: string, seatNum: number, displayName: string, deck: Deck, format: string): { publicDoc: PlayerPublic; privateDoc: PlayerPrivate } {
  const library: CardInstance[] = [];
  for (const entry of deck.cards || []) {
    if (deck.commander && entry.cardId === deck.commander.cardId) continue; // commander -> command zone
    for (let i = 0; i < (entry.quantity || 0); i++) library.push(cardInstance(entry));
  }
  shuffleInPlace(library);
  const command = deck.commander ? [cardInstance(deck.commander)] : [];
  const publicDoc: PlayerPublic = {
    uid: seatUid, seat: seatNum, displayName,
    life: format === "commander" ? 40 : 20, poison: 0, energy: 0, counters: {},
    battlefield: [], graveyard: [], exile: [], command,
    handCount: 0, libraryCount: library.length,
  };
  return { publicDoc, privateDoc: { hand: [], library } };
}

export function newSession(name: string, format: string, seats: SeatSetup[]): PlaytestSession {
  const id = crypto.randomUUID();
  const now = Date.now();
  const players: PlaytestSession["players"] = {};
  const privates: PlaytestSession["privates"] = {};
  const seatDocs = seats.map((s, i) => {
    const seatUid = `seat-${i + 1}`;
    const displayName = `Player ${i + 1}`;
    const { publicDoc, privateDoc } = buildSeatState(seatUid, i + 1, displayName, s.deck, format);
    players[seatUid] = publicDoc;
    privates[seatUid] = privateDoc;
    return { seat: i + 1, uid: seatUid, displayName, deckId: s.deck.id, deckName: s.deck.name, ready: true };
  });
  return {
    id, createdAt: now, updatedAt: now,
    game: {
      id, name, status: "active", hostUid: "seat-1", inviteCode: "", format,
      seats: seatDocs, seatUids: seatDocs.map((s) => s.uid), turnOrder: seatDocs.map((s) => s.uid),
      turn: 1, activeSeat: 0, phase: PHASES[0], phaseIndex: 0, phases: [...PHASES],
      notes: "", updatedAt: now,
    },
    players, privates,
    log: [{ ts: now, turn: 1, text: `Playtest started with ${seats.length} seats` }],
  };
}
