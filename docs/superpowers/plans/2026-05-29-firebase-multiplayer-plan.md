# tapuntap Firebase Multiplayer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert tapuntap from a single-user local Express app into a multi-user, real-time Firebase app where up to four authenticated players join a game by invite code and play together, with hidden hand/library zones.

**Architecture:** Static vanilla-JS frontend on Firebase Hosting (no build step; Firebase SDK imported as ESM from the gstatic CDN). Clients read via Firestore `onSnapshot` and write only their own per-player docs; security rules are the only enforcement layer. Three callable Cloud Functions (`createGame`, `joinGame`, `startGame`) handle the few operations needing trust/atomicity. Express is removed entirely.

**Tech Stack:** Firebase (Auth + Google provider, Firestore, Cloud Functions Gen 2 on Node 20, Hosting), Firebase Emulator Suite, `@firebase/rules-unit-testing`, Node built-in test runner, Scryfall API (called directly from the browser).

---

## Required reading before starting

Read the design doc in full: `docs/superpowers/specs/2026-05-29-firebase-multiplayer-design.md`. It contains the complete data model, security-rule intent, and the rationale behind every decision below. This plan turns that design into ordered, bite-sized tasks.

## Testing approach (read once)

This project has **no existing test harness** and is Firebase-heavy. Two verification styles are used and you must follow whichever each task specifies:

- **Automated tests** (TDD) for **security rules** and **Cloud Functions**, run against the **Firebase Emulator Suite** with `@firebase/rules-unit-testing` and the Node built-in test runner. This is where automated testing is reliable and high-value. Write the test first, watch it fail, implement, watch it pass.
- **Explicit manual verification** for **UI and realtime behavior** (impractical to unit-test in a no-build vanilla-JS app). Each such step lists exact browser actions against the emulator and the expected observable result.

**Develop emulator-first.** Nothing before Task 12 touches a live Firebase project. The emulator needs no real credentials.

## Conventions used throughout

- **Firebase SDK version:** import from `https://www.gstatic.com/firebasejs/10.12.0/...` everywhere. Do not mix versions.
- **`seatUids` array:** Firestore security rules cannot reliably `.map()` over arrays of objects. The game doc therefore carries a parallel `seatUids: [uid, ...]` maintained by the `createGame`/`joinGame`/`startGame` functions, and rules check `request.auth.uid in game().seatUids`. This threads through Tasks 7, 8, 9.
- **Bug-for-bug parity:** when porting the dealing logic from `server.js`, preserve existing behavior exactly — commander goes to the command zone (not the library), starting life is 40 for `commander` format else 20, and the library is shuffled with Fisher–Yates. If you spot a bug in the original, note it in the commit message; do not silently fix.
- **No build step:** never introduce a bundler or npm-imported frontend modules. Frontend stays ESM-from-CDN.

## Prerequisites (operator, before Task 1)

The human operator should ideally have done these. If real Firebase config is not ready, **still proceed** — Tasks 1–11 run entirely on the emulator.

1. Firebase project created (id likely `tapuntap`) with Firestore, **Authentication → Google provider enabled**, Hosting, and Functions (Functions deploy needs the Blaze plan; the emulator is free).
2. `npm install -g firebase-tools` then `firebase login`.
3. Node 18+ locally (plan targets Functions on Node 20).

Then create the feature branch:

```bash
cd ~/code/tapuntap
git checkout main
git checkout -b feature/firebase-multiplayer
```

---

## File structure (created/modified by this plan)

```
firebase.json                      (new)  emulator + hosting + firestore + functions config
.firebaserc                        (new)  default project alias
firestore.rules                    (new)  security rules — the enforcement layer
firestore.indexes.json             (new)  index definitions
functions/
  package.json                     (new)  functions deps
  index.js                         (new)  createGame, joinGame, startGame
  lib/invite.js                    (new)  invite-code generator
  lib/deal.js                      (new)  shuffle + buildPlayerState (ported from server.js)
  test/lobby.test.js               (new)  createGame/joinGame tests
  test/start.test.js               (new)  startGame tests
test/rules/
  users.test.js                    (new)  users collection rules
  decks.test.js                    (new)  deck rules
  cards.test.js                    (new)  card cache rules
  games.test.js                    (new)  game + player doc rules
  helpers.js                       (new)  shared emulator test setup
scripts/
  migrate-decks.mjs                (new)  one-time data/decks -> Firestore import
  README.md                        (new)  how to run the migration
public/js/
  firebase.js                      (new)  SDK init + emulator toggle
  firebase-config.js               (new)  public web config (operator fills in)
  auth.js                          (new)  sign-in/out, profile upsert, onAuth
  cards.js                         (new)  Scryfall client + optional cache
  api.js                           (modify) replace fetch wrapper with Firestore/SDK calls
  app.js                           (modify) auth gate + lobby routes
  views/lobby.js                   (new)  create/join/seats/ready/start UI
  views/game.js                    (modify) realtime rewrite + hidden zones
  views/builder.js                 (modify) Firestore-backed decks (minimal)
  views/decks.js                   (modify) Firestore-backed decks (minimal)
  views/games.js                   (modify) point "new game" at lobby flow
public/index.html                  (modify) login overlay
public/css/app.css                 (modify) login overlay styles
server.js                          (delete in Task 12)
package.json                       (modify) deps + scripts
CLAUDE.md                          (modify in Task 12) describe Firebase architecture
.claude/launch.json                (modify in Task 12) remove node server launch
```

---

## Task 1: Scaffold Firebase config, emulators, and rules test harness

**Files:**
- Create: `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`
- Create: `functions/package.json`, `functions/index.js`
- Create: `test/rules/helpers.js`
- Modify: `package.json`, `.gitignore`

- [ ] **Step 1: Create `firebase.json`**

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    { "source": "functions", "codebase": "default" }
  ],
  "hosting": {
    "public": "public",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "hosting": { "port": 5000 },
    "ui": { "enabled": true }
  }
}
```

- [ ] **Step 2: Create `.firebaserc`** (operator replaces `tapuntap` if the real project id differs)

```json
{ "projects": { "default": "tapuntap" } }
```

- [ ] **Step 3: Create `firestore.rules` as deny-all** (real rules arrive in Tasks 3, 4, 6, 8)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }
  }
}
```

- [ ] **Step 4: Create `firestore.indexes.json`**

```json
{ "indexes": [], "fieldOverrides": [] }
```

- [ ] **Step 5: Create `functions/package.json`**

```json
{
  "name": "tapuntap-functions",
  "type": "module",
  "engines": { "node": "20" },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^12.1.0",
    "firebase-functions": "^5.0.1"
  }
}
```

- [ ] **Step 6: Create `functions/index.js`**

```js
// Cloud Functions are added in later tasks (createGame, joinGame, startGame).
export {};
```

- [ ] **Step 7: Install functions deps**

Run: `cd functions && npm install && cd ..`
Expected: `functions/node_modules` created, no errors.

- [ ] **Step 8: Create `test/rules/helpers.js`** (shared harness for all rules tests)

```js
import { readFileSync } from "node:fs";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

export async function makeEnv() {
  return initializeTestEnvironment({
    projectId: "tapuntap-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "localhost",
      port: 8080
    }
  });
}
```

- [ ] **Step 9: Modify root `package.json`** — add dev deps and scripts. Resulting file:

```json
{
  "name": "tapuntap",
  "version": "1.0.0",
  "description": "Magic: The Gathering multiplayer game simulator",
  "type": "module",
  "scripts": {
    "emulators": "firebase emulators:start",
    "test:rules": "firebase emulators:exec --only firestore \"node --test test/rules\""
  },
  "devDependencies": {
    "@firebase/rules-unit-testing": "^3.0.3",
    "firebase-tools": "^13.7.0"
  }
}
```

> Note: the old `express`/`node-fetch`/`uuid`/`nodemon` deps and the `start`/`dev`
> scripts are intentionally dropped here because `server.js` is being retired (it is
> deleted in Task 12, but nothing in Tasks 1–11 runs it). The frontend uses
> `crypto.randomUUID()` instead of the `uuid` package.

- [ ] **Step 10: Update `.gitignore`** — append:

```
functions/node_modules/
.firebase/
*-debug.log
firebase-debug.log
firestore-debug.log
ui-debug.log
```

- [ ] **Step 11: Install root deps**

Run: `npm install`
Expected: completes; `firebase-tools` and `@firebase/rules-unit-testing` present.

- [ ] **Step 12: Verify emulators start**

Run: `firebase emulators:start --only firestore,auth,functions`
Expected: Emulator UI at `http://localhost:4000`, no errors. Press Ctrl-C.

- [ ] **Step 13: Commit**

```bash
git add firebase.json .firebaserc firestore.rules firestore.indexes.json functions/package.json functions/index.js test/rules/helpers.js package.json package-lock.json .gitignore
git commit -m "Scaffold Firebase config, emulators, and rules test harness"
```

---

## Task 2: Firebase client init module + emulator toggle

**Files:**
- Create: `public/js/firebase-config.js`, `public/js/firebase.js`

- [ ] **Step 1: Create `public/js/firebase-config.js`** (operator fills in real values from Firebase console → Project settings → Web app; this holds only the **public** web config, safe to commit)

```js
export const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "tapuntap.firebaseapp.com",
  projectId: "tapuntap",
  appId: "REPLACE_ME"
};
```

- [ ] **Step 2: Create `public/js/firebase.js`**

```js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getFunctions, connectFunctionsEmulator } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

const useEmulator = ["localhost", "127.0.0.1"].includes(location.hostname);
if (useEmulator) {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
  console.info("tapuntap: using Firebase emulators");
}
```

- [ ] **Step 3: Verify** against the hosting emulator

Run: `firebase emulators:start`
Then open `http://localhost:5000`, and in the devtools console run:
`import('/js/firebase.js').then(m => console.log(!!m.db, !!m.auth, !!m.functions))`
Expected: `true true true` and the "using Firebase emulators" info log.

- [ ] **Step 4: Commit**

```bash
git add public/js/firebase.js public/js/firebase-config.js
git commit -m "Add Firebase client init with localhost emulator toggle"
```

---

## Task 3: Auth gate + users collection

**Files:**
- Create: `public/js/auth.js`, `test/rules/users.test.js`
- Modify: `public/index.html`, `public/js/app.js`, `public/css/app.css`, `firestore.rules`

- [ ] **Step 1: Write the failing rules test** `test/rules/users.test.js`

```js
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
```

> Note: rules tests import the Firestore SDK via the bare specifier `firebase/firestore`
> provided transitively by `@firebase/rules-unit-testing`. If Node cannot resolve it, add
> `"firebase": "^10.12.0"` to root `devDependencies` and `npm install`.

- [ ] **Step 2: Run it, watch it fail**

Run: `npm run test:rules`
Expected: FAIL — deny-all rules reject Alice's legitimate write (`assertSucceeds` throws).

- [ ] **Step 3: Implement the `users` rule** — replace the inner `match /{document=**}` block of `firestore.rules` so the file reads:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }

    match /{document=**} { allow read, write: if false; }
  }
}
```

- [ ] **Step 4: Run it, watch it pass**

Run: `npm run test:rules`
Expected: PASS.

- [ ] **Step 5: Create `public/js/auth.js`**

```js
import { auth, db } from "./firebase.js";
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const provider = new GoogleAuthProvider();
export const signIn = () => signInWithPopup(auth, provider);
export const logOut = () => signOut(auth);
export const currentUid = () => auth.currentUser?.uid || null;
export const currentUser = () => auth.currentUser;
export function onAuth(cb) { return onAuthStateChanged(auth, cb); }

export async function ensureUserDoc(user) {
  const ref = doc(db, "users", user.uid);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "Player",
      photoURL: user.photoURL || null,
      email: user.email || null,
      createdAt: serverTimestamp()
    });
  }
}
```

- [ ] **Step 6: Add the login overlay to `public/index.html`** — insert just inside `<body>`, before `#root-wrap`:

```html
  <div id="login-overlay" class="login-overlay hidden">
    <div class="login-card">
      <div class="login-logo">tapuntap</div>
      <p class="login-sub">Sign in to build decks and play.</p>
      <button class="btn btn-primary" id="btn-signin">Sign in with Google</button>
    </div>
  </div>
```

- [ ] **Step 7: Add login overlay styles to `public/css/app.css`** (append)

```css
.login-overlay { position: fixed; inset: 0; display: flex; align-items: center;
  justify-content: center; background: var(--bg-0, #14151a); z-index: 1000; }
.login-overlay.hidden { display: none; }
.login-card { text-align: center; padding: 40px; }
.login-logo { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
.login-sub { color: var(--fg-3, #9aa0aa); margin-bottom: 20px; }
```

- [ ] **Step 8: Guard the router in `public/js/app.js`** — add near the top (after the existing imports) and gate the initial `route()` call:

```js
import { onAuth, ensureUserDoc, signIn, logOut } from './auth.js';

const loginOverlay = document.getElementById('login-overlay');
document.getElementById('btn-signin').addEventListener('click', () => signIn());

let booted = false;
onAuth(async (user) => {
  if (user) {
    await ensureUserDoc(user);
    loginOverlay.classList.add('hidden');
    if (!booted) { booted = true; route(); }
  } else {
    loginOverlay.classList.remove('hidden');
  }
});
```

Remove the existing unconditional `route();` call at the bottom of the file (the
`hashchange` listener stays). Add a sign-out hook: in the rail or settings view wire a
control to `logOut()` (e.g. add `window.__logout = logOut;` temporarily if no settings
button exists yet — replace with a real button in the settings view).

- [ ] **Step 9: Verify (manual)** against emulators

Run: `firebase emulators:start`, open `http://localhost:5000`.
- Expect the login overlay. Click "Sign in with Google" → the Auth emulator dialog →
  add a test user → app renders.
- In Emulator UI → Firestore: a `users/{uid}` doc exists with your display name.
- Trigger sign-out → overlay returns.

- [ ] **Step 10: Commit**

```bash
git add public/js/auth.js public/index.html public/js/app.js public/css/app.css firestore.rules test/rules/users.test.js
git commit -m "Add Google auth gate and users profile collection"
```

---

## Task 4: Deck data layer on Firestore + rules

**Files:**
- Create: `test/rules/decks.test.js`
- Modify: `firestore.rules`, `public/js/api.js`

- [ ] **Step 1: Write the failing rules test** `test/rules/decks.test.js`

```js
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
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npm run test:rules`
Expected: FAIL — Alice's deck write is denied by deny-all.

- [ ] **Step 3: Add the deck rules** — insert inside `match /users/{uid}` (so it nests), making that block:

```
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /decks/{deckId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
        match /versions/{v} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }
```

- [ ] **Step 4: Run it, watch it pass**

Run: `npm run test:rules`
Expected: PASS (both users and decks suites).

- [ ] **Step 5: Replace the deck functions in `public/js/api.js`** — keep the exported names the views already use; back them with Firestore. Replace the deck section with:

```js
import { db } from "./firebase.js";
import { currentUid } from "./auth.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

function decksCol() { return collection(db, "users", currentUid(), "decks"); }

export const api = {
  // ... card functions replaced in Task 6, game functions added in Tasks 10/11 ...

  async listDecks() {
    const snap = await getDocs(decksCol());
    return snap.docs.map(d => {
      const x = d.data();
      return {
        id: d.id, name: x.name, format: x.format,
        commander: x.commander || null,
        colors: x.commander?.colors || [],
        cardCount: (x.cards || []).reduce((s, c) => s + (c.quantity || 0), 0),
        version: x.version, updatedAt: x.updatedAt?.toMillis?.() ?? x.updatedAt ?? 0
      };
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  async getDeck(id) {
    const s = await getDoc(doc(decksCol(), id));
    if (!s.exists()) throw new Error("Deck not found");
    return { id: s.id, ...s.data() };
  },

  async createDeck(data) {
    const uid = currentUid();
    const ref = await addDoc(decksCol(), {
      ownerUid: uid,
      name: data.name,
      format: data.format || "commander",
      commander: data.commander || null,
      cards: data.cards || [],
      version: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(ref, "versions", "1"), {
      version: 1, timestamp: serverTimestamp(),
      changelog: data.changelog || "Initial version",
      cards: data.cards || []
    });
    return { id: ref.id };
  },

  async updateDeck(id, data) {
    const ref = doc(decksCol(), id);
    const cur = await getDoc(ref);
    if (!cur.exists()) throw new Error("Deck not found");
    const newVersion = (cur.data().version || 1) + 1;
    await updateDoc(ref, {
      name: data.name ?? cur.data().name,
      format: data.format ?? cur.data().format,
      commander: data.commander !== undefined ? data.commander : cur.data().commander,
      cards: data.cards ?? cur.data().cards,
      version: newVersion,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(ref, "versions", String(newVersion)), {
      version: newVersion, timestamp: serverTimestamp(),
      changelog: data.changelog || `Version ${newVersion}`,
      cards: data.cards ?? cur.data().cards
    });
    return { id };
  },

  async deleteDeck(id) {
    await deleteDoc(doc(decksCol(), id));
    return { success: true };
  }
};
```

> Note: `builder.js`/`decks.js` already call `api.listDecks/getDeck/createDeck/
> updateDeck/deleteDeck`. Confirm they don't rely on the old server returning the full
> deck object from create/update; if they read `.id` from the result (they do for
> navigation), the shapes above satisfy that. Adjust those two views only where they
> break.

- [ ] **Step 6: Verify (manual)** against emulators in the builder/decks views: create a deck, edit it (version increments), see it listed, open history if present, delete it. Confirm docs under `users/{uid}/decks` and `versions/{n}` in Emulator UI.

- [ ] **Step 7: Commit**

```bash
git add public/js/api.js firestore.rules test/rules/decks.test.js public/js/views/builder.js public/js/views/decks.js
git commit -m "Move decks to Firestore with per-user rules and version subcollection"
```

---

## Task 5: One-time deck migration script

**Files:**
- Create: `scripts/migrate-decks.mjs`, `scripts/README.md`

- [ ] **Step 1: Create `scripts/migrate-decks.mjs`**

```js
// Usage (emulator):
//   TARGET_UID=<uid> FIRESTORE_EMULATOR_HOST=localhost:8080 \
//   GCLOUD_PROJECT=tapuntap node scripts/migrate-decks.mjs
// Usage (live): set GOOGLE_APPLICATION_CREDENTIALS to a service-account key instead
//   of FIRESTORE_EMULATOR_HOST.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import admin from "firebase-admin";

const TARGET_UID = process.env.TARGET_UID;
if (!TARGET_UID) { console.error("Set TARGET_UID"); process.exit(1); }

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "tapuntap" });
const db = admin.firestore();

const dir = join(process.cwd(), "data", "decks");
const files = (await readdir(dir)).filter(f => f.endsWith(".json"));
console.log(`Migrating ${files.length} decks for uid=${TARGET_UID}`);

for (const f of files) {
  const deck = JSON.parse(await readFile(join(dir, f), "utf8"));
  const deckRef = db.doc(`users/${TARGET_UID}/decks/${deck.id}`);
  await deckRef.set({
    ownerUid: TARGET_UID,
    name: deck.name,
    format: deck.format || "commander",
    commander: deck.commander || null,
    cards: deck.cards || [],
    version: deck.version || 1,
    createdAt: deck.createdAt || new Date().toISOString(),
    updatedAt: deck.updatedAt || new Date().toISOString()
  });
  for (const v of (deck.versions || [])) {
    await deckRef.collection("versions").doc(String(v.version)).set({
      version: v.version, timestamp: v.timestamp,
      changelog: v.changelog || `Version ${v.version}`,
      cards: v.cards || []
    });
  }
  console.log(`  ✓ ${deck.name} (${(deck.versions || []).length} versions)`);
}
console.log("Done.");
process.exit(0);
```

- [ ] **Step 2: Create `scripts/README.md`**

```markdown
# Migration scripts

## migrate-decks.mjs

One-time import of `data/decks/*.json` into Firestore at
`users/{TARGET_UID}/decks/{deckId}` (+ `versions/{n}`). Idempotent — uses `set`, so
re-running overwrites rather than duplicating.

Install admin SDK if needed: `npm i -D firebase-admin`

Against the emulator (start it first with `npm run emulators`):

    TARGET_UID=<your-emulator-uid> FIRESTORE_EMULATOR_HOST=localhost:8080 \
    GCLOUD_PROJECT=tapuntap node scripts/migrate-decks.mjs

Against live: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key (no
FIRESTORE_EMULATOR_HOST), then run with your real uid.
```

- [ ] **Step 3: Ensure `firebase-admin` is available for the script**

Run: `npm i -D firebase-admin`
Expected: installs (already a functions dep; this makes it resolvable from repo root).

- [ ] **Step 4: Verify against the emulator**

Start emulators, sign in once in the app to learn your emulator uid (Emulator UI → Auth),
then:
Run: `TARGET_UID=<that-uid> FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=tapuntap node scripts/migrate-decks.mjs`
Expected: logs one line per deck; Emulator UI shows the decks + versions; the app's deck
list shows them. Run it twice — counts do not double.

- [ ] **Step 5: Commit**

```bash
git add scripts/migrate-decks.mjs scripts/README.md package.json package-lock.json
git commit -m "Add one-time deck migration script (data/decks -> Firestore)"
```

---

## Task 6: Card search direct to Scryfall + optional cache

**Files:**
- Create: `public/js/cards.js`, `test/rules/cards.test.js`
- Modify: `public/js/api.js`, `firestore.rules`

- [ ] **Step 1: Write the failing rules test** `test/rules/cards.test.js`

```js
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
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npm run test:rules`
Expected: FAIL — `cards/c1` write denied by deny-all.

- [ ] **Step 3: Add the `cards` rule** — insert as a top-level match (sibling of `users`):

```
    match /cards/{cardId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
```

- [ ] **Step 4: Run it, watch it pass**

Run: `npm run test:rules`
Expected: PASS (users, decks, cards).

- [ ] **Step 5: Create `public/js/cards.js`** (Scryfall client + optional cache)

```js
import { db } from "./firebase.js";
import { doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const SCRY = "https://api.scryfall.com";

export async function searchCards(q, page = 1) {
  const url = `${SCRY}/cards/search?q=${encodeURIComponent(q)}&order=name&page=${page}`;
  const r = await fetch(url);
  if (r.status === 404) return { data: [], total_cards: 0, has_more: false };
  if (!r.ok) throw new Error("Search failed");
  return r.json();
}

export async function getCardByName(name) {
  const r = await fetch(`${SCRY}/cards/named?fuzzy=${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error("Card not found");
  const card = await r.json();
  cacheCard(card);
  return card;
}

export async function getCard(id) {
  const cached = await getDoc(doc(db, "cards", id));
  if (cached.exists()) return cached.data();
  const r = await fetch(`${SCRY}/cards/${id}`);
  if (!r.ok) throw new Error("Card not found");
  const card = await r.json();
  cacheCard(card);
  return card;
}

function cacheCard(card) {
  setDoc(doc(db, "cards", card.id), { ...card, cachedAt: Date.now() }).catch(() => {});
}
```

- [ ] **Step 6: Wire the card functions in `public/js/api.js`** — re-export from `cards.js` so callers using `api.searchCards/getCard/getCardByName` keep working. Add at the top of the `api` object:

```js
import { searchCards, getCard, getCardByName } from "./cards.js";
// inside `export const api = { ... }`:
  searchCards: (q, page = 1) => searchCards(q, page),
  getCard: (id) => getCard(id),
  getCardByName: (name) => getCardByName(name),
```

- [ ] **Step 7: Verify (manual)** in the builder: search returns results; adding a card works; card detail/preview images render. In devtools Network: requests hit `api.scryfall.com` directly; a `cards/{id}` doc appears after a by-id/by-name lookup.

- [ ] **Step 8: Commit**

```bash
git add public/js/cards.js public/js/api.js firestore.rules test/rules/cards.test.js
git commit -m "Fetch cards directly from Scryfall with optional Firestore cache"
```

---

## Task 7: Cloud Functions — createGame and joinGame

**Files:**
- Create: `functions/lib/invite.js`, `functions/test/lobby.test.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Create `functions/lib/invite.js`**

```js
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars
export function makeCode(len = 4) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}
```

- [ ] **Step 2: Write the failing functions test** `functions/test/lobby.test.js`

```js
import { test, before, after } from "node:test";
import assert from "node:assert";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Run against the emulator: FIRESTORE_EMULATOR_HOST is set by `emulators:exec`.
process.env.GCLOUD_PROJECT ||= "tapuntap";
initializeApp({ projectId: "tapuntap" });
const db = getFirestore();

// Import the pure handlers (exported for testing) — see Step 3.
const { _createGame, _joinGame } = await import("../index.js");

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
```

- [ ] **Step 3: Implement in `functions/index.js`** — export both the callable wrappers and the pure handlers (`_createGame`/`_joinGame`) so tests can drive them with an injected `db`:

```js
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { makeCode } from "./lib/invite.js";

initializeApp();
const db = getFirestore();

async function uniqueCode(database) {
  for (let i = 0; i < 10; i++) {
    const code = makeCode(4);
    const dup = await database.collection("games")
      .where("inviteCode", "==", code)
      .where("status", "in", ["lobby", "active"]).limit(1).get();
    if (dup.empty) return code;
  }
  throw new HttpsError("resource-exhausted", "Could not allocate invite code");
}

export async function _createGame(uid, data, database) {
  const { name, format, deckId } = data || {};
  if (!name || !deckId) throw new HttpsError("invalid-argument", "name and deckId required");
  const deck = await database.doc(`users/${uid}/decks/${deckId}`).get();
  if (!deck.exists) throw new HttpsError("not-found", "Deck not found");
  const code = await uniqueCode(database);
  const ref = database.collection("games").doc();
  const seat = { seat: 0, uid, displayName: deck.data().ownerName || "Player",
    deckId, deckName: deck.data().name, ready: false };
  await ref.set({
    name, format: format || "commander", status: "lobby",
    hostUid: uid, inviteCode: code,
    seats: [seat], seatUids: [uid],
    turnOrder: [], turn: 0, activeSeat: 0,
    phase: "beginning", phaseIndex: 0,
    phases: ["beginning", "main1", "combat", "main2", "end"],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  return { gameId: ref.id, inviteCode: code };
}

export async function _joinGame(uid, data, database) {
  const { inviteCode, deckId } = data || {};
  if (!inviteCode || !deckId) throw new HttpsError("invalid-argument", "inviteCode and deckId required");
  const deck = await database.doc(`users/${uid}/decks/${deckId}`).get();
  if (!deck.exists) throw new HttpsError("not-found", "Deck not found");
  const q = await database.collection("games")
    .where("inviteCode", "==", inviteCode).where("status", "==", "lobby").limit(1).get();
  if (q.empty) throw new HttpsError("not-found", "Game not found");
  const ref = q.docs[0].ref;
  return database.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const g = snap.data();
    if (g.seatUids.includes(uid)) throw new HttpsError("already-exists", "Already joined");
    if (g.seats.length >= 4) throw new HttpsError("failed-precondition", "Game full");
    const seat = { seat: g.seats.length, uid, displayName: deck.data().ownerName || "Player",
      deckId, deckName: deck.data().name, ready: false };
    tx.update(ref, {
      seats: [...g.seats, seat], seatUids: [...g.seatUids, uid],
      updatedAt: FieldValue.serverTimestamp()
    });
    return { gameId: ref.id };
  });
}

export const createGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _createGame(req.auth.uid, req.data, db);
});

export const joinGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _joinGame(req.auth.uid, req.data, db);
});
```

> Note: `displayName` falls back to `"Player"` here because the deck doc doesn't store the
> owner's name. Task 10's client wrappers pass the signed-in user's `displayName` in
> `req.data` and the handlers should prefer that — when wiring Task 10, extend the data
> arg to include `displayName` and use it for the seat. Keep the fallback.

- [ ] **Step 4: Run the functions tests**

Run: `firebase emulators:exec --only firestore,functions "node --test functions/test"`
Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js functions/lib/invite.js functions/test/lobby.test.js
git commit -m "Add createGame and joinGame cloud functions"
```

---

## Task 8: Game security rules (lobby + player docs)

**Files:**
- Create: `test/rules/games.test.js`
- Modify: `firestore.rules`

- [ ] **Step 1: Write the failing rules test** `test/rules/games.test.js`

```js
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
  await assertSucceeds(updateDoc(doc(alice, "games/g1"), { activeSeat: 1, phaseIndex: 0 }));
  await assertFails(updateDoc(doc(bob, "games/g1"), { activeSeat: 0 }));
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
```

- [ ] **Step 2: Run it, watch it fail**

Run: `npm run test:rules`
Expected: FAIL — game reads/writes denied by deny-all.

- [ ] **Step 3: Add the game rules** — insert as a top-level match (sibling of `users`/`cards`):

```
    match /games/{gameId} {
      function game() {
        return get(/databases/$(database)/documents/games/$(gameId)).data;
      }
      function isParticipant() {
        return request.auth != null && request.auth.uid in game().seatUids;
      }
      function onlyTurnFields() {
        return request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['turn', 'activeSeat', 'phase', 'phaseIndex', 'updatedAt']);
      }

      allow read: if request.auth != null && (isParticipant() || game().status == 'lobby');
      allow update: if isParticipant() && onlyTurnFields()
        && game().turnOrder[game().activeSeat] == request.auth.uid;

      match /log/{entryId} {
        allow read: if isParticipant();
        allow create: if isParticipant();
      }

      match /players/{uid} {
        allow read: if isParticipant();
        allow write: if request.auth != null && request.auth.uid == uid;

        match /private/{docId} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }
```

- [ ] **Step 4: Run it, watch it pass**

Run: `npm run test:rules`
Expected: PASS (all suites: users, decks, cards, games).

- [ ] **Step 5: Commit**

```bash
git add firestore.rules test/rules/games.test.js
git commit -m "Add game security rules: participants, turn writes, hidden player docs"
```

---

## Task 9: Cloud Function — startGame (deal + shuffle)

**Files:**
- Create: `functions/lib/deal.js`, `functions/test/start.test.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Create `functions/lib/deal.js`** (ported from `server.js`, split into public/private)

```js
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
  for (let i = library.length - 1; i > 0; i--) { // Fisher-Yates
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
```

- [ ] **Step 2: Write the failing test** `functions/test/start.test.js`

```js
import { test } from "node:test";
import assert from "node:assert";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.GCLOUD_PROJECT ||= "tapuntap";
if (!getApps().length) initializeApp({ projectId: "tapuntap" });
const db = getFirestore();
const { _startGame } = await import("../index.js");

test("startGame deals public+private and activates", async () => {
  await db.doc("users/host/decks/d1").set({
    ownerUid: "host", name: "A", format: "commander",
    commander: { cardId: "cmd", name: "Cmd", colors: ["U"] },
    cards: [{ cardId: "isl", name: "Island", quantity: 3 }, { cardId: "cmd", name: "Cmd", quantity: 1 }]
  });
  await db.doc("games/g9").set({
    name: "G", status: "lobby", hostUid: "host", inviteCode: "ZZZZ",
    format: "commander",
    seats: [{ seat: 0, uid: "host", displayName: "Host", deckId: "d1", deckName: "A", ready: true }],
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
```

- [ ] **Step 3: Add `_startGame` + callable to `functions/index.js`** (append; reuse the existing `db`)

```js
import { buildSeatState } from "./lib/deal.js";

export async function _startGame(uid, data, database) {
  const { gameId } = data || {};
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");
  const ref = database.doc(`games/${gameId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found");
  const g = snap.data();
  if (g.hostUid !== uid) throw new HttpsError("permission-denied", "Host only");
  if (g.status !== "lobby") throw new HttpsError("failed-precondition", "Not in lobby");
  if (g.seats.length < 2 && uid !== g.hostUid) throw new HttpsError("failed-precondition", "Need 2+ players");

  const batch = database.batch();
  for (const seat of g.seats) {
    const deck = (await database.doc(`users/${seat.uid}/decks/${seat.deckId}`).get()).data();
    const { publicDoc, privateDoc } = buildSeatState(seat, deck, g.format);
    batch.set(database.doc(`games/${gameId}/players/${seat.uid}`), publicDoc);
    batch.set(database.doc(`games/${gameId}/players/${seat.uid}/private/state`), privateDoc);
  }
  batch.update(ref, {
    status: "active",
    turnOrder: g.seats.map(s => s.uid),
    activeSeat: 0, turn: 1, phase: "beginning", phaseIndex: 0,
    updatedAt: FieldValue.serverTimestamp()
  });
  batch.set(database.collection(`games/${gameId}/log`).doc(), {
    ts: Date.now(), seat: 0, text: `Game "${g.name}" started`
  });
  await batch.commit();
  return { ok: true };
}

export const startGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _startGame(req.auth.uid, req.data, db);
});
```

> Note: the test allows a 1-seat start for simplicity; the `seats.length < 2` guard only
> blocks non-host callers. In the lobby UI (Task 10) enforce ≥2 seats before enabling
> Start for real games.

- [ ] **Step 4: Run the functions tests**

Run: `firebase emulators:exec --only firestore,functions "node --test functions/test"`
Expected: lobby + start tests PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js functions/lib/deal.js functions/test/start.test.js
git commit -m "Add startGame cloud function: server-side shuffle and deal"
```

---

## Task 10: Lobby view (create / join / seats / ready / start)

**Files:**
- Create: `public/js/views/lobby.js`
- Modify: `public/js/app.js`, `public/js/api.js`, `public/js/views/games.js`

- [ ] **Step 1: Add callable wrappers + game subscription to `public/js/api.js`** — extend the `api` object and imports:

```js
import { functions } from "./firebase.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";
import { onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { currentUser } from "./auth.js";

// inside `export const api = { ... }`:
  createGame: (d) => httpsCallable(functions, "createGame")({ ...d, displayName: currentUser()?.displayName }).then(r => r.data),
  joinGame:   (d) => httpsCallable(functions, "joinGame")({ ...d, displayName: currentUser()?.displayName }).then(r => r.data),
  startGame:  (gameId) => httpsCallable(functions, "startGame")({ gameId }).then(r => r.data),
  subscribeGame: (gameId, cb) => onSnapshot(doc(db, "games", gameId), s => cb(s.exists() ? { id: s.id, ...s.data() } : null)),
```

> Note: this passes `displayName` to the functions. Update `_createGame`/`_joinGame` to
> use `data.displayName || "Player"` for the seat's `displayName` (replace the
> `deck.data().ownerName` fallback noted in Task 7).

- [ ] **Step 2: Create `public/js/views/lobby.js`**

```js
import { api } from "../api.js";
import { currentUid } from "../auth.js";
import { navigate } from "../app.js";
import { esc, toast } from "../utils.js";

export async function renderLobbyNew(container) {
  const decks = await api.listDecks();
  const deckOpts = decks.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
  container.innerHTML = `
    <div class="topbar"><div class="topbar-title">New / Join game</div></div>
    <div style="padding:24px;max-width:520px;display:grid;gap:24px">
      <section>
        <h3>Create a game</h3>
        <input id="g-name" class="input" placeholder="Game name" />
        <select id="g-deck" class="input">${deckOpts}</select>
        <button class="btn btn-primary" id="g-create">Create</button>
      </section>
      <section>
        <h3>Join by code</h3>
        <input id="j-code" class="input" placeholder="Invite code" />
        <select id="j-deck" class="input">${deckOpts}</select>
        <button class="btn" id="j-join">Join</button>
      </section>
    </div>`;
  container.querySelector("#g-create").onclick = async () => {
    try {
      const r = await api.createGame({
        name: container.querySelector("#g-name").value || "Untitled",
        format: "commander",
        deckId: container.querySelector("#g-deck").value
      });
      navigate(`/lobby/${r.gameId}`);
    } catch (e) { toast(e.message, "error"); }
  };
  container.querySelector("#j-join").onclick = async () => {
    try {
      const r = await api.joinGame({
        inviteCode: container.querySelector("#j-code").value.trim().toUpperCase(),
        deckId: container.querySelector("#j-deck").value
      });
      navigate(`/lobby/${r.gameId}`);
    } catch (e) { toast(e.message, "error"); }
  };
}

export function renderLobby(container, gameId) {
  let unsub = null;
  const draw = (g) => {
    if (!g) { container.innerHTML = `<div class="empty-state">Game not found</div>`; return; }
    if (g.status === "active") { if (unsub) unsub(); navigate(`/games/${gameId}`); return; }
    const me = currentUid();
    const isHost = g.hostUid === me;
    container.innerHTML = `
      <div class="topbar"><div class="topbar-title">${esc(g.name)}</div></div>
      <div style="padding:24px;display:grid;gap:16px;max-width:560px">
        <div>Invite code: <strong style="font-size:20px">${esc(g.inviteCode)}</strong>
          <button class="btn" id="copy">Copy</button></div>
        <div>
          <h3>Seats (${g.seats.length}/4)</h3>
          ${g.seats.map(s => `<div class="player-chip">${esc(s.displayName)} — ${esc(s.deckName)} ${s.ready ? "✓" : ""}${s.uid === me ? " (you)" : ""}</div>`).join("")}
        </div>
        ${isHost ? `<button class="btn btn-primary" id="start" ${g.seats.length < 2 ? "disabled" : ""}>Start game</button>` : `<div>Waiting for host to start…</div>`}
      </div>`;
    container.querySelector("#copy").onclick = () => navigator.clipboard.writeText(g.inviteCode);
    const startBtn = container.querySelector("#start");
    if (startBtn) startBtn.onclick = async () => {
      try { await api.startGame(gameId); } catch (e) { toast(e.message, "error"); }
    };
  };
  unsub = api.subscribeGame(gameId, draw);
}
```

> Note: this minimal lobby omits a per-seat "Ready" toggle to keep direct `seats` writes
> out of clients (the rules forbid them). If you want ready-up, add a small
> `toggleReady` callable function and a button; otherwise the host starts when ≥2 seats
> are present. Either is acceptable per the design.

- [ ] **Step 3: Add routes in `public/js/app.js`** — add to the `routes` array and import:

```js
import { renderLobby, renderLobbyNew } from './views/lobby.js';
// in routes[]:
  { pattern: /^\/lobby\/new$/, route: 'games', handler: () => renderLobbyNew(app) },
  { pattern: /^\/lobby\/([^/]+)$/, route: 'games', handler: (m) => renderLobby(app, m[1]) },
```

- [ ] **Step 4: Point "new game" at the lobby in `public/js/views/games.js`** — change the "new game" navigation target from `/games/new` to `/lobby/new` (update the button handler(s); leave the rest of the games list as-is).

- [ ] **Step 5: Verify (manual, two browser profiles against emulators)**

- Profile A: sign in, go to New game, create → lands on `#/lobby/{id}` showing a code.
- Profile B: sign in (different test user), New game → Join by code with A's code → both
  profiles' seat lists update live to show 2 seats.
- Profile A (host): Start enabled at 2 seats; click → both profiles navigate to
  `#/games/{id}` (board may still be the pre-rewrite single-user view until Task 11).

- [ ] **Step 6: Commit**

```bash
git add public/js/views/lobby.js public/js/app.js public/js/api.js public/js/views/games.js
git commit -m "Add multiplayer lobby: create, join by code, seats, start"
```

---

## Task 11: Realtime gameplay — port game.js to Firestore + hidden zones

**Files:**
- Modify: `public/js/views/game.js` (data layer rewrite; keep the HTML builders), `public/js/api.js`

- [ ] **Step 1: Add gameplay data helpers to `public/js/api.js`** — extend imports and the `api` object:

```js
import { collection, query, orderBy, writeBatch, updateDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// inside `export const api = { ... }`:
  subscribePlayersPublic: (gameId, cb) =>
    onSnapshot(collection(db, "games", gameId, "players"), snap =>
      cb(snap.docs.map(d => ({ uid: d.id, ...d.data() })))),

  subscribeMyPrivate: (gameId, uid, cb) =>
    onSnapshot(doc(db, "games", gameId, "players", uid, "private", "state"),
      s => cb(s.exists() ? s.data() : { hand: [], library: [] })),

  subscribeLog: (gameId, cb) =>
    onSnapshot(query(collection(db, "games", gameId, "log"), orderBy("ts")),
      snap => cb(snap.docs.map(d => d.data()))),

  writeMyPublic: (gameId, uid, patch) =>
    updateDoc(doc(db, "games", gameId, "players", uid), patch),

  // Atomic hand/library + count update (draw, scry, shuffle)
  writePrivateAndCounts: (gameId, uid, priv) => {
    const b = writeBatch(db);
    b.set(doc(db, "games", gameId, "players", uid, "private", "state"),
      { hand: priv.hand, library: priv.library });
    b.update(doc(db, "games", gameId, "players", uid),
      { handCount: priv.hand.length, libraryCount: priv.library.length });
    return b.commit();
  },

  appendLog: (gameId, entry) =>
    addDoc(collection(db, "games", gameId, "log"), { ts: Date.now(), ...entry }),

  advanceTurn: (gameId, patch) =>
    updateDoc(doc(db, "games", gameId), patch),
```

- [ ] **Step 2: Rewrite the state layer of `public/js/views/game.js`** — replace the module-level single-`G` model and the debounced full-document `saveGame` PUT. Keep all the existing HTML builder functions (`buildGameHTML`, `buildBfZone`, `buildHandCards`, etc.) and the rendering pipeline; change only where state comes from and where mutations go.

New module state and entry:

```js
import { api } from '../api.js';
import { currentUid } from '../auth.js';
import { esc, isLand, toast, /* keep existing imports */ } from '../utils.js';
import { navigate } from '../app.js';

let gameId = null;
let meUid = null;
let gameMeta = null;            // games/{id} doc
let playersPublic = {};         // uid -> public doc
let myPrivate = { hand: [], library: [] };
let logEntries = [];
let unsubs = [];

export async function renderGame(container, id) {
  gameId = id;
  meUid = currentUid();
  container.innerHTML = `<div class="empty-state"><div class="empty-title">Loading game…</div></div>`;

  unsubs.forEach(u => u()); unsubs = [];
  unsubs.push(api.subscribeGame(gameId, g => { gameMeta = g; safeRender(container); }));
  unsubs.push(api.subscribePlayersPublic(gameId, list => {
    playersPublic = Object.fromEntries(list.map(p => [p.uid, p])); safeRender(container);
  }));
  unsubs.push(api.subscribeMyPrivate(gameId, meUid, p => { myPrivate = p; safeRender(container); }));
  unsubs.push(api.subscribeLog(gameId, l => { logEntries = l; safeRender(container); }));
}

function safeRender(container) {
  if (!gameMeta || !playersPublic[meUid]) return; // wait for first snapshots
  render(container);
}
```

Helper accessors used by the builders (replace the old `player()`/`G` accessors):

```js
function me() { return { ...playersPublic[meUid], ...myPrivate, uid: meUid }; }
function opponents() {
  return Object.values(playersPublic).filter(p => p.uid !== meUid); // public only
}
function mySeatIndex() { return gameMeta.turnOrder.indexOf(meUid); }
function isMyTurn() { return gameMeta.turnOrder[gameMeta.activeSeat] === meUid; }
```

- [ ] **Step 3: Route every mutation to the owner's docs.** Replace the old in-place `G` mutations + `scheduleSave()` with writes:

```js
// Tap / move within my zones / life / counters -> my public doc
async function setMyPublic(patch) { await api.writeMyPublic(gameId, meUid, patch); }

// Draw N from my library -> atomic private + counts
async function drawCards(n = 1) {
  const lib = [...myPrivate.library];
  const hand = [...myPrivate.hand];
  for (let i = 0; i < n && lib.length; i++) hand.push(lib.shift());
  await api.writePrivateAndCounts(gameId, meUid, { hand, library: lib });
  await api.appendLog(gameId, { seat: mySeatIndex(), text: `Drew ${n}` });
}

// End turn / next phase -> shared turn fields (allowed only on my turn by rules)
async function endTurn() {
  if (!isMyTurn()) { toast("Not your turn", "error"); return; }
  const next = (gameMeta.activeSeat + 1) % gameMeta.turnOrder.length;
  await api.advanceTurn(gameId, {
    activeSeat: next, turn: gameMeta.turn + (next === 0 ? 1 : 0),
    phase: "beginning", phaseIndex: 0
  });
  await api.appendLog(gameId, { seat: mySeatIndex(), text: "Ended turn" });
}
```

Update the builders so opponents render from **public** data only — show
`p.handCount` and `p.libraryCount`, never opponent hand/library card faces. The "you"
panel uses `me()` (public + private merged). Remove the old `activePlayer` view-switcher
entirely; the local player is always `meUid`. Delete the `scheduleSave`/`saveTimer` code
and the `import { api }`-based `saveGame` calls.

- [ ] **Step 4: Clean up listeners on navigation** — ensure `unsubs` are torn down when leaving the view (call the unsub functions at the start of `renderGame`, already shown; if the router supports a teardown hook, also unsubscribe there).

- [ ] **Step 5: Verify (manual, two profiles against emulators) — the core acceptance test**

Set up a 2-player active game (Tasks 10 + 9), then:
- A draws cards → A sees card faces; B sees A's **handCount** increase but **no** card
  faces. In B's devtools, attempting
  `getDoc(doc(db,'games',gameId,'players',aliceUid,'private','state'))` is **denied**.
- A plays a land to the battlefield → B sees it appear live.
- A taps a permanent / changes life → B sees it live.
- A ends turn → `activeSeat` advances; now B can end turn and A cannot (A's
  `advanceTurn` is rejected by rules — observe the permission error in A's console).
- Reload both browsers → state rehydrates identically from Firestore.

- [ ] **Step 6: Commit**

```bash
git add public/js/views/game.js public/js/api.js
git commit -m "Port gameplay to realtime Firestore with hidden hand/library zones"
```

---

## Task 12: Remove Express, finalize hosting, live smoke test

**Files:**
- Delete: `server.js`
- Modify: `package.json`, `.claude/launch.json`, `CLAUDE.md`

- [ ] **Step 1: Delete the Express server**

Run: `git rm server.js`

- [ ] **Step 2: Prune `package.json`** — confirm no Express-era deps/scripts remain. The
file should match the Task 1 result (name `tapuntap`, `type: module`, only the
`emulators`/`test:rules` scripts, dev deps `@firebase/rules-unit-testing`,
`firebase-tools`, `firebase-admin`). Remove `main: server.js` if present.

- [ ] **Step 3: Fix `.claude/launch.json`** — remove the node `server.js` launch config
(replace the `configurations` array with `[]`, or delete the file).

- [ ] **Step 4: Rewrite the stale parts of `CLAUDE.md`** — replace the "Backend
(server.js)" / Express / local-JSON-files description with the shipped Firebase
architecture: Firestore data model (from the design doc §3), security rules as the
enforcement layer, the three Cloud Functions, client-direct Scryfall, Firebase Hosting,
and the public/private hidden-zone split. Keep it accurate to what was built; do not
leave references to `server.js`, `data/decks`, or `/api/*` as the live system.

- [ ] **Step 5: Operator — provide real config and deploy**

Fill `public/js/firebase-config.js` with the real web config (Firebase console → Project
settings → Web app). Then:

Run: `firebase deploy --only firestore:rules,functions,hosting`
Expected: rules, functions, and hosting deploy without error; note the hosting URL.

- [ ] **Step 6: Live smoke test** (two real Google accounts)

- Sign in on the hosting URL with account 1; confirm a deck exists (optionally run
  `scripts/migrate-decks.mjs` against the live project with your real uid first).
- Create a game, copy the invite code; sign in as account 2 elsewhere and join.
- Host starts; play a few turns. Confirm: realtime sync of public state, hidden hands
  (account 2 cannot see account 1's hand), and only the active player can advance the
  turn.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Remove Express server; finalize Firebase hosting and docs"
```

---

## Whole-plan acceptance criteria

The rework is complete when, against the deployed project:

1. Unauthenticated users see only the sign-in screen; Google sign-in creates a `users` doc.
2. A user can build, edit (versioned), list, and delete decks in Firestore; existing decks were migrated.
3. Card search/lookup works directly from Scryfall in the browser.
4. A host creates a game, shares an invite code, and up to three others join a live lobby and choose decks — updating in real time.
5. Starting deals fairly (server-side shuffle); each player has a private hand/library and a public board.
6. During play, all clients see each other's **public** state live, while hands and library order stay private (opponent private docs are unreadable — verified by a denied read), and only the active player can advance the turn.
7. `npm run test:rules` passes (users, decks, cards, games); functions tests pass.
8. No Express server remains; the app is served entirely by Firebase Hosting.

---

## Self-review (completed by plan author)

**Spec coverage** — every design-doc section maps to a task: auth/users → T3; decks +
versions subcollection → T4; deck migration → T5; cards direct + cache → T6; lobby +
createGame/joinGame → T7/T10; game security rules incl. public/private split → T8;
startGame deal/shuffle → T9; realtime gameplay + hidden zones → T11; Express removal +
hosting + docs → T12; emulator-first testing → all tasks. Deferred items (presence,
stale-lobby cleanup) are explicitly out of scope per design §9.

**Placeholder scan** — no TBD/TODO; every code step shows complete code; every test step
shows the assertion and the run command with expected result.

**Type/name consistency** — `seatUids`, `turnOrder`, `activeSeat`, `handCount`/
`libraryCount`, `players/{uid}` (public) and `players/{uid}/private/state` (private),
and the `_createGame`/`_joinGame`/`_startGame` testable handlers are used consistently
across Tasks 7–11. The `displayName` threading note in Tasks 7/10 is called out so the
seat name source matches.
