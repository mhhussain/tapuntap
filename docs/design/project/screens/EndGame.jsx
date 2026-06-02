// ============ End-game ============
// Summary shown when a game ends. If no winner marked yet → "mark who won" flow.
// Then: final standings, winner spotlight, actions (rematch / back / archive).
// Also exports the in-progress End-game & Leave confirmation modals.

function EndGame({ game, onRematch, onBackToGames, onArchive }) {
  // Build working standings from the game
  const baseStandings = game.finalStandings || game.players.map((p, i) => ({
    name: p.name, deck: p.deck, colors: p.colors, life: p.life ?? 0, place: i + 1,
  }));
  const [winner, setWinner] = React.useState(game.winner || null);
  const [archived, setArchived] = React.useState(false);

  // Order: winner first, then by life desc
  const standings = [...baseStandings].sort((a, b) => {
    if (a.name === winner) return -1;
    if (b.name === winner) return 1;
    return (b.life ?? 0) - (a.life ?? 0);
  }).map((s, i) => ({ ...s, place: i + 1 }));

  const winnerRow = standings.find(s => s.name === winner);

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">{game.title}</div>
        <span className="tag" style={{textTransform:'uppercase'}}>Complete</span>
        <span className="topbar-sub">{game.format} · {game.players?.length || standings.length} players</span>
        <div className="topbar-spacer"/>
        {archived && <span className="tag tag-good"><Icon name="check" size={11}/> Archived</span>}
      </div>

      <div style={{flex:1, overflowY:'auto', display:'grid', placeItems:'start center', padding:'32px 24px'}}>
        <div style={{width:'100%', maxWidth: 620, display:'flex', flexDirection:'column', gap: 24}}>

          {!winner ? (
            <div style={{
              display:'flex', alignItems:'center', gap: 12, padding:'14px 16px',
              background:'oklch(0.78 0.14 70 / 0.1)', border:'1px solid var(--accent-line)', borderRadius: 10,
            }}>
              <span style={{color:'var(--warn)'}}><Icon name="more" size={16}/></span>
              <div style={{flex:1, fontSize: 13, color:'var(--fg-1)'}}>
                <strong style={{color:'var(--fg-0)'}}>Mark who won</strong> to finish this game. tapuntap tracks state — winners are called manually.
              </div>
            </div>
          ) : (
            <WinnerSpotlight row={winnerRow} />
          )}

          {/* Standings */}
          <div>
            <div className="eyebrow" style={{marginBottom: 10}}>Final standings</div>
            <div style={{background:'var(--bg-1)', border:'1px solid var(--line-1)', borderRadius: 10, overflow:'hidden'}}>
              {standings.map((s) => (
                <StandingRow key={s.name} row={s} isWinner={s.name === winner} marking={!winner} onMark={() => setWinner(s.name)} />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{display:'flex', gap: 8, alignItems:'center'}}>
            <button className="btn btn-primary" onClick={onRematch} disabled={!winner} style={{opacity: winner ? 1 : 0.5}}>
              <Icon name="undo" size={13}/> Rematch
            </button>
            <button className="btn" onClick={() => { setArchived(true); }} disabled={!winner || archived}>
              <Icon name="save" size={13}/> {archived ? 'Archived' : 'Archive game'}
            </button>
            <div style={{flex:1}}/>
            <button className="btn btn-ghost" onClick={onBackToGames}>Back to games</button>
          </div>

          <p style={{margin:0, textAlign:'center', fontSize: 11, color:'var(--fg-4)'}}>
            Rematch opens a fresh lobby with the same players and decks.
          </p>
        </div>
      </div>
    </>
  );
}

function WinnerSpotlight({ row }) {
  if (!row) return null;
  return (
    <div style={{
      display:'flex', flexDirection:'column', alignItems:'center', gap: 12, padding:'28px 20px',
      background:'radial-gradient(420px 220px at 50% 0%, var(--accent-soft), transparent 70%), var(--bg-1)',
      border:'1px solid var(--accent-line)', borderRadius: 14, textAlign:'center',
    }}>
      <div style={{position:'relative'}}>
        <Avatar name={row.name} colors={row.colors} size={72} />
        <div style={{position:'absolute', top:-10, right:-10, width: 30, height: 30, borderRadius:'50%', background:'var(--accent)', display:'grid', placeItems:'center', boxShadow:'var(--shadow-1)'}}>
          <Trophy/>
        </div>
      </div>
      <div className="eyebrow" style={{color:'var(--accent)'}}>Winner</div>
      <div style={{fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize: 36, color:'var(--fg-0)', lineHeight: 1}}>{row.name}</div>
      <div style={{display:'flex', alignItems:'center', gap: 8, color:'var(--fg-3)', fontSize: 13}}>
        <ColorDots colors={row.colors} size={9}/> {row.deck}
        <span style={{color:'var(--line-3)'}}>·</span>
        <span style={{fontFamily:'var(--font-mono)'}}>{row.life} life remaining</span>
      </div>
    </div>
  );
}

function StandingRow({ row, isWinner, marking, onMark }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display:'flex', alignItems:'center', gap: 14, padding:'12px 16px',
        borderBottom:'1px solid var(--line-1)',
        background: isWinner ? 'var(--accent-soft)' : 'transparent',
      }}>
      <div style={{
        width: 24, height: 24, borderRadius: 6, display:'grid', placeItems:'center', flexShrink: 0,
        fontFamily:'var(--font-mono)', fontSize: 12, fontWeight: 700,
        background: isWinner ? 'var(--accent)' : 'var(--bg-3)',
        color: isWinner ? 'var(--bg-0)' : 'var(--fg-3)',
      }}>{row.place}</div>
      <Avatar name={row.name} colors={row.colors} size={34}/>
      <div style={{flex:1, minWidth:0}}>
        <div style={{display:'flex', alignItems:'center', gap: 8}}>
          <span style={{fontWeight: 600, color:'var(--fg-0)'}}>{row.name}</span>
          {isWinner && <span style={{display:'inline-flex', color:'var(--accent)'}}><Trophy size={13}/></span>}
        </div>
        <div style={{display:'flex', alignItems:'center', gap: 6, marginTop: 2}}>
          <ColorDots colors={row.colors} size={8}/>
          <span style={{fontSize: 12, color:'var(--fg-3)'}}>{row.deck}</span>
        </div>
      </div>
      <div style={{textAlign:'right'}}>
        <div style={{fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize: 22, color: row.life > 0 ? 'var(--fg-0)' : 'var(--fg-4)', lineHeight: 1}}>{row.life}</div>
        <div style={{fontSize: 9, color:'var(--fg-4)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.08em'}}>life</div>
      </div>
      {marking && (
        <button className="btn btn-sm" onClick={onMark} style={{opacity: hover ? 1 : 0.6}}>
          <Trophy size={12}/> Winner
        </button>
      )}
    </div>
  );
}

function Trophy({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/>
      <path d="M7 5H4v2a3 3 0 0 0 3 3M17 5h3v2a3 3 0 0 1-3 3"/>
      <path d="M12 14v3M9 20h6M10 17h4l-.5 3h-3z"/>
    </svg>
  );
}

// ---------- In-progress confirmation modals (used by ActiveGameplay) ----------
function EndGameConfirm({ onClose, onConfirm }) {
  return (
    <Modal title="End this game?" onClose={onClose} width={440}
      footer={<>
        <button className="btn" onClick={onClose}>Keep playing</button>
        <button className="btn btn-primary" onClick={onConfirm}>End & view summary</button>
      </>}>
      <p style={{margin:0, color:'var(--fg-2)', lineHeight: 1.6}}>
        This finishes the game for everyone and opens the summary, where you can mark the winner and choose a rematch. The board state will be saved to the game's history.
      </p>
    </Modal>
  );
}

function LeaveGameConfirm({ onClose, onConfirm }) {
  return (
    <Modal title="Leave this game?" onClose={onClose} width={440}
      footer={<>
        <button className="btn" onClick={onClose}>Stay</button>
        <button className="btn" style={{background:'var(--bad)', borderColor:'var(--bad)', color:'white'}} onClick={onConfirm}>Leave game</button>
      </>}>
      <p style={{margin:0, color:'var(--fg-2)', lineHeight: 1.6}}>
        The game keeps running for the other players and your seat is held. You can resume any time from <strong style={{color:'var(--fg-1)'}}>Games</strong> while it's still live.
      </p>
    </Modal>
  );
}

Object.assign(window, { EndGame, EndGameConfirm, LeaveGameConfirm });
