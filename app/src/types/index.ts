export interface CardInstance {
  instanceId: string;
  cardId: string;
  name: string;
  manaCost: string;
  cmc: number;
  typeLine: string;
  colors: string[];
  imageUri: string | null;
  imageUriBack: string | null;
  power: number | string | null;
  toughness: number | string | null;
  loyalty: number | string | null;
  tapped: boolean;
  transformed: boolean;
  faceDown: boolean;
  summoningSick?: boolean;
  counters: Record<string, number>;
  attachedTo: string | null;
  token: boolean;
}

export interface DeckCardEntry {
  cardId: string;
  name: string;
  quantity: number;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  colors?: string[];
  imageUri?: string | null;
  imageUriBack?: string | null;
  power?: number | string | null;
  toughness?: number | string | null;
  loyalty?: number | string | null;
}

export interface Deck {
  id: string;
  ownerUid: string;
  name: string;
  format: string;
  commander: DeckCardEntry | null;
  cards: DeckCardEntry[];
  version: number;
  createdAt?: string | null;
  updatedAt?: number | string | null;
}

export interface Seat {
  seat: number;
  uid: string;
  displayName: string;
  deckId: string;
  deckName: string;
  ready: boolean;
}

export type GameStatus = "lobby" | "active" | "complete";

export interface GameDoc {
  id: string;
  name: string;
  status: GameStatus;
  hostUid: string;
  inviteCode: string;
  format: string;
  seats: Seat[];
  seatUids: string[];
  turnOrder: string[];
  turn: number;
  activeSeat: number;
  phase: string;
  phaseIndex: number;
  phases: string[];
  notes?: string;
  winnerUid?: string | null;
  updatedAt?: number | null;
}

export interface PlayerPublic {
  uid: string;
  seat: number;
  displayName: string;
  life: number;
  poison: number;
  energy: number;
  counters: Record<string, number>;
  battlefield: CardInstance[];
  graveyard: CardInstance[];
  exile: CardInstance[];
  command: CardInstance[];
  handCount: number;
  libraryCount: number;
}

export interface PlayerPrivate {
  hand: CardInstance[];
  library: CardInstance[];
}

export interface LogEntry {
  ts: number | null;
  turn?: number;
  who?: string;
  seat?: number;
  text: string;
}

// Discriminated union for the server-side gameAction callable (Phase 4 backend).
export type GameAction =
  | { type: "draw"; gameId: string; count: number }
  | { type: "mill"; gameId: string; count: number }
  | { type: "scry"; gameId: string; order: string[] /* instanceIds top->bottom */; toBottom: string[] }
  | { type: "shuffleLibrary"; gameId: string }
  | { type: "shuffleGraveyardIntoLibrary"; gameId: string }
  | { type: "moveToHand"; gameId: string; instanceId: string; fromZone: "battlefield" | "graveyard" | "exile" | "command" | "library" }
  | { type: "moveToLibrary"; gameId: string; instanceId: string; fromZone: "battlefield" | "graveyard" | "exile" | "command" | "hand"; position: "top" | "bottom" }
  | { type: "tutorToHand"; gameId: string; instanceId: string }
  | { type: "playFromHand"; gameId: string; instanceId: string; toZone: "battlefield" | "graveyard" | "exile" | "command"; tapped?: boolean }
  | { type: "adjustOpponentLife"; gameId: string; targetUid: string; delta: number }
  | { type: "advancePhase"; gameId: string; direction: "next" | "prev" }
  | { type: "endTurn"; gameId: string };
