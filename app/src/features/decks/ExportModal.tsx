import { useState } from "react";
import { Modal } from "../../components/Modal";
import { Icon } from "../../components/Icon";
import type { Deck, DeckCardEntry } from "../../types";

export function buildDecklistText(deck: Pick<Deck, "commander" | "cards">): string {
  const lines: string[] = [];
  if (deck.commander) {
    lines.push("Commander");
    lines.push(`${deck.commander.quantity} ${deck.commander.name}`);
    lines.push("");
  }
  lines.push("Deck");
  for (const c of deck.cards as DeckCardEntry[]) {
    lines.push(`${c.quantity} ${c.name}`);
  }
  return lines.join("\n");
}

export interface ExportModalProps {
  deck: Pick<Deck, "commander" | "cards">;
  onClose: () => void;
}

export function ExportModal({ deck, onClose }: ExportModalProps) {
  const [copied, setCopied] = useState(false);
  const text = buildDecklistText(deck);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — user can still select/copy manually
    }
  }

  return (
    <Modal
      title="Export deck"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? (
              <>
                <Icon name="check" size={14} /> Copied
              </>
            ) : (
              <>
                <Icon name="copy" size={14} /> Copy
              </>
            )}
          </button>
        </>
      }
    >
      <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginBottom: 8 }}>
        MTG Arena format · paste back into Import
      </div>
      <textarea
        className="imp-paste"
        readOnly
        value={text}
        spellCheck={false}
        onFocus={(e) => e.currentTarget.select()}
      />
    </Modal>
  );
}
