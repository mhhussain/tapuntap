# Design Prompt: Deck Import Modal

## Context

This is for the **tapuntap** app — a Magic: The Gathering game simulator. The deck builder (`BuilderView`) has a dark, dense UI with a three-panel layout (card search | card detail | decklist) and a topbar. The design language uses:

- Dark backgrounds (`--bg-1`, `--bg-2`, `--bg-3`)
- Muted borders (`--line-1`)
- Small monospace text for card stats
- A single accent color for primary actions
- Compact, information-dense layouts (no whitespace-heavy cards)

Reference component: `app/src/features/decks/BuilderView.tsx`

---

## What to Design

A two-phase **Import Modal** that lets users paste an MTG Arena format deck list and see per-card resolution status before committing to the deck.

---

## Phase 1 — Paste

A modal dialog containing:

- **Title:** "Import deck"
- **Subtitle/label:** "Paste MTG Arena format"
- **Textarea** (monospace font, ~8 rows) — pre-filled with a realistic example:
  ```
  Deck
  4 Lightning Bolt
  4 Counterspell
  1 Sol Ring
  36 Island
  
  Sideboard
  2 Negate
  ```
- **Two footer buttons:** "Cancel" (ghost) and "Resolve cards →" (primary/accent)

---

## Phase 2 — Resolution

After clicking "Resolve cards →", the modal body transitions to a resolution view. Show a realistic state where some cards have resolved, one is still loading, and one has failed.

### Elements:

**Progress bar** — thin bar at the top of the list area, filled proportionally (e.g., 4 of 6 resolved)

**Per-card rows** (scrollable list), one per card:

Each row contains:
- **Status icon** (left): spinner for loading, green checkmark for resolved, red ✗ for failed
- **Quantity × name** (middle, flex): e.g., "4× Lightning Bolt" — plain text when resolved/loading; an editable text input when failed
- **State label** (right): small muted text — "resolved", "looking up…", or a red "Retry" button for failed rows

Show these states in the list:
1. ✓ resolved — `4× Lightning Bolt`
2. ✓ resolved — `4× Counterspell`
3. ✓ resolved — `1× Sol Ring`
4. ⟳ loading — `36× Island`
5. ✗ failed — `1× [editable field showing "Mox Peerl"]` + Retry button (name has a typo — failed catalog pre-check, no fetch attempted)

**Note on failed state:** Cards are pre-checked against Scryfall's full card names catalog before any individual lookup. Names not in the catalog fail immediately (shown in red) without making a network request. The Retry button re-checks the catalog with the edited name, then proceeds to fetch if it passes.

**Footer actions** (below the list):
- Left: `+ Add card` — small dashed ghost button to append a new row
- Right: `Add to deck` — primary/accent button (available even while some cards are loading)

---

## Modal Shell

- Standard centered modal with backdrop
- Width: ~480px
- The modal header shows: "Import deck" (title, left) and "4 of 6 resolved" (small muted text, right) in Phase 2
- Close (✕) button top-right

---

## Design Notes

- Failed rows should be visually distinct — a red left border or red-tinted background on the row
- The editable name field on failed rows should look like an inline input, not a form field — minimal styling, just an underline or very subtle border
- "Add to deck" should not look disabled even when some cards are pending — it's intentionally always available
- Keep everything compact — this is a power-user tool, not an onboarding flow
- Match the existing app's dark theme exactly
