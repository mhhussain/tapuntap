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
