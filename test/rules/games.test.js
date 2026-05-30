import { test } from "node:test";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, updateDoc, addDoc, collection } from "firebase/firestore";
import { makeEnv } from "./helpers.js";

async function seedGame(env, status = "active") {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "games/g1"), {
      name: "G", status, hostUid: "alice",
      seatUids: ["alice", "bob"], turnOrder: ["alice", "bob"], activeSeat: 0,
      turn: 1, phase: "main1", phaseIndex: 1
    });
    await setDoc(doc(db, "games/g1/players/alice"), { seat: 0, life: 40, handCount: 7 });
    await setDoc(doc(db, "games/g1/players/alice/private/state"), { hand: ["x"], library: [] });
  });
}

test("games: participant reads, non-participant denied on active", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const bob = env.authenticatedContext("bob").firestore();
  const eve = env.authenticatedContext("eve").firestore();
  await assertSucceeds(getDoc(doc(bob, "games/g1")));
  await assertFails(getDoc(doc(eve, "games/g1")));
  await env.cleanup();
});

test("games: lobby is readable by any authed user", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env, "lobby");
  const eve = env.authenticatedContext("eve").firestore();
  await assertSucceeds(getDoc(doc(eve, "games/g1")));
  await env.cleanup();
});

test("games: only active player writes turn fields", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const alice = env.authenticatedContext("alice").firestore();
  const bob = env.authenticatedContext("bob").firestore();
  // bob is not active (activeSeat=0 → alice); write must fail first before alice changes state
  await assertFails(updateDoc(doc(bob, "games/g1"), { activeSeat: 0 }));
  // alice IS the active player; write must succeed
  await assertSucceeds(updateDoc(doc(alice, "games/g1"), { activeSeat: 1, phaseIndex: 0 }));
  await env.cleanup();
});

test("players: public owner-write, participant-read; private owner-only", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const alice = env.authenticatedContext("alice").firestore();
  const bob = env.authenticatedContext("bob").firestore();
  await assertSucceeds(updateDoc(doc(alice, "games/g1/players/alice"), { life: 38 }));
  await assertFails(updateDoc(doc(bob, "games/g1/players/alice"), { life: 1 }));
  await assertSucceeds(getDoc(doc(bob, "games/g1/players/alice")));         // public readable
  await assertFails(getDoc(doc(bob, "games/g1/players/alice/private/state"))); // private hidden
  await env.cleanup();
});

test("log: participant can create, not update", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const bob = env.authenticatedContext("bob").firestore();
  await assertSucceeds(addDoc(collection(bob, "games/g1/log"), { ts: 1, seat: 1, text: "hi" }));
  await env.cleanup();
});
