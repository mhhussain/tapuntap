import type { CardInstance } from "../types";
import { colorTone } from "../lib/format";
import { isLand } from "../lib/cards";

export function CardFace({ card, zone, onClick, onContextMenu, draggable, onDragStart }: {
  card: CardInstance;
  zone: string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const tone = colorTone(card.colors || []);
  const imageUri = card.transformed && card.imageUriBack ? card.imageUriBack : card.imageUri;
  const ptStr = card.power != null && card.toughness != null
    ? `${card.power}/${card.toughness}`
    : card.loyalty != null
    ? `${card.loyalty}`
    : null;

  const classes = [
    "card-face",
    card.tapped ? "tapped" : "",
    card.summoningSick ? "summoning-sick" : "",
    isLand(card.typeLine) ? "is-land" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classes}
      style={{ ["--card-tone" as string]: tone } as React.CSSProperties}
      data-zone={zone}
      title={`${card.name}${ptStr ? ` • ${ptStr}` : ""}`}
      onClick={onClick}
      onContextMenu={onContextMenu}
      draggable={draggable}
      onDragStart={onDragStart}
    >
      <div className="card-color-bar" style={{ background: tone }} />
      {imageUri ? (
        <img className="card-img-fill" src={imageUri} alt={card.name} loading="lazy" />
      ) : (
        <>
          <div className="card-name">{card.name}</div>
          <div className="card-art" />
          <div className="card-foot">
            <span className="card-cost" />
            {ptStr && <span className="card-pt">{ptStr}</span>}
          </div>
        </>
      )}
      {Object.entries(card.counters || {})
        .filter(([, v]) => v)
        .map(([k, v]) => (
          <div key={k} className="card-counter">
            {k !== "n" ? `${k}:${v}` : `+${v}`}
          </div>
        ))}
      {card.token && <div className="card-token-badge">TKN</div>}
    </div>
  );
}
