import { useState } from "react";
import { Modal } from "../../../components/Modal";
import { ManaCost } from "../../../components/ManaCost";
import type { CardInstance } from "../../../types";

export function CardDetailModal({ card, onClose }: { card: CardInstance; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);

  const isDoubleFaced = !!card.imageUriBack;
  const imageUri = flipped && card.imageUriBack ? card.imageUriBack : card.imageUri;
  const ptStr =
    card.power != null && card.toughness != null
      ? `${card.power}/${card.toughness}`
      : card.loyalty != null
      ? `Loyalty: ${card.loyalty}`
      : null;

  return (
    <Modal title={card.name} onClose={onClose} width="min(90vw, 760px)">
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
        {/* Card image */}
        <div style={{ flexShrink: 0 }}>
          {imageUri ? (
            <img
              src={imageUri}
              alt={card.name}
              style={{
                width: "min(320px, 38vw)",
                aspectRatio: "63 / 88",
                borderRadius: 10,
                objectFit: "cover",
                border: "1px solid var(--line-2)",
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: "min(320px, 38vw)",
                aspectRatio: "63 / 88",
                borderRadius: 10,
                background: "var(--bg-2)",
                border: "1px solid var(--line-2)",
                display: "grid",
                placeItems: "center",
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 16,
                color: "var(--fg-3)",
              }}
            >
              {card.name}
            </div>
          )}

          {isDoubleFaced && (
            <button
              className="btn btn-sm"
              style={{ width: "100%", justifyContent: "center", marginTop: 8 }}
              onClick={() => setFlipped((f) => !f)}
            >
              ↻ Flip
            </button>
          )}
        </div>

        {/* Card details */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div
              style={{
                fontFamily: "var(--font-serif)",
                fontStyle: "italic",
                fontSize: 20,
                color: "var(--fg-0)",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              {card.name}
            </div>
            {card.manaCost && (
              <ManaCost cost={card.manaCost} />
            )}
          </div>

          {card.typeLine && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--fg-3)",
                  marginBottom: 3,
                }}
              >
                Type
              </div>
              <div style={{ fontSize: 13, color: "var(--fg-1)" }}>{card.typeLine}</div>
            </div>
          )}

          {ptStr && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--fg-3)",
                  marginBottom: 3,
                }}
              >
                {card.loyalty != null ? "Loyalty" : "Power / Toughness"}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 18,
                  fontWeight: 700,
                  color: "var(--fg-0)",
                }}
              >
                {ptStr}
              </div>
            </div>
          )}

          {Object.keys(card.counters || {}).length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 9,
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--fg-3)",
                  marginBottom: 3,
                }}
              >
                Counters
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {Object.entries(card.counters)
                  .filter(([, v]) => v)
                  .map(([k, v]) => (
                    <span
                      key={k}
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                        border: "1px solid var(--accent-line)",
                        borderRadius: 4,
                        padding: "2px 7px",
                      }}
                    >
                      {k}: {v}
                    </span>
                  ))}
              </div>
            </div>
          )}

          {card.token && (
            <span
              style={{
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                background: "var(--accent)",
                color: "var(--bg-0)",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 700,
                textTransform: "uppercase",
                alignSelf: "flex-start",
              }}
            >
              Token
            </span>
          )}
        </div>
      </div>
    </Modal>
  );
}
