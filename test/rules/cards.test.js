import { test } from "node:test";
import { assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { makeEnv } from "./helpers.js";

test("cards: authed read/write, anon denied", async () => {
  const env = await makeEnv();
  await env.clearFirestore();
  const alice = env.authenticatedContext("alice").firestore();
  const anon = env.unauthenticatedContext().firestore();

  await assertSucceeds(setDoc(doc(alice, "cards/c1"), { name: "Island" }));
  await assertSucceeds(getDoc(doc(alice, "cards/c1")));
  await assertFails(getDoc(doc(anon, "cards/c1")));
  await env.cleanup();
});
