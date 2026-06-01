import { useState } from "react";
import { Modal } from "../../../components/Modal";
import { CardFace } from "../../../components/CardFace";
import { Icon } from "../../../components/Icon";
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

/** ─────────────────────────────── CARD ACTION BUTTONS ────────────────────── */
interface CardActionsProps {
  card: CardInstance;
  fromZone: PublicZone;
  mine: PlayerPublic;
  gameId: string;
  onAction: (a: GameAction) => void;
  writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) => Promise<void>;
  onError: (p: Promise<unknown>) => void;
  onClose: () => void;
}

function CardActionMenu({
  card,
  fromZone,
  mine,
  gameId,
  onAction,
  writePublicZones,
  onError,
  onClose,
}: CardActionsProps) {
  // Public-zone destinations excluding current zone and battlefield
  const otherPublicZones: PublicZone[] = (
    ["graveyard", "exile", "command"] as PublicZone[]
  ).filter((z) => z !== fromZone);

  function moveToPublic(toZone: PublicZone) {
    const next = moveWithinPublicZones(mine, card.instanceId, fromZone, toZone);
    onError(writePublicZones({ [fromZone]: next[fromZone], [toZone]: next[toZone] }));
    onClose();
  }

  function moveToBattlefield() {
    const next = moveWithinPublicZones(mine, card.instanceId, fromZone, "battlefield");
    onError(writePublicZones({ [fromZone]: next[fromZone], battlefield: next.battlefield }));
    onClose();
  }

  function moveToHand() {
    onAction({ type: "moveToHand", gameId, instanceId: card.instanceId, fromZone });
    onClose();
  }

  function moveToLibraryTop() {
    onAction({ type: "moveToLibrary", gameId, instanceId: card.instanceId, fromZone, position: "top" });
    onClose();
  }

  function moveToLibraryBottom() {
    onAction({ type: "moveToLibrary", gameId, instanceId: card.instanceId, fromZone, position: "bottom" });
    onClose();
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "6px 0",
        minWidth: 140,
      }}
    >
      <button
        className="btn btn-sm"
        style={{ justifyContent: "flex-start" }}
        onClick={moveToBattlefield}
      >
        → Battlefield
      </button>
      {otherPublicZones.map((z) => (
        <button
          key={z}
          className="btn btn-sm"
          style={{ justifyContent: "flex-start" }}
          onClick={() => moveToPublic(z)}
        >
          → {ZONE_LABEL[z]}
        </button>
      ))}
      <div style={{ height: 1, background: "var(--line-1)", margin: "3px 0" }} />
      <button
        className="btn btn-sm"
        style={{ justifyContent: "flex-start" }}
        onClick={moveToHand}
      >
        → Hand
      </button>
      <button
        className="btn btn-sm"
        style={{ justifyContent: "flex-start" }}
        onClick={moveToLibraryTop}
      >
        → Library top
      </button>
      <button
        className="btn btn-sm"
        style={{ justifyContent: "flex-start" }}
        onClick={moveToLibraryBottom}
      >
        → Library bottom
      </button>
    </div>
  );
}

/** ─────────────────────────────── CARD WITH INLINE POPOVER ─────────────────── */
interface ZoneCardProps {
  card: CardInstance;
  fromZone: PublicZone;
  mine: PlayerPublic;
  gameId: string;
  onAction: (a: GameAction) => void;
  writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) => Promise<void>;
  onError: (p: Promise<unknown>) => void;
  onCloseDrawer: () => void;
}

function ZoneCard({
  card,
  fromZone,
  mine,
  gameId,
  onAction,
  writePublicZones,
  onError,
  onCloseDrawer,
}: ZoneCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div
        style={{ cursor: "pointer" }}
        onClick={() => setOpen((o) => !o)}
        title={card.name}
      >
        <CardFace card={card} zone={fromZone} />
      </div>
      {open && (
        <>
          {/* Backdrop to close */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 10 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 20,
              background: "var(--bg-2)",
              border: "1px solid var(--line-2)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-2)",
              padding: "4px 8px",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--fg-3)",
                padding: "2px 0 4px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                maxWidth: 140,
              }}
            >
              {card.name}
            </div>
            <CardActionMenu
              card={card}
              fromZone={fromZone}
              mine={mine}
              gameId={gameId}
              onAction={onAction}
              writePublicZones={writePublicZones}
              onError={onError}
              onClose={() => {
                setOpen(false);
                onCloseDrawer();
              }}
            />
          </div>
        </>
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
}: {
  zone: PublicZone;
  cards: CardInstance[];
  mine: PlayerPublic;
  gameId: string;
  onAction: (a: GameAction) => void;
  writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) => Promise<void>;
  onError: (p: Promise<unknown>) => void;
  onClose: () => void;
}) {
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
              onCloseDrawer={onClose}
            />
          ))}
        </div>
      )}
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
          Click a card name to tutor to hand
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
                          onClick={() => {
                            // Tutor first matching instance to hand
                            onAction({
                              type: "tutorToHand",
                              gameId,
                              instanceId: card.instanceId,
                            });
                            onClose();
                          }}
                          title={`Tutor ${name} to hand`}
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
    />
  );
}
