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
