import { test } from "node:test";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { makeEnv } from "./helpers.js";

test("decks: owner CRUD only", async () => {
  const env = await makeEnv();
  await env.clearFirestore();
  const alice = env.authenticatedContext("alice").firestore();
  const bob = env.authenticatedContext("bob").firestore();

  await assertSucceeds(setDoc(doc(alice, "users/alice/decks/d1"), { name: "Sultai" }));
  await assertSucceeds(setDoc(doc(alice, "users/alice/decks/d1/versions/1"), { version: 1 }));
  await assertSucceeds(getDoc(doc(alice, "users/alice/decks/d1")));
  await assertFails(getDoc(doc(bob, "users/alice/decks/d1")));
  await assertFails(setDoc(doc(bob, "users/alice/decks/d1"), { name: "Steal" }));
  await env.cleanup();
});
