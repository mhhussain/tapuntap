import { db, functions } from "./firebase.js";
import { currentUid, currentUser } from "./auth.js";
import { searchCards, getCard, getCardByName } from "./cards.js";
import {
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  serverTimestamp, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-functions.js";

const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

function decksCol() { return collection(db, "users", currentUid(), "decks"); }

/** Convert a Firestore Timestamp (or null) to an ISO string, or pass through if already a string/number */
function tsToIso(ts) {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate().toISOString();
  return ts;
}

export const api = {
  // Cards — direct to Scryfall with optional Firestore cache
  searchCards: (q, page = 1) => searchCards(q, page),
  getCard: (id) => getCard(id),
  getCardByName: (name) => getCardByName(name),

  // Decks — Firestore
  async listDecks() {
    const snap = await getDocs(decksCol());
    return snap.docs.map(d => {
      const x = d.data();
      const updatedAt = x.updatedAt?.toMillis?.() ?? x.updatedAt ?? 0;
      return {
        id: d.id,
        name: x.name,
        format: x.format,
        commander: x.commander || null,
        colors: x.commander?.colors || [],
        cardCount: (x.cards || []).reduce((s, c) => s + (c.quantity || 0), 0),
        version: x.version,
        updatedAt
      };
    }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  },

  async getDeck(id) {
    const ref = doc(decksCol(), id);
    const s = await getDoc(ref);
    if (!s.exists()) throw new Error("Deck not found");
    const data = s.data();

    // Fetch versions subcollection and embed as array (for backward-compat with views)
    const versSnap = await getDocs(collection(ref, "versions"));
    const versions = versSnap.docs.map(vd => {
      const v = vd.data();
      return {
        ...v,
        timestamp: tsToIso(v.timestamp)
      };
    }).sort((a, b) => (a.version || 0) - (b.version || 0));

    return {
      id: s.id,
      ...data,
      updatedAt: tsToIso(data.updatedAt),
      createdAt: tsToIso(data.createdAt),
      versions
    };
  },

  async createDeck(data) {
    const uid = currentUid();
    const ref = await addDoc(decksCol(), {
      ownerUid: uid,
      name: data.name,
      format: data.format || "commander",
      commander: data.commander || null,
      cards: data.cards || [],
      version: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(ref, "versions", "1"), {
      version: 1,
      timestamp: serverTimestamp(),
      changelog: data.changelog || "Initial version",
      cards: data.cards || []
    });
    return { id: ref.id };
  },

  async updateDeck(id, data) {
    const ref = doc(decksCol(), id);
    const cur = await getDoc(ref);
    if (!cur.exists()) throw new Error("Deck not found");
    const curData = cur.data();
    const newVersion = (curData.version || 1) + 1;
    const newCards = data.cards ?? curData.cards;
    await updateDoc(ref, {
      name: data.name ?? curData.name,
      format: data.format ?? curData.format,
      commander: data.commander !== undefined ? data.commander : curData.commander,
      cards: newCards,
      version: newVersion,
      updatedAt: serverTimestamp()
    });
    await setDoc(doc(ref, "versions", String(newVersion)), {
      version: newVersion,
      timestamp: serverTimestamp(),
      changelog: data.changelog || `Version ${newVersion}`,
      cards: newCards
    });
    return {
      id,
      name: data.name ?? curData.name,
      format: data.format ?? curData.format,
      commander: data.commander !== undefined ? data.commander : curData.commander,
      cards: data.cards ?? curData.cards,
      version: newVersion,
      createdAt: tsToIso(curData.createdAt),
      updatedAt: new Date().toISOString(),
      versions: curData.versions ?? []
    };
  },

  async deleteDeck(id) {
    const ref = doc(decksCol(), id);
    const versionsSnap = await getDocs(collection(ref, "versions"));
    await Promise.all(versionsSnap.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(ref);
    return { success: true };
  },

  async getDeckVersions(id) {
    const snap = await getDocs(collection(doc(decksCol(), id), "versions"));
    return snap.docs.map(d => {
      const v = d.data();
      return { id: d.id, ...v, timestamp: tsToIso(v.timestamp) };
    }).sort((a, b) => (b.version || 0) - (a.version || 0));
  },

  // Games — still served via Express (single-player)
  listGames: () => req('/games'),
  getGame: (id) => req(`/games/${id}`),
  saveGame: (id, data) => req(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (id) => req(`/games/${id}`, { method: 'DELETE' }),

  // Games — Firestore callable (multiplayer)
  createGame: (d) => httpsCallable(functions, "createGame")({ ...d, displayName: currentUser()?.displayName }).then(r => r.data),
  joinGame:   (d) => httpsCallable(functions, "joinGame")({ ...d, displayName: currentUser()?.displayName }).then(r => r.data),
  startGame:  (gameId) => httpsCallable(functions, "startGame")({ gameId }).then(r => r.data),
  subscribeGame: (gameId, cb) => onSnapshot(doc(db, "games", gameId), s => cb(s.exists() ? { id: s.id, ...s.data() } : null)),
};
