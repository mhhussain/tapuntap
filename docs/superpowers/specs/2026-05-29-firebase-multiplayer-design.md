# tapuntap — Firebase Multiplayer Rework

**Status:** Approved design — ready for implementation planning
**Date:** 2026-05-29
**Author:** Brainstormed with Claude

---

## 1. Summary

Rework the tapuntap from a single-user, local-first Node/Express app into a
multi-user, real-time application backed entirely by Firebase. Authenticated users
can build decks, create or join a game lobby by invite code, and play together —
up to four players in one live game — with state synchronized through Firestore.

The simulator continues to enforce **no Magic rules**. It remains a tracking and
visualization layer; the only new enforcement is *authorization* (who may read/write
what), handled by Firestore security rules.

### Goals

- Google sign-in; per-user accounts.
- Decks, cards, and game state stored in Firestore.
- Up to four players in one real-time game.
- Hidden information: a player's hand and library order are private to that player;
  opponents see only counts.
- Lobby flow: create a game, share an invite code, others join and pick decks.
- Minimal Cloud Functions — only for operations that must be trusted or atomic.
- Preserve the existing no-build-step, vanilla-JS frontend approach.

### Non-goals

- No automated rules engine, triggers, priority, or mana enforcement (unchanged).
- No spectators (YAGNI; can be added later).
- No migration of in-progress games (decks only).
- No deck sharing between users in this version (decks are private).

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (vanilla JS SPA, no build step)                 │
│   • Firebase Auth (Google)                               │
│   • Firestore SDK: reads via onSnapshot, writes own data │
│   • Scryfall fetched directly for card search/lookup     │
└───────────────┬─────────────────────────┬───────────────┘
                │ realtime listeners       │ callable
                ▼                          ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│  Firestore               │   │  Cloud Functions (few)   │
│   users, decks, games    │   │   createGame, joinGame,  │
│   + security rules       │   │   startGame (deal/shuffle)│
└──────────────────────────┘   └──────────────────────────┘
        ▲                                  │ Admin SDK writes
        └──────────────────────────────────┘
Firebase Hosting serves the static frontend.  Scryfall CDN serves images.
```

### Key architectural decisions

| Decision | Choice | Rationale |
|---|---|---|
| State sync | Client writes + Firestore `onSnapshot` listeners | Lowest latency, simplest, matches "no automated rules" philosophy. Clients own their own state. |
| Write authority | Clients write only their own slice; rules enforce | Concurrent 4-player writes never clobber each other. |
| Hidden info | Public/private player-doc split | Opponents read public zones + counts only; private hand/library denied by rules. |
| Auth | Firebase Auth, Google provider | One-click, real display name + avatar, no password handling. |
| Card data | Client → Scryfall directly (CORS), optional Firestore cache | Scryfall allows browser requests; no server hop needed. |
| Game start | Cloud Function (`startGame`) | Fair server-side shuffle; only Admin SDK can create other players' private docs. |
| Lobby/join | Shareable invite code | No friends system needed; simple for a playgroup. |
| Hosting | Firebase Hosting, static frontend, no build step | Express is removed entirely; Firebase SDK imported as ESM from CDN. |
| Migration | Decks only | Game schema changes too much to migrate in-progress games. |

The single-user `server.js` (Express) is **removed**. There is no role left for it:
card lookups go directly to Scryfall, and all CRUD goes through the Firestore SDK and
the three Cloud Functions.

---

## 3. Data model (Firestore)

```
users/{uid}
  { displayName, photoURL, email, createdAt }

users/{uid}/decks/{deckId}
  { ownerUid, name, format, commander, cards[], version, createdAt, updatedAt }

users/{uid}/decks/{deckId}/versions/{n}          ← moved out of the deck doc
  { version, timestamp, changelog, cards[] }       (avoids the 1 MB doc limit)

cards/{scryfallId}                                ← optional shared cache of card JSON
  { ...scryfall card fields..., cachedAt }

games/{gameId}                                    ← shared; readable by participants
  { name,
    status: 'lobby' | 'active' | 'complete',
    hostUid,
    inviteCode,                                   ← short, unique while lobby/active
    format,
    seats: [ { seat, uid, displayName, deckId, deckName, ready } ],
    turnOrder: [uid, ...],
    turn, activeSeat, phase, phaseIndex, phases,
    createdAt, updatedAt }

games/{gameId}/log/{entryId}                      ← subcollection, ordered by ts
  { ts, seat, text }

games/{gameId}/players/{uid}                      ← PUBLIC: any participant may read
  { seat, displayName, life, poison, energy, counters,
    battlefield[], graveyard[], exile[], command[],
    handCount, libraryCount }

games/{gameId}/players/{uid}/private/state        ← PRIVATE: only {uid} may read/write
  { hand[], library[] }
```

### Card instance shape (unchanged from today)

Each card in play is an independent object with its own `instanceId`:

```json
{
  "instanceId": "uuid",
  "cardId": "scryfall-uuid",
  "name": "Island",
  "manaCost": "", "cmc": 0,
  "typeLine": "Basic Land — Island",
  "colors": [], "imageUri": "https://...", "imageUriBack": null,
  "power": null, "toughness": null, "loyalty": null,
  "tapped": false, "transformed": false, "faceDown": false,
  "counters": {}, "attachedTo": null, "token": false
}
```

### Hidden-zone mechanics

The public/private split is the core of hidden information:

- A player's **public** doc holds everything opponents are allowed to see:
  battlefield, graveyard, exile, command zone, life/poison/energy, and the
  **counts** `handCount` and `libraryCount`.
- A player's **private** doc (`private/state`) holds the actual `hand[]` cards and
  the ordered `library[]`. Security rules deny reads to anyone but the owner.
- When a player mutates a private zone (draw, scry, shuffle, play from hand), their
  client performs a **batched write** updating both the private `state` and the
  derived counts in their public doc, keeping them consistent.

### Deck versioning

Append-only, unchanged in spirit. The current embedded `versions[]` array moves to a
`versions/{n}` subcollection so a deck with many saved versions never approaches the
Firestore 1 MB document limit. Each PUT bumps `version` on the deck doc and adds a new
version subcollection document with the full card snapshot. Old versions are read-only.

---

## 4. Security rules

Rules are the **only** enforcement layer and must be treated as a first-class
deliverable, not an afterthought.

- `users/{uid}`: read/write only by `{uid}`.
- `users/{uid}/decks/**`: read/write only by `{uid}` (decks are private).
- `cards/**`: read by any authenticated user; write by any authenticated user
  (client-populated cache; values are public Scryfall data).
- `games/{id}`:
  - **read** if the requester is a seat participant **or** `status == 'lobby'`
    (so an invitee can look the game up by code before joining).
  - **write** to shared turn/phase fields (`turn`, `activeSeat`, `phase`,
    `phaseIndex`) only by the current active player. `seats` is written by the
    `createGame`/`joinGame`/`startGame` Functions, not directly by clients (except
    toggling one's own `ready` flag in the lobby).
- `games/{id}/log/**`: create by any participant; no update/delete.
- `games/{id}/players/{uid}` (public): read by any participant of that game;
  **write only by `{uid}`**.
- `games/{id}/players/{uid}/private/**`: read and write **only by `{uid}`**.
  The `startGame` Function uses the Admin SDK and bypasses rules to create every
  player's private doc at deal time — which is precisely why dealing must be a
  Function and not a host-client write.

---

## 5. Cloud Functions (callable, minimal)

Only three operations need server trust or atomicity. Everything else is a direct
client write.

- **`createGame(name, format, deckId)`**
  Creates a `lobby` game, generates a unique `inviteCode` (retry on collision),
  seats the host (`seat 0`), and returns the game id.

- **`joinGame(inviteCode, deckId)`**
  Atomically seats the caller if the game is in `lobby`, not full (< 4 seats), and
  the caller isn't already seated. Keeps array-mutation validation out of security
  rules and avoids join races.

- **`startGame(gameId)`**
  Host-only. Loads each seat's chosen deck snapshot, builds and **shuffles**
  (Fisher–Yates) each library server-side, writes every player's public and private
  docs in a transaction/batch, sets `turnOrder`, `activeSeat`, and flips `status` to
  `active`.

**Client-side (no Function):** drawing, tapping, moving cards between zones, life /
counter changes, creating tokens, scry, and advancing phase/turn. Any seated player
may mutate their own zones at any time (so instants/mana on another player's turn work
naturally); only shared turn/phase **advancement** is gated to the active player by
rules.

Optional later: `leaveGame`, `endGame`/cleanup, scheduled stale-lobby cleanup.

---

## 6. Frontend changes

The frontend stays vanilla ES modules with no build step. The Firebase SDK is imported
as ESM from the CDN.

### New

- `public/js/firebase.js` — Firebase app init, Auth helpers, Firestore handle.
- **Login gate** — unauthenticated users see a Google sign-in screen; the router is
  guarded so all app routes require auth.
- **Lobby view** (`public/js/views/lobby.js`) — create game / join by code, seat list
  with deck picker and ready-up, host "Start" button (calls `startGame`).
- Firestore security rules file (`firestore.rules`), indexes, and `firebase.json` /
  `functions/` project scaffolding.

### Rewritten

- `public/js/api.js` → Firestore SDK calls and `onSnapshot` subscriptions, replacing
  the `fetch('/api/...')` wrapper. Exposes deck CRUD, game lobby actions (wrapping the
  callable Functions), and subscription helpers.
- `public/js/views/game.js` (largest change) — replace the single module-level `G`
  object plus debounced full-document PUT with live subscriptions:
  - the shared game doc,
  - all players' **public** docs,
  - the local user's **private** doc,
  - the log subcollection.

  "You" are always your own seat (`auth.uid`); opponents render from their public docs
  only. Local actions write only the user's own docs. The old `activePlayer` view-toggle
  is replaced by a fixed self-seat plus an opponents bar.
- `public/js/views/builder.js` and `public/js/views/decks.js` — read/write Firestore
  user decks instead of `/api/decks`.

### Removed

- `server.js` (Express) and the `/api` HTTP client paths.

---

## 7. Migration

A one-time script imports existing `data/decks/*.json` into Firestore under the
running user's account:

```
data/decks/*.json  →  users/{uid}/decks/{deckId}
                       (+ versions/{n} subcollection from the embedded versions[])
data/games/*.json  →  left as-is on disk (archived; not migrated)
```

The script is run once by the developer after auth is in place (Phase 1). It maps each
deck's embedded `versions[]` into the new `versions/{n}` subcollection and stamps
`ownerUid`.

---

## 8. Implementation phasing

Each phase is independently shippable and leaves the app in a working state.

0. **Foundation** — Firebase project, Hosting, Auth gate (Google sign-in), `users`
   collection, base security rules, `firebase.json` + `functions/` scaffold.
1. **Decks on Firestore** — port `builder.js` / `decks.js` to Firestore; deck
   versioning via subcollection; one-time deck migration script. *(Usable immediately,
   single-user.)*
2. **Card data** — client-direct Scryfall search/lookup; optional shared `cards` cache.
3. **Lobby** — `createGame` / `joinGame` Functions; lobby view with seats, deck
   picker, ready-up, invite code.
4. **Game start** — `startGame` Function (deal/shuffle); game-doc + player public/
   private structure; full security rules for games.
5. **Realtime gameplay** — port `game.js` to Firestore listeners + per-player writes;
   hidden zones with count maintenance; log subcollection.
6. **Polish** — presence/disconnect indicator, end-game/cleanup, stale-lobby cleanup.

---

## 9. Open considerations (non-blocking)

- **Presence/disconnect:** a "player online" indicator is deferred to Phase 6; can use
  Firestore heartbeats or Realtime Database presence.
- **Invite code lifetime:** codes are unique while a game is `lobby`/`active`; reuse
  after `complete` is acceptable.
- **Cost:** `onSnapshot` read volume scales with players × mutations; acceptable for a
  small playgroup. The optional `cards` cache reduces repeat Scryfall traffic only, not
  Firestore reads.
