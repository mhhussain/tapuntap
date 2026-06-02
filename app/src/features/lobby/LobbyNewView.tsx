import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMyDecks } from "../../api/hooks";
import { createGame, joinGame } from "../../api/games";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import type { DeckSummary } from "../../api/decks";

const FORMATS = [
  { id: "commander", name: "Commander", note: "4 players · 100-card singleton · 40 life" },
  { id: "standard", name: "Standard", note: "2–4 players · 60-card constructed · 20 life" },
  { id: "modern", name: "Modern", note: "2–4 players · 60-card · 20 life" },
  { id: "draft", name: "Draft", note: "2–8 players · limited · 20 life" },
];

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}

function DeckPicker({ value, onChange, decks }: { value: string; onChange: (v: string) => void; decks: DeckSummary[] }) {
  const deck = decks.find((d) => d.id === value);
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)} style={{ flex: 1 }}>
        <option value="">Choose a deck…</option>
        {decks.map((d) => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      {deck && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--bg-2)", borderRadius: 6, border: "1px solid var(--line-1)" }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--fg-3)" }}>{deck.name}</span>
        </div>
      )}
    </div>
  );
}

export function LobbyNewView() {
  const { decks } = useMyDecks();
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("commander");
  const [createDeck, setCreateDeck] = useState("");
  const [code, setCode] = useState(() => (searchParams.get("code") ?? "").toUpperCase());
  const [joinDeck, setJoinDeck] = useState("");
  const [busy, setBusy] = useState(false);

  // Zero-decks empty state
  if (decks && decks.length === 0) {
    return (
      <>
        <div className="topbar">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            <Icon name="prev" size={14} /> Back
          </button>
          <div className="topbar-title">New game</div>
          <div className="topbar-spacer" />
        </div>
        <div style={{ flex: 1, display: "grid", placeItems: "center", padding: 24 }}>
          <div className="empty" style={{ maxWidth: 440 }}>
            <div className="empty-icon"><Icon name="cards" size={20} /></div>
            <div className="empty-title">Build a deck first</div>
            <div className="empty-body">
              You need at least one deck before you can create or join a game.
              Decks live in your library — build one, then come back to start a table.
            </div>
            <button className="btn btn-primary" style={{ marginTop: 6 }} onClick={() => navigate("/decks/new")}>
              <Icon name="plus" size={14} /> Go to Deck Library
            </button>
          </div>
        </div>
      </>
    );
  }

  const deckList = decks ?? [];
  const fmt = FORMATS.find((f) => f.id === format);

  async function doCreate() {
    if (!createDeck) { toast("Pick a deck", "error"); return; }
    setBusy(true);
    try {
      const r = await createGame({ name: name || "Untitled", format, deckId: createDeck });
      navigate(`/lobby/${r.gameId}`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  }

  async function doJoin() {
    if (!joinDeck || !code.trim()) { toast("Enter a code and pick a deck", "error"); return; }
    setBusy(true);
    try {
      const r = await joinGame({ inviteCode: code.trim().toUpperCase(), deckId: joinDeck });
      navigate(`/lobby/${r.gameId}`);
    } catch (e) {
      toast((e as Error).message, "error");
      setBusy(false);
    }
  }

  return (
    <>
      <div className="topbar">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          <Icon name="prev" size={14} /> Back
        </button>
        <div className="topbar-title">New game</div>
        <div className="topbar-spacer" />
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "grid", placeItems: "start center", padding: "32px 24px" }}>
        <div style={{ width: "100%", maxWidth: 880 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h1 style={{ fontFamily: "var(--font-serif)", fontStyle: "italic", fontWeight: 400, fontSize: 40, color: "var(--fg-0)", margin: "0 0 6px" }}>
              Start a table
            </h1>
            <p style={{ margin: 0, color: "var(--fg-3)" }}>
              Host a new game, or join a friend's with their invite code.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Create */}
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--line-2)", borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--accent-soft)", border: "1px solid var(--accent-line)", display: "grid", placeItems: "center", color: "var(--accent)" }}>
                  <Icon name="plus" size={15} />
                </div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--fg-0)" }}>Create a game</h2>
              </div>

              <Labeled label="Game name">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Friday Commander Night"
                />
              </Labeled>

              <Labeled label="Format">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {FORMATS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id)}
                      className="btn btn-sm"
                      style={{
                        background: format === f.id ? "var(--accent-soft)" : "var(--bg-2)",
                        borderColor: format === f.id ? "var(--accent)" : "var(--line-2)",
                        color: format === f.id ? "var(--accent)" : "var(--fg-2)",
                      }}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
                {fmt && (
                  <div style={{ fontSize: 11, color: "var(--fg-4)", marginTop: 6, fontFamily: "var(--font-mono)" }}>
                    {fmt.note}
                  </div>
                )}
              </Labeled>

              <Labeled label="Your deck">
                <DeckPicker value={createDeck} onChange={setCreateDeck} decks={deckList} />
              </Labeled>

              <button
                className="btn btn-primary"
                style={{ justifyContent: "center", padding: "10px 0", marginTop: 4 }}
                disabled={busy}
                onClick={doCreate}
              >
                Create &amp; open lobby <Icon name="arrow-right" size={14} />
              </button>
            </div>

            {/* Join */}
            <div style={{ background: "var(--bg-1)", border: "1px solid var(--line-1)", borderRadius: 12, padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: "var(--bg-2)", border: "1px solid var(--line-2)", display: "grid", placeItems: "center", color: "var(--fg-2)" }}>
                  <Icon name="import" size={15} />
                </div>
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "var(--fg-0)" }}>Join by invite code</h2>
              </div>

              <Labeled label="Invite code">
                <input
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="EMBER-4827"
                  style={{ fontFamily: "var(--font-mono)", fontSize: 18, letterSpacing: "0.08em", textAlign: "center", padding: "12px 10px" }}
                />
              </Labeled>

              <Labeled label="Your deck">
                <DeckPicker value={joinDeck} onChange={setJoinDeck} decks={deckList} />
              </Labeled>

              <div style={{ flex: 1 }} />
              <button
                className="btn"
                style={{ justifyContent: "center", padding: "10px 0" }}
                disabled={!code.trim() || busy}
                onClick={doJoin}
              >
                <Icon name="arrow-right" size={14} /> Join table
              </button>
              <p style={{ margin: 0, fontSize: 11, color: "var(--fg-4)", textAlign: "center" }}>
                Ask the host for their code, or open their share link.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
