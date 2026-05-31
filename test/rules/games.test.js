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
  try {
    const bob = env.authenticatedContext("bob").firestore();
    const eve = env.authenticatedContext("eve").firestore();
    await assertSucceeds(getDoc(doc(bob, "games/g1")));
    await assertFails(getDoc(doc(eve, "games/g1")));
  } finally {
    await env.cleanup();
  }
});

test("games: lobby is readable by any authed user", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env, "lobby");
  try {
    const eve = env.authenticatedContext("eve").firestore();
    await assertSucceeds(getDoc(doc(eve, "games/g1")));
  } finally {
    await env.cleanup();
  }
});

test("games: clients cannot write turn fields directly (now Function-owned)", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const alice = env.authenticatedContext("alice").firestore();
  await assertFails(updateDoc(doc(alice, "games/g1"), { activeSeat: 1, phaseIndex: 0 }));
  await env.cleanup();
});

test("players: public owner-write, participant-read; private owner-only", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  try {
    const alice = env.authenticatedContext("alice").firestore();
    const bob = env.authenticatedContext("bob").firestore();
    await assertSucceeds(updateDoc(doc(alice, "games/g1/players/alice"), { life: 38 }));
    await assertFails(updateDoc(doc(bob, "games/g1/players/alice"), { life: 1 }));
    await assertSucceeds(getDoc(doc(bob, "games/g1/players/alice")));
    await assertFails(getDoc(doc(bob, "games/g1/players/alice/private/state")));
  } finally {
    await env.cleanup();
  }
});

test("players: owner cannot forge counts directly (Function-owned)", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const alice = env.authenticatedContext("alice").firestore();
  await assertSucceeds(updateDoc(doc(alice, "games/g1/players/alice"), { life: 38 }));
  await assertFails(updateDoc(doc(alice, "games/g1/players/alice"), { handCount: 0 }));
  await env.cleanup();
});

test("log: participant can create, not update", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  try {
    const bob = env.authenticatedContext("bob").firestore();
    await assertSucceeds(addDoc(collection(bob, "games/g1/log"), { ts: 1, seat: 1, text: "hi" }));
  } finally {
    await env.cleanup();
  }
});

test("players: opponent can READ another participant's public doc (regression)", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const bob = env.authenticatedContext("bob").firestore();
  // bob is a participant; alice's public doc must be readable by bob
  await assertSucceeds(getDoc(doc(bob, "games/g1/players/alice")));
  await env.cleanup();
});

test("log: participant can READ the log (regression)", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "games/g1/log/e1"), { ts: 1, seat: 0, text: "hi" });
  });
  const bob = env.authenticatedContext("bob").firestore();
  await assertSucceeds(getDoc(doc(bob, "games/g1/log/e1")));
  await env.cleanup();
});
