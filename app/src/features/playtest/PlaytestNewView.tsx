import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMyDecks } from "../../api/hooks";
import { getDeck } from "../../api/decks";
import { useToast } from "../../components/Toast";
import { createSession } from "./store";

export function PlaytestNewView() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const { decks } = useMyDecks(0);
  const prefill = params.get("deckId");

  const [name, setName] = useState(() => `Playtest ${new Date().toLocaleDateString()}`);
  const [seatDeckIds, setSeatDeckIds] = useState<string[]>(() => [prefill ?? "", ""]);
  const [busy, setBusy] = useState(false);

  const canStart = useMemo(() => seatDeckIds.length >= 2 && seatDeckIds.every(Boolean), [seatDeckIds]);

  function setSeat(i: number, deckId: string) {
    setSeatDeckIds((arr) => arr.map((v, j) => (j === i ? deckId : v)));
  }

  async function start() {
    setBusy(true);
    try {
      const loaded = await Promise.all(seatDeckIds.map((id) => getDeck(id)));
      const format = loaded[0]?.format || "commander";
      const s = createSession(name.trim() || "Playtest", format, loaded.map((deck) => ({ deck: deck! })));
      navigate(`/playtest/${s.id}`, { replace: true });
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">New playtest</div>
        <div className="topbar-spacer" />
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 480 }}>
          <label>
            <div className="eyebrow" style={{ marginBottom: 6 }}>Session name</div>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} style={{ width: "100%" }} />
          </label>
          {seatDeckIds.map((deckId, i) => (
            <label key={i}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>Player {i + 1} deck</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select className="input" value={deckId} onChange={(e) => setSeat(i, e.target.value)} style={{ flex: 1 }}>
                  <option value="">Select a deck…</option>
                  {(decks ?? []).map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.format})</option>
                  ))}
                </select>
                {i >= 2 && (
                  <button className="btn btn-ghost" onClick={() => setSeatDeckIds((a) => a.filter((_, j) => j !== i))}>Remove</button>
                )}
              </div>
            </label>
          ))}
          {seatDeckIds.length < 4 && (
            <button className="btn" onClick={() => setSeatDeckIds((a) => [...a, ""])}>+ Add seat</button>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-primary" disabled={!canStart || busy} onClick={start}>
              {busy ? "Dealing…" : "Start playtest"}
            </button>
            <button className="btn btn-ghost" onClick={() => navigate("/playtest")}>Cancel</button>
          </div>
        </div>
      </div>
    </>
  );
}
