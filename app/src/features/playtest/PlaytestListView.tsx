import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { listSessions, deleteSession } from "./store";

export function PlaytestListView() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState(() => listSessions());

  function handleDelete(id: string) {
    if (!confirm("Delete this playtest session?")) return;
    deleteSession(id);
    setSessions(listSessions());
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Playtest</div>
        <span className="topbar-sub">{sessions.length} sessions · stored in this browser</span>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/playtest/new")}>
          <Icon name="plus" size={14} /> New playtest
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {sessions.length === 0 && (
          <div className="empty">
            <div className="empty-title">No playtest sessions</div>
            <div className="empty-body">Spin one up to goldfish a deck against your own brews.</div>
          </div>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 720 }}>
          {sessions.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 8 }}>
              <div style={{ flex: 1, cursor: "pointer" }} onClick={() => navigate(`/playtest/${s.id}`)}>
                <div style={{ fontWeight: 600, color: "var(--fg-0)" }}>{s.name}</div>
                <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  {s.format} · {s.deckNames.join(" vs ")} · {new Date(s.updatedAt).toLocaleString()}
                </div>
              </div>
              <button className="btn btn-sm" onClick={() => navigate(`/playtest/${s.id}`)}>Resume</button>
              <button className="btn btn-icon btn-danger btn-sm" title="Delete" onClick={() => handleDelete(s.id)}>
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
