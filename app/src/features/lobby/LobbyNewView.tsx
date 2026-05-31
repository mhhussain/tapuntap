import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyDecks } from "../../api/hooks";
import { createGame, joinGame } from "../../api/games";
import { useToast } from "../../components/Toast";

export function LobbyNewView() {
  const { decks } = useMyDecks();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("commander");
  const [createDeck, setCreateDeck] = useState("");
  const [code, setCode] = useState("");
  const [joinDeck, setJoinDeck] = useState("");
  const [busy, setBusy] = useState(false);

  if (decks && decks.length === 0) {
    return (
      <>
        <div className="topbar"><div className="topbar-title">New / Join game</div></div>
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-title">You need a deck first</div>
          <button className="btn btn-primary" onClick={() => navigate("/decks/new")}>Build a deck</button>
        </div>
      </>
    );
  }
  const deckOptions = (sel: string, set: (v: string) => void) => (
    <select className="input" value={sel} onChange={(e) => set(e.target.value)}>
      <option value="">Choose a deck…</option>
      {decks?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  );

  async function doCreate() {
    if (!createDeck) { toast("Pick a deck", "error"); return; }
    setBusy(true);
    try { const r = await createGame({ name: name || "Untitled", format, deckId: createDeck }); navigate(`/lobby/${r.gameId}`); }
    catch (e) { toast((e as Error).message, "error"); setBusy(false); }
  }
  async function doJoin() {
    if (!joinDeck || !code.trim()) { toast("Enter a code and pick a deck", "error"); return; }
    setBusy(true);
    try { const r = await joinGame({ inviteCode: code.trim().toUpperCase(), deckId: joinDeck }); navigate(`/lobby/${r.gameId}`); }
    catch (e) { toast((e as Error).message, "error"); setBusy(false); }
  }

  return (
    <>
      <div className="topbar"><div className="topbar-title">New / Join game</div></div>
      <div style={{ padding: 24, maxWidth: 520, display: "grid", gap: 24 }}>
        <section>
          <h3>Create a game</h3>
          <input className="input" placeholder="Game name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="commander">Commander</option>
            <option value="standard">Standard</option>
          </select>
          {deckOptions(createDeck, setCreateDeck)}
          <button className="btn btn-primary" disabled={busy} onClick={doCreate}>Create</button>
        </section>
        <section>
          <h3>Join by code</h3>
          <input className="input" placeholder="Invite code" value={code} onChange={(e) => setCode(e.target.value)} />
          {deckOptions(joinDeck, setJoinDeck)}
          <button className="btn" disabled={busy} onClick={doJoin}>Join</button>
        </section>
      </div>
    </>
  );
}
