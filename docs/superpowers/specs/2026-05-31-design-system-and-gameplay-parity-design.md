# tapuntap — Design System Adoption & Gameplay Parity

**Status:** Design — pending user review
**Date:** 2026-05-31
**Author:** Brainstormed with Claude
**Builds on:** `2026-05-31-public-rewrite-design.md` (the React/TS rewrite). That rewrite shipped working *baselines*; this spec applies the finished visual design and restores full gameplay functionality.

---

## 1. Summary

The React/TS rewrite proved the architecture end-to-end but shipped intentionally minimal UI, so the app lost much of the gameplay richness the original had. Meanwhile a finished visual design was produced in Claude Design and exported as a handoff bundle (now vendored at `docs/design/`). This project does two things at once:

1. **Adopt the design system and screen layouts** — recreate the design's 7 screens as our typed React components, matching the visual output.
2. **Restore full gameplay parity** — the context menus, modals, zone drawers, drag-drop, counters, card detail/hover, and keyboard shortcuts the baseline `GameView` dropped.

No backend rewrite. We reuse the existing Firebase backend (`gameAction`, rules, hooks) and add only two small Cloud Functions the design's Lobby requires (`toggleReady`, `removePlayer`). The simulator still enforces **no Magic rules** — only tracking, visualization, and authorization.

### Design source of truth
`docs/design/project/` holds the exported prototype (JSX/CSS). Per its `README.md`, these are prototypes to **recreate pixel-perfectly in the target tech** (React — which we already use). For every screen, the corresponding `docs/design/project/screens/*.jsx` plus `styles.css` and `components.jsx` are the authoritative reference for layout, spacing, and tokens. We match the **visual output**, wiring it to our real Firebase data/actions rather than copying the prototype's mock state.

### Goals
- A shared design-system foundation (tokens, fonts, shared components) adopted into the app.
- All 7 screens recreated to match the design.
- Full ActiveGameplay parity, wired to existing `gameAction`/client writers.
- Real Scryfall card images rendered inside the design's card frame.
- Two new Cloud Functions: `toggleReady`, `removePlayer` (TDD'd).
- Structured so screens can be built in parallel after the foundation lands.

### Non-goals (deferred)
- Password reset, presence/disconnect, stale-lobby cleanup.
- Mobile breakpoints — the design is desktop-first; we build desktop-first (responsive notes exist in the design chat for a later pass).
- No new game-start model: the single-player `GameSetup.jsx` prototype screen is **not** built; multiplayer Lobby is the only pre-game path.
- No change to the Firestore data model or the security model from the rewrite (private docs stay client-read-only).

---

## 2. Locked design decisions (from brainstorming)

1. **Card rendering:** render the real Scryfall image we already fetch, inside the design's card chrome (color bar, tapped 90° rotation, P/T, counters, token badge, summoning-sick dim). Fall back to the abstract color-bar/hatched block only when there is no image. `CardFace` owns this.
2. **GameSetup:** the prototype's local 3-step `GameSetup.jsx` is dropped. Its visual treatment (numbered steps, format chips, deck-picker styling) informs the multiplayer Lobby create-game flow instead.
3. **Gameplay scope:** full parity now (context menus, scry/token modals, zone drawers, drag-drop, counters, card detail + hover, keyboard shortcuts).
4. **Fonts:** adopt Geist Sans (UI), Instrument Serif (italic screen/modal/empty titles), JetBrains Mono (numerics/metadata) via Google Fonts `<link>` in `app/index.html`.

---

## 3. Architecture

**Foundation-first, then parallel screens, then gameplay parity.**

```
Phase A — Design-system foundation (BLOCKS everything else)
  app/index.html         + Google Fonts (Geist, Instrument Serif, JetBrains Mono)
  app/public/app.css     reconcile with docs/design/project/styles.css (tokens, serif titles,
                         card frame, pip, modal, empty, auth-bg, drop-target, density)
  app/src/components/     Avatar, Spinner, ContextMenu (new); Modal, CardFace, Icon (refresh);
                         ManaCost/pip renderer
  app/src/lib/format.ts   colorTone aligned to design mana tokens

Phase B — Backend additions (parallel with A; emulator-tested)
  functions/index.js      toggleReady(gameId), removePlayer(gameId, targetUid)
  functions/test/*        TDD for both
  app/src/api/games.ts     callable wrappers

Phase C — Screens (parallelizable after A; each its own unit)
  Auth · Lobby · DeckLibrary+Builder · GamesList · EndGame · ActiveGameplay(parity)
```

Each screen unit reads its design `.jsx` as the visual spec and our existing hooks/api for data. Screen units don't depend on each other (only on Phase A foundation + Phase B for Lobby/EndGame), so they can be assigned to parallel agents.

---

## 4. Phase A — design-system foundation

- **Fonts:** add `<link>` tags for Geist, Instrument Serif, JetBrains Mono in `app/index.html`. Set `--font-sans/--font-serif/--font-mono` per `styles.css`.
- **Tokens & base CSS:** reconcile `app/public/app.css` with `docs/design/project/styles.css` so the two match: warm-ink backgrounds, amber accent, mana palette, serif italic on `.topbar-title`/`.modal-title`/`.empty-title`, the `.card` frame + `.card.tapped`/`.is-land`/`.summoning-sick`/`.card-counter`, `.pip-*`, `.modal`, `.drop-target`, `.auth-bg`, density variables + `[data-density="compact"]`. Where our app.css already matches, leave it; only add/correct deltas.
- **Shared components** (recreate from `docs/design/project/components.jsx`):
  - `Avatar` (initials/photo), `Spinner`, `ContextMenu` (right-click menu: header/items/separators/danger), and a `ManaCost`/`pip` renderer.
  - Refresh `Modal`, `CardFace`, `Icon`, and the rail/`AppShell` to the design's exact markup/classes.
- **Acceptance:** the existing screens still build and render with the new fonts/tokens; serif italic titles appear; no regression in routing/auth.

## 5. Phase B — backend additions

Both are host/seat operations on the Function-owned `seats`/`seatUids` arrays; both run in a transaction; both TDD'd against the emulator and added to CI via the existing `test:functions` script.

- **`toggleReady(gameId)`** — flips the caller's own `seats[i].ready`. Caller must be a seated participant; game must be `lobby`.
- **`removePlayer(gameId, targetUid)`** — host-only; removes `targetUid` from `seats`/`seatUids`; cannot remove the host; game must be `lobby`.
- Client wrappers added to `app/src/api/games.ts`. `endGame` already accepts `winnerUid` (mark-winner) and needs no change.

## 6. Phase C — screens (each a parallel unit)

For each, the named `docs/design/project/screens/*.jsx` is the visual spec; data/actions come from our existing hooks/api.

- **Auth** (`Auth.jsx`): loading splash before auth resolves (no app-shell flash), `auth-bg` gradient, centered card, Google primary, email sign-in⇄sign-up toggle, live field validation (invalid email, weak-password strength meter, name on sign-up), error banners (invalid credential; email-already-in-use with inline "Sign in"), placeholder "Forgot password?". Wires to existing `useAuth` (`signInGoogle/signInEmail/signUpEmail`).
- **Lobby** (`Lobby.jsx`): entry view (Create: name + format chips + deck picker; Join: code + deck picker) and room view (prominent invite code + copy-link, 2×2 seat grid with ready/waiting/open states, own ready toggle → `toggleReady`, host remove-player on hover → `removePlayer`, Start gated on ≥2 seated AND all ready → `startGame`, leave/cancel → `leaveGame`), plus zero-decks empty state. Live via `useGame`.
- **DeckLibrary + Builder** (`DeckLibrary.jsx`): deck list with color/search filters; detail with stats + mana curve + grouped decklist + version history; Scryfall search/detail panel. Wires to `decks` api + `useMyDecks` + `searchCards`. (Restores richness over the baseline builder.)
- **GamesList** (`GameManagement.jsx`): lobby/live/complete row variants + count-tagged filter tabs; routes lobby→`/lobby/:id`, active→`/games/:id`, complete→`/games/:id/end`. Wires to `useMyGames`.
- **EndGame** (`EndGame.jsx`): mark-winner flow, winner spotlight, standings table (players + life from player public docs), rematch (new lobby) / archive / back. End-game and leave-game confirmation modals wired into the gameplay topbar. Uses `endGame(gameId, winnerUid)`.
- **ActiveGameplay** (`ActiveGameplay.jsx`) — full parity:
  - Player ribbon (all seats: life ±, hand/lib counts, active indicator, turn switcher), opponents summarized board, dual-lane battlefield (creatures/spells + lands tuck-under), hand zone, zone tabs.
  - `ContextMenu` for hand (play / play tapped / to graveyard·exile·library top·bottom·command) and battlefield (tap/untap, +1/+1, −1/−1, loyalty ±, custom counter, move-to-zone, remove token).
  - `ScryModal` (interactive top/bottom → `gameAction scry`), `TokenModal` (presets + custom P/T/color/qty → client battlefield write), `ZoneDrawer` (graveyard/exile/library/command; library reference grouped by type + tutor → `gameAction tutorToHand`; "all → battlefield/hand"; shuffle graveyard into library).
  - Drag-drop between zones (own zones → client writes; hidden-zone moves → `gameAction`), counter editing, card-detail modal + hover preview, keyboard shortcuts (N end turn, L log, S scry, T token, D draw, Esc).
  - **Action routing rule (unchanged):** own low-stakes fields → client-direct writers; hidden-info / cross-player / shared → `gameAction`. Every interaction maps to an action that already exists in `gameAction` or the client writers from the rewrite.

---

## 7. Data & action mapping

The backend already supports the parity interactions — this is almost entirely UI wiring:

| Interaction | Wired to |
|---|---|
| tap/untap, counters, own life, own-public-zone move, tokens, notes | client-direct (`useGameActions`) |
| draw, mill, scry, shuffle, tutor, move to/from hand/library, play from hand | `gameAction` |
| adjust opponent life / damage | `gameAction adjustOpponentLife` |
| advance phase, end turn | `gameAction` |
| ready toggle, remove player | new `toggleReady`/`removePlayer` functions |
| mark winner / end game, leave | `endGame` / `leaveGame` |

## 8. Testing

- **Phase A/C (UI):** primarily manual verification against the emulator (impractical to unit-test no-logic presentational React); keep the existing Vitest suite green; add Vitest unit tests for any new pure helpers (e.g. scry-order assembly, mana-curve computation).
- **Phase B (functions):** TDD against the emulator like the existing functions; added to CI via `npm run test:functions`.
- All existing automated gates (app build, vitest, `test:rules`, `test:functions`) must stay green.
- Per-screen manual verification steps live in the implementation plan.

## 9. Parallelization & delivery

- **Phase A is the gate** — it must merge first (everything else depends on the tokens/fonts/shared components).
- **Phase B** can run alongside A.
- **Phase C screens** are independent units suitable for parallel agents once A lands; Lobby and EndGame additionally depend on B.
- Incremental: each screen is a small PR/commit, validated on the preview URL; backend changes manually deployed for preview testing per the established strategy.

## 10. Risks / watch-items

- **app.css divergence:** our app.css and the design styles.css are close but not identical; the foundation task must diff carefully and avoid breaking already-working screens.
- **ActiveGameplay size:** the design screen is large; build it from focused components (one responsibility each), not one monolith.
- **Card frame + real images:** ensure tapped-rotation and counters overlay correctly on `<img>` cards, not just abstract blocks.
- **Drag-drop + networked writes:** dropping into a hidden zone must route through `gameAction`, not a client write, to keep counts consistent.
