import { useState } from "react";
import { Modal } from "../../../components/Modal";
import { CardFace } from "../../../components/CardFace";
import { Icon } from "../../../components/Icon";
import { HoverPreview, useHoverPreview } from "../../../components/HoverPreview";
import { ContextMenu, type MenuItem } from "../../../components/ContextMenu";
import { groupCardsByType } from "../../../lib/cards";
import { moveWithinPublicZones } from "../useGameActions";
import type { CardInstance, PlayerPublic, PlayerPrivate, GameAction } from "../../../types";

type PublicZone = "battlefield" | "graveyard" | "exile" | "command";
export type ZoneName = "graveyard" | "exile" | "library" | "command";

interface ZoneDrawerProps {
  zone: ZoneName;
  mine: PlayerPublic;
  myPrivate: PlayerPrivate;
  gameId: string;
  onAction: (a: GameAction) => void;
  writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) => Promise<void>;
  onError: (p: Promise<unknown>) => void;
  onClose: () => void;
  /** Opens the card-detail modal. Wired to "View card" in each card's context menu. */
  onView: (card: CardInstance) => void;
  /**
   * True when `mine` is an OPPONENT's public doc rather than the caller's own — hides all
   * mutating actions, since writePublicZones/onAction always target the CALLER's own doc,
   * not `mine`'s. Only graveyard/exile are ever opened read-only (library/hand stay self-only).
   */
  readOnly?: boolean;
}

const ZONE_LABEL: Record<string, string> = {
  graveyard: "Graveyard",
  exile: "Exile",
  library: "Library",
  command: "Command",
  battlefield: "Battlefield",
};

const ZONE_ICON: Record<string, string> = {
  graveyard: "graveyard",
  exile: "exile",
  library: "deck",
  command: "command",
  battlefield: "deck",
};

/** ─────────────────────────────── CARD ACTION MENU ITEMS ────────────────────── */
interface CardActionsProps {
  card: CardInstance;
  fromZone: PublicZone;
  mine: PlayerPublic;
  gameId: string;
  onAction: (a: GameAction) => void;
  writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) => Promise<void>;
  onError: (p: Promise<unknown>) => void;
  onView: (card: CardInstance) => void;
}

function buildCardActionMenu({
  card,
  fromZone,
  mine,
  gameId,
  onAction,
  writePublicZones,
  onError,
  onView,
}: CardActionsProps): MenuItem[] {
  // Public-zone destinations excluding current zone and battlefield
  const otherPublicZones: PublicZone[] = (
    ["graveyard", "exile", "command"] as PublicZone[]
  ).filter((z) => z !== fromZone);

  function moveToPublic(toZone: PublicZone) {
    const next = moveWithinPublicZones(mine, card.instanceId, fromZone, toZone);
    onError(writePublicZones({ [fromZone]: next[fromZone], [toZone]: next[toZone] }));
  }

  function moveToBattlefield() {
    const next = moveWithinPublicZones(mine, card.instanceId, fromZone, "battlefield");
    onError(writePublicZones({ [fromZone]: next[fromZone], battlefield: next.battlefield }));
  }

  function moveToHand() {
    onAction({ type: "moveToHand", gameId, instanceId: card.instanceId, fromZone });
  }

  function moveToLibraryTop() {
    onAction({ type: "moveToLibrary", gameId, instanceId: card.instanceId, fromZone, position: "top" });
  }

  function moveToLibraryBottom() {
    onAction({ type: "moveToLibrary", gameId, instanceId: card.instanceId, fromZone, position: "bottom" });
  }

  return [
    { header: card.name },
    {
      label: "View card",
      onClick: () => onView(card),
    },
    "sep",
    {
      label: "→ Battlefield",
      onClick: moveToBattlefield,
    },
    ...otherPublicZones.map((z): MenuItem => ({
      label: `→ ${ZONE_LABEL[z]}`,
      onClick: () => moveToPublic(z),
    })),
    "sep",
    {
      label: "→ Hand",
      onClick: moveToHand,
    },
    {
      label: "→ Library top",
      onClick: moveToLibraryTop,
    },
    {
      label: "→ Library bottom",
      onClick: moveToLibraryBottom,
    },
  ];
}

/** ─────────────────────────────── CARD WITH FIXED-POSITION CONTEXT MENU ─────── */
interface ZoneCardProps {
  card: CardInstance;
  fromZone: PublicZone;
  mine: PlayerPublic;
  gameId: string;
  onAction: (a: GameAction) => void;
  writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) => Promise<void>;
  onError: (p: Promise<unknown>) => void;
  onView: (card: CardInstance) => void;
  onMouseEnter: (e: React.MouseEvent, c: CardInstance) => void;
  onMouseLeave: (e: React.MouseEvent, c: CardInstance) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  readOnly?: boolean;
}

function ZoneCard({
  card,
  fromZone,
  mine,
  gameId,
  onAction,
  writePublicZones,
  onError,
  onView,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  readOnly,
}: ZoneCardProps) {
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);

  function toggleTap() {
    const cards = (mine[fromZone] as CardInstance[] | undefined) || [];
    const updated = cards.map((c) =>
      c.instanceId === card.instanceId ? { ...c, tapped: !c.tapped } : c
    );
    onError(writePublicZones({ [fromZone]: updated }));
  }

  function openMenu(e: React.MouseEvent) {
    e.preventDefault();
    if (readOnly) return;
    setMenuPos({ x: e.clientX, y: e.clientY });
  }

  function handleClick(e: React.MouseEvent) {
    if (readOnly) return;
    // Command zone (and battlefield, if ever routed here): click taps/untaps.
    // "View card" remains available via the right-click context menu.
    if (fromZone === "command") {
      toggleTap();
    } else {
      openMenu(e);
    }
  }

  return (
    <div style={{ display: "inline-block" }}>
      <div
        style={{ cursor: readOnly ? "default" : "pointer" }}
        onClick={handleClick}
        onContextMenu={openMenu}
        onMouseEnter={(e) => onMouseEnter(e, card)}
        onMouseLeave={(e) => onMouseLeave(e, card)}
        onMouseMove={onMouseMove}
        title={card.name}
      >
        <CardFace card={card} zone={fromZone} />
      </div>
      {!readOnly && menuPos && (
        <ContextMenu
          items={buildCardActionMenu({
            card,
            fromZone,
            mine,
            gameId,
            onAction,
            writePublicZones,
            onError,
            onView,
          })}
          x={menuPos.x}
          y={menuPos.y}
          onClose={() => setMenuPos(null)}
        />
      )}
    </div>
  );
}

/** ─────────────────────────────── PUBLIC ZONE DRAWER ────────────────────────── */
function PublicZoneDrawer({
  zone,
  cards,
  mine,
  gameId,
  onAction,
  writePublicZones,
  onError,
  onClose,
  onView,
  readOnly,
}: {
  zone: PublicZone;
  cards: CardInstance[];
  mine: PlayerPublic;
  gameId: string;
  onAction: (a: GameAction) => void;
  writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) => Promise<void>;
  onError: (p: Promise<unknown>) => void;
  onClose: () => void;
  onView: (card: CardInstance) => void;
  readOnly?: boolean;
}) {
  const hover = useHoverPreview();

  function allToBattlefield() {
    let current = mine;
    for (const card of cards) {
      current = moveWithinPublicZones(current, card.instanceId, zone, "battlefield");
    }
    onError(writePublicZones({ [zone]: current[zone] as CardInstance[], battlefield: current.battlefield }));
    onClose();
  }

  function allToHand() {
    // Must go through gameAction (moves to hidden zone)
    for (const card of cards) {
      onAction({ type: "moveToHand", gameId, instanceId: card.instanceId, fromZone: zone });
    }
    onClose();
  }

  const footer = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
      {!readOnly && (
        <>
          <button className="btn btn-sm" onClick={allToBattlefield} disabled={cards.length === 0}>
            All → Battlefield
          </button>
          <button className="btn btn-sm" onClick={allToHand} disabled={cards.length === 0}>
            All → Hand
          </button>
          {zone === "graveyard" && (
            <button
              className="btn btn-sm"
              disabled={cards.length === 0}
              onClick={() => {
                onAction({ type: "shuffleGraveyardIntoLibrary", gameId });
                onClose();
              }}
            >
              Shuffle into library
            </button>
          )}
        </>
      )}
      <div style={{ flex: 1 }} />
      <button className="btn" onClick={onClose}>
        Close
      </button>
    </div>
  );

  return (
    <Modal
      title={`${ZONE_LABEL[zone]} · ${mine.displayName}`}
      onClose={onClose}
      width={760}
      footer={footer}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}
        >
          {cards.length} card{cards.length !== 1 ? "s" : ""}
        </span>
      </div>

      {cards.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Icon name={ZONE_ICON[zone]} size={20} />
          </div>
          <div className="empty-title">Nothing here</div>
          <div className="empty-body">
            Cards moved to {ZONE_LABEL[zone].toLowerCase()} will appear here.
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {cards.map((card) => (
            <ZoneCard
              key={card.instanceId}
              card={card}
              fromZone={zone}
              mine={mine}
              gameId={gameId}
              onAction={onAction}
              writePublicZones={writePublicZones}
              onError={onError}
              onView={onView}
              onMouseEnter={hover.onMouseEnter}
              onMouseLeave={hover.onMouseLeave}
              onMouseMove={hover.onMouseMove}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}
      <HoverPreview anchor={hover.anchor} />
    </Modal>
  );
}

/** ─────────────────────────────── LIBRARY REFERENCE ────────────────────────── */
function LibraryDrawer({
  myPrivate,
  mine,
  gameId,
  onAction,
  onClose,
}: {
  myPrivate: PlayerPrivate;
  mine: PlayerPublic;
  gameId: string;
  onAction: (a: GameAction) => void;
  onClose: () => void;
}) {
  const hover = useHoverPreview();
  const [tutorMenu, setTutorMenu] = useState<{ x: number; y: number; card: CardInstance } | null>(null);
  const library = myPrivate.library;
  const groups = groupCardsByType(library);

  const footer = (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <button
        className="btn btn-sm"
        onClick={() => {
          onAction({ type: "shuffleLibrary", gameId });
          onClose();
        }}
      >
        Shuffle
      </button>
      <div style={{ flex: 1 }} />
      <button className="btn" onClick={onClose}>
        Close
      </button>
    </div>
  );

  return (
    <Modal
      title={`Library · ${mine.displayName}`}
      onClose={onClose}
      width={680}
      footer={footer}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <span
          style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--fg-3)" }}
        >
          {library.length} card{library.length !== 1 ? "s" : ""} remaining
        </span>
        <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
          Click a card name for options
        </span>
      </div>

      {library.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">
            <Icon name="deck" size={20} />
          </div>
          <div className="empty-title">Library empty</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map(({ group, cards }) => {
            // Count unique names
            const nameCounts = new Map<string, { card: CardInstance; count: number }>();
            for (const c of cards) {
              if (nameCounts.has(c.name)) {
                nameCounts.get(c.name)!.count++;
              } else {
                nameCounts.set(c.name, { card: c, count: 1 });
              }
            }

            return (
              <div key={group}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--fg-3)",
                    marginBottom: 6,
                    borderBottom: "1px solid var(--line-1)",
                    paddingBottom: 4,
                  }}
                >
                  {group} ({cards.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {Array.from(nameCounts.entries()).map(([name, { card, count }]) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "4px 8px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--bg-2)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontFamily: "var(--font-mono)",
                            fontSize: 11,
                            color: "var(--fg-3)",
                            minWidth: 16,
                            textAlign: "right",
                          }}
                        >
                          {count}×
                        </span>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ fontWeight: 400, fontSize: 13 }}
                          onClick={(e) =>
                            setTutorMenu({ x: e.clientX, y: e.clientY, card })
                          }
                          onMouseEnter={(e) => hover.onMouseEnter(e, card)}
                          onMouseMove={hover.onMouseMove}
                          onMouseLeave={hover.onMouseLeave}
                          title={name}
                        >
                          {name}
                        </button>
                      </div>
                      <span style={{ fontSize: 11, color: "var(--fg-3)" }}>
                        {card.manaCost}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <HoverPreview anchor={hover.anchor} />
      {tutorMenu && (
        <ContextMenu
          items={[
            {
              label: `Tutor ${tutorMenu.card.name} to hand`,
              onClick: () => {
                onAction({
                  type: "tutorToHand",
                  gameId,
                  instanceId: tutorMenu.card.instanceId,
                });
                onClose();
              },
            },
          ]}
          x={tutorMenu.x}
          y={tutorMenu.y}
          onClose={() => setTutorMenu(null)}
        />
      )}
    </Modal>
  );
}

/** ─────────────────────────────── MAIN EXPORT ───────────────────────────────── */
export function ZoneDrawer({
  zone,
  mine,
  myPrivate,
  gameId,
  onAction,
  writePublicZones,
  onError,
  onClose,
  onView,
  readOnly,
}: ZoneDrawerProps) {
  if (zone === "library") {
    return (
      <LibraryDrawer
        myPrivate={myPrivate}
        mine={mine}
        gameId={gameId}
        onAction={onAction}
        onClose={onClose}
      />
    );
  }

  const cards = mine[zone] || [];

  return (
    <PublicZoneDrawer
      zone={zone}
      cards={cards}
      mine={mine}
      gameId={gameId}
      onAction={onAction}
      writePublicZones={writePublicZones}
      onError={onError}
      onClose={onClose}
      onView={onView}
      readOnly={readOnly}
    />
  );
}
