import { renderHome }                    from './views/home.js';
import { renderDecks }                   from './views/decks.js';
import { renderBuilder }                 from './views/builder.js';
import { renderGames, renderNewGame }    from './views/games.js';
import { renderGame }                    from './views/game.js';
import { renderSettings }                from './views/settings.js';

const app  = document.getElementById('app');
const rail = document.getElementById('rail');

// ─── Router ───────────────────────────────────────────────────────────────────

const routes = [
  { pattern: /^\/$/, route: 'home',     handler: () => renderHome(app) },
  { pattern: /^\/decks$/, route: 'decks', handler: () => renderDecks(app) },
  { pattern: /^\/decks\/new$/, route: 'decks', handler: () => renderBuilder(app, 'new') },
  { pattern: /^\/decks\/([^/]+)$/, route: 'decks', handler: (m) => renderBuilder(app, m[1]) },
  { pattern: /^\/games$/, route: 'games', handler: () => renderGames(app) },
  { pattern: /^\/games\/new$/, route: 'games', handler: () => renderNewGame(app) },
  { pattern: /^\/games\/([^/]+)$/, route: 'gameplay', handler: (m) => renderGame(app, m[1]) },
  { pattern: /^\/settings$/, route: 'settings', handler: () => renderSettings(app) },
];

function route() {
  const hash = location.hash.slice(1) || '/';
  for (const r of routes) {
    const m = hash.match(r.pattern);
    if (m) {
      setActive(r.route);
      r.handler(m);
      return;
    }
  }
  app.innerHTML = `<div class="empty-state" style="flex:1;display:flex"><div class="empty-title">Page not found</div><a href="#/" class="btn btn-primary">Go home</a></div>`;
}

function setActive(name) {
  rail.querySelectorAll('.rail-btn').forEach(b => b.classList.toggle('active', b.dataset.route === name));
}

export function navigate(path) {
  location.hash = '#' + path;
}

// ─── Rail click wiring ────────────────────────────────────────────────────────

rail.querySelectorAll('.rail-btn[data-route]').forEach(btn => {
  btn.addEventListener('click', () => {
    const r = btn.dataset.route;
    if (r === 'gameplay') navigate('/games');
    else if (r === 'home') navigate('/');
    else navigate('/' + r);
  });
});

window.addEventListener('hashchange', route);
route();
