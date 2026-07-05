import type { CardInstance, GameAction } from "../../../types";
import type { PlaytestSession } from "./types";
import { shuffleInPlace } from "./deal";

function syncCounts(s: PlaytestSession, uid: string) {
  const priv = s.privates[uid];
  s.players[uid].handCount = priv.hand.length;
  s.players[uid].libraryCount = priv.library.length;
}

function log(s: PlaytestSession, uid: string, text: string) {
  const seat = s.game.seats.find((x) => x.uid === uid);
  s.log.push({ ts: Date.now(), seat: seat?.seat ?? 0, who: seat?.displayName ?? uid, turn: s.game.turn, text });
}

type Zone = "battlefield" | "graveyard" | "exile" | "command";

function zoneArray(s: PlaytestSession, uid: string, zone: Zone): CardInstance[] {
  return s.players[uid][zone];
}

function doEndTurn(s: PlaytestSession, actorUid: string) {
  const order = s.game.turnOrder || [];
  if (order[s.game.activeSeat] !== actorUid) throw new Error("Not your turn");
  const nextSeat = (s.game.activeSeat + 1) % order.length;
  const newTurn = nextSeat === 0 ? s.game.turn + 1 : s.game.turn;
  s.game.activeSeat = nextSeat;
  s.game.turn = newTurn;
  s.game.phaseIndex = 0;
  s.game.phase = (s.game.phases || [])[0] || "beginning";
  // Untap the player whose turn now begins.
  const nextUid = order[nextSeat];
  const nPub = s.players[nextUid];
  if (nPub) {
    nPub.battlefield = (nPub.battlefield || []).map((c) => ({ ...c, tapped: false, summoningSick: false }));
  }
  log(s, actorUid, "ended their turn");
}

export function applyGameAction(session: PlaytestSession, actorUid: string, a: GameAction): PlaytestSession {
  const s = structuredClone(session);
  if (!s.game.seatUids.includes(actorUid)) throw new Error("Not a participant");
  const priv = s.privates[actorUid];
  const pub = s.players[actorUid];

  switch (a.type) {
    case "draw": {
      const n = Math.max(1, a.count || 1);
      let drawn = 0;
      for (let i = 0; i < n && priv.library.length; i++) { priv.hand.push(priv.library.shift()!); drawn++; }
      syncCounts(s, actorUid);
      log(s, actorUid, `drew ${drawn} card${drawn === 1 ? "" : "s"}`);
      break;
    }
    case "mill": {
      const n = Math.max(1, a.count || 1);
      const milled = priv.library.splice(0, Math.min(n, priv.library.length));
      pub.graveyard = [...(pub.graveyard || []), ...milled];
      syncCounts(s, actorUid);
      log(s, actorUid, `milled ${milled.length}`);
      break;
    }
    case "shuffleLibrary": {
      shuffleInPlace(priv.library);
      syncCounts(s, actorUid);
      log(s, actorUid, "shuffled library");
      break;
    }
    case "shuffleGraveyardIntoLibrary": {
      priv.library = priv.library.concat(pub.graveyard || []);
      shuffleInPlace(priv.library);
      pub.graveyard = [];
      syncCounts(s, actorUid);
      log(s, actorUid, "shuffled graveyard into library");
      break;
    }
    case "scry": {
      // a.order: instanceIds kept on top (in order); a.toBottom: instanceIds sent to bottom
      const n = (a.order?.length || 0) + (a.toBottom?.length || 0);
      const top = priv.library.slice(0, n);
      const rest = priv.library.slice(n);
      const byId = new Map(top.map((c) => [c.instanceId, c]));
      const newTop = (a.order || []).map((id) => byId.get(id)).filter((c): c is CardInstance => Boolean(c));
      const newBottom = (a.toBottom || []).map((id) => byId.get(id)).filter((c): c is CardInstance => Boolean(c));
      // Integrity guard: the client must account for exactly the top-n cards (no drops/dupes),
      // otherwise unmatched cards would be silently lost from the library.
      if (newTop.length + newBottom.length !== top.length) {
        throw new Error("scry order must reference exactly the scried cards");
      }
      priv.library = [...newTop, ...rest, ...newBottom];
      syncCounts(s, actorUid);
      log(s, actorUid, `scried ${n}`);
      break;
    }
    case "tutorToHand": {
      const idx = priv.library.findIndex((c) => c.instanceId === a.instanceId);
      if (idx === -1) throw new Error("Card not in library");
      const [card] = priv.library.splice(idx, 1);
      priv.hand.push(card);
      syncCounts(s, actorUid);
      log(s, actorUid, `tutored ${card.name} to hand`);
      break;
    }
    case "moveToHand": {
      const from = a.fromZone;
      if (from === "library") {
        const idx = priv.library.findIndex((c) => c.instanceId === a.instanceId);
        if (idx === -1) throw new Error("Card not in library");
        const [card] = priv.library.splice(idx, 1);
        priv.hand.push(card);
        syncCounts(s, actorUid);
        log(s, actorUid, `tutored ${card.name} to hand`);
        break;
      }
      const arr = zoneArray(s, actorUid, from);
      const idx = arr.findIndex((c) => c.instanceId === a.instanceId);
      if (idx === -1) throw new Error("Card not found");
      const [card] = arr.splice(idx, 1);
      if (from === "battlefield") { card.tapped = false; card.counters = {}; card.attachedTo = null; }
      priv.hand.push(card);
      syncCounts(s, actorUid);
      log(s, actorUid, `${card.name} → hand`);
      break;
    }
    case "moveToLibrary": {
      const from = a.fromZone;
      let card: CardInstance;
      if (from === "hand") {
        const idx = priv.hand.findIndex((c) => c.instanceId === a.instanceId);
        if (idx === -1) throw new Error("Card not in hand");
        [card] = priv.hand.splice(idx, 1);
      } else {
        const arr = zoneArray(s, actorUid, from);
        const idx = arr.findIndex((c) => c.instanceId === a.instanceId);
        if (idx === -1) throw new Error("Card not found");
        [card] = arr.splice(idx, 1);
        if (from === "battlefield") { card.tapped = false; card.counters = {}; card.attachedTo = null; }
      }
      if (a.position === "bottom") priv.library.push(card); else priv.library.unshift(card);
      syncCounts(s, actorUid);
      log(s, actorUid, `${card.name} → library (${a.position})`);
      break;
    }
    case "playFromHand": {
      const idx = priv.hand.findIndex((c) => c.instanceId === a.instanceId);
      if (idx === -1) throw new Error("Card not in hand");
      const [card] = priv.hand.splice(idx, 1);
      if (a.tapped) card.tapped = true;
      const toZone = a.toZone || "battlefield";
      pub[toZone] = [...(pub[toZone] || []), card];
      syncCounts(s, actorUid);
      log(s, actorUid, `played ${card.name} → ${toZone}`);
      break;
    }
    case "adjustOpponentLife": {
      const target = a.targetUid;
      if (!s.game.seatUids.includes(target)) throw new Error("Target not in game");
      const tPub = s.players[target];
      const newLife = (tPub.life ?? 20) + (a.delta || 0);
      tPub.life = newLife;
      log(s, actorUid, `set ${tPub.displayName}'s life to ${newLife}`);
      break;
    }
    case "advancePhase": {
      const order = s.game.turnOrder || [];
      if (order[s.game.activeSeat] !== actorUid) throw new Error("Not your turn");
      const phases = s.game.phases || [];
      let idx = s.game.phaseIndex ?? 0;
      idx = a.direction === "prev" ? Math.max(0, idx - 1) : idx + 1;
      if (idx >= phases.length) {
        doEndTurn(s, actorUid);
        break;
      }
      s.game.phaseIndex = idx;
      s.game.phase = phases[idx];
      break;
    }
    case "endTurn": {
      doEndTurn(s, actorUid);
      break;
    }
    default:
      // exhaustive switch: this default only fires for unknown runtime input
      throw new Error(`Unknown action: ${(a as { type: string }).type}`);
  }
  s.updatedAt = Date.now();
  s.game.updatedAt = s.updatedAt;
  return s;
}
