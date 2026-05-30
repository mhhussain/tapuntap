import { api } from '../api.js';
import { currentUid } from '../auth.js';
import { esc, colorTone, isLand, shuffle, uid, toast, showModal, closeModal, showContextMenu, icon, renderManaCost } from '../utils.js';
import { navigate } from '../app.js';

// ─── State ───────────────────────────────────────────────────────────────────

let gameId = null;
let meUid = null;
let gameMeta = null;
let playersPublic = {};
let myPrivate = { hand: [], library: [] };
let logEntries = [];
let unsubs = [];

let logOpen = true;

const PHASES = ['Untap', 'Upkeep', 'Draw', 'Main 1', 'Combat', 'Main 2', 'End'];
const TOKEN_PRESETS = [
  { name: 'Soldier',  pt: '1/1', color: 'W' }, { name: 'Spirit',  pt: '1/1', color: 'W' },
  { name: 'Goblin',   pt: '1/1', color: 'R' }, { name: 'Dragon',  pt: '5/5', color: 'R' },
  { name: 'Zombie',   pt: '2/2', color: 'B' }, { name: 'Beast',   pt: '3/3', color: 'G' },
];

// ─── Accessors ────────────────────────────────────────────────────────────────

function me() {
  const pub = playersPublic[meUid] || {};
  return { ...pub, ...myPrivate, uid: meUid };
}

function opponents() {
  return Object.values(playersPublic).filter(p => p.uid !== meUid);
}

function mySeatIndex() { return gameMeta?.turnOrder?.indexOf(meUid) ?? 0; }

function isMyTurn() { return gameMeta?.turnOrder?.[gameMeta.activeSeat] === meUid; }

// ─── Entry ───────────────────────────────────────────────────────────────────

export async function renderGame(container, id) {
  gameId = id;
  meUid = currentUid();
  container.innerHTML = `<div class="empty-state"><div class="empty-title">Loading game…</div></div>`;

  unsubs.forEach(u => u()); unsubs = [];
  unsubs.push(api.subscribeGame(gameId, g => {
    if (!g) { toast('Game not found', 'error'); navigate('/games'); return; }
    gameMeta = g;
    safeRender(container);
  }));
  unsubs.push(api.subscribePlayersPublic(gameId, list => {
    playersPublic = Object.fromEntries(list.map(p => [p.uid, p]));
    safeRender(container);
  }));
  unsubs.push(api.subscribeMyPrivate(gameId, meUid, p => {
    myPrivate = p;
    safeRender(container);
  }));
  unsubs.push(api.subscribeLog(gameId, l => {
    logEntries = l;
    safeRender(container);
  }));

  wireKeyboard();
}

function safeRender(container) {
  if (!gameMeta || !playersPublic[meUid]) return;
  render(container);
}

// ─── Full render ─────────────────────────────────────────────────────────────

function render(container) {
  container.innerHTML = buildGameHTML();
  wireOnce(container);
  wireRerender(container);
}

function rerender(container) {
  const c = container || document.getElementById('app');
  // Update parts that change; leave structural DOM intact
  const topbarEl = document.getElementById('game-topbar-inner');
  if (topbarEl) topbarEl.innerHTML = buildTopBarInner();
  const ribbonEl = document.getElementById('player-ribbon');
  if (ribbonEl) ribbonEl.innerHTML = buildRibbon();
  const oppBar = document.getElementById('opponents-bar');
  if (oppBar) oppBar.innerHTML = buildOpponents();
  const bfCreatures = document.getElementById('bf-creatures');
  if (bfCreatures) bfCreatures.innerHTML = buildBfZone('battlefield', false);
  const bfLands = document.getElementById('bf-lands');
  if (bfLands) bfLands.innerHTML = buildBfZone('battlefield', true);
  const handCards = document.getElementById('hand-cards');
  if (handCards) handCards.innerHTML = buildHandCards();
  const handCount = document.getElementById('hand-count');
  if (handCount) handCount.textContent = me().hand.length;
  const bodyEl = document.getElementById('gameplay-body');
  if (bodyEl) bodyEl.className = `gameplay-body ${logOpen ? 'log-open' : 'log-closed'}`;
  // Zone tab counts
  const zoneTabs = document.getElementById('zone-tabs');
  if (zoneTabs) zoneTabs.innerHTML = buildZoneTabs();
  // Battlefield count labels
  const bf = me().battlefield || [];
  const creatures = bf.filter(card => !isLand(card.typeLine));
  const lands = bf.filter(card => isLand(card.typeLine));
  const el = document.getElementById('bf-creatures-count'); if (el) el.textContent = creatures.length;
  const el2 = document.getElementById('bf-lands-count'); if (el2) el2.textContent = `${lands.filter(card => !card.tapped).length} / ${lands.length} untapped`;
  wireRerender(c);
}

// ─── HTML builders ────────────────────────────────────────────────────────────

function buildGameHTML() {
  const opps = opponents();
  return `
    <div class="gameplay-wrap">
      <!-- Top bar -->
      <div class="topbar" id="game-topbar-inner" style="flex-shrink:0">${buildTopBarInner()}</div>

      <!-- Player ribbon -->
      <div class="player-ribbon" id="player-ribbon">${buildRibbon()}</div>

      <!-- Body -->
      <div class="gameplay-body ${logOpen ? 'log-open' : 'log-closed'}" id="gameplay-body">
        <div class="battlefield-column">
          ${opps.length ? `<div id="opponents-bar">${buildOpponents()}</div>` : ''}
          <div class="bf-zones-wrap">
            <div class="bf-zone" id="bf-creatures-wrap" style="flex:1">
              <div class="bf-zone-header">
                <span class="eyebrow">Battlefield · Creatures &amp; Spells</span>
                <span class="muted mono" style="font-size:11px" id="bf-creatures-count">${(me().battlefield || []).filter(c => !isLand(c.typeLine)).length}</span>
                <div style="flex:1"></div>
                <span style="font-size:10px;color:var(--fg-4)">Click to view · right-click for actions</span>
              </div>
              <div class="bf-zone-cards" id="bf-creatures">${buildBfZone('battlefield', false)}</div>
            </div>
            <div class="bf-zone" id="bf-lands-wrap">
              <div class="bf-zone-header">
                <span class="eyebrow">Lands</span>
                <span class="muted mono" style="font-size:11px" id="bf-lands-count">${(() => { const lnds = (me().battlefield || []).filter(c => isLand(c.typeLine)); return `${lnds.filter(c => !c.tapped).length} / ${lnds.length} untapped`; })()}</span>
              </div>
              <div class="bf-zone-cards" id="bf-lands">${buildBfZone('battlefield', true)}</div>
            </div>
          </div>
        </div>

        <!-- Side panel -->
        <aside class="side-panel" id="side-panel">
          <div class="side-panel-tabs">
            <button class="side-tab active" data-tab="log" id="tab-log">Log</button>
            <button class="side-tab" data-tab="notes" id="tab-notes">Notes</button>
            <button class="btn btn-ghost btn-icon" id="btn-close-panel" title="Hide (L)" style="margin:0 6px">${icon('close', 14)}</button>
          </div>
          <div id="panel-body" style="flex:1;overflow-y:auto">
            ${buildLogPanel()}
          </div>
        </aside>
      </div>

      <!-- Bottom bar -->
      <div class="bottom-bar">
        <div class="hand-area" id="hand-zone">
          <div class="hand-label-row">
            <span class="eyebrow">Hand · ${esc(me().name || 'You')}</span>
            <span class="muted mono" style="font-size:11px" id="hand-count">${me().hand.length}</span>
          </div>
          <div class="hand-cards" id="hand-cards">${buildHandCards()}</div>
        </div>
        <div class="zones-actions">
          <div class="eyebrow">Zones &amp; Actions</div>
          <div class="zone-tabs" id="zone-tabs">
            ${buildZoneTabs()}
          </div>
          <div class="action-row">
            <button class="btn btn-sm" id="btn-draw" style="justify-content:center">${icon('deck', 12)} Draw</button>
            <button class="btn btn-sm" id="btn-scry" style="justify-content:center">${icon('scry', 12)} Scry</button>
            <button class="btn btn-sm" id="btn-token" style="justify-content:center">${icon('token', 12)} Token</button>
            <button class="btn btn-ghost btn-icon btn-sm" id="btn-toggle-log" title="Toggle log (L)">${icon('note', 12)}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Hover card preview (floating, pointer-events:none) -->
    <div id="card-hover-preview" style="display:none;position:fixed;z-index:400;pointer-events:none;width:220px;filter:drop-shadow(0 12px 32px rgba(0,0,0,0.7))">
      <img id="card-hover-img" style="width:100%;border-radius:12px;display:block">
    </div>
  `;
}

function buildTopBarInner() {
  return `
    <button class="btn btn-ghost" id="btn-exit">${icon('prev', 14)} Exit</button>
    <div class="topbar-title">${esc(gameMeta?.name || '')}</div>
    <span class="topbar-sub">Turn ${gameMeta?.turn ?? 1} · ${PHASES[gameMeta?.phaseIndex] || 'Main 1'}</span>
    <div class="topbar-spacer"></div>
    ${isMyTurn() ? `<span style="font-size:11px;color:var(--good);font-family:var(--font-mono);display:flex;align-items:center;gap:6px"><span style="width:6px;height:6px;border-radius:50%;background:var(--good);box-shadow:0 0 8px var(--good)"></span>YOUR TURN</span>` : `<span style="font-size:11px;color:var(--fg-3);font-family:var(--font-mono)">Waiting…</span>`}
    <button class="btn btn-ghost btn-icon" id="btn-undo" title="Undo">${icon('undo', 14)}</button>
    <button class="btn btn-sm" id="btn-prev-phase">${icon('prev', 12)} Phase</button>
    <button class="btn btn-sm" id="btn-next-phase">Phase ${icon('next', 12)}</button>
  `;
}

function buildRibbon() {
  // Me first, then opponents
  const myPub = playersPublic[meUid] || {};
  const allPlayers = [
    { uid: meUid, ...myPub, isSelf: true },
    ...opponents().map(p => ({ ...p, isSelf: false }))
  ];
  const activeSeatUid = gameMeta?.turnOrder?.[gameMeta?.activeSeat];

  return allPlayers.map(p => {
    const isActive = p.uid === activeSeatUid;
    const tone = colorTone(p.colors || []);
    // Use actual counts from public data; for self, use myPrivate for hand/lib
    const handCount = p.isSelf ? myPrivate.hand.length : (p.handCount ?? 0);
    const libCount  = p.isSelf ? myPrivate.library.length : (p.libraryCount ?? 0);
    return `
      <div class="ribbon-player ${isActive ? 'active' : ''}" data-uid="${p.uid}">
        <div class="ribbon-avatar" style="background:${tone}">${esc((p.name || '?')[0])}</div>
        <div class="ribbon-info">
          <div class="ribbon-name">
            ${esc(p.name || p.uid)}
            ${isActive ? `<span class="ribbon-active-label">Active</span>` : ''}
            ${p.isSelf ? `<span class="ribbon-active-label" style="background:var(--bg-3);color:var(--fg-2)">You</span>` : ''}
          </div>
          <div class="ribbon-deck">${esc(p.deckName || '')}</div>
        </div>
        <div class="ribbon-vitals">
          <div class="vital">
            <span class="vital-label">Life</span>
            <div class="vital-controls">
              <button class="life-btn life-minus-btn" data-uid="${p.uid}">−</button>
              <span class="vital-val">${p.life ?? 20}</span>
              <button class="life-btn life-plus-btn" data-uid="${p.uid}">+</button>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--fg-3);font-family:var(--font-mono)">
              <span>HAND</span><span style="color:var(--fg-1);font-weight:600;font-size:12px">${handCount}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;font-size:10px;color:var(--fg-3);font-family:var(--font-mono)">
              <span>LIB</span><span style="color:var(--fg-1);font-weight:600;font-size:12px">${libCount}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('') + `
    <button class="ribbon-next-btn" id="ribbon-next-turn">
      ${icon('next', 14)} End turn <span class="kbd" style="background:oklch(0 0 0 / 0.2);border:none">N</span>
    </button>
  `;
}

function buildOpponents() {
  const opps = opponents();
  return `
    <div style="padding:10px 20px 12px;background:var(--bg-0);border-bottom:1px solid var(--line-1)">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <span class="eyebrow">Opponents</span>
        <div style="flex:1;height:1px;background:var(--line-1)"></div>
      </div>
      <div style="display:flex;gap:14px;overflow-x:auto">
        ${opps.map(p => `
          <div class="opponent-mini-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
              <span style="font-size:12px;font-weight:600">${esc(p.name || p.uid)}</span>
              <span class="muted mono" style="font-size:11px">${(p.battlefield || []).length} perms · ${p.libraryCount ?? 0} lib · ♥ ${p.life ?? 20}</span>
            </div>
            <!-- Opponent hand: show face-down card backs (handCount placeholders) -->
            <div style="display:flex;gap:4px;margin-bottom:6px">
              ${Array.from({ length: p.handCount ?? 0 }).map(() => `
                <div style="width:28px;height:40px;border-radius:3px;background:var(--bg-3);border:1px solid var(--line-2);flex-shrink:0" title="Card in hand"></div>
              `).join('')}
            </div>
            <div style="display:flex;gap:4px;overflow-x:auto;padding-bottom:4px;flex-wrap:wrap">
              ${(p.battlefield || []).slice(0, 20).map(c => `
                <div class="opponent-perm ${c.tapped ? 'tapped' : ''}"
                     style="background:${colorTone(c.colors||[])};border:1px solid oklch(0 0 0 / 0.4)"
                     title="${esc(c.name)}">
                  <div style="position:absolute;bottom:2px;left:2px;font-size:7px;color:oklch(1 0 0 / 0.9);font-weight:600;line-height:1;overflow:hidden;white-space:nowrap;max-width:34px">${esc((c.name || '').split(' ')[0])}</div>
                </div>
              `).join('')}
              ${(p.battlefield || []).length === 0 ? `<span style="font-size:11px;color:var(--fg-4);font-style:italic">Empty battlefield</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function buildBfZone(zone, landsOnly) {
  const cards = (me()[zone] || []).filter(c => landsOnly ? isLand(c.typeLine) : !isLand(c.typeLine));
  if (!cards.length) {
    return `<div style="flex:1;display:grid;place-items:center;color:var(--fg-4);font-size:12px;font-style:italic">${landsOnly ? 'No lands in play.' : 'No permanents yet. Drag a card here or use the hand context menu.'}</div>`;
  }
  return cards.map(c => buildCardFace(c, zone)).join('');
}

function buildHandCards() {
  const hand = myPrivate.hand || [];
  if (!hand.length) return `<div style="display:grid;place-items:center;flex:1;color:var(--fg-4);font-size:12px;font-style:italic;min-height:var(--density-card-h)">Empty hand.</div>`;
  return hand.map(c => buildCardFace(c, 'hand')).join('');
}

function buildCardFace(c, zone) {
  const tapped = c.tapped || false;
  const sick = c.summoningSick || false;
  const tone = colorTone(c.colors || []);
  const land = isLand(c.typeLine);
  const classes = ['card-face', tapped ? 'tapped' : '', sick ? 'summoning-sick' : '', land ? 'is-land' : ''].filter(Boolean).join(' ');
  const counters = Object.entries(c.counters || {}).filter(([, v]) => v).map(([k, v]) => `<div class="card-counter">${k}:${v}</div>`).join('');

  const body = c.imageUri
    ? `<img class="card-img-fill" src="${esc(c.imageUri)}" alt="${esc(c.name)}" loading="lazy" onerror="this.style.display='none'">`
    : `<div class="card-name">${esc(c.name)}</div>
       <div class="card-art"></div>
       <div class="card-foot"><span></span>${c.power != null ? `<span class="card-pt">${c.power}/${c.toughness}</span>` : ''}</div>`;

  return `
    <div class="${classes}" style="--card-tone:${tone}" data-iid="${c.instanceId}" data-zone="${zone}" title="${esc(c.name)}">
      <div class="card-color-bar" style="background:${tone}"></div>
      ${body}
      ${counters}
      ${c.token ? '<div class="card-token-badge">TKN</div>' : ''}
    </div>
  `;
}

function buildZoneTabs() {
  const p = me();
  const zones = [
    { key: 'graveyard', label: 'Graveyard', count: (p.graveyard || []).length, iconName: 'graveyard' },
    { key: 'exile',     label: 'Exile',      count: (p.exile || []).length,     iconName: 'exile'     },
    { key: 'library',   label: 'Library',    count: (myPrivate.library || []).length, iconName: 'deck' },
  ];
  if (gameMeta?.format === 'commander' || (p.command || []).length) {
    zones.push({ key: 'command', label: 'Command', count: (p.command || []).length, iconName: 'duplicate' });
  }
  return zones.map(z => `
    <button class="zone-tab" data-zone="${z.key}">
      ${icon(z.iconName, 14)}
      <span class="zone-tab-label">${z.label}</span>
      <span class="zone-tab-count">${z.count}</span>
    </button>
  `).join('');
}

function buildLogPanel() {
  return [...logEntries].reverse().slice(0, 60).map(e => `<div class="log-entry"><span class="log-turn">T${e.turn || ''}</span><div><span class="log-who">${esc(e.who || '')}</span><span class="log-text">${esc(e.text || '')}</span></div></div>`).join('');
}

// ─── Wire events ─────────────────────────────────────────────────────────────

function wireOnce(container) {
  // Side panel
  document.getElementById('btn-close-panel').onclick = () => { logOpen = false; rerender(); };
  document.getElementById('btn-toggle-log').onclick  = () => { logOpen = !logOpen; rerender(); };
  document.getElementById('tab-log').onclick   = () => switchPanelTab('log');
  document.getElementById('tab-notes').onclick = () => switchPanelTab('notes');

  // Bottom bar action buttons
  document.getElementById('btn-draw').onclick  = () => drawCards(1);
  document.getElementById('btn-scry').onclick  = () => showScryModal();
  document.getElementById('btn-token').onclick = () => showTokenModal();

  // Drag-drop targets — wire once
  wireDragDrop();
}

function wireRerender(container) {
  const c = container || document.getElementById('app');
  // Topbar inner
  document.getElementById('btn-exit')?.addEventListener('click', () => navigate('/games'));
  document.getElementById('btn-prev-phase')?.addEventListener('click', prevPhase);
  document.getElementById('btn-next-phase')?.addEventListener('click', nextPhase);
  document.getElementById('btn-undo')?.addEventListener('click', () => toast('Undo not yet implemented'));

  // Ribbon life buttons
  c.querySelectorAll('.life-minus-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); adjustLife(btn.dataset.uid, -1); });
  });
  c.querySelectorAll('.life-plus-btn').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); adjustLife(btn.dataset.uid, 1); });
  });
  document.getElementById('ribbon-next-turn')?.addEventListener('click', endTurn);

  // Zone tabs
  c.querySelectorAll('.zone-tab[data-zone]').forEach(btn => {
    btn.addEventListener('click', () => showZoneDrawer(btn.dataset.zone));
  });

  // Card faces
  c.querySelectorAll('.card-face[data-iid]').forEach(el => {
    const zone = el.dataset.zone;
    el.addEventListener('click', (e) => { e.stopPropagation(); hideHoverPreview(); onCardClick(el, zone); });
    el.addEventListener('contextmenu', (e) => { e.preventDefault(); hideHoverPreview(); onCardRightClick(e, el, zone); });
    el.addEventListener('mouseenter', () => showHoverPreview(findCard(zone, el.dataset.iid), el));
    el.addEventListener('mouseleave', hideHoverPreview);
    if (zone !== 'hand') {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('application/json', JSON.stringify({ iid: el.dataset.iid, fromZone: zone }));
        e.dataTransfer.effectAllowed = 'move';
      });
    }
  });
}

function wireDragDrop() {
  const zones = [
    { el: document.getElementById('bf-creatures-wrap'), zone: 'battlefield-creatures' },
    { el: document.getElementById('bf-lands-wrap'),    zone: 'battlefield-lands'    },
    { el: document.getElementById('hand-zone'),        zone: 'hand'                 },
  ];
  for (const { el, zone } of zones) {
    if (!el) continue;
    el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drop-target'); });
    el.addEventListener('dragleave', () => el.classList.remove('drop-target'));
    el.addEventListener('drop', (e) => {
      e.preventDefault(); el.classList.remove('drop-target');
      const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      if (!data.iid) return;
      const toZone = zone === 'battlefield-creatures' || zone === 'battlefield-lands' ? 'battlefield' : zone;
      moveCard(data.iid, data.fromZone, toZone);
    });
  }
}

// ─── Card interactions ────────────────────────────────────────────────────────

function showCardDetail(card) {
  if (!card) return;
  let showBack = false;
  const renderBody = () => `
    <div style="display:flex;flex-direction:column;align-items:center;gap:12px">
      ${card.imageUri
        ? `<img id="card-detail-img" src="${esc(showBack && card.imageUriBack ? card.imageUriBack : card.imageUri)}" style="width:100%;max-width:280px;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.5)">`
        : `<div style="width:250px;height:350px;border-radius:12px;background:${colorTone(card.colors||[])};display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:var(--fg-0)">${esc(card.name)}</div>`}
      <div style="text-align:center">
        <div style="font-weight:600;font-size:14px">${esc(card.name)}</div>
        <div style="margin-top:4px">${renderManaCost(card.manaCost || '')}</div>
        ${card.typeLine ? `<div style="font-size:11px;color:var(--fg-3);margin-top:4px">${esc(card.typeLine)}</div>` : ''}
        ${card.power != null ? `<div style="font-size:12px;font-family:var(--font-mono);margin-top:4px">${card.power}/${card.toughness}</div>` : ''}
      </div>
      ${card.imageUriBack ? `<button class="btn btn-sm" id="card-detail-flip">Flip Card</button>` : ''}
    </div>
  `;

  showModal({ title: card.name, width: '320px', body: renderBody(), footer: `<button class="btn" id="card-detail-close">Close</button>` });
  document.getElementById('card-detail-close')?.addEventListener('click', closeModal);
  document.getElementById('card-detail-flip')?.addEventListener('click', () => {
    showBack = !showBack;
    const img = document.getElementById('card-detail-img');
    if (img) img.src = showBack ? card.imageUriBack : card.imageUri;
  });
}

function showHoverPreview(card, anchorEl) {
  if (!card?.imageUri) return;
  const preview = document.getElementById('card-hover-preview');
  const img = document.getElementById('card-hover-img');
  if (!preview || !img) return;
  img.src = card.imageUri;
  const rect = anchorEl.getBoundingClientRect();
  let left = rect.right + 12;
  let top = rect.top;
  if (left + 230 > window.innerWidth)  left = rect.left - 232;
  if (top  + 310 > window.innerHeight) top  = window.innerHeight - 316;
  preview.style.left = `${Math.max(8, left)}px`;
  preview.style.top  = `${Math.max(8, top)}px`;
  preview.style.display = 'block';
}

function hideHoverPreview() {
  const preview = document.getElementById('card-hover-preview');
  if (preview) preview.style.display = 'none';
}

function onCardClick(el, zone) {
  const card = findCard(zone, el.dataset.iid);
  if (card) showCardDetail(card);
}

function onCardRightClick(e, el, zone) {
  const card = findCard(zone, el.dataset.iid);
  if (!card) return;
  if (zone === 'battlefield') showBattlefieldCtxMenu(e.clientX, e.clientY, card);
  else if (zone === 'hand') showHandCtxMenu(e.clientX, e.clientY, card);
}

function showHandCtxMenu(x, y, card) {
  showContextMenu(x, y, [
    { header: card.name },
    { label: 'View card', action: () => showCardDetail(card) },
    'sep',
    { label: 'Play to battlefield', icon: '⬇', action: () => moveCard(card.instanceId, 'hand', 'battlefield') },
    { label: 'Play tapped', icon: '↩', action: () => {
        moveCard(card.instanceId, 'hand', 'battlefield');
        // Tap it after moving — find it in the new battlefield state
        const updated = me().battlefield || [];
        const c = updated.find(x => x.instanceId === card.instanceId);
        if (c) {
          c.tapped = true;
          commitMyPublic({ battlefield: updated });
        }
      }
    },
    'sep',
    { label: 'To graveyard', icon: '💀', action: () => moveCard(card.instanceId, 'hand', 'graveyard') },
    { label: 'To exile',     icon: '🚫', action: () => moveCard(card.instanceId, 'hand', 'exile') },
    { label: 'To library (top)',    icon: '📚', action: () => moveCard(card.instanceId, 'hand', 'library', 'top') },
    { label: 'To library (bottom)', icon: '📚', action: () => moveCard(card.instanceId, 'hand', 'library', 'bottom') },
    ...(gameMeta?.format === 'commander' ? ['sep', { label: 'To command zone', action: () => moveCard(card.instanceId, 'hand', 'command') }] : []),
  ]);
}

function showBattlefieldCtxMenu(x, y, card) {
  showContextMenu(x, y, [
    { header: card.name },
    { label: 'View card', action: () => showCardDetail(card) },
    { label: card.tapped ? 'Untap' : 'Tap', icon: '↩', action: () => {
        card.tapped = !card.tapped;
        addLog(`${card.name} ${card.tapped ? 'tapped' : 'untapped'}`);
        commitMyPublic({ battlefield: me().battlefield });
      }
    },
    'sep',
    { header: 'Counters' },
    { label: '+1/+1',     icon: '⬆', action: () => addCounter(card.instanceId, '+1/+1', 1) },
    { label: '−1/−1',     icon: '⬇', action: () => addCounter(card.instanceId, '-1/-1', 1) },
    { label: 'Remove +1/+1', icon: '↩', action: () => addCounter(card.instanceId, '+1/+1', -1) },
    { label: 'Remove −1/−1', icon: '↩', action: () => addCounter(card.instanceId, '-1/-1', -1) },
    { label: 'Loyalty +1', action: () => addCounter(card.instanceId, 'loyalty', 1) },
    { label: 'Loyalty −1', action: () => addCounter(card.instanceId, 'loyalty', -1) },
    { label: 'Custom counter…', icon: '✏', action: () => {
      const name = prompt('Counter name:'); if (!name) return;
      const amt = parseInt(prompt('Amount (negative to remove):', '1')); if (!isNaN(amt)) addCounter(card.instanceId, name, amt);
    }},
    'sep',
    { header: 'Move to zone' },
    { label: 'To hand',              action: () => moveCard(card.instanceId, 'battlefield', 'hand') },
    { label: 'To graveyard', icon: '💀', action: () => moveCard(card.instanceId, 'battlefield', 'graveyard') },
    { label: 'To exile',     icon: '🚫', action: () => moveCard(card.instanceId, 'battlefield', 'exile') },
    { label: 'To library (top)',    action: () => moveCard(card.instanceId, 'battlefield', 'library', 'top') },
    { label: 'To library (bottom)', action: () => moveCard(card.instanceId, 'battlefield', 'library', 'bottom') },
    ...(gameMeta?.format === 'commander' ? [{ label: 'To command zone', action: () => moveCard(card.instanceId, 'battlefield', 'command') }] : []),
    'sep',
    { label: 'Remove (token)', danger: true, action: () => {
        const bf = (me().battlefield || []).filter(c => c.instanceId !== card.instanceId);
        addLog(`${card.name} removed`);
        commitMyPublic({ battlefield: bf });
      }
    },
  ]);
}

// ─── Game actions ─────────────────────────────────────────────────────────────

/** Find a card in one of my zones by instanceId */
function findCard(zone, iid) {
  const privateZones = ['hand', 'library'];
  if (privateZones.includes(zone)) {
    return (myPrivate[zone] || []).find(c => c.instanceId === iid);
  }
  return (me()[zone] || []).find(c => c.instanceId === iid);
}

/** Write public fields for me (battlefield, graveyard, exile, command, life, poison, etc.) */
function commitMyPublic(patch) {
  api.writeMyPublic(gameId, meUid, patch).catch(err => toast('Save failed: ' + err.message, 'error'));
}

/** Write private + update counts */
function commitMyPrivate() {
  api.writePrivateAndCounts(gameId, meUid, {
    hand: myPrivate.hand || [],
    library: myPrivate.library || [],
  }).catch(err => toast('Save failed: ' + err.message, 'error'));
}

function addLog(text) {
  api.appendLog(gameId, {
    turn: gameMeta?.turn ?? 1,
    who: me().name || meUid,
    seat: mySeatIndex(),
    text,
  }).catch(() => {});
}

/**
 * Move a card between zones (MY zones only).
 * Zones: hand, library (private) | battlefield, graveyard, exile, command (public)
 */
function moveCard(iid, fromZone, toZone, pos = 'top') {
  const privateZones = ['hand', 'library'];
  const fromPrivate = privateZones.includes(fromZone);
  const toPrivate   = privateZones.includes(toZone);

  // Build mutable copies of current state
  const pub = { ...playersPublic[meUid] };
  const priv = { hand: [...(myPrivate.hand || [])], library: [...(myPrivate.library || [])] };

  // Get source array
  const srcArr = fromPrivate ? priv[fromZone] : pub[fromZone] || [];
  const idx = srcArr.findIndex(c => c.instanceId === iid);
  if (idx === -1) return;
  const [card] = srcArr.splice(idx, 1);

  // Clean card when leaving battlefield
  if (fromZone === 'battlefield') { card.tapped = false; card.counters = {}; card.attachedTo = null; }

  // Place into destination
  const dstArr = toPrivate ? priv[toZone] : (pub[toZone] = [...(pub[toZone] || [])]);
  if (toZone === 'library') {
    pos === 'bottom' ? dstArr.push(card) : dstArr.unshift(card);
  } else {
    dstArr.push(card);
  }

  addLog(`${card.name} → ${toZone}`);

  // Commit changes
  if (fromPrivate) { priv[fromZone] = srcArr; }
  else             { pub[fromZone]  = srcArr; }

  // Apply local optimistic update so rerender feels instant
  myPrivate = priv;
  if (!fromPrivate) playersPublic[meUid] = pub;
  if (!toPrivate)   playersPublic[meUid] = { ...playersPublic[meUid], ...pub };

  // Determine what to write
  const needsPrivate = fromPrivate || toPrivate;
  const needsPublic  = !fromPrivate || !toPrivate;

  if (needsPrivate) commitMyPrivate();
  if (needsPublic) {
    // Build public patch from pub
    const publicPatch = {};
    ['battlefield', 'graveyard', 'exile', 'command'].forEach(z => {
      if (pub[z] !== undefined) publicPatch[z] = pub[z];
    });
    commitMyPublic(publicPatch);
  }

  rerender();
}

function adjustLife(targetUid, delta) {
  if (targetUid === meUid) {
    const newLife = (me().life ?? 20) + delta;
    addLog(`${me().name || 'You'}: ${delta > 0 ? '+' : ''}${delta} life (→ ${newLife})`);
    commitMyPublic({ life: newLife });
  } else {
    // For opponents, we can only log — they manage their own life
    toast("Ask your opponent to adjust their own life total", 'error');
  }
}

function addCounter(iid, type, delta) {
  const bf = (me().battlefield || []).map(c => {
    if (c.instanceId !== iid) return c;
    const counters = { ...c.counters };
    counters[type] = (counters[type] || 0) + delta;
    if (counters[type] === 0) delete counters[type];
    return { ...c, counters };
  });
  commitMyPublic({ battlefield: bf });
}

function drawCards(n = 1) {
  const hand = [...(myPrivate.hand || [])];
  const library = [...(myPrivate.library || [])];
  let drawn = 0;
  for (let i = 0; i < n && library.length; i++) { hand.push(library.shift()); drawn++; }
  if (drawn) addLog(`${me().name || 'You'} drew ${drawn} card${drawn > 1 ? 's' : ''}`);
  if (!library.length && n > drawn) toast('Library is empty!', 'error');
  myPrivate = { ...myPrivate, hand, library };
  commitMyPrivate();
  rerender();
}

function endTurn() {
  if (!gameMeta) return;
  const turnOrder = gameMeta.turnOrder || [meUid];
  const nextSeat = ((gameMeta.activeSeat ?? 0) + 1) % turnOrder.length;
  const newTurn = nextSeat === 0 ? (gameMeta.turn ?? 1) + 1 : (gameMeta.turn ?? 1);
  addLog('Ends their turn.');

  // Untap my own permanents (local player ends their turn = they untap)
  if (isMyTurn()) {
    const bf = (me().battlefield || []).map(c => ({ ...c, tapped: false, summoningSick: false }));
    commitMyPublic({ battlefield: bf });
  }

  api.advanceTurn(gameId, {
    activeSeat: nextSeat,
    turn: newTurn,
    phaseIndex: 0,
    phase: PHASES[0],
  }).catch(err => toast('Turn advance failed: ' + err.message, 'error'));
}

function nextPhase() {
  if (!gameMeta) return;
  const phaseIndex = (gameMeta.phaseIndex ?? 0) + 1;
  if (phaseIndex >= PHASES.length) { endTurn(); return; }
  api.advanceTurn(gameId, { phaseIndex, phase: PHASES[phaseIndex] })
    .catch(err => toast('Phase advance failed: ' + err.message, 'error'));
}

function prevPhase() {
  if (!gameMeta) return;
  const phaseIndex = Math.max(0, (gameMeta.phaseIndex ?? 0) - 1);
  api.advanceTurn(gameId, { phaseIndex, phase: PHASES[phaseIndex] })
    .catch(err => toast('Phase advance failed: ' + err.message, 'error'));
}

function switchPanelTab(tab) {
  document.querySelectorAll('.side-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const body = document.getElementById('panel-body');
  if (tab === 'log') body.innerHTML = buildLogPanel();
  else body.innerHTML = `
    <div style="padding:14px;display:flex;flex-direction:column;gap:8px;height:100%">
      <textarea class="input" id="game-notes" placeholder="Jot down anything — opponent's tells, sequencing notes, threats…" style="flex:1;min-height:180px;resize:none;line-height:1.5">${esc(gameMeta?.notes || '')}</textarea>
      <div style="font-size:10px;color:var(--fg-4);font-family:var(--font-mono);text-transform:uppercase">Saves with the game.</div>
    </div>`;
  document.getElementById('game-notes')?.addEventListener('input', (e) => {
    api.advanceTurn(gameId, { notes: e.target.value }).catch(() => {});
  });
}

// ─── Scry modal ───────────────────────────────────────────────────────────────

function showScryModal() {
  const library = myPrivate.library || [];
  if (!library.length) { toast('Library is empty', 'error'); return; }
  const n = parseInt(prompt('Scry how many?', '3') || '0');
  if (!n || n < 1) return;
  const scrying = library.slice(0, Math.min(n, library.length));
  let dests = scrying.map(() => 'top');

  const renderScry = () => {
    showModal({
      title: `Scry ${n}`,
      width: '660px',
      body: `
        <p style="color:var(--fg-3);font-size:13px;margin-bottom:16px">Look at the top ${scrying.length} cards. Put any on the bottom; the rest stay on top.</p>
        <div class="scry-cards">
          ${scrying.map((c, i) => `
            <div class="scry-card-item">
              ${c.imageUri ? `<img src="${esc(c.imageUri)}" style="width:90px;border-radius:5px;border:1px solid var(--line-2)">` : `<div class="card-face" style="width:90px;height:126px;--card-tone:${colorTone(c.colors||[])}"><div class="card-color-bar" style="background:${colorTone(c.colors||[])}"></div><div class="card-name">${esc(c.name)}</div><div class="card-art"></div></div>`}
              <div class="scry-dest-btns">
                <button class="btn btn-sm scry-top-btn" data-si="${i}" style="justify-content:center;${dests[i]==='top'?'background:var(--accent-soft);border-color:var(--accent)':''}">↑ Top</button>
                <button class="btn btn-sm scry-bot-btn" data-si="${i}" style="justify-content:center;${dests[i]==='bottom'?'background:var(--accent-soft);border-color:var(--accent)':''}">↓ Bottom</button>
              </div>
            </div>
          `).join('')}
        </div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <button class="btn btn-sm" id="scry-all-top">All top</button>
          <button class="btn btn-sm" id="scry-all-bot">All bottom</button>
        </div>
      `,
      footer: `<button class="btn" id="scry-cancel">Cancel</button><button class="btn btn-primary" id="scry-confirm">Confirm</button>`,
    });

    document.querySelectorAll('.scry-top-btn').forEach(b => { b.onclick = () => { dests[+b.dataset.si] = 'top'; renderScry(); }; });
    document.querySelectorAll('.scry-bot-btn').forEach(b => { b.onclick = () => { dests[+b.dataset.si] = 'bottom'; renderScry(); }; });
    document.getElementById('scry-all-top')?.addEventListener('click', () => { dests = dests.map(() => 'top'); renderScry(); });
    document.getElementById('scry-all-bot')?.addEventListener('click', () => { dests = dests.map(() => 'bottom'); renderScry(); });
    document.getElementById('scry-cancel')?.addEventListener('click', closeModal);
    document.getElementById('scry-confirm')?.addEventListener('click', () => {
      const lib = [...(myPrivate.library || [])];
      lib.splice(0, scrying.length);
      const tops = [], bots = [];
      dests.forEach((d, i) => d === 'bottom' ? bots.push(scrying[i]) : tops.push(scrying[i]));
      lib.unshift(...tops.reverse());
      lib.push(...bots);
      addLog(`${me().name || 'You'} scried ${n}`);
      myPrivate = { ...myPrivate, library: lib };
      commitMyPrivate();
      closeModal(); rerender();
    });
  };
  renderScry();
}

// ─── Token modal ──────────────────────────────────────────────────────────────

function showTokenModal() {
  let name = 'Soldier', pt = '1/1', color = 'W', colorless = false;

  const renderToken = () => {
    showModal({
      title: 'Create token',
      width: '560px',
      body: `
        <div class="eyebrow" style="margin-bottom:8px">Presets</div>
        <div class="token-presets">
          ${TOKEN_PRESETS.map(t => `
            <button class="btn btn-sm token-preset" data-name="${t.name}" data-pt="${t.pt}" data-color="${t.color}" style="justify-content:flex-start;gap:6px">
              <span class="pip pip-${t.color.toLowerCase()}"></span>
              <span>${t.name}</span>
              <span style="margin-left:auto;font-family:var(--font-mono);font-size:11px;color:var(--fg-3)">${t.pt}</span>
            </button>
          `).join('')}
        </div>
        <div class="token-form">
          <div>
            <div class="field-label">Name</div>
            <input class="input" id="tok-name" value="${esc(name)}">
          </div>
          <div>
            <div class="field-label">P/T</div>
            <input class="input" id="tok-pt" value="${esc(pt)}" style="text-align:center;font-family:var(--font-mono)">
          </div>
          <div>
            <div class="field-label">Color</div>
            <div style="display:flex;gap:4px">
              ${['W','U','B','R','G'].map(c => `
                <button class="btn btn-icon tok-color" data-c="${c}" style="flex:1;padding:0;height:30px;background:${!colorless&&c===color?`var(--mana-${c.toLowerCase()})`:'var(--bg-2)'};border-color:${!colorless&&c===color?`var(--mana-${c.toLowerCase()})`:'var(--line-2)'}">
                  <span style="font-weight:700;font-size:11px;color:${!colorless&&c===color?'oklch(0.18 0.015 250)':'var(--fg-2)'}">${c}</span>
                </button>
              `).join('')}
              <button class="btn btn-icon tok-colorless" style="flex:1;padding:0;height:30px;background:${colorless?'var(--mana-c)':'var(--bg-2)'};border-color:${colorless?'var(--mana-c)':'var(--line-2)'}">
                <span style="font-weight:700;font-size:11px;color:${colorless?'oklch(0.18 0.015 250)':'var(--fg-2)'}">C</span>
              </button>
            </div>
          </div>
        </div>
        <div style="margin-top:10px">
          <div class="field-label">Quantity</div>
          <input class="input" id="tok-qty" type="number" value="1" min="1" max="20" style="width:80px">
        </div>
      `,
      footer: `<button class="btn" id="tok-cancel">Cancel</button><button class="btn btn-primary" id="tok-create">Create</button>`,
    });

    document.querySelectorAll('.token-preset').forEach(btn => {
      btn.onclick = () => { name = btn.dataset.name; pt = btn.dataset.pt; color = btn.dataset.color; renderToken(); };
    });
    document.querySelectorAll('.tok-color').forEach(btn => {
      btn.onclick = () => { color = btn.dataset.c; colorless = false; renderToken(); };
    });
    document.querySelector('.tok-colorless')?.addEventListener('click', () => { colorless = true; renderToken(); });
    document.getElementById('tok-name')?.addEventListener('input', e => { name = e.target.value; });
    document.getElementById('tok-pt')?.addEventListener('input', e => { pt = e.target.value; });
    document.getElementById('tok-cancel')?.addEventListener('click', closeModal);
    document.getElementById('tok-create')?.addEventListener('click', () => {
      const qty = Math.min(20, Math.max(1, parseInt(document.getElementById('tok-qty').value) || 1));
      const [pw, tg] = pt.split('/');
      const bf = [...(me().battlefield || [])];
      for (let i = 0; i < qty; i++) {
        bf.push({
          instanceId: uid(), cardId: 'token-' + uid(),
          name, typeLine: `Token Creature`, colors: colorless ? [] : [color],
          power: pw, toughness: tg, imageUri: null,
          tapped: false, counters: {}, token: true,
        });
      }
      addLog(`${me().name || 'You'} created ${qty}× ${name} token${qty > 1 ? 's' : ''}`);
      commitMyPublic({ battlefield: bf });
      closeModal(); rerender();
    });
  };
  renderToken();
}

// ─── Zone drawer ──────────────────────────────────────────────────────────────

function buildLibraryReference(library) {
  const p = me();
  // Group library cards by name, count copies remaining
  const inLib = {};
  for (const c of library) {
    if (!inLib[c.name]) inLib[c.name] = { card: c, count: 0 };
    inLib[c.name].count++;
  }

  // Build full deck picture: every unique card across all zones
  const allZones = ['battlefield', 'graveyard', 'exile', 'command'];
  const total = { ...Object.fromEntries(Object.entries(inLib).map(([k, v]) => [k, v.count])) };
  for (const z of allZones) {
    for (const c of (p[z] || [])) {
      if (!total[c.name]) total[c.name] = 0;
      total[c.name]++;
    }
  }
  // Also add hand
  for (const c of (myPrivate.hand || [])) {
    if (!total[c.name]) total[c.name] = 0;
    total[c.name]++;
  }

  if (!Object.keys(inLib).length) {
    return `<div class="empty-state" style="padding:30px"><div class="empty-title">Library is empty</div></div>`;
  }

  const TYPE_ORDER = ['Creature', 'Planeswalker', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Land', 'Other'];
  const groups = {};
  for (const entry of Object.values(inLib)) {
    const type = TYPE_ORDER.find(t => (entry.card.typeLine || '').includes(t)) || 'Other';
    (groups[type] ||= []).push(entry);
  }
  for (const type of TYPE_ORDER) {
    if (groups[type]) groups[type].sort((a, b) => a.card.name.localeCompare(b.card.name));
  }

  return TYPE_ORDER.filter(t => groups[t]).map(type => `
    <div style="margin-bottom:14px">
      <div class="card-section-header" style="margin-bottom:6px">
        ${esc(type)}
        <span class="muted mono" style="font-size:11px;font-weight:400">${groups[type].reduce((s, e) => s + e.count, 0)}</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:3px">
        ${groups[type].map(({ card: c, count }) => `
          <div class="deck-card-row lib-ref-card" data-name="${esc(c.name)}" style="cursor:pointer;padding:5px 8px;border-radius:5px;border:1px solid var(--line-1)">
            <span class="deck-card-qty">${count}<span style="color:var(--fg-4);font-size:10px">/${total[c.name]}</span></span>
            <span class="deck-card-name">${esc(c.name)}</span>
            <span class="deck-card-cost">${renderManaCost(c.manaCost || '')}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function showZoneDrawer(zone) {
  const p = me();
  const isLib = zone === 'library';
  const cards = isLib ? (myPrivate.library || []) : (p[zone] || []);
  const titles = { graveyard: 'Graveyard', exile: 'Exile', library: 'Library', command: 'Command Zone' };

  showModal({
    title: `${titles[zone] || zone} · ${p.name || 'You'}`,
    width: '700px',
    body: `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <span class="muted mono" style="font-size:12px">${cards.length} cards</span>
        ${!isLib ? `<div style="display:flex;gap:6px">
          <button class="btn btn-sm" id="zd-to-bf">All → Battlefield</button>
          <button class="btn btn-sm" id="zd-to-hand">All → Hand</button>
          ${zone==='graveyard' ? '<button class="btn btn-sm" id="zd-shuffle">Shuffle into library</button>' : ''}
        </div>` : `<button class="btn btn-sm" id="zd-shuffle-lib">Shuffle</button>`}
      </div>
      ${isLib ? buildLibraryReference(cards) : `
      <div class="zone-drawer-cards">
        ${cards.length === 0 ? `<div class="empty-state" style="width:100%;padding:30px"><div class="empty-title">Nothing here</div></div>` : ''}
        ${cards.map(c => `
            <div class="card-face zone-drawer-card" data-iid="${c.instanceId}" style="--card-tone:${colorTone(c.colors||[])};cursor:pointer" title="${esc(c.name)}">
              <div class="card-color-bar" style="background:${colorTone(c.colors||[])}"></div>
              ${c.imageUri ? `<img class="card-img-fill" src="${esc(c.imageUri)}" loading="lazy" onerror="this.style.display='none'">` : `<div class="card-name">${esc(c.name)}</div><div class="card-art"></div>`}
            </div>
          `).join('')}
      </div>`}
    `,
    footer: `<button class="btn" id="zd-close">Close</button>`,
  });

  document.getElementById('zd-close')?.addEventListener('click', closeModal);
  document.getElementById('zd-to-bf')?.addEventListener('click', () => {
    const pub = { ...playersPublic[meUid] };
    const toMove = [...(pub[zone] || [])];
    pub[zone] = [];
    pub.battlefield = [...(pub.battlefield || []), ...toMove];
    playersPublic[meUid] = pub;
    addLog(`All from ${zone} → battlefield`);
    commitMyPublic({ [zone]: [], battlefield: pub.battlefield });
    closeModal(); rerender();
  });
  document.getElementById('zd-to-hand')?.addEventListener('click', () => {
    const pub = { ...playersPublic[meUid] };
    const toMove = [...(pub[zone] || [])];
    pub[zone] = [];
    playersPublic[meUid] = pub;
    const newHand = [...(myPrivate.hand || []), ...toMove];
    myPrivate = { ...myPrivate, hand: newHand };
    addLog(`All from ${zone} → hand`);
    commitMyPublic({ [zone]: [] });
    commitMyPrivate();
    closeModal(); rerender();
  });
  document.getElementById('zd-shuffle')?.addEventListener('click', () => {
    const pub = { ...playersPublic[meUid] };
    const newLib = shuffle([...(myPrivate.library || []), ...(pub.graveyard || [])]);
    pub.graveyard = [];
    playersPublic[meUid] = pub;
    myPrivate = { ...myPrivate, library: newLib };
    addLog(`${p.name || 'You'} shuffled graveyard into library`);
    commitMyPublic({ graveyard: [] });
    commitMyPrivate();
    closeModal(); rerender();
  });
  document.getElementById('zd-shuffle-lib')?.addEventListener('click', () => {
    const newLib = shuffle([...(myPrivate.library || [])]);
    myPrivate = { ...myPrivate, library: newLib };
    addLog(`${p.name || 'You'} shuffled library`);
    commitMyPrivate();
    closeModal(); rerender();
  });

  // Click a card in zone (graveyard / exile / command) to move it
  document.querySelectorAll('.zone-drawer-card').forEach(el => {
    el.addEventListener('click', () => {
      const card = (p[zone] || []).find(c => c.instanceId === el.dataset.iid);
      if (!card) return;
      showContextMenu(el.getBoundingClientRect().right, el.getBoundingClientRect().top, [
        { header: card.name },
        { label: 'View card', action: () => showCardDetail(card) },
        'sep',
        { label: 'To battlefield', action: () => { moveCard(card.instanceId, zone, 'battlefield'); closeModal(); } },
        { label: 'To hand',        action: () => { moveCard(card.instanceId, zone, 'hand'); closeModal(); } },
        { label: 'To library (top)',    action: () => { moveCard(card.instanceId, zone, 'library', 'top'); closeModal(); } },
        { label: 'To library (bottom)', action: () => { moveCard(card.instanceId, zone, 'library', 'bottom'); closeModal(); } },
      ]);
    });
  });

  // Click a card in the library reference list — context menu with tutor/preview options
  document.querySelectorAll('.lib-ref-card').forEach(el => {
    el.addEventListener('click', () => {
      const card = (myPrivate.library || []).find(c => c.name === el.dataset.name);
      if (!card) return;
      const rect = el.getBoundingClientRect();
      showContextMenu(rect.right, rect.top, [
        { header: card.name },
        { label: 'View card', icon: icon('scry', 14), action: () => showCardDetail(card) },
        'sep',
        { label: 'Add to hand (tutor)', icon: icon('deck', 14), action: () => {
            const lib = [...(myPrivate.library || [])];
            const idx = lib.indexOf(card);
            if (idx !== -1) lib.splice(idx, 1);
            const hand = [...(myPrivate.hand || []), card];
            myPrivate = { ...myPrivate, hand, library: lib };
            addLog(`${p.name || 'You'} tutored ${card.name} to hand`);
            commitMyPrivate();
            closeModal(); rerender();
          }
        },
      ]);
    });
  });
}

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

function wireKeyboard() {
  const handler = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'n' || e.key === 'N') endTurn();
    if (e.key === 'l' || e.key === 'L') { logOpen = !logOpen; rerender(); }
    if (e.key === 's' || e.key === 'S') showScryModal();
    if (e.key === 't' || e.key === 'T') showTokenModal();
    if (e.key === 'd' || e.key === 'D') drawCards(1);
    if (e.key === 'Escape') { closeModal(); }
  };
  window._gameKeyHandler && window.removeEventListener('keydown', window._gameKeyHandler);
  window._gameKeyHandler = handler;
  window.addEventListener('keydown', handler);
}
