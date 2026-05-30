import { api } from "../api.js";
import { currentUid } from "../auth.js";
import { navigate } from "../app.js";
import { esc, toast } from "../utils.js";

export async function renderLobbyNew(container) {
  const decks = await api.listDecks();
  const deckOpts = decks.map(d => `<option value="${d.id}">${esc(d.name)}</option>`).join("");
  container.innerHTML = `
    <div class="topbar"><div class="topbar-title">New / Join game</div></div>
    <div style="padding:24px;max-width:520px;display:grid;gap:24px">
      <section>
        <h3>Create a game</h3>
        <input id="g-name" class="input" placeholder="Game name" />
        <select id="g-deck" class="input">${deckOpts}</select>
        <button class="btn btn-primary" id="g-create">Create</button>
      </section>
      <section>
        <h3>Join by code</h3>
        <input id="j-code" class="input" placeholder="Invite code" />
        <select id="j-deck" class="input">${deckOpts}</select>
        <button class="btn" id="j-join">Join</button>
      </section>
    </div>`;
  container.querySelector("#g-create").onclick = async () => {
    try {
      const r = await api.createGame({
        name: container.querySelector("#g-name").value || "Untitled",
        format: "commander",
        deckId: container.querySelector("#g-deck").value
      });
      navigate(`/lobby/${r.gameId}`);
    } catch (e) { toast(e.message, "error"); }
  };
  container.querySelector("#j-join").onclick = async () => {
    try {
      const r = await api.joinGame({
        inviteCode: container.querySelector("#j-code").value.trim().toUpperCase(),
        deckId: container.querySelector("#j-deck").value
      });
      navigate(`/lobby/${r.gameId}`);
    } catch (e) { toast(e.message, "error"); }
  };
}

export function renderLobby(container, gameId) {
  let unsub = null;
  const draw = (g) => {
    if (!g) { container.innerHTML = `<div class="empty-state">Game not found</div>`; return; }
    if (g.status === "active") { if (unsub) unsub(); navigate(`/games/${gameId}`); return; }
    const me = currentUid();
    const isHost = g.hostUid === me;
    container.innerHTML = `
      <div class="topbar"><div class="topbar-title">${esc(g.name)}</div></div>
      <div style="padding:24px;display:grid;gap:16px;max-width:560px">
        <div>Invite code: <strong style="font-size:20px">${esc(g.inviteCode)}</strong>
          <button class="btn" id="copy">Copy</button></div>
        <div>
          <h3>Seats (${g.seats.length}/4)</h3>
          ${g.seats.map(s => `<div class="player-chip">${esc(s.displayName)} — ${esc(s.deckName)} ${s.ready ? "✓" : ""}${s.uid === me ? " (you)" : ""}</div>`).join("")}
        </div>
        ${isHost ? `<button class="btn btn-primary" id="start" ${g.seats.length < 2 ? "disabled" : ""}>Start game</button>` : `<div>Waiting for host to start…</div>`}
      </div>`;
    container.querySelector("#copy").onclick = () => navigator.clipboard.writeText(g.inviteCode);
    const startBtn = container.querySelector("#start");
    if (startBtn) startBtn.onclick = async () => {
      try { await api.startGame(gameId); } catch (e) { toast(e.message, "error"); }
    };
  };
  unsub = api.subscribeGame(gameId, draw);
}
