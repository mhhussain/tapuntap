// ============ Shared components ============
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// --- Icon (inline SVG, original simple shapes) ---
function Icon({ name, size = 16 }) {
  const s = size;
  const stroke = 'currentColor';
  const sw = 1.5;
  const common = { width: s, height: s, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: sw, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'library': return <svg {...common}><rect x="4" y="4" width="4" height="16"/><rect x="10" y="4" width="4" height="16"/><rect x="16" y="6" width="4" height="14"/></svg>;
    case 'games':   return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/></svg>;
    case 'play':    return <svg {...common}><polygon points="6,4 20,12 6,20" fill="currentColor" stroke="none"/></svg>;
    case 'settings':return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.2 4.2l2.8 2.8M17 17l2.8 2.8M1 12h4M19 12h4M4.2 19.8l2.8-2.8M17 7l2.8-2.8"/></svg>;
    case 'search':  return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>;
    case 'plus':    return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'minus':   return <svg {...common}><path d="M5 12h14"/></svg>;
    case 'close':   return <svg {...common}><path d="M6 6l12 12M18 6L6 18"/></svg>;
    case 'more':    return <svg {...common}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg>;
    case 'duplicate': return <svg {...common}><rect x="8" y="8" width="12" height="12" rx="1"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>;
    case 'trash':   return <svg {...common}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 6"/></svg>;
    case 'export':  return <svg {...common}><path d="M12 3v12M7 8l5-5 5 5M5 21h14"/></svg>;
    case 'import':  return <svg {...common}><path d="M12 21V9M7 14l5 5 5-5M5 3h14"/></svg>;
    case 'history': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>;
    case 'check':   return <svg {...common}><path d="M5 12l5 5 9-13"/></svg>;
    case 'arrow-right': return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'tap':     return <svg {...common}><path d="M12 3l3 5h-2v6h2l-3 5-3-5h2V8h-2l3-5"/></svg>;
    case 'cards':   return <svg {...common}><rect x="3" y="6" width="13" height="14" rx="1"/><path d="M8 3h13v14"/></svg>;
    case 'dots-grid': return <svg {...common}><circle cx="6" cy="6" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="18" cy="6" r="1"/><circle cx="6" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="18" cy="12" r="1"/><circle cx="6" cy="18" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="18" cy="18" r="1"/></svg>;
    case 'graveyard': return <svg {...common}><path d="M6 20V10a6 6 0 0 1 12 0v10"/><path d="M3 20h18M9 14h6M9 17h6"/></svg>;
    case 'exile':   return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M5 5l14 14"/></svg>;
    case 'deck':    return <svg {...common}><rect x="6" y="3" width="12" height="18" rx="1"/><path d="M9 3v18M15 3v18"/></svg>;
    case 'token':   return <svg {...common}><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/></svg>;
    case 'scry':    return <svg {...common}><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'note':    return <svg {...common}><path d="M5 4h11l4 4v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M9 10h6M9 14h6M9 18h4"/></svg>;
    case 'next':    return <svg {...common}><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
    case 'prev':    return <svg {...common}><path d="M19 12H5M11 6l-6 6 6 6"/></svg>;
    case 'save':    return <svg {...common}><path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8 3v5h8V3M8 21v-7h8v7"/></svg>;
    case 'undo':    return <svg {...common}><path d="M3 7l4-4M3 7l4 4M3 7h11a6 6 0 0 1 0 12h-3"/></svg>;
    case 'sun':     return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>;
    default: return <svg {...common}><rect x="3" y="3" width="18" height="18" rx="2"/></svg>;
  }
}

// --- Mana pip ---
function Pip({ kind, n }) {
  const sym = n != null ? n : (kind === 'n' ? '?' : kind.toUpperCase());
  return <span className={`pip pip-${kind}`}>{sym}</span>;
}

function CostPips({ cost, size = 'sm' }) {
  if (!cost || cost.length === 0) return null;
  const pips = [];
  cost.forEach((c, i) => {
    if (c.n) pips.push(<span key={`n${i}`} className="pip pip-c">{c.n}</span>);
    Object.keys(c).filter(k => k !== 'n' && c[k]).forEach((k, j) => {
      pips.push(<Pip key={`${k}${i}${j}`} kind={k} />);
    });
  });
  return <span className="pip-row">{pips}</span>;
}

// --- Color identity dots (for deck cards / lists) ---
function ColorDots({ colors, size = 10 }) {
  if (!colors || colors.length === 0) {
    return <span className="pip pip-c" style={{width: size, height: size}}/>;
  }
  return (
    <span style={{display: 'inline-flex', gap: 2}}>
      {colors.map(c => (
        <span key={c} className={`pip pip-${c.toLowerCase()}`} style={{width: size, height: size, fontSize: 0, border: '1px solid oklch(0 0 0 / 0.3)'}} />
      ))}
    </span>
  );
}

// --- Abstract card ---
function CardFace({ card, tapped, sick, counter, onClick, draggable = true, style, dragData }) {
  const tone = colorTone(card.colors);
  const handleDragStart = (e) => {
    if (!draggable) return;
    e.dataTransfer.setData('application/json', JSON.stringify(dragData || { cardId: card.id }));
    e.dataTransfer.effectAllowed = 'move';
  };
  return (
    <div
      className={`card ${tapped ? 'tapped' : ''} ${sick ? 'summoning-sick' : ''} ${card.isLand ? 'is-land' : ''}`}
      style={{ '--card-tone': tone, ...style }}
      onClick={onClick}
      draggable={draggable}
      onDragStart={handleDragStart}
      title={`${card.name}${card.pt ? ' • '+card.pt : ''}`}
    >
      <div className="card-color-bar" style={{ background: tone }} />
      <div className="card-name">{card.name}</div>
      <div className="card-art" />
      <div className="card-foot">
        <span className="card-cost">
          <CostPips cost={card.cost} />
        </span>
        {card.pt && <span className="card-pt">{card.pt}</span>}
      </div>
      {counter != null && counter !== 0 && (
        <div className="card-counter">+{counter}</div>
      )}
    </div>
  );
}

// --- Search input ---
function SearchInput({ value, onChange, placeholder, style }) {
  return (
    <div className="search" style={style}>
      <Icon name="search" size={14} />
      <input className="input" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

// --- Modal ---
function Modal({ title, onClose, children, footer, width }) {
  useEffect(() => {
    const onKey = e => e.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{width}} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="close" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// --- Mana curve mini-chart ---
function ManaCurve({ deck }) {
  const buckets = [0,0,0,0,0,0,0,0]; // 0..6, 7+
  deck.cards.forEach(({id, count}) => {
    const c = cardById(id);
    if (!c || c.isLand) return;
    const cmc = totalCmc(c.cost);
    const idx = Math.min(cmc, 7);
    buckets[idx] += count;
  });
  const max = Math.max(...buckets, 1);
  return (
    <div style={{display:'flex', alignItems:'flex-end', gap: 4, height: 56}}>
      {buckets.map((v, i) => (
        <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap: 4}}>
          <div style={{
            width:'100%',
            height: `${(v/max)*44}px`,
            background: v ? 'var(--accent)' : 'var(--bg-3)',
            opacity: v ? 0.85 : 0.5,
            borderRadius: 2,
            transition: 'height 200ms'
          }}/>
          <span style={{fontSize: 9, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)'}}>
            {i === 7 ? '7+' : i}
          </span>
        </div>
      ))}
    </div>
  );
}

// --- Avatar (color-gradient initial) ---
function Avatar({ name, colors, size = 36, ring }) {
  const grad = (colors && colors.length)
    ? `linear-gradient(135deg, ${colors.map(c => `var(--mana-${c.toLowerCase()})`).join(',')})`
    : 'linear-gradient(135deg, var(--bg-4), var(--bg-3))';
  return (
    <div style={{
      width: size, height: size, borderRadius: size * 0.22,
      background: grad,
      display: 'grid', placeItems: 'center',
      fontFamily: 'var(--font-serif)', fontStyle: 'italic',
      fontSize: size * 0.46, color: 'oklch(0.18 0.015 250)',
      border: '1px solid oklch(0 0 0 / 0.3)',
      boxShadow: ring ? '0 0 0 2px var(--accent)' : 'var(--shadow-1)',
      flexShrink: 0,
    }}>{(name || '?')[0].toUpperCase()}</div>
  );
}

// --- Spinner ---
function Spinner({ size = 20 }) {
  return (
    <span style={{
      width: size, height: size,
      borderRadius: '50%',
      border: `2px solid var(--line-2)`,
      borderTopColor: 'var(--accent)',
      display: 'inline-block',
      animation: 'spin 0.7s linear infinite',
    }}/>
  );
}

// --- Wordmark ---
function Wordmark({ size = 28 }) {
  return (
    <span style={{display:'inline-flex', alignItems:'center', gap: 8}}>
      <span style={{
        width: size, height: size, borderRadius: size*0.28,
        background: 'radial-gradient(circle at 30% 28%, var(--accent) 0%, transparent 62%), linear-gradient(135deg, var(--bg-3), var(--bg-2))',
        border: '1px solid var(--accent-line)',
        display:'grid', placeItems:'center', flexShrink: 0,
      }}>
        <span style={{color:'var(--accent)', transform:'rotate(0deg)'}}><Icon name="tap" size={size*0.5}/></span>
      </span>
      <span style={{fontFamily:'var(--font-mono)', fontWeight: 700, fontSize: size*0.6, letterSpacing:'-0.02em', color:'var(--fg-0)'}}>
        tap<span style={{color:'var(--accent)'}}>untap</span>
      </span>
    </span>
  );
}

Object.assign(window, {
  Icon, Pip, CostPips, ColorDots, CardFace, SearchInput, Modal, ManaCurve, Avatar, Spinner, Wordmark
});
