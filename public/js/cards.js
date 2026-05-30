import { db } from "./firebase.js";
import { doc, getDoc, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const SCRY = "https://api.scryfall.com";

export async function searchCards(q, page = 1) {
  const url = `${SCRY}/cards/search?q=${encodeURIComponent(q)}&order=name&page=${page}`;
  const r = await fetch(url);
  if (r.status === 404) return { data: [], total_cards: 0, has_more: false };
  if (!r.ok) throw new Error("Search failed");
  return r.json();
}

export async function getCardByName(name) {
  const r = await fetch(`${SCRY}/cards/named?fuzzy=${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error("Card not found");
  const card = await r.json();
  cacheCard(card);
  return card;
}

export async function getCard(id) {
  const cached = await getDoc(doc(db, "cards", id));
  if (cached.exists()) return cached.data();
  const r = await fetch(`${SCRY}/cards/${id}`);
  if (!r.ok) throw new Error("Card not found");
  const card = await r.json();
  cacheCard(card);
  return card;
}

function cacheCard(card) {
  setDoc(doc(db, "cards", card.id), { ...card, cachedAt: Date.now() }).catch(() => {});
}
