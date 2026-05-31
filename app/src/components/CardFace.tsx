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
  const classes = ["card-face", card.tapped ? "tapped" : "", isLand(card.typeLine) ? "is-land" : ""]
    .filter(Boolean).join(" ");
  return (
    <div className={classes} style={{ ["--card-tone" as any]: tone }} data-zone={zone}
      title={card.name} onClick={onClick} onContextMenu={onContextMenu}
      draggable={draggable} onDragStart={onDragStart}>
      <div className="card-color-bar" style={{ background: tone }} />
      {card.imageUri
        ? <img className="card-img-fill" src={card.imageUri} alt={card.name} loading="lazy" />
        : <div className="card-name">{card.name}</div>}
      {Object.entries(card.counters || {}).filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="card-counter">{k}:{v}</div>
      ))}
      {card.token && <div className="card-token-badge">TKN</div>}
    </div>
  );
}
