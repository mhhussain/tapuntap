import { api } from '../api.js';
import { fmtTime, esc, colorTone } from '../utils.js';
import { navigate } from '../app.js';

export async function renderHome(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="topbar-title">tapuntap</div>
      <div class="topbar-spacer"></div>
      <button class="btn btn-primary" id="btn-new-game">New game</button>
      <button class="btn" id="btn-new-deck">New deck</button>
    </div>
    <div class="home-body" id="home-body">
      <div style="color:var(--fg-3);padding:40px;text-align:center">Loading…</div>
    </div>
  `;

  container.querySelector('#btn-new-game').onclick = () => navigate('/games/new');
  container.querySelector('#btn-new-deck').onclick  = () => navigate('/decks/new');

  let [games, decks] = await Promise.all([api.listGames(), api.listDecks()]).catch(() => [[], []]);

  document.getElementById('home-body').innerHTML = `
    <div>
      <div class="home-section-title">Active Games</div>
      ${renderGamesList(games.slice(0, 6))}
      <div class="home-actions">
        <button class="btn btn-primary" id="h-new-game">New game</button>
        ${games.length > 6 ? `<a href="#/games" class="btn">See all ${games.length} games</a>` : ''}
      </div>
    </div>
    <div>
      <div class="home-section-title">Deck Library</div>
      ${renderDecksList(decks.slice(0, 8))}
      <div class="home-actions">
        <button class="btn btn-primary" id="h-new-deck">New deck</button>
        ${decks.length > 8 ? `<a href="#/decks" class="btn">See all ${decks.length} decks</a>` : ''}
      </div>
    </div>
  `;

  document.getElementById('h-new-game')?.addEventListener('click', () => navigate('/games/new'));
  document.getElementById('h-new-deck')?.addEventListener('click', () => navigate('/decks/new'));

  container.querySelectorAll('[data-game-id]').forEach(el => {
    el.addEventListener('click', () => navigate(`/games/${el.dataset.gameId}`));
  });
  container.querySelectorAll('[data-deck-id]').forEach(el => {
    el.addEventListener('click', () => navigate(`/decks/${el.dataset.deckId}`));
  });
}

function renderGamesList(games) {
  if (!games.length) return `
    <div class="empty-state" style="padding:30px 0;border:1px solid var(--line-1);border-radius:8px;background:var(--bg-1)">
      <div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg></div>
      <div class="empty-title">No games yet</div>
      <div class="empty-body">Start a new game to play through matchups.</div>
    </div>`;

  return games.map(g => `
    <div class="game-card-item" data-game-id="${g.id}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="game-card-title">${esc(g.name)}</div>
        <span class="tag mono">T${g.turn}</span>
      </div>
      <div class="game-card-players">
        ${(g.players || []).map(p => `
          <div class="player-chip">
            <span>${esc(p.name)}</span>
            <span class="player-chip-life">♥ ${p.life}</span>
          </div>
        `).join('')}
      </div>
      <div style="font-size:11px;color:var(--fg-4);font-family:var(--font-mono)">${fmtTime(g.updatedAt)}</div>
    </div>
  `).join('');
}

function renderDecksList(decks) {
  if (!decks.length) return `
    <div class="empty-state" style="padding:30px 0;border:1px solid var(--line-1);border-radius:8px;background:var(--bg-1)">
      <div class="empty-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="4" width="4" height="16"/><rect x="10" y="4" width="4" height="16"/><rect x="16" y="6" width="4" height="14"/></svg></div>
      <div class="empty-title">No decks yet</div>
      <div class="empty-body">Build your first deck to get started.</div>
    </div>`;

  return decks.map(d => `
    <div class="game-card-item" data-deck-id="${d.id}" style="flex-direction:row;align-items:center">
      <div style="flex:1;min-width:0">
        <div class="game-card-title">${esc(d.name)}</div>
        <div style="font-size:11px;color:var(--fg-3);font-family:var(--font-mono);margin-top:2px">${d.cardCount} cards · ${d.format} · v${d.version}</div>
      </div>
      <div style="font-size:11px;color:var(--fg-4);font-family:var(--font-mono)">${fmtTime(d.updatedAt)}</div>
    </div>
  `).join('');
}
