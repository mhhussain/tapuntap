import { useNavigate } from "react-router-dom";
import { useMyDecks } from "../../api/hooks";
import { deleteDeck } from "../../api/decks";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { useState } from "react";

export function DecksView() {
  const [version, setVersion] = useState(0); // bump to refetch after delete
  const { decks, error } = useMyDecks(version);
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Decks</div>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/decks/new")}>
          <Icon name="plus" size={14} /> New deck
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }} key={version}>
        {error && <div className="empty-title">{error}</div>}
        {!decks && !error && <div style={{ color: "var(--fg-3)" }}>Loading…</div>}
        {decks && decks.length === 0 && (
          <div className="empty-state"><div className="empty-title">No decks yet</div>
            <button className="btn btn-primary" onClick={() => navigate("/decks/new")}>Build your first deck</button>
          </div>
        )}
        <div className="decks-grid">
          {decks?.map((d) => (
            <div key={d.id} className="panel" style={{ padding: 16 }}>
              <div style={{ fontWeight: 600 }} onClick={() => navigate(`/decks/${d.id}`)}
                role="button">{d.name}</div>
              <div className="muted mono" style={{ fontSize: 11 }}>{d.cardCount} cards · {d.format} · v{d.version}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={async () => {
                if (!confirm("Delete this deck?")) return;
                try { await deleteDeck(d.id); toast("Deck deleted"); setVersion((v) => v + 1); }
                catch (e) { toast((e as Error).message, "error"); }
              }}><Icon name="trash" size={12} /></button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
