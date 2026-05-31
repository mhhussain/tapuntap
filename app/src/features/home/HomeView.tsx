import { useNavigate } from "react-router-dom";
import { useMyGames, useMyDecks } from "../../api/hooks";
import { fmtTime } from "../../lib/format";

export function HomeView() {
  const games = useMyGames();
  const { decks } = useMyDecks();
  const navigate = useNavigate();
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">tapuntap</div>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}>New game</button>
        <button className="btn" onClick={() => navigate("/decks/new")}>New deck</button>
      </div>
      <div className="home-body">
        <div>
          <div className="home-section-title">Your games</div>
          {(games || []).slice(0, 6).map((g) => (
            <div key={g.id} className="game-card-item" role="button"
              onClick={() => navigate(g.status === "lobby" ? `/lobby/${g.id}` : `/games/${g.id}`)}>
              <div className="game-card-title">{g.name}</div>
              <span className="tag">{g.status}</span>
              <span className="mono" style={{ fontSize: 11 }}>{fmtTime(g.updatedAt)}</span>
            </div>
          ))}
          {games && games.length === 0 && <div className="empty-body">No games yet.</div>}
        </div>
        <div>
          <div className="home-section-title">Deck library</div>
          {(decks || []).slice(0, 8).map((d) => (
            <div key={d.id} className="game-card-item" role="button" onClick={() => navigate(`/decks/${d.id}`)}>
              <div className="game-card-title">{d.name}</div>
              <span className="mono" style={{ fontSize: 11 }}>{d.cardCount} cards · {d.format}</span>
            </div>
          ))}
          {decks && decks.length === 0 && <div className="empty-body">No decks yet.</div>}
        </div>
      </div>
    </>
  );
}
