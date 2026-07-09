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

  // Guards against multi-touch re-entry: a second finger touching the card
  // while a gesture is already in progress must not abort it.
  const activePointerIdRef = useRef<number | null>(null);

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
      style={{ ["--card-tone" as string]: tone } as React.CSSProperties}
      data-zone={zone}
      title={`${card.name}${ptStr ? ` • ${ptStr}` : ""}`}
      onPointerDown={
        interactive
          ? (e) => {
              if (activePointerIdRef.current !== null) return; // ignore second finger
              if (e.button !== 0 && e.pointerType === "mouse") return; // right/middle: let contextmenu fire
              activePointerIdRef.current = e.pointerId;
              e.preventDefault(); // suppress compatibility mouse events / synthesized click / selection
              e.currentTarget.setPointerCapture(e.pointerId);
              recognizer.down(e.clientX, e.clientY);
            }
          : undefined
      }
      onPointerMove={
        interactive
          ? (e) => {
              if (e.pointerId !== activePointerIdRef.current) return;
              recognizer.move(e.clientX, e.clientY);
            }
          : undefined
      }
      onPointerUp={
        interactive
          ? (e) => {
              if (e.pointerId !== activePointerIdRef.current) return;
              activePointerIdRef.current = null;
              recognizer.up(e.clientX, e.clientY);
            }
          : undefined
      }
      onPointerCancel={
        interactive
          ? (e) => {
              if (e.pointerId !== activePointerIdRef.current) return;
              activePointerIdRef.current = null;
              recognizer.cancel();
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
