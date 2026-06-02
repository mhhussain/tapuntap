// ============ Deck Library Screen ============
const { useState: useStateDL } = React;

function DeckLibrary({ onStartGame }) {
  const [decks, setDecks] = React.useState(SAMPLE_DECKS);
  const [selectedId, setSelectedId] = React.useState(SAMPLE_DECKS[0].id);
  const [search, setSearch] = React.useState('');
  const [colorFilter, setColorFilter] = React.useState([]);
  const [selectedCardId, setSelectedCardId] = React.useState(null);
  const [cardSearch, setCardSearch] = React.useState('');

  const selected = decks.find(d => d.id === selectedId);
  const selectedCard = selectedCardId ? cardById(selectedCardId) : null;

  const filteredDecks = decks.filter(d => {
    if (search && !d.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (colorFilter.length && !colorFilter.every(c => d.colors.includes(c))) return false;
    return true;
  });

  const filteredCards = SAMPLE_CARDS.filter(c =>
    !cardSearch || c.name.toLowerCase().includes(cardSearch.toLowerCase()) || c.type.toLowerCase().includes(cardSearch.toLowerCase())
  );

  const toggleColor = (c) => {
    setColorFilter(f => f.includes(c) ? f.filter(x => x !== c) : [...f, c]);
  };

  const addCardToDeck = (cardId) => {
    setDecks(ds => ds.map(d => {
      if (d.id !== selectedId) return d;
      const existing = d.cards.find(c => c.id === cardId);
      if (existing) {
        return {...d, cards: d.cards.map(c => c.id === cardId ? {...c, count: c.count + 1} : c), cardCount: d.cardCount + 1};
      }
      return {...d, cards: [...d.cards, {id: cardId, count: 1}], cardCount: d.cardCount + 1};
    }));
  };

  const removeCardFromDeck = (cardId) => {
    setDecks(ds => ds.map(d => {
      if (d.id !== selectedId) return d;
      const existing = d.cards.find(c => c.id === cardId);
      if (!existing) return d;
      if (existing.count <= 1) {
        return {...d, cards: d.cards.filter(c => c.id !== cardId), cardCount: d.cardCount - 1};
      }
      return {...d, cards: d.cards.map(c => c.id === cardId ? {...c, count: c.count - 1} : c), cardCount: d.cardCount - 1};
    }));
  };

  const colorBreakdown = useMemo(() => {
    if (!selected) return {};
    const totals = {W:0,U:0,B:0,R:0,G:0,C:0};
    selected.cards.forEach(({id, count}) => {
      const c = cardById(id);
      if (!c) return;
      if (c.colors.length === 0) totals.C += count;
      else c.colors.forEach(col => { totals[col] += count; });
    });
    return totals;
  }, [selected]);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Deck Library</div>
        <span className="topbar-sub">{decks.length} decks</span>
        <div className="topbar-spacer" />
        <button className="btn"><Icon name="import" size={14}/> Import</button>
        <button className="btn"><Icon name="export" size={14}/> Export</button>
        <button className="btn btn-primary"><Icon name="plus" size={14}/> New deck</button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '280px 1fr 320px', flex: 1, overflow: 'hidden'}}>

        {/* Left — deck list */}
        <aside style={{borderRight: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          <div style={{padding: 14, display:'flex', flexDirection:'column', gap: 10, borderBottom: '1px solid var(--line-1)'}}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search decks…" />
            <div style={{display:'flex', gap: 4}}>
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => toggleColor(c)}
                  className="btn btn-icon btn-sm"
                  style={{
                    padding: 0, width: 26, height: 26,
                    background: colorFilter.includes(c) ? `var(--mana-${c.toLowerCase()})` : 'var(--bg-2)',
                    borderColor: colorFilter.includes(c) ? `var(--mana-${c.toLowerCase()})` : 'var(--line-2)',
                  }}
                  title={`Filter ${c}`}
                >
                  <span style={{fontSize: 11, fontWeight: 700, color: colorFilter.includes(c) ? 'oklch(0.18 0 0)' : 'var(--fg-2)'}}>{c}</span>
                </button>
              ))}
              <div style={{flex: 1}}/>
              <button className="btn btn-sm">Sort: Modified</button>
            </div>
          </div>
          <div style={{flex: 1, overflowY: 'auto'}}>
            {filteredDecks.map(d => (
              <button
                key={d.id}
                onClick={() => setSelectedId(d.id)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '12px 14px',
                  background: d.id === selectedId ? 'var(--bg-2)' : 'transparent',
                  borderLeft: d.id === selectedId ? '2px solid var(--accent)' : '2px solid transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--line-1)',
                  cursor: 'pointer',
                }}
              >
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8}}>
                  <span style={{fontWeight: 600, color: d.id === selectedId ? 'var(--fg-0)' : 'var(--fg-1)'}}>{d.name}</span>
                  <ColorDots colors={d.colors} />
                </div>
                <div style={{display: 'flex', gap: 10, marginTop: 4, fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)'}}>
                  <span>{d.cardCount} cards</span>
                  <span>•</span>
                  <span>{Math.round(d.winRate * 100)}% wr</span>
                  <span>•</span>
                  <span>{d.modified}</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Center — deck details */}
        <main style={{display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          {!selected ? (
            <div className="empty"><div className="empty-title">No deck selected</div></div>
          ) : (
            <>
              {/* Deck header */}
              <div style={{padding: '20px 24px', borderBottom: '1px solid var(--line-1)'}}>
                <div style={{display:'flex', alignItems:'flex-start', gap: 16}}>
                  <div style={{flex: 1}}>
                    <div style={{display:'flex', alignItems:'center', gap: 8}}>
                      <ColorDots colors={selected.colors} size={12} />
                      <span className="eyebrow">{selected.archetype}</span>
                    </div>
                    <h1 style={{fontFamily: 'var(--font-serif)', fontSize: 36, fontStyle: 'italic', margin: '4px 0 8px', color: 'var(--fg-0)', fontWeight: 400}}>{selected.name}</h1>
                    <p style={{margin: 0, color: 'var(--fg-2)', maxWidth: 600}}>{selected.description}</p>
                  </div>
                  <div style={{display: 'flex', gap: 6}}>
                    <button className="btn btn-icon" title="Duplicate"><Icon name="duplicate" size={14}/></button>
                    <button className="btn btn-icon" title="Changelog"><Icon name="history" size={14}/></button>
                    <button className="btn btn-icon" title="Delete"><Icon name="trash" size={14}/></button>
                    <button className="btn btn-primary" onClick={onStartGame}>
                      <Icon name="play" size={12}/> Play with deck
                    </button>
                  </div>
                </div>

                {/* Stats row */}
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 20}}>
                  <Stat label="Card count" value={selected.cardCount}/>
                  <Stat label="Avg. mana cost" value={selected.avgCmc.toFixed(1)}/>
                  <Stat label="Win rate" value={`${Math.round(selected.winRate*100)}%`} sub={`${selected.games} games`}/>
                  <div>
                    <div className="eyebrow" style={{marginBottom: 6}}>Mana curve</div>
                    <ManaCurve deck={selected} />
                  </div>
                </div>
              </div>

              {/* Card list */}
              <div style={{flex: 1, overflowY: 'auto', padding: '16px 24px'}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12}}>
                  <div className="eyebrow">Decklist</div>
                  <div style={{display:'flex', gap: 16, fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)'}}>
                    {COLORS.map(c => colorBreakdown[c] ? (
                      <span key={c} style={{display:'flex', alignItems:'center', gap: 4}}>
                        <span className={`pip pip-${c.toLowerCase()}`} style={{width:8, height:8, fontSize:0, border:'none'}}/>
                        {colorBreakdown[c]}
                      </span>
                    ) : null)}
                  </div>
                </div>

                {selected.cards.length === 0 ? (
                  <div className="empty">
                    <div className="empty-icon"><Icon name="cards" size={20}/></div>
                    <div className="empty-title">An empty grimoire</div>
                    <div className="empty-body">Search for cards on the right and add them to this deck. <span className="muted">In production, the card pool comes from Scryfall — this prototype shows a small sample.</span></div>
                  </div>
                ) : (
                  <DeckCardList deck={selected} onRemove={removeCardFromDeck} onAdd={addCardToDeck} onSelectCard={setSelectedCardId} />
                )}

                {/* Changelog */}
                <div style={{marginTop: 24}}>
                  <div className="eyebrow" style={{marginBottom: 8}}>Version history</div>
                  <div style={{display:'flex', flexDirection:'column', gap: 6}}>
                    {selected.history.map((h, i) => (
                      <div key={i} style={{display:'flex', gap: 12, padding: '8px 12px', background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 6}}>
                        <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color: 'var(--fg-3)', minWidth: 60}}>{h.date}</span>
                        <span style={{fontSize: 13}}>{h.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </main>

        {/* Right — card search & details */}
        <aside style={{borderLeft: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', overflow: 'hidden'}}>
          {selectedCard ? (
            <CardDetail card={selectedCard} onClose={() => setSelectedCardId(null)} onAdd={() => addCardToDeck(selectedCard.id)} />
          ) : (
            <CardBrowser cards={filteredCards} search={cardSearch} setSearch={setCardSearch} onSelect={setSelectedCardId} onAdd={addCardToDeck} />
          )}
        </aside>
      </div>
    </>
  );
}

function Stat({label, value, sub}) {
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 4}}>{label}</div>
      <div style={{fontFamily:'var(--font-serif)', fontSize: 32, fontStyle:'italic', color: 'var(--fg-0)', lineHeight: 1}}>{value}</div>
      {sub && <div style={{fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', marginTop: 4}}>{sub}</div>}
    </div>
  );
}

function DeckCardList({deck, onRemove, onAdd, onSelectCard}) {
  const grouped = {};
  deck.cards.forEach(({id, count}) => {
    const c = cardById(id);
    if (!c) return;
    const grp = c.isLand ? 'Lands' : c.type.split(' ')[0] + 's';
    grouped[grp] = grouped[grp] || [];
    grouped[grp].push({card: c, count});
  });
  return (
    <div style={{display:'flex', flexDirection:'column', gap: 16}}>
      {Object.entries(grouped).map(([grp, items]) => (
        <div key={grp}>
          <div style={{display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom: 6}}>
            <span className="eyebrow">{grp}</span>
            <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>{items.reduce((s,i) => s+i.count, 0)}</span>
          </div>
          <div style={{display:'flex', flexDirection:'column', border:'1px solid var(--line-1)', borderRadius: 6, overflow:'hidden'}}>
            {items.map(({card, count}) => (
              <div key={card.id}
                onClick={() => onSelectCard(card.id)}
                style={{display:'flex', alignItems:'center', gap: 10, padding: '6px 10px', borderBottom:'1px solid var(--line-1)', cursor:'pointer'}}
                onMouseOver={e => e.currentTarget.style.background = 'var(--bg-2)'}
                onMouseOut={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{fontFamily:'var(--font-mono)', fontSize: 12, color:'var(--fg-2)', width: 20}}>{count}×</span>
                <span style={{flex:1, fontSize: 13}}>{card.name}</span>
                <CostPips cost={card.cost} />
                <button className="btn btn-ghost btn-icon btn-sm" onClick={e => {e.stopPropagation(); onRemove(card.id);}}><Icon name="minus" size={12}/></button>
                <button className="btn btn-ghost btn-icon btn-sm" onClick={e => {e.stopPropagation(); onAdd(card.id);}}><Icon name="plus" size={12}/></button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function CardBrowser({cards, search, setSearch, onSelect, onAdd}) {
  return (
    <>
      <div style={{padding: 14, borderBottom: '1px solid var(--line-1)'}}>
        <div className="eyebrow" style={{marginBottom: 8}}>Card search</div>
        <SearchInput value={search} onChange={setSearch} placeholder="Search by name or type…" />
        <div style={{fontSize: 11, color: 'var(--fg-3)', marginTop: 8, fontFamily: 'var(--font-mono)'}}>
          {cards.length} results · sample data
        </div>
      </div>
      <div style={{flex:1, overflowY:'auto', padding: 10, display:'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, alignContent: 'start'}}>
        {cards.map(c => (
          <button key={c.id}
            onClick={() => onSelect(c.id)}
            onDoubleClick={() => onAdd(c.id)}
            style={{
              display:'flex', flexDirection: 'column', gap: 4,
              padding: 8, border: '1px solid var(--line-1)', borderRadius: 6,
              background: 'var(--bg-2)', textAlign: 'left', cursor: 'pointer',
            }}
            onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--accent-line)'; }}
            onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--line-1)'; }}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap: 4}}>
              <ColorDots colors={c.colors} size={8}/>
              <CostPips cost={c.cost} />
            </div>
            <div style={{fontSize: 12, fontWeight: 600, color: 'var(--fg-0)', lineHeight: 1.2}}>{c.name}</div>
            <div style={{fontSize: 10, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', textTransform:'uppercase', letterSpacing: '0.05em'}}>{c.type}</div>
          </button>
        ))}
      </div>
      <div style={{padding: 10, borderTop: '1px solid var(--line-1)', fontSize: 11, color: 'var(--fg-3)', textAlign: 'center'}}>
        Double-click to add · Click for details
      </div>
    </>
  );
}

function CardDetail({card, onClose, onAdd}) {
  return (
    <>
      <div style={{padding: 14, borderBottom: '1px solid var(--line-1)', display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <span className="eyebrow">Card detail</span>
        <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}><Icon name="close" size={14}/></button>
      </div>
      <div style={{flex:1, overflowY:'auto', padding: 20}}>
        <div style={{display:'grid', placeItems:'center', marginBottom: 16}}>
          <CardFace card={card} draggable={false} style={{ width: 180, height: 250 }} />
        </div>
        <div style={{fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize: 22, color:'var(--fg-0)', marginBottom: 4}}>{card.name}</div>
        <div style={{display:'flex', alignItems:'center', gap: 8, marginBottom: 12}}>
          <CostPips cost={card.cost} />
          <span style={{fontSize: 11, color:'var(--fg-3)', fontFamily:'var(--font-mono)', textTransform:'uppercase'}}>CMC {totalCmc(card.cost)}</span>
        </div>
        <div style={{fontSize: 13, color:'var(--fg-2)', marginBottom: 12, paddingBottom: 12, borderBottom:'1px solid var(--line-1)'}}>{card.type}</div>
        <div style={{fontSize: 13, color:'var(--fg-2)', lineHeight: 1.6, fontStyle: 'italic'}}>
          {card.abil || <span className="muted">Card text would render here from Scryfall data.</span>}
        </div>
        {card.pt && (
          <div style={{marginTop: 16, fontFamily:'var(--font-mono)', fontSize: 14, color:'var(--fg-0)'}}>
            <span className="eyebrow" style={{marginRight: 8}}>P/T</span> {card.pt}
          </div>
        )}
        <button className="btn btn-primary" style={{width:'100%', marginTop: 20, justifyContent:'center'}} onClick={onAdd}>
          <Icon name="plus" size={14}/> Add to deck
        </button>
      </div>
    </>
  );
}

window.DeckLibrary = DeckLibrary;
