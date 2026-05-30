import { api } from '../api.js';
import { esc, fmtTime, toast, icon } from '../utils.js';
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

  container.querySelector('#btn-new-game').onclick = () => navigate('/lobby/new');

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
    document.getElementById('btn-empty-new').onclick = () => navigate('/lobby/new');
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

