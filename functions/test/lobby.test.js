import { test, before, after } from "node:test";
import assert from "node:assert";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Run against the emulator: FIRESTORE_EMULATOR_HOST is set by `emulators:exec`.
process.env.GCLOUD_PROJECT ||= "iammoo-tapuntap";
initializeApp({ projectId: "iammoo-tapuntap" });
const db = getFirestore();

// Import the pure handlers (exported for testing) — see Step 3.
const { _createGame, _joinGame, _leaveGame, _endGame } = await import("../index.js");

test("createGame seats host and returns a code", async () => {
  await db.doc("users/host/decks/d1").set({ ownerUid: "host", name: "A", format: "commander" });
  const res = await _createGame("host", { name: "Friday", format: "commander", deckId: "d1" }, db);
  assert.ok(res.gameId && res.inviteCode);
  const g = (await db.doc(`games/${res.gameId}`).get()).data();
  assert.equal(g.seats.length, 1);
  assert.equal(g.seatUids[0], "host");
  assert.equal(g.status, "lobby");
});

test("joinGame adds a seat; rejects dup and full", async () => {
  await db.doc("users/host/decks/d1").set({ ownerUid: "host", name: "A", format: "commander" });
  await db.doc("users/bob/decks/d2").set({ ownerUid: "bob", name: "B", format: "commander" });
  const { gameId, inviteCode } = await _createGame("host", { name: "G", format: "commander", deckId: "d1" }, db);
  await _joinGame("bob", { inviteCode, deckId: "d2" }, db);
  let g = (await db.doc(`games/${gameId}`).get()).data();
  assert.equal(g.seats.length, 2);
  await assert.rejects(() => _joinGame("bob", { inviteCode, deckId: "d2" }, db));
});

test("leaveGame removes a non-host seat from a lobby", async () => {
  await db.doc("users/host/decks/d1").set({ ownerUid: "host", name: "A", format: "commander" });
  await db.doc("users/bob/decks/d2").set({ ownerUid: "bob", name: "B", format: "commander" });
  const { gameId, inviteCode } = await _createGame("host", { name: "G", format: "commander", deckId: "d1" }, db);
  await _joinGame("bob", { inviteCode, deckId: "d2" }, db);
  await _leaveGame("bob", { gameId }, db);
  const g = (await db.doc(`games/${gameId}`).get()).data();
  assert.equal(g.seats.length, 1);
  assert.ok(!g.seatUids.includes("bob"));
});

test("endGame marks the game complete", async () => {
  await db.doc("users/host/decks/d1").set({ ownerUid: "host", name: "A", format: "commander" });
  const { gameId } = await _createGame("host", { name: "G", format: "commander", deckId: "d1" }, db);
  await _endGame("host", { gameId, winnerUid: "host" }, db);
  const g = (await db.doc(`games/${gameId}`).get()).data();
  assert.equal(g.status, "complete");
  assert.equal(g.winnerUid, "host");
});
