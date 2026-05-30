import { api } from '../api.js';
import { esc, fmtTime, toast, icon, colorTone, renderManaCost } from '../utils.js';
import { navigate } from '../app.js';

export async function renderGames(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="topbar-title">Games</div>
      <div class="topbar-spacer"></div>
      <button class="btn btn-primary" id="btn-new-game">${icon('plus', 14)} New game</button>
    </div>
    <div style="flex:1;overflow-y:auto;padding:24px">
      <div class="games-grid" id="games-grid">
        <div style="color:var(--fg-3);grid-column:1/-1;text-align:center;padding:40px">Loading…</div>
      </div>
    </div>
  `;

  container.querySelector('#btn-new-game').onclick = () => navigate('/games/new');

  let games = [];
  try { games = await api.listGames(); } catch (e) { toast(e.message, 'error'); }

  const grid = document.getElementById('games-grid');
  if (!games.length) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">${icon('games', 20)}</div>
        <div class="empty-title">No games yet</div>
        <div class="empty-body">Create a game to start playing two decks against each other.</div>
        <button class="btn btn-primary" id="btn-empty-new">New game</button>
      </div>`;
    document.getElementById('btn-empty-new').onclick = () => navigate('/games/new');
    return;
  }

  grid.innerHTML = games.map(g => renderGameCard(g)).join('');
  grid.querySelectorAll('.game-resume-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); navigate(`/games/${btn.dataset.id}`); });
  });
  grid.querySelectorAll('.game-delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Delete this game?')) return;
      try { await api.deleteGame(btn.dataset.id); toast('Game deleted'); renderGames(container); }
      catch (err) { toast(err.message, 'error'); }
    });
  });
}

function renderGameCard(g) {
  return `
    <div class="panel" style="padding:16px;display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px">
        <div style="font-weight:600;font-size:14px;color:var(--fg-0)">${esc(g.name)}</div>
        <span class="tag mono">T${g.turn}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${(g.players || []).map(p => `
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:24px;height:24px;border-radius:6px;background:var(--bg-3);display:grid;place-items:center;font-size:11px;font-weight:600;color:var(--fg-1);flex-shrink:0">${esc(p.name[0])}</div>
            <span style="font-size:12px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.name)}</span>
            <span style="font-family:var(--font-mono);font-size:11px;color:var(--bad)">♥ ${p.life}</span>
          </div>
        `).join('')}
      </div>
      <div style="font-size:11px;color:var(--fg-4);font-family:var(--font-mono)">${fmtTime(g.updatedAt)}</div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-primary btn-sm game-resume-btn" data-id="${g.id}" style="flex:1;justify-content:center">${icon('play', 12)} Resume</button>
        <button class="btn btn-ghost btn-icon btn-sm game-delete-btn" data-id="${g.id}">${icon('trash', 12)}</button>
      </div>
    </div>
  `;
}

export async function renderNewGame(container) {
  container.innerHTML = `
    <div class="topbar">
      <button class="btn btn-ghost" id="btn-back">${icon('prev', 14)} Back</button>
      <div class="topbar-title">New Game</div>
    </div>
    <div class="setup-body">
      <div class="setup-inner" id="setup-inner">
        <div style="color:var(--fg-3);text-align:center;padding:40px">Loading decks…</div>
      </div>
    </div>
  `;

  container.querySelector('#btn-back').onclick = () => navigate('/games');

  let decks = [];
  try { decks = await api.listDecks(); } catch {}

  if (decks.length < 2) {
    document.getElementById('setup-inner').innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">${icon('duplicate', 20)}</div>
        <div class="empty-title">Need at least 2 decks</div>
        <div class="empty-body">Build some decks before starting a game.</div>
        <button class="btn btn-primary" onclick="navigate('/decks/new')">Create a deck</button>
      </div>`;
    return;
  }

  const commanderDecks = decks.filter(d => d.format === 'commander');
  const allDecks = decks;

  // Default to commander if there are enough commander decks, otherwise standard
  let format = commanderDecks.length >= 2 ? 'commander' : 'standard';

  const deckPool = () => format === 'commander' ? commanderDecks : allDecks;

  let players = [
    { name: 'Player 1', deckId: deckPool()[0]?.id || '' },
    { name: 'Player 2', deckId: deckPool()[1]?.id || deckPool()[0]?.id || '' },
  ];

  const autoGameName = () => {
    if (format === 'commander') {
      const names = players.map(p => {
        const d = commanderDecks.find(d => d.id === p.deckId);
        return d?.commander?.name || d?.name || '?';
      });
      return names.join(' vs ');
    }
    return `Game — ${new Date().toLocaleDateString()}`;
  };

  let gameNameOverridden = false;
  let gameName = autoGameName();

  const renderForm = () => {
    const pool = deckPool();
    if (!gameNameOverridden) gameName = autoGameName();

    document.getElementById('setup-inner').innerHTML = `
      <!-- Step 1: Format -->
      <div class="setup-step">
        <div class="setup-step-num done">1</div>
        <div class="setup-step-content">
          <div class="setup-step-title">Format</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm format-btn ${format === 'commander' ? 'btn-primary' : 'btn-ghost'}" data-fmt="commander">
              Commander <span style="font-size:10px;opacity:0.7;margin-left:4px">40 life</span>
            </button>
            <button class="btn btn-sm format-btn ${format === 'standard' ? 'btn-primary' : 'btn-ghost'}" data-fmt="standard">
              Other <span style="font-size:10px;opacity:0.7;margin-left:4px">20 life</span>
            </button>
          </div>
          ${format === 'commander' && commanderDecks.length < 2 ? `
            <div style="margin-top:8px;font-size:12px;color:var(--bad)">
              You need at least 2 commander-format decks. <a href="#/decks/new" style="color:var(--accent)">Create one</a>.
            </div>` : ''}
        </div>
      </div>

      <!-- Step 2: Players -->
      <div class="setup-step">
        <div class="setup-step-num done">2</div>
        <div class="setup-step-content">
          <div class="setup-step-title">Players (${players.length})</div>
          ${players.map((p, i) => {
            const selectedDeck = pool.find(d => d.id === p.deckId);
            return `
            <div class="player-slot" style="flex-direction:column;gap:8px">
              <div style="display:flex;gap:10px">
                <div style="flex:1">
                  <div class="field-label">Player ${i + 1}</div>
                  <input class="input player-name-input" data-i="${i}" value="${esc(p.name)}" placeholder="Name">
                </div>
                <div style="flex:2">
                  <div class="field-label">Deck</div>
                  <select class="input player-deck-select" data-i="${i}">
                    ${pool.map(d => `<option value="${d.id}"${d.id === p.deckId ? ' selected' : ''}>${esc(d.name)}${d.commander ? ` — ${esc(d.commander.name)}` : ''}</option>`).join('')}
                  </select>
                </div>
              </div>
              ${format === 'commander' && selectedDeck?.commander ? `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-1);border-radius:8px;border:1px solid var(--line-1)">
                  ${selectedDeck.commander.imageUri
                    ? `<img src="${esc(selectedDeck.commander.imageUri)}" style="height:52px;border-radius:4px;flex-shrink:0">`
                    : `<div style="width:36px;height:52px;border-radius:4px;background:${colorTone(selectedDeck.commander.colors||[])};flex-shrink:0"></div>`}
                  <div>
                    <div style="font-size:13px;font-weight:600;color:var(--fg-0)">${esc(selectedDeck.commander.name)}</div>
                    <div style="font-size:11px;color:var(--fg-3);margin-top:2px">${esc(selectedDeck.commander.typeLine || 'Legendary Creature')}</div>
                    <div style="margin-top:4px">${renderManaCost(selectedDeck.commander.manaCost || '')}</div>
                  </div>
                </div>` : ''}
            </div>`;
          }).join('')}
          <div style="display:flex;gap:8px;margin-top:4px">
            ${players.length < 6 ? `<button class="btn btn-sm" id="add-player-btn">${icon('plus', 12)} Add player</button>` : ''}
            ${players.length > 2 ? `<button class="btn btn-sm btn-ghost" id="remove-player-btn">Remove last</button>` : ''}
          </div>
        </div>
      </div>

      <!-- Step 3: Game name -->
      <div class="setup-step">
        <div class="setup-step-num done">3</div>
        <div class="setup-step-content">
          <div class="setup-step-title">Game name</div>
          <input class="input" id="game-name-input" value="${esc(gameName)}" placeholder="Game name">
        </div>
      </div>

      <!-- Step 4: Start -->
      <div class="setup-step">
        <div class="setup-step-num done">4</div>
        <div class="setup-step-content">
          <div class="setup-step-title">Start</div>
          <button class="btn btn-primary" id="start-game-btn" style="width:100%;justify-content:center"
            ${format === 'commander' && commanderDecks.length < 2 ? 'disabled' : ''}>
            ${icon('next', 14)} Start game
          </button>
        </div>
      </div>
    `;

    // Format toggle
    document.querySelectorAll('.format-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        format = btn.dataset.fmt;
        const pool = deckPool();
        players = players.map((p, i) => ({ ...p, deckId: pool[i]?.id || pool[0]?.id || '' }));
        gameNameOverridden = false;
        renderForm();
      });
    });

    // Player name inputs
    document.querySelectorAll('.player-name-input').forEach(inp => {
      inp.addEventListener('input', () => { players[+inp.dataset.i].name = inp.value; });
    });

    // Deck selects — refresh commander preview + auto-name on change
    document.querySelectorAll('.player-deck-select').forEach(sel => {
      sel.addEventListener('change', () => {
        players[+sel.dataset.i].deckId = sel.value;
        gameNameOverridden = false;
        renderForm();
      });
    });

    // Game name — mark as overridden once user edits it
    document.getElementById('game-name-input').addEventListener('input', (e) => {
      gameName = e.target.value;
      gameNameOverridden = true;
    });

    document.getElementById('add-player-btn')?.addEventListener('click', () => {
      const pool = deckPool();
      players.push({ name: `Player ${players.length + 1}`, deckId: pool[0]?.id || '' });
      renderForm();
    });
    document.getElementById('remove-player-btn')?.addEventListener('click', () => {
      players.pop(); renderForm();
    });

    document.getElementById('start-game-btn')?.addEventListener('click', async () => {
      const name = gameName.trim() || autoGameName();
      if (players.some(p => !p.name.trim())) { toast('All players need names', 'error'); return; }
      if (players.some(p => !p.deckId)) { toast('All players need a deck', 'error'); return; }
      try {
        const game = await api.createGame({ name, players });
        toast('Game started!', 'success');
        navigate(`/games/${game.id}`);
      } catch (err) { toast('Failed: ' + err.message, 'error'); }
    });
  };

  renderForm();
}
