// ─── Color helpers ────────────────────────────────────────────────────────────

const MANA_CSS = { W: '--mana-w', U: '--mana-u', B: '--mana-b', R: '--mana-r', G: '--mana-g', C: '--mana-c' };

export function colorTone(colors) {
  if (!colors || colors.length === 0) return 'var(--mana-c)';
  if (colors.length === 1) return `var(--mana-${colors[0].toLowerCase()})`;
  return `linear-gradient(135deg, ${colors.map(c => `var(--mana-${c.toLowerCase()})`).join(', ')})`;
}

export function isLand(typeLine = '') {
  return /\bland\b/i.test(typeLine);
}

// ─── Card image URI ───────────────────────────────────────────────────────────

export function extractImageUri(card) {
  if (card.image_uris) return card.image_uris.normal || card.image_uris.large;
  if (card.card_faces?.[0]?.image_uris) return card.card_faces[0].image_uris.normal;
  return null;
}

export function extractBackImageUri(card) {
  if (card.card_faces?.[1]?.image_uris) return card.card_faces[1].image_uris.normal;
  return null;
}

export function cardFromScryfall(card) {
  return {
    cardId: card.id,
    name: card.name,
    manaCost: card.mana_cost || card.card_faces?.[0]?.mana_cost || '',
    cmc: card.cmc || 0,
    typeLine: card.type_line || '',
    colors: card.colors || card.card_faces?.[0]?.colors || [],
    colorIdentity: card.color_identity || [],
    imageUri: extractImageUri(card),
    imageUriBack: extractBackImageUri(card),
    power: card.power ?? null,
    toughness: card.toughness ?? null,
    loyalty: card.loyalty ?? null,
    rarity: card.rarity || '',
    setCode: card.set || '',
    quantity: 1
  };
}

// ─── Mana cost rendering ──────────────────────────────────────────────────────

export function renderManaCost(cost) {
  if (!cost) return '';
  const syms = cost.match(/\{[^}]+\}/g) || [];
  return '<span class="pip-row">' + syms.map(sym => {
    const inner = sym.slice(1, -1);
    const key = inner.length === 1 && MANA_CSS[inner] ? inner.toLowerCase() : (inner.match(/^\d+$/) ? 'c' : 'c');
    const label = inner.match(/^\d+$/) ? inner : inner.length === 1 ? '' : inner;
    return `<span class="pip pip-${key} pip-sm">${label}</span>`;
  }).join('') + '</span>';
}

// ─── Abstract card face (battlefield) ────────────────────────────────────────

export function renderCardFace(card, opts = {}) {
  const { tapped = false, sick = false, counter = null, token = false, selected = false, dragData = null } = opts;
  const tone = colorTone(card.colors);
  const land = isLand(card.typeLine);
  const classes = ['card-face', tapped ? 'tapped' : '', sick ? 'summoning-sick' : '', land ? 'is-land' : '', selected ? 'selected' : ''].filter(Boolean).join(' ');
  const dd = dragData ? `draggable="true" data-drag='${JSON.stringify(dragData)}'` : '';

  const body = card.imageUri
    ? `<img class="card-img-fill" src="${esc(card.imageUri)}" alt="${esc(card.name)}" loading="lazy" onerror="this.remove()">`
    : `<div class="card-name">${esc(card.name)}</div>
       <div class="card-art"></div>
       <div class="card-foot">
         <span></span>
         ${card.power != null ? `<span class="card-pt">${card.power}/${card.toughness}</span>` : ''}
       </div>`;

  return `
    <div class="${classes}" style="--card-tone:${tone}" data-iid="${card.instanceId || ''}" ${dd} title="${esc(card.name)}${card.power != null ? ' • '+card.power+'/'+card.toughness : ''}">
      <div class="card-color-bar" style="background:${tone}"></div>
      ${body}
      ${counter != null && counter !== 0 ? `<div class="card-counter">+${counter}</div>` : ''}
      ${token ? `<div class="card-token-badge">TKN</div>` : ''}
      ${renderCounterBadges(card.counters || {})}
    </div>
  `;
}

function renderCounterBadges(counters) {
  return Object.entries(counters)
    .filter(([, v]) => v && v !== 0)
    .map(([k, v]) => `<div class="card-counter" title="${k}">${k}:${v}</div>`)
    .join('');
}

// ─── SVG icons ────────────────────────────────────────────────────────────────

export function icon(name, size = 16) {
  const s = size;
  const a = `width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"`;
  const icons = {
    search:    `<svg ${a}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>`,
    plus:      `<svg ${a}><path d="M12 5v14M5 12h14"/></svg>`,
    minus:     `<svg ${a}><path d="M5 12h14"/></svg>`,
    close:     `<svg ${a}><path d="M6 6l12 12M18 6L6 18"/></svg>`,
    trash:     `<svg ${a}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg>`,
    history:   `<svg ${a}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>`,
    next:      `<svg ${a}><path d="M5 12h14M13 6l6 6-6 6"/></svg>`,
    prev:      `<svg ${a}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>`,
    save:      `<svg ${a}><path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h8V3M8 21v-7h8v7"/></svg>`,
    undo:      `<svg ${a}><path d="M3 7l4-4M3 7l4 4M3 7h11a6 6 0 0 1 0 12h-3"/></svg>`,
    graveyard: `<svg ${a}><path d="M6 20V10a6 6 0 0 1 12 0v10"/><path d="M3 20h18M9 14h6M9 17h6"/></svg>`,
    exile:     `<svg ${a}><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>`,
    deck:      `<svg ${a}><rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 3v18M15 3v18"/></svg>`,
    scry:      `<svg ${a}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
    token:     `<svg ${a}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></svg>`,
    note:      `<svg ${a}><path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>`,
    check:     `<svg ${a}><path d="M5 12l5 5 9-13"/></svg>`,
    edit:      `<svg ${a}><path d="M11 4H4a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M18.5 2.5a2 2 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>`,
    duplicate: `<svg ${a}><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>`,
    arrow_right:`<svg ${a}><path d="M5 12h14M13 5l7 7-7 7"/></svg>`,
  };
  return icons[name] || `<svg ${a}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>`;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

export function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = `toast${type ? ' ' + type : ''}`;
  el.textContent = msg;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function showModal({ title, body, footer, width, onClose } = {}) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  document.getElementById('modal-title').textContent = title || '';
  document.getElementById('modal-content').innerHTML = body || '';
  const footerEl = document.getElementById('modal-footer');
  if (footer) { footerEl.innerHTML = footer; footerEl.classList.remove('hidden'); }
  else footerEl.classList.add('hidden');
  if (width) box.style.width = width; else box.style.width = '';
  overlay.classList.remove('hidden');

  const close = () => {
    overlay.classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
    footerEl.innerHTML = ''; footerEl.classList.add('hidden');
    if (onClose) onClose();
  };
  document.getElementById('modal-close').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  const onKey = (e) => { if (e.key === 'Escape') { close(); window.removeEventListener('keydown', onKey); } };
  window.addEventListener('keydown', onKey);
  return close;
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.getElementById('modal-content').innerHTML = '';
}

// ─── Context menu ─────────────────────────────────────────────────────────────

let _ctxMenu = null;

export function showContextMenu(x, y, items) {
  removeContextMenu();
  const menu = document.createElement('div');
  menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:500;background:var(--bg-2);border:1px solid var(--line-3);border-radius:6px;box-shadow:var(--shadow-2);min-width:190px;overflow-y:auto;max-height:calc(100vh - 24px)`;

  for (const item of items) {
    if (item === 'sep') {
      const s = document.createElement('div');
      s.style.cssText = 'height:1px;background:var(--line-1);margin:3px 0';
      menu.appendChild(s);
    } else if (item.header) {
      const h = document.createElement('div');
      h.style.cssText = 'padding:6px 12px 2px;font-size:10px;text-transform:uppercase;letter-spacing:0.1em;color:var(--fg-4);font-weight:600';
      h.textContent = item.header;
      menu.appendChild(h);
    } else {
      const el = document.createElement('button');
      el.style.cssText = `display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:transparent;border:none;color:${item.danger ? 'var(--bad)' : 'var(--fg-1)'};font-size:13px;text-align:left;transition:background 80ms`;
      el.innerHTML = `${item.icon ? item.icon + ' ' : ''}${item.label}`;
      el.onmouseover = () => el.style.background = 'var(--bg-3)';
      el.onmouseout  = () => el.style.background = 'transparent';
      el.onclick = () => { removeContextMenu(); item.action(); };
      menu.appendChild(el);
    }
  }

  document.body.appendChild(menu);
  _ctxMenu = menu;

  const rect = menu.getBoundingClientRect();
  let left = x, top = y;
  if (left + rect.width  > window.innerWidth)  left = x - rect.width;
  if (top  + rect.height > window.innerHeight) top  = y - rect.height;
  menu.style.left = `${Math.max(4, left)}px`;
  menu.style.top  = `${Math.max(4, top)}px`;

  setTimeout(() => document.addEventListener('click', removeContextMenu, { once: true }), 0);
}

export function removeContextMenu() {
  if (_ctxMenu) { _ctxMenu.remove(); _ctxMenu = null; }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
