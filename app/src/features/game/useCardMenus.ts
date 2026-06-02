/**
 * useCardMenus — builds ContextMenu item lists for hand and battlefield cards.
 *
 * Routing rules (per §7 data & action mapping):
 *   - HAND / LIBRARY operations → gameAction (hidden-info; counts managed server-side)
 *   - Own public-zone moves (battlefield ↔ graveyard ↔ exile ↔ command) → client-direct writePublicZones
 *   - tap/untap, counters → client-direct
 *
 * Items with no backing action in useGameActions are OMITTED (noted below).
 *
 * OMITTED items (no backing action / deferred task):
 *   - "View card" — no card-detail modal yet (Task 13 seam: calls onView, a no-op placeholder)
 *   - "Custom counter" — no custom-counter input UI built yet; only +1/+1 and loyalty counters
 *     (standard named counters are supported via setCounters; custom text input is deferred)
 *   - "Scry" — no scry modal yet (Task 11); omitted from hand menu
 *   - "Mill" from hand — not a real MTG operation from hand; mill is library-only (gameAction mill
 *     operates on the library, not hand cards individually; omitted from hand menu)
 */

import type { MenuItem } from "../../components/ContextMenu";
import type { CardInstance, PlayerPublic } from "../../types";
import type { useGameActions } from "./useGameActions";
import { moveWithinPublicZones } from "./useGameActions";

type Actions = ReturnType<typeof useGameActions>;

interface CardMenuHandlers {
  gameId: string;
  actions: Actions;
  /** The caller's own public player doc (needed for client-direct zone mutations). */
  mine: PlayerPublic;
  /** Called when "View card" is selected — seam for Task 13. */
  onView: (card: CardInstance) => void;
  /** Bubble errors back to the caller's error handler. */
  onError: (p: Promise<unknown>) => void;
}

// ─── hand menu ────────────────────────────────────────────────────────────────
// All moves FROM hand go through gameAction (hidden-info zone).
export function buildHandMenu(card: CardInstance, h: CardMenuHandlers): MenuItem[] {
  const { gameId, actions, onView, onError } = h;

  return [
    { header: card.name },
    {
      label: "View card",
      onClick: () => onView(card),
    },
    "sep",
    { header: "Play" },
    {
      label: "Play to battlefield",
      onClick: () =>
        onError(
          actions.action({ type: "playFromHand", gameId, instanceId: card.instanceId, toZone: "battlefield" })
        ),
    },
    {
      label: "Play tapped",
      onClick: () =>
        onError(
          actions.action({ type: "playFromHand", gameId, instanceId: card.instanceId, toZone: "battlefield", tapped: true })
        ),
    },
    "sep",
    { header: "Move to" },
    {
      label: "To graveyard",
      onClick: () =>
        onError(
          actions.action({ type: "playFromHand", gameId, instanceId: card.instanceId, toZone: "graveyard" })
        ),
    },
    {
      label: "To exile",
      onClick: () =>
        onError(
          actions.action({ type: "playFromHand", gameId, instanceId: card.instanceId, toZone: "exile" })
        ),
    },
    {
      label: "To library (top)",
      onClick: () =>
        onError(
          actions.action({ type: "moveToLibrary", gameId, instanceId: card.instanceId, fromZone: "hand", position: "top" })
        ),
    },
    {
      label: "To library (bottom)",
      onClick: () =>
        onError(
          actions.action({ type: "moveToLibrary", gameId, instanceId: card.instanceId, fromZone: "hand", position: "bottom" })
        ),
    },
    {
      label: "To command zone",
      onClick: () =>
        onError(
          actions.action({ type: "playFromHand", gameId, instanceId: card.instanceId, toZone: "command" })
        ),
    },
  ];
}

// ─── battlefield menu ─────────────────────────────────────────────────────────
// tap/untap + counter adjustments → client-direct.
// Moves to/from hidden zones (hand, library) → gameAction.
// Moves within public zones (battlefield → graveyard/exile/command) → client-direct writePublicZones.
export function buildBattlefieldMenu(card: CardInstance, h: CardMenuHandlers): MenuItem[] {
  const { gameId, actions, mine, onView, onError } = h;

  const adjustCounter = (key: string, delta: number) => {
    const current = card.counters?.[key] ?? 0;
    const next = Math.max(0, current + delta);
    const updated = mine.battlefield.map((c) =>
      c.instanceId === card.instanceId
        ? { ...c, counters: { ...c.counters, [key]: next } }
        : c
    );
    onError(actions.writePublicZones({ battlefield: updated }));
  };

  const moveToPublic = (to: "graveyard" | "exile" | "command") => {
    const nextPub = moveWithinPublicZones(mine, card.instanceId, "battlefield", to);
    onError(
      actions.writePublicZones({
        battlefield: nextPub.battlefield,
        [to]: nextPub[to],
      })
    );
  };

  const toggleTap = () => {
    const updated = mine.battlefield.map((c) =>
      c.instanceId === card.instanceId ? { ...c, tapped: !c.tapped } : c
    );
    onError(actions.writePublicZones({ battlefield: updated }));
  };

  const removeToken = () => {
    const updated = mine.battlefield.filter((c) => c.instanceId !== card.instanceId);
    onError(actions.writePublicZones({ battlefield: updated }));
  };

  return [
    { header: card.name },
    {
      label: "View card",
      onClick: () => onView(card),
    },
    "sep",
    { header: "Tap" },
    {
      label: card.tapped ? "Untap" : "Tap",
      onClick: toggleTap,
    },
    "sep",
    { header: "Counters" },
    {
      label: "+1/+1 counter",
      onClick: () => adjustCounter("+1/+1", 1),
    },
    {
      label: "−1/−1 counter",
      onClick: () => adjustCounter("-1/-1", 1),
    },
    {
      label: "Loyalty +1",
      onClick: () => adjustCounter("loyalty", 1),
    },
    {
      label: "Loyalty −1",
      onClick: () => adjustCounter("loyalty", -1),
    },
    "sep",
    { header: "Move to" },
    {
      label: "To hand",
      onClick: () =>
        onError(
          actions.action({ type: "moveToHand", gameId, instanceId: card.instanceId, fromZone: "battlefield" })
        ),
    },
    {
      label: "To graveyard",
      onClick: () => moveToPublic("graveyard"),
    },
    {
      label: "To exile",
      onClick: () => moveToPublic("exile"),
    },
    {
      label: "To library (top)",
      onClick: () =>
        onError(
          actions.action({ type: "moveToLibrary", gameId, instanceId: card.instanceId, fromZone: "battlefield", position: "top" })
        ),
    },
    {
      label: "To library (bottom)",
      onClick: () =>
        onError(
          actions.action({ type: "moveToLibrary", gameId, instanceId: card.instanceId, fromZone: "battlefield", position: "bottom" })
        ),
    },
    {
      label: "To command zone",
      onClick: () => moveToPublic("command"),
    },
    ...(card.token
      ? [
          "sep" as const,
          {
            label: "Remove token",
            danger: true,
            onClick: removeToken,
          },
        ]
      : []),
  ];
}
