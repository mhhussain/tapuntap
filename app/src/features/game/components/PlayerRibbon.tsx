import type { GameDoc, PlayerPublic, PlayerPrivate } from "../../../types";
import { colorTone } from "../../../lib/format";

export function PlayerRibbon({ game, players, myUid, myPrivate, onLife, onEndTurn }: {
  game: GameDoc;
  players: Record<string, PlayerPublic>;
  myUid: string;
  myPrivate: PlayerPrivate;
  onLife: (targetUid: string, delta: number) => void;
  onEndTurn: () => void;
}) {
  const activeUid = game.turnOrder[game.activeSeat];
  const order = [myUid, ...Object.keys(players).filter((u) => u !== myUid)];
  return (
    <div className="player-ribbon">
      {order.map((uid) => {
        const p = players[uid];
        if (!p) return null;
        const isSelf = uid === myUid;
        const hand = isSelf ? myPrivate.hand.length : p.handCount ?? 0;
        const lib = isSelf ? myPrivate.library.length : p.libraryCount ?? 0;
        return (
          <div key={uid} className={`ribbon-player${uid === activeUid ? " active" : ""}`}>
            <div className="ribbon-avatar" style={{ background: colorTone([]) }}>{(p.displayName || "?")[0]}</div>
            <div className="ribbon-info">
              <div className="ribbon-name">{p.displayName}{isSelf ? " (you)" : ""}</div>
            </div>
            <div className="ribbon-vitals">
              <button className="life-btn" onClick={() => onLife(uid, -1)}>−</button>
              <span className="vital-val">{p.life ?? 20}</span>
              <button className="life-btn" onClick={() => onLife(uid, 1)}>+</button>
              <span className="mono" style={{ fontSize: 10 }}>H{hand} L{lib}</span>
            </div>
          </div>
        );
      })}
      <button className="ribbon-next-btn" onClick={onEndTurn}>End turn (N)</button>
    </div>
  );
}
