import { useNavigate, useParams } from "react-router-dom";
import { useGame, usePlayersPublic } from "../../../api/hooks";
import { auth } from "../../../lib/firebase";
import { useGameActions } from "../useGameActions";
import { useToast } from "../../../components/Toast";

export function EndGameView() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  const players = usePlayersPublic(gameId);
  const navigate = useNavigate();
  const toast = useToast();
  const actions = useGameActions(gameId || "");
  const isHost = game?.hostUid === auth.currentUser?.uid;

  if (!game) return <div className="empty-state"><div className="empty-title">Loading…</div></div>;

  return (
    <>
      <div className="topbar"><div className="topbar-title">{game.name} — Results</div></div>
      <div style={{ padding: 24, maxWidth: 560, display: "grid", gap: 16 }}>
        <div className="home-section-title">Final standings</div>
        {Object.values(players).sort((a, b) => (b.life ?? 0) - (a.life ?? 0)).map((p) => (
          <div key={p.uid} className="player-chip">
            {p.displayName} — ♥ {p.life ?? 0}{game.winnerUid === p.uid ? " 👑 Winner" : ""}
          </div>
        ))}
        {game.status !== "complete" && isHost && (
          <button className="btn btn-primary" onClick={() =>
            actions.endGame().then(() => toast("Game ended")).catch((e) => toast((e as Error).message, "error"))}>
            End this game
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => navigate("/games")}>Back to games</button>
          <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}>Rematch (new lobby)</button>
        </div>
      </div>
    </>
  );
}
