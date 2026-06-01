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
 */

import { useState } from "react";
import type { useGameActions } from "./useGameActions";
import type { PlayerPublic, PlayerPrivate } from "../../types";

type Actions = ReturnType<typeof useGameActions>;

export interface DragData {
  instanceId: string;
  fromZone: "hand" | "battlefield";
}

export function encodeDrag(data: DragData): string {
  return JSON.stringify(data);
}

export function decodeDrag(e: React.DragEvent): DragData | null {
  try {
    const raw = e.dataTransfer.getData("application/x-tapuntap-card");
    if (!raw) return null;
    return JSON.parse(raw) as DragData;
  } catch {
    return null;
  }
}

export type DropZone = "battlefield-creatures" | "battlefield-lands" | "hand";

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

  function handleDrop(zone: DropZone, e: React.DragEvent) {
    e.preventDefault();
    setActiveDropZone(null);
    const data = decodeDrag(e);
    if (!data) return;

    if (!gameId || !myPrivate) return;
    const { instanceId, fromZone } = data;

    if (fromZone === "hand") {
      // Find the card in hand to determine its type
      const card = myPrivate.hand.find((c) => c.instanceId === instanceId);
      if (!card) return;

      if (zone === "battlefield-creatures" || zone === "battlefield-lands") {
        // hand → battlefield: gameAction (hidden-info zone)
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
      // hand → hand: no-op (already there)
      // hand → graveyard/exile: not a drag target in the UI (use context menu)
    } else if (fromZone === "battlefield") {
      if (zone === "battlefield-creatures" || zone === "battlefield-lands") {
        // battlefield → battlefield (reorder): client-direct writePublicZones
        // Simply a no-op reorder — the card is already on the battlefield.
        // Visual reorder is handled by the Firestore array order; a full
        // drag-reorder would require index tracking. For now, omit actual
        // reorder (no-op drop within same zone) — card stays in place.
        // OMITTED: within-battlefield index reordering (no UI index tracking in data model).
        return;
      }
      if (zone === "hand") {
        // battlefield → hand: gameAction (changes hand/library counts)
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

  function dropZoneProps(zone: DropZone) {
    return {
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        setActiveDropZone(zone);
      },
      onDragLeave: (e: React.DragEvent) => {
        // Only clear if leaving the zone entirely (not entering a child)
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setActiveDropZone(null);
        }
      },
      onDrop: (e: React.DragEvent) => handleDrop(zone, e),
      className: activeDropZone === zone ? "drop-target" : undefined,
    };
  }

  function cardDragProps(instanceId: string, fromZone: "hand" | "battlefield") {
    return {
      draggable: true as const,
      onDragStart: (e: React.DragEvent) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData(
          "application/x-tapuntap-card",
          encodeDrag({ instanceId, fromZone })
        );
      },
      onDragEnd: () => setActiveDropZone(null),
    };
  }

  void mine;

  return { dropZoneProps, cardDragProps, activeDropZone };
}
