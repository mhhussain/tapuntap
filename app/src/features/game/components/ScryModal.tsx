import { useState } from "react";
import { Modal } from "../../../components/Modal";
import { CardFace } from "../../../components/CardFace";
import { HoverPreview, useHoverPreview } from "../../../components/HoverPreview";
import type { CardInstance, GameAction } from "../../../types";

type Decision = "top" | "bottom";

/**
 * Pure helper: given the top-N cards and a per-instanceId decision map,
 * produce the payload the server `scry` handler expects:
 *   order    — instanceIds to keep on top, in the player's chosen order
 *   toBottom — instanceIds to send to bottom, in player's chosen order
 */
export function buildScryResult(
  topCards: CardInstance[],
  decisions: Record<string, Decision>
): { order: string[]; toBottom: string[] } {
  const order: string[] = [];
  const toBottom: string[] = [];
  for (const card of topCards) {
    if (decisions[card.instanceId] === "bottom") {
      toBottom.push(card.instanceId);
    } else {
      order.push(card.instanceId);
    }
  }
  return { order, toBottom };
}

interface ScryModalProps {
  topCards: CardInstance[];
  gameId: string;
  onAction: (a: GameAction) => void;
  onClose: () => void;
}

export function ScryModal({ topCards, gameId, onAction, onClose }: ScryModalProps) {
  const hover = useHoverPreview();
  const [decisions, setDecisions] = useState<Record<string, Decision>>(() => {
    const init: Record<string, Decision> = {};
    for (const c of topCards) init[c.instanceId] = "top";
    return init;
  });

  function setAll(dest: Decision) {
    const next: Record<string, Decision> = {};
    for (const c of topCards) next[c.instanceId] = dest;
    setDecisions(next);
  }

  function confirm() {
    const result = buildScryResult(topCards, decisions);
    onAction({ type: "scry", gameId, ...result });
    onClose();
  }

  return (
    <Modal
      title={`Scry · Top of library`}
      onClose={onClose}
      width={620}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={confirm}>
            Confirm order
          </button>
        </>
      }
    >
      <p style={{ margin: "0 0 16px", color: "var(--fg-2)" }}>
        Look at the top {topCards.length} card{topCards.length !== 1 ? "s" : ""} of your
        library. Put any number on the bottom; rest stay on top in chosen order.
      </p>

      {/* All-top / all-bottom shortcuts */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className="btn btn-sm" style={{ justifyContent: "center" }} onClick={() => setAll("top")}>
          All top
        </button>
        <button className="btn btn-sm" style={{ justifyContent: "center" }} onClick={() => setAll("bottom")}>
          All bottom
        </button>
      </div>

      {topCards.length === 0 ? (
        <p style={{ color: "var(--fg-3)", fontStyle: "italic" }}>Library is empty.</p>
      ) : (
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 16, flexWrap: "wrap" }}>
          {topCards.map((card) => {
            const dest = decisions[card.instanceId] ?? "top";
            return (
              <div
                key={card.instanceId}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}
              >
                <div
                  style={{ width: 100, height: 140 }}
                  onMouseEnter={(e) => hover.onMouseEnter(e, card)}
                  onMouseMove={hover.onMouseMove}
                  onMouseLeave={hover.onMouseLeave}
                >
                  <CardFace card={card} zone="library" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                  <button
                    className="btn btn-sm"
                    style={{
                      justifyContent: "center",
                      background: dest === "top" ? "var(--accent-soft)" : "var(--bg-2)",
                      borderColor: dest === "top" ? "var(--accent)" : "var(--line-2)",
                    }}
                    onClick={() =>
                      setDecisions((d) => ({ ...d, [card.instanceId]: "top" }))
                    }
                  >
                    Top
                  </button>
                  <button
                    className="btn btn-sm"
                    style={{
                      justifyContent: "center",
                      background: dest === "bottom" ? "var(--accent-soft)" : "var(--bg-2)",
                      borderColor: dest === "bottom" ? "var(--accent)" : "var(--line-2)",
                    }}
                    onClick={() =>
                      setDecisions((d) => ({ ...d, [card.instanceId]: "bottom" }))
                    }
                  >
                    Bottom
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <HoverPreview anchor={hover.anchor} />
    </Modal>
  );
}
