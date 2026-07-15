import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, fireEvent, act } from "@testing-library/react";
import { CardFace } from "../components/CardFace";
import { LONG_PRESS_MS } from "../lib/gestures";
import type { CardInstance } from "../types";

// jsdom has no PointerEvent; without it fireEvent's pointer events carry no
// pointerId and the per-pointer filtering under test can't be exercised.
class PointerEventPolyfill extends MouseEvent {
  pointerId: number;
  pointerType: string;
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init);
    this.pointerId = init.pointerId ?? 0;
    this.pointerType = init.pointerType ?? "";
  }
}
if (typeof window !== "undefined" && !window.PointerEvent) {
  (window as unknown as { PointerEvent: typeof PointerEventPolyfill }).PointerEvent =
    PointerEventPolyfill;
}

const card: CardInstance = {
  instanceId: "i1",
  cardId: "c1",
  name: "Grizzly Bears",
  manaCost: "{1}{G}",
  cmc: 2,
  typeLine: "Creature — Bear",
  colors: ["G"],
  imageUri: null,
  imageUriBack: null,
  power: 2,
  toughness: 2,
  loyalty: null,
  tapped: false,
  transformed: false,
  faceDown: false,
  counters: {},
  attachedTo: null,
  token: false,
};

// Regression for the "card gets stuck after tap-and-hold" tablet bug.
//
// WebKit does not honor setPointerCapture for touch (bug 220196): once the
// finger's contact point drifts off the card during a long-press, pointerup is
// delivered to whatever is under the finger — never to the card. The old code
// only listened on the card element, so its activePointerId latch never
// cleared and every later pointerdown was ignored as a "second finger" until
// the component remounted. Terminal events must be handled at window level.
describe("CardFace gesture recovery when pointerup lands off-card", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  function pressAndHold(el: Element, pointerId: number) {
    fireEvent.pointerDown(el, {
      pointerId,
      pointerType: "touch",
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    act(() => {
      vi.advanceTimersByTime(LONG_PRESS_MS);
    });
  }

  it("still handles taps after a long-press whose pointerup fired elsewhere", () => {
    const onTap = vi.fn();
    const onMenu = vi.fn();
    const { container } = render(
      <CardFace card={card} zone="battlefield" onTap={onTap} onMenu={onMenu} />
    );
    const el = container.querySelector(".card-face")!;

    pressAndHold(el, 1);
    expect(onMenu).toHaveBeenCalledOnce();

    // Finger rolled off the card; WebKit delivers pointerup to the body.
    fireEvent.pointerUp(document.body, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 60,
      clientY: 60,
    });

    // The card must accept a fresh gesture.
    fireEvent.pointerDown(el, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(el, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    expect(onTap).toHaveBeenCalledOnce();
  });

  it("recovers even when no terminal event ever arrives for the lost pointer", () => {
    // Belt-and-braces: if the browser swallows pointerup AND pointercancel
    // entirely, the next pointerdown on the card must recover rather than be
    // ignored as a second finger of a gesture that will never end.
    const onTap = vi.fn();
    const onMenu = vi.fn();
    const { container } = render(
      <CardFace card={card} zone="battlefield" onTap={onTap} onMenu={onMenu} />
    );
    const el = container.querySelector(".card-face")!;

    pressAndHold(el, 1);
    expect(onMenu).toHaveBeenCalledOnce();
    // No pointerup / pointercancel for pointer 1 — it simply vanishes.

    fireEvent.pointerDown(el, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    fireEvent.pointerUp(el, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 10,
      clientY: 10,
    });
    expect(onTap).toHaveBeenCalledOnce();
  });

  it("ignores a genuine second finger while the first is still down", () => {
    const onTap = vi.fn();
    const { container } = render(
      <CardFace card={card} zone="battlefield" onTap={onTap} onMenu={vi.fn()} />
    );
    const el = container.querySelector(".card-face")!;

    fireEvent.pointerDown(el, {
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    // Second finger taps the card mid-gesture: must not fire onTap.
    fireEvent.pointerDown(el, {
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      clientX: 20,
      clientY: 20,
    });
    fireEvent.pointerUp(el, { pointerId: 2, pointerType: "touch", clientX: 20, clientY: 20 });
    expect(onTap).not.toHaveBeenCalled();

    // First finger completes its tap normally.
    fireEvent.pointerUp(el, { pointerId: 1, pointerType: "touch", clientX: 10, clientY: 10 });
    expect(onTap).toHaveBeenCalledOnce();
  });
});
