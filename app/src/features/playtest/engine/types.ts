import type { GameDoc, PlayerPublic, PlayerPrivate, LogEntry, Deck } from "../../../types";

export interface PlaytestSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  game: GameDoc;                              // status always "active"
  players: Record<string, PlayerPublic>;      // keyed by seat uid ("seat-1"...)
  privates: Record<string, PlayerPrivate>;    // keyed by seat uid
  log: LogEntry[];
}

export interface PlaytestSummary {
  id: string;
  name: string;
  format: string;
  deckNames: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SeatSetup {
  deck: Deck;           // full deck snapshot (cards + commander)
}
