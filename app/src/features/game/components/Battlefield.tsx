import type { CardInstance } from "../../../types";
import { CardFace } from "../../../components/CardFace";
import { isLand } from "../../../lib/cards";

interface DropZoneProps {
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  className?: string;
}

export function Battlefield({
  cards,
  onCardClick,
  onCardContext,
  onCardMouseEnter,
  onCardMouseLeave,
  onCardMouseMove,
  cardDragProps,
  creatureLaneDropProps,
  landLaneDropProps,
}: {
  cards: CardInstance[];
  onCardClick: (c: CardInstance) => void;
  onCardContext: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseEnter?: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseLeave?: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseMove?: (e: React.MouseEvent) => void;
  cardDragProps?: (instanceId: string, fromZone: "battlefield") => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: () => void;
  };
  creatureLaneDropProps?: DropZoneProps;
  landLaneDropProps?: DropZoneProps;
}) {
  const creatures = cards.filter((c) => !isLand(c.typeLine));
  const lands = cards.filter((c) => isLand(c.typeLine));
  const availLands = lands.filter((l) => !l.tapped).length;

  return (
    <div className="bf-zones-wrap">
      {/* Creatures & Spells lane */}
      <div
        className={`bf-zone${creatureLaneDropProps?.className ? ` ${creatureLaneDropProps.className}` : ""}`}
        style={{ flex: 1 }}
        onDragOver={creatureLaneDropProps?.onDragOver}
        onDragLeave={creatureLaneDropProps?.onDragLeave}
        onDrop={creatureLaneDropProps?.onDrop}
      >
        <div className="bf-zone-header">
          <span className="eyebrow">Battlefield · Creatures &amp; Spells</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            {creatures.length}
          </span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, color: "var(--fg-4)" }}>
            Click for detail · right-click for actions · drag to play
          </span>
        </div>
        <div className="bf-zone-cards">
          {creatures.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                color: "var(--fg-4)",
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              No permanents yet. Drag a card here from your hand.
            </div>
          ) : (
            creatures.map((c) => (
              <div key={c.instanceId} style={{ position: "relative" }}>
                <CardFace
                  card={c}
                  zone="battlefield"
                  onClick={() => onCardClick(c)}
                  onContextMenu={(e) => onCardContext(e, c)}
                  {...(cardDragProps ? cardDragProps(c.instanceId, "battlefield") : {})}
                  onMouseEnter={onCardMouseEnter ? (e) => onCardMouseEnter(e, c) : undefined}
                  onMouseLeave={onCardMouseLeave ? (e) => onCardMouseLeave(e, c) : undefined}
                  onMouseMove={onCardMouseMove}
                />
                {c.token && (
                  <span
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      fontSize: 8,
                      fontFamily: "var(--font-mono)",
                      background: "var(--accent)",
                      color: "var(--bg-0)",
                      padding: "1px 4px",
                      borderRadius: 3,
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    TKN
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lands lane */}
      <div
        className={`bf-zone${landLaneDropProps?.className ? ` ${landLaneDropProps.className}` : ""}`}
        onDragOver={landLaneDropProps?.onDragOver}
        onDragLeave={landLaneDropProps?.onDragLeave}
        onDrop={landLaneDropProps?.onDrop}
      >
        <div className="bf-zone-header">
          <span className="eyebrow">Lands</span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-3)",
            }}
          >
            {availLands} / {lands.length} available
          </span>
        </div>
        <div className="bf-zone-cards">
          {lands.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: "grid",
                placeItems: "center",
                color: "var(--fg-4)",
                fontSize: 12,
                fontStyle: "italic",
              }}
            >
              No lands in play.
            </div>
          ) : (
            lands.map((c) => (
              <CardFace
                key={c.instanceId}
                card={c}
                zone="battlefield"
                onClick={() => onCardClick(c)}
                onContextMenu={(e) => onCardContext(e, c)}
                {...(cardDragProps ? cardDragProps(c.instanceId, "battlefield") : {})}
                onMouseEnter={onCardMouseEnter ? (e) => onCardMouseEnter(e, c) : undefined}
                onMouseLeave={onCardMouseLeave ? (e) => onCardMouseLeave(e, c) : undefined}
                onMouseMove={onCardMouseMove}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
