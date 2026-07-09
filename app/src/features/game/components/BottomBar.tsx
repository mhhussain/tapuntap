import { Icon } from "../../../components/Icon";
import { CardFace } from "../../../components/CardFace";
import type { PlayerPublic, PlayerPrivate, CardInstance } from "../../../types";

type ZoneName = "graveyard" | "exile" | "library" | "command";

interface DropZoneProps {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  className?: string;
}

interface ZoneTabProps {
  icon: string;
  label: string;
  count: number;
  onClick: () => void;
}

function ZoneTab({ icon, label, count, onClick }: ZoneTabProps) {
  return (
    <button className="zone-tab" onClick={onClick}>
      <Icon name={icon} size={14} />
      <span className="zone-tab-label">{label}</span>
      <span className="zone-tab-count">{count}</span>
    </button>
  );
}

interface BottomBarProps {
  player: PlayerPublic;
  myPrivate: PlayerPrivate;
  gameId: string;
  logOpen: boolean;
  onToggleLog: () => void;
  onCardClick: (c: CardInstance) => void;
  onHandContext: (e: React.MouseEvent, c: CardInstance) => void;
  onDraw: () => void;
  onShuffle: () => void;
  /** Seam for Task 12: open zone drawer. Receives zone name. */
  onOpenZone: (zone: ZoneName) => void;
  onScry: () => void;
  onToken: () => void;
  /** Hide the log-toggle button entirely (e.g. playtest, which has no play log). Defaults to shown. */
  showLogToggle?: boolean;
  handDropProps?: DropZoneProps;
  cardDragProps?: (instanceId: string, fromZone: "hand") => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  onCardMouseEnter?: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseLeave?: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseMove?: (e: React.MouseEvent) => void;
}

export function BottomBar({
  player,
  myPrivate,
  logOpen,
  onToggleLog,
  onCardClick,
  onHandContext,
  onDraw,
  onShuffle,
  onOpenZone,
  onScry,
  onToken,
  showLogToggle = true,
  handDropProps,
  cardDragProps,
  onCardMouseEnter,
  onCardMouseLeave,
  onCardMouseMove,
}: BottomBarProps) {
  return (
    <div className="bottom-bar">
      {/* Hand */}
      <div
        className={`hand-area${handDropProps?.className ? ` ${handDropProps.className}` : ""}`}
        onDragOver={handDropProps?.onDragOver}
        onDragLeave={handDropProps?.onDragLeave}
        onDrop={handDropProps?.onDrop}
      >
        <div className="hand-label-row">
          <span className="eyebrow">Hand · {player.displayName}</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>
            {myPrivate.hand.length} cards
          </span>
        </div>
        <div className="hand-cards">
          {myPrivate.hand.length === 0 ? (
            <div
              style={{
                display: "grid",
                placeItems: "center",
                color: "var(--fg-4)",
                fontSize: 12,
                fontStyle: "italic",
                flex: 1,
                minHeight: "var(--density-card-h)",
              }}
            >
              Empty hand.
            </div>
          ) : (
            myPrivate.hand.map((c) => (
              <CardFace
                key={c.instanceId}
                card={c}
                zone="hand"
                onClick={() => onCardClick(c)}
                onContextMenu={(e) => onHandContext(e, c)}
                {...(cardDragProps ? cardDragProps(c.instanceId, "hand") : {})}
                onMouseEnter={onCardMouseEnter ? (e) => onCardMouseEnter(e, c) : undefined}
                onMouseLeave={onCardMouseLeave ? (e) => onCardMouseLeave(e, c) : undefined}
                onMouseMove={onCardMouseMove}
              />
            ))
          )}
        </div>
      </div>

      {/* Zones + actions panel */}
      <div className="zones-actions">
        <div className="eyebrow" style={{ marginBottom: 2 }}>Zones &amp; actions</div>

        {/* Zone tabs: graveyard, exile, library */}
        <div className="zone-tabs">
          <ZoneTab
            icon="graveyard"
            label="Graveyard"
            count={player.graveyard?.length ?? 0}
            onClick={() => onOpenZone("graveyard")}
          />
          <ZoneTab
            icon="exile"
            label="Exile"
            count={player.exile?.length ?? 0}
            onClick={() => onOpenZone("exile")}
          />
          <ZoneTab
            icon="deck"
            label="Library"
            count={player.libraryCount ?? 0}
            onClick={() => onOpenZone("library")}
          />
        </div>

        {/* Command zone tab (if non-empty) */}
        {(player.command?.length ?? 0) > 0 && (
          <div className="zone-tabs" style={{ gridTemplateColumns: "1fr" }}>
            <ZoneTab
              icon="command"
              label="Command"
              count={player.command.length}
              onClick={() => onOpenZone("command")}
            />
          </div>
        )}

        {/* Action row: draw, shuffle, log toggle */}
        <div className="action-row">
          <button className="btn btn-sm" style={{ justifyContent: "center" }} onClick={onDraw}>
            Draw
          </button>
          <button className="btn btn-sm" style={{ justifyContent: "center" }} onClick={onShuffle}>
            Shuffle
          </button>
          <button
            className="btn btn-sm"
            style={{ justifyContent: "center" }}
            onClick={onScry}
            title="Scry"
          >
            <Icon name="scry" size={12} /> Scry
          </button>
          <button
            className="btn btn-sm"
            style={{ justifyContent: "center" }}
            onClick={onToken}
            title="Create token"
          >
            <Icon name="token" size={12} /> Token
          </button>
          {showLogToggle && (
            <button
              className="btn btn-sm btn-icon"
              onClick={onToggleLog}
              title={logOpen ? "Hide log (L)" : "Show log (L)"}
            >
              <Icon name="note" size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
