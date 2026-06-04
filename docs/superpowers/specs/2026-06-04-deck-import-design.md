# Deck Import — Design Spec

**Status:** Approved  
**Date:** 2026-06-04  
**Author:** Brainstormed with Claude

---

## 1. Summary

Add a deck import feature to `BuilderView` that accepts MTG Arena format text and resolves each card via Scryfall, with per-card status feedback and the ability to correct failed lookups before committing to the deck.

---

## 2. Goals

- Let users paste an MTG Arena format deck list and import it into the builder without manually searching card by card.
- Show real-time per-card resolution status so users understand progress.
- Allow users to fix unrecognized card names and retry without restarting.
- Merge imported cards into any existing deck state rather than replacing it.
- Keep the import non-destructive: cards are only added to local React state when the user explicitly confirms; the deck is not saved to the backend until the user clicks Save.

## 3. Non-Goals

- No sideboard support (sideboard lines are silently ignored).
- No auto-detection of the commander from the import list.
- No support for formats other than MTG Arena.
- No bulk-replace mode (import always merges).

---

## 4. UI

### 4.1 Entry Point

An **Import** button is added to the topbar in `BuilderView`, placed between the format selector and the card count. Clicking it opens `ImportModal`.

### 4.2 ImportModal — Phase 1 (Paste)

A modal with:
- A `<textarea>` accepting MTG Arena format text
- A "Resolve cards →" button that parses the input and transitions to Phase 2
- A Cancel button

**MTG Arena format example:**
```
Deck
4 Lightning Bolt
1 Black Lotus
2 Island

Sideboard
2 Duress
```

### 4.3 ImportModal — Phase 2 (Resolution)

After parsing, the modal fetches the Scryfall card names catalog, then immediately transitions to the resolution view. Cards whose names appear in the catalog begin their Scryfall lookup straight away; cards whose names don't match the catalog are shown as failed immediately (no network call wasted).

- **Progress bar** showing `resolved / total` count
- **Per-card rows**, one per unique card entry:
  - Status icon: spinner (loading), ✓ (resolved), ✗ (failed)
  - `quantity × name` — name becomes an editable text field when the card fails
  - **Retry** button on failed rows — re-checks the catalog, then runs the Scryfall lookup if the (possibly edited) name passes
- **"+ Add card"** button at the bottom to append a new row — the new row starts in failed state with an empty editable name field and a Resolve button; the user types a name and clicks Resolve to look it up
- **"Add to deck"** button — available immediately; clicking it merges all currently resolved cards into the deck state, skips unresolved/failed rows, shows a toast, and closes the modal

---

## 5. Data Flow

### 5.1 Parsing

`lib/import.ts` exports a pure `parseMtgArena(text: string): { quantity: number; name: string }[]` function.

Rules:
- Trim each line
- Skip blank lines
- Skip lines starting with `//`
- Skip known section headers: `Deck`, `Sideboard`, `Commander`
- Parse remaining lines as `<quantity> <name>` (quantity is the first token, name is the rest)
- Lines that don't match the pattern are skipped

### 5.2 Catalog Pre-check

`lib/import.ts` exports `fetchCardNameCatalog(): Promise<Set<string>>`.

- Fetches `GET https://api.scryfall.com/catalog/card-names` once per session
- Result is cached in module scope (a `Promise` singleton) so subsequent imports reuse it
- Returns a `Set<string>` of all canonical card names (case-insensitive comparison: names are lowercased before insertion and lookup)

Before any individual card lookup, each name is checked against this set:
- **Match** → proceed to Scryfall fetch
- **No match** → immediately mark row as failed; no fetch attempted

### 5.3 Scryfall Lookup

`lib/import.ts` exports `resolveCards(names: string[]): Promise<Map<string, ScryfallCard | null>>`.

- Receives only names that passed the catalog check
- Deduplicates the name list before fetching
- Batches requests in groups of 5 using `Promise.allSettled`
- Each request: `GET https://api.scryfall.com/cards/named?exact=<encoded name>`
- Returns a map from name → Scryfall card object (or `null` on failure)

### 5.4 Merge

When "Add to deck" is clicked:
- For each resolved card entry: if `cardId` already exists in `cards` state, increment its quantity; otherwise append a new `DeckCardEntry`.
- Unresolved and failed entries are skipped.
- `ImportModal` receives an `onImport(cards: DeckCardEntry[]) => void` callback prop; `BuilderView` merges the received entries into its `cards` state. The `toEntry` helper will be moved from `BuilderView` to `lib/cards.ts` so both files can use it.

---

## 6. Error Handling

| Scenario | Behavior |
|---|---|
| Name not in catalog | Row immediately marked ✗ (no fetch); name becomes editable; Retry re-checks catalog then fetches |
| Scryfall returns 404 (card not found) | Row marked ✗; name becomes editable; Retry button shown |
| Network error on a card lookup | Treated same as not found |
| Catalog fetch fails | All rows proceed directly to Scryfall lookup (catalog check skipped gracefully) |
| All cards fail | "Add to deck" still available; clicking it adds nothing and shows toast "No cards resolved" |
| Some cards fail, user clicks "Add to deck" | Resolved cards added; toast: "Added X cards · Y not found" |
| All cards resolve | Toast: "Added X cards" |

---

## 7. New Files

| File | Purpose |
|---|---|
| `app/src/features/decks/ImportModal.tsx` | Modal component (Phase 1 + Phase 2 UI) |
| `app/src/lib/import.ts` | Pure parse + batch-fetch functions |

---

## 8. Modified Files

| File | Change |
|---|---|
| `app/src/features/decks/BuilderView.tsx` | Add Import button to topbar; wire `ImportModal` open/close; handle merge callback |

---

## 9. Testing

`lib/import.ts` is pure (no DOM, no React) and should have unit tests covering:
- Parsing: section headers skipped, `//` comments skipped, blank lines skipped, quantity + name extracted correctly
- Parsing: lines with no quantity token are skipped
- `fetchCardNameCatalog`: caching (called twice, fetches once); case-insensitive lookup
- `resolveCards`: batching logic (mock fetch), success and 404 cases
- Catalog pre-check: names not in catalog never reach fetch; catalog fetch failure falls through to fetch
