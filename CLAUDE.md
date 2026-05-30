# tapuntap — Architecture & Design

## Overview

A local-first Magic: The Gathering game simulator. Node.js backend serves a vanilla JS frontend. All data lives in JSON files on disk. No database, no accounts, no external persistence.

## Running the App

```bash
npm install
npm start          # → http://localhost:3000
npm run dev        # (auto-restart with nodemon)
```

---

## Architecture

### Backend (`server.js`)

Single Express file handling three concerns:

1. **Scryfall proxy** — forwards card searches/lookups to `api.scryfall.com`. Card JSON is cached locally in `data/cards/{id}.json` after first fetch. Images are never cached; they're served from Scryfall CDN URLs stored in card data.

2. **Deck API** — CRUD over `data/decks/{id}.json`. Each save bumps the version counter and appends a version entry with a changelog and card snapshot.

3. **Game API** — CRUD over `data/games/{id}.json`. Game creation pulls deck snapshots and builds shuffled player states server-side. Subsequent saves replace the entire game document (PUT with full state).

### Frontend (`public/js/`)

Hash-based SPA with no build step. Uses ES modules (`type="module"`).

```
app.js          — router + navigate() helper
api.js          — thin fetch wrapper for all server routes
utils.js        — mana rendering, toast, modal, context menu, helpers
views/
  home.js       — dashboard: recent games + decks
  decks.js      — deck library table
  builder.js    — deck builder (search left, deck center, preview right)
  games.js      — game list + new game setup
  game.js       — game board: all gameplay interaction
```

---

## Data Models

### Deck (`data/decks/{id}.json`)

```json
{
  "id": "uuid",
  "name": "Sultai Value",
  "format": "commander",
  "commander": { "cardId": "...", "name": "...", "imageUri": "..." },
  "cards": [
    {
      "cardId": "scryfall-uuid",
      "name": "Brainstorm",
      "manaCost": "{U}",
      "cmc": 1,
      "typeLine": "Instant",
      "colors": ["U"],
      "imageUri": "https://...",
      "imageUriBack": null,
      "quantity": 1
    }
  ],
  "version": 3,
  "versions": [
    {
      "version": 1,
      "timestamp": "2024-01-01T00:00:00Z",
      "changelog": "Initial version",
      "cards": [...]
    }
  ],
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Deck versioning strategy:** Append-only. Every PUT bumps `version` and adds an entry to `versions[]` with the full card list at that point. No pruning. The changelog is a free-text string the user enters on save. Old versions are read-only (accessible via History modal).

### Game (`data/games/{id}.json`)

```json
{
  "id": "uuid",
  "name": "Sultai vs Gruul",
  "status": "active",
  "turn": 3,
  "activePlayer": 1,
  "phase": "main1",
  "phaseIndex": 1,
  "phases": ["Beginning", "Main 1", "Combat", "Main 2", "End"],
  "players": [
    {
      "id": 0,
      "name": "Player 1",
      "deckId": "uuid",
      "deckName": "Sultai Value",
      "life": 18,
      "poison": 0,
      "energy": 0,
      "library": [ { "instanceId": "uuid", "cardId": "...", "name": "...", ... } ],
      "hand": [ ... ],
      "battlefield": [
        {
          "instanceId": "uuid",
          "cardId": "...",
          "name": "Island",
          "typeLine": "Basic Land — Island",
          "tapped": true,
          "counters": {},
          "attachedTo": null,
          "token": false
        }
      ],
      "graveyard": [ ... ],
      "exile": [ ... ],
      "command": [ ... ]
    }
  ],
  "log": ["[10:32] Turn 3: Player 2's turn", ...],
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Card instances:** Every card in the game state is an independent object with its own `instanceId`. Copies of the same card (e.g., 4× Lightning Bolt) are four distinct objects. This allows tracking tap state, counters, and zone location per copy without ambiguity.

**Deck snapshot:** When a game is created, each player's deck is copied in full into the player state. Future edits to the deck library have no effect on in-progress games. The `deckId` and `deckName` fields are kept for reference only.

---

## File Organization

```
tapuntap/
├── server.js               # Express server + all routes
├── package.json
├── CLAUDE.md               # This file
├── data/                   # Auto-created on first start
│   ├── cards/              # {scryfall-id}.json — card data cache
│   ├── decks/              # {uuid}.json — deck definitions
│   └── games/              # {uuid}.json — game session state
└── public/
    ├── index.html          # SPA shell
    ├── css/app.css         # Single stylesheet, CSS custom properties
    └── js/
        ├── app.js          # Router
        ├── api.js          # API client
        ├── utils.js        # Shared helpers
        └── views/          # One file per view
            ├── home.js
            ├── decks.js
            ├── builder.js
            ├── games.js
            └── game.js
```

---

## Game State Persistence

Auto-save is triggered 500ms after any state mutation in `game.js`. The full game object is PUT to the server as JSON. On resume, the server sends back the full object and the frontend hydrates from it. There is no optimistic update — the PUT response confirms the write before the next action is possible.

---

## Concurrent Games

Each game is a self-contained JSON file. Any number of games can exist simultaneously; the games list shows all of them, sorted by `updatedAt`. Resuming a game loads it fresh from disk. There is no locking — concurrent writes from multiple browser tabs to the same game file would corrupt state, but this is a single-user tool.

---

## No Automated Rules

The simulator enforces no Magic rules. It is a tracking and visualization layer only:
- No legal move validation
- No automatic triggers or state-based actions  
- No mana pool enforcement
- No priority passing

The user is responsible for all rules adjudication and plays both sides manually.

---

## Assumptions & Creative Decisions

- **Images on-demand:** Card images are Scryfall CDN URLs stored in card data. No local image caching. If Scryfall is unreachable, placeholder colored boxes render instead.
- **Hand draw on game start:** The simulator does not auto-draw opening hands. The user clicks "Draw N Cards" from the sidebar.
- **Auto-untap on turn end:** When End Turn is clicked, all of the new active player's permanents are untapped automatically. This mirrors the most common use case; the user can re-tap any that shouldn't untap.
- **Phase tracking:** Five phases (Beginning, Main 1, Combat, Main 2, End). No sub-phase enforcement. The user advances phases manually.
- **Tokens:** Custom tokens are created via the token creator dialog. They exist only as card instances with `token: true`; they have no Scryfall backing data.
- **Commander tax:** Not tracked automatically. Use custom counters on the commander in the command zone if desired.
- **Two-faced cards:** Front face image shown by default; "Flip Card" button appears in detail/preview views to show back face.

---

## Suggested Future Enhancements

- Keyboard shortcuts (D = draw, U = untap all, Enter = next phase)
- Drag-and-drop card movement between zones
- Multiplayer via WebSocket (same local network)
- Import decks from Moxfield/Archidekt URL
- Mana pool tracker (tap lands, float mana, track spend)
- Commander damage tracking (matrix of player-to-player damage)
- Card oracle text displayed in sidebar on hover
- Undo/redo stack (store snapshots of last N game states)
- Print/export deck to text list
- Game replay from log
