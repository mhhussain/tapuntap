import { useEffect, useRef } from "react";
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

  // Guards against multi-touch re-entry: a second finger touching the card
  // while a gesture is already in progress must not abort it.
  const activePointerIdRef = useRef<number | null>(null);

  // Removes the window listeners of the in-flight gesture and clears the
  // pointer latch. Held in a ref so unmount mid-gesture can clean up too.
  const endGestureRef = useRef<(() => void) | null>(null);
  useEffect(() => () => endGestureRef.current?.(), []);

  // pointermove/pointerup/pointercancel are tracked on window, NOT on the
  // card element. WebKit does not honor setPointerCapture for touch (bug
  // 220196): once the finger's contact point drifts off the card — routine
  // during a 500ms hold — the card element stops receiving pointer events,
  // the latch never cleared, and the card was dead until remount ("stuck
  // card" tablet bug). Terminal events always reach window.
  function beginGesture(e: React.PointerEvent) {
    activePointerIdRef.current = e.pointerId;
    const isActive = (ev: PointerEvent) => ev.pointerId === activePointerIdRef.current;
    const onMove = (ev: PointerEvent) => {
      if (isActive(ev)) recognizer.move(ev.clientX, ev.clientY);
    };
    const onUp = (ev: PointerEvent) => {
      if (!isActive(ev)) return;
      endGestureRef.current?.();
      recognizer.up(ev.clientX, ev.clientY);
    };
    const onCancel = (ev: PointerEvent) => {
      if (!isActive(ev)) return;
      endGestureRef.current?.();
      recognizer.cancel();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    endGestureRef.current = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      activePointerIdRef.current = null;
      endGestureRef.current = null;
    };
    recognizer.down(e.clientX, e.clientY);
  }

  const tone = colorTone(card.colors || []);
  const imageUri = card.transformed && card.imageUriBack ? card.imageUriBack : card.imageUri;
  const ptStr = card.power != null && card.toughness != null
    ? `${card.power}/${card.toughness}`
    : card.loyalty != null
    ? `${card.loyalty}`
    : null;

  const classes = [
    "card-face",
    card.tapped ? "tapped" : "",
    card.summoningSick ? "summoning-sick" : "",
    isLand(card.typeLine) ? "is-land" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{
        ["--card-tone" as string]: tone,
        // .card-face sets touch-action:none for the gesture recognizer; undo it
        // on non-interactive cards (read-only drawer views) so a touch scroll
        // that starts on a card still scrolls the container.
        touchAction: interactive ? undefined : "auto",
      } as React.CSSProperties}
      data-zone={zone}
      title={`${card.name}${ptStr ? ` • ${ptStr}` : ""}`}
      onPointerDown={
        interactive
          ? (e) => {
              if (activePointerIdRef.current !== null) {
                // A gesture is already latched. If it can still emit (finger
                // pressed or dragging), this is a genuine second finger —
                // ignore it. If it is settled (long-press already fired) and
                // its pointerup was lost to the WebKit capture bug, reclaim
                // the card instead of staying stuck until remount.
                if (!recognizer.settled()) return;
                endGestureRef.current?.();
              }
              if (e.button !== 0 && e.pointerType === "mouse") return; // right/middle: let contextmenu fire
              e.preventDefault(); // suppress compatibility mouse events / synthesized click / selection
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                // Pointer may already be inactive; window listeners carry the
                // gesture regardless of capture.
              }
              beginGesture(e);
            }
          : undefined
      }
      onTouchEnd={
        interactive
          ? (e) => {
              // Suppress the tap-synthesized `click`. preventDefault() on
              // pointerdown suppresses compatibility mouse events but NOT the
              // click (it is not a compatibility mouse event per the Pointer
              // Events spec). Because touch mousedown/mouseup were suppressed,
              // the browser hit-tests that click fresh at the touch point — so
              // if onTap just opened an overlay (e.g. CardDetailModal), the
              // click lands on the new backdrop and instantly closes it.
              // Canceling touchend is the spec way to suppress the click.
              if (e.cancelable) e.preventDefault();
            }
          : undefined
      }
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
      <div className="card-color-bar" style={{ background: tone }} />
      {imageUri ? (
        <img className="card-img-fill" src={imageUri} alt={card.name} loading="lazy" />
      ) : (
        <>
          <div className="card-name">{card.name}</div>
          <div className="card-art" />
          <div className="card-foot">
            {ptStr && <span className="card-pt">{ptStr}</span>}
          </div>
        </>
      )}
      {Object.entries(card.counters || {})
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="card-counter">
            {k !== "n" ? `${k}:${v}` : `+${v}`}
          </div>
        ))}
      {card.token && <div className="card-token-badge">TKN</div>}
    </div>
  );
}
