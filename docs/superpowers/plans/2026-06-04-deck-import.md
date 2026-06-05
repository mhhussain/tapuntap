# Deck Import Feature — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MTG Arena format deck import to BuilderView with per-card Scryfall resolution, catalog pre-check, and merge-into-deck semantics.

**Architecture:** Pure functions in `lib/import.ts` handle parsing, catalog fetch (module-scoped Promise singleton), and batch card resolution. `ImportModal.tsx` owns all import UI state (paste → resolve two phases). `BuilderView.tsx` receives resolved `DeckCardEntry[]` via callback and merges into deck state. `toEntry` is extracted from `BuilderView.tsx` to `lib/cards.ts` so both files can share it.

**Tech Stack:** React 18, TypeScript 5, Vitest, Scryfall REST API (`/catalog/card-names`, `/cards/named`)

---

## File Map

| File | Change | Purpose |
|---|---|---|
| `app/src/lib/cards.ts` | Modify | Add exported `toEntry` helper |
| `app/src/lib/import.ts` | Create | `parseMtgArena`, `fetchCardNameCatalog`, `resolveCards` |
| `app/src/features/decks/ImportModal.tsx` | Create | Two-phase import modal component |
| `app/src/features/decks/BuilderView.tsx` | Modify | Import button + modal wiring + merge callback |
| `app/public/app.css` | Modify | Add `.imp-*` CSS classes for modal |
| `app/src/test/import.test.ts` | Create | Unit tests for `lib/import.ts` |

---

### Task 1: Move `toEntry` to `lib/cards.ts`

**Files:**
- Modify: `app/src/lib/cards.ts`
- Modify: `app/src/features/decks/BuilderView.tsx`

- [ ] **Step 1: Add `toEntry` export to `app/src/lib/cards.ts`**

The file currently exports `isLand`, `shuffle`, `newInstanceId`, `computeManaCurve`, `groupCardsByType`. Append to the end:

```typescript
import type { DeckCardEntry } from "../types";

export function toEntry(card: any, quantity = 1): DeckCardEntry {
  return {
    cardId: card.id,
    name: card.name,
    quantity,
    manaCost: card.mana_cost || "",
    cmc: card.cmc || 0,
    typeLine: card.type_line || "",
    colors: card.colors || [],
    imageUri: card.image_uris?.normal ?? card.card_faces?.[0]?.image_uris?.normal ?? null,
    imageUriBack: card.card_faces?.[1]?.image_uris?.normal ?? null,
    power: card.power ?? null,
    toughness: card.toughness ?? null,
    loyalty: card.loyalty ?? null,
  };
}
```

- [ ] **Step 2: Update `BuilderView.tsx` — remove private `toEntry`, import from `lib/cards.ts`**

In `app/src/features/decks/BuilderView.tsx`, delete the private function at lines 11–19:

```typescript
function toEntry(card: any, quantity = 1): DeckCardEntry {
  return {
    cardId: card.id, name: card.name, quantity,
    manaCost: card.mana_cost || "", cmc: card.cmc || 0, typeLine: card.type_line || "",
    colors: card.colors || [], imageUri: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null,
    imageUriBack: card.card_faces?.[1]?.image_uris?.normal || null,
    power: card.power ?? null, toughness: card.toughness ?? null, loyalty: card.loyalty ?? null,
  };
}
```

Change the existing import on line 8 from:
```typescript
import { groupCardsByType } from "../../lib/cards";
```
to:
```typescript
import { groupCardsByType, toEntry } from "../../lib/cards";
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd app && npm run build 2>&1 | grep -i "error" | head -10
```
Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add app/src/lib/cards.ts app/src/features/decks/BuilderView.tsx
git commit -m "refactor: move toEntry helper to lib/cards.ts"
```

---

### Task 2: Create `lib/import.ts` — `parseMtgArena`

**Files:**
- Create: `app/src/lib/import.ts`
- Create: `app/src/test/import.test.ts`

- [ ] **Step 1: Create the test file with failing tests for `parseMtgArena`**

Create `app/src/test/import.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { parseMtgArena } from "../lib/import";

describe("parseMtgArena", () => {
  it("parses quantity and name from standard lines", () => {
    const result = parseMtgArena("4 Lightning Bolt\n2 Island");
    expect(result).toEqual([
      { quantity: 4, name: "Lightning Bolt" },
      { quantity: 2, name: "Island" },
    ]);
  });

  it("skips blank lines", () => {
    const result = parseMtgArena("4 Lightning Bolt\n\n2 Island");
    expect(result).toHaveLength(2);
  });

  it("skips section headers: Deck, Sideboard, Commander, Companion", () => {
    const result = parseMtgArena("Deck\n4 Lightning Bolt\nSideboard\n2 Duress\nCommander\n1 Sol Ring\nCompanion\n1 Lurrus");
    expect(result).toEqual([
      { quantity: 4, name: "Lightning Bolt" },
      { quantity: 2, name: "Duress" },
      { quantity: 1, name: "Sol Ring" },
      { quantity: 1, name: "Lurrus" },
    ]);
  });

  it("skips lines starting with //", () => {
    const result = parseMtgArena("// This is a comment\n4 Lightning Bolt");
    expect(result).toEqual([{ quantity: 4, name: "Lightning Bolt" }]);
  });

  it("skips lines with no leading quantity token", () => {
    const result = parseMtgArena("Lightning Bolt");
    expect(result).toHaveLength(0);
  });

  it("handles multi-word card names", () => {
    const result = parseMtgArena("1 Black Lotus");
    expect(result).toEqual([{ quantity: 1, name: "Black Lotus" }]);
  });

  it("returns empty array for empty or whitespace-only input", () => {
    expect(parseMtgArena("")).toEqual([]);
    expect(parseMtgArena("  \n  \n  ")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails (module doesn't exist yet)**

```bash
cd app && npm test -- import.test 2>&1 | head -20
```
Expected: `Cannot find module '../lib/import'`

- [ ] **Step 3: Create `app/src/lib/import.ts` with `parseMtgArena`**

```typescript
export interface ParsedCard {
  quantity: number;
  name: string;
}

const SECTION_HEADERS = new Set(["deck", "sideboard", "commander", "companion"]);

export function parseMtgArena(text: string): ParsedCard[] {
  const results: ParsedCard[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("//")) continue;
    if (SECTION_HEADERS.has(line.toLowerCase())) continue;
    const match = line.match(/^(\d+)\s+(.+)$/);
    if (!match) continue;
    results.push({ quantity: parseInt(match[1], 10), name: match[2].trim() });
  }
  return results;
}
```

- [ ] **Step 4: Run the tests and verify they pass**

```bash
cd app && npm test -- import.test 2>&1 | tail -15
```
Expected: 7 tests pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/import.ts app/src/test/import.test.ts
git commit -m "feat: add parseMtgArena to lib/import.ts"
```

---

### Task 3: Add `fetchCardNameCatalog` to `lib/import.ts`

**Files:**
- Modify: `app/src/lib/import.ts`
- Modify: `app/src/test/import.test.ts`

- [ ] **Step 1: Add failing tests for `fetchCardNameCatalog` to the test file**

Append to `app/src/test/import.test.ts` (also update the import at the top of the file to include `fetchCardNameCatalog` and `_resetCatalogCache`):

```typescript
import { parseMtgArena, fetchCardNameCatalog, _resetCatalogCache } from "../lib/import";
```

Then append the new describe block:

```typescript
describe("fetchCardNameCatalog", () => {
  beforeEach(() => {
    _resetCatalogCache();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches the catalog URL and returns a Set of lowercased names", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ data: ["Lightning Bolt", "Counterspell", "Sol Ring"] }),
    });

    const catalog = await fetchCardNameCatalog();
    expect(catalog).not.toBeNull();
    expect(catalog!.has("lightning bolt")).toBe(true);
    expect(catalog!.has("Lightning Bolt")).toBe(false);
    expect(catalog!.has("counterspell")).toBe(true);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith("https://api.scryfall.com/catalog/card-names");
  });

  it("caches the result — calls fetch only once across two awaits", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: () => Promise.resolve({ data: ["Lightning Bolt"] }),
    });

    await fetchCardNameCatalog();
    await fetchCardNameCatalog();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("returns null when the network fetch fails", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));
    const catalog = await fetchCardNameCatalog();
    expect(catalog).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm only the new block fails**

```bash
cd app && npm test -- import.test 2>&1 | grep -E "FAIL|PASS|×|✓" | head -20
```
Expected: `parseMtgArena` tests pass (7); `fetchCardNameCatalog` tests fail (3)

- [ ] **Step 3: Add `fetchCardNameCatalog` and `_resetCatalogCache` to `lib/import.ts`**

Append to `app/src/lib/import.ts`:

```typescript
let _catalogCache: Promise<Set<string> | null> | null = null;

export function _resetCatalogCache(): void {
  _catalogCache = null;
}

export function fetchCardNameCatalog(): Promise<Set<string> | null> {
  if (!_catalogCache) {
    _catalogCache = fetch("https://api.scryfall.com/catalog/card-names")
      .then((r) => r.json())
      .then((data: { data: string[] }) => new Set(data.data.map((n) => n.toLowerCase())))
      .catch(() => null);
  }
  return _catalogCache;
}
```

- [ ] **Step 4: Run all import tests and verify they pass**

```bash
cd app && npm test -- import.test 2>&1 | tail -15
```
Expected: 10 tests pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/import.ts app/src/test/import.test.ts
git commit -m "feat: add fetchCardNameCatalog with session-scoped cache to lib/import.ts"
```

---

### Task 4: Add `resolveCards` to `lib/import.ts`

**Files:**
- Modify: `app/src/lib/import.ts`
- Modify: `app/src/test/import.test.ts`

- [ ] **Step 1: Add failing tests for `resolveCards`**

Update the import at the top of `app/src/test/import.test.ts`:

```typescript
import { parseMtgArena, fetchCardNameCatalog, _resetCatalogCache, resolveCards } from "../lib/import";
```

Append to the test file:

```typescript
describe("resolveCards", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches each name from the Scryfall named endpoint and returns the card", async () => {
    const mockCard = { id: "abc123", name: "Lightning Bolt" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCard),
    }));

    const result = await resolveCards(["Lightning Bolt"]);
    expect(result.get("Lightning Bolt")).toEqual(mockCard);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.scryfall.com/cards/named?exact=Lightning%20Bolt"
    );
  });

  it("returns null for a name that gets a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }));

    const result = await resolveCards(["Mox Peerl"]);
    expect(result.get("Mox Peerl")).toBeNull();
  });

  it("returns null for a name where fetch throws a network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));
    const result = await resolveCards(["Lightning Bolt"]);
    expect(result.get("Lightning Bolt")).toBeNull();
  });

  it("deduplicates names before fetching — calls fetch once for duplicate names", async () => {
    const mockCard = { id: "abc123", name: "Lightning Bolt" };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockCard),
    }));

    const result = await resolveCards(["Lightning Bolt", "Lightning Bolt"]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result.get("Lightning Bolt")).toEqual(mockCard);
  });

  it("returns empty map for empty input without calling fetch", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const result = await resolveCards([]);
    expect(result.size).toBe(0);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("processes all names and returns results for each", async () => {
    const names = ["A", "B", "C", "D", "E", "F", "G"];
    vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string) =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ id: "x", name: "Card" }) })
    ));

    const result = await resolveCards(names);
    expect(globalThis.fetch).toHaveBeenCalledTimes(7);
    expect(result.size).toBe(7);
  });
});
```

- [ ] **Step 2: Run tests to confirm only the new block fails**

```bash
cd app && npm test -- import.test 2>&1 | grep -E "FAIL|PASS|×|✓" | head -20
```
Expected: 10 tests pass; 6 new `resolveCards` tests fail

- [ ] **Step 3: Add `ScryfallCard` interface and `resolveCards` to `lib/import.ts`**

Append to `app/src/lib/import.ts`:

```typescript
export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  colors?: string[];
  image_uris?: { normal?: string; small?: string };
  card_faces?: Array<{ image_uris?: { normal?: string; small?: string } }>;
  power?: string;
  toughness?: string;
  loyalty?: string;
}

export async function resolveCards(names: string[]): Promise<Map<string, ScryfallCard | null>> {
  const unique = [...new Set(names)];
  const result = new Map<string, ScryfallCard | null>();
  if (!unique.length) return result;

  for (let i = 0; i < unique.length; i += 5) {
    const batch = unique.slice(i, i + 5);
    const settled = await Promise.allSettled(
      batch.map((name) =>
        fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`)
          .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
          .then((card: ScryfallCard) => ({ name, card }))
          .catch(() => ({ name, card: null }))
      )
    );
    for (const outcome of settled) {
      if (outcome.status === "fulfilled") {
        result.set(outcome.value.name, outcome.value.card);
      }
    }
  }

  return result;
}
```

- [ ] **Step 4: Run all import tests and verify they pass**

```bash
cd app && npm test -- import.test 2>&1 | tail -20
```
Expected: 16 tests pass, 0 fail

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/import.ts app/src/test/import.test.ts
git commit -m "feat: add resolveCards with batch Scryfall lookup to lib/import.ts"
```

---

### Task 5: Create `ImportModal.tsx` + CSS

**Files:**
- Create: `app/src/features/decks/ImportModal.tsx`
- Modify: `app/public/app.css`

- [ ] **Step 1: Add `.imp-*` CSS classes to `app/public/app.css`**

Append to the end of `app/public/app.css`. The file uses CSS custom properties `--bg-*`, `--fg-*`, `--line-1`, `--accent`, `--bad`, `--good` already defined at the top.

```css
/* ─── Import Modal ─────────────────────────────────────────────────────────── */
.imp-label { font-size: 11px; color: var(--fg-3); font-family: var(--font-mono); margin-bottom: 6px; }
.imp-paste {
  width: 100%; height: 140px; background: var(--bg-3); border: 1px solid var(--line-1);
  border-radius: 4px; padding: 8px; font-family: var(--font-mono); font-size: 12px;
  color: var(--fg-1); resize: vertical; box-sizing: border-box;
}
.imp-progress { height: 3px; background: var(--bg-3); border-radius: 2px; overflow: hidden; }
.imp-progress-fill { height: 100%; background: var(--accent); transition: width 0.2s ease; }
.imp-list { display: flex; flex-direction: column; gap: 3px; max-height: 260px; overflow-y: auto; }
.imp-row {
  display: flex; align-items: center; gap: 8px; padding: 5px 8px;
  background: var(--bg-2); border-radius: 4px; border: 1px solid transparent;
}
.imp-row.is-failed { border-color: var(--bad); }
.imp-status { display: flex; align-items: center; justify-content: center; flex-shrink: 0; width: 16px; }
.imp-status.ok { color: var(--good); }
.imp-status.bad { color: var(--bad); }
.imp-mid { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.imp-qty { font-family: var(--font-mono); font-size: 11px; color: var(--fg-3); flex-shrink: 0; }
.imp-cardname { font-size: 12px; color: var(--fg-1); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.imp-edit {
  flex: 1; font-size: 12px; background: transparent; border: none;
  border-bottom: 1px solid var(--line-1); color: var(--fg-0); outline: none; padding: 1px 0;
}
.imp-edit:focus { border-bottom-color: var(--accent); }
.imp-retry {
  font-size: 11px; padding: 2px 8px; border-radius: 3px; background: var(--bg-3);
  border: 1px solid var(--line-1); cursor: pointer; color: var(--fg-2); flex-shrink: 0;
}
.imp-retry:hover { border-color: var(--fg-2); }
.imp-state { font-size: 11px; color: var(--fg-3); flex-shrink: 0; font-family: var(--font-mono); }
.imp-add {
  font-size: 11px; padding: 4px 10px; border-radius: 4px; border: 1px dashed var(--line-1);
  background: transparent; cursor: pointer; color: var(--fg-3);
  display: flex; align-items: center; gap: 4px;
}
.imp-add:hover { border-color: var(--line-2); color: var(--fg-2); }
@keyframes imp-spin { to { transform: rotate(360deg); } }
.imp-spinner { animation: imp-spin 0.8s linear infinite; display: inline-block; font-size: 13px; color: var(--fg-3); line-height: 1; }
```

- [ ] **Step 2: Create `app/src/features/decks/ImportModal.tsx`**

```typescript
import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { toEntry } from "../../lib/cards";
import { parseMtgArena, fetchCardNameCatalog, resolveCards } from "../../lib/import";
import type { ScryfallCard } from "../../lib/import";
import type { DeckCardEntry } from "../../types";

type RowStatus = "loading" | "resolved" | "failed";

interface ImportRow {
  id: string;
  qty: number;
  name: string;
  status: RowStatus;
  card: ScryfallCard | null;
  isNew?: boolean;
}

let rowSeq = 0;

const IMPORT_EXAMPLE = `Deck
4 Lightning Bolt
4 Counterspell
1 Sol Ring
36 Island

Sideboard
2 Negate`;

export interface ImportModalProps {
  onClose: () => void;
  onImport: (cards: DeckCardEntry[], failedCount: number) => void;
}

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [phase, setPhase] = useState<"paste" | "resolve">("paste");
  const [text, setText] = useState(IMPORT_EXAMPLE);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const abortRef = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      abortRef.current = true;
    };
  }, [onClose]);

  const resolved = rows.filter((r) => r.status === "resolved").length;
  const total = rows.length;
  const pct = total ? (resolved / total) * 100 : 0;

  async function startResolve() {
    const parsed = parseMtgArena(text);
    if (!parsed.length) return;

    const catalog = await fetchCardNameCatalog();

    const initialRows: ImportRow[] = parsed.map((p) => {
      const inCatalog = catalog === null || catalog.has(p.name.toLowerCase());
      return {
        id: "r" + rowSeq++,
        qty: p.quantity,
        name: p.name,
        status: inCatalog ? "loading" : "failed",
        card: null,
      };
    });

    setRows(initialRows);
    setPhase("resolve");

    const toFetch = [...new Set(initialRows.filter((r) => r.status === "loading").map((r) => r.name))];

    for (let i = 0; i < toFetch.length; i += 5) {
      if (abortRef.current) break;
      const batch = toFetch.slice(i, i + 5);
      const batchMap = await resolveCards(batch);
      setRows((current) =>
        current.map((r) => {
          if (r.status !== "loading" || !batchMap.has(r.name)) return r;
          const card = batchMap.get(r.name) ?? null;
          return { ...r, status: card ? "resolved" : "failed", card };
        })
      );
    }
  }

  function editName(id: string, name: string) {
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, name } : r));
  }

  async function retryRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || !row.name.trim()) return;

    const catalog = await fetchCardNameCatalog();
    const inCatalog = catalog === null || catalog.has(row.name.trim().toLowerCase());
    if (!inCatalog) return;

    setRows((rs) => rs.map((r) => r.id === id ? { ...r, status: "loading" } : r));
    const cardMap = await resolveCards([row.name.trim()]);
    const card = cardMap.get(row.name.trim()) ?? null;
    setRows((rs) =>
      rs.map((r) => r.id === id ? { ...r, status: card ? "resolved" : "failed", card } : r)
    );
  }

  function addRow() {
    setRows((rs) => [...rs, { id: "r" + rowSeq++, qty: 1, name: "", status: "failed", card: null, isNew: true }]);
  }

  function handleAddToDeck() {
    const resolvedRows = rows.filter((r) => r.status === "resolved" && r.card !== null);
    const failedCount = rows.filter((r) => r.status === "failed").length;
    const entries = resolvedRows.map((r) => toEntry(r.card, r.qty));
    onImport(entries, failedCount);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div className="modal-title">Import deck</div>
            {phase === "resolve" && (
              <span className="imp-state">{resolved} of {total} resolved</span>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close">
            <Icon name="close" />
          </button>
        </div>

        {phase === "paste" ? (
          <div className="modal-body">
            <div className="imp-label">Paste MTG Arena format</div>
            <textarea
              className="imp-paste"
              value={text}
              spellCheck={false}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Deck\n4 Card Name\n…"}
            />
            <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: 8 }}>
              Quantity + name per line · section headers ignored
            </div>
          </div>
        ) : (
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="imp-progress">
              <div className="imp-progress-fill" style={{ width: pct + "%" }} />
            </div>
            <div className="imp-list">
              {rows.map((r) => (
                <ImportRowItem key={r.id} row={r} onEdit={editName} onRetry={retryRow} />
              ))}
            </div>
          </div>
        )}

        {phase === "paste" ? (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={startResolve}>
              Resolve cards <Icon name="arrow-right" size={14} />
            </button>
          </div>
        ) : (
          <div className="modal-footer" style={{ justifyContent: "space-between" }}>
            <button className="imp-add" onClick={addRow}>
              <Icon name="plus" size={12} /> Add card
            </button>
            <button className="btn btn-primary" onClick={handleAddToDeck}>
              Add to deck
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportRowItem({
  row, onEdit, onRetry,
}: {
  row: ImportRow;
  onEdit: (id: string, name: string) => void;
  onRetry: (id: string) => Promise<void>;
}) {
  const failed = row.status === "failed";
  return (
    <div className={`imp-row${failed ? " is-failed" : ""}`}>
      <span className={`imp-status${row.status === "resolved" ? " ok" : failed ? " bad" : ""}`}>
        {row.status === "loading" && <span className="imp-spinner">⟳</span>}
        {row.status === "resolved" && <Icon name="check" size={13} />}
        {failed && <Icon name="close" size={13} />}
      </span>
      <div className="imp-mid">
        <span className="imp-qty">{row.qty}×</span>
        {failed ? (
          <input
            className="imp-edit"
            value={row.name}
            autoFocus={row.isNew}
            placeholder="Card name…"
            spellCheck={false}
            onChange={(e) => onEdit(row.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onRetry(row.id); }}
          />
        ) : (
          <span className="imp-cardname">{row.name}</span>
        )}
      </div>
      {row.status === "loading" && <span className="imp-state">looking up…</span>}
      {row.status === "resolved" && <span className="imp-state">resolved</span>}
      {failed && (
        <button className="imp-retry" onClick={() => onRetry(row.id)}>Retry</button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd app && npm run build 2>&1 | grep -i "error" | head -10
```
Expected: no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add app/src/features/decks/ImportModal.tsx app/public/app.css
git commit -m "feat: add ImportModal component with two-phase import UI"
```

---

### Task 6: Wire `ImportModal` into `BuilderView.tsx`

**Files:**
- Modify: `app/src/features/decks/BuilderView.tsx`

- [ ] **Step 1: Add `ImportModal` import and `importOpen` state to `BuilderView.tsx`**

Add after the existing imports (after line 9 `import type { DeckCardEntry }`):

```typescript
import { ImportModal } from "./ImportModal";
```

Add inside the `BuilderView` component body, after the existing `const [changelog, setChangelog] = useState("")` line:

```typescript
  const [importOpen, setImportOpen] = useState(false);
```

- [ ] **Step 2: Add `handleImport` function to `BuilderView.tsx`**

Add inside the `BuilderView` component body, before the `const totalCards = ...` line:

```typescript
  function handleImport(imported: DeckCardEntry[], failedCount: number) {
    if (imported.length > 0) {
      setCards((current) => {
        const updated = current.map((c) => ({ ...c }));
        for (const entry of imported) {
          const existing = updated.find((c) => c.cardId === entry.cardId);
          if (existing) {
            existing.quantity += entry.quantity;
          } else {
            updated.push({ ...entry });
          }
        }
        return updated;
      });
    }
    if (imported.length === 0 && failedCount === 0) return;
    if (imported.length === 0) {
      toast("No cards resolved", "error");
    } else if (failedCount > 0) {
      toast(`Added ${imported.length} card${imported.length !== 1 ? "s" : ""} · ${failedCount} not found`);
    } else {
      toast(`Added ${imported.length} card${imported.length !== 1 ? "s" : ""}`);
    }
  }
```

- [ ] **Step 3: Add the Import button to the topbar in `BuilderView.tsx`**

Find this block in the topbar section:

```tsx
        <div className="topbar-spacer" />
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>{totalCards} cards</span>
```

Replace with:

```tsx
        <div className="topbar-spacer" />
        <button className="btn btn-ghost" onClick={() => setImportOpen(true)}>
          Import
        </button>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}>{totalCards} cards</span>
```

- [ ] **Step 4: Render `ImportModal` at the end of the return statement**

In `BuilderView.tsx`, find the closing `</>` of the return statement and add the modal before it:

```tsx
      {importOpen && (
        <ImportModal
          onClose={() => setImportOpen(false)}
          onImport={handleImport}
        />
      )}
    </>
```

- [ ] **Step 5: Run all tests to verify nothing is broken**

```bash
cd app && npm test 2>&1 | tail -20
```
Expected: all tests pass (including the 16 import tests)

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd app && npm run build 2>&1 | grep -i "error" | head -10
```
Expected: no TypeScript errors

- [ ] **Step 7: Commit**

```bash
git add app/src/features/decks/BuilderView.tsx
git commit -m "feat: wire ImportModal into BuilderView with merge callback"
```

---

## Post-Implementation Verification

- [ ] Start the dev server and emulators:
  ```bash
  # Terminal 1
  firebase emulators:start --only firestore,auth,functions
  # Terminal 2
  cd app && npm run dev
  ```
- [ ] Open the builder for a deck, click **Import**, paste the example deck list, click **Resolve cards →**
- [ ] Verify: progress bar fills, cards resolve one batch at a time, "Mox Peerl" shows as failed
- [ ] Edit "Mox Peerl" → "Mox Pearl", press Enter or Retry → verifies it resolves
- [ ] Click **Add card** → new empty row appears; type a card name and Retry
- [ ] Click **Add to deck** → modal closes, cards appear in the decklist
- [ ] Import the same deck again → quantities increment (merge, not replace)
- [ ] Click **Save** → deck saves to Firestore with all imported cards
