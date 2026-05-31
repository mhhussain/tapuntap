import type { CardInstance } from "../../../types";
import { CardFace } from "../../../components/CardFace";
import { isLand } from "../../../lib/cards";

export function Battlefield({ cards, onCardClick, onCardContext }: {
  cards: CardInstance[];
  onCardClick: (c: CardInstance) => void;
  onCardContext: (e: React.MouseEvent, c: CardInstance) => void;
}) {
  const creatures = cards.filter((c) => !isLand(c.typeLine));
  const lands = cards.filter((c) => isLand(c.typeLine));
  return (
    <div className="bf-zones-wrap">
      <div className="bf-zone" style={{ flex: 1 }}>
        <div className="bf-zone-header"><span className="eyebrow">Battlefield · Creatures &amp; Spells</span></div>
        <div className="bf-zone-cards">
          {creatures.length === 0 ? <div style={{ color: "var(--fg-4)", fontSize: 12 }}>No permanents yet.</div>
            : creatures.map((c) => <CardFace key={c.instanceId} card={c} zone="battlefield"
                onClick={() => onCardClick(c)} onContextMenu={(e) => onCardContext(e, c)} />)}
        </div>
      </div>
      <div className="bf-zone">
        <div className="bf-zone-header"><span className="eyebrow">Lands</span></div>
        <div className="bf-zone-cards">
          {lands.map((c) => <CardFace key={c.instanceId} card={c} zone="battlefield"
            onClick={() => onCardClick(c)} onContextMenu={(e) => onCardContext(e, c)} />)}
        </div>
      </div>
    </div>
  );
}
