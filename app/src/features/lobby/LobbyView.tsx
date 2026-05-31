import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../api/hooks";
import { auth } from "../../lib/firebase";
import { startGame, leaveGame } from "../../api/games";
import { useToast } from "../../components/Toast";

export function LobbyView() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  const navigate = useNavigate();
  const toast = useToast();
  const me = auth.currentUser?.uid;

  useEffect(() => {
    if (game?.status === "active") navigate(`/games/${gameId}`, { replace: true });
  }, [game?.status, gameId, navigate]);

  if (!gameId) return null;
  if (game === null) return <div className="empty-state"><div className="empty-title">Game not found</div></div>;
  if (!game) return <div className="empty-state"><div className="empty-title">Loading…</div></div>;

  const isHost = game.hostUid === me;

  return (
    <>
      <div className="topbar"><div className="topbar-title">{game.name}</div></div>
      <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 560 }}>
        <div>Invite code: <strong style={{ fontSize: 20 }}>{game.inviteCode}</strong>
          <button className="btn" onClick={() => navigator.clipboard.writeText(game.inviteCode)}>Copy</button>
        </div>
        <div>
          <h3>Seats ({game.seats.length}/4)</h3>
          {game.seats.map((s) => (
            <div key={s.uid} className="player-chip">
              {s.displayName} — {s.deckName}{s.uid === me ? " (you)" : ""}
            </div>
          ))}
        </div>
        {isHost
          ? <button className="btn btn-primary" disabled={game.seats.length < 2}
              onClick={() => startGame(gameId).catch((e) => toast((e as Error).message, "error"))}>Start game</button>
          : <div>Waiting for host to start…</div>}
        <button className="btn btn-ghost" onClick={async () => {
          try { await leaveGame(gameId); navigate("/games"); } catch (e) { toast((e as Error).message, "error"); }
        }}>{isHost ? "Cancel game" : "Leave"}</button>
      </div>
    </>
  );
}
