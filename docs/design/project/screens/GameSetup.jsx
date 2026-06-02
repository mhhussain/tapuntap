// ============ Game Setup Screen ============

function GameSetup({onStart, onBack}) {
  const [playerCount, setPlayerCount] = React.useState(2);
  const [players, setPlayers] = React.useState([
    {name: 'Player 1', deckId: 'd1'},
    {name: 'Player 2', deckId: 'd2'},
    {name: 'Player 3', deckId: ''},
    {name: 'Player 4', deckId: ''},
  ]);
  const [lifeTotal, setLifeTotal] = React.useState(20);
  const [handSize, setHandSize] = React.useState(7);
  const [format, setFormat] = React.useState('Standard');

  const updatePlayer = (i, patch) => {
    setPlayers(ps => ps.map((p, idx) => idx === i ? {...p, ...patch} : p));
  };

  const canStart = players.slice(0, playerCount).every(p => p.deckId);

  return (
    <>
      <div className="topbar">
        <button className="btn btn-ghost" onClick={onBack}><Icon name="prev" size={14}/> Back</button>
        <div className="topbar-title">New Game</div>
        <div className="topbar-spacer"/>
      </div>

      <div style={{flex: 1, overflowY: 'auto', display: 'grid', placeItems: 'start center', padding: '32px 20px'}}>
        <div style={{maxWidth: 880, width: '100%', display: 'flex', flexDirection: 'column', gap: 24}}>

          {/* Step 1 — players */}
          <Section step="1" title="Players" subtitle="How many seats at the table?">
            <div style={{display:'flex', gap: 8}}>
              {[2,3,4,5,6].map(n => (
                <button key={n}
                  onClick={() => setPlayerCount(n)}
                  className="btn"
                  style={{
                    flex: 1, justifyContent: 'center', padding: '14px 0',
                    fontFamily: 'var(--font-serif)', fontSize: 24, fontStyle: 'italic',
                    background: playerCount === n ? 'var(--accent-soft)' : 'var(--bg-2)',
                    borderColor: playerCount === n ? 'var(--accent)' : 'var(--line-2)',
                    color: playerCount === n ? 'var(--accent)' : 'var(--fg-1)',
                  }}>
                  {n}
                </button>
              ))}
            </div>
          </Section>

          {/* Step 2 — assign decks */}
          <Section step="2" title="Deck Assignment" subtitle="Pick a deck for each seat.">
            <div style={{display:'flex', flexDirection:'column', gap: 10}}>
              {players.slice(0, playerCount).map((p, i) => (
                <PlayerSetupRow
                  key={i}
                  index={i}
                  player={p}
                  onChange={patch => updatePlayer(i, patch)}
                />
              ))}
            </div>
          </Section>

          {/* Step 3 — settings */}
          <Section step="3" title="Game Settings" subtitle="Optional rule tweaks.">
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16}}>
              <Field label="Starting life">
                <div style={{display:'flex', alignItems:'center', gap: 8}}>
                  <button className="btn btn-icon btn-sm" onClick={() => setLifeTotal(v => Math.max(1, v - 5))}>−</button>
                  <input className="input" style={{textAlign:'center', fontFamily:'var(--font-mono)'}} type="number" value={lifeTotal} onChange={e => setLifeTotal(parseInt(e.target.value) || 0)}/>
                  <button className="btn btn-icon btn-sm" onClick={() => setLifeTotal(v => v + 5)}>+</button>
                </div>
              </Field>
              <Field label="Starting hand">
                <input className="input" style={{textAlign:'center', fontFamily:'var(--font-mono)'}} type="number" value={handSize} onChange={e => setHandSize(parseInt(e.target.value) || 0)}/>
              </Field>
              <Field label="Format">
                <select className="input" value={format} onChange={e => setFormat(e.target.value)}>
                  <option>Standard</option>
                  <option>Modern</option>
                  <option>Commander</option>
                  <option>Legacy</option>
                  <option>Casual</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* Confirm */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between',
            padding: '16px 20px',
            background: 'var(--bg-2)',
            border: '1px solid var(--line-2)',
            borderRadius: 10,
          }}>
            <div>
              <div className="eyebrow">Ready to begin</div>
              <div style={{fontSize: 13, color:'var(--fg-2)', marginTop: 4}}>
                {playerCount} players · {format} · {lifeTotal} life · {handSize}-card opening hand
              </div>
            </div>
            <button className="btn btn-primary" disabled={!canStart} onClick={onStart}
              style={{padding: '10px 20px', fontSize: 14, opacity: canStart ? 1 : 0.5}}>
              Start game <Icon name="arrow-right" size={14}/>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function Section({step, title, subtitle, children}) {
  return (
    <section style={{display:'flex', gap: 24}}>
      <div style={{minWidth: 80}}>
        <div style={{
          fontFamily:'var(--font-serif)',
          fontStyle:'italic',
          fontSize: 48,
          color: 'var(--accent)',
          lineHeight: 1,
        }}>{step}</div>
      </div>
      <div style={{flex: 1}}>
        <h2 style={{fontFamily:'var(--font-serif)', fontStyle:'italic', fontWeight: 400, fontSize: 22, color:'var(--fg-0)', margin: '6px 0 2px'}}>{title}</h2>
        <p style={{margin: '0 0 14px', fontSize: 13, color: 'var(--fg-3)'}}>{subtitle}</p>
        {children}
      </div>
    </section>
  );
}

function Field({label, children}) {
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 6}}>{label}</div>
      {children}
    </div>
  );
}

function PlayerSetupRow({index, player, onChange}) {
  const deck = SAMPLE_DECKS.find(d => d.id === player.deckId);
  return (
    <div style={{
      display:'grid', gridTemplateColumns: '40px 200px 1fr', gap: 12, alignItems: 'center',
      padding: 12,
      background: 'var(--bg-1)',
      border: '1px solid var(--line-1)',
      borderRadius: 8,
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: 6,
        background: 'var(--bg-3)',
        display:'grid', placeItems:'center',
        fontFamily:'var(--font-mono)', fontSize: 12, color: 'var(--fg-2)',
      }}>P{index + 1}</div>
      <input className="input" value={player.name} onChange={e => onChange({name: e.target.value})}/>
      <div style={{display:'flex', gap: 8, alignItems:'center'}}>
        <select className="input" value={player.deckId} onChange={e => onChange({deckId: e.target.value})} style={{flex: 1}}>
          <option value="">— Select a deck —</option>
          {SAMPLE_DECKS.map(d => <option key={d.id} value={d.id}>{d.name} ({d.colors.join('')})</option>)}
        </select>
        {deck && (
          <div style={{display:'flex', alignItems:'center', gap: 8, padding: '4px 10px', background:'var(--bg-2)', borderRadius: 5, border:'1px solid var(--line-1)'}}>
            <ColorDots colors={deck.colors}/>
            <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>{deck.cardCount}</span>
          </div>
        )}
      </div>
    </div>
  );
}

window.GameSetup = GameSetup;
