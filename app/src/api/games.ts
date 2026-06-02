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
export const toggleReady = (gameId: string) => call("toggleReady")({ gameId });
export const removePlayer = (gameId: string, targetUid: string) => call("removePlayer")({ gameId, targetUid });

export const setNotes = (gameId: string, notes: string) =>
  updateDoc(doc(db, "games", gameId), { notes });
