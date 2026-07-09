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
import { EndGameConfirm, LeaveGameConfirm, ShuffleConfirm, MulliganConfirm } from "./components/ConfirmModals";
import { ScryModal } from "./components/ScryModal";
import { TokenModal } from "./components/TokenModal";
import { ZoneDrawer, type ZoneName } from "./components/ZoneDrawer";
import { ContextMenu, useContextMenu } from "../../components/ContextMenu";
import { buildHandMenu, buildBattlefieldMenu, buildDrawMenu, toggleZoneCardTap } from "./useCardMenus";
import { useDragDrop } from "./useDragDrop";
import { CardDetailModal } from "./components/CardDetailModal";
import { DrawNModal } from "./components/DrawNModal";
import { HoverPreview, useHoverPreview } from "../../components/HoverPreview";
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
  const [showScry, setShowScry] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [zoneDrawer, setZoneDrawer] = useState<ZoneName | null>(null);
  const [busyEnd, setBusyEnd] = useState(false);
  const [busyLeave, setBusyLeave] = useState(false);
  const [detailCard, setDetailCard] = useState<CardInstance | null>(null);
  const [showDrawN, setShowDrawN] = useState(false);
  const [showMulliganConfirm, setShowMulliganConfirm] = useState(false);
  const [busyMulligan, setBusyMulligan] = useState(false);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
  const [busyShuffle, setBusyShuffle] = useState(false);
  const { menu, openMenu, closeMenu } = useContextMenu();
  const hoverPreview = useHoverPreview();

  // Drag-drop hook — called before early return (hook rules). mine/myPrivate may be undefined while loading.
  function _errDrag(p: Promise<unknown>) { p.catch((e: Error) => toast(e.message, "error")); }
  const dragDrop = useDragDrop({
    gameId,
    actions,
    mine: players[myUid],
    myPrivate,
    onError: _errDrag,
  });

  // Keyboard shortcuts — must be before early return to satisfy hook rules.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when focus is in an input, textarea, select, or contentEditable
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable) return;

      if (e.key === "d" || e.key === "D") {
        if (!game || !gameId) return;
        actions.action({ type: "draw", gameId, count: 1 }).catch((err: Error) => toast(err.message, "error"));
      }
      if (e.key === "n" || e.key === "N") {
        if (!game || !gameId) return;
        actions.action({ type: "endTurn", gameId }).catch((err: Error) => toast(err.message, "error"));
      }
      if (e.key === "l" || e.key === "L") setLogOpen((o) => !o);
      if (e.key === "s" || e.key === "S") setShowScry(true);
      if (e.key === "t" || e.key === "T") setShowToken(true);
      if (e.key === "Escape") {
        setShowScry(false);
        setShowToken(false);
        setZoneDrawer(null);
        setDetailCard(null);
        setShowDrawN(false);
        setShowMulliganConfirm(false);
        setShowShuffleConfirm(false);
        closeMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [game, gameId, actions, toast, closeMenu]);

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

  function onViewCard(card: CardInstance) {
    setDetailCard(card);
  }

  const menuHandlers = {
    gameId: gameId!,
    actions,
    mine,
    onView: onViewCard,
    onError: err,
  };

  // Left-click on a hand card opens detail modal.
  function onCardClick(c: CardInstance) {
    setDetailCard(c);
  }

  // Left-click on a battlefield card taps/untaps it. "View card" remains
  // available via the right-click context menu (buildBattlefieldMenu).
  function onBattlefieldClick(c: CardInstance) {
    toggleZoneCardTap(c, "battlefield", mine, actions, err);
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

  function handleMulligan() {
    setBusyMulligan(true);
    actions
      .action({ type: "mulligan", gameId: gameId! })
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => {
        setBusyMulligan(false);
        setShowMulliganConfirm(false);
      });
  }

  function handleShuffle() {
    setBusyShuffle(true);
    actions
      .action({ type: "shuffleLibrary", gameId: gameId! })
      .catch((e) => toast((e as Error).message, "error"))
      .finally(() => {
        setBusyShuffle(false);
        setShowShuffleConfirm(false);
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
          <OpponentsBar
            opponents={opponents}
            onCardClick={onViewCard}
            onCardMouseEnter={hoverPreview.onMouseEnter}
            onCardMouseLeave={hoverPreview.onMouseLeave}
            onCardMouseMove={hoverPreview.onMouseMove}
          />
          <Battlefield
            cards={mine.battlefield || []}
            onCardClick={onBattlefieldClick}
            onCardContext={onBattlefieldContext}
            cardDragProps={(id) => dragDrop.cardDragProps(id, "battlefield")}
            creatureLaneDropProps={dragDrop.dropZoneProps("battlefield-creatures")}
            landLaneDropProps={dragDrop.dropZoneProps("battlefield-lands")}
            onCardMouseEnter={hoverPreview.onMouseEnter}
            onCardMouseLeave={hoverPreview.onMouseLeave}
            onCardMouseMove={hoverPreview.onMouseMove}
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
        onDraw={(e) =>
          openMenu(
            e,
            buildDrawMenu({
              gameId: gameId!,
              actions,
              onError: err,
              onDrawN: () => setShowDrawN(true),
              onMulligan: () => setShowMulliganConfirm(true),
            })
          )
        }
        onShuffle={() => setShowShuffleConfirm(true)}
        isMyTurn={myUid === game.turnOrder[game.activeSeat]}
        onOpenZone={(zone) => setZoneDrawer(zone)}
        onScry={() => setShowScry(true)}
        onToken={() => setShowToken(true)}
        handDropProps={dragDrop.dropZoneProps("hand")}
        cardDragProps={(id) => dragDrop.cardDragProps(id, "hand")}
        onCardMouseEnter={hoverPreview.onMouseEnter}
        onCardMouseLeave={hoverPreview.onMouseLeave}
        onCardMouseMove={hoverPreview.onMouseMove}
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

      {/* ── Scry modal ────────────────────────────────────────────── */}
      {showScry && (
        <ScryModal
          topCards={myPrivate.library.slice(0, 3)}
          gameId={gameId!}
          onAction={(a) => err(actions.action(a))}
          onClose={() => setShowScry(false)}
        />
      )}

      {/* ── Token modal ───────────────────────────────────────────── */}
      {showToken && (
        <TokenModal
          currentBattlefield={mine.battlefield || []}
          onWrite={(battlefield) => err(actions.writePublicZones({ battlefield }))}
          onClose={() => setShowToken(false)}
        />
      )}

      {/* ── Draw N modal ──────────────────────────────────────────── */}
      {showDrawN && (
        <DrawNModal
          libraryCount={myPrivate.library.length}
          onDraw={(count) => err(actions.action({ type: "draw", gameId: gameId!, count }))}
          onClose={() => setShowDrawN(false)}
        />
      )}

      {/* ── Zone drawers ──────────────────────────────────────────── */}
      {zoneDrawer && (
        <ZoneDrawer
          zone={zoneDrawer}
          mine={mine}
          myPrivate={myPrivate}
          gameId={gameId!}
          onAction={(a) => err(actions.action(a))}
          writePublicZones={(patch) => actions.writePublicZones(patch)}
          onError={err}
          onClose={() => setZoneDrawer(null)}
          onView={onViewCard}
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
      <ShuffleConfirm
        open={showShuffleConfirm}
        onClose={() => setShowShuffleConfirm(false)}
        onConfirm={handleShuffle}
        busy={busyShuffle}
      />
      <MulliganConfirm
        open={showMulliganConfirm}
        onClose={() => setShowMulliganConfirm(false)}
        onConfirm={handleMulligan}
        busy={busyMulligan}
      />

      {/* ── Card detail modal ─────────────────────────────────────── */}
      {detailCard && (
        <CardDetailModal card={detailCard} onClose={() => setDetailCard(null)} />
      )}

      {/* ── Hover preview (pointer-events:none overlay) ───────────── */}
      <HoverPreview anchor={hoverPreview.anchor} />
    </div>
  );
}
