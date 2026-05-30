import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { makeCode } from "./lib/invite.js";

if (!getApps().length) initializeApp();
const db = getFirestore();

async function uniqueCode(database) {
  for (let i = 0; i < 10; i++) {
    const code = makeCode(4);
    const dup = await database.collection("games")
      .where("inviteCode", "==", code)
      .where("status", "in", ["lobby", "active"]).limit(1).get();
    if (dup.empty) return code;
  }
  throw new HttpsError("resource-exhausted", "Could not allocate invite code");
}

export async function _createGame(uid, data, database) {
  const { name, format, deckId } = data || {};
  if (!name || !deckId) throw new HttpsError("invalid-argument", "name and deckId required");
  const deck = await database.doc(`users/${uid}/decks/${deckId}`).get();
  if (!deck.exists) throw new HttpsError("not-found", "Deck not found");
  const code = await uniqueCode(database);
  const ref = database.collection("games").doc();
  const seat = { seat: 0, uid, displayName: deck.data().ownerName || "Player",
    deckId, deckName: deck.data().name, ready: false };
  await ref.set({
    name, format: format || "commander", status: "lobby",
    hostUid: uid, inviteCode: code,
    seats: [seat], seatUids: [uid],
    turnOrder: [], turn: 0, activeSeat: 0,
    phase: "beginning", phaseIndex: 0,
    phases: ["beginning", "main1", "combat", "main2", "end"],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });
  return { gameId: ref.id, inviteCode: code };
}

export async function _joinGame(uid, data, database) {
  const { inviteCode, deckId } = data || {};
  if (!inviteCode || !deckId) throw new HttpsError("invalid-argument", "inviteCode and deckId required");
  const deck = await database.doc(`users/${uid}/decks/${deckId}`).get();
  if (!deck.exists) throw new HttpsError("not-found", "Deck not found");
  const q = await database.collection("games")
    .where("inviteCode", "==", inviteCode).where("status", "==", "lobby").limit(1).get();
  if (q.empty) throw new HttpsError("not-found", "Game not found");
  const ref = q.docs[0].ref;
  return database.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const g = snap.data();
    if (g.seatUids.includes(uid)) throw new HttpsError("already-exists", "Already joined");
    if (g.seats.length >= 4) throw new HttpsError("failed-precondition", "Game full");
    const seat = { seat: g.seats.length, uid, displayName: deck.data().ownerName || "Player",
      deckId, deckName: deck.data().name, ready: false };
    tx.update(ref, {
      seats: [...g.seats, seat], seatUids: [...g.seatUids, uid],
      updatedAt: FieldValue.serverTimestamp()
    });
    return { gameId: ref.id };
  });
}

export const createGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _createGame(req.auth.uid, req.data, db);
});

export const joinGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _joinGame(req.auth.uid, req.data, db);
});
