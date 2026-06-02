import { useState } from "react";
import { Modal } from "../../../components/Modal";
import { newInstanceId } from "../../../lib/cards";
import type { CardInstance } from "../../../types";

const PRESETS = [
  { name: "Soldier", pt: "1/1", color: "W" },
  { name: "Spirit",  pt: "1/1", color: "W" },
  { name: "Goblin",  pt: "1/1", color: "R" },
  { name: "Dragon",  pt: "5/5", color: "R" },
  { name: "Zombie",  pt: "2/2", color: "B" },
  { name: "Beast",   pt: "3/3", color: "G" },
] as const;

const COLORS = ["W", "U", "B", "R", "G", "C"] as const;

interface TokenModalProps {
  currentBattlefield: CardInstance[];
  onWrite: (battlefield: CardInstance[]) => void;
  onClose: () => void;
}

function parsePT(pt: string): { power: string; toughness: string } {
  const [p, t] = pt.split("/");
  return { power: p?.trim() ?? "1", toughness: t?.trim() ?? "1" };
}

export function TokenModal({ currentBattlefield, onWrite, onClose }: TokenModalProps) {
  const [name, setName] = useState("Soldier");
  const [pt, setPt] = useState("1/1");
  const [color, setColor] = useState<string>("W");
  const [quantity, setQuantity] = useState(1);

  function create() {
    const { power, toughness } = parsePT(pt);
    const tokens: CardInstance[] = Array.from({ length: quantity }, () => ({
      instanceId: newInstanceId(),
      cardId: `token-${name.toLowerCase().replace(/\s+/g, "-")}`,
      name,
      manaCost: "",
      cmc: 0,
      typeLine: `Creature — ${name} Token`,
      colors: [color],
      imageUri: null,
      imageUriBack: null,
      power,
      toughness,
      loyalty: null,
      tapped: false,
      transformed: false,
      faceDown: false,
      summoningSick: true,
      counters: {},
      attachedTo: null,
      token: true,
    }));
    onWrite([...currentBattlefield, ...tokens]);
    onClose();
  }

  return (
    <Modal
      title="Create token"
      onClose={onClose}
      width={560}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={create}>
            Create token
          </button>
        </>
      }
    >
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        Presets
      </div>
      <div
        style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}
      >
        {PRESETS.map((t) => (
          <button
            key={t.name}
            className="btn"
            style={{ justifyContent: "flex-start" }}
            onClick={() => {
              setName(t.name);
              setPt(t.pt);
              setColor(t.color);
            }}
          >
            <span className={`pip pip-${t.color.toLowerCase()}`} />
            <span>{t.name}</span>
            <span
              style={{
                marginLeft: "auto",
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                color: "var(--fg-3)",
              }}
            >
              {t.pt}
            </span>
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 80px 1fr", gap: 12 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Name
          </div>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            P/T
          </div>
          <input
            className="input"
            value={pt}
            onChange={(e) => setPt(e.target.value)}
            style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}
          />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Qty
          </div>
          <input
            className="input"
            type="number"
            min={1}
            max={20}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            style={{ textAlign: "center", fontFamily: "var(--font-mono)" }}
          />
        </div>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            Color
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {COLORS.map((c) => (
              <button
                key={c}
                className="btn btn-icon"
                onClick={() => setColor(c)}
                style={{
                  background:
                    color === c ? `var(--mana-${c.toLowerCase()})` : "var(--bg-2)",
                  borderColor:
                    color === c ? `var(--mana-${c.toLowerCase()})` : "var(--line-2)",
                  flex: 1,
                  padding: 0,
                  height: 30,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 11,
                    color: color === c ? "oklch(0.18 0 0)" : "var(--fg-2)",
                  }}
                >
                  {c}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
