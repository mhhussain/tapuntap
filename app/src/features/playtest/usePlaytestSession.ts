import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GameAction, PlayerPublic } from "../../types";
import type { PlaytestSession } from "./engine/types";
import { applyGameAction } from "./engine/actions";
import { loadSession, saveSession } from "./store";

export interface PlaytestActions {
  setLife: (life: number) => Promise<unknown>;
  setPoison: (poison: number) => Promise<unknown>;
  writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) => Promise<unknown>;
  setCounters: (counters: Record<string, number>) => Promise<unknown>;
  setNotes: (notes: string) => Promise<unknown>;
  action: (a: GameAction) => Promise<unknown>;
  endGame: (winnerUid?: string) => Promise<unknown>;
}

function firstSeatUid(s: PlaytestSession | null | undefined): string {
  return s?.game.seatUids[0] ?? "seat-1";
}

export function usePlaytestSession(sessionId: string | undefined) {
  const [session, setSession] = useState<PlaytestSession | null | undefined>(() =>
    sessionId ? loadSession(sessionId) : null
  );
  const [controlledUid, setControlledUid] = useState<string>(() => firstSeatUid(session));

  // Mirrors `session` so `mutate` can always read the latest value even when
  // multiple mutations are issued synchronously in the same tick (e.g. a
  // double-click). Without this, two calls in one tick would both close over
  // the same stale `session` state and the second commit would clobber the
  // first (lost update).
  const sessionRef = useRef<PlaytestSession | null | undefined>(session);

  // Re-load when the route param (sessionId) changes, and guard controlledUid
  // membership in the freshly loaded session's seatUids.
  useEffect(() => {
    const next = sessionId ? loadSession(sessionId) : null;
    sessionRef.current = next;
    setSession(next);
    setControlledUid((prev) => (next && next.game.seatUids.includes(prev) ? prev : firstSeatUid(next)));
  }, [sessionId]);

  const commit = useCallback((next: PlaytestSession) => {
    next.updatedAt = Date.now();
    next.game.updatedAt = next.updatedAt;
    saveSession(next);
    sessionRef.current = next;
    setSession(next);
  }, []);

  // Wrap a synchronous session mutation in the promise contract components expect.
  const mutate = useCallback(
    (fn: (s: PlaytestSession) => PlaytestSession): Promise<unknown> => {
      try {
        const current = sessionRef.current;
        if (!current) throw new Error("Session not loaded");
        commit(fn(current));
        return Promise.resolve({ ok: true });
      } catch (e) {
        return Promise.reject(e);
      }
    },
    [commit]
  );

  const actions: PlaytestActions = useMemo(
    () => ({
      setLife: (life) => mutate((s) => patchPlayer(s, controlledUid, { life })),
      setPoison: (poison) => mutate((s) => patchPlayer(s, controlledUid, { poison })),
      writePublicZones: (patch) => mutate((s) => patchPlayer(s, controlledUid, patch)),
      setCounters: (counters) => mutate((s) => patchPlayer(s, controlledUid, { counters })),
      setNotes: (notes) => mutate((s) => ({ ...s, game: { ...s.game, notes } })),
      action: (a) => mutate((s) => applyGameAction(s, controlledUid, a)),
      endGame: () => Promise.resolve({ ok: true }), // unused: playtest has no complete status
    }),
    [mutate, controlledUid]
  );

  return { session, controlledUid, setControlledUid, actions };
}

function patchPlayer(s: PlaytestSession, uid: string, patch: Partial<PlayerPublic>): PlaytestSession {
  return { ...s, players: { ...s.players, [uid]: { ...s.players[uid], ...patch } } };
}
