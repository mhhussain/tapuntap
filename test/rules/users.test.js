import { test } from "node:test";
import assert from "node:assert";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { makeEnv } from "./helpers.js";

test("users: owner can write own profile, not others'", async () => {
  const env = await makeEnv();
  await env.clearFirestore();
  const alice = env.authenticatedContext("alice").firestore();
  const bob = env.authenticatedContext("bob").firestore();

  await assertSucceeds(setDoc(doc(alice, "users/alice"), { displayName: "Alice" }));
  await assertSucceeds(getDoc(doc(alice, "users/alice")));
  await assertFails(setDoc(doc(bob, "users/alice"), { displayName: "Hacker" }));
  await assertFails(getDoc(doc(bob, "users/alice")));
  await env.cleanup();
});
