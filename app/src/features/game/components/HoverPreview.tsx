/**
 * HoverPreview — enlarged floating card image on mouseenter.
 * pointer-events: none so it never interferes with drag or context menu.
 */

import { useState, useRef, useCallback } from "react";
import type { CardInstance } from "../../../types";

interface HoverAnchor {
  card: CardInstance;
  x: number;
  y: number;
}

/** Attach these event props to any card wrapper to trigger the hover preview. */
export function useHoverPreview() {
  const [anchor, setAnchor] = useState<HoverAnchor | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onMouseEnter = useCallback((e: React.MouseEvent, card: CardInstance) => {
    // Small delay avoids flash during fast mouse moves
    timerRef.current = setTimeout(() => {
      setAnchor({ card, x: e.clientX, y: e.clientY });
    }, 300);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnchor(null);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (anchor) {
      setAnchor((a) => (a ? { ...a, x: e.clientX, y: e.clientY } : null));
    }
  }, [anchor]);

  return { anchor, onMouseEnter, onMouseLeave, onMouseMove };
}

export function HoverPreview({ anchor }: { anchor: HoverAnchor | null }) {
  if (!anchor) return null;

  const { card, x, y } = anchor;
  const imageUri = card.transformed && card.imageUriBack ? card.imageUriBack : card.imageUri;
  if (!imageUri) return null;

  // Position preview to avoid viewport edges
  const previewW = 200;
  const previewH = 280;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const left = x + 20 + previewW > vw ? x - previewW - 20 : x + 20;
  const top = y + previewH > vh ? vh - previewH - 10 : y;

  return (
    <div
      style={{
        position: "fixed",
        left,
        top,
        width: previewW,
        height: previewH,
        pointerEvents: "none",
        zIndex: 9000,
        borderRadius: 10,
        overflow: "hidden",
        boxShadow: "0 8px 32px oklch(0 0 0 / 0.6)",
        border: "1px solid var(--line-2)",
      }}
    >
      <img
        src={imageUri}
        alt={card.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}
