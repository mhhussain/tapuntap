import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../api/hooks";
import { auth } from "../../lib/firebase";
import { startGame, leaveGame, toggleReady, removePlayer } from "../../api/games";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { Avatar } from "../../components/Avatar";
import { Modal } from "../../components/Modal";
import { Spinner } from "../../components/Spinner";
import type { Seat } from "../../types";

function SeatCard({
  seat,
  index,
  isHostView,
  isYou,
  onToggleReady,
  onRemove,
}: {
  seat: Seat;
  index: number;
  isHostView: boolean;
  isYou: boolean;
  onToggleReady: () => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  const canRemove = isHostView && !isYou;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: 16,
        minHeight: 132,
        background: "var(--bg-1)",
        border: `1px solid ${seat.ready ? "oklch(0.74 0.13 155 / 0.5)" : "var(--line-1)"}`,
        borderRadius: 12,
        transition: "border-color 150ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Avatar name={seat.displayName} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 600, color: "var(--fg-0)" }}>{seat.displayName}</span>
            {index === 0 && <span className="tag" style={{ padding: "1px 6px" }}>Host</span>}
            {isYou && (
              <span style={{ fontSize: 10, color: "var(--accent)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                You
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
            <span style={{ fontSize: 12, color: "var(--fg-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {seat.deckName || "No deck chosen"}
            </span>
          </div>
        </div>
        {canRemove && hover && (
          <button
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onRemove}
            title="Remove player"
            style={{ color: "var(--bad)" }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <div style={{ marginTop: "auto" }}>
        {isYou ? (
          <button
            onClick={onToggleReady}
            className="btn"
            style={{
              width: "100%",
              justifyContent: "center",
              background: seat.ready ? "oklch(0.74 0.13 155 / 0.16)" : "var(--bg-2)",
              borderColor: seat.ready ? "oklch(0.74 0.13 155 / 0.5)" : "var(--line-2)",
              color: seat.ready ? "var(--good)" : "var(--fg-1)",
            }}
          >
            {seat.ready ? <><Icon name="check" size={13} /> Ready</> : "Mark ready"}
          </button>
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              padding: "6px 0",
              borderRadius: 6,
              fontSize: 12,
              fontFamily: "var(--font-mono)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: seat.ready ? "var(--good)" : "var(--warn)",
              background: seat.ready ? "oklch(0.74 0.13 155 / 0.1)" : "oklch(0.78 0.14 70 / 0.1)",
            }}
          >
            {seat.ready ? (
              <><Icon name="check" size={12} /> Ready</>
            ) : (
              <><Spinner size={11} /> Waiting…</>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptySeat({ index, onCopyInvite }: { index: number; onCopyInvite: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        padding: 20,
        minHeight: 132,
        border: "1.5px dashed var(--line-2)",
        borderRadius: 12,
        background: hover ? "var(--bg-1)" : "transparent",
        transition: "background 120ms",
      }}
    >
      <div style={{ width: 36, height: 36, borderRadius: 9, border: "1.5px dashed var(--line-3)", display: "grid", placeItems: "center", color: "var(--fg-4)" }}>
        <Icon name="plus" size={16} />
      </div>
      <div style={{ fontSize: 12, color: "var(--fg-3)" }}>Seat {index + 1} · open</div>
      <button className="btn btn-sm" onClick={onCopyInvite}>
        <Icon name="export" size={12} /> Share invite
      </button>
    </div>
  );
}

export function LobbyView() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  const navigate = useNavigate();
  const toast = useToast();
  const me = auth.currentUser?.uid;
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (game?.status === "active") navigate(`/games/${gameId}`, { replace: true });
  }, [game?.status, gameId, navigate]);

  if (!gameId) return null;
  if (game === null) return <div className="empty-state"><div className="empty-title">Game not found</div></div>;
  if (!game) return <div className="empty-state"><div className="empty-title">Loading…</div></div>;

  const isHost = game.hostUid === me;
  const seats = game.seats ?? [];
  const allReady = seats.length >= 2 && seats.every((s) => s.ready);
  const canStart = isHost && allReady;

  // Build a 2x2 or 2xN grid of up to 4 seats — pad with empty slots
  const maxSeats = 4;
  const seatSlots: (Seat | null)[] = Array.from({ length: maxSeats }, (_, i) => seats[i] ?? null);

  function copyInviteLink() {
    const url = `${window.location.origin}/lobby/new?code=${game!.inviteCode}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  function copyCodeOnly() {
    navigator.clipboard.writeText(game!.inviteCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function handleToggleReady() {
    if (!gameId) return;
    try { await toggleReady(gameId); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  async function handleRemove(uid: string) {
    if (!gameId) return;
    try { await removePlayer(gameId, uid); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  async function handleStart() {
    if (!gameId || busy) return;
    setBusy(true);
    try { await startGame(gameId); }
    catch (e) { toast((e as Error).message, "error"); setBusy(false); }
  }

  async function handleLeave() {
    if (!gameId) return;
    try {
      await leaveGame(gameId);
      navigate("/games");
    } catch (e) {
      toast((e as Error).message, "error");
    }
  }

  return (
    <>
      <div className="topbar">
        <button className="btn btn-ghost" onClick={() => setConfirmLeave(true)}>
          <Icon name="prev" size={14} /> Leave
        </button>
        <div className="topbar-title">{game.name}</div>
        <span className="tag tag-warn" style={{ textTransform: "uppercase" }}>● Lobby</span>
        <span className="topbar-sub">{game.format}</span>
        <div className="topbar-spacer" />
        <span style={{ fontSize: 12, color: "var(--fg-3)", fontFamily: "var(--font-mono)" }}>
          {seats.length}/{maxSeats} seated
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "grid", placeItems: "start center", padding: "28px 24px" }}>
        <div style={{ width: "100%", maxWidth: 760, display: "flex", flexDirection: "column", gap: 22 }}>

          {/* Invite banner */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: 20,
            background: "linear-gradient(180deg, var(--accent-soft), transparent), var(--bg-1)",
            border: "1px solid var(--accent-line)",
            borderRadius: 12,
          }}>
            <div style={{ flex: 1 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Invite code</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 34, fontWeight: 700, letterSpacing: "0.06em", color: "var(--fg-0)", lineHeight: 1 }}>
                {game.inviteCode}
              </div>
              <div style={{ fontSize: 12, color: "var(--fg-3)", marginTop: 8 }}>
                Share this code (or the link) so up to {maxSeats} players can join.
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn btn-primary" onClick={copyInviteLink} style={{ justifyContent: "center", minWidth: 150 }}>
                {copied
                  ? <><Icon name="check" size={14} /> Copied!</>
                  : <><Icon name="export" size={14} /> Copy invite link</>}
              </button>
              <button className="btn" onClick={copyCodeOnly} style={{ justifyContent: "center" }}>
                <Icon name="duplicate" size={14} /> Copy code only
              </button>
            </div>
          </div>

          {/* Seats */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span className="eyebrow">Seats</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
                {seats.length} of {maxSeats}
              </span>
              <div style={{ flex: 1, height: 1, background: "var(--line-1)" }} />
              <span style={{
                fontSize: 11,
                color: allReady ? "var(--good)" : "var(--warn)",
                fontFamily: "var(--font-mono)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}>
                {allReady ? "All players ready" : "Waiting on players"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {seatSlots.map((seat, i) =>
                seat ? (
                  <SeatCard
                    key={seat.uid}
                    seat={seat}
                    index={i}
                    isHostView={isHost}
                    isYou={seat.uid === me}
                    onToggleReady={handleToggleReady}
                    onRemove={() => handleRemove(seat.uid)}
                  />
                ) : (
                  <EmptySeat key={`empty-${i}`} index={i} onCopyInvite={copyInviteLink} />
                )
              )}
            </div>
          </div>

          {/* Action bar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
            padding: "16px 20px",
            background: "var(--bg-2)",
            border: "1px solid var(--line-2)",
            borderRadius: 12,
          }}>
            <div>
              {isHost ? (
                <>
                  <div className="eyebrow">{canStart ? "Ready to play" : "Not ready yet"}</div>
                  <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 4 }}>
                    {seats.length < 2
                      ? "Need at least 2 seated players."
                      : !allReady
                        ? "All seated players must mark ready."
                        : `${seats.length} players · ${game.format}`}
                  </div>
                </>
              ) : (
                <>
                  <div className="eyebrow">Waiting for host</div>
                  <div style={{ fontSize: 13, color: "var(--fg-2)", marginTop: 4 }}>
                    The host will start when everyone's ready.
                  </div>
                </>
              )}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => setConfirmLeave(true)}>
                {isHost ? "Cancel game" : "Leave"}
              </button>
              {isHost ? (
                <button
                  className="btn btn-primary"
                  disabled={!canStart || busy}
                  onClick={handleStart}
                  style={{ padding: "8px 22px", fontSize: 14, opacity: canStart ? 1 : 0.45 }}
                >
                  <Icon name="play" size={13} /> Start game
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleToggleReady}
                  style={{ padding: "8px 22px" }}
                >
                  {seats.find((s) => s.uid === me)?.ready ? "Ready ✓" : "Mark ready"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmLeave && (
        <Modal
          title={isHost ? "Cancel this game?" : "Leave this lobby?"}
          onClose={() => setConfirmLeave(false)}
          width={440}
          footer={
            <>
              <button className="btn" onClick={() => setConfirmLeave(false)}>Stay</button>
              <button
                className="btn"
                style={{ background: "var(--bad)", borderColor: "var(--bad)", color: "white" }}
                onClick={handleLeave}
              >
                {isHost ? "Cancel game" : "Leave lobby"}
              </button>
            </>
          }
        >
          <p style={{ margin: 0, color: "var(--fg-2)", lineHeight: 1.6 }}>
            {isHost
              ? "Cancelling closes the lobby for everyone and frees up all seats. This can't be undone."
              : "You'll be removed from this table. You can rejoin with the invite code while the lobby is open."}
          </p>
        </Modal>
      )}
    </>
  );
}
