import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import type { Deck, DeckCardEntry } from "../types";

function uid(): string {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("Not signed in");
  return u;
}
function decksCol() {
  return collection(db, "users", uid(), "decks");
}

export interface DeckSummary {
  id: string; name: string; format: string;
  commander: DeckCardEntry | null; colors: string[];
  cardCount: number; version: number; updatedAt: number;
}

export async function listDecks(): Promise<DeckSummary[]> {
  const snap = await getDocs(decksCol());
  return snap.docs.map((d) => {
    const x = d.data() as any;
    return {
      id: d.id, name: x.name, format: x.format,
      commander: x.commander || null, colors: x.commander?.colors || [],
      cardCount: (x.cards || []).reduce((s: number, c: any) => s + (c.quantity || 0), 0),
      version: x.version, updatedAt: x.updatedAt?.toMillis?.() ?? 0,
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDeck(id: string): Promise<Deck> {
  const s = await getDoc(doc(decksCol(), id));
  if (!s.exists()) throw new Error("Deck not found");
  const data = s.data() as any;
  return {
    id: s.id, ownerUid: data.ownerUid, name: data.name, format: data.format,
    commander: data.commander || null, cards: data.cards || [], version: data.version,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toMillis?.() ?? null,
  };
}

export async function createDeck(input: { name: string; format?: string; commander?: DeckCardEntry | null; cards?: DeckCardEntry[]; changelog?: string }): Promise<{ id: string }> {
  const ref = await addDoc(decksCol(), {
    ownerUid: uid(), name: input.name, format: input.format || "commander",
    commander: input.commander || null, cards: input.cards || [], version: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await setDoc(doc(ref, "versions", "1"), {
    version: 1, timestamp: serverTimestamp(),
    changelog: input.changelog || "Initial version", cards: input.cards || [],
  });
  return { id: ref.id };
}

export async function updateDeck(id: string, input: Partial<{ name: string; format: string; commander: DeckCardEntry | null; cards: DeckCardEntry[]; changelog: string }>): Promise<void> {
  const ref = doc(decksCol(), id);
  const cur = await getDoc(ref);
  if (!cur.exists()) throw new Error("Deck not found");
  const d = cur.data() as any;
  const newVersion = (d.version || 1) + 1;
  const newCards = input.cards ?? d.cards;
  await updateDoc(ref, {
    name: input.name ?? d.name, format: input.format ?? d.format,
    commander: input.commander !== undefined ? input.commander : d.commander,
    cards: newCards, version: newVersion, updatedAt: serverTimestamp(),
  });
  await setDoc(doc(ref, "versions", String(newVersion)), {
    version: newVersion, timestamp: serverTimestamp(),
    changelog: input.changelog || `Version ${newVersion}`, cards: newCards,
  });
}

export interface DeckVersion {
  version: number;
  timestamp: number | null;
  changelog: string;
  cards: DeckCardEntry[];
}

export async function getDeckVersions(id: string): Promise<DeckVersion[]> {
  const snap = await getDocs(collection(doc(decksCol(), id), "versions"));
  return snap.docs.map((d) => {
    const x = d.data() as any;
    return {
      version: x.version,
      timestamp: x.timestamp?.toMillis?.() ?? null,
      changelog: x.changelog || "",
      cards: x.cards || [],
    };
  }).sort((a, b) => b.version - a.version);
}

export async function deleteDeck(id: string): Promise<void> {
  const ref = doc(decksCol(), id);
  const versions = await getDocs(collection(ref, "versions"));
  await Promise.all(versions.docs.map((v) => deleteDoc(v.ref)));
  await deleteDoc(ref);
}
