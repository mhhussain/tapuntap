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
      // Reset here, not only on next down(): a mouse right-click never calls
      // down() (CardFace ignores non-primary buttons), so a stale true from an
      // earlier touch long-press would suppress its contextmenu forever.
      // Browsers that fire contextmenu for touch do so at the long-press
      // threshold, while the pointer is still down — before this reset.
      firedLongPress = false;
    },
    cancel() {
      if (state === "dragging") cb.onDragCancel?.();
      clearTimer();
      state = "idle";
      firedLongPress = false;
    },
    longPressFired() {
      return firedLongPress;
    },
  };
}
