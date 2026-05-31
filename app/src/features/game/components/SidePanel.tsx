import { useState } from "react";
import type { LogEntry } from "../../../types";

export function SidePanel({ log, notes, onNotes }: {
  log: LogEntry[]; notes: string; onNotes: (v: string) => void;
}) {
  const [tab, setTab] = useState<"log" | "notes">("log");
  return (
    <aside className="side-panel">
      <div className="side-panel-tabs">
        <button className={`side-tab${tab === "log" ? " active" : ""}`} onClick={() => setTab("log")}>Log</button>
        <button className={`side-tab${tab === "notes" ? " active" : ""}`} onClick={() => setTab("notes")}>Notes</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {tab === "log"
          ? [...log].reverse().slice(0, 60).map((e, i) => (
              <div key={i} className="log-entry"><span className="log-turn">T{e.turn || ""}</span>
                <span className="log-who">{e.who || ""}</span> <span className="log-text">{e.text}</span></div>))
          : <textarea className="input" style={{ width: "100%", minHeight: 200 }} value={notes}
              onChange={(e) => onNotes(e.target.value)} placeholder="Notes…" />}
      </div>
    </aside>
  );
}
