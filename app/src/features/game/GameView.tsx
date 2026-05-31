import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame, usePlayersPublic, useMyPrivate, useLog } from "../../api/hooks";
import { auth } from "../../lib/firebase";
import { useGameActions } from "./useGameActions";
import { useToast } from "../../components/Toast";
import { PlayerRibbon } from "./components/PlayerRibbon";
import { OpponentsBar } from "./components/OpponentsBar";
import { Battlefield } from "./components/Battlefield";
import { Hand } from "./components/Hand";
import { SidePanel } from "./components/SidePanel";
import type { CardInstance } from "../../types";

export function GameView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const game = useGame(gameId);
  const players = usePlayersPublic(gameId);
  const myPrivate = useMyPrivate(gameId);
  const log = useLog(gameId);
  const myUid = auth.currentUser?.uid!;
  const actions = useGameActions(gameId || "");

  useEffect(() => {
    if (game === null) { toast("Game not found", "error"); navigate("/games"); }
  }, [game, navigate, toast]);
  useEffect(() => {
    if (game?.status === "complete") navigate(`/games/${gameId}/end`, { replace: true });
  }, [game?.status, gameId, navigate]);

  if (!game || !players[myUid]) {
    return <div className="empty-state" style={{ flex: 1, display: "flex" }}><div className="empty-title">Loading game…</div></div>;
  }

  const mine = players[myUid];
  const opponents = Object.values(players).filter((p) => p.uid !== myUid);

  function err(p: Promise<unknown>) { p.catch((e) => toast((e as Error).message, "error")); }

  function onLife(targetUid: string, delta: number) {
    if (targetUid === myUid) err(actions.setLife((mine.life ?? 20) + delta));
    else err(actions.action({ type: "adjustOpponentLife", gameId: gameId!, targetUid, delta }));
  }

  function onCardClick(_c: CardInstance) { /* open detail modal — baseline: noop or alert */ }

  function onBattlefieldContext(e: React.MouseEvent, c: CardInstance) {
    e.preventDefault();
    // Baseline: tap/untap toggle. Replace with ContextMenu component for full actions.
    const next = mine.battlefield.map((x) => x.instanceId === c.instanceId ? { ...x, tapped: !x.tapped } : x);
    err(actions.writePublicZones({ battlefield: next }));
  }

  function onHandContext(e: React.MouseEvent, c: CardInstance) {
    e.preventDefault();
    // Play from hand touches a hidden zone -> server action.
    err(actions.action({ type: "playFromHand", gameId: gameId!, instanceId: c.instanceId, toZone: "battlefield" }));
  }

  return (
    <div className="gameplay-wrap">
      <div className="topbar">
        <button className="btn btn-ghost" onClick={() => navigate("/games")}>Exit</button>
        <div className="topbar-title">{game.name}</div>
        <span className="topbar-sub">Turn {game.turn} · {game.phase}</span>
        <div className="topbar-spacer" />
        <button className="btn btn-sm" onClick={() => err(actions.action({ type: "advancePhase", gameId: gameId!, direction: "prev" }))}>Prev phase</button>
        <button className="btn btn-sm" onClick={() => err(actions.action({ type: "advancePhase", gameId: gameId!, direction: "next" }))}>Next phase</button>
      </div>

      <PlayerRibbon game={game} players={players} myUid={myUid} myPrivate={myPrivate}
        onLife={onLife} onEndTurn={() => err(actions.action({ type: "endTurn", gameId: gameId! }))} />

      <div className="gameplay-body">
        <div className="battlefield-column">
          <OpponentsBar opponents={opponents} />
          <Battlefield cards={mine.battlefield || []} onCardClick={onCardClick} onCardContext={onBattlefieldContext} />
        </div>
        <SidePanel log={log} notes={game.notes || ""} onNotes={(v) => err(actions.setNotes(v))} />
      </div>

      <div className="bottom-bar">
        <Hand cards={myPrivate.hand} displayName={mine.displayName} onCardClick={onCardClick} onCardContext={onHandContext} />
        <div className="zones-actions">
          <button className="btn btn-sm" onClick={() => err(actions.action({ type: "draw", gameId: gameId!, count: 1 }))}>Draw</button>
          <button className="btn btn-sm" onClick={() => err(actions.action({ type: "shuffleLibrary", gameId: gameId! }))}>Shuffle</button>
        </div>
      </div>
    </div>
  );
}
