import type { PlaytestSession, PlaytestSummary, SeatSetup } from "./engine/types";
import { newSession } from "./engine/deal";

const INDEX_KEY = "tapuntap.playtest.index";
const sessionKey = (id: string) => `tapuntap.playtest.session.${id}`;

function readIndex(): PlaytestSummary[] {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    return raw ? (JSON.parse(raw) as PlaytestSummary[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(idx: PlaytestSummary[]): void {
  localStorage.setItem(INDEX_KEY, JSON.stringify(idx));
}

function toSummary(s: PlaytestSession): PlaytestSummary {
  return {
    id: s.id, name: s.game.name, format: s.game.format,
    deckNames: s.game.seats.map((x) => x.deckName),
    createdAt: s.createdAt, updatedAt: s.updatedAt,
  };
}

export function listSessions(): PlaytestSummary[] {
  return readIndex().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function loadSession(id: string): PlaytestSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(id));
    return raw ? (JSON.parse(raw) as PlaytestSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(s: PlaytestSession): void {
  localStorage.setItem(sessionKey(s.id), JSON.stringify(s));
  const idx = readIndex().filter((x) => x.id !== s.id);
  idx.push(toSummary(s));
  writeIndex(idx);
}

export function deleteSession(id: string): void {
  localStorage.removeItem(sessionKey(id));
  writeIndex(readIndex().filter((x) => x.id !== id));
}

export function createSession(name: string, format: string, seats: SeatSetup[]): PlaytestSession {
  const s = newSession(name, format, seats);
  saveSession(s);
  return s;
}
