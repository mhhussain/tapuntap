import type { CardInstance } from "../../../types";
import { CardFace } from "../../../components/CardFace";

export function Hand({ cards, displayName, onCardClick, onCardContext }: {
  cards: CardInstance[];
  displayName: string;
  onCardClick: (c: CardInstance) => void;
  onCardContext: (e: React.MouseEvent, c: CardInstance) => void;
}) {
  return (
    <div className="hand-area">
      <div className="hand-label-row">
        <span className="eyebrow">Hand · {displayName}</span>
        <span className="mono" style={{ fontSize: 11 }}>{cards.length}</span>
      </div>
      <div className="hand-cards">
        {cards.length === 0 ? <div style={{ color: "var(--fg-4)", fontSize: 12 }}>Empty hand.</div>
          : cards.map((c) => <CardFace key={c.instanceId} card={c} zone="hand"
              onClick={() => onCardClick(c)} onContextMenu={(e) => onCardContext(e, c)} />)}
      </div>
    </div>
  );
}
