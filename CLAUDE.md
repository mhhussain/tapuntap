# tapuntap — Architecture & Design

## Overview

A multiplayer Magic: The Gathering game simulator. Up to 4 players join a game by invite code and play in real time. The frontend is a React + TypeScript + Vite SPA (`app/`) served by Firebase Hosting. State is stored in Firestore and synced live via `onSnapshot`. Authentication uses Firebase Auth with Google sign-in and email/password.

## Versioning

Every PR merged to `main` MUST bump the version in `app/package.json` (the only version source of truth — the root `package.json` version is not used). The bump is surfaced to users in the landing-page footer (`app/vite.config.ts` injects it as `__APP_VERSION__`, mirrored in `vitest.config.ts` so tests resolve the global).

Before merging any PR, the agent must **confirm the bump level with the user** (patch / minor / major) rather than deciding unilaterally, then apply it to `app/package.json`.

## Running the App

```bash
# Terminal 1 — backend emulators
firebase emulators:start --only firestore,auth,functions

# Terminal 2 — frontend dev server (Vite)
cd app && npm run dev

# Rules + functions tests
npm run test:rules
firebase emulators:exec --only firestore,functions "node --test functions/test"

# Frontend unit tests
cd app && npm test

# Production build (what Hosting serves)
npm run build:app
```

## Architecture

```
Browser (React + TypeScript + Vite SPA, built to app/dist)
  • Firebase Auth (Google + email/password)
  • Firestore SDK: reads via typed onSnapshot hooks, client writes own low-stakes fields
  • Scryfall fetched directly from browser for card search/lookup
        │                               │
        │ realtime listeners            │ callable
        ▼                               ▼
Firestore                         Cloud Functions (6)
  users, decks, games               createGame, joinGame, startGame
  + security rules                  gameAction, leaveGame, endGame
```

No Express server. Firebase Hosting serves the built `app/dist` output.

### Client-vs-server action split

The client writes its own **low-stakes** player fields directly (tap/untap, counter adjustments, own life, own public-zone moves, notes). Hidden-info operations, cross-player state changes, and shared/turn advancement all go through Cloud Functions:

- **`gameAction`** — draw, mill, scry, shuffle library, play/move cards to/from hand, adjust opponent life, advance phase, end turn
- **`leaveGame`** — removes the caller from a lobby seat
- **`endGame`** — marks the game complete; host-only

Security rules deny direct client writes to any field owned by the server (hand/library counts, turn/phase, turnOrder).

## Frontend (`app/src/`)

React 18 + TypeScript 5 SPA built with Vite 5. Uses npm Firebase SDK (`firebase@^10.12.0`).

```
lib/
  firebase.ts          — typed SDK init + emulator toggle (localhost auto-connects)
  firebaseConfig.ts    — public web config values
  scryfall.ts          — Scryfall client + optional Firestore cache
  format.ts            — pure helpers (time, mana, color tone)
  cards.ts             — card-instance helpers (isLand, shuffle, newInstanceId)
types/
  index.ts             — CardInstance, Deck, GameDoc, Seat, PlayerPublic, PlayerPrivate, LogEntry, GameAction
auth/
  AuthProvider.tsx     — context: user, loading, sign-in/up/out
  useAuth.ts           — hook
  AuthScreen.tsx       — login + sign-up (Google + email)
  RequireAuth.tsx      — route guard
api/
  decks.ts             — typed deck CRUD
  games.ts             — typed game reads + callable wrappers
  hooks.ts             — useGame, usePlayersPublic, useMyPrivate, useLog, useMyDecks, useMyGames
components/
  Modal.tsx  Toast.tsx  Icon.tsx  CardFace.tsx  AppShell.tsx
features/
  home/HomeView.tsx
  decks/DecksView.tsx  decks/BuilderView.tsx
  games/GamesView.tsx
  lobby/LobbyNewView.tsx  lobby/LobbyView.tsx
  game/GameView.tsx
  game/useGameActions.ts  — client-direct writes + callable gameAction wrappers
  game/endgame/EndGameView.tsx
  playtest/                — local solo playtest mode (see below)
  settings/SettingsView.tsx
test/
  setup.ts
  cards.test.ts  format.test.ts  gameActionClient.test.ts
```

## Data Model (Firestore)

See `docs/superpowers/specs/2026-05-29-firebase-multiplayer-design.md` for full schema.

Key structure:
- `users/{uid}` — profile
- `users/{uid}/decks/{deckId}` — deck (+ `versions/{n}` subcollection)
- `games/{gameId}` — shared game state (seats, turn, phase, seatUids)
- `games/{gameId}/players/{uid}` — PUBLIC player doc (battlefield, life, handCount, libraryCount)
- `games/{gameId}/players/{uid}/private/state` — PRIVATE (hand[], library[]) — only readable by {uid}
- `games/{gameId}/log/{entryId}` — append-only game log

## Security Rules

`firestore.rules` is the only enforcement layer. Key rules:
- Users/decks: owner-only read/write
- Cards: any authenticated user can read/write (shared Scryfall cache)
- Games: participants can read; turn/phase fields are server-owned (direct client writes denied)
- Player public docs: any participant reads; only the owner writes own-zone fields
- Player private docs: only the owner reads AND writes — opponents can never see hand/library
- hand/library counts are server-owned; clients cannot forge them directly

## Cloud Functions (`functions/index.js`)

Six callable functions handle operations needing trust or hidden-info atomicity:
- `createGame(name, format, deckId)` — creates lobby, generates invite code
- `joinGame(inviteCode, deckId)` — seats caller atomically (transaction prevents race)
- `startGame(gameId)` — host-only; server-side Fisher-Yates shuffle; writes all private docs via Admin SDK
- `gameAction(action)` — dispatches typed actions (draw, mill, scry, shuffleLibrary, play, moveToHand/Library, adjustOpponentLife, advancePhase, endTurn)
- `leaveGame(gameId)` — removes the caller from a lobby seat
- `endGame(gameId)` — host-only; marks the game complete

## Playtest (local)

`app/src/features/playtest/` is a local-only module that replicates the game UI for solo deck testing — it has no Firestore/Functions surface. One signed-in user controls 2-4 seats via a seat switcher, playing all seats themselves to test a deck or a matchup. The engine (`engine/actions.ts`, `engine/deal.ts`) is a client-side TypeScript port of the server's `functions/lib/actions.js` and `functions/lib/deal.js`, so action semantics (draw, mill, scry, shuffle, play, etc.) mirror multiplayer games exactly. Sessions persist in browser `localStorage` under `tapuntap.playtest.*` keys instead of Firestore documents.

## Card Data

Cards are fetched directly from Scryfall in the browser. An optional shared `cards/{scryfallId}` Firestore cache reduces repeat lookups.

## No Automated Rules

The simulator enforces no Magic rules. It is a tracking and visualization layer only. No legal move validation, no automatic triggers, no mana enforcement.

## Deck Migration

To import existing `data/decks/*.json` into Firestore:
```bash
TARGET_UID=<uid> FIRESTORE_EMULATOR_HOST=localhost:8080 GCLOUD_PROJECT=tapuntap \
node scripts/migrate-decks.mjs
```

## Live Deployment

1. Confirm real values in `app/src/lib/firebaseConfig.ts` (copied from Firebase console)
2. Ensure Google Auth and email/password sign-in are enabled in Firebase Auth
3. Run: `firebase deploy --only firestore:rules,firestore:indexes,functions,hosting`
