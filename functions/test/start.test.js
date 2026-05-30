import { test } from "node:test";
import assert from "node:assert";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.GCLOUD_PROJECT ||= "iammoo-tapuntap";
if (!getApps().length) initializeApp({ projectId: "iammoo-tapuntap" });
const db = getFirestore();
const { _startGame } = await import("../index.js");

test("startGame deals public+private and activates", async () => {
  await db.doc("users/host/decks/dstart").set({
    ownerUid: "host", name: "A", format: "commander",
    commander: { cardId: "cmd", name: "Cmd", colors: ["U"] },
    cards: [{ cardId: "isl", name: "Island", quantity: 3 }, { cardId: "cmd", name: "Cmd", quantity: 1 }]
  });
  await db.doc("games/g9").set({
    name: "G", status: "lobby", hostUid: "host", inviteCode: "ZZZZ",
    format: "commander",
    seats: [{ seat: 0, uid: "host", displayName: "Host", deckId: "dstart", deckName: "A", ready: true }],
    seatUids: ["host"], turnOrder: [], turn: 0, activeSeat: 0,
    phase: "beginning", phaseIndex: 0, phases: ["beginning","main1","combat","main2","end"]
  });

  await _startGame("host", { gameId: "g9" }, db);

  const g = (await db.doc("games/g9").get()).data();
  assert.equal(g.status, "active");
  assert.deepEqual(g.turnOrder, ["host"]);
  const pub = (await db.doc("games/g9/players/host").get()).data();
  const priv = (await db.doc("games/g9/players/host/private/state").get()).data();
  assert.equal(pub.libraryCount, 3);            // commander excluded from library
  assert.equal(pub.command.length, 1);          // commander in command zone
  assert.equal(pub.handCount, 0);
  assert.equal(priv.library.length, 3);
  await assert.rejects(() => _startGame("eve", { gameId: "g9" }, db)); // non-host rejected
});
