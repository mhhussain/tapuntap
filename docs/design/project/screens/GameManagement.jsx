// ============ Game Management Screen ============
// Lifecycle-aware list: lobby (waiting) · active (in progress) · complete (archived).

function GameManagement({ onResume, onNewGame, onOpenLobby, onViewSummary }) {
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState('all'); // all | lobby | active | complete

  const games = SAMPLE_GAMES.filter(g => {
    if (filter !== 'all' && g.status !== filter) return false;
    if (search && !g.title.toLowerCase().includes(search.toLowerCase()) &&
        !g.players.some(p => p.deck.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const counts = {
    all: SAMPLE_GAMES.length,
    lobby: SAMPLE_GAMES.filter(g => g.status === 'lobby').length,
    active: SAMPLE_GAMES.filter(g => g.status === 'active').length,
    complete: SAMPLE_GAMES.filter(g => g.status === 'complete').length,
  };

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Games</div>
        <span className="topbar-sub">{games.length} sessions</span>
        <div className="topbar-spacer" />
        <button className="btn"><Icon name="export" size={14}/> Export history</button>
        <button className="btn btn-primary" onClick={onNewGame}><Icon name="plus" size={14}/> New game</button>
      </div>

      <div style={{padding: '20px 32px', flex: 1, overflowY: 'auto'}}>
        {/* Filter bar */}
        <div style={{display:'flex', gap: 12, alignItems:'center', marginBottom: 20}}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by title or deck…" style={{maxWidth: 360, flex: 1}}/>
          <div style={{display:'flex', gap: 0, border:'1px solid var(--line-2)', borderRadius: 6, overflow:'hidden'}}>
            {['all', 'lobby', 'active', 'complete'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px', border:'none', display:'flex', alignItems:'center', gap: 6,
                  background: filter === f ? 'var(--bg-3)' : 'var(--bg-1)',
                  color: filter === f ? 'var(--fg-0)' : 'var(--fg-3)',
                  fontSize: 12, textTransform: 'capitalize', fontWeight: 500,
                }}>
                {f}
                <span style={{fontFamily:'var(--font-mono)', fontSize: 10, color: filter === f ? 'var(--accent)' : 'var(--fg-4)'}}>{counts[f]}</span>
              </button>
            ))}
          </div>
          <div style={{flex: 1}}/>
          <span style={{fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)'}}>SORT: LAST PLAYED ↓</span>
        </div>

        {games.length === 0 ? (
          <div className="empty" style={{paddingTop: 80}}>
            <div className="empty-icon"><Icon name="games" size={20}/></div>
            <div className="empty-title">No games here</div>
            <div className="empty-body">Nothing matches this filter. Start a new table to get playing.</div>
            <button className="btn btn-primary" style={{marginTop: 6}} onClick={onNewGame}><Icon name="plus" size={14}/> New game</button>
          </div>
        ) : (
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(380px, 1fr))', gap: 16}}>
            {games.map(g => (
              <GameCard key={g.id} game={g}
                onResume={() => onResume(g.id)}
                onOpenLobby={() => onOpenLobby(g.id)}
                onViewSummary={() => onViewSummary(g.id)} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// Per-status visual config
const STATUS_META = {
  lobby:    { label: '● Lobby',    cls: 'tag-warn', accent: 'var(--warn)' },
  active:   { label: '● Live',     cls: 'tag-good', accent: 'var(--good)' },
  complete: { label: 'Complete',   cls: '',          accent: 'var(--fg-3)' },
};

function GameCard({ game, onResume, onOpenLobby, onViewSummary }) {
  const meta = STATUS_META[game.status] || STATUS_META.active;
  const players = game.status === 'complete' && game.finalStandings ? game.finalStandings : game.players;

  return (
    <div style={{
      border: '1px solid var(--line-1)', borderRadius: 10, background: 'var(--bg-1)',
      overflow: 'hidden', transition: 'border-color 120ms',
      opacity: game.status === 'complete' ? 0.92 : 1,
    }}
    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--line-2)'; }}
    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--line-1)'; }}>

      {/* Status accent strip */}
      <div style={{height: 2, background: meta.accent, opacity: game.status === 'complete' ? 0.3 : 0.8}}/>

      <div style={{padding: '14px 16px 12px', borderBottom: '1px solid var(--line-1)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap: 12}}>
        <div style={{flex: 1, minWidth:0}}>
          <div style={{display:'flex', alignItems:'center', gap: 8, flexWrap:'wrap'}}>
            <span className={`tag ${meta.cls}`} style={{textTransform:'uppercase'}}>{meta.label}</span>
            <span style={{fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)'}}>{game.format}</span>
            {game.status === 'active' && <span style={{fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)'}}>· Turn {game.turn}</span>}
          </div>
          <h3 style={{margin: '6px 0 0', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 400, color: 'var(--fg-0)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
            {game.title}
          </h3>
        </div>
        <button className="btn btn-ghost btn-icon"><Icon name="more"/></button>
      </div>

      {/* LOBBY: invite code banner */}
      {game.status === 'lobby' && (
        <div style={{padding:'12px 16px', borderBottom:'1px solid var(--line-1)', display:'flex', alignItems:'center', justifyContent:'space-between', gap: 12, background:'var(--accent-soft)'}}>
          <div>
            <div className="eyebrow" style={{fontSize: 9}}>Invite code</div>
            <div style={{fontFamily:'var(--font-mono)', fontSize: 18, fontWeight: 700, letterSpacing:'0.05em', color:'var(--fg-0)', marginTop: 2}}>{game.inviteCode}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:'var(--font-mono)', fontSize: 13, color:'var(--fg-1)'}}>{game.seatsFilled}/{game.seatsTotal}</div>
            <div style={{fontSize: 9, color:'var(--fg-3)', textTransform:'uppercase', letterSpacing:'0.08em'}}>seated</div>
          </div>
        </div>
      )}

      <div style={{padding: 16}}>
        <div className="eyebrow" style={{marginBottom: 8}}>
          {game.status === 'complete' ? 'Final standings' : `${players.length} Players`}
        </div>
        <div style={{display:'flex', flexDirection:'column', gap: 6, marginBottom: 14}}>
          {players.map((p, i) => {
            const isWinner = game.status === 'complete' && p.name === game.winner;
            const onTurn = game.status === 'active' && i === game.activePlayer;
            const isReady = game.status === 'lobby' && p.ready;
            return (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap: 10, padding: '6px 10px',
                background: isWinner ? 'var(--accent-soft)' : onTurn ? 'var(--accent-soft)' : 'var(--bg-2)',
                borderRadius: 5,
                border: (isWinner || onTurn) ? '1px solid var(--accent-line)' : '1px solid transparent',
              }}>
                <ColorDots colors={p.colors} size={10}/>
                <span style={{fontWeight: 500, fontSize: 13, minWidth: 56, color: 'var(--fg-1)'}}>{p.name}</span>
                <span style={{fontSize: 12, color: 'var(--fg-3)', flex: 1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.deck}</span>
                {onTurn && <span style={{fontSize: 10, fontFamily:'var(--font-mono)', color:'var(--accent)', textTransform:'uppercase'}}>On turn</span>}
                {game.status === 'lobby' && (
                  <span style={{fontSize: 10, fontFamily:'var(--font-mono)', textTransform:'uppercase', color: isReady ? 'var(--good)' : 'var(--warn)'}}>
                    {isReady ? 'Ready' : 'Waiting'}
                  </span>
                )}
                {game.status === 'complete' && (
                  <span style={{display:'flex', alignItems:'center', gap: 6}}>
                    {isWinner && <span style={{color:'var(--accent)'}}><Trophy size={13}/></span>}
                    <span style={{fontFamily:'var(--font-mono)', fontSize: 12, color: p.life > 0 ? 'var(--fg-1)' : 'var(--fg-4)'}}>{p.life} life</span>
                  </span>
                )}
              </div>
            );
          })}
          {game.status === 'lobby' && game.seatsFilled < game.seatsTotal && (
            <div style={{display:'flex', alignItems:'center', gap: 10, padding:'6px 10px', borderRadius: 5, border:'1px dashed var(--line-2)', color:'var(--fg-4)', fontSize: 12}}>
              <Icon name="plus" size={12}/> {game.seatsTotal - game.seatsFilled} open seat{game.seatsTotal - game.seatsFilled > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div style={{display:'flex', gap: 16, fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', marginBottom: 14, paddingTop: 12, borderTop: '1px solid var(--line-1)'}}>
          <div>
            <div style={{textTransform:'uppercase', letterSpacing:'0.08em', fontSize: 9}}>Created</div>
            <div style={{color:'var(--fg-2)', marginTop: 2}}>{game.created}</div>
          </div>
          <div>
            <div style={{textTransform:'uppercase', letterSpacing:'0.08em', fontSize: 9}}>{game.status === 'complete' ? 'Finished' : 'Last played'}</div>
            <div style={{color:'var(--fg-2)', marginTop: 2}}>{game.lastPlayed}</div>
          </div>
        </div>

        {/* Status-specific CTA */}
        <div style={{display:'flex', gap: 8}}>
          {game.status === 'lobby' && (
            <button className="btn btn-primary" style={{flex: 1, justifyContent:'center'}} onClick={onOpenLobby}>
              <Icon name="games" size={12}/> Open lobby
            </button>
          )}
          {game.status === 'active' && (
            <button className="btn btn-primary" style={{flex: 1, justifyContent:'center'}} onClick={onResume}>
              <Icon name="play" size={12}/> Resume
            </button>
          )}
          {game.status === 'complete' && (
            <button className="btn" style={{flex: 1, justifyContent:'center'}} onClick={onViewSummary}>
              <Icon name="history" size={12}/> View summary
            </button>
          )}
          <button className="btn btn-icon" title="Delete"><Icon name="trash" size={14}/></button>
        </div>
      </div>
    </div>
  );
}

window.GameManagement = GameManagement;
