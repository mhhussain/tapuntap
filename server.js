const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, 'data');
const CARDS_DIR = path.join(DATA_DIR, 'cards');
const DECKS_DIR = path.join(DATA_DIR, 'decks');
const GAMES_DIR = path.join(DATA_DIR, 'games');

async function ensureDirs() {
  for (const dir of [CARDS_DIR, DECKS_DIR, GAMES_DIR]) {
    await fs.mkdir(dir, { recursive: true });
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── Card Routes ────────────────────────────────────────────────────────────

app.get('/api/cards/search', async (req, res) => {
  const { q, page = 1 } = req.query;
  if (!q) return res.status(400).json({ error: 'Query required' });
  try {
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(q)}&order=name&page=${page}`;
    const r = await fetch(url);
    if (r.status === 404) return res.json({ data: [], total_cards: 0, has_more: false });
    const data = await r.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Search failed: ' + err.message });
  }
});

app.get('/api/cards/named', async (req, res) => {
  const { exact, fuzzy } = req.query;
  const param = exact ? `exact=${encodeURIComponent(exact)}` : `fuzzy=${encodeURIComponent(fuzzy)}`;
  try {
    const r = await fetch(`https://api.scryfall.com/cards/named?${param}`);
    if (!r.ok) return res.status(404).json({ error: 'Card not found' });
    const card = await r.json();
    await cacheCard(card);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cards/:id', async (req, res) => {
  const filePath = path.join(CARDS_DIR, `${req.params.id}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return res.json(JSON.parse(data));
  } catch {
    // Not cached; fetch from Scryfall
  }
  try {
    const r = await fetch(`https://api.scryfall.com/cards/${req.params.id}`);
    if (!r.ok) return res.status(404).json({ error: 'Card not found' });
    const card = await r.json();
    await cacheCard(card);
    res.json(card);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function cacheCard(card) {
  const filePath = path.join(CARDS_DIR, `${card.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(card)).catch(() => {});
}

// ─── Deck Routes ────────────────────────────────────────────────────────────

app.get('/api/decks', async (req, res) => {
  try {
    const files = (await fs.readdir(DECKS_DIR)).filter(f => f.endsWith('.json'));
    const decks = await Promise.all(files.map(async f => {
      const d = JSON.parse(await fs.readFile(path.join(DECKS_DIR, f), 'utf8'));
      return {
        id: d.id, name: d.name, format: d.format,
        commander: d.commander || null,
        colors: d.commander?.colors || [],
        cardCount: d.cards.reduce((s, c) => s + c.quantity, 0),
        version: d.version, updatedAt: d.updatedAt
      };
    }));
    res.json(decks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  } catch {
    res.json([]);
  }
});

app.get('/api/decks/:id', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(DECKS_DIR, `${req.params.id}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'Deck not found' });
  }
});

app.post('/api/decks', async (req, res) => {
  const { name, format = 'commander', cards = [], commander = null, changelog = 'Initial version' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const deck = {
    id: uuidv4(), name, format, commander, cards, version: 1,
    versions: [{ version: 1, timestamp: new Date().toISOString(), changelog, cards: JSON.parse(JSON.stringify(cards)) }],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
  await fs.writeFile(path.join(DECKS_DIR, `${deck.id}.json`), JSON.stringify(deck, null, 2));
  res.json(deck);
});

app.put('/api/decks/:id', async (req, res) => {
  const filePath = path.join(DECKS_DIR, `${req.params.id}.json`);
  try {
    const existing = JSON.parse(await fs.readFile(filePath, 'utf8'));
    const { name, format, cards, commander, changelog } = req.body;
    const newVersion = existing.version + 1;
    const updated = {
      ...existing,
      name: name ?? existing.name,
      format: format ?? existing.format,
      commander: commander !== undefined ? commander : existing.commander,
      cards: cards ?? existing.cards,
      version: newVersion,
      versions: [...existing.versions, {
        version: newVersion, timestamp: new Date().toISOString(),
        changelog: changelog || `Version ${newVersion}`,
        cards: JSON.parse(JSON.stringify(cards ?? existing.cards))
      }],
      updatedAt: new Date().toISOString()
    };
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    res.json(updated);
  } catch {
    res.status(404).json({ error: 'Deck not found' });
  }
});

app.delete('/api/decks/:id', async (req, res) => {
  try {
    await fs.unlink(path.join(DECKS_DIR, `${req.params.id}.json`));
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Deck not found' });
  }
});

// ─── Game Routes ────────────────────────────────────────────────────────────

function extractImageUri(card) {
  if (card.image_uris) return card.image_uris.normal || card.image_uris.large;
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris.normal;
  return null;
}

function extractBackImageUri(card) {
  if (card.card_faces?.[1]?.image_uris) return card.card_faces[1].image_uris.normal;
  return null;
}

function cardInstance(entry) {
  return {
    instanceId: uuidv4(),
    cardId: entry.cardId,
    name: entry.name,
    manaCost: entry.manaCost || '',
    cmc: entry.cmc || 0,
    typeLine: entry.typeLine || '',
    colors: entry.colors || [],
    imageUri: entry.imageUri || null,
    imageUriBack: entry.imageUriBack || null,
    power: entry.power || null,
    toughness: entry.toughness || null,
    loyalty: entry.loyalty || null,
    // Battlefield state
    tapped: false, transformed: false, faceDown: false,
    counters: {}, attachedTo: null, token: entry.token || false
  };
}

function buildPlayerState(playerId, playerName, deck, format) {
  const library = [];
  for (const entry of deck.cards) {
    // Skip the commander — it goes in the command zone, not the library
    if (deck.commander && entry.cardId === deck.commander.cardId) continue;
    for (let i = 0; i < entry.quantity; i++) {
      library.push(cardInstance(entry));
    }
  }
  // Fisher-Yates shuffle
  for (let i = library.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [library[i], library[j]] = [library[j], library[i]];
  }

  const commandZone = [];
  if (deck.commander) commandZone.push(cardInstance(deck.commander));

  return {
    id: playerId, name: playerName, deckId: deck.id, deckName: deck.name,
    life: format === 'commander' ? 40 : 20, poison: 0, energy: 0,
    library, hand: [], battlefield: [], graveyard: [], exile: [],
    command: commandZone, extraCounters: {}
  };
}

app.get('/api/games', async (req, res) => {
  try {
    const files = (await fs.readdir(GAMES_DIR)).filter(f => f.endsWith('.json'));
    const games = await Promise.all(files.map(async f => {
      const g = JSON.parse(await fs.readFile(path.join(GAMES_DIR, f), 'utf8'));
      return {
        id: g.id, name: g.name, status: g.status, turn: g.turn,
        players: g.players.map(p => ({ name: p.name, life: p.life, deckName: p.deckName })),
        createdAt: g.createdAt, updatedAt: g.updatedAt
      };
    }));
    res.json(games.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
  } catch {
    res.json([]);
  }
});

app.get('/api/games/:id', async (req, res) => {
  try {
    const data = await fs.readFile(path.join(GAMES_DIR, `${req.params.id}.json`), 'utf8');
    res.json(JSON.parse(data));
  } catch {
    res.status(404).json({ error: 'Game not found' });
  }
});

app.post('/api/games', async (req, res) => {
  const { name, players } = req.body;
  if (!name || !players || players.length < 2) {
    return res.status(400).json({ error: 'Name and at least 2 players required' });
  }

  try {
    const deckFiles = await Promise.all(
      players.map(p => fs.readFile(path.join(DECKS_DIR, `${p.deckId}.json`), 'utf8'))
    );
    const decks = deckFiles.map(d => JSON.parse(d));
    const gamePlayers = players.map((p, i) => buildPlayerState(i, p.name, decks[i], decks[i].format));
    const gameFormat = decks.every(d => d.format === 'commander') ? 'commander' : (decks[0].format || 'standard');

    const game = {
      id: uuidv4(), name, status: 'active',
      format: gameFormat,
      turn: 1, activePlayer: 0,
      phase: 'beginning',
      phases: ['beginning', 'main1', 'combat', 'main2', 'end'],
      phaseIndex: 0,
      players: gamePlayers,
      log: [`[${new Date().toLocaleTimeString()}] Game "${name}" started`],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };

    await fs.writeFile(path.join(GAMES_DIR, `${game.id}.json`), JSON.stringify(game, null, 2));
    res.json(game);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/games/:id', async (req, res) => {
  const filePath = path.join(GAMES_DIR, `${req.params.id}.json`);
  try {
    const updated = { ...req.body, updatedAt: new Date().toISOString() };
    await fs.writeFile(filePath, JSON.stringify(updated, null, 2));
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Game not found' });
  }
});

app.delete('/api/games/:id', async (req, res) => {
  try {
    await fs.unlink(path.join(GAMES_DIR, `${req.params.id}.json`));
    res.json({ success: true });
  } catch {
    res.status(404).json({ error: 'Game not found' });
  }
});

// ─── Start ───────────────────────────────────────────────────────────────────

ensureDirs().then(() => {
  app.listen(PORT, () => {
    console.log(`\n  tapuntap → http://localhost:${PORT}\n`);
  });
}).catch(err => {
  console.error('Failed to start:', err);
  process.exit(1);
});
