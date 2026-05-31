// ============ Mock data for the prototype ============
// Original card names — not from any published MTG set.

const COLORS = ['W', 'U', 'B', 'R', 'G'];

const colorTone = (colors) => {
  if (!colors || colors.length === 0) return 'var(--mana-c)';
  if (colors.length === 1) return `var(--mana-${colors[0].toLowerCase()})`;
  // Multicolor — blend
  return `linear-gradient(135deg, ${colors.map(c => `var(--mana-${c.toLowerCase()})`).join(', ')})`;
};

const mkCard = (id, name, cost, type, colors, pt, isLand=false, abil="") => ({
  id, name, cost, type, colors, pt, isLand, abil
});

// Original / generic-fantasy card names
const SAMPLE_CARDS = [
  mkCard('c1',  'Lantern Acolyte',    [{w:1}],            'Creature — Cleric',     ['W'], '1/2'),
  mkCard('c2',  'Brassgate Knight',   [{n:1},{w:1}],      'Creature — Knight',     ['W'], '2/2'),
  mkCard('c3',  'Verdict of Dawn',    [{n:2},{w:1},{w:1}],'Sorcery',                ['W'], null),
  mkCard('c4',  'Tideglass Sage',     [{n:1},{u:1}],      'Creature — Wizard',     ['U'], '1/3'),
  mkCard('c5',  'Counterveil',        [{u:1},{u:1}],      'Instant',                ['U'], null),
  mkCard('c6',  'Mirror Drake',       [{n:3},{u:1}],      'Creature — Drake',      ['U'], '2/4'),
  mkCard('c7',  'Hollow Reaper',      [{n:2},{b:1}],      'Creature — Specter',    ['B'], '3/2'),
  mkCard('c8',  'Sable Reckoning',    [{n:1},{b:1},{b:1}],'Sorcery',                ['B'], null),
  mkCard('c9',  'Cinderwing Brute',   [{n:1},{r:1}],      'Creature — Goblin',     ['R'], '2/2'),
  mkCard('c10', 'Pyre Salvo',         [{r:1}],            'Instant',                ['R'], null),
  mkCard('c11', 'Forge-Lit Dragon',   [{n:3},{r:1},{r:1}],'Creature — Dragon',     ['R'], '5/5'),
  mkCard('c12', 'Mossback Wyvern',    [{n:2},{g:1}],      'Creature — Wyvern',     ['G'], '3/3'),
  mkCard('c13', 'Bramblestep Ranger', [{g:1}],            'Creature — Elf',        ['G'], '1/2'),
  mkCard('c14', 'Skyspire Plains',    [],                 'Land',                   ['W'], null, true),
  mkCard('c15', 'Glasswater Isle',    [],                 'Land',                   ['U'], null, true),
  mkCard('c16', 'Crow-Marked Swamp',  [],                 'Land',                   ['B'], null, true),
  mkCard('c17', 'Ember Mountain',     [],                 'Land',                   ['R'], null, true),
  mkCard('c18', 'Old-Growth Forest',  [],                 'Land',                   ['G'], null, true),
];

const cardById = (id) => SAMPLE_CARDS.find(c => c.id === id);

const formatCost = (cost) => {
  if (!cost || cost.length === 0) return null;
  return cost.flatMap(c => {
    if (c.n) return Array(c.n).fill('n');
    return Object.keys(c).filter(k => c[k]);
  });
};

const totalCmc = (cost) => {
  if (!cost) return 0;
  return cost.reduce((sum, c) => {
    if (c.n) return sum + c.n;
    return sum + 1;
  }, 0);
};

// Decks
const SAMPLE_DECKS = [
  {
    id: 'd1',
    name: 'Cinderforge Aggro',
    colors: ['R'],
    archetype: 'Aggro',
    cardCount: 60,
    winRate: 0.62,
    games: 24,
    modified: '2 days ago',
    created: 'Mar 14, 2026',
    description: 'Fast burn deck with a low curve. Win by turn 5 or scoop.',
    avgCmc: 2.1,
    cards: [
      { id: 'c9',  count: 4 },
      { id: 'c10', count: 4 },
      { id: 'c11', count: 3 },
      { id: 'c17', count: 22 },
    ],
    history: [
      { date: 'May 4',  note: '+2 Forge-Lit Dragon, -2 Cinderwing Brute' },
      { date: 'Apr 28', note: 'Cut sideboard tech' },
      { date: 'Apr 14', note: 'Initial build' },
    ],
  },
  {
    id: 'd2',
    name: 'Tideglass Control',
    colors: ['U', 'W'],
    archetype: 'Control',
    cardCount: 60,
    winRate: 0.54,
    games: 19,
    modified: '5 hours ago',
    created: 'Feb 02, 2026',
    description: 'Counterspells, board wipes, finish with a single bomb.',
    avgCmc: 3.4,
    cards: [
      { id: 'c1', count: 2 },
      { id: 'c2', count: 4 },
      { id: 'c3', count: 3 },
      { id: 'c4', count: 4 },
      { id: 'c5', count: 4 },
      { id: 'c6', count: 3 },
      { id: 'c14', count: 12 },
      { id: 'c15', count: 12 },
    ],
    history: [
      { date: 'May 6', note: '+1 Mirror Drake' },
      { date: 'May 1', note: 'Switched to UW from mono-U' },
    ],
  },
  {
    id: 'd3',
    name: 'Brambletide Midrange',
    colors: ['G', 'U'],
    archetype: 'Midrange',
    cardCount: 60,
    winRate: 0.48,
    games: 12,
    modified: '1 week ago',
    created: 'Jan 22, 2026',
    description: 'Ramp into wyverns. Counter the answers, play the threats.',
    avgCmc: 3.0,
    cards: [
      { id: 'c4', count: 3 },
      { id: 'c12', count: 4 },
      { id: 'c13', count: 4 },
      { id: 'c5', count: 2 },
      { id: 'c15', count: 11 },
      { id: 'c18', count: 12 },
    ],
    history: [{ date: 'Apr 20', note: 'Built from Bramblestep package' }],
  },
  {
    id: 'd4',
    name: 'Sable Reckoning',
    colors: ['B'],
    archetype: 'Mono-Black',
    cardCount: 60,
    winRate: 0.71,
    games: 31,
    modified: '3 weeks ago',
    created: 'Dec 11, 2025',
    description: 'Discard, removal, reanimate. The grindy classic.',
    avgCmc: 2.6,
    cards: [
      { id: 'c7', count: 4 },
      { id: 'c8', count: 3 },
      { id: 'c16', count: 24 },
    ],
    history: [{ date: 'Mar 03', note: 'Locked in' }],
  },
  {
    id: 'd5',
    name: 'Five-Color Domain',
    colors: ['W','U','B','R','G'],
    archetype: 'Combo',
    cardCount: 60,
    winRate: 0.33,
    games: 6,
    modified: '1 month ago',
    created: 'Apr 05, 2026',
    description: 'Experimental. Doesn\'t work yet. Loves the dream.',
    avgCmc: 4.2,
    cards: [],
    history: [{ date: 'Apr 05', note: 'Started' }],
  },
];

// The signed-in user
const CURRENT_USER = {
  id: 'u_self',
  name: 'Wren Halloway',
  handle: 'wren',
  email: 'wren@tapuntap.gg',
  colors: ['R', 'G'], // used for the generated avatar gradient
};

// Supported formats
const FORMATS = [
  { id: 'commander', name: 'Commander', seats: 4, life: 40, note: 'Up to 4 players · 40 life' },
  { id: 'standard',  name: 'Standard',  seats: 2, life: 20, note: '1v1 · 20 life' },
  { id: 'modern',    name: 'Modern',    seats: 2, life: 20, note: '1v1 · 20 life' },
  { id: 'legacy',    name: 'Legacy',    seats: 2, life: 20, note: '1v1 · 20 life' },
  { id: 'casual',    name: 'Casual',    seats: 4, life: 20, note: 'Anything goes' },
];

// Random-ish invite code generator (original)
const genInviteCode = () => {
  const a = ['EMBER','TIDE','SABLE','BRAMBLE','LANTERN','MIRROR','FORGE','HOLLOW'];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${a[Math.floor(Math.random()*a.length)]}-${n}`;
};

// Game sessions — now spanning the full lifecycle: lobby → active → complete
const SAMPLE_GAMES = [
  {
    id: 'g0',
    title: "Friday Commander Night",
    format: 'Commander',
    status: 'lobby',
    inviteCode: 'EMBER-4827',
    host: 'You',
    seatsFilled: 3,
    seatsTotal: 4,
    players: [
      { name: 'You',   deck: 'Cinderforge Aggro',   colors: ['R'],     ready: true,  host: true },
      { name: 'Kavi',  deck: 'Tideglass Control',   colors: ['U','W'], ready: true },
      { name: 'Mara',  deck: 'Sable Reckoning',     colors: ['B'],     ready: false },
    ],
    created: 'May 31, 2026',
    lastPlayed: 'Opened 3 min ago',
  },
  {
    id: 'g1',
    title: 'Tuesday Night — Round 3',
    format: 'Standard',
    players: [
      { name: 'You',     deck: 'Cinderforge Aggro',   colors: ['R'] },
      { name: 'Kavi',    deck: 'Tideglass Control',   colors: ['U','W'] },
    ],
    turn: 7,
    activePlayer: 0,
    created: 'May 4, 2026',
    lastPlayed: '12 min ago',
    status: 'active',
  },
  {
    id: 'g2',
    title: 'Pod of Four',
    format: 'Commander',
    players: [
      { name: 'Mara', deck: 'Brambletide Midrange', colors: ['G','U'] },
      { name: 'Theo', deck: 'Sable Reckoning',       colors: ['B'] },
      { name: 'You',  deck: 'Cinderforge Aggro',     colors: ['R'] },
      { name: 'Juno', deck: 'Tideglass Control',     colors: ['U','W'] },
    ],
    turn: 4,
    activePlayer: 2,
    created: 'May 2, 2026',
    lastPlayed: '2 days ago',
    status: 'active',
  },
  {
    id: 'g3',
    title: 'Testing UW Build',
    format: 'Standard',
    players: [
      { name: 'You', deck: 'Tideglass Control', colors: ['U','W'] },
      { name: 'Theo', deck: 'Sable Reckoning',  colors: ['B'] },
    ],
    turn: 12,
    activePlayer: 1,
    created: 'Apr 30',
    lastPlayed: '6 days ago',
    status: 'complete',
    winner: 'Theo',
    finalStandings: [
      { name: 'Theo', deck: 'Sable Reckoning',  colors: ['B'],     life: 6,  place: 1 },
      { name: 'You',  deck: 'Tideglass Control', colors: ['U','W'], life: 0,  place: 2 },
    ],
  },
  {
    id: 'g4',
    title: 'Mono-R vs Mono-G',
    format: 'Modern',
    players: [
      { name: 'You',  deck: 'Cinderforge Aggro',  colors: ['R'] },
      { name: 'Mara', deck: 'Brambletide Midrange', colors: ['G','U'] },
    ],
    turn: 9,
    activePlayer: 0,
    created: 'Apr 22',
    lastPlayed: '2 weeks ago',
    status: 'complete',
    winner: 'You',
    finalStandings: [
      { name: 'You',  deck: 'Cinderforge Aggro',  colors: ['R'],     life: 12, place: 1 },
      { name: 'Mara', deck: 'Brambletide Midrange', colors: ['G','U'], life: 0, place: 2 },
    ],
  },
];

Object.assign(window, {
  SAMPLE_CARDS, SAMPLE_DECKS, SAMPLE_GAMES, COLORS, CURRENT_USER, FORMATS, genInviteCode,
  cardById, colorTone, formatCost, totalCmc, mkCard
});
