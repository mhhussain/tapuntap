import type { CardInstance } from "../../../types";
import { CardFace } from "../../../components/CardFace";
import { isLand } from "../../../lib/cards";
import type { GestureDragHandlers, DropZone } from "../useDragDrop";

interface DropZoneProps {
  "data-dropzone": DropZone;
  className?: string;
}

export function Battlefield({
  cards,
  onCardTap,
  onCardMenu,
  onCardMouseEnter,
  onCardMouseLeave,
  onCardMouseMove,
  cardGestureDrag,
  creatureLaneDropProps,
  landLaneDropProps,
}: {
  cards: CardInstance[];
  onCardTap: (c: CardInstance) => void;
  onCardMenu: (c: CardInstance, x: number, y: number) => void;
  onCardMouseEnter?: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseLeave?: (e: React.MouseEvent, c: CardInstance) => void;
  onCardMouseMove?: (e: React.MouseEvent) => void;
  cardGestureDrag?: (c: CardInstance, fromZone: "battlefield") => GestureDragHandlers;
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
        {...(creatureLaneDropProps ? { "data-dropzone": creatureLaneDropProps["data-dropzone"] } : {})}
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
            Tap to tap/untap · hold or right-click for actions · drag to move
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
                  onTap={() => onCardTap(c)}
                  onMenu={(x, y) => onCardMenu(c, x, y)}
                  gestureDrag={cardGestureDrag ? cardGestureDrag(c, "battlefield") : undefined}
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
        {...(landLaneDropProps ? { "data-dropzone": landLaneDropProps["data-dropzone"] } : {})}
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
                onTap={() => onCardTap(c)}
                onMenu={(x, y) => onCardMenu(c, x, y)}
                gestureDrag={cardGestureDrag ? cardGestureDrag(c, "battlefield") : undefined}
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
