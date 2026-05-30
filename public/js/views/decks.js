import { api } from '../api.js';
import { esc, fmtDate, toast, showModal, icon, colorTone, renderManaCost, cardFromScryfall } from '../utils.js';
import { navigate } from '../app.js';

export async function renderDecks(container) {
  container.innerHTML = `
    <div class="topbar">
      <div class="topbar-title">Deck Library</div>
      <div class="topbar-spacer"></div>
      <button class="btn btn-primary" id="btn-new-deck">${icon('plus', 14)} New deck</button>
    </div>
    <div class="deck-library-layout" id="deck-lib-body">
      <div class="empty-state" style="grid-column:1/-1"><div class="empty-title">Loading…</div></div>
    </div>
  `;

  container.querySelector('#btn-new-deck').onclick = () => navigate('/decks/new');

  let decks = [];
  try { decks = await api.listDecks(); } catch (e) { toast(e.message, 'error'); }

  if (!decks.length) {
    document.getElementById('deck-lib-body').innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-icon">${icon('duplicate', 20)}</div>
        <div class="empty-title">No decks yet</div>
        <div class="empty-body">Build your first deck with the Scryfall card search.</div>
        <button class="btn btn-primary" id="btn-empty-new">New deck</button>
      </div>`;
    document.getElementById('btn-empty-new').onclick = () => navigate('/decks/new');
    return;
  }

  let selectedId = decks[0].id;
  let fullDeck = null;

  const render = async () => {
    fullDeck = await api.getDeck(selectedId);
    renderLibraryLayout(container, decks, fullDeck, selectedId, {
      onSelect: async (id) => { selectedId = id; await render(); },
      onEdit:   (id) => navigate(`/decks/${id}`),
      onDelete: async (id, name) => {
        if (!confirm(`Delete "${name}"?`)) return;
        try { await api.deleteDeck(id); toast('Deck deleted'); decks = decks.filter(d => d.id !== id); if (!decks.length) { renderDecks(container); return; } selectedId = decks[0].id; await render(); }
        catch (e) { toast(e.message, 'error'); }
      },
      onDeckUpdated: async () => {
        // Re-fetch the deck and refresh only the detail panel (keep search results)
        fullDeck = await api.getDeck(selectedId);
        document.getElementById('deck-detail-panel').innerHTML = renderDeckDetail(fullDeck);
        document.querySelector('#deck-edit-btn')?.addEventListener('click', () => navigate(`/decks/${selectedId}`));
        document.querySelector('#deck-delete-btn')?.addEventListener('click', () => {
          if (!confirm(`Delete "${fullDeck.name}"?`)) return;
          api.deleteDeck(selectedId).then(() => { toast('Deck deleted'); renderDecks(container); }).catch(e => toast(e.message, 'error'));
        });
        document.querySelector('#deck-history-btn')?.addEventListener('click', () => showVersionHistory(fullDeck));
        // Update deck list item count
        decks = decks.map(d => d.id === selectedId ? { ...d, cardCount: fullDeck.cards.reduce((s, c) => s + c.quantity, 0), version: fullDeck.version } : d);
        document.getElementById('deck-rail-list').innerHTML = decks.map(d => renderDeckItem(d, d.id === selectedId)).join('');
        document.querySelectorAll('.deck-item').forEach(el => el.addEventListener('click', () => { selectedId = el.dataset.id; render(); }));
      }
    });
  };

  await render();
}

function renderLibraryLayout(container, decks, fullDeck, selectedId, { onSelect, onEdit, onDelete, onDeckUpdated }) {
  const body = document.getElementById('deck-lib-body');
  body.innerHTML = `
    <!-- Left: deck list -->
    <div class="deck-rail">
      <div class="deck-rail-header">
        <div class="input-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input class="input" id="deck-search" placeholder="Filter decks…">
        </div>
      </div>
      <div class="deck-rail-list" id="deck-rail-list">
        ${decks.map(d => renderDeckItem(d, d.id === selectedId)).join('')}
      </div>
    </div>

    <!-- Center: deck detail -->
    <div class="deck-detail" id="deck-detail-panel">
      ${renderDeckDetail(fullDeck)}
    </div>

    <!-- Right: card search -->
    <div class="card-search-panel">
      <div class="card-search-header">
        <div class="eyebrow" style="margin-bottom:8px">Card Search</div>
        <div class="input-search">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
          <input class="input" id="card-search-input" placeholder="Search Scryfall…">
        </div>
      </div>
      <div class="card-search-results" id="card-search-results">
        <div class="empty-state" style="padding:30px 16px">
          <div class="empty-body">Search for a card to add it to <em>${esc(fullDeck.name)}</em>.</div>
        </div>
      </div>
    </div>
  `;

  // Deck list clicks
  body.querySelectorAll('.deck-item').forEach(el => {
    el.addEventListener('click', () => onSelect(el.dataset.id));
  });

  // Deck action buttons
  body.querySelector('#deck-edit-btn')?.addEventListener('click', () => onEdit(selectedId));
  body.querySelector('#deck-delete-btn')?.addEventListener('click', () => onDelete(selectedId, fullDeck.name));
  body.querySelector('#deck-history-btn')?.addEventListener('click', () => showVersionHistory(fullDeck));

  // Deck search filter
  body.querySelector('#deck-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    body.querySelectorAll('.deck-item').forEach(el => {
      el.style.display = el.dataset.name.includes(q) ? '' : 'none';
    });
  });

  // Card search — passes fullDeck so add buttons can modify it
  let searchTimer;
  body.querySelector('#card-search-input').addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (!q) {
      body.querySelector('#card-search-results').innerHTML = '<div class="empty-state" style="padding:30px 16px"><div class="empty-body">Type a card name or keyword to search.</div></div>';
      return;
    }
    searchTimer = setTimeout(() => doCardSearch(q, body, fullDeck, onDeckUpdated), 400);
  });
}

async function doCardSearch(q, body, fullDeck, onDeckUpdated) {
  const resultsEl = body.querySelector('#card-search-results');
  resultsEl.innerHTML = '<div style="padding:12px;color:var(--fg-3);font-size:12px">Searching…</div>';
  try {
    const data = await api.searchCards(q);
    if (!data.data?.length) {
      resultsEl.innerHTML = '<div class="empty-state" style="padding:30px 16px"><div class="empty-body">No results.</div></div>';
      return;
    }

    resultsEl.innerHTML = '';
    for (const card of data.data) {
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
          <div style="margin-top:3px">${renderManaCost(entry.manaCost || '')}</div>
        </div>
        <button class="btn btn-primary btn-xs lib-add-btn" title="Add to ${esc(fullDeck.name)}">+</button>
      `;

      el.querySelector('.lib-add-btn').addEventListener('click', async (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        btn.disabled = true;
        btn.textContent = '…';
        try {
          // Add card to deck's card list
          const existing = fullDeck.cards.find(c => c.cardId === entry.cardId);
          if (existing) {
            existing.quantity = Math.min(existing.quantity + 1, 99);
          } else {
            fullDeck.cards.push({ ...entry, quantity: 1 });
          }
          await api.updateDeck(fullDeck.id, {
            name: fullDeck.name,
            format: fullDeck.format,
            cards: fullDeck.cards,
            commander: fullDeck.commander || null,
            changelog: `Added ${entry.name}`
          });
          toast(`Added ${entry.name} to ${fullDeck.name}`);
          btn.textContent = '✓';
          // Refresh the deck detail panel
          if (onDeckUpdated) onDeckUpdated();
        } catch (err) {
          toast('Failed: ' + err.message, 'error');
          btn.disabled = false;
          btn.textContent = '+';
        }
      });

      resultsEl.appendChild(el);
    }
  } catch (e) {
    resultsEl.innerHTML = `<div style="padding:12px;color:var(--bad);font-size:12px">${esc(e.message)}</div>`;
  }
}

function renderDeckItem(d, active) {
  const colors = d.colors || [];
  return `
    <div class="deck-item ${active ? 'active' : ''}" data-id="${d.id}" data-name="${esc(d.name.toLowerCase())}">
      <div class="deck-item-name">${esc(d.name)}</div>
      <div class="deck-item-meta">
        <span>${d.cardCount} cards</span>
        <span>·</span>
        <span>${d.format}</span>
        <span>·</span>
        <span>v${d.version}</span>
      </div>
    </div>
  `;
}

function renderDeckDetail(deck) {
  if (!deck) return '<div class="empty-state"><div class="empty-title">Select a deck</div></div>';

  const byType = groupByType(deck.cards);
  const total = deck.cards.reduce((s, c) => s + c.quantity, 0);

  return `
    <div class="deck-detail-header">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div class="deck-detail-title">${esc(deck.name)}</div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-sm" id="deck-edit-btn">${icon('edit', 12)} Edit</button>
          <button class="btn btn-sm" id="deck-history-btn">${icon('history', 12)} History</button>
          <button class="btn btn-sm btn-danger" id="deck-delete-btn">${icon('trash', 12)}</button>
        </div>
      </div>
      <div style="margin-top:6px;font-size:12px;color:var(--fg-3)">${esc(deck.description || '')}</div>
      <div class="deck-stats-row">
        <div class="stat-cell"><div class="stat-label">Cards</div><div class="stat-val mono">${total}</div></div>
        <div class="stat-cell"><div class="stat-label">Format</div><div class="stat-val" style="font-size:13px;text-transform:capitalize">${deck.format}</div></div>
        <div class="stat-cell"><div class="stat-label">Version</div><div class="stat-val mono">v${deck.version}</div></div>
        <div class="stat-cell"><div class="stat-label">Updated</div><div class="stat-val" style="font-size:13px">${fmtDate(deck.updatedAt)}</div></div>
      </div>
    </div>

    <div class="deck-detail-body">
      <div>
        <div class="card-section-header">Mana Curve</div>
        ${renderManaCurve(deck.cards)}
      </div>

      ${Object.entries(byType).map(([type, cards]) => `
        <div>
          <div class="card-section-header">
            ${esc(type)}
            <span class="muted mono" style="font-size:11px;font-weight:400">${cards.reduce((s, c) => s + c.quantity, 0)}</span>
          </div>
          ${cards.map(c => `
            <div class="deck-card-row">
              <span class="deck-card-qty">${c.quantity}</span>
              <span class="deck-card-name">${esc(c.name)}</span>
              <span class="deck-card-cost">${renderManaCost(c.manaCost || '')}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}

      ${deck.versions?.length ? `
        <div>
          <div class="card-section-header">Version History</div>
          ${[...deck.versions].reverse().map(v => `
            <div class="history-entry">
              <span class="history-date">v${v.version}</span>
              <div>
                <div class="history-note">${esc(v.changelog)}</div>
                <div style="font-size:10px;color:var(--fg-4);font-family:var(--font-mono);margin-top:2px">${new Date(v.timestamp).toLocaleDateString()}</div>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function renderManaCurve(cards) {
  const buckets = Array(8).fill(0);
  for (const c of cards) {
    if (!/land/i.test(c.typeLine || '')) {
      buckets[Math.min(c.cmc || 0, 7)] += c.quantity;
    }
  }
  const max = Math.max(...buckets, 1);
  return `
    <div class="mana-curve">
      ${buckets.map((v, i) => `
        <div class="curve-bar-wrap">
          <div class="curve-bar" style="height:${Math.round((v / max) * 44)}px;${v === 0 ? 'background:var(--bg-3);opacity:0.4' : ''}"></div>
          <span class="curve-label">${i === 7 ? '7+' : i}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function groupByType(cards) {
  const groups = {};
  const typeOrder = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Other'];
  for (const c of cards) {
    const type = typeOrder.find(t => (c.typeLine || '').includes(t)) || 'Other';
    (groups[type] ||= []).push(c);
  }
  return Object.fromEntries(typeOrder.filter(t => groups[t]).map(t => [t, groups[t].sort((a, b) => a.name.localeCompare(b.name))]));
}

function showVersionHistory(deck) {
  showModal({
    title: `History — ${deck.name}`,
    body: [...deck.versions].reverse().map(v => `
      <div class="history-entry">
        <span class="history-date">v${v.version}</span>
        <div>
          <div class="history-note">${esc(v.changelog)}</div>
          <div style="font-size:10px;color:var(--fg-4);font-family:var(--font-mono);margin-top:2px">${new Date(v.timestamp).toLocaleString()} · ${v.cards?.reduce((s, c) => s + c.quantity, 0) || 0} cards</div>
        </div>
      </div>
    `).join('')
  });
}
