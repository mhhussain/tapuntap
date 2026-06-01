import type { CardInstance } from "../../../types";
import { CardFace } from "../../../components/CardFace";
import { isLand } from "../../../lib/cards";

export function Battlefield({
  cards,
  onCardClick,
  onCardContext,
}: {
  cards: CardInstance[];
  onCardClick: (c: CardInstance) => void;
  onCardContext: (e: React.MouseEvent, c: CardInstance) => void;
}) {
  const creatures = cards.filter((c) => !isLand(c.typeLine));
  const lands = cards.filter((c) => isLand(c.typeLine));
  const availLands = lands.filter((l) => !l.tapped).length;

  return (
    <div className="bf-zones-wrap">
      {/* Creatures & Spells lane */}
      <div className="bf-zone" style={{ flex: 1 }}>
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
            Click to tap · right-click for actions
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
              No permanents yet.
            </div>
          ) : (
            creatures.map((c) => (
              <div key={c.instanceId} style={{ position: "relative" }}>
                <CardFace
                  card={c}
                  zone="battlefield"
                  onClick={() => onCardClick(c)}
                  onContextMenu={(e) => onCardContext(e, c)}
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
      <div className="bf-zone">
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
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
