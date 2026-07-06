import { useState } from "react";
import { Modal } from "./Modal";
import type { HoverCard } from "./HoverPreview";

/** Lean enlarged card view: big image, flip for double-faced cards. */
export function CardImageModal({ card, onClose }: { card: HoverCard; onClose: () => void }) {
  const [back, setBack] = useState(!!card.transformed);
  const uri = back && card.imageUriBack ? card.imageUriBack : card.imageUri;
  return (
    <Modal title={card.name} onClose={onClose} width={380}>
      {uri ? (
        <img src={uri} alt={card.name} style={{ width: "100%", borderRadius: 14, display: "block" }} />
      ) : (
        <div style={{ padding: 24, textAlign: "center", color: "var(--fg-3)" }}>No image available</div>
      )}
      {card.imageUriBack && (
        <button
          className="btn"
          style={{ marginTop: 8, width: "100%", justifyContent: "center" }}
          onClick={() => setBack((b) => !b)}
        >
          Flip
        </button>
      )}
    </Modal>
  );
}
