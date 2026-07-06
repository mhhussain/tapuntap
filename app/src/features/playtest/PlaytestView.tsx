import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePlaytestSession } from "./usePlaytestSession";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { PlayerRibbon } from "../game/components/PlayerRibbon";
import { OpponentsBar } from "../game/components/OpponentsBar";
import { Battlefield } from "../game/components/Battlefield";
import { SidePanel } from "../game/components/SidePanel";
import { BottomBar } from "../game/components/BottomBar";
import { ScryModal } from "../game/components/ScryModal";
import { TokenModal } from "../game/components/TokenModal";
import { ZoneDrawer, type ZoneName } from "../game/components/ZoneDrawer";
import { ContextMenu, useContextMenu } from "../../components/ContextMenu";
import { buildHandMenu, buildBattlefieldMenu } from "../game/useCardMenus";
import { useDragDrop } from "../game/useDragDrop";
import { CardDetailModal } from "../game/components/CardDetailModal";
import { HoverPreview, useHoverPreview } from "../../components/HoverPreview";
import type { useGameActions } from "../game/useGameActions";
import type { CardInstance } from "../../types";

/** Adapts `usePlaytestSession`'s `Promise<unknown>`-returning actions to the exact
 * `ReturnType<typeof useGameActions>` shape (`Promise<void>` on client-direct setters)
 * expected by shared game/ components (useDragDrop, useCardMenus, ZoneDrawer). Both
 * hooks are behaviorally identical (same method names/args); only the return-type
 * generic differs, so this is a type-level shim with no behavior change. */
function toVoid(p: Promise<unknown>): Promise<void> {
  return p.then(() => undefined);
}

export function PlaytestView() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { session, controlledUid, setControlledUid, actions } = usePlaytestSession(sessionId);
  const game = session?.game;
  const players = session?.players ?? {};
  const log = session?.log ?? [];
  const myUid = controlledUid;
  const myPrivate = session?.privates[controlledUid] ?? { hand: [], library: [] };

  const [logOpen, setLogOpen] = useState(true);
  const [showScry, setShowScry] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [zoneDrawer, setZoneDrawer] = useState<ZoneName | null>(null);
  const [detailCard, setDetailCard] = useState<CardInstance | null>(null);
  const { menu, openMenu, closeMenu } = useContextMenu();
  const hoverPreview = useHoverPreview();

  // Adapter matching the exact useGameActions return-type shape (see toVoid comment above).
  const gameActions: ReturnType<typeof useGameActions> = {
    setLife: (life) => toVoid(actions.setLife(life)),
    setPoison: (poison) => toVoid(actions.setPoison(poison)),
    writePublicZones: (patch) => toVoid(actions.writePublicZones(patch)),
    setCounters: (counters) => toVoid(actions.setCounters(counters)),
    setNotes: (notes) => toVoid(actions.setNotes(notes)),
    action: (a) => actions.action(a),
    endGame: (winnerUid) => actions.endGame(winnerUid),
  };

  // Drag-drop hook — called before early return (hook rules). mine/myPrivate may be undefined while loading.
  function _errDrag(p: Promise<unknown>) { p.catch((e: Error) => toast(e.message, "error")); }
  const dragDrop = useDragDrop({
    gameId: sessionId,
    actions: gameActions,
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
        if (!session || !sessionId) return;
        actions.action({ type: "draw", gameId: sessionId, count: 1 }).catch((err: Error) => toast(err.message, "error"));
      }
      if (e.key === "n" || e.key === "N") {
        if (!session || !sessionId) return;
        actions.action({ type: "endTurn", gameId: sessionId }).catch((err: Error) => toast(err.message, "error"));
      }
      if (e.key === "l" || e.key === "L") setLogOpen((o) => !o);
      if (e.key === "s" || e.key === "S") setShowScry(true);
      if (e.key === "t" || e.key === "T") setShowToken(true);
      if (e.key === "Escape") {
        setShowScry(false);
        setShowToken(false);
        setZoneDrawer(null);
        setDetailCard(null);
        closeMenu();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, sessionId, actions, toast, closeMenu]);

  useEffect(() => {
    if (session === null) { toast("Playtest not found", "error"); navigate("/playtest"); }
  }, [session, navigate, toast]);

  if (!game || !players[myUid]) {
    return (
      <div className="empty-state" style={{ flex: 1, display: "flex" }}>
        <div className="empty-title">Loading game…</div>
      </div>
    );
  }

  const mine = players[myUid];
  const opponents = Object.values(players).filter((p) => p.uid !== myUid);

  function err(p: Promise<unknown>) {
    p.catch((e) => toast((e as Error).message, "error"));
  }

  function onLife(targetUid: string, delta: number) {
    if (targetUid === myUid) {
      err(actions.setLife((mine.life ?? 20) + delta));
    } else {
      err(actions.action({ type: "adjustOpponentLife", gameId: sessionId!, targetUid, delta }));
    }
  }

  function onViewCard(card: CardInstance) {
    setDetailCard(card);
  }

  const menuHandlers = {
    gameId: sessionId!,
    actions: gameActions,
    mine,
    onView: onViewCard,
    onError: err,
  };

  // Left-click on a card opens detail modal.
  // Tap/untap stays on the context menu ("Tap"/"Untap" item in buildBattlefieldMenu).
  function onCardClick(c: CardInstance) {
    setDetailCard(c);
  }


  function onBattlefieldContext(e: React.MouseEvent, c: CardInstance) {
    e.preventDefault();
    openMenu(e, buildBattlefieldMenu(c, menuHandlers));
  }

  function onHandContext(e: React.MouseEvent, c: CardInstance) {
    e.preventDefault();
    openMenu(e, buildHandMenu(c, menuHandlers));
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
          onClick={() => navigate("/playtest")}
          title="Back to playtests"
        >
          <Icon name="prev" size={14} />
        </button>

        <div className="topbar-title">{game.name}</div>
        <span className="topbar-sub">Turn {game.turn} · {game.phase}</span>

        <div style={{ display: "flex", gap: 4, marginLeft: 12 }}>
          {game.seats.map((s) => {
            const isTurn = game.turnOrder[game.activeSeat] === s.uid;
            const isMe = s.uid === controlledUid;
            return (
              <button
                key={s.uid}
                className={`btn btn-sm ${isMe ? "btn-primary" : "btn-ghost"}`}
                title={`${s.deckName}${isTurn ? " · active turn" : ""}`}
                onClick={() => setControlledUid(s.uid)}
                style={isTurn && !isMe ? { borderColor: "var(--accent)" } : undefined}
              >
                P{s.seat}{isTurn ? " ●" : ""}
              </button>
            );
          })}
        </div>

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
          onClick={() => err(actions.action({ type: "advancePhase", gameId: sessionId!, direction: "prev" }))}
          title="Previous phase"
        >
          ◀ Phase
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => err(actions.action({ type: "advancePhase", gameId: sessionId!, direction: "next" }))}
          title="Next phase"
        >
          Phase ▶
        </button>
      </div>

      {/* ── Player ribbon ──────────────────────────────────────────── */}
      <PlayerRibbon
        game={game}
        players={players}
        myUid={myUid}
        myPrivate={myPrivate}
        onLife={onLife}
        onEndTurn={() => err(actions.action({ type: "endTurn", gameId: sessionId! }))}
      />

      {/* ── Battlefield + side panel ───────────────────────────────── */}
      <div className={`gameplay-body ${logOpen ? "log-open" : "log-closed"}`}>
        <div className="battlefield-column">
          <OpponentsBar opponents={opponents} />
          <Battlefield
            cards={mine.battlefield || []}
            onCardClick={onCardClick}
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
        gameId={sessionId!}
        logOpen={logOpen}
        onToggleLog={() => setLogOpen((o) => !o)}
        onCardClick={onCardClick}
        onHandContext={onHandContext}
        onDraw={() => err(actions.action({ type: "draw", gameId: sessionId!, count: 1 }))}
        onShuffle={() => err(actions.action({ type: "shuffleLibrary", gameId: sessionId! }))}
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
          gameId={sessionId!}
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

      {/* ── Zone drawers ──────────────────────────────────────────── */}
      {zoneDrawer && (
        <ZoneDrawer
          zone={zoneDrawer}
          mine={mine}
          myPrivate={myPrivate}
          gameId={sessionId!}
          onAction={(a) => err(actions.action(a))}
          writePublicZones={(patch) => toVoid(actions.writePublicZones(patch))}
          onError={err}
          onClose={() => setZoneDrawer(null)}
        />
      )}

      {/* ── Card detail modal ─────────────────────────────────────── */}
      {detailCard && (
        <CardDetailModal card={detailCard} onClose={() => setDetailCard(null)} />
      )}

      {/* ── Hover preview (pointer-events:none overlay) ───────────── */}
      <HoverPreview anchor={hoverPreview.anchor} />
    </div>
  );
}
