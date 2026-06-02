import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyGames } from "../../api/hooks";
import { Icon } from "../../components/Icon";
import { fmtTime } from "../../lib/format";
import type { GameDoc, Seat } from "../../types";

// Per-status visual config matching the design spec
const STATUS_META: Record<string, { label: string; cls: string; accent: string }> = {
  lobby:    { label: "● Lobby",  cls: "tag-warn", accent: "var(--warn)" },
  active:   { label: "● Live",   cls: "tag-good", accent: "var(--good)" },
  complete: { label: "Complete", cls: "",          accent: "var(--fg-3)" },
};

type FilterKey = "all" | "lobby" | "active" | "complete";

export function GamesView() {
  const games = useMyGames();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const allGames = games ?? [];

  const counts = {
    all:      allGames.length,
    lobby:    allGames.filter((g) => g.status === "lobby").length,
    active:   allGames.filter((g) => g.status === "active").length,
    complete: allGames.filter((g) => g.status === "complete").length,
  };

  const filtered = allGames.filter((g) => {
    if (filter !== "all" && g.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchName = g.name.toLowerCase().includes(q);
      const matchDeck = g.seats.some((s) => s.deckName.toLowerCase().includes(q));
      if (!matchName && !matchDeck) return false;
    }
    return true;
  });

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Games</div>
        <span className="topbar-sub">{filtered.length} sessions</span>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}>
          <Icon name="plus" size={14} /> New game
        </button>
      </div>

      <div style={{ padding: "20px 32px", flex: 1, overflowY: "auto" }}>
        {/* Filter bar */}
        <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
          {/* Search */}
          <div style={{ position: "relative", maxWidth: 360, flex: 1 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--fg-4)", pointerEvents: "none" }}>
              <Icon name="search" size={14} />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or deck…"
              style={{
                width: "100%", paddingLeft: 32, paddingRight: 10, height: 34,
                background: "var(--bg-2)", border: "1px solid var(--line-1)", borderRadius: 6,
                color: "var(--fg-0)", fontSize: 13,
              }}
            />
          </div>

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 0, border: "1px solid var(--line-2)", borderRadius: 6, overflow: "hidden" }}>
            {(["all", "lobby", "active", "complete"] as FilterKey[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 14px", border: "none", display: "flex", alignItems: "center", gap: 6,
                  background: filter === f ? "var(--bg-3)" : "var(--bg-1)",
                  color: filter === f ? "var(--fg-0)" : "var(--fg-3)",
                  fontSize: 12, textTransform: "capitalize", fontWeight: 500, cursor: "pointer",
                }}
              >
                {f}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: filter === f ? "var(--accent)" : "var(--fg-4)" }}>
                  {counts[f]}
                </span>
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>SORT: LAST PLAYED ↓</span>
        </div>

        {/* Loading */}
        {games === null && (
          <div style={{ color: "var(--fg-3)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading…</div>
        )}

        {/* Empty state */}
        {games !== null && filtered.length === 0 && (
          <div className="empty" style={{ paddingTop: 80 }}>
            <div className="empty-icon"><Icon name="games" size={20} /></div>
            <div className="empty-title">No games here</div>
            <div className="empty-body">Nothing matches this filter. Start a new table to get playing.</div>
            <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={() => navigate("/lobby/new")}>
              <Icon name="plus" size={14} /> New game
            </button>
          </div>
        )}

        {/* Game cards grid */}
        {filtered.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(380px, 1fr))", gap: 16 }}>
            {filtered.map((g) => (
              <GameCard key={g.id} game={g} navigate={navigate} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function GameCard({ game, navigate }: { game: GameDoc; navigate: ReturnType<typeof useNavigate> }) {
  const meta = STATUS_META[game.status] ?? STATUS_META.active;
  const seats = game.seats ?? [];
  const seatsTotal = 4; // max seats in a game
  const seatsFilled = seats.length;
  const openSeats = seatsTotal - seatsFilled;

  return (
    <div
      style={{
        border: "1px solid var(--line-1)", borderRadius: 10, background: "var(--bg-1)",
        overflow: "hidden", transition: "border-color 120ms",
        opacity: game.status === "complete" ? 0.92 : 1,
      }}
      onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--line-2)"; }}
      onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--line-1)"; }}
    >
      {/* Status accent strip */}
      <div style={{ height: 2, background: meta.accent, opacity: game.status === "complete" ? 0.3 : 0.8 }} />

      {/* Header */}
      <div style={{ padding: "14px 16px 12px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span className={`tag ${meta.cls}`} style={{ textTransform: "uppercase" }}>{meta.label}</span>
            <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>{game.format}</span>
            {game.status === "active" && (
              <span style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>· Turn {game.turn}</span>
            )}
          </div>
          <h3 style={{ margin: "6px 0 0", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 20, fontWeight: 400, color: "var(--fg-0)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {game.name}
          </h3>
        </div>
      </div>

      {/* Lobby: invite code banner */}
      {game.status === "lobby" && (
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--accent-soft)" }}>
          <div>
            <div className="eyebrow" style={{ fontSize: 9 }}>Invite code</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, fontWeight: 700, letterSpacing: "0.05em", color: "var(--fg-0)", marginTop: 2 }}>
              {game.inviteCode}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--fg-1)" }}>{seatsFilled}/{seatsTotal}</div>
            <div style={{ fontSize: 9, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>seated</div>
          </div>
        </div>
      )}

      <div style={{ padding: 16 }}>
        {/* Players list */}
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          {game.status === "complete" ? "Final standings" : `${seatsFilled} Players`}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {seats.map((seat: Seat) => {
            const isWinner = game.status === "complete" && game.winnerUid === seat.uid;
            const onTurn = game.status === "active" && game.activeSeat === seat.seat;
            return (
              <div
                key={seat.uid}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "6px 10px",
                  background: (isWinner || onTurn) ? "var(--accent-soft)" : "var(--bg-2)",
                  borderRadius: 5,
                  border: (isWinner || onTurn) ? "1px solid var(--accent-line)" : "1px solid transparent",
                }}
              >
                <span style={{ fontWeight: 500, fontSize: 13, minWidth: 56, color: "var(--fg-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {seat.displayName}
                </span>
                <span style={{ fontSize: 12, color: "var(--fg-3)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {seat.deckName}
                </span>
                {onTurn && (
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent)", textTransform: "uppercase" }}>On turn</span>
                )}
                {game.status === "lobby" && (
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: seat.ready ? "var(--good)" : "var(--warn)" }}>
                    {seat.ready ? "Ready" : "Waiting"}
                  </span>
                )}
                {game.status === "complete" && isWinner && (
                  <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--accent)", textTransform: "uppercase" }}>
                    Winner
                  </span>
                )}
              </div>
            );
          })}

          {/* Open seat placeholders in lobby */}
          {game.status === "lobby" && openSeats > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 10px", borderRadius: 5, border: "1px dashed var(--line-2)", color: "var(--fg-4)", fontSize: 12 }}>
              <Icon name="plus" size={12} /> {openSeats} open seat{openSeats > 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Timestamps */}
        <div style={{ display: "flex", gap: 16, fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginBottom: 14, paddingTop: 12, borderTop: "1px solid var(--line-1)" }}>
          <div>
            <div style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 9 }}>
              {game.status === "complete" ? "Finished" : "Last played"}
            </div>
            <div style={{ color: "var(--fg-2)", marginTop: 2 }}>
              {game.updatedAt ? fmtTime(game.updatedAt) : "—"}
            </div>
          </div>
        </div>

        {/* CTA buttons */}
        <div style={{ display: "flex", gap: 8 }}>
          {game.status === "lobby" && (
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate(`/lobby/${game.id}`)}>
              <Icon name="games" size={12} /> Open lobby
            </button>
          )}
          {game.status === "active" && (
            <button className="btn btn-primary" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate(`/games/${game.id}`)}>
              <Icon name="play" size={12} /> Resume
            </button>
          )}
          {game.status === "complete" && (
            <button className="btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => navigate(`/games/${game.id}/end`)}>
              <Icon name="history" size={12} /> View summary
            </button>
          )}
          <button className="btn btn-icon" title="Delete"><Icon name="trash" size={14} /></button>
        </div>
      </div>
    </div>
  );
}
