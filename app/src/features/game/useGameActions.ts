import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { gameAction, endGame } from "../../api/games";
import type { CardInstance, GameAction, PlayerPublic } from "../../types";

const PUBLIC_ZONES = ["battlefield", "graveyard", "exile", "command"] as const;
type PublicZone = (typeof PUBLIC_ZONES)[number];

/** Pure: move a card between the caller's OWN public zones (no hidden info). */
export function moveWithinPublicZones(pub: PlayerPublic, instanceId: string, from: PublicZone, to: PublicZone): PlayerPublic {
  const next: PlayerPublic = {
    ...pub,
    battlefield: [...(pub.battlefield || [])],
    graveyard: [...(pub.graveyard || [])],
    exile: [...(pub.exile || [])],
    command: [...(pub.command || [])],
  };
  const src = next[from] as CardInstance[];
  const idx = src.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return pub;
  const [card] = src.splice(idx, 1);
  if (from === "battlefield") { card.tapped = false; card.counters = {}; card.attachedTo = null; }
  (next[to] as CardInstance[]).push(card);
  return next;
}

export function useGameActions(gameId: string) {
  const uid = () => {
    const u = auth.currentUser?.uid;
    if (!u) throw new Error("Not signed in");
    return u;
  };
  const pubRef = () => doc(db, "games", gameId, "players", uid());

  return {
    // CLIENT-DIRECT (own, low-stakes) — write allowed by rules
    setLife: (life: number) => updateDoc(pubRef(), { life }),
    setPoison: (poison: number) => updateDoc(pubRef(), { poison }),
    writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) =>
      updateDoc(pubRef(), patch),
    setCounters: (counters: Record<string, number>) => updateDoc(pubRef(), { counters }),
    setNotes: (notes: string) => updateDoc(doc(db, "games", gameId), { notes }),

    // SERVER (hidden-info / cross-player / shared) — via callable
    action: (a: GameAction) => gameAction(a),
    endGame: (winnerUid?: string) => endGame(gameId, winnerUid),
  };
}
