import { api } from '../api.js';
import { renderManaCost, colorTone, isLand, cardFromScryfall, debounce, toast, showModal, closeModal, icon, esc } from '../utils.js';
import { navigate } from '../app.js';

const FORMATS = ['commander', 'standard', 'modern', 'legacy', 'vintage', 'pioneer', 'pauper', 'casual'];

let state = {
  deck: null,
  isNew: false,
  searchResults: [],
  searchPage: 1,
  searchHasMore: false,
  lastQuery: '',
  saving: false
};

export async function renderBuilder(container, deckId) {
  state = { ...state, searchResults: [], lastQuery: '', searchPage: 1 };

  if (deckId === 'new') {
    state.isNew = true;
    state.deck = { name: 'New Deck', format: 'commander', cards: [], commander: null, version: 1, versions: [] };
  } else {
    container.innerHTML = '<div style="padding:40px;color:var(--fg-3);text-align:center">Loading deck…</div>';
    try {
      state.deck = await api.getDeck(deckId);
      state.isNew = false;
    } catch {
      toast('Deck not found', 'error');
      navigate('/decks');
      return;
    }
  }

  renderBuilderUI(container);
}

function renderBuilderUI(container) {
  container.innerHTML = `
    <div class="topbar">
      <button class="btn btn-ghost" id="builder-back">${icon('prev', 14)} Back</button>
      <input class="input" id="deck-name" value="${esc(state.deck.name)}" placeholder="Deck name"
        style="flex:1;max-width:320px;font-weight:600;font-size:14px">
      <select class="input" id="deck-format" style="width:160px">
        ${FORMATS.map(f => `<option value="${f}"${state.deck.format === f ? ' selected' : ''}>${f}</option>`).join('')}
      </select>
      <div class="topbar-spacer"></div>
      <span id="deck-count" style="font-size:12px;color:var(--fg-3);font-family:var(--font-mono)">
        ${state.deck.cards.reduce((s, c) => s + c.quantity, 0)} cards
      </span>
      ${!state.isNew ? `<button class="btn btn-ghost btn-sm" id="btn-deck-history">${icon('history', 12)} History</button>` : ''}
      <button class="btn btn-ghost btn-sm" id="btn-import-export">${icon('note', 12)} Import / Export</button>
      <button class="btn btn-primary" id="btn-save-deck">${icon('save', 14)} Save</button>
    </div>

    <div class="builder-layout">
      <!-- Left: Deck list -->
      <div class="builder-panel">
        ${state.deck.format === 'commander' ? `
          <div style="padding:10px 14px;border-bottom:1px solid var(--line-1)">
            <div class="eyebrow" style="margin-bottom:6px">Commander</div>
            <div id="commander-slot">${renderCommanderSlot()}</div>
          </div>
        ` : ''}
        <div class="builder-panel-body" id="deck-list">
          ${renderDeckList()}
        </div>
        <div class="builder-stats" id="deck-stats">${renderStats()}</div>
      </div>

      <!-- Middle: Card search -->
      <div class="builder-panel">
        <div class="builder-panel-header">
          <div class="input-search" style="flex:1">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
            <input class="input" id="card-search" placeholder="Search cards…">
          </div>
          <span id="search-status" style="font-size:11px;color:var(--fg-4);font-family:var(--font-mono);white-space:nowrap"></span>
        </div>
        <div class="builder-panel-body" style="padding:0">
          <div id="search-results"></div>
          <div id="search-more" style="padding:10px;text-align:center"></div>
        </div>
      </div>

      <!-- Right: Card preview -->
      <div class="builder-panel">
        <div class="builder-panel-header">
          <span style="font-size:12px;font-weight:600;color:var(--fg-1)">Preview</span>
        </div>
        <div class="builder-panel-body" id="card-preview">
          <div class="empty-state" style="padding:30px 0">
            <div class="empty-body">Click a result to preview</div>
          </div>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#builder-back').onclick = () => navigate('/decks');
  container.querySelector('#btn-save-deck').onclick = saveDeck;
  container.querySelector('#btn-deck-history')?.addEventListener('click', showHistory);
  container.querySelector('#btn-import-export').addEventListener('click', () => showImportExportModal(container));

  container.querySelector('#deck-name').addEventListener('input', (e) => { state.deck.name = e.target.value; });
  container.querySelector('#deck-format').addEventListener('change', (e) => {
    state.deck.format = e.target.value;
    renderBuilderUI(container);
  });

  const searchInput = container.querySelector('#card-search');
  const doSearch = debounce(async (q) => {
    if (!q.trim()) {
      container.querySelector('#search-results').innerHTML = '';
      container.querySelector('#search-status').textContent = '';
      state.searchResults = [];
      return;
    }
    await performSearch(q, 1, container);
  }, 400);

  searchInput.addEventListener('input', (e) => doSearch(e.target.value));
  searchInput.focus();

  wireDeckListEvents(container);
}

async function performSearch(q, page, container) {
  state.lastQuery = q;
  state.searchPage = page;
  const status = container.querySelector('#search-status');
  const resultsEl = container.querySelector('#search-results');
  const moreEl = container.querySelector('#search-more');

  if (page === 1) {
    status.textContent = 'Searching…';
    resultsEl.innerHTML = '';
  }

  try {
    const data = await api.searchCards(q, page);
    if (page === 1) state.searchResults = data.data || [];
    else state.searchResults = [...state.searchResults, ...(data.data || [])];

    state.searchHasMore = data.has_more || false;
    status.textContent = data.total_cards ? `${data.total_cards}` : 'No results';

    if (page === 1) resultsEl.innerHTML = '';
    for (const card of (data.data || [])) {
      resultsEl.appendChild(buildSearchResultEl(card, container));
    }

    moreEl.innerHTML = data.has_more
      ? `<button class="btn btn-sm" id="load-more">Load more</button>`
      : '';
    moreEl.querySelector('#load-more')?.addEventListener('click', () => {
      performSearch(state.lastQuery, state.searchPage + 1, container);
    });
  } catch (err) {
    status.textContent = 'Failed';
    resultsEl.innerHTML = `<div style="padding:12px;color:var(--bad);font-size:12px">${esc(err.message)}</div>`;
  }
}

function buildSearchResultEl(card, container) {
  const entry = cardFromScryfall(card);
  const el = document.createElement('div');
  el.className = 'card-search-item';
  el.innerHTML = `
    ${entry.imageUri
      ? `<img class="card-search-thumb" src="${entry.imageUri}" loading="lazy" onerror="this.style.display='none'">`
      : `<div class="card-search-thumb" style="background:${colorTone(entry.colors || [])}"></div>`}
    <div class="card-search-info">
      <div class="card-search-name">${esc(entry.name)}</div>
      <div class="card-search-type">${esc(entry.typeLine || '')}</div>
      <div style="margin-top:2px">${renderManaCost(entry.manaCost || '')}</div>
    </div>
    <button class="btn btn-primary btn-xs add-card-btn" title="Add to deck">+</button>
  `;

  el.addEventListener('click', (e) => {
    if (!e.target.classList.contains('add-card-btn')) {
      showCardPreview(container, card, entry);
    }
  });

  el.querySelector('.add-card-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    addCardToDeck(entry, container);
  });

  return el;
}

function addCardToDeck(entry, container) {
  const existing = state.deck.cards.find(c => c.cardId === entry.cardId);
  if (existing) {
    existing.quantity = Math.min(existing.quantity + 1, 99);
  } else {
    state.deck.cards.push({ ...entry, quantity: 1 });
  }
  refreshDeckPanel(container);
  toast(`Added ${entry.name}`);
}

function renderCommanderSlot() {
  const cmd = state.deck.commander;
  if (!cmd) {
    return `<div style="font-size:12px;color:var(--fg-4)">No commander — search and set one</div>`;
  }
  return `
    <div style="display:flex;align-items:center;gap:8px">
      ${cmd.imageUri ? `<img src="${cmd.imageUri}" style="width:32px;border-radius:3px;flex-shrink:0">` : ''}
      <span style="font-size:13px;font-weight:600;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(cmd.name)}</span>
      <button class="btn btn-ghost btn-icon btn-sm" id="clear-commander" title="Remove">${icon('close', 10)}</button>
    </div>
  `;
}

function renderDeckList() {
  const cards = [...state.deck.cards].sort((a, b) => {
    if (isLand(a.typeLine) !== isLand(b.typeLine)) return isLand(a.typeLine) ? 1 : -1;
    return (a.cmc || 0) - (b.cmc || 0) || a.name.localeCompare(b.name);
  });

  if (!cards.length) {
    return `<div style="color:var(--fg-4);font-size:12px;text-align:center;padding:24px">No cards yet — search and add</div>`;
  }

  const isCommander = state.deck.format === 'commander';
  return cards.map(c => {
    const isCmd = state.deck.commander?.cardId === c.cardId;
    return `
    <div class="deck-entry" data-id="${c.cardId}">
      <div style="display:flex;align-items:center;gap:2px;flex-shrink:0">
        <button class="btn btn-ghost btn-xs qty-minus" data-id="${c.cardId}">−</button>
        <input type="number" value="${c.quantity}" min="1" max="99" data-id="${c.cardId}"
          style="width:28px;text-align:center;background:var(--bg-3);border:1px solid var(--line-2);border-radius:3px;color:var(--fg-1);font-size:11px;font-family:var(--font-mono);padding:1px 2px" class="qty-input">
        <button class="btn btn-ghost btn-xs qty-plus" data-id="${c.cardId}">+</button>
      </div>
      <div class="deck-entry-name" title="${esc(c.name)}">${esc(c.name)}</div>
      <div style="display:flex;gap:1px;flex-shrink:0">${renderManaCost(c.manaCost || '')}</div>
      ${isCommander ? `<button class="btn btn-ghost btn-xs set-cmd-btn" data-id="${c.cardId}" title="${isCmd ? 'Commander' : 'Set as commander'}" style="flex-shrink:0;color:${isCmd ? 'var(--accent)' : 'var(--fg-4)'}">⌘</button>` : ''}
      <button class="btn btn-ghost btn-xs remove-card" data-id="${c.cardId}" title="Remove">${icon('close', 9)}</button>
    </div>
  `}).join('');
}

function renderStats() {
  const total = state.deck.cards.reduce((s, c) => s + c.quantity, 0);
  const colors = new Set(state.deck.cards.flatMap(c => c.colors || []));
  const manaColors = ['W', 'U', 'B', 'R', 'G'];

  const colorDots = manaColors
    .filter(c => colors.has(c))
    .map(c => `<span class="pip pip-${c.toLowerCase()} pip-sm" style="width:10px;height:10px;border-radius:50%;display:inline-block;background:var(--mana-${c.toLowerCase()})"></span>`)
    .join('');

  const byCmc = {};
  for (const c of state.deck.cards) {
    if (!isLand(c.typeLine)) {
      const cmc = Math.min(c.cmc || 0, 7);
      byCmc[cmc] = (byCmc[cmc] || 0) + c.quantity;
    }
  }

  return `
    <span class="stat-badge total">${total} cards</span>
    ${colorDots ? `<span class="stat-badge" style="display:flex;gap:3px;align-items:center">${colorDots}</span>` : ''}
    ${Object.entries(byCmc).sort(([a], [b]) => +a - +b).map(([cmc, n]) =>
      `<span class="stat-badge">${cmc === '7' ? '7+' : cmc} ×${n}</span>`
    ).join('')}
  `;
}

function refreshDeckPanel(container) {
  container.querySelector('#deck-list').innerHTML = renderDeckList();
  container.querySelector('#deck-count').textContent = `${state.deck.cards.reduce((s, c) => s + c.quantity, 0)} cards`;
  container.querySelector('#deck-stats').innerHTML = renderStats();
  if (state.deck.format === 'commander') {
    const slot = container.querySelector('#commander-slot');
    if (slot) slot.innerHTML = renderCommanderSlot();
  }
  wireDeckListEvents(container);
}

function wireDeckListEvents(container) {
  container.querySelectorAll('.qty-minus').forEach(btn => {
    btn.onclick = () => { adjustQty(btn.dataset.id, -1); refreshDeckPanel(container); };
  });
  container.querySelectorAll('.qty-plus').forEach(btn => {
    btn.onclick = () => { adjustQty(btn.dataset.id, 1); refreshDeckPanel(container); };
  });
  container.querySelectorAll('.qty-input').forEach(input => {
    input.onchange = () => {
      const card = state.deck.cards.find(c => c.cardId === input.dataset.id);
      if (card) card.quantity = Math.max(1, Math.min(99, parseInt(input.value) || 1));
      refreshDeckPanel(container);
    };
  });
  container.querySelectorAll('.remove-card').forEach(btn => {
    btn.onclick = () => { removeCard(btn.dataset.id); refreshDeckPanel(container); };
  });
  container.querySelectorAll('.set-cmd-btn').forEach(btn => {
    btn.onclick = () => {
      const card = state.deck.cards.find(c => c.cardId === btn.dataset.id);
      if (card) { state.deck.commander = { ...card, quantity: 1 }; refreshDeckPanel(container); toast(`${card.name} set as commander`); }
    };
  });
  container.querySelector('#clear-commander')?.addEventListener('click', () => {
    state.deck.commander = null;
    container.querySelector('#commander-slot').innerHTML = renderCommanderSlot();
  });
}

function adjustQty(cardId, delta) {
  const card = state.deck.cards.find(c => c.cardId === cardId);
  if (!card) return;
  card.quantity = Math.max(1, Math.min(99, card.quantity + delta));
}

function removeCard(cardId) {
  state.deck.cards = state.deck.cards.filter(c => c.cardId !== cardId);
}

function showCardPreview(container, card, entry) {
  const preview = container.querySelector('#card-preview');
  const isCommander = state.deck.format === 'commander';
  const inDeck = state.deck.cards.find(c => c.cardId === entry.cardId);

  preview.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:12px;padding:4px">
      ${entry.imageUri
        ? `<img src="${entry.imageUri}" style="width:100%;border-radius:8px" onerror="this.remove()">`
        : `<div style="width:100%;padding-top:140%;background:${colorTone(entry.colors || [])};border-radius:8px;position:relative">
             <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;font-weight:600;font-size:13px">
               ${esc(entry.name)}
             </div>
           </div>`}
      <div>
        <div style="font-weight:600;font-size:14px">${esc(entry.name)}</div>
        <div style="margin-top:4px">${renderManaCost(entry.manaCost || '')}</div>
        <div style="font-size:11px;color:var(--fg-3);margin-top:4px">${esc(entry.typeLine || '')}</div>
        ${entry.power != null ? `<div style="font-size:11px;color:var(--fg-2);font-family:var(--font-mono);margin-top:2px">${entry.power}/${entry.toughness}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn btn-primary" id="preview-add" style="justify-content:center">
          ${inDeck ? `Add another (${inDeck.quantity} in deck)` : '+ Add to Deck'}
        </button>
        ${isCommander ? `<button class="btn btn-sm" id="preview-set-cmd">Set as Commander</button>` : ''}
        ${entry.imageUriBack ? `<button class="btn btn-sm btn-ghost" id="preview-flip">Flip Card</button>` : ''}
      </div>
    </div>
  `;

  preview.querySelector('#preview-add').onclick = () => {
    addCardToDeck(entry, container);
    showCardPreview(container, card, entry);
  };
  preview.querySelector('#preview-set-cmd')?.addEventListener('click', () => {
    state.deck.commander = { ...entry, quantity: 1 };
    const slot = container.querySelector('#commander-slot');
    if (slot) { slot.innerHTML = renderCommanderSlot(); wireDeckListEvents(container); }
    toast(`Set ${entry.name} as commander`);
  });

  let showingBack = false;
  preview.querySelector('#preview-flip')?.addEventListener('click', () => {
    showingBack = !showingBack;
    const img = preview.querySelector('img');
    if (img) img.src = showingBack ? entry.imageUriBack : entry.imageUri;
  });
}

async function saveDeck() {
  const name = document.querySelector('#deck-name')?.value?.trim();
  if (!name) { toast('Deck name required', 'error'); return; }

  const changelog = state.isNew
    ? 'Initial version'
    : (prompt('Changelog (what changed?)', 'Updated cards') || 'Updated');

  state.saving = true;
  try {
    const payload = { name, format: state.deck.format, cards: state.deck.cards, commander: state.deck.commander || null, changelog };
    if (state.isNew) {
      const created = await api.createDeck(payload);
      state.deck = created;
      state.isNew = false;
      toast('Deck created!', 'success');
      navigate(`/decks/${created.id}`);
    } else {
      const updated = await api.updateDeck(state.deck.id, payload);
      state.deck = updated;
      toast('Deck saved!', 'success');
    }
  } catch (err) {
    toast('Save failed: ' + err.message, 'error');
  } finally {
    state.saving = false;
  }
}

function showImportExportModal(container) {
  const exportText = state.deck.cards
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(c => `${c.quantity} ${c.name}`)
    .join('\n');

  showModal({
    title: 'Import / Export',
    width: '520px',
    body: `
      <p style="font-size:12px;color:var(--fg-3);margin-bottom:10px">
        One card per line: <code style="background:var(--bg-3);padding:1px 4px;border-radius:3px">4 Lightning Bolt</code>
        or just <code style="background:var(--bg-3);padding:1px 4px;border-radius:3px">Lightning Bolt</code>.
        Editing then clicking Import replaces the deck card list. Unknown names are skipped.
      </p>
      <textarea class="input" id="import-text" spellcheck="false"
        style="width:100%;min-height:320px;resize:vertical;font-family:var(--font-mono);font-size:12px;line-height:1.6"
      >${esc(exportText)}</textarea>
      <div id="import-progress" style="margin-top:8px;font-size:12px;color:var(--fg-3);font-family:var(--font-mono);min-height:18px"></div>
    `,
    footer: `
      <button class="btn" id="import-cancel">Cancel</button>
      <button class="btn btn-sm btn-ghost" id="import-copy">Copy to clipboard</button>
      <button class="btn btn-primary" id="import-confirm">Import</button>
    `,
  });

  document.getElementById('import-cancel')?.addEventListener('click', closeModal);
  document.getElementById('import-copy')?.addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('import-text')?.value || '').then(() => toast('Copied!'));
  });
  document.getElementById('import-confirm')?.addEventListener('click', () => doImport(container));
}

async function doImport(container) {
  const text = document.getElementById('import-text')?.value || '';
  const progress = document.getElementById('import-progress');
  const confirmBtn = document.getElementById('import-confirm');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Importing…'; }

  // Parse lines: optional leading qty then card name
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const parsed = lines.map(line => {
    const m = line.match(/^(\d+)[×x]?\s+(.+)$/);
    return m ? { qty: Math.min(99, Math.max(1, parseInt(m[1]))), name: m[2].trim() }
             : { qty: 1, name: line };
  }).filter(p => p.name);

  const newCards = [];
  let done = 0, skipped = 0;

  for (const { qty, name } of parsed) {
    if (progress) progress.textContent = `Fetching ${done + 1} / ${parsed.length}…`;
    try {
      const card = await api.getCardByName(name);
      const entry = cardFromScryfall(card);
      const existing = newCards.find(c => c.cardId === entry.cardId);
      if (existing) existing.quantity = Math.min(99, existing.quantity + qty);
      else newCards.push({ ...entry, quantity: qty });
      done++;
    } catch {
      skipped++;
      done++;
    }
  }

  state.deck.cards = newCards;
  refreshDeckPanel(container);
  closeModal();
  toast(`Imported ${newCards.length} card${newCards.length !== 1 ? 's' : ''}${skipped ? ` (${skipped} not found)` : ''}`, skipped ? '' : 'success');
}

function showHistory() {
  if (!state.deck.versions?.length) { toast('No version history yet'); return; }
  const versions = [...state.deck.versions].reverse();
  showModal({
    title: `History — ${state.deck.name}`,
    body: versions.map(v => `
      <div class="history-entry">
        <span class="history-date">v${v.version}</span>
        <div>
          <div class="history-note">${esc(v.changelog)}</div>
          <div style="font-size:10px;color:var(--fg-4);font-family:var(--font-mono);margin-top:2px">
            ${new Date(v.timestamp).toLocaleString()} · ${v.cards?.reduce((s, c) => s + c.quantity, 0) || 0} cards
          </div>
        </div>
      </div>
    `).join('')
  });
}
