import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame, usePlayersPublic, useMyPrivate, useLog } from "../../api/hooks";
import { auth } from "../../lib/firebase";
import { leaveGame } from "../../api/games";
import { useGameActions } from "./useGameActions";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { PlayerRibbon } from "./components/PlayerRibbon";
import { OpponentsBar } from "./components/OpponentsBar";
import { Battlefield } from "./components/Battlefield";
import { SidePanel } from "./components/SidePanel";
import { BottomBar } from "./components/BottomBar";
import { EndGameConfirm, LeaveGameConfirm } from "./components/ConfirmModals";
import { ContextMenu, useContextMenu } from "../../components/ContextMenu";
import { buildHandMenu, buildBattlefieldMenu } from "./useCardMenus";
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

  const [logOpen, setLogOpen] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [busyEnd, setBusyEnd] = useState(false);
  const [busyLeave, setBusyLeave] = useState(false);
  const { menu, openMenu, closeMenu } = useContextMenu();

  useEffect(() => {
    if (game === null) { toast("Game not found", "error"); navigate("/games"); }
  }, [game, navigate, toast]);
  useEffect(() => {
    if (game?.status === "complete") navigate(`/games/${gameId}/end`, { replace: true });
  }, [game?.status, gameId, navigate]);

  if (!game || !players[myUid]) {
    return (
      <div className="empty-state" style={{ flex: 1, display: "flex" }}>
        <div className="empty-title">Loading game…</div>
      </div>
    );
  }

  const mine = players[myUid];
  const opponents = Object.values(players).filter((p) => p.uid !== myUid);
  const isHost = game.hostUid === myUid;

  function err(p: Promise<unknown>) {
    p.catch((e) => toast((e as Error).message, "error"));
  }

  function onLife(targetUid: string, delta: number) {
    if (targetUid === myUid) {
      err(actions.setLife((mine.life ?? 20) + delta));
    } else {
      err(actions.action({ type: "adjustOpponentLife", gameId: gameId!, targetUid, delta }));
    }
  }

  // Seam for Task 13 (card-detail modal) — no-op placeholder for now.
  function onViewCard(_card: CardInstance) {
    // TODO Task 13: open card detail modal
  }

  const menuHandlers = {
    gameId: gameId!,
    actions,
    mine,
    onView: onViewCard,
    onError: err,
  };

  function onCardClick(_c: CardInstance) {
    // TODO Task 13: open card detail on click
  }

  function onBattlefieldContext(e: React.MouseEvent, c: CardInstance) {
    e.preventDefault();
    openMenu(e, buildBattlefieldMenu(c, menuHandlers));
  }

  function onHandContext(e: React.MouseEvent, c: CardInstance) {
    e.preventDefault();
    openMenu(e, buildHandMenu(c, menuHandlers));
  }

  function handleEndGame() {
    setBusyEnd(true);
    actions
      .endGame()
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => {
        setBusyEnd(false);
        setShowEndConfirm(false);
      });
  }

  function handleLeaveGame() {
    setBusyLeave(true);
    leaveGame(gameId!)
      .then(() => navigate("/games"))
      .catch((e) => {
        toast((e as Error).message, "error");
        setBusyLeave(false);
        setShowLeaveConfirm(false);
      });
  }

  const savedAgo = game.updatedAt
    ? (() => {
        const secs = Math.floor((Date.now() - Number(game.updatedAt)) / 1000);
        if (secs < 60) return "just now";
        if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
        return `${Math.floor(secs / 3600)}h ago`;
      })()
    : "just now";

  return (
    <div className="gameplay-wrap">
      {/* ── Topbar ─────────────────────────────────────────────────── */}
      <div className="topbar" style={{ borderBottom: "1px solid var(--line-1)" }}>
        <button
          className="btn btn-ghost btn-icon"
          onClick={() => setShowLeaveConfirm(true)}
          title="Leave game"
        >
          <Icon name="prev" size={14} />
        </button>

        <div className="topbar-title">{game.name}</div>
        <span className="topbar-sub">Turn {game.turn} · {game.phase}</span>

        <div className="topbar-spacer" />

        {/* Auto-save indicator */}
        <span style={{
          fontSize: 11,
          color: "var(--fg-3)",
          fontFamily: "var(--font-mono)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "var(--good)",
            boxShadow: "0 0 8px var(--good)",
          }} />
          AUTO-SAVED · {savedAgo}
        </span>

        {/* Phase controls */}
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => err(actions.action({ type: "advancePhase", gameId: gameId!, direction: "prev" }))}
          title="Previous phase"
        >
          ◀ Phase
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => err(actions.action({ type: "advancePhase", gameId: gameId!, direction: "next" }))}
          title="Next phase"
        >
          Phase ▶
        </button>

        {isHost && (
          <button
            className="btn btn-sm"
            onClick={() => setShowEndConfirm(true)}
            style={{ marginLeft: 4 }}
          >
            End game
          </button>
        )}
      </div>

      {/* ── Player ribbon ──────────────────────────────────────────── */}
      <PlayerRibbon
        game={game}
        players={players}
        myUid={myUid}
        myPrivate={myPrivate}
        onLife={onLife}
        onEndTurn={() => err(actions.action({ type: "endTurn", gameId: gameId! }))}
      />

      {/* ── Battlefield + side panel ───────────────────────────────── */}
      <div className={`gameplay-body ${logOpen ? "log-open" : "log-closed"}`}>
        <div className="battlefield-column">
          <OpponentsBar opponents={opponents} />
          <Battlefield
            cards={mine.battlefield || []}
            onCardClick={onCardClick}
            onCardContext={onBattlefieldContext}
          />
        </div>

        {logOpen && (
          <SidePanel
            log={log}
            notes={game.notes || ""}
            onNotes={(v) => err(actions.setNotes(v))}
            onClose={() => setLogOpen(false)}
          />
        )}
      </div>

      {/* ── Bottom bar (hand + zones + actions) ───────────────────── */}
      <BottomBar
        player={mine}
        myPrivate={myPrivate}
        gameId={gameId!}
        logOpen={logOpen}
        onToggleLog={() => setLogOpen((o) => !o)}
        onCardClick={onCardClick}
        onHandContext={onHandContext}
        onDraw={() => err(actions.action({ type: "draw", gameId: gameId!, count: 1 }))}
        onShuffle={() => err(actions.action({ type: "shuffleLibrary", gameId: gameId! }))}
        onOpenZone={(_zone) => {
          // TODO Task 12: open zone drawer modal
        }}
      />

      {/* ── Context menu ──────────────────────────────────────────── */}
      {menu && (
        <ContextMenu
          items={menu.items}
          x={menu.x}
          y={menu.y}
          onClose={closeMenu}
        />
      )}

      {/* ── Confirm modals ────────────────────────────────────────── */}
      <EndGameConfirm
        open={showEndConfirm}
        onClose={() => setShowEndConfirm(false)}
        onConfirm={handleEndGame}
        busy={busyEnd}
      />
      <LeaveGameConfirm
        open={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={handleLeaveGame}
        busy={busyLeave}
      />
    </div>
  );
}
