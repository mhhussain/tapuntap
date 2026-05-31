# tapuntap — Public-Facing Rewrite & Hardening

**Status:** Design — pending user review
**Date:** 2026-05-31
**Author:** Brainstormed with Claude
**Supersedes (frontend only):** parts of `2026-05-29-firebase-multiplayer-design.md`. The Firebase **backend** architecture from that doc stands; this doc changes the **frontend** and tightens the **action/authorization model**.

---

## 1. Summary

tapuntap shipped as a multiplayer Firebase app, but the multiplayer dimension was retrofitted onto a frontend originally built for single-user, local use. The backend (Auth, Firestore + `onSnapshot`, security rules, callable Functions) is sound and was designed for multiplayer. The **frontend** is the liability: a 51 KB untyped `game.js`, hand-rolled hash routing, string-template rendering, no UI test surface, and several real bugs from the single-user → multiplayer schema drift.

This project takes tapuntap from "works for my playgroup" to a **public, production, long-term-maintainable** application by:

1. **Rewriting the frontend** to **React + TypeScript + Vite** (static SPA → Firebase Hosting; the per-push preview-channel workflow is preserved).
2. **Shifting game-managing and permission-sensitive actions server-side** (Cloud Functions + rules), keeping presentation and own-low-stakes-state in the client.
3. **Fixing the audited bugs** — most critically a security-rules regression that breaks opponent reads.
4. **Designing the screens the original never properly designed** — login/sign-up, lobby, end-game — via the existing Claude Design session (prompt in §10).

The simulator still enforces **no Magic rules**. The new server-side logic is about **integrity and authorization** (who may do what, hidden-information safety), not rules automation.

### Goals
- React + TypeScript + Vite SPA; typed domain models; decomposed game view.
- Server-managed actions for hidden-info / cross-player / shared state.
- Correct, tested security rules; rules/functions tests restored in CI.
- Complete auth: Google + email sign-up & sign-in.
- Proper login, lobby, and end-game screens.
- Incremental delivery: every step independently shippable and testable on the preview URL.

### Non-goals
- No automated rules engine, triggers, priority, or mana enforcement (unchanged).
- No spectators, no in-progress-game migration.
- Password reset (deferred), presence/disconnect indicators (later), deck sharing (later).
- No change to the Firestore data model beyond the additions in §5.

---

## 2. Target architecture

```
Browser (React + TypeScript SPA, built by Vite → static)
  • Firebase Auth (Google + email/password)
  • Firestore SDK: typed onSnapshot hooks (read), direct writes for own low-stakes state
  • Callable Cloud Functions for game-managing / permission-sensitive actions
  • Scryfall fetched directly for card search/lookup
        │ realtime listeners        │ callable
        ▼                           ▼
Firestore (users, decks, cards, games + rules)   Cloud Functions
                                                  createGame, joinGame, startGame,
                                                  + gameAction, leaveGame, endGame
Firebase Hosting serves the built static SPA. Scryfall CDN serves images.
```

### Frontend project shape (Vite)
```
src/
  main.tsx                  app bootstrap + router
  lib/firebase.ts           typed init + emulator toggle
  lib/scryfall.ts           card search/lookup (+ optional cache)
  types/                    CardInstance, GameDoc, Seat, PlayerPublic, PlayerPrivate, Deck
  auth/                     AuthProvider, useAuth, sign-in/up screens, route guard
  api/                      typed Firestore reads (onSnapshot hooks) + callable wrappers
  features/
    decks/                  library + builder
    lobby/                  create / join / seats / ready / start / leave
    game/                   board, hand, zones, opponents, log, actions hooks
    home/  settings/
  components/               shared UI (modal, toast, card, context-menu)
```

`game.js` (one 51 KB file) becomes typed hooks (`useGame`, `useMyPrivate`, `usePlayersPublic`, `useLog`) plus focused feature components, each understandable and testable in isolation.

### Build & hosting
Vite builds to static assets; `firebase.json` `hosting.public` points at the build output (`dist`). No SSR. The existing GitHub preview/deploy workflows keep working (with the build step added).

---

## 3. Client vs. server action split (the core authorization shift)

The original design had clients write all gameplay directly, with rules as the only guard. The rewrite moves game-managing and permission-sensitive actions into Functions. Rules then **deny** direct client writes to the server-owned fields.

| Action | Where | Rationale |
|---|---|---|
| Tap/untap own permanent | **Client** | Own, low-stakes, visible |
| Counters on own permanent | **Client** | Own, low-stakes |
| Own life / poison / energy | **Client** | Own state |
| Notes, UI/panel state | **Client** | Cosmetic |
| Move card between **own** public zones (battlefield/GY/exile/command) | **Client** | Own, all-public, no hidden info |
| Draw / mill / scry / shuffle | **Function** | Library order is hidden info; integrity matters |
| Move card **into/out of hand or library** | **Function** | Touches hidden zones + counts |
| Affect **another player** (damage, life, mill, move a card to their zone) | **Function** | Cross-player authority |
| Advance turn / phase | **Function** | Shared state; currently rules-gated, becomes a Function for consistency |
| `leaveGame`, `endGame` | **Function** (new) | Seat/lifecycle management |

A single `gameAction` callable (discriminated-union payload) is preferred over many tiny callables, to keep the surface small. It validates the caller's seat, turn/permission constraints, and writes via the Admin SDK in a transaction/batch where needed.

**Simplicity guard:** this is not a rules engine. Functions validate *authorization and hidden-info safety*, not legality of Magic plays.

---

## 4. Bugs to fix (from the screen-by-screen audit)

**Critical**
- **Rules regression:** `isParticipant()` reads `resource.data.seatUids`, absent on `players/*`, `private/*`, `log/*` subcollection docs → opponent/log reads fail. Restore a `get()` on the parent game doc. Re-add rules tests to CI.

**Routing / schema drift**
- Home "New game" → `/games/new` (nonexistent route). Fix to lobby flow.
- Home & Games list render `g.players` (pre-multiplayer shape); game docs have `seats[]` and life lives in `players/{uid}`. Rebuild list cards from the real schema.
- Games list doesn't distinguish `lobby` vs `active`; "Resume" on a lobby opens the hanging gameplay view. Route lobby → lobby screen, active → game.

**Functions / lifecycle**
- `startGame` crashes if a seated player deleted their deck after joining; guard for missing deck.
- `complete` status is never set; no end-game flow → invite codes never freed. Add `endGame` + a `leaveGame`.
- Don't trust client-supplied `displayName`; derive from the user record / auth token.

**Gameplay**
- No way to affect opponents (life/damage/mill) — resolved by the `gameAction` cross-player path (§3).
- `endTurn` untap timing (untaps the ending player rather than the player whose turn begins) — correct to untap the new active player at turn start (still manual-friendly).
- Log entries: unify shape (`ts` server timestamp, `who`, `turn`) across Function-written and client-written entries.
- Disable turn/phase controls for non-active players instead of failing on write.
- Implement or remove the Undo stub (remove for launch unless cheap).

**Auth / login**
- Add email **sign-up** + sign-in (Google already present); password reset deferred.
- Remove the app-shell flash before `onAuth` resolves (render gate, not overlay-on-top).
- Surface signed-in identity (avatar/name) in the app chrome.

**Lobby**
- Real design (see §10); wire the `ready` flag; format selection; zero-decks empty state; leave/cancel; copy invite link.

**Settings**
- Remove stale "data/cards on the server" copy; persist density / summoning-sickness preferences (localStorage or user doc).

**Decks**
- `updateDeck` returns a stale `versions` field; clean up the return shape under typed models.

---

## 5. Data model additions

No breaking changes. Additions:
- `games/{id}.status` gains a real **`complete`** transition (set by `endGame`); invite-code uniqueness check already keys off `lobby`/`active`, so completed games free their code.
- Server-owned game fields (turn/phase, and any cross-player-written player fields) are written only by Functions; rules deny direct client writes to them.
- Optional: per-user preferences on `users/{uid}` (density, summoning-sickness) if not using localStorage.

Card instance shape, deck/version subcollections, and the public/private player split are unchanged.

---

## 6. Security rules (intended end state)
- `users`, `decks`, `cards`: unchanged (owner-only; cards authed read/write).
- `games/{id}`: read if participant (via `get()` on the game doc) or `status == 'lobby'`. Direct client `update` denied for server-owned fields (turn/phase) — those go through Functions. Notes remain a client-writable field.
- `games/{id}/players/{uid}` (public): participant read; owner may write **only** the client-owned low-stakes fields (§3); server-owned/cross-player fields denied to clients.
- `games/{id}/players/{uid}/private/**`: owner read/write only.
- `games/{id}/log/**`: participant create; Functions also write; no update/delete.
- **Helper:** `isParticipant()` must `get()` the parent game doc's `seatUids` so it works in subcollections.
- Rules tests (emulator + `@firebase/rules-unit-testing`) restored and run in CI.

---

## 7. Auth scope
- Providers: **Google** + **email/password (sign-up & sign-in)**.
- **Password reset deferred** (tracked for later).
- Auth gate is a render gate (no app-shell flash). Signed-in identity shown in app chrome with sign-out.

---

## 8. Deployment & testing strategy (rewrite phase)
- **Preview (PR):** deploys the built **frontend** to a Firebase Hosting preview channel, against the **live** backend.
- **Backend (rules/functions) during the rewrite:** validated by the **Firebase emulator + automated tests locally/CI**, and the user **manually deploys** rules/functions to test a PR against its preview URL when needed.
- **Future:** rely on emulator + CI for backend changes; reduce manual live deploys.
- Restore rules + functions tests in CI (emulator-based) as part of this work.
- `main` continues to deploy everything live on merge.

(Recorded in agent memory so it persists across sessions.)

---

## 9. Incremental delivery strategy

The rewrite proceeds as a **parallel build** under `src/` while the current `public/` app keeps serving, with **cutover at the end** — but every step is still shippable and previewable:

1. **Scaffold** Vite + React + TS; build wired into `firebase.json`/CI; emulator toggle; typed `firebase.ts`. Preview shows a minimal authed shell.
2. **Auth** (Google + email sign-up/sign-in) + route guard + identity chrome.
3. **Decks** (library + builder) on typed Firestore API.
4. **Lobby** (create/join/ready/start/leave) — new design.
5. **Rules fix + tests** restored (deploy manually to validate).
6. **Server action split**: `gameAction`, `leaveGame`, `endGame`; rules tightened.
7. **Gameplay** rewrite (board/hand/zones/opponents/log) over typed hooks.
8. **Home/Games list/Settings** corrected to the real schema; preferences persisted.
9. **Cutover**: point hosting at `dist`; retire `public/` vanilla app; update CLAUDE.md.

Each step is a small PR (or push to the feature branch), validated on the preview URL (frontend) plus emulator/manual deploy (backend) before the next.

---

## 10. Claude Design prompt (undesigned screens)

Provide the following to the existing Claude Design session. It targets the screens the original app never properly designed: **login/sign-up, lobby, end-game**, plus the **games-list lobby/active distinction**.

> **Project:** tapuntap — a multiplayer Magic: The Gathering game-tracking simulator (not a rules engine; it tracks and visualizes game state). Up to 4 players join by invite code and play in real time. It's moving from personal use to a public, production app. The existing visual language is a dark, dense, "pro tool" aesthetic (compact cards, monospace metadata, oklch color tokens, a left icon rail). Keep that language. Design the following screens/states that were never properly designed:
>
> 1. **Auth / Login & Sign-up.** A focused, centered auth screen. Primary: "Continue with Google." Secondary: email + password with a **toggle between Sign in and Sign up** (no password reset yet — leave room for a "Forgot password?" link to add later). Show validation/error states (invalid credentials, email already in use, weak password). It should feel like the front door of a polished product, consistent with the dark dense theme. Include the empty/loading state shown before auth resolves (no flash of the app behind it).
>
> 2. **Lobby.** Two entry actions — **Create a game** (name, format selector: Commander/Standard/etc., your deck picker) and **Join by invite code** (code input + deck picker). Then the **seat list** (up to 4): each seat shows player name/avatar, chosen deck, and a **ready toggle**; the host sees a **Start** button (enabled only when ≥2 seats and all ready). Include: prominent **invite code with copy-link**, a **leave/cancel** action, host **remove-player** affordance, and the **zero-decks empty state** ("build a deck first"). Show waiting vs ready states clearly.
>
> 3. **End-game.** A summary/confirmation when a game ends: final standings (players, life), who won (manually marked), and actions: **rematch** (new lobby with same players), **back to games**, **archive**. Plus the confirmation flow for ending/leaving an in-progress game.
>
> 4. **Games list — lobby vs active.** The list must visually distinguish **lobby** (waiting, shows invite code, "Open lobby") from **active** (in progress, "Resume") from **complete** (archived, "View summary"). Design the card/list-row variants for each status.
>
> Deliver layouts for desktop first (this is a desktop-oriented tool), with notes on how each collapses on smaller screens. Keep interactions consistent with the existing rail + topbar + modal/context-menu patterns.

---

## 11. Open considerations (non-blocking)
- Presence/disconnect indicators (later).
- Password reset (later).
- Stale-lobby cleanup / scheduled cleanup (later; `endGame` covers the manual path now).
- Cost: `onSnapshot` + `gameAction` volume; acceptable at playgroup scale.
