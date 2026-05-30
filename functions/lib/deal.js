import { randomUUID } from "node:crypto";

export function cardInstance(entry) {
  return {
    instanceId: randomUUID(),
    cardId: entry.cardId, name: entry.name,
    manaCost: entry.manaCost || "", cmc: entry.cmc || 0,
    typeLine: entry.typeLine || "", colors: entry.colors || [],
    imageUri: entry.imageUri || null, imageUriBack: entry.imageUriBack || null,
    power: entry.power || null, toughness: entry.toughness || null, loyalty: entry.loyalty || null,
    tapped: false, transformed: false, faceDown: false,
    counters: {}, attachedTo: null, token: entry.token || false
  };
}

export function buildSeatState(seat, deck, format) {
  const library = [];
  for (const entry of (deck.cards || [])) {
    if (deck.commander && entry.cardId === deck.commander.cardId) continue; // commander -> command zone
    for (let i = 0; i < (entry.quantity || 0); i++) library.push(cardInstance(entry));
  }
  // Fisher-Yates shuffle
  for (let i = library.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [library[i], library[j]] = [library[j], library[i]];
  }
  const command = deck.commander ? [cardInstance(deck.commander)] : [];
  const publicDoc = {
    seat: seat.seat, displayName: seat.displayName,
    life: format === "commander" ? 40 : 20, poison: 0, energy: 0, counters: {},
    battlefield: [], graveyard: [], exile: [], command,
    handCount: 0, libraryCount: library.length
  };
  const privateDoc = { hand: [], library };
  return { publicDoc, privateDoc };
}
