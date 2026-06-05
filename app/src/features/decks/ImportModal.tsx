import { useEffect, useRef, useState } from "react";
import { Icon } from "../../components/Icon";
import { toEntry } from "../../lib/cards";
import { parseMtgArena, fetchCardNameCatalog, resolveCards } from "../../lib/import";
import type { ScryfallCard } from "../../lib/import";
import type { DeckCardEntry } from "../../types";

type RowStatus = "loading" | "resolved" | "failed";

interface ImportRow {
  id: string;
  qty: number;
  name: string;
  status: RowStatus;
  card: ScryfallCard | null;
  isNew?: boolean;
}

let rowSeq = 0;

const IMPORT_EXAMPLE = `Deck
4 Lightning Bolt
4 Counterspell
1 Sol Ring
36 Island

Sideboard
2 Negate`;

export interface ImportModalProps {
  onClose: () => void;
  onImport: (cards: DeckCardEntry[], failedCount: number) => void;
}

export function ImportModal({ onClose, onImport }: ImportModalProps) {
  const [phase, setPhase] = useState<"paste" | "resolve">("paste");
  const [text, setText] = useState(IMPORT_EXAMPLE);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const abortRef = useRef(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      abortRef.current = true;
    };
  }, [onClose]);

  const resolved = rows.filter((r) => r.status === "resolved").length;
  const total = rows.length;
  const pct = total ? (resolved / total) * 100 : 0;

  async function startResolve() {
    const parsed = parseMtgArena(text);
    if (!parsed.length) return;

    const catalog = await fetchCardNameCatalog();

    const initialRows: ImportRow[] = parsed.map((p) => {
      const inCatalog = catalog === null || catalog.has(p.name.toLowerCase());
      return {
        id: "r" + rowSeq++,
        qty: p.quantity,
        name: p.name,
        status: inCatalog ? "loading" : "failed",
        card: null,
      };
    });

    setRows(initialRows);
    setPhase("resolve");

    const toFetch = [...new Set(initialRows.filter((r) => r.status === "loading").map((r) => r.name))];

    for (let i = 0; i < toFetch.length; i += 5) {
      if (abortRef.current) break;
      const batch = toFetch.slice(i, i + 5);
      const batchMap = await resolveCards(batch);
      setRows((current) =>
        current.map((r) => {
          if (r.status !== "loading" || !batchMap.has(r.name)) return r;
          const card = batchMap.get(r.name) ?? null;
          return { ...r, status: card ? "resolved" : "failed", card };
        })
      );
    }
  }

  function editName(id: string, name: string) {
    setRows((rs) => rs.map((r) => r.id === id ? { ...r, name } : r));
  }

  async function retryRow(id: string) {
    const row = rows.find((r) => r.id === id);
    if (!row || !row.name.trim()) return;

    const catalog = await fetchCardNameCatalog();
    const inCatalog = catalog === null || catalog.has(row.name.trim().toLowerCase());
    if (!inCatalog) return;

    setRows((rs) => rs.map((r) => r.id === id ? { ...r, status: "loading" } : r));
    const cardMap = await resolveCards([row.name.trim()]);
    const card = cardMap.get(row.name.trim()) ?? null;
    setRows((rs) =>
      rs.map((r) => r.id === id ? { ...r, status: card ? "resolved" : "failed", card } : r)
    );
  }

  function addRow() {
    setRows((rs) => [...rs, { id: "r" + rowSeq++, qty: 1, name: "", status: "failed", card: null, isNew: true }]);
  }

  function handleAddToDeck() {
    const resolvedRows = rows.filter((r) => r.status === "resolved" && r.card !== null);
    const failedCount = rows.filter((r) => r.status === "failed").length;
    const entries = resolvedRows.map((r) => toEntry(r.card, r.qty));
    onImport(entries, failedCount);
    onClose();
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ width: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <div className="modal-title">Import deck</div>
            {phase === "resolve" && (
              <span className="imp-state">{resolved} of {total} resolved</span>
            )}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} title="Close">
            <Icon name="close" />
          </button>
        </div>

        {phase === "paste" ? (
          <div className="modal-body">
            <div className="imp-label">Paste MTG Arena format</div>
            <textarea
              className="imp-paste"
              value={text}
              spellCheck={false}
              onChange={(e) => setText(e.target.value)}
              placeholder={"Deck\n4 Card Name\n…"}
            />
            <div style={{ fontSize: 11, color: "var(--fg-3)", fontFamily: "var(--font-mono)", marginTop: 8 }}>
              Quantity + name per line · section headers ignored
            </div>
          </div>
        ) : (
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div className="imp-progress">
              <div className="imp-progress-fill" style={{ width: pct + "%" }} />
            </div>
            <div className="imp-list">
              {rows.map((r) => (
                <ImportRowItem key={r.id} row={r} onEdit={editName} onRetry={retryRow} />
              ))}
            </div>
          </div>
        )}

        {phase === "paste" ? (
          <div className="modal-footer">
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={startResolve}>
              Resolve cards <Icon name="arrow-right" size={14} />
            </button>
          </div>
        ) : (
          <div className="modal-footer" style={{ justifyContent: "space-between" }}>
            <button className="imp-add" onClick={addRow}>
              <Icon name="plus" size={12} /> Add card
            </button>
            <button className="btn btn-primary" onClick={handleAddToDeck}>
              Add to deck
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportRowItem({
  row, onEdit, onRetry,
}: {
  row: ImportRow;
  onEdit: (id: string, name: string) => void;
  onRetry: (id: string) => Promise<void>;
}) {
  const failed = row.status === "failed";
  return (
    <div className={`imp-row${failed ? " is-failed" : ""}`}>
      <span className={`imp-status${row.status === "resolved" ? " ok" : failed ? " bad" : ""}`}>
        {row.status === "loading" && <span className="imp-spinner">⟳</span>}
        {row.status === "resolved" && <Icon name="check" size={13} />}
        {failed && <Icon name="close" size={13} />}
      </span>
      <div className="imp-mid">
        <span className="imp-qty">{row.qty}×</span>
        {failed ? (
          <input
            className="imp-edit"
            value={row.name}
            autoFocus={row.isNew}
            placeholder="Card name…"
            spellCheck={false}
            onChange={(e) => onEdit(row.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") onRetry(row.id); }}
          />
        ) : (
          <span className="imp-cardname">{row.name}</span>
        )}
      </div>
      {row.status === "loading" && <span className="imp-state">looking up…</span>}
      {row.status === "resolved" && <span className="imp-state">resolved</span>}
      {failed && (
        <button className="imp-retry" onClick={() => onRetry(row.id)}>Retry</button>
      )}
    </div>
  );
}
