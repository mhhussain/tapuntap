import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame, usePlayersPublic } from "../../../api/hooks";
import { endGame } from "../../../api/games";
import { auth } from "../../../lib/firebase";
import { Avatar } from "../../../components/Avatar";
import { Icon } from "../../../components/Icon";
import { useToast } from "../../../components/Toast";
import type { PlayerPublic, Seat } from "../../../types";

// ---------- Trophy SVG (local — not in Icon registry) ----------
function Trophy({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3" />
      <path d="M12 14v3M9 20h6M10 17h4l-.5 3h-3z" />
    </svg>
  );
}

// ---------- Row shape for standings ----------
interface StandingRow {
  uid: string;
  name: string;
  deckName: string;
  life: number;
  place: number;
}

function buildStandings(
  seats: Seat[],
  players: Record<string, PlayerPublic>,
  winnerUid: string | null | undefined,
): StandingRow[] {
  const rows: StandingRow[] = seats.map((s) => ({
    uid: s.uid,
    name: s.displayName,
    deckName: s.deckName,
    life: players[s.uid]?.life ?? 0,
  } as StandingRow));

  rows.sort((a, b) => {
    if (a.uid === winnerUid) return -1;
    if (b.uid === winnerUid) return 1;
    return (b.life ?? 0) - (a.life ?? 0);
  });

  return rows.map((r, i) => ({ ...r, place: i + 1 }));
}

// ---------- WinnerSpotlight ----------
function WinnerSpotlight({ row }: { row: StandingRow }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        padding: "28px 20px",
        background:
          "radial-gradient(420px 220px at 50% 0%, var(--accent-soft), transparent 70%), var(--bg-1)",
        border: "1px solid var(--accent-line)",
        borderRadius: 14,
        textAlign: "center",
      }}
    >
      <div style={{ position: "relative" }}>
        <Avatar name={row.name} size={72} />
        <div
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: "var(--accent)",
            display: "grid",
            placeItems: "center",
            boxShadow: "var(--shadow-1)",
          }}
        >
          <Trophy size={14} />
        </div>
      </div>
      <div className="eyebrow" style={{ color: "var(--accent)" }}>
        Winner
      </div>
      <div
        style={{
          fontFamily: "var(--font-serif)",
          fontStyle: "italic",
          fontSize: 36,
          color: "var(--fg-0)",
          lineHeight: 1,
        }}
      >
        {row.name}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--fg-3)",
          fontSize: 13,
        }}
      >
        {row.deckName}
        <span style={{ color: "var(--line-3)" }}>·</span>
        <span style={{ fontFamily: "var(--font-mono)" }}>{row.life} life remaining</span>
      </div>
    </div>
  );
}

// ---------- StandingRow ----------
function StandingRowItem({
  row,
  isWinner,
  marking,
  onMark,
}: {
  row: StandingRow;
  isWinner: boolean;
  marking: boolean;
  onMark: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        borderBottom: "1px solid var(--line-1)",
        background: isWinner ? "var(--accent-soft)" : "transparent",
      }}
    >
      {/* Place badge */}
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
          fontFamily: "var(--font-mono)",
          fontSize: 12,
          fontWeight: 700,
          background: isWinner ? "var(--accent)" : "var(--bg-3)",
          color: isWinner ? "var(--bg-0)" : "var(--fg-3)",
        }}
      >
        {row.place}
      </div>

      <Avatar name={row.name} size={34} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontWeight: 600, color: "var(--fg-0)" }}>{row.name}</span>
          {isWinner && (
            <span style={{ display: "inline-flex", color: "var(--accent)" }}>
              <Trophy size={13} />
            </span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 2 }}>{row.deckName}</div>
      </div>

      {/* Life */}
      <div style={{ textAlign: "right" }}>
        <div
          style={{
            fontFamily: "var(--font-serif)",
            fontStyle: "italic",
            fontSize: 22,
            color: row.life > 0 ? "var(--fg-0)" : "var(--fg-4)",
            lineHeight: 1,
          }}
        >
          {row.life}
        </div>
        <div
          style={{
            fontSize: 9,
            color: "var(--fg-4)",
            fontFamily: "var(--font-mono)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          life
        </div>
      </div>

      {marking && (
        <button
          className="btn btn-sm"
          onClick={onMark}
          style={{ opacity: hover ? 1 : 0.6 }}
        >
          <Trophy size={12} /> Winner
        </button>
      )}
    </div>
  );
}

// ---------- Main view ----------
export function EndGameView() {
  const { gameId } = useParams<{ gameId: string }>();
  const game = useGame(gameId);
  const players = usePlayersPublic(gameId);
  const navigate = useNavigate();
  const toast = useToast();
  const uid = auth.currentUser?.uid;
  const isHost = game?.hostUid === uid;

  const [markingBusy, setMarkingBusy] = useState(false);
  const [archived, setArchived] = useState(false);

  if (game === undefined)
    return (
      <div className="empty-state">
        <div className="empty-title">Loading…</div>
      </div>
    );
  if (game === null)
    return (
      <div className="empty-state">
        <div className="empty-title">Game not found.</div>
      </div>
    );

  const winnerUid = game.winnerUid ?? null;
  const standings = buildStandings(game.seats, players, winnerUid);
  const winnerRow = standings.find((s) => s.uid === winnerUid);
  const hasWinner = !!winnerUid;
  const marking = !hasWinner && isHost;

  async function handleMarkWinner(targetUid: string) {
    if (!gameId || markingBusy) return;
    setMarkingBusy(true);
    try {
      await endGame(gameId, targetUid);
      toast("Winner recorded");
    } catch (e) {
      toast((e as Error).message, "error");
    } finally {
      setMarkingBusy(false);
    }
  }

  return (
    <>
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-title">{game.name}</div>
        <span className="tag" style={{ textTransform: "uppercase" }}>
          Complete
        </span>
        <span className="topbar-sub">
          {game.format} · {game.seats.length} players
        </span>
        <div className="topbar-spacer" />
        {archived && (
          <span className="tag tag-good">
            <Icon name="check" size={11} /> Archived
          </span>
        )}
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "grid",
          placeItems: "start center",
          padding: "32px 24px",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 620,
            display: "flex",
            flexDirection: "column",
            gap: 24,
          }}
        >
          {/* Winner prompt or spotlight */}
          {!hasWinner ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 16px",
                background: "oklch(0.78 0.14 70 / 0.1)",
                border: "1px solid var(--accent-line)",
                borderRadius: 10,
              }}
            >
              <span style={{ color: "var(--warn)" }}>
                <Icon name="more" size={16} />
              </span>
              <div style={{ flex: 1, fontSize: 13, color: "var(--fg-1)" }}>
                <strong style={{ color: "var(--fg-0)" }}>Mark who won</strong> to finish this
                game. tapuntap tracks state — winners are called manually.
                {!isHost && (
                  <span style={{ color: "var(--fg-3)" }}> (Only the host can mark the winner.)</span>
                )}
              </div>
            </div>
          ) : winnerRow ? (
            <WinnerSpotlight row={winnerRow} />
          ) : null}

          {/* Standings */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              Final standings
            </div>
            <div
              style={{
                background: "var(--bg-1)",
                border: "1px solid var(--line-1)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {standings.map((s) => (
                <StandingRowItem
                  key={s.uid}
                  row={s}
                  isWinner={s.uid === winnerUid}
                  marking={marking}
                  onMark={() => handleMarkWinner(s.uid)}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/lobby/new")}
              disabled={!hasWinner}
              style={{ opacity: hasWinner ? 1 : 0.5 }}
            >
              <Icon name="undo" size={13} /> Rematch
            </button>
            <button
              className="btn"
              onClick={() => setArchived(true)}
              disabled={!hasWinner || archived}
            >
              <Icon name="save" size={13} /> {archived ? "Archived" : "Archive game"}
            </button>
            <div style={{ flex: 1 }} />
            <button className="btn btn-ghost" onClick={() => navigate("/games")}>
              Back to games
            </button>
          </div>

          <p style={{ margin: 0, textAlign: "center", fontSize: 11, color: "var(--fg-4)" }}>
            Rematch opens a fresh lobby with the same players and decks.
          </p>
        </div>
      </div>
    </>
  );
}
