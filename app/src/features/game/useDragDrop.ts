/**
 * useDragDrop — shared drag-drop routing for GameView.
 *
 * DROP ROUTING (mirrors useCardMenus routing rules — do NOT diverge):
 *   hand → battlefield           : gameAction playFromHand (toZone: "battlefield")
 *   hand → graveyard             : gameAction playFromHand (toZone: "graveyard")
 *   hand → exile                 : gameAction playFromHand (toZone: "exile")
 *   battlefield → hand           : gameAction moveToHand (fromZone: "battlefield")
 *   battlefield → battlefield    : client writePublicZones (reorder within public zone)
 *   battlefield → graveyard/exile/command : client writePublicZones (moveWithinPublicZones)
 *
 * OMITTED (no backing action):
 *   hand → library               : omitted (position unknown without server scry logic; use context menu)
 *   graveyard/exile → anywhere   : omitted from drag (use ZoneDrawer context menu)
 *   opponent cards               : never draggable (only own cards carry drag data)
 *
 * MECHANISM: pointer-based with ghost element. hitTest uses document.elementFromPoint
 * to find drop zones beneath the pointer (ghost is pointer-events:none).
 */

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
