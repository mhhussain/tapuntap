import { useState } from "react";
import { Icon } from "../../../components/Icon";
import type { LogEntry } from "../../../types";

export function SidePanel({
  log,
  notes,
  onNotes,
  onClose,
}: {
  log: LogEntry[];
  notes: string;
  onNotes: (v: string) => void;
  onClose?: () => void;
}) {
  const [tab, setTab] = useState<"log" | "notes">("log");

  return (
    <aside className="side-panel">
      <div className="side-panel-tabs">
        {(["log", "notes"] as const).map((t) => (
          <button
            key={t}
            className={`side-tab${tab === t ? " active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        {onClose && (
          <button
            className="btn btn-ghost btn-icon"
            onClick={onClose}
            title="Hide panel (L)"
            style={{ margin: "0 8px" }}
          >
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "log" ? (
          [...log].reverse().slice(0, 60).map((e, i) => (
            <div key={i} className="log-entry">
              <span className="log-turn">T{e.turn ?? ""}</span>
              <span className="log-who">{e.who ?? ""}</span>
              <span className="log-text">{e.text}</span>
            </div>
          ))
        ) : (
          <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            <textarea
              className="input"
              style={{ minHeight: 200, resize: "vertical", fontFamily: "var(--font-sans)", lineHeight: 1.5 }}
              value={notes}
              onChange={(e) => onNotes(e.target.value)}
              placeholder="Jot down anything — opponent's tells, sequencing notes, board threats…"
            />
            <div style={{ fontSize: 10, color: "var(--fg-4)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              Saves with the game.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
