import { useEffect, useState } from "react";
import {
  collection, doc, onSnapshot, query, orderBy, where, getDocs,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import type { GameDoc, PlayerPublic, PlayerPrivate, LogEntry } from "../types";
import { listDecks, type DeckSummary } from "./decks";

// Returns: undefined = loading (no snapshot yet), null = not found, object = loaded.
export function useGame(gameId: string | undefined) {
  const [game, setGame] = useState<GameDoc | null | undefined>(undefined);
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(doc(db, "games", gameId), (s) =>
      setGame(s.exists() ? ({ id: s.id, ...(s.data() as any) }) : null));
  }, [gameId]);
  return game;
}

export function usePlayersPublic(gameId: string | undefined) {
  const [players, setPlayers] = useState<Record<string, PlayerPublic>>({});
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(collection(db, "games", gameId, "players"), (snap) => {
      const next: Record<string, PlayerPublic> = {};
      snap.docs.forEach((d) => { next[d.id] = { uid: d.id, ...(d.data() as any) }; });
      setPlayers(next);
    });
  }, [gameId]);
  return players;
}

export function useMyPrivate(gameId: string | undefined) {
  const [priv, setPriv] = useState<PlayerPrivate>({ hand: [], library: [] });
  useEffect(() => {
    const u = auth.currentUser?.uid;
    if (!gameId || !u) return;
    return onSnapshot(doc(db, "games", gameId, "players", u, "private", "state"),
      (s) => setPriv(s.exists() ? (s.data() as PlayerPrivate) : { hand: [], library: [] }));
  }, [gameId]);
  return priv;
}

export function useLog(gameId: string | undefined) {
  const [log, setLog] = useState<LogEntry[]>([]);
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(query(collection(db, "games", gameId, "log"), orderBy("ts")),
      (snap) => setLog(snap.docs.map((d) => d.data() as LogEntry)));
  }, [gameId]);
  return log;
}

export function useMyDecks(refreshKey = 0) {
  const [decks, setDecks] = useState<DeckSummary[] | null>(null);
  const [error, setError] = useState<string>("");
  useEffect(() => {
    listDecks().then(setDecks).catch((e) => setError(e.message));
  }, [refreshKey]);
  return { decks, error };
}

export interface GameSummary extends GameDoc {}

export function useMyGames() {
  const [games, setGames] = useState<GameSummary[] | null>(null);
  useEffect(() => {
    const u = auth.currentUser?.uid;
    if (!u) return;
    const q = query(collection(db, "games"), where("seatUids", "array-contains", u), orderBy("updatedAt", "desc"));
    getDocs(q).then((snap) => setGames(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))))
      .catch(() => setGames([]));
  }, []);
  return games;
}
