import { useNavigate } from "react-router-dom";
import { useMyGames } from "../../api/hooks";
import { Icon } from "../../components/Icon";
import { fmtTime } from "../../lib/format";

export function GamesView() {
  const games = useMyGames();
  const navigate = useNavigate();
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Games</div>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}><Icon name="plus" size={14} /> New game</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {!games && <div style={{ color: "var(--fg-3)" }}>Loading…</div>}
        {games && games.length === 0 && (
          <div className="empty-state"><div className="empty-title">No games yet</div>
            <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}>New game</button></div>
        )}
        <div className="games-grid">
          {games?.map((g) => {
            const dest = g.status === "lobby" ? `/lobby/${g.id}` : g.status === "complete" ? `/games/${g.id}/end` : `/games/${g.id}`;
            const label = g.status === "lobby" ? "Open lobby" : g.status === "complete" ? "View summary" : "Resume";
            return (
              <div key={g.id} className="panel" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{g.name}</strong>
                  <span className={`tag${g.status === "active" ? " tag-good" : ""}`}>{g.status}</span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
                  {g.seats.length} players · {fmtTime(g.updatedAt)}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(dest)}>{label}</button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
