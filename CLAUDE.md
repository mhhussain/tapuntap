# tapuntap — Architecture & Design

## Overview

A multiplayer Magic: The Gathering game simulator. Up to 4 players join a game by invite code and play in real time. The frontend is a vanilla JS SPA served by Firebase Hosting. State is stored in Firestore and synced live via `onSnapshot`. Authentication uses Firebase Auth with Google sign-in.

## Running the App

```bash
# Start all emulators (Auth 9099, Firestore 8080, Functions 5001, Hosting 5000)
npm run emulators

# Run security rules tests
npm run test:rules

# Run Cloud Functions tests (against emulator)
firebase emulators:exec --only firestore,functions "node --test functions/test"
```

Open http://localhost:5000 against the emulators.

## Architecture

```
Browser (vanilla JS SPA, no build step)
  • Firebase Auth (Google)
  • Firestore SDK: reads via onSnapshot, writes own player data
  • Scryfall fetched directly from browser for card search/lookup
        │                          │
        │ realtime listeners       │ callable
        ▼                          ▼
Firestore                    Cloud Functions (3)
  users, decks, games          createGame, joinGame, startGame
  + security rules
```

No Express server. Firebase Hosting serves the static frontend.

## Frontend (`public/js/`)

Hash-based SPA with no build step. Uses ES modules from the Firebase CDN (`https://www.gstatic.com/firebasejs/10.12.0/...`).

```
firebase-config.js   — web app config (fill in before live deploy)
firebase.js          — Firebase init + emulator toggle (localhost auto-connects)
auth.js              — Google sign-in, onAuth, ensureUserDoc
cards.js             — Scryfall client + optional Firestore cache
api.js               — Firestore CRUD + onSnapshot subscriptions for all data
app.js               — router + auth gate (booted flag, onAuth guard)
views/
  home.js            — dashboard
  decks.js           — deck library
  builder.js         — deck builder (Scryfall search → Firestore save)
  games.js           — game list (Firestore query)
  lobby.js           — create/join lobby, seat list, start
  game.js            — realtime game board (4 subscriptions + per-player writes)
  settings.js        — settings
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
- Games: participants can read; only the active player can advance turn/phase fields
- Player public docs: any participant reads; only the owner writes
- Player private docs: only the owner reads AND writes — opponents can never see hand/library

## Cloud Functions (`functions/index.js`)

Three callable functions handle operations needing trust/atomicity:
- `createGame(name, format, deckId)` — creates lobby, generates invite code
- `joinGame(inviteCode, deckId)` — seats caller atomically (transaction prevents race)
- `startGame(gameId)` — host-only; server-side Fisher-Yates shuffle; writes all private docs via Admin SDK

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

1. Fill `public/js/firebase-config.js` with real values from Firebase console
2. Ensure Google Auth is enabled in Firebase Auth
3. Run: `firebase deploy --only firestore:rules,firestore:indexes,functions,hosting`
