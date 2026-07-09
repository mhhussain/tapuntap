# Touch Gesture Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make card interactions fully work on touch devices: tap = left click, long-press = right click (context menu), finger drag = card drag — implemented as a unified pointer-event gesture layer used by mouse and touch alike.

**Architecture:** A pure, timer-driven gesture recognizer (`app/src/lib/gestures.ts`) classifies each pointer press into tap / long-press / drag. `CardFace` hosts the recognizer and exposes `onTap`, `onMenu`, and `gestureDrag` props, replacing `onClick`/`onContextMenu`/HTML5 `draggable`. `useDragDrop` is rewritten from HTML5 drag events to pointer-driven drag: ghost element follows the pointer, drop zones are found via `document.elementFromPoint` + `data-dropzone` attributes; the existing drop-routing rules are preserved verbatim. `ContextMenu` gains coordinate-based opening, pointer-based outside dismissal, coarse-pointer target sizing, and an open-guard against the synthesized click that follows a touch long-press.

**Tech Stack:** React 18, TypeScript 5, Vite 5, vitest + jsdom + @testing-library/react (already installed).

## Global Constraints

- Long-press threshold: **500ms** hold, movement slop **8px** (constants `LONG_PRESS_MS`, `DRAG_SLOP_PX`).
- Drag starts when movement exceeds 8px before 500ms elapses.
- Long-press fires while the finger is still down; the subsequent release must NOT select a menu item (300ms open-guard in ContextMenu).
- Mouse right-click (`contextmenu` event) must keep working exactly as today.
- Coarse-pointer (`(pointer: coarse)`) devices get larger menu touch targets; desktop menu appearance unchanged.
- Drop routing rules in `useDragDrop.ts` header comment must NOT diverge (hand→battlefield via gameAction, battlefield→hand via gameAction, battlefield→battlefield no-op, etc.).
- Both `GameView` and `PlaytestView` must be wired; they share components but duplicate handler wiring.
- No new runtime dependencies.
- Version bump: `app/package.json` `1.1.0` → `1.2.0` (confirmed with user).
- Test commands: `cd app && npm test` (vitest), `npm run build:app` from repo root (type-checks + builds).
- Work happens on branch `feature/touch-gestures` off `main`. Do NOT commit `docs/superpowers/plans/2026-07-09-game-ux-improvements.md` (unrelated untracked file).

---

### Task 1: Gesture recognizer (`gestures.ts`)

**Files:**
- Create: `app/src/lib/gestures.ts`
- Test: `app/src/test/gestures.test.ts`

**Interfaces:**
- Consumes: nothing (pure module).
- Produces (later tasks rely on these exact names):

```ts
export const LONG_PRESS_MS = 500;
export const DRAG_SLOP_PX = 8;

export interface GestureCallbacks {
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onDragCancel?: () => void;
}

export interface GestureRecognizer {
  down(x: number, y: number): void;
  move(x: number, y: number): void;
  up(x: number, y: number): void;
  cancel(): void;
  /** true if a long-press fired during the current/most recent press */
  longPressFired(): boolean;
}

export function createGestureRecognizer(cb: GestureCallbacks): GestureRecognizer;
```

State machine semantics:
- `down` arms a 500ms `setTimeout`.
- `up` before timer and before slop exceeded → `onTap(x, y)`.
- Timer fires with movement ≤ 8px → `onLongPress(x, y)`; afterwards `up`/`move` do nothing for this press (menu is open).
- Movement > 8px before timer: if `cb.onDragStart` exists → clear timer, fire `onDragStart`, subsequent `move` → `onDragMove`, `up` → `onDragEnd`, `cancel` → `onDragCancel`. If no `onDragStart` → clear timer, press becomes dead (no tap, no long-press).
- `cancel` in any state clears the timer; if dragging, fires `onDragCancel`.
- `longPressFired()` resets to false on the next `down`.

- [ ] **Step 1: Write the failing tests**

```ts
// app/src/test/gestures.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGestureRecognizer, LONG_PRESS_MS, DRAG_SLOP_PX } from "../lib/gestures";

describe("createGestureRecognizer", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function cbs() {
    return {
      onTap: vi.fn(),
      onLongPress: vi.fn(),
      onDragStart: vi.fn(),
      onDragMove: vi.fn(),
      onDragEnd: vi.fn(),
      onDragCancel: vi.fn(),
    };
  }

  it("fires onTap on quick release without movement", () => {
    const cb = cbs();
    const r = createGestureRecognizer(cb);
    r.down(10, 10);
    vi.advanceTimersByTime(100);
    r.up(10, 10);
    expect(cb.onTap).toHaveBeenCalledWith(10, 10);
    expect(cb.onLongPress).not.toHaveBeenCalled();
    expect(cb.onDragStart).not.toHaveBeenCalled();
  });

  it("fires onLongPress after 500ms hold without movement, and no tap on release", () => {
    const cb = cbs();
    const r = createGestureRecognizer(cb);
    r.down(20, 30);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(cb.onLongPress).toHaveBeenCalledWith(20, 30);
    r.up(20, 30);
    expect(cb.onTap).not.toHaveBeenCalled();
    expect(r.longPressFired()).toBe(true);
  });

  it("tolerates movement within slop before long-press", () => {
    const cb = cbs();
    const r = createGestureRecognizer(cb);
    r.down(10, 10);
    r.move(10 + DRAG_SLOP_PX - 1, 10); // within slop
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(cb.onLongPress).toHaveBeenCalled();
    expect(cb.onDragStart).not.toHaveBeenCalled();
  });

  it("starts drag when movement exceeds slop before the timer", () => {
    const cb = cbs();
    const r = createGestureRecognizer(cb);
    r.down(10, 10);
    r.move(10 + DRAG_SLOP_PX + 1, 10);
    expect(cb.onDragStart).toHaveBeenCalledWith(10 + DRAG_SLOP_PX + 1, 10);
    r.move(50, 50);
    expect(cb.onDragMove).toHaveBeenCalledWith(50, 50);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(cb.onLongPress).not.toHaveBeenCalled(); // timer cleared
    r.up(60, 60);
    expect(cb.onDragEnd).toHaveBeenCalledWith(60, 60);
    expect(cb.onTap).not.toHaveBeenCalled();
  });

  it("does not start drag after long-press fired", () => {
    const cb = cbs();
    const r = createGestureRecognizer(cb);
    r.down(10, 10);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    r.move(100, 100);
    r.up(100, 100);
    expect(cb.onDragStart).not.toHaveBeenCalled();
    expect(cb.onTap).not.toHaveBeenCalled();
  });

  it("kills the press on movement past slop when no onDragStart provided", () => {
    const cb = cbs();
    const { onDragStart, onDragMove, onDragEnd, onDragCancel, ...rest } = cb;
    const r = createGestureRecognizer(rest);
    r.down(10, 10);
    r.move(30, 30);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    r.up(30, 30);
    expect(cb.onTap).not.toHaveBeenCalled();
    expect(cb.onLongPress).not.toHaveBeenCalled();
  });

  it("cancel during drag fires onDragCancel; cancel while pressed fires nothing", () => {
    const cb = cbs();
    const r = createGestureRecognizer(cb);
    r.down(10, 10);
    r.move(30, 30);
    r.cancel();
    expect(cb.onDragCancel).toHaveBeenCalled();

    const cb2 = cbs();
    const r2 = createGestureRecognizer(cb2);
    r2.down(10, 10);
    r2.cancel();
    vi.advanceTimersByTime(LONG_PRESS_MS);
    expect(cb2.onLongPress).not.toHaveBeenCalled();
    expect(cb2.onDragCancel).not.toHaveBeenCalled();
  });

  it("longPressFired resets on next down", () => {
    const cb = cbs();
    const r = createGestureRecognizer(cb);
    r.down(10, 10);
    vi.advanceTimersByTime(LONG_PRESS_MS);
    r.up(10, 10);
    expect(r.longPressFired()).toBe(true);
    r.down(10, 10);
    expect(r.longPressFired()).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd app && npx vitest run src/test/gestures.test.ts`
Expected: FAIL — module `../lib/gestures` not found.

- [ ] **Step 3: Implement `app/src/lib/gestures.ts`**

```ts
/**
 * Pointer gesture recognizer — classifies a single pointer press into
 * tap / long-press / drag. Pure logic (setTimeout only), shared by mouse
 * and touch via CardFace pointer events.
 *
 *   down ─┬─ up before 500ms & ≤8px moved ──────────→ onTap
 *         ├─ 500ms elapse, ≤8px moved ──────────────→ onLongPress (press then dead)
 *         └─ >8px moved before 500ms ─┬─ onDragStart present → drag mode
 *                                     └─ absent → press dead (no tap/long-press)
 */

export const LONG_PRESS_MS = 500;
export const DRAG_SLOP_PX = 8;

export interface GestureCallbacks {
  onTap?: (x: number, y: number) => void;
  onLongPress?: (x: number, y: number) => void;
  onDragStart?: (x: number, y: number) => void;
  onDragMove?: (x: number, y: number) => void;
  onDragEnd?: (x: number, y: number) => void;
  onDragCancel?: () => void;
}

export interface GestureRecognizer {
  down(x: number, y: number): void;
  move(x: number, y: number): void;
  up(x: number, y: number): void;
  cancel(): void;
  longPressFired(): boolean;
}

type State = "idle" | "pressed" | "dragging" | "dead";

export function createGestureRecognizer(cb: GestureCallbacks): GestureRecognizer {
  let state: State = "idle";
  let startX = 0;
  let startY = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let firedLongPress = false;

  function clearTimer() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    down(x, y) {
      clearTimer();
      state = "pressed";
      startX = x;
      startY = y;
      firedLongPress = false;
      timer = setTimeout(() => {
        timer = null;
        if (state !== "pressed") return;
        state = "dead";
        firedLongPress = true;
        cb.onLongPress?.(startX, startY);
      }, LONG_PRESS_MS);
    },
    move(x, y) {
      if (state === "dragging") {
        cb.onDragMove?.(x, y);
        return;
      }
      if (state !== "pressed") return;
      const dist = Math.hypot(x - startX, y - startY);
      if (dist <= DRAG_SLOP_PX) return;
      clearTimer();
      if (cb.onDragStart) {
        state = "dragging";
        cb.onDragStart(x, y);
      } else {
        state = "dead";
      }
    },
    up(x, y) {
      if (state === "dragging") {
        cb.onDragEnd?.(x, y);
      } else if (state === "pressed") {
        clearTimer();
        cb.onTap?.(x, y);
      }
      clearTimer();
      state = "idle";
    },
    cancel() {
      if (state === "dragging") cb.onDragCancel?.();
      clearTimer();
      state = "idle";
    },
    longPressFired() {
      return firedLongPress;
    },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/test/gestures.test.ts`
Expected: all 8 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/lib/gestures.ts app/src/test/gestures.test.ts
git commit -m "feat: add pointer gesture recognizer (tap / long-press / drag)"
```

---

### Task 2: ContextMenu — coordinate open, pointer dismissal, coarse-pointer sizing, open-guard

**Files:**
- Modify: `app/src/components/ContextMenu.tsx`
- Test: `app/src/test/contextMenu.test.tsx` (create)

**Interfaces:**
- Consumes: nothing new.
- Produces: `useContextMenu()` now returns `{ menu, openMenu, openMenuAt, closeMenu }` where `openMenuAt(x: number, y: number, items: MenuItem[]): void`. `openMenu(e, items)` behavior unchanged (delegates to `openMenuAt`). `<ContextMenu>` props unchanged.

Changes to make in `app/src/components/ContextMenu.tsx`:

1. **`useContextMenu` hook** — add `openMenuAt`:

```ts
export function useContextMenu() {
  const [menu, setMenu] = useState<MenuState | null>(null);

  const openMenuAt = (x: number, y: number, items: MenuItem[]) => {
    setMenu({ items, x, y });
  };

  const openMenu = (e: React.MouseEvent, items: MenuItem[]) => {
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY, items);
  };

  const closeMenu = () => setMenu(null);

  return { menu, openMenu, openMenuAt, closeMenu };
}
```

2. **Outside dismissal** — in the `ContextMenu` component's second `useEffect`, replace the `mousedown` listener with `pointerdown` (same handler body, rename `onMouseDown` → `onPointerDown`, event type `PointerEvent`):

```ts
const onPointerDown = (e: PointerEvent) => {
  if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
    onClose();
  }
};
window.addEventListener("keydown", onKey);
window.addEventListener("pointerdown", onPointerDown);
return () => {
  window.removeEventListener("keydown", onKey);
  window.removeEventListener("pointerdown", onPointerDown);
};
```

3. **Open-guard (suppress synthesized click after touch long-press):** at the top of the `ContextMenu` component add:

```ts
const openedAtRef = useRef(0);
useEffect(() => {
  openedAtRef.current = Date.now();
}, []);
```

and in the item button's `onClick`:

```ts
onClick={() => {
  if (Date.now() - openedAtRef.current < 300) return;
  onClick();
  onClose();
}}
```

4. **Coarse-pointer sizing:** at the top of the component:

```ts
const coarse =
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches;
```

Apply in styles: container `minWidth: coarse ? 200 : 160`; item button `padding: coarse ? "12px 16px" : "6px 12px"`, `fontSize: coarse ? 14 : 13`.

- [ ] **Step 1: Write the failing test**

```tsx
// app/src/test/contextMenu.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, screen } from "@testing-library/react";
import { ContextMenu } from "../components/ContextMenu";

describe("ContextMenu", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });
  afterEach(() => vi.useRealTimers());

  it("ignores item clicks within 300ms of opening (touch long-press guard)", () => {
    const onClick = vi.fn();
    const onClose = vi.fn();
    render(
      <ContextMenu items={[{ label: "Tap", onClick }]} x={0} y={0} onClose={onClose} />
    );
    fireEvent.click(screen.getByText("Tap"));
    expect(onClick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(400);
    fireEvent.click(screen.getByText("Tap"));
    expect(onClick).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("closes on outside pointerdown", () => {
    const onClose = vi.fn();
    render(
      <ContextMenu items={[{ label: "Tap", onClick: vi.fn() }]} x={0} y={0} onClose={onClose} />
    );
    fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/test/contextMenu.test.tsx`
Expected: FAIL — first test's early click calls onClick (no guard yet); second may fail (mousedown listener, not pointerdown).

- [ ] **Step 3: Apply the four changes above to `ContextMenu.tsx`**

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd app && npx vitest run src/test/contextMenu.test.tsx`
Expected: 2 PASS. Also run full suite: `cd app && npm test` — all green.

- [ ] **Step 5: Commit**

```bash
git add app/src/components/ContextMenu.tsx app/src/test/contextMenu.test.tsx
git commit -m "feat: touch-ready context menu (openMenuAt, pointer dismissal, coarse targets, open-guard)"
```

---

### Task 3: Pointer-based drag-drop (`useDragDrop` rewrite + DragGhost)

**Files:**
- Modify: `app/src/features/game/useDragDrop.ts` (rewrite)
- Create: `app/src/components/DragGhost.tsx`
- Test: `app/src/test/dragRouting.test.ts` (create)

**Interfaces:**
- Consumes: `CardInstance` from `app/src/types`, `useGameActions` type.
- Produces (Tasks 4–5 rely on these exact names):

```ts
export interface GestureDragHandlers {
  onStart: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onEnd: (x: number, y: number) => void;
  onCancel: () => void;
}
export interface GhostState { card: CardInstance; x: number; y: number }
export type DropZone = "battlefield-creatures" | "battlefield-lands" | "hand";

// useDragDrop returns:
{
  cardGestureDrag(card: CardInstance, fromZone: "hand" | "battlefield"): GestureDragHandlers;
  dropZoneProps(zone: DropZone): { "data-dropzone": DropZone; className?: string };
  activeDropZone: DropZone | null;
  ghost: GhostState | null;
}

// DragGhost component:
export function DragGhost({ ghost }: { ghost: GhostState }): JSX.Element;

// exported for tests:
export function routeDrop(args: {
  zone: DropZone;
  data: { instanceId: string; fromZone: "hand" | "battlefield" };
  gameId: string | undefined;
  actions: Actions;
  myPrivate: PlayerPrivate | undefined;
  onError: (p: Promise<unknown>) => void;
}): void;
```

Rewrite of `useDragDrop.ts` — **keep the file-header routing comment verbatim**, update only the mechanism notes. Full new implementation:

```ts
import { useRef, useState } from "react";
import type { useGameActions } from "./useGameActions";
import type { CardInstance, PlayerPublic, PlayerPrivate } from "../../types";

type Actions = ReturnType<typeof useGameActions>;

export interface DragData {
  instanceId: string;
  fromZone: "hand" | "battlefield";
}

export type DropZone = "battlefield-creatures" | "battlefield-lands" | "hand";

export interface GestureDragHandlers {
  onStart: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onEnd: (x: number, y: number) => void;
  onCancel: () => void;
}

export interface GhostState {
  card: CardInstance;
  x: number;
  y: number;
}

/** Find the drop zone under a viewport point (ghost is pointer-events:none). */
function hitTest(x: number, y: number): DropZone | null {
  const el = document.elementFromPoint(x, y)?.closest("[data-dropzone]");
  return (el?.getAttribute("data-dropzone") as DropZone | null) ?? null;
}

export function routeDrop({
  zone,
  data,
  gameId,
  actions,
  myPrivate,
  onError,
}: {
  zone: DropZone;
  data: DragData;
  gameId: string | undefined;
  actions: Actions;
  myPrivate: PlayerPrivate | undefined;
  onError: (p: Promise<unknown>) => void;
}) {
  if (!gameId || !myPrivate) return;
  const { instanceId, fromZone } = data;

  if (fromZone === "hand") {
    const card = myPrivate.hand.find((c) => c.instanceId === instanceId);
    if (!card) return;
    if (zone === "battlefield-creatures" || zone === "battlefield-lands") {
      onError(
        actions.action({
          type: "playFromHand",
          gameId,
          instanceId,
          toZone: "battlefield",
          tapped: false,
        })
      );
    }
    // hand → hand: no-op; hand → graveyard/exile: not a drop target (use menu)
  } else if (fromZone === "battlefield") {
    if (zone === "battlefield-creatures" || zone === "battlefield-lands") {
      // battlefield → battlefield reorder: no-op (no index tracking in data model)
      return;
    }
    if (zone === "hand") {
      onError(
        actions.action({
          type: "moveToHand",
          gameId,
          instanceId,
          fromZone: "battlefield",
        })
      );
    }
  }
}

export function useDragDrop({
  gameId,
  actions,
  mine,
  myPrivate,
  onError,
}: {
  gameId: string | undefined;
  actions: Actions;
  mine: PlayerPublic | undefined;
  myPrivate: PlayerPrivate | undefined;
  onError: (p: Promise<unknown>) => void;
}) {
  const [activeDropZone, setActiveDropZone] = useState<DropZone | null>(null);
  const [ghost, setGhost] = useState<GhostState | null>(null);
  const dragRef = useRef<{ card: CardInstance; fromZone: "hand" | "battlefield" } | null>(null);

  function cardGestureDrag(
    card: CardInstance,
    fromZone: "hand" | "battlefield"
  ): GestureDragHandlers {
    return {
      onStart: (x, y) => {
        dragRef.current = { card, fromZone };
        setGhost({ card, x, y });
        setActiveDropZone(hitTest(x, y));
      },
      onMove: (x, y) => {
        setGhost((g) => (g ? { ...g, x, y } : g));
        setActiveDropZone(hitTest(x, y));
      },
      onEnd: (x, y) => {
        const drag = dragRef.current;
        dragRef.current = null;
        setGhost(null);
        setActiveDropZone(null);
        if (!drag) return;
        const zone = hitTest(x, y);
        if (!zone) return;
        routeDrop({
          zone,
          data: { instanceId: drag.card.instanceId, fromZone: drag.fromZone },
          gameId,
          actions,
          myPrivate,
          onError,
        });
      },
      onCancel: () => {
        dragRef.current = null;
        setGhost(null);
        setActiveDropZone(null);
      },
    };
  }

  function dropZoneProps(zone: DropZone) {
    return {
      "data-dropzone": zone,
      className: activeDropZone === zone ? "drop-target" : undefined,
    } as const;
  }

  void mine;

  return { cardGestureDrag, dropZoneProps, activeDropZone, ghost };
}
```

`app/src/components/DragGhost.tsx`:

```tsx
import type { GhostState } from "../features/game/useDragDrop";
import { CardFace } from "./CardFace";

/** Card image following the pointer during a drag. pointer-events:none so
 *  document.elementFromPoint hit-testing sees the drop zone beneath it. */
export function DragGhost({ ghost }: { ghost: GhostState }) {
  return (
    <div
      style={{
        position: "fixed",
        left: ghost.x,
        top: ghost.y,
        transform: "translate(-50%, -60%)",
        pointerEvents: "none",
        zIndex: 600,
        opacity: 0.85,
      }}
    >
      <CardFace card={ghost.card} zone="drag" />
    </div>
  );
}
```

(Note: `encodeDrag`/`decodeDrag` are deleted. Task 4 changes CardFace so `<CardFace card zone />` with no handlers stays valid.)

- [ ] **Step 1: Write the failing routing test**

```ts
// app/src/test/dragRouting.test.ts
import { describe, it, expect, vi } from "vitest";
import { routeDrop } from "../features/game/useDragDrop";
import { fromPartial } from "./helpers";

function fakeCtx() {
  const action = vi.fn(() => Promise.resolve());
  const onError = vi.fn();
  return {
    gameId: "g1",
    actions: { action } as never,
    myPrivate: {
      hand: [{ instanceId: "c1", name: "Bolt" }],
      library: [],
    } as never,
    onError,
    action,
  };
}

describe("routeDrop", () => {
  it("hand → battlefield lane dispatches playFromHand", () => {
    const ctx = fakeCtx();
    routeDrop({
      zone: "battlefield-creatures",
      data: { instanceId: "c1", fromZone: "hand" },
      gameId: ctx.gameId,
      actions: ctx.actions,
      myPrivate: ctx.myPrivate,
      onError: ctx.onError,
    });
    expect(ctx.action).toHaveBeenCalledWith({
      type: "playFromHand",
      gameId: "g1",
      instanceId: "c1",
      toZone: "battlefield",
      tapped: false,
    });
  });

  it("battlefield → hand dispatches moveToHand", () => {
    const ctx = fakeCtx();
    routeDrop({
      zone: "hand",
      data: { instanceId: "c9", fromZone: "battlefield" },
      gameId: ctx.gameId,
      actions: ctx.actions,
      myPrivate: ctx.myPrivate,
      onError: ctx.onError,
    });
    expect(ctx.action).toHaveBeenCalledWith({
      type: "moveToHand",
      gameId: "g1",
      instanceId: "c9",
      fromZone: "battlefield",
    });
  });

  it("battlefield → battlefield is a no-op", () => {
    const ctx = fakeCtx();
    routeDrop({
      zone: "battlefield-lands",
      data: { instanceId: "c9", fromZone: "battlefield" },
      gameId: ctx.gameId,
      actions: ctx.actions,
      myPrivate: ctx.myPrivate,
      onError: ctx.onError,
    });
    expect(ctx.action).not.toHaveBeenCalled();
  });

  it("hand card not found is a no-op", () => {
    const ctx = fakeCtx();
    routeDrop({
      zone: "battlefield-creatures",
      data: { instanceId: "missing", fromZone: "hand" },
      gameId: ctx.gameId,
      actions: ctx.actions,
      myPrivate: ctx.myPrivate,
      onError: ctx.onError,
    });
    expect(ctx.action).not.toHaveBeenCalled();
  });
});
```

Note: if `app/src/test/helpers.ts` (`fromPartial`) does not exist, drop that import and keep the `as never` casts — check the existing test files' conventions first and match them.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd app && npx vitest run src/test/dragRouting.test.ts`
Expected: FAIL — `routeDrop` not exported.

- [ ] **Step 3: Rewrite `useDragDrop.ts` and create `DragGhost.tsx` per code above**

The app will not compile yet (GameView/PlaytestView/Battlefield/BottomBar still pass old HTML5 props) — that is expected; Tasks 4–5 fix the consumers. Only the new unit test must pass at this step.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd app && npx vitest run src/test/dragRouting.test.ts`
Expected: 4 PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/game/useDragDrop.ts app/src/components/DragGhost.tsx app/src/test/dragRouting.test.ts
git commit -m "feat: pointer-based drag-drop engine with ghost element (replaces HTML5 DnD)"
```

---

### Task 4: CardFace gesture host + touch CSS

**Files:**
- Modify: `app/src/components/CardFace.tsx`
- Modify: `app/public/app.css` (`.card-face` rule)

**Interfaces:**
- Consumes: `createGestureRecognizer`, `GestureCallbacks` from `../lib/gestures` (Task 1); `GestureDragHandlers` from `../features/game/useDragDrop` (Task 3).
- Produces — new CardFace props (Task 5 wires all consumers to these):

```ts
{
  card: CardInstance;
  zone: string;
  onTap?: (x: number, y: number) => void;        // replaces onClick
  onMenu?: (x: number, y: number) => void;       // long-press OR right-click
  gestureDrag?: GestureDragHandlers;             // replaces draggable/onDragStart/onDragEnd
  onMouseEnter?: (e: React.MouseEvent) => void;  // unchanged (hover preview)
  onMouseLeave?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
}
```

`onClick`, `onContextMenu`, `draggable`, `onDragStart`, `onDragEnd` props are **removed**.

New CardFace implementation (render body below the handlers is unchanged from today):

```tsx
import { useRef } from "react";
import type { CardInstance } from "../types";
import { colorTone } from "../lib/format";
import { isLand } from "../lib/cards";
import { createGestureRecognizer } from "../lib/gestures";
import type { GestureDragHandlers } from "../features/game/useDragDrop";

export function CardFace({ card, zone, onTap, onMenu, gestureDrag, onMouseEnter, onMouseLeave, onMouseMove }: {
  card: CardInstance;
  zone: string;
  onTap?: (x: number, y: number) => void;
  onMenu?: (x: number, y: number) => void;
  gestureDrag?: GestureDragHandlers;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onMouseMove?: (e: React.MouseEvent) => void;
}) {
  // Latest-callback refs so the recognizer (created once) never goes stale.
  const cbRef = useRef({ onTap, onMenu, gestureDrag });
  cbRef.current = { onTap, onMenu, gestureDrag };

  const recognizerRef = useRef<ReturnType<typeof createGestureRecognizer> | null>(null);
  if (recognizerRef.current === null) {
    recognizerRef.current = createGestureRecognizer({
      onTap: (x, y) => cbRef.current.onTap?.(x, y),
      onLongPress: (x, y) => cbRef.current.onMenu?.(x, y),
      onDragStart: (x, y) => cbRef.current.gestureDrag?.onStart(x, y),
      onDragMove: (x, y) => cbRef.current.gestureDrag?.onMove(x, y),
      onDragEnd: (x, y) => cbRef.current.gestureDrag?.onEnd(x, y),
      onDragCancel: () => cbRef.current.gestureDrag?.onCancel(),
    });
  }
  const recognizer = recognizerRef.current;
  const interactive = Boolean(onTap || onMenu || gestureDrag);

  const tone = colorTone(card.colors || []);
  const imageUri = card.transformed && card.imageUriBack ? card.imageUriBack : card.imageUri;
  const ptStr = /* …unchanged… */;
  const classes = /* …unchanged… */;

  return (
    <div
      className={classes}
      style={{ ["--card-tone" as string]: tone } as React.CSSProperties}
      data-zone={zone}
      title={`${card.name}${ptStr ? ` • ${ptStr}` : ""}`}
      onPointerDown={
        interactive
          ? (e) => {
              if (e.button !== 0 && e.pointerType === "mouse") return; // right/middle: let contextmenu fire
              e.preventDefault(); // suppress compatibility mouse events / synthesized click / selection
              e.currentTarget.setPointerCapture(e.pointerId);
              recognizer.down(e.clientX, e.clientY);
            }
          : undefined
      }
      onPointerMove={interactive ? (e) => recognizer.move(e.clientX, e.clientY) : undefined}
      onPointerUp={interactive ? (e) => recognizer.up(e.clientX, e.clientY) : undefined}
      onPointerCancel={interactive ? () => recognizer.cancel() : undefined}
      onContextMenu={
        interactive
          ? (e) => {
              e.preventDefault(); // always: also blocks iOS native long-press callout
              // If our own long-press timer already opened the menu, don't double-fire.
              if (!recognizer.longPressFired()) onMenu?.(e.clientX, e.clientY);
            }
          : undefined
      }
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={onMouseMove}
    >
      {/* …existing render body unchanged… */}
    </div>
  );
}
```

Notes for the implementer:
- Only the wrapper `<div>`'s handler props change; every child element stays exactly as-is.
- The recognizer's `onPointerMove` only matters while pressed — the recognizer ignores moves in idle state, so it's safe to always attach when interactive.
- Copy `ptStr` / `classes` computation verbatim from the current file.

CSS — in `app/public/app.css`, find the `.card-face` rule and add these declarations (do not remove existing ones):

```css
.card-face {
  touch-action: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}
```

- [ ] **Step 1: Apply the CardFace rewrite and CSS change**

TypeScript will now flag every consumer passing the removed props — expected; Task 5 fixes them. Verify only that existing unit tests still pass:

Run: `cd app && npm test`
Expected: all green (no existing test renders CardFace with the removed props; if one does, update it to the new prop names as part of this task).

- [ ] **Step 2: Commit**

```bash
git add app/src/components/CardFace.tsx app/public/app.css
git commit -m "feat: CardFace hosts pointer gestures (tap / long-press menu / drag)"
```

---

### Task 5: Wire all consumers (Battlefield, BottomBar, Hand, ZoneDrawer, ScryModal, GameView, PlaytestView, HoverPreview)

**Files:**
- Modify: `app/src/features/game/components/Battlefield.tsx`
- Modify: `app/src/features/game/components/BottomBar.tsx`
- Modify: `app/src/features/game/components/Hand.tsx`
- Modify: `app/src/features/game/components/ZoneDrawer.tsx`
- Modify: `app/src/features/game/components/ScryModal.tsx` (adapt to new CardFace props — inspect current usage first)
- Modify: `app/src/features/game/GameView.tsx`
- Modify: `app/src/features/playtest/PlaytestView.tsx`
- Modify: `app/src/components/HoverPreview.tsx`

**Interfaces:**
- Consumes: CardFace new props (Task 4), `useDragDrop` new return shape + `DragGhost` (Task 3), `openMenuAt` (Task 2).
- Produces: compiling, fully wired app. Prop renames listed below are exact.

**5a. Battlefield.tsx** — prop changes:

```ts
// OLD                                          NEW
onCardClick: (c: CardInstance) => void;      → onCardTap: (c: CardInstance) => void;
onCardContext: (e: React.MouseEvent, c) => void; → onCardMenu: (c: CardInstance, x: number, y: number) => void;
cardDragProps?: (id, "battlefield") => {draggable…} → cardGestureDrag?: (c: CardInstance, fromZone: "battlefield") => GestureDragHandlers;
creatureLaneDropProps / landLaneDropProps: DropZoneProps → { "data-dropzone": DropZone; className?: string }
```

Lane wrappers: replace `onDragOver/onDragLeave/onDrop` spreads with `data-dropzone={creatureLaneDropProps?.["data-dropzone"]}` — simplest is to spread: `<div className={…} {...(creatureLaneDropProps ?? {})}>` merging className manually as today. Card render:

```tsx
<CardFace
  card={c}
  zone="battlefield"
  onTap={() => onCardTap(c)}
  onMenu={(x, y) => onCardMenu(c, x, y)}
  gestureDrag={cardGestureDrag ? cardGestureDrag(c, "battlefield") : undefined}
  onMouseEnter={…unchanged…}
  onMouseLeave={…unchanged…}
  onMouseMove={onCardMouseMove}
/>
```

Header copy (`bf-zone-header`, creatures lane): replace "Click for detail · right-click for actions · drag to play" with:

```
Tap to tap/untap · hold or right-click for actions · drag to move
```

**5b. BottomBar.tsx** — same pattern: `onCardClick` → `onCardTap: (c: CardInstance) => void`; `onHandContext` → `onHandMenu: (c: CardInstance, x: number, y: number) => void`; `cardDragProps` → `cardGestureDrag?: (c: CardInstance, fromZone: "hand") => GestureDragHandlers`; `handDropProps?: { "data-dropzone": DropZone; className?: string }` spread onto the `.hand-area` div (keep the manual className merge). Hand card render mirrors 5a with `zone="hand"`.

**5c. Hand.tsx** — check for live usages (`grep -rn "from.*components/Hand\"" app/src`). If unused by any view, delete the file. If used, apply the 5b renames.

**5d. ZoneDrawer.tsx (ZoneCard)** — move handlers from the wrapper `<div>` onto CardFace:

```tsx
function openMenuAtPoint(x: number, y: number) {
  if (readOnly) return;
  setMenuPos({ x, y });
}

function handleTap(x: number, y: number) {
  if (readOnly) return;
  if (fromZone === "command") {
    toggleTap();
  } else {
    openMenuAtPoint(x, y);
  }
}
```

Wrapper div keeps only `style`/`title`/mouse-hover handlers; delete its `onClick`/`onContextMenu`. CardFace becomes:

```tsx
<CardFace card={card} zone={fromZone}
  onTap={readOnly ? undefined : handleTap}
  onMenu={readOnly ? undefined : openMenuAtPoint} />
```

(Hover preview handlers stay on the wrapper div — mouse-only, unaffected.)

**5e. ScryModal.tsx** — read its CardFace usage; if it passes `onClick`, rename to `onTap` (signature `(x, y) => void`, args ignorable); if display-only, no change.

**5f. GameView.tsx** —

```tsx
// handlers (replace onCardClick/onBattlefieldContext/onHandContext):
function onCardTap(c: CardInstance) { setDetailCard(c); }
function onBattlefieldTap(c: CardInstance) { toggleZoneCardTap(c, "battlefield", mine, actions, err); }
function onBattlefieldMenu(c: CardInstance, x: number, y: number) {
  openMenuAt(x, y, buildBattlefieldMenu(c, menuHandlers));
}
function onHandMenu(c: CardInstance, x: number, y: number) {
  openMenuAt(x, y, buildHandMenu(c, menuHandlers));
}
```

Destructure `openMenuAt` from `useContextMenu()`. JSX wiring:

```tsx
<Battlefield … onCardTap={onBattlefieldTap} onCardMenu={onBattlefieldMenu}
  cardGestureDrag={(c) => dragDrop.cardGestureDrag(c, "battlefield")}
  creatureLaneDropProps={dragDrop.dropZoneProps("battlefield-creatures")}
  landLaneDropProps={dragDrop.dropZoneProps("battlefield-lands")} />

<BottomBar … onCardTap={onCardTap} onHandMenu={onHandMenu}
  handDropProps={dragDrop.dropZoneProps("hand")}
  cardGestureDrag={(c) => dragDrop.cardGestureDrag(c, "hand")} />

{dragDrop.ghost && <DragGhost ghost={dragDrop.ghost} />}
```

(`DragGhost` rendered once near the ContextMenu render at the end of the layout.)

**5g. PlaytestView.tsx** — identical renames/wiring as 5f (its handlers at ~lines 147–160 mirror GameView's; drag wiring at ~294–332). Also render `<DragGhost>`.

**5h. HoverPreview.tsx** — in the `useHoverPreview` hook's show/enter path, bail out on touch-primary devices:

```ts
const noHover = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
// in the mouseenter/show handler: if (noHover) return;
```

(Prevents a stale preview flash from iOS-synthesized mouseenter after taps.)

- [ ] **Step 1: Apply 5a–5h**

- [ ] **Step 2: Type-check and test**

Run: `npm run build:app` (repo root) — expect clean compile.
Run: `cd app && npm test` — all green. Fix any test referencing renamed props.

- [ ] **Step 3: Commit**

```bash
git add -A app/src
git commit -m "feat: wire pointer gestures through game and playtest views"
```

---

### Task 6: Version bump, runtime verification, PR

**Files:**
- Modify: `app/package.json` (version `1.1.0` → `1.2.0`)

- [ ] **Step 1: Bump version**

In `app/package.json` set `"version": "1.2.0"`.

- [ ] **Step 2: Full test + build**

Run: `cd app && npm test` → all green.
Run: `npm run build:app` (repo root) → clean build.

- [ ] **Step 3: Runtime verification (use the project `verify` skill)**

With DevTools touch emulation (and normal mouse), in a playtest session verify:
1. Mouse: click battlefield card taps/untaps; right-click opens menu; drag hand→battlefield plays card (ghost follows cursor, lane highlights); drag battlefield→hand returns card; menu closes on outside click and Escape.
2. Touch emulation: tap battlefield card taps/untaps; tap hand card opens detail modal; long-press (hold ~600ms) opens action menu, release does not select an item; touch-drag hand→battlefield plays card; long-press library/graveyard tile in zone drawer opens menu; outside tap dismisses menu.

- [ ] **Step 4: Commit, push, open PR**

```bash
git add app/package.json docs/superpowers/plans/2026-07-09-touch-gestures.md
git commit -m "chore: bump version to 1.2.0 for touch gesture support"
git push -u origin feature/touch-gestures
gh pr create --base main --title "feat: touch gesture support for cards (tap / long-press / drag)" --body "…summary per repo convention…"
```

PR body must summarize: unified pointer gesture layer, tap = left click, long-press = right click, pointer-based drag replacing HTML5 DnD, coarse-pointer menu sizing, hover-preview guard. End with the Claude Code attribution footer. **Stop after opening the PR — user reviews and merges manually.**
