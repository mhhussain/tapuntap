import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

const PRIVATE = (gameId, uid) => `games/${gameId}/players/${uid}/private/state`;
const PUBLIC = (gameId, uid) => `games/${gameId}/players/${uid}`;

async function loadGame(db, gameId, uid) {
  const snap = await db.doc(`games/${gameId}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found");
  const g = snap.data();
  if (!g.seatUids.includes(uid)) throw new HttpsError("permission-denied", "Not a participant");
  if (g.status !== "active") throw new HttpsError("failed-precondition", "Game not active");
  return g;
}

function shuffleInPlace(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

async function writePrivateAndCounts(db, gameId, uid, priv) {
  const batch = db.batch();
  batch.set(db.doc(PRIVATE(gameId, uid)), { hand: priv.hand, library: priv.library });
  batch.update(db.doc(PUBLIC(gameId, uid)), {
    handCount: priv.hand.length, libraryCount: priv.library.length,
  });
  await batch.commit();
}

async function appendLog(db, gameId, seat, who, turn, text) {
  await db.collection(`games/${gameId}/log`).add({
    ts: FieldValue.serverTimestamp(), seat, who, turn, text,
  });
}

export async function handleGameAction(uid, data, db) {
  const { type, gameId } = data || {};
  if (!type || !gameId) throw new HttpsError("invalid-argument", "type and gameId required");
  const g = await loadGame(db, gameId, uid);
  const mySeat = g.seats.find((s) => s.uid === uid);
  const seatNum = mySeat ? mySeat.seat : 0;
  const who = mySeat ? mySeat.displayName : uid;

  const privRef = db.doc(PRIVATE(gameId, uid));
  const priv = (await privRef.get()).data() || { hand: [], library: [] };

  switch (type) {
    case "draw": {
      const n = Math.max(1, data.count || 1);
      let drawn = 0;
      for (let i = 0; i < n && priv.library.length; i++) { priv.hand.push(priv.library.shift()); drawn++; }
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, `drew ${drawn} card${drawn === 1 ? "" : "s"}`);
      return { drawn };
    }
    case "mill": {
      const n = Math.max(1, data.count || 1);
      const pubRef = db.doc(PUBLIC(gameId, uid));
      const pub = (await pubRef.get()).data();
      const milled = priv.library.splice(0, Math.min(n, priv.library.length));
      pub.graveyard = [...(pub.graveyard || []), ...milled];
      const batch = db.batch();
      batch.set(privRef, { hand: priv.hand, library: priv.library });
      batch.update(pubRef, { libraryCount: priv.library.length, graveyard: pub.graveyard });
      await batch.commit();
      await appendLog(db, gameId, seatNum, who, g.turn, `milled ${milled.length}`);
      return { milled: milled.length };
    }
    case "shuffleLibrary": {
      shuffleInPlace(priv.library);
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, "shuffled library");
      return { ok: true };
    }
    case "shuffleGraveyardIntoLibrary": {
      const pubRef = db.doc(PUBLIC(gameId, uid));
      const pub = (await pubRef.get()).data();
      priv.library = priv.library.concat(pub.graveyard || []);
      shuffleInPlace(priv.library);
      const batch = db.batch();
      batch.set(privRef, { hand: priv.hand, library: priv.library });
      batch.update(pubRef, { graveyard: [], libraryCount: priv.library.length });
      await batch.commit();
      await appendLog(db, gameId, seatNum, who, g.turn, "shuffled graveyard into library");
      return { ok: true };
    }
    case "scry": {
      // data.order: instanceIds kept on top (in order); data.toBottom: instanceIds sent to bottom
      const n = (data.order?.length || 0) + (data.toBottom?.length || 0);
      const top = priv.library.slice(0, n);
      const rest = priv.library.slice(n);
      const byId = new Map(top.map((c) => [c.instanceId, c]));
      const newTop = (data.order || []).map((id) => byId.get(id)).filter(Boolean);
      const newBottom = (data.toBottom || []).map((id) => byId.get(id)).filter(Boolean);
      // Integrity guard: the client must account for exactly the top-n cards (no drops/dupes),
      // otherwise unmatched cards would be silently lost from the library.
      if (newTop.length + newBottom.length !== top.length) {
        throw new HttpsError("invalid-argument", "scry order must reference exactly the scried cards");
      }
      priv.library = [...newTop, ...rest, ...newBottom];
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, `scried ${n}`);
      return { ok: true };
    }
    case "tutorToHand": {
      const idx = priv.library.findIndex((c) => c.instanceId === data.instanceId);
      if (idx === -1) throw new HttpsError("not-found", "Card not in library");
      const [card] = priv.library.splice(idx, 1);
      priv.hand.push(card);
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, `tutored ${card.name} to hand`);
      return { ok: true };
    }
    case "moveToHand": {
      const from = data.fromZone;
      if (from === "library") {
        return handleGameAction(uid, { type: "tutorToHand", gameId, instanceId: data.instanceId }, db);
      }
      const pubRef = db.doc(PUBLIC(gameId, uid));
      const pub = (await pubRef.get()).data();
      const arr = pub[from] || [];
      const idx = arr.findIndex((c) => c.instanceId === data.instanceId);
      if (idx === -1) throw new HttpsError("not-found", "Card not found");
      const [card] = arr.splice(idx, 1);
      if (from === "battlefield") { card.tapped = false; card.counters = {}; card.attachedTo = null; }
      priv.hand.push(card);
      const batch = db.batch();
      batch.set(privRef, { hand: priv.hand, library: priv.library });
      batch.update(pubRef, { [from]: arr, handCount: priv.hand.length });
      await batch.commit();
      await appendLog(db, gameId, seatNum, who, g.turn, `${card.name} → hand`);
      return { ok: true };
    }
    case "moveToLibrary": {
      const from = data.fromZone;
      const pubRef = db.doc(PUBLIC(gameId, uid));
      let card;
      if (from === "hand") {
        const idx = priv.hand.findIndex((c) => c.instanceId === data.instanceId);
        if (idx === -1) throw new HttpsError("not-found", "Card not in hand");
        [card] = priv.hand.splice(idx, 1);
      } else {
        const pub = (await pubRef.get()).data();
        const arr = pub[from] || [];
        const idx = arr.findIndex((c) => c.instanceId === data.instanceId);
        if (idx === -1) throw new HttpsError("not-found", "Card not found");
        [card] = arr.splice(idx, 1);
        if (from === "battlefield") { card.tapped = false; card.counters = {}; card.attachedTo = null; }
        await pubRef.update({ [from]: arr });
      }
      if (data.position === "bottom") priv.library.push(card); else priv.library.unshift(card);
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, `${card.name} → library (${data.position})`);
      return { ok: true };
    }
    case "playFromHand": {
      const idx = priv.hand.findIndex((c) => c.instanceId === data.instanceId);
      if (idx === -1) throw new HttpsError("not-found", "Card not in hand");
      const [card] = priv.hand.splice(idx, 1);
      if (data.tapped) card.tapped = true;
      const pubRef = db.doc(PUBLIC(gameId, uid));
      const pub = (await pubRef.get()).data();
      const toZone = data.toZone || "battlefield";
      pub[toZone] = [...(pub[toZone] || []), card];
      const batch = db.batch();
      batch.set(privRef, { hand: priv.hand, library: priv.library });
      batch.update(pubRef, { [toZone]: pub[toZone], handCount: priv.hand.length });
      await batch.commit();
      await appendLog(db, gameId, seatNum, who, g.turn, `played ${card.name} → ${toZone}`);
      return { ok: true };
    }
    case "adjustOpponentLife": {
      const target = data.targetUid;
      if (!g.seatUids.includes(target)) throw new HttpsError("invalid-argument", "Target not in game");
      const tRef = db.doc(PUBLIC(gameId, target));
      const tPub = (await tRef.get()).data();
      const newLife = (tPub.life ?? 20) + (data.delta || 0);
      await tRef.update({ life: newLife });
      await appendLog(db, gameId, seatNum, who, g.turn, `set ${tPub.displayName}'s life to ${newLife}`);
      return { life: newLife };
    }
    case "advancePhase": {
      const order = g.turnOrder || [];
      if (order[g.activeSeat] !== uid) throw new HttpsError("permission-denied", "Not your turn");
      const phases = g.phases || [];
      let idx = g.phaseIndex ?? 0;
      idx = data.direction === "prev" ? Math.max(0, idx - 1) : idx + 1;
      if (idx >= phases.length) return handleGameAction(uid, { type: "endTurn", gameId }, db);
      await db.doc(`games/${gameId}`).update({ phaseIndex: idx, phase: phases[idx], updatedAt: FieldValue.serverTimestamp() });
      return { phaseIndex: idx };
    }
    case "endTurn": {
      const order = g.turnOrder || [];
      if (order[g.activeSeat] !== uid) throw new HttpsError("permission-denied", "Not your turn");
      const nextSeat = (g.activeSeat + 1) % order.length;
      const newTurn = nextSeat === 0 ? g.turn + 1 : g.turn;
      await db.doc(`games/${gameId}`).update({
        activeSeat: nextSeat, turn: newTurn, phaseIndex: 0,
        phase: (g.phases || [])[0] || "beginning", updatedAt: FieldValue.serverTimestamp(),
      });
      // Untap the player whose turn now begins.
      const nextUid = order[nextSeat];
      const nRef = db.doc(PUBLIC(gameId, nextUid));
      const nPub = (await nRef.get()).data();
      if (nPub) {
        await nRef.update({ battlefield: (nPub.battlefield || []).map((c) => ({ ...c, tapped: false, summoningSick: false })) });
      }
      await appendLog(db, gameId, seatNum, who, g.turn, "ended their turn");
      return { activeSeat: nextSeat, turn: newTurn };
    }
    default:
      throw new HttpsError("invalid-argument", `Unknown action: ${type}`);
  }
}
