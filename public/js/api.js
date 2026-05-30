const BASE = '/api';

async function req(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Cards
  searchCards: (q, page = 1) => req(`/cards/search?q=${encodeURIComponent(q)}&page=${page}`),
  getCard: (id) => req(`/cards/${id}`),
  getCardByName: (name) => req(`/cards/named?fuzzy=${encodeURIComponent(name)}`),

  // Decks
  listDecks: () => req('/decks'),
  getDeck: (id) => req(`/decks/${id}`),
  createDeck: (data) => req('/decks', { method: 'POST', body: JSON.stringify(data) }),
  updateDeck: (id, data) => req(`/decks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDeck: (id) => req(`/decks/${id}`, { method: 'DELETE' }),

  // Games
  listGames: () => req('/games'),
  getGame: (id) => req(`/games/${id}`),
  createGame: (data) => req('/games', { method: 'POST', body: JSON.stringify(data) }),
  saveGame: (id, data) => req(`/games/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteGame: (id) => req(`/games/${id}`, { method: 'DELETE' }),
};
