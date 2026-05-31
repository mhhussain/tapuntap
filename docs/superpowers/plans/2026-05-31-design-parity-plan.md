# tapuntap Design Adoption & Gameplay Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the finished Claude Design visual system across all 7 screens of the React/TS app and restore full gameplay parity (context menus, modals, zone drawers, drag-drop, counters, keyboard), wired to the existing Firebase backend.

**Architecture:** A gating **design-system foundation** (fonts, tokens, shared components) lands first; then **screens** (Auth, Lobby, DeckLibrary+Builder, GamesList, EndGame, ActiveGameplay) are built as independent units that can run in parallel; plus two small new Cloud Functions (`toggleReady`, `removePlayer`) the Lobby needs. The vendored design at `docs/design/project/` is the authoritative visual spec — recreate it in our React components, wiring to our real hooks/api (don't copy the prototype's mock state).

**Tech Stack:** React 18 + TypeScript + Vite (app under `app/`), Firebase (Auth, Firestore, Functions Gen 2 Node 20, emulator), Vitest, Google Fonts (Geist, Instrument Serif, JetBrains Mono).

**Source spec:** `docs/superpowers/specs/2026-05-31-design-system-and-gameplay-parity-design.md` — read it first.

---

## How to work this plan (read once)

- **Branch:** continue on `feature/firebase-multiplayer`. Do NOT merge to `main` (that deploys production — the user does it). Push to the branch for previews.
- **Design = visual source of truth.** For every screen task, OPEN the named file under `docs/design/project/` and read it top-to-bottom, then recreate its **visual output** as our React component. Match layout/spacing/classes/copy; do NOT copy the prototype's mock data or state machinery — wire to our hooks/api as specified in the task. Per the bundle README, do not render the prototype in a browser; read the JSX/CSS directly.
- **Don't break what works.** The app currently builds and all gates pass. After every task: `cd app && npm run build` must exit 0; keep `npm test` (Vitest), `npm run test:rules`, `npm run test:functions` green.
- **UI verification is manual** (no-logic React isn't worth unit-testing). Each UI task lists the build gate + the manual checks the human runs against the emulator. **Pure logic** (functions, scry/curve helpers) is TDD'd with Vitest/node:test.
- **Backend testing:** emulator + tests locally; manual `firebase deploy --only firestore:rules,functions` to validate on the preview URL.
- **Phase order:** Phase A (Tasks 1–2) BLOCKS Phase C. Phase B (Task 3) can run alongside A. Phase C (Tasks 4–13) can be parallelized after A; Lobby (Task 5) and EndGame (Task 8) also need B.
- **Commit after each task.** End commit messages with the Co-Authored-By trailer.

## File structure (created/modified)

```
app/index.html                         (modify) Google Fonts links
app/public/app.css                     (modify) reconcile tokens/fonts/shared classes with docs/design/project/styles.css
app/src/components/
  Avatar.tsx        (new)   initials/photo avatar
  Spinner.tsx       (new)   loading spinner
  ContextMenu.tsx   (new)   right-click menu (header/items/sep/danger) + open helper
  ManaCost.tsx      (new)   mana pip / cost renderer
  Modal.tsx CardFace.tsx Icon.tsx AppShell.tsx   (modify) match design markup/classes
app/src/lib/format.ts                  (modify) colorTone aligned to design mana tokens
functions/index.js                     (modify) _toggleReady, _removePlayer + callables
functions/test/lobby.test.js           (modify) tests for toggleReady/removePlayer
app/src/api/games.ts                   (modify) toggleReady/removePlayer wrappers
app/src/auth/AuthScreen.tsx            (modify) match Auth.jsx (splash, validation, errors)
app/src/features/lobby/{LobbyNewView,LobbyView}.tsx        (modify) match Lobby.jsx + ready/remove
app/src/features/decks/{DecksView,BuilderView}.tsx         (modify) match DeckLibrary.jsx
app/src/features/games/GamesView.tsx                       (modify) match GameManagement.jsx variants
app/src/features/home/HomeView.tsx                         (modify) align to design
app/src/features/game/endgame/EndGameView.tsx              (modify) match EndGame.jsx + confirm modals
app/src/features/game/GameView.tsx                         (modify) full-parity composition
app/src/features/game/components/
  PlayerRibbon, OpponentsBar, Battlefield, Hand, SidePanel  (modify) match ActiveGameplay.jsx
  CardDetailModal, HoverPreview, ScryModal, TokenModal, ZoneDrawer  (new)
app/src/features/game/useGameActions.ts                    (modify) any missing action wrappers
app/src/features/game/useCardMenus.ts  (new)   builds hand/battlefield context-menu item lists
app/src/test/*.test.ts                 (new)   pure-logic unit tests (scry assembly, mana curve)
```

---

## Phase A — Design-system foundation (Tasks 1–2) — BLOCKS Phase C

### Task 1: Fonts + CSS token/shared-class reconciliation

**Files:**
- Modify: `app/index.html`, `app/public/app.css`
- Reference: `docs/design/project/styles.css`

- [ ] **Step 1: Add Google Fonts to `app/index.html`** — inside `<head>`, before the app.css `<link>`:

```html
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
```

- [ ] **Step 2: Read `docs/design/project/styles.css` in full.** It is the target for the shared design system.

- [ ] **Step 3: Reconcile `app/public/app.css` with the design tokens & shared classes.** Update the `:root` token block and the shared component classes to match `docs/design/project/styles.css` exactly: backgrounds `--bg-0..4`, foregrounds `--fg-0..4`, `--line-1..3`, `--accent`/`--accent-soft`/`--accent-line`, `--good`/`--warn`/`--bad`, mana `--mana-*`, the `--font-sans/serif/mono` (Geist / Instrument Serif / JetBrains Mono), density vars + `[data-density="compact"]`, radii, shadows. Then align these shared classes to the design: `.btn`/`.btn-primary`/`.btn-ghost`/`.btn-icon`/`.btn-sm`, `.kbd`, `.input`/`.search`, `.pip`/`.pip-*`/`.pip-row`, `.card` + `.card-color-bar`/`.card-name`/`.card-art`/`.card-foot`/`.card-cost`/`.card-pt`/`.card.is-land`/`.card.summoning-sick`/`.card-counter` + **`.card.tapped`** (90° rotation), `.panel`/`.panel-header`/`.panel-title`, `.eyebrow`, scrollbars, `.modal*`, `@keyframes fadeIn/spin/slideUp`, `.drop-target`, utilities (`.row`/`.col`/`.muted`/`.divider`/`.tag`/`.tag-good`/`.tag-warn`), `.empty*`, `.auth-bg`/`.auth-link`, and the serif-italic treatment on `.topbar-title`/`.modal-title`/`.empty-title`.

> **CRITICAL — do not delete app-specific classes.** Our components rely on classes that may NOT appear in the design's shared styles.css (they live inline in the prototype's JSX), e.g. gameplay/builder/lobby layout classes (`.gameplay-wrap`, `.player-ribbon`, `.ribbon-*`, `.bf-zone*`, `.hand-*`, `.side-panel*`, `.zone-tab*`, `.opponent-mini-card`, `.games-grid`, `.decks-grid`, `.deck-card-*`, `.home-*`, `.settings-*`, `.login-*`, `.player-chip`, `.toast*`, `.modal-backdrop.hidden`, etc.). **Preserve every existing class**; only update the shared tokens/components above and ADD any new shared classes from the design. When in doubt, keep both.

- [ ] **Step 4: Build**

Run: `cd /Users/iammoo/code/tapuntap/app && npm run build`
Expected: exit 0, no errors.

- [ ] **Step 5: Manual verification** (emulator + `cd app && npm run dev`)
- Every existing screen still renders (no missing-style breakage): Auth, Home, Decks, Builder, Games, Lobby, Game, Settings, End.
- Screen titles, modal titles, and empty-state titles now render in **Instrument Serif italic**; body text in Geist; numerics/metadata in JetBrains Mono.
- The rail logo and amber accent match the design.

- [ ] **Step 6: Commit**

```bash
git add app/index.html app/public/app.css
git commit -m "Adopt design fonts and reconcile shared CSS tokens/components

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Shared components (Avatar, Spinner, ContextMenu, ManaCost) + refresh Modal/CardFace/Icon/AppShell

**Files:**
- Create: `app/src/components/Avatar.tsx`, `app/src/components/Spinner.tsx`, `app/src/components/ContextMenu.tsx`, `app/src/components/ManaCost.tsx`
- Modify: `app/src/components/Modal.tsx`, `app/src/components/CardFace.tsx`, `app/src/components/Icon.tsx`, `app/src/components/AppShell.tsx`, `app/src/lib/format.ts`
- Reference: `docs/design/project/components.jsx`, `docs/design/project/styles.css`, `docs/design/project/App.jsx`

- [ ] **Step 1: Read `docs/design/project/components.jsx` and `App.jsx`.** These define the shared primitives and the rail/shell.

- [ ] **Step 2: Create `app/src/components/Avatar.tsx`** — props `{ name?: string; photoURL?: string | null; size?: number }`. Renders a circular avatar: the `photoURL` image if present, else the first initial of `name` on a `--bg-3` disc with `--line-2` border. Match the design's avatar styling.

- [ ] **Step 3: Create `app/src/components/Spinner.tsx`** — a CSS spinner using the `@keyframes spin` from app.css; props `{ size?: number; label?: string }`. Used by the Auth loading splash.

- [ ] **Step 4: Create `app/src/components/ManaCost.tsx`** — props `{ cost: string }` (a mana-cost string like `"{2}{U}{U}"` or a colors array fallback). Renders `.pip`/`.pip-row` pips per the design (`.pip-w/u/b/r/g/c`). Export a helper `manaPips(cost: string): {sym:string,cls:string}[]` that parses the cost into pip descriptors, and unit-test that helper (Step 5).

- [ ] **Step 5: Write `app/src/test/manaCost.test.ts`** and run it (TDD):

```ts
import { describe, it, expect } from "vitest";
import { manaPips } from "../components/ManaCost";

describe("manaPips", () => {
  it("parses colored and generic symbols", () => {
    const pips = manaPips("{2}{U}{U}");
    expect(pips.map((p) => p.sym)).toEqual(["2", "U", "U"]);
    expect(pips[1].cls).toContain("pip-u");
  });
  it("handles empty cost", () => {
    expect(manaPips("")).toEqual([]);
  });
});
```

Run: `cd app && npx vitest run src/test/manaCost.test.ts` → fails, implement `manaPips`, re-run → passes.

- [ ] **Step 6: Create `app/src/components/ContextMenu.tsx`** — a right-click menu rendered at `{x,y}`. Props: `{ items: MenuItem[]; x: number; y: number; onClose: () => void }` where
  `type MenuItem = { header: string } | "sep" | { label: string; icon?: ReactNode; danger?: boolean; onClick: () => void }`.
  Renders a fixed-position menu (clamped to viewport), closes on outside-click/Escape/selection. Provide a small hook `useContextMenu()` returning `{ menu, openMenu(e, items), closeMenu }` so screens can wire `onContextMenu`. Match the design's menu styling (use `.panel`/`--bg-*`/`--line-*`).

- [ ] **Step 7: Refresh `Modal.tsx`, `CardFace.tsx`, `Icon.tsx`, `AppShell.tsx`** to the design markup:
  - `Modal`: header uses serif-italic `.modal-title`, `.modal-body`, `.modal-footer`, backdrop blur (classes already in app.css). Keep the existing prop API (`title`, `onClose`, `children`, `footer`, `width`).
  - `CardFace`: keep rendering the real Scryfall `imageUri` as `.card-img-fill`, but ensure the design card frame wraps it (color bar, tapped rotation via `.card.tapped`, P/T `.card-pt`, counters `.card-counter`, token badge, `.summoning-sick`). When no `imageUri`, render the abstract `.card-art` hatched block + `.card-name` + `.card-foot` exactly like the design. Keep existing props (`card`, `zone`, `onClick`, `onContextMenu`, `draggable`, `onDragStart`).
  - `Icon`: add any icons the design uses that we lack (scry, token/spark, deck, graveyard, exile, duplicate/command, note, undo, copy, check, play, prev/next) — extend the `PATHS` map; keep the existing signature.
  - `AppShell`/rail: match the design rail (logo disc with serif italic letter, active indicator bar, tooltips via `data-tip`). Preserve current nav routes + sign-out.
  - `lib/format.ts` `colorTone`: align the returned oklch values to the design's `--mana-*` tokens.

- [ ] **Step 8: Build + full Vitest**

Run: `cd app && npm run build && npx vitest run`
Expected: build exit 0; all Vitest pass (incl. new manaCost test).

- [ ] **Step 9: Manual verification** — cards render with real images inside the new frame; tapped cards rotate; a right-click on a card opens the ContextMenu (once wired in Task 10 it'll have items; here just confirm the component mounts/positions if you temporarily wire a test menu — otherwise defer interaction check to Task 10). Rail + modals match the design.

- [ ] **Step 10: Commit**

```bash
git add app/src/components app/src/lib/format.ts app/src/test/manaCost.test.ts
git commit -m "Add shared design components (Avatar/Spinner/ContextMenu/ManaCost); refresh Modal/CardFace/Icon/AppShell

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase B — Backend functions (Task 3) — can run alongside Phase A

### Task 3: `toggleReady` and `removePlayer` Cloud Functions (TDD)

**Files:**
- Modify: `functions/index.js`, `functions/test/lobby.test.js`, `app/src/api/games.ts`

- [ ] **Step 1: Add failing tests to `functions/test/lobby.test.js`** (the import line already includes `_createGame, _joinGame, _leaveGame, _endGame`; extend it to add `_toggleReady, _removePlayer`):

```js
const { _createGame, _joinGame, _leaveGame, _endGame, _toggleReady, _removePlayer } = await import("../index.js");

test("toggleReady flips the caller's own seat ready flag", async () => {
  await db.doc("users/host/decks/d1").set({ ownerUid: "host", name: "A", format: "commander" });
  await db.doc("users/bob/decks/d2").set({ ownerUid: "bob", name: "B", format: "commander" });
  const { gameId, inviteCode } = await _createGame("host", { name: "G", format: "commander", deckId: "d1" }, db);
  await _joinGame("bob", { inviteCode, deckId: "d2" }, db);
  await _toggleReady("bob", { gameId }, db);
  let g = (await db.doc(`games/${gameId}`).get()).data();
  assert.equal(g.seats.find((s) => s.uid === "bob").ready, true);
  await _toggleReady("bob", { gameId }, db);
  g = (await db.doc(`games/${gameId}`).get()).data();
  assert.equal(g.seats.find((s) => s.uid === "bob").ready, false);
});

test("removePlayer: host removes a seat; cannot remove host; non-host rejected", async () => {
  await db.doc("users/host/decks/d1").set({ ownerUid: "host", name: "A", format: "commander" });
  await db.doc("users/bob/decks/d2").set({ ownerUid: "bob", name: "B", format: "commander" });
  const { gameId, inviteCode } = await _createGame("host", { name: "G", format: "commander", deckId: "d1" }, db);
  await _joinGame("bob", { inviteCode, deckId: "d2" }, db);
  await assert.rejects(() => _removePlayer("bob", { gameId, targetUid: "host" }, db)); // non-host
  await assert.rejects(() => _removePlayer("host", { gameId, targetUid: "host" }, db)); // can't remove host
  await _removePlayer("host", { gameId, targetUid: "bob" }, db);
  const g = (await db.doc(`games/${gameId}`).get()).data();
  assert.ok(!g.seatUids.includes("bob"));
  assert.equal(g.seats.length, 1);
});
```

- [ ] **Step 2: Run, watch fail**

Run: `firebase emulators:exec --only firestore,functions "node --test 'functions/test/**/*.test.js'"`
Expected: the two new tests FAIL (`_toggleReady`/`_removePlayer` undefined).

- [ ] **Step 3: Implement in `functions/index.js`** (place near `_leaveGame`):

```js
export async function _toggleReady(uid, data, database) {
  const { gameId } = data || {};
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");
  const ref = database.doc(`games/${gameId}`);
  return database.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Game not found");
    const g = snap.data();
    if (g.status !== "lobby") throw new HttpsError("failed-precondition", "Not in lobby");
    if (!g.seatUids.includes(uid)) throw new HttpsError("permission-denied", "Not a participant");
    const seats = g.seats.map((s) => s.uid === uid ? { ...s, ready: !s.ready } : s);
    tx.update(ref, { seats, updatedAt: FieldValue.serverTimestamp() });
    return { ok: true };
  });
}

export async function _removePlayer(uid, data, database) {
  const { gameId, targetUid } = data || {};
  if (!gameId || !targetUid) throw new HttpsError("invalid-argument", "gameId and targetUid required");
  const ref = database.doc(`games/${gameId}`);
  return database.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Game not found");
    const g = snap.data();
    if (g.hostUid !== uid) throw new HttpsError("permission-denied", "Host only");
    if (targetUid === g.hostUid) throw new HttpsError("failed-precondition", "Cannot remove the host");
    if (g.status !== "lobby") throw new HttpsError("failed-precondition", "Not in lobby");
    tx.update(ref, {
      seats: g.seats.filter((s) => s.uid !== targetUid),
      seatUids: g.seatUids.filter((u) => u !== targetUid),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
}

export const toggleReady = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _toggleReady(req.auth.uid, req.data, db);
});

export const removePlayer = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _removePlayer(req.auth.uid, req.data, db);
});
```

- [ ] **Step 4: Run, watch pass**

Run: `firebase emulators:exec --only firestore,functions "node --test 'functions/test/**/*.test.js'"`
Expected: all pass (including the two new tests).

- [ ] **Step 5: Add client wrappers to `app/src/api/games.ts`** (next to the other callables):

```ts
export const toggleReady = (gameId: string) => call("toggleReady")({ gameId });
export const removePlayer = (gameId: string, targetUid: string) => call("removePlayer")({ gameId, targetUid });
```

- [ ] **Step 6: Build the app** to confirm types

Run: `cd app && npm run build`  Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
git add functions/index.js functions/test/lobby.test.js app/src/api/games.ts
git commit -m "Add toggleReady and removePlayer cloud functions + client wrappers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Phase C — Screens (Tasks 4–13) — parallelizable after Phase A

> For each screen task: (1) READ the named design file fully, (2) recreate its visual output in the React component, (3) wire data/actions per the task's contract, (4) `npm run build` exit 0, (5) note manual verification deferred to the human, (6) commit. Preserve routes and the auth gate. Do not invent backend calls — use only the listed hooks/api.

### Task 4: Auth screen → match `Auth.jsx`

**Files:** Modify `app/src/auth/AuthScreen.tsx`. Reference `docs/design/project/screens/Auth.jsx`.

- [ ] **Step 1: Read `docs/design/project/screens/Auth.jsx`.**
- [ ] **Step 2: Recreate it in `AuthScreen.tsx`**, preserving the existing wiring to `useAuth()` (`signInGoogle`, `signInEmail`, `signUpEmail`) and the sign-in⇄sign-up toggle. Add, per the design: the `.auth-bg` gradient backdrop; centered card; **Continue with Google** primary; email/password fields; on sign-up a **name** field and a **password strength meter**; live field validation (invalid email, weak password); server-style **error banners** (invalid-credential; email-already-in-use with an inline "Sign in" link that flips to sign-in mode); a disabled-looking placeholder **"Forgot password?"** link (no handler yet). Keep the friendly-error mapping already present.
- [ ] **Step 3:** The pre-auth **loading splash** lives in `RequireAuth` (it renders while `loading`). Update `app/src/auth/RequireAuth.tsx`'s loading branch to render the design's "Restoring session…" splash using `Spinner` on the `.auth-bg`, so there's no app-shell flash. (Modify RequireAuth too.)
- [ ] **Step 4:** Build (`cd app && npm run build`, exit 0).
- [ ] **Step 5:** Manual: splash → no flash; Google + email sign-in/up; validation + strength meter; error banners incl. email-already-in-use inline link. (Deferred to human.)
- [ ] **Step 6:** Commit (`app/src/auth/AuthScreen.tsx app/src/auth/RequireAuth.tsx`), message "Match Auth screen to design (splash, validation, strength meter, error banners)".

### Task 5: Lobby → match `Lobby.jsx` (needs Task 3)

**Files:** Modify `app/src/features/lobby/LobbyNewView.tsx`, `app/src/features/lobby/LobbyView.tsx`. Reference `docs/design/project/screens/Lobby.jsx`.

- [ ] **Step 1: Read `Lobby.jsx`.**
- [ ] **Step 2: LobbyNewView** — recreate the create/join entry view: Create panel (name input, **format chips** Commander/Standard/etc., deck picker) and Join panel (code input, deck picker), plus the **zero-decks empty state** ("Build a deck first" → `/decks/new`). Keep wiring to `createGame`/`joinGame` (api/games) and `useMyDecks`.
- [ ] **Step 3: LobbyView** (room) — recreate: prominent invite code with **copy-link**; **2×2 seat grid** showing ready / waiting / open-seat states (use `Avatar`); your own **ready toggle** → `toggleReady(gameId)`; host **remove-player** on hover for other seats → `removePlayer(gameId, uid)`; **Start** gated on `seats.length >= 2 && seats.every(s => s.ready)` → `startGame`; leave/cancel → `leaveGame`. Live via `useGame`; auto-navigate to `/games/:id` when status becomes `active`.
- [ ] **Step 4:** Build (exit 0).
- [ ] **Step 5:** Manual (two accounts): create→lobby; join; ready toggles flip live; host removes a seat; Start enables only when ≥2 and all ready; leave/cancel. (Deferred.)
- [ ] **Step 6:** Commit, message "Match Lobby to design: seat grid, ready toggle, remove-player, start gating".

### Task 6: DeckLibrary + Builder → match `DeckLibrary.jsx`

**Files:** Modify `app/src/features/decks/DecksView.tsx`, `app/src/features/decks/BuilderView.tsx`. Create `app/src/test/manaCurve.test.ts`. Reference `docs/design/project/screens/DeckLibrary.jsx`.

- [ ] **Step 1: Read `DeckLibrary.jsx`.**
- [ ] **Step 2: TDD a `manaCurve` helper.** Add `computeManaCurve(cards)` (returns counts by cmc bucket) to `app/src/lib/cards.ts` and test in `app/src/test/manaCurve.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { computeManaCurve } from "../lib/cards";
describe("computeManaCurve", () => {
  it("buckets by cmc with 6+ grouped", () => {
    const curve = computeManaCurve([
      { cmc: 0, quantity: 2 }, { cmc: 3, quantity: 4 }, { cmc: 8, quantity: 1 },
    ] as any);
    expect(curve[0]).toBe(2); expect(curve[3]).toBe(4); expect(curve["6+"]).toBe(1);
  });
});
```
Run vitest → fail → implement → pass.

- [ ] **Step 3: DecksView** — recreate the library: deck list with color/search **filters**, and a detail view with **stats + mana curve + grouped decklist + version history**. Wire to `listDecks`/`useMyDecks(refreshKey)`, `getDeck`, `getDeckVersions` (add a `getDeckVersions` to `api/decks.ts` if missing, reading the `versions` subcollection). Use `ManaCost` for costs.
- [ ] **Step 4: BuilderView** — recreate the Scryfall search/detail panel + grouped decklist editing per the design, keeping `searchCards`/`createDeck`/`updateDeck` wiring and commander/format selection.
- [ ] **Step 5:** Build + `npx vitest run` (all green).
- [ ] **Step 6:** Manual: filters, stats, mana curve, version history, search→add→save. (Deferred.)
- [ ] **Step 7:** Commit, message "Match Deck Library + Builder to design (filters, stats, mana curve, versions)".

### Task 7: Games list → match `GameManagement.jsx`

**Files:** Modify `app/src/features/games/GamesView.tsx`. Reference `docs/design/project/screens/GameManagement.jsx`.

- [ ] **Step 1: Read `GameManagement.jsx`.**
- [ ] **Step 2:** Recreate the three **status row/card variants** — lobby (amber strip, invite code, "Open lobby" → `/lobby/:id`), live (green, turn count, "Resume" → `/games/:id`), complete (winner + life, "View summary" → `/games/:id/end`) — plus the count-tagged **filter tabs**. Wire to `useMyGames`. Keep "New game" → `/lobby/new`.
- [ ] **Step 3:** Build (exit 0).
- [ ] **Step 4:** Manual: each status renders its variant + routes correctly; filter tabs work. (Deferred.)
- [ ] **Step 5:** Commit, message "Match Games list to design: lobby/live/complete variants + filter tabs".

### Task 8: End-game + confirmation modals → match `EndGame.jsx` (needs Task 3 not required; uses endGame)

**Files:** Modify `app/src/features/game/endgame/EndGameView.tsx`. Create confirmation modal usage in `GameView` (wired in Task 9/13). Reference `docs/design/project/screens/EndGame.jsx`.

- [ ] **Step 1: Read `EndGame.jsx`.**
- [ ] **Step 2: EndGameView** — recreate: **mark-winner** flow, **winner spotlight** (trophy), **standings** table (players + life from `usePlayersPublic`), and actions **rematch** (→ `/lobby/new`), **archive**/**back to games**. Host marks winner → `endGame(gameId, winnerUid)`. Use `Avatar`.
- [ ] **Step 3:** Provide an exported `EndGameConfirm`/`LeaveGameConfirm` modal (or reuse `Modal`) that Task 9/13 wires into the gameplay topbar (end-game / leave-game confirmation). Define its props here so Task 9 can consume it.
- [ ] **Step 4:** Build (exit 0).
- [ ] **Step 5:** Manual: end a game → summary, mark winner, standings, rematch/archive/back. (Deferred.)
- [ ] **Step 6:** Commit, message "Match End-game screen to design: mark-winner, standings, rematch/archive".

### Task 9: ActiveGameplay layout shell → match `ActiveGameplay.jsx` (structure)

**Files:** Modify `app/src/features/game/GameView.tsx` and `components/{PlayerRibbon,OpponentsBar,Battlefield,Hand,SidePanel}.tsx`. Reference `docs/design/project/screens/ActiveGameplay.jsx`.

- [ ] **Step 1: Read `ActiveGameplay.jsx` fully** (the focal screen).
- [ ] **Step 2:** Recreate the **layout/chrome** to match the design: topbar (turn/phase, exit, phase controls, your-turn indicator, end/leave buttons that open the confirm modals from Task 8), **player ribbon** (all seats: life ±, hand/lib counts, active indicator, end-turn), **opponents** summarized board, **dual-lane battlefield** (creatures/spells lane + lands tuck-under lane), **hand** zone, **zone tabs** (graveyard/exile/library/command), and the **side panel** (log/notes) — all using the existing hooks (`useGame`/`usePlayersPublic`/`useMyPrivate`/`useLog`) and `useGameActions`. Keep the action routing (own→client, hidden/cross/shared→`gameAction`). Wire the existing buttons (draw/shuffle/life/phase/end-turn) into the new chrome. (Context menus, scry/token/zone modals, drag-drop come in Tasks 10–13.)
- [ ] **Step 3:** Build (exit 0).
- [ ] **Step 4:** Manual: board matches the design visually; existing actions (draw, tap via click for now, life, phase, end turn) still work live for two accounts. (Deferred.)
- [ ] **Step 5:** Commit, message "Match ActiveGameplay layout to design (ribbon, dual-lane battlefield, zones, side panel)".

### Task 10: Gameplay context menus (hand + battlefield)

**Files:** Create `app/src/features/game/useCardMenus.ts`. Modify `GameView.tsx`, `Battlefield.tsx`, `Hand.tsx`. Reference `ActiveGameplay.jsx` (its menu definitions).

- [ ] **Step 1:** Read the context-menu sections of `ActiveGameplay.jsx`.
- [ ] **Step 2:** Create `useCardMenus.ts` exporting builders that return `ContextMenu` item lists:
  - `handMenu(card)`: View card; Play to battlefield (`gameAction playFromHand`); Play tapped; To graveyard/exile (`gameAction moveToHand`? no — from hand to public zone is `playFromHand` with toZone); To library top/bottom (`gameAction moveToLibrary`); To command (commander).
  - `battlefieldMenu(card)`: View card; Tap/Untap (client `writePublicZones`); +1/+1, −1/−1, loyalty ±, custom counter (client `setCounters`/`writePublicZones`); move to hand (`gameAction moveToHand`)/graveyard/exile/library top·bottom/command; Remove (token).
  Each item calls the correct action per the §7 mapping in the spec. Use the existing `gameAction` types and client writers.
- [ ] **Step 3:** Wire `onContextMenu` on hand/battlefield cards to open `ContextMenu` (from Task 2) with these item lists.
- [ ] **Step 4:** Build (exit 0).
- [ ] **Step 5:** Manual: right-click hand/battlefield cards → menus; each action performs and syncs live; counts stay correct (hidden-zone moves go via gameAction). (Deferred.)
- [ ] **Step 6:** Commit, message "Add gameplay context menus (hand + battlefield) wired to actions".

### Task 11: Scry + Token modals

**Files:** Create `app/src/features/game/components/ScryModal.tsx`, `TokenModal.tsx`. Create `app/src/test/scry.test.ts`. Modify `GameView.tsx`. Reference `ActiveGameplay.jsx` (scry/token modals).

- [ ] **Step 1:** Read the scry + token modal sections of `ActiveGameplay.jsx`.
- [ ] **Step 2: TDD the scry-order assembly helper.** The `scry` gameAction takes `{ order: string[], toBottom: string[] }`. Add a pure `buildScryResult(topCards, decisions)` helper (in ScryModal.tsx or `lib/cards.ts`) and test it:

```ts
import { describe, it, expect } from "vitest";
import { buildScryResult } from "../features/game/components/ScryModal";
describe("buildScryResult", () => {
  it("splits into order(top) and toBottom by decision", () => {
    const top = [{ instanceId: "a" }, { instanceId: "b" }] as any;
    const r = buildScryResult(top, { a: "top", b: "bottom" });
    expect(r.order).toEqual(["a"]);
    expect(r.toBottom).toEqual(["b"]);
  });
});
```
Run vitest → fail → implement → pass.

- [ ] **Step 3: ScryModal** — prompt for N, show top N cards (real images via `CardFace`), top/bottom toggles per card + all-top/all-bottom, Confirm → `gameAction({ type:"scry", gameId, ...buildScryResult(...) })`. Match the design's scry modal.
- [ ] **Step 4: TokenModal** — presets + custom name/P-T/color/quantity → push token CardInstances to the caller's battlefield via client `writePublicZones` (tokens are own public-zone state). Match the design's token modal.
- [ ] **Step 5:** Wire the Scry/Token buttons (and `S`/`T` keys later) in `GameView` to open these modals.
- [ ] **Step 6:** Build + `npx vitest run` (green).
- [ ] **Step 7:** Manual: scry reorders correctly (no card loss — the server guard enforces it); tokens appear on your battlefield and opponents see them. (Deferred.)
- [ ] **Step 8:** Commit, message "Add Scry and Token modals wired to actions".

### Task 12: Zone drawers (graveyard / exile / library / command)

**Files:** Create `app/src/features/game/components/ZoneDrawer.tsx`. Modify `GameView.tsx`, `SidePanel.tsx`/zone tabs. Reference `ActiveGameplay.jsx` (zone drawer + library reference).

- [ ] **Step 1:** Read the zone-drawer/library-reference sections of `ActiveGameplay.jsx`.
- [ ] **Step 2: ZoneDrawer** — a modal/drawer per zone:
  - graveyard/exile/command: grid of cards (real images), click a card → context menu to move it (to battlefield/hand/library top·bottom) via the right action (own public-zone moves → client; to hand/library → `gameAction moveToHand`/`moveToLibrary`). Bulk: "All → battlefield", "All → hand", and graveyard "Shuffle into library" (`gameAction shuffleGraveyardIntoLibrary`).
  - library: the **library reference** grouped by type with remaining counts and a **tutor-to-hand** (`gameAction tutorToHand`) + shuffle (`gameAction shuffleLibrary`).
  Match the design.
- [ ] **Step 3:** Wire the zone tabs in `GameView` to open the drawer for the chosen zone.
- [ ] **Step 4:** Build (exit 0).
- [ ] **Step 5:** Manual: open each zone; move cards; tutor; shuffle; bulk moves; counts stay consistent. (Deferred.)
- [ ] **Step 6:** Commit, message "Add zone drawers (graveyard/exile/library/command) with tutor + bulk moves".

### Task 13: Drag-drop, card detail, hover preview, keyboard shortcuts

**Files:** Create `app/src/features/game/components/CardDetailModal.tsx`, `HoverPreview.tsx`. Modify `GameView.tsx`, `Battlefield.tsx`, `Hand.tsx`. Reference `ActiveGameplay.jsx`.

- [ ] **Step 1:** Read the drag-drop, card-detail, hover, and keyboard sections of `ActiveGameplay.jsx`.
- [ ] **Step 2: Drag-drop** — make cards draggable; drop targets = battlefield (creatures/lands) and hand. On drop, route the move: within own public zones → client `writePublicZones`/`moveWithinPublicZones`; into/out of hand or library → the corresponding `gameAction` (so hidden-zone moves and counts stay correct). Use the `.drop-target` style.
- [ ] **Step 3: CardDetailModal** — click a card → large image (flip for double-faced via `imageUriBack`), name, mana cost (`ManaCost`), type, P/T. Match the design.
- [ ] **Step 4: HoverPreview** — floating card image on card `mouseenter` (pointer-events:none), positioned near the cursor/anchor, hidden on leave.
- [ ] **Step 5: Keyboard shortcuts** — N (end turn), L (toggle log), S (scry), T (token), D (draw), Esc (close modal/menu); ignore when typing in inputs/textareas. Register/cleanup on mount/unmount.
- [ ] **Step 6:** Build (exit 0).
- [ ] **Step 7:** Manual: drag between zones; click→detail (+flip); hover→preview; shortcuts work and don't fire while typing. (Deferred.)
- [ ] **Step 8:** Commit, message "Add drag-drop, card detail modal, hover preview, keyboard shortcuts".

---

## Final self-check (after all tasks)

- [ ] `cd app && npm run build` clean; `cd app && npx vitest run` green.
- [ ] `npm run test:rules` and `npm run test:functions` green.
- [ ] Every screen visually matches its `docs/design/project/screens/*.jsx` (desktop).
- [ ] Two-account playtest: full gameplay parity — context menus, scry, token, zone drawers, drag-drop, counters, card detail/hover, keyboard — all work and sync; hidden info holds; counts stay consistent.
- [ ] No regressions in auth/decks/lobby/games/end/settings.

## Notes for the implementer

- The design `.jsx` files are **the** visual spec — read the relevant one before each screen task; match visual output, not the prototype's mock state.
- Don't merge to `main` (production deploy is the user's call). Push to the branch for previews; manually deploy rules/functions to validate backend on the preview.
- Keep the action-routing rule sacred: own low-stakes fields → client writers; hidden-info/cross-player/shared → `gameAction`. This is what keeps multiplayer counts consistent and hidden info safe.
- Deferred (not in this plan): password reset, presence/disconnect, stale-lobby cleanup, mobile breakpoints.
