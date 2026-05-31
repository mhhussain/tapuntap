import { httpsCallable } from "firebase/functions";
import { doc, updateDoc } from "firebase/firestore";
import { functions, db, auth } from "../lib/firebase";
import type { GameAction } from "../types";

const call = <T = any>(name: string) => (payload: any) =>
  httpsCallable(functions, name)(payload).then((r) => r.data as T);

export const createGame = (d: { name: string; format: string; deckId: string }) =>
  call<{ gameId: string; inviteCode: string }>("createGame")({ ...d, displayName: auth.currentUser?.displayName });

export const joinGame = (d: { inviteCode: string; deckId: string }) =>
  call<{ gameId: string }>("joinGame")({ ...d, displayName: auth.currentUser?.displayName });

export const startGame = (gameId: string) => call("startGame")({ gameId });
export const leaveGame = (gameId: string) => call("leaveGame")({ gameId });
export const endGame = (gameId: string, winnerUid?: string) => call("endGame")({ gameId, winnerUid });
export const gameAction = (action: GameAction) => call("gameAction")(action);

// Toggling your own ready flag in a lobby seat: rules allow the host functions to own seats,
// so ready toggling also routes through a small Function in production. For the baseline we
// update via a dedicated callable if present; otherwise the host starts when all are seated.
// Simplest correct path: ready toggling is a client convenience persisted on the seat by a Function.
// To keep Phase 5 shippable, we treat "joined" as ready and gate Start on seats.length >= 2.

export const setNotes = (gameId: string, notes: string) =>
  updateDoc(doc(db, "games", gameId), { notes });
