import { test } from "node:test";
import assert from "node:assert";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.GCLOUD_PROJECT ||= "tapuntap";
if (!getApps().length) initializeApp({ projectId: "tapuntap" });
const db = getFirestore();
const { handleGameAction } = await import("../lib/actions.js");

async function seed() {
  await db.doc("games/ga").set({
    name: "G", status: "active", hostUid: "host", inviteCode: "QQQQ", format: "commander",
    seats: [{ seat: 0, uid: "host", displayName: "Host", deckId: "d", deckName: "D", ready: true },
            { seat: 1, uid: "p2", displayName: "P2", deckId: "d", deckName: "D", ready: true }],
    seatUids: ["host", "p2"], turnOrder: ["host", "p2"], activeSeat: 0, turn: 1,
    phase: "beginning", phaseIndex: 0, phases: ["beginning", "main1", "combat", "main2", "end"],
  });
  await db.doc("games/ga/players/host").set({ seat: 0, displayName: "Host", life: 40, handCount: 0, libraryCount: 3, battlefield: [], graveyard: [], exile: [], command: [] });
  await db.doc("games/ga/players/host/private/state").set({ hand: [], library: [{ instanceId: "a" }, { instanceId: "b" }, { instanceId: "c" }] });
  await db.doc("games/ga/players/p2").set({ seat: 1, displayName: "P2", life: 40, handCount: 0, libraryCount: 0, battlefield: [], graveyard: [], exile: [], command: [] });
}

test("draw moves cards library->hand and updates counts", async () => {
  await seed();
  await handleGameAction("host", { type: "draw", gameId: "ga", count: 2 }, db);
  const pub = (await db.doc("games/ga/players/host").get()).data();
  const priv = (await db.doc("games/ga/players/host/private/state").get()).data();
  assert.equal(priv.hand.length, 2);
  assert.equal(priv.library.length, 1);
  assert.equal(pub.handCount, 2);
  assert.equal(pub.libraryCount, 1);
});

test("adjustOpponentLife changes the target's life", async () => {
  await seed();
  await handleGameAction("host", { type: "adjustOpponentLife", gameId: "ga", targetUid: "p2", delta: -3 }, db);
  const p2 = (await db.doc("games/ga/players/p2").get()).data();
  assert.equal(p2.life, 37);
});

test("endTurn advances active seat", async () => {
  await seed();
  await handleGameAction("host", { type: "endTurn", gameId: "ga" }, db);
  const g = (await db.doc("games/ga").get()).data();
  assert.equal(g.activeSeat, 1);
});

test("non-active player cannot endTurn", async () => {
  await seed(); // host is active (seat 0)
  await assert.rejects(() => handleGameAction("p2", { type: "endTurn", gameId: "ga" }, db));
});

test("playFromHand moves a card hand->battlefield and decrements handCount", async () => {
  await seed();
  await db.doc("games/ga/players/host/private/state").set({ hand: [{ instanceId: "h1", name: "Bear" }], library: [] });
  await db.doc("games/ga/players/host").update({ handCount: 1, libraryCount: 0 });
  await handleGameAction("host", { type: "playFromHand", gameId: "ga", instanceId: "h1", toZone: "battlefield" }, db);
  const pub = (await db.doc("games/ga/players/host").get()).data();
  const priv = (await db.doc("games/ga/players/host/private/state").get()).data();
  assert.equal(pub.battlefield.length, 1);
  assert.equal(pub.handCount, 0);
  assert.equal(priv.hand.length, 0);
});

test("moveToLibrary from hand puts a card on top and updates counts", async () => {
  await seed();
  await db.doc("games/ga/players/host/private/state").set({ hand: [{ instanceId: "h1", name: "Bolt" }], library: [{ instanceId: "x" }] });
  await db.doc("games/ga/players/host").update({ handCount: 1, libraryCount: 1 });
  await handleGameAction("host", { type: "moveToLibrary", gameId: "ga", instanceId: "h1", fromZone: "hand", position: "top" }, db);
  const priv = (await db.doc("games/ga/players/host/private/state").get()).data();
  const pub = (await db.doc("games/ga/players/host").get()).data();
  assert.equal(priv.library[0].instanceId, "h1");
  assert.equal(priv.hand.length, 0);
  assert.equal(pub.libraryCount, 2);
});
