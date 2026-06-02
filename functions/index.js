import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { makeCode } from "./lib/invite.js";
import { buildSeatState } from "./lib/deal.js";
import { handleGameAction } from "./lib/actions.js";

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
  const seat = { seat: 0, uid, displayName: data.displayName || "Player",
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
    if (g.status !== "lobby") throw new HttpsError("failed-precondition", "Game already started");
    if (g.seatUids.includes(uid)) throw new HttpsError("already-exists", "Already joined");
    if (g.seats.length >= 4) throw new HttpsError("failed-precondition", "Game full");
    const seat = { seat: g.seats.length, uid, displayName: data.displayName || "Player",
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

export async function _startGame(uid, data, database) {
  const { gameId } = data || {};
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");
  const ref = database.doc(`games/${gameId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found");
  const g = snap.data();
  if (g.hostUid !== uid) throw new HttpsError("permission-denied", "Host only");
  if (g.status !== "lobby") throw new HttpsError("failed-precondition", "Not in lobby");

  const seatStates = await Promise.all(g.seats.map(async (seat) => {
    const deckSnap = await database.doc(`users/${seat.uid}/decks/${seat.deckId}`).get();
    if (!deckSnap.exists) throw new HttpsError("failed-precondition", `Deck missing for ${seat.displayName}`);
    return { seat, ...buildSeatState(seat, deckSnap.data(), g.format) };
  }));

  const batch = database.batch();
  for (const { seat, publicDoc, privateDoc } of seatStates) {
    batch.set(database.doc(`games/${gameId}/players/${seat.uid}`), publicDoc);
    batch.set(database.doc(`games/${gameId}/players/${seat.uid}/private/state`), privateDoc);
  }
  batch.update(ref, {
    status: "active",
    turnOrder: g.seats.map(s => s.uid),
    activeSeat: 0, turn: 1, phase: "beginning", phaseIndex: 0,
    updatedAt: FieldValue.serverTimestamp()
  });
  batch.set(database.collection(`games/${gameId}/log`).doc(), {
    ts: Date.now(), seat: 0, text: `Game "${g.name}" started`
  });
  await batch.commit();
  return { ok: true };
}

export const startGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _startGame(req.auth.uid, req.data, db);
});

export const gameAction = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return handleGameAction(req.auth.uid, req.data, db);
});

export async function _leaveGame(uid, data, database) {
  const { gameId } = data || {};
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");
  const ref = database.doc(`games/${gameId}`);
  return database.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Game not found");
    const g = snap.data();
    if (!g.seatUids.includes(uid)) return { ok: true };
    if (g.hostUid === uid && g.status === "lobby") {
      // Host leaving an unstarted lobby cancels it.
      tx.delete(ref);
      return { cancelled: true };
    }
    tx.update(ref, {
      seats: g.seats.filter((s) => s.uid !== uid),
      seatUids: g.seatUids.filter((u) => u !== uid),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
}

export async function _toggleReady(uid, data, database) {
  const { gameId } = data || {};
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");
  const ref = database.doc(`games/${gameId}`);
  return database.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Game not found");
    const g = snap.data();
    if (g.status !== "lobby") throw new HttpsError("failed-precondition", "Not in lobby");
    if (!g.seatUids.includes(uid)) throw new HttpsError("permission-denied", "Not a participant");
    const seats = g.seats.map((s) => s.uid === uid ? { ...s, ready: !s.ready } : s);
    tx.update(ref, { seats, updatedAt: FieldValue.serverTimestamp() });
    return { ok: true };
  });
}

export async function _removePlayer(uid, data, database) {
  const { gameId, targetUid } = data || {};
  if (!gameId || !targetUid) throw new HttpsError("invalid-argument", "gameId and targetUid required");
  const ref = database.doc(`games/${gameId}`);
  return database.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Game not found");
    const g = snap.data();
    if (g.hostUid !== uid) throw new HttpsError("permission-denied", "Host only");
    if (targetUid === g.hostUid) throw new HttpsError("failed-precondition", "Cannot remove the host");
    if (g.status !== "lobby") throw new HttpsError("failed-precondition", "Not in lobby");
    tx.update(ref, {
      seats: g.seats.filter((s) => s.uid !== targetUid),
      seatUids: g.seatUids.filter((u) => u !== targetUid),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
}

export async function _endGame(uid, data, database) {
  const { gameId, winnerUid } = data || {};
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");
  const ref = database.doc(`games/${gameId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found");
  if (snap.data().hostUid !== uid) throw new HttpsError("permission-denied", "Host only");
  await ref.update({ status: "complete", winnerUid: winnerUid || null, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
}

export const leaveGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _leaveGame(req.auth.uid, req.data, db);
});

export const endGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _endGame(req.auth.uid, req.data, db);
});

export const toggleReady = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _toggleReady(req.auth.uid, req.data, db);
});

export const removePlayer = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _removePlayer(req.auth.uid, req.data, db);
});
