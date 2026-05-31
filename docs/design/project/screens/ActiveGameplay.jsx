// ============ Active Gameplay Screen ============
// The focal screen — most polish.
// Novelty: horizontal player ribbon at top + battlefield with creature/land lanes.

const ZONES = ['hand', 'battlefield-creatures', 'battlefield-lands', 'graveyard', 'exile', 'library'];

// Build initial game state — 2 players from setup
function buildInitialGameState() {
  const players = [
    {
      id: 'p1', name: 'You', life: 20, deck: 'Cinderforge Aggro', colors: ['R'],
      handIds: ['c9', 'c9', 'c10', 'c11', 'c10', 'c17', 'c17'],
      battlefieldIds: [
        {iid: 'b1', cardId: 'c9',  tapped: false, sick: false, counter: 0},
        {iid: 'b2', cardId: 'c11', tapped: false, sick: true,  counter: 1},
      ],
      landIds: [
        {iid: 'b3', cardId: 'c17', tapped: true,  sick: false, counter: 0},
        {iid: 'b4', cardId: 'c17', tapped: true,  sick: false, counter: 0},
        {iid: 'b5', cardId: 'c17', tapped: false, sick: false, counter: 0},
        {iid: 'b6', cardId: 'c17', tapped: false, sick: false, counter: 0},
      ],
      graveyardIds: ['c10', 'c10'],
      exileIds: [],
      libraryCount: 47,
    },
    {
      id: 'p2', name: 'Player 2', life: 18, deck: 'Tideglass Control', colors: ['U','W'],
      handIds: ['c1', 'c2', 'c3', 'c4', 'c5'],
      battlefieldIds: [
        {iid: 'b7', cardId: 'c4', tapped: false, sick: false, counter: 0},
      ],
      landIds: [
        {iid: 'b8',  cardId: 'c14', tapped: false, sick: false, counter: 0},
        {iid: 'b9',  cardId: 'c15', tapped: false, sick: false, counter: 0},
        {iid: 'b10', cardId: 'c15', tapped: false, sick: false, counter: 0},
      ],
      graveyardIds: ['c5'],
      exileIds: [],
      libraryCount: 51,
    },
  ];
  return {
    players,
    activePlayer: 0,
    phase: 'Main 1',
    turn: 7,
    log: [
      { turn: 7, who: 'You',     text: 'Played Ember Mountain.' },
      { turn: 7, who: 'You',     text: 'Cast Forge-Lit Dragon.' },
      { turn: 6, who: 'Player 2',text: 'End of turn.' },
      { turn: 6, who: 'Player 2',text: 'Cast Tideglass Sage.' },
      { turn: 6, who: 'You',     text: 'Attacked with Cinderwing Brute (2 dmg).' },
    ],
    saved: 'just now',
  };
}

function ActiveGameplay({onExit, onEndGame}) {
  const [state, setState] = React.useState(buildInitialGameState);
  const [selectedIid, setSelectedIid] = React.useState(null);
  const [showScry, setShowScry] = React.useState(false);
  const [showToken, setShowToken] = React.useState(false);
  const [showEndConfirm, setShowEndConfirm] = React.useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = React.useState(false);
  const [logOpen, setLogOpen] = React.useState(true);
  const [drawerZone, setDrawerZone] = React.useState(null); // 'graveyard' | 'exile' | 'library'

  const active = state.players[state.activePlayer];
  const otherPlayers = state.players.filter((_, i) => i !== state.activePlayer);

  // Mutators
  const updateActive = (fn) => setState(s => ({
    ...s,
    players: s.players.map((p, i) => i === s.activePlayer ? fn(p) : p)
  }));

  const updatePlayer = (idx, fn) => setState(s => ({
    ...s,
    players: s.players.map((p, i) => i === idx ? fn(p) : p)
  }));

  const togglePermanent = (iid) => {
    updateActive(p => ({
      ...p,
      battlefieldIds: p.battlefieldIds.map(c => c.iid === iid ? {...c, tapped: !c.tapped} : c),
      landIds: p.landIds.map(c => c.iid === iid ? {...c, tapped: !c.tapped} : c),
    }));
  };

  const cycleNextPlayer = () => {
    setState(s => {
      const next = (s.activePlayer + 1) % s.players.length;
      const newTurn = next === 0 ? s.turn + 1 : s.turn;
      return {
        ...s,
        activePlayer: next,
        turn: newTurn,
        phase: 'Untap',
        log: [{turn: newTurn, who: s.players[next].name, text: 'Begins their turn.'}, ...s.log],
        // Untap all permanents for the new active player
        players: s.players.map((p, i) => i === next ? {
          ...p,
          battlefieldIds: p.battlefieldIds.map(c => ({...c, tapped: false, sick: false})),
          landIds: p.landIds.map(c => ({...c, tapped: false})),
        } : p),
      };
    });
  };

  const handleZoneDrop = (zone, e) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
    if (!data.cardId) return;
    const fromZone = data.fromZone;
    const card = cardById(data.cardId);
    if (!card) return;

    updateActive(p => {
      let next = {...p};
      // Remove from source
      if (fromZone === 'hand' && data.handIdx != null) {
        next = {...next, handIds: next.handIds.filter((_, i) => i !== data.handIdx)};
      } else if (fromZone === 'battlefield-creatures' && data.iid) {
        next = {...next, battlefieldIds: next.battlefieldIds.filter(c => c.iid !== data.iid)};
      } else if (fromZone === 'battlefield-lands' && data.iid) {
        next = {...next, landIds: next.landIds.filter(c => c.iid !== data.iid)};
      } else if (fromZone === 'graveyard' && data.gyIdx != null) {
        next = {...next, graveyardIds: next.graveyardIds.filter((_, i) => i !== data.gyIdx)};
      }

      // Add to dest
      if (zone === 'battlefield-creatures' && !card.isLand) {
        next = {...next, battlefieldIds: [...next.battlefieldIds, {iid: 'b' + Date.now(), cardId: card.id, tapped: false, sick: fromZone === 'hand', counter: 0}]};
      } else if (zone === 'battlefield-lands' && card.isLand) {
        next = {...next, landIds: [...next.landIds, {iid: 'b' + Date.now(), cardId: card.id, tapped: false, sick: false, counter: 0}]};
      } else if (zone === 'battlefield-creatures' && card.isLand) {
        // Drag a land onto creature lane → still goes to lands lane
        next = {...next, landIds: [...next.landIds, {iid: 'b' + Date.now(), cardId: card.id, tapped: false, sick: false, counter: 0}]};
      } else if (zone === 'hand') {
        next = {...next, handIds: [...next.handIds, card.id]};
      } else if (zone === 'graveyard') {
        next = {...next, graveyardIds: [...next.graveyardIds, card.id]};
      } else if (zone === 'exile') {
        next = {...next, exileIds: [...next.exileIds, card.id]};
      }

      return next;
    });

    setState(s => ({...s, log: [{turn: s.turn, who: active.name, text: `${card.name} → ${zone.replace('battlefield-', '')}`}, ...s.log]}));
  };

  const adjustLife = (idx, delta) => {
    updatePlayer(idx, p => ({...p, life: Math.max(0, p.life + delta)}));
  };

  const createToken = (token) => {
    updateActive(p => ({
      ...p,
      battlefieldIds: [...p.battlefieldIds, {
        iid: 't' + Date.now(),
        cardId: token.cardId,
        tapped: false, sick: false, counter: 0, isToken: true,
      }]
    }));
    setShowToken(false);
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'n' || e.key === 'N') cycleNextPlayer();
      if (e.key === 'l' || e.key === 'L') setLogOpen(o => !o);
      if (e.key === 's' || e.key === 'S') setShowScry(true);
      if (e.key === 't' || e.key === 'T') setShowToken(true);
      if (e.key === 'Escape') { setShowScry(false); setShowToken(false); setDrawerZone(null); setSelectedIid(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div style={{display:'grid', gridTemplateRows: 'auto auto 1fr auto', height: '100%', overflow:'hidden', background: 'var(--bg-0)'}}>

      {/* Game info bar */}
      <div className="topbar" style={{borderBottom: '1px solid var(--line-1)'}}>
        <button className="btn btn-ghost btn-icon" onClick={() => setShowLeaveConfirm(true)} title="Leave game"><Icon name="prev" size={14}/></button>
        <div className="topbar-title">Tuesday Night — R3</div>
        <span className="topbar-sub">Turn {state.turn} · {state.phase}</span>
        <div className="topbar-spacer"/>
        <span style={{fontSize: 11, color: 'var(--fg-3)', fontFamily: 'var(--font-mono)', display:'flex', alignItems:'center', gap: 6}}>
          <span style={{width: 6, height: 6, borderRadius: '50%', background: 'var(--good)', boxShadow: '0 0 8px var(--good)'}}/>
          AUTO-SAVED · {state.saved}
        </span>
        <button className="btn btn-ghost btn-icon" title="Undo (⌘Z)"><Icon name="undo" size={14}/></button>
        <button className="btn btn-ghost btn-icon" title="Save"><Icon name="save" size={14}/></button>
        <button className="btn btn-sm" onClick={() => setShowEndConfirm(true)} style={{marginLeft: 4}}>End game</button>
      </div>

      {/* Player ribbon */}
      <PlayerRibbon
        players={state.players}
        activeIdx={state.activePlayer}
        onSwitchTo={(i) => setState(s => ({...s, activePlayer: i}))}
        onAdjustLife={adjustLife}
        onNextTurn={cycleNextPlayer}
      />

      {/* Battlefield + sidebar */}
      <div style={{display:'grid', gridTemplateColumns: logOpen ? '1fr 320px' : '1fr 0px', overflow:'hidden', transition: 'grid-template-columns 200ms'}}>

        <div style={{display:'flex', flexDirection: 'column', overflow:'hidden', position:'relative'}}>
          {/* Opponents' boards (compressed) */}
          {otherPlayers.length > 0 && (
            <OpponentBoards players={state.players} activeIdx={state.activePlayer} />
          )}

          {/* Active player battlefield */}
          <Battlefield
            player={active}
            onDropZone={handleZoneDrop}
            onTogglePerm={togglePermanent}
            onSelect={setSelectedIid}
            selectedIid={selectedIid}
          />
        </div>

        {/* Side panel: log */}
        {logOpen && <SidePanel state={state} onClose={() => setLogOpen(false)} />}
      </div>

      {/* Hand zone + zone tabs */}
      <BottomBar
        player={active}
        onDropZone={handleZoneDrop}
        onZoneClick={setDrawerZone}
        onScry={() => setShowScry(true)}
        onToken={() => setShowToken(true)}
        onNextPlayer={cycleNextPlayer}
        nextPlayerName={state.players[(state.activePlayer + 1) % state.players.length].name}
        logOpen={logOpen}
        onToggleLog={() => setLogOpen(o => !o)}
      />

      {/* Modals */}
      {showEndConfirm && <EndGameConfirm onClose={() => setShowEndConfirm(false)} onConfirm={() => { setShowEndConfirm(false); onEndGame?.(); }} />}
      {showLeaveConfirm && <LeaveGameConfirm onClose={() => setShowLeaveConfirm(false)} onConfirm={() => { setShowLeaveConfirm(false); onExit?.(); }} />}
      {showScry && <ScryModal player={active} onClose={() => setShowScry(false)} />}
      {showToken && <TokenModal onCreate={createToken} onClose={() => setShowToken(false)} />}
      {drawerZone && <ZoneDrawer player={active} zone={drawerZone} onClose={() => setDrawerZone(null)} onDrop={handleZoneDrop}/>}
    </div>
  );
}

// ============ Player ribbon ============
function PlayerRibbon({players, activeIdx, onSwitchTo, onAdjustLife, onNextTurn}) {
  return (
    <div style={{
      display:'flex', alignItems:'stretch',
      borderBottom: '1px solid var(--line-1)',
      background: 'var(--bg-1)',
    }}>
      {players.map((p, i) => {
        const isActive = i === activeIdx;
        return (
          <div key={p.id}
            onClick={() => onSwitchTo(i)}
            style={{
              flex: 1,
              display:'flex', alignItems:'center', gap: 14,
              padding: '12px 18px',
              borderRight: i < players.length - 1 ? '1px solid var(--line-1)' : 'none',
              cursor:'pointer',
              background: isActive ? 'linear-gradient(180deg, var(--accent-soft) 0%, transparent 80%)' : 'transparent',
              borderTop: isActive ? '2px solid var(--accent)' : '2px solid transparent',
              position:'relative',
            }}>
            {/* Avatar/initial */}
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${p.colors.map(c => `var(--mana-${c.toLowerCase()})`).join(',')})`,
              display:'grid', placeItems:'center',
              fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize: 16,
              color: 'oklch(0.18 0.015 250)',
              border: '1px solid oklch(0 0 0 / 0.3)',
              boxShadow: 'var(--shadow-1)',
            }}>{p.name[0]}</div>

            <div style={{flex: 1, minWidth: 0}}>
              <div style={{display:'flex', alignItems:'center', gap: 8}}>
                <span style={{fontWeight: 600, fontSize: 13, color: isActive ? 'var(--fg-0)' : 'var(--fg-1)'}}>{p.name}</span>
                {isActive && <span style={{fontSize: 9, fontFamily:'var(--font-mono)', color:'var(--accent)', textTransform:'uppercase', letterSpacing:'0.1em'}}>Active</span>}
              </div>
              <div style={{fontSize: 11, color:'var(--fg-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{p.deck}</div>
            </div>

            {/* Vitals */}
            <div style={{display:'flex', alignItems:'center', gap: 12}}>
              <Vital label="LIFE" value={p.life} large onMinus={(e) => {e.stopPropagation(); onAdjustLife(i, -1);}} onPlus={(e) => {e.stopPropagation(); onAdjustLife(i, 1);}} />
              <div style={{display:'flex', flexDirection:'column', gap: 4}}>
                <Vital label="HAND" value={p.handIds.length} compact/>
                <Vital label="LIB" value={p.libraryCount} compact/>
              </div>
            </div>
          </div>
        );
      })}

      <button onClick={onNextTurn} style={{
        background: 'var(--accent)',
        color: 'oklch(0.18 0.015 250)',
        border: 'none',
        padding: '0 24px',
        display:'flex', alignItems:'center', gap: 8,
        fontWeight: 600,
        fontSize: 13,
      }}>
        <Icon name="next" size={14}/>
        Next turn
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: 10, padding: '1px 5px',
          background: 'oklch(0 0 0 / 0.2)', borderRadius: 3, marginLeft: 4
        }}>N</span>
      </button>
    </div>
  );
}

function Vital({label, value, large, compact, onMinus, onPlus}) {
  if (compact) {
    return (
      <div style={{display:'flex', alignItems:'center', gap: 6, fontSize: 10, color:'var(--fg-3)', fontFamily:'var(--font-mono)'}}>
        <span style={{textTransform:'uppercase'}}>{label}</span>
        <span style={{color:'var(--fg-1)', fontWeight: 600, fontSize: 12}}>{value}</span>
      </div>
    );
  }
  return (
    <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 2}}>
      <span style={{fontSize: 9, color:'var(--fg-3)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.1em'}}>{label}</span>
      <div style={{display:'flex', alignItems:'center', gap: 4}}>
        {onMinus && <button onClick={onMinus} className="btn btn-ghost" style={{padding: '0 4px', fontSize: 14}}>−</button>}
        <span style={{
          fontFamily:'var(--font-serif)', fontStyle:'italic',
          fontSize: large ? 28 : 16, color:'var(--fg-0)', lineHeight: 1, minWidth: 28, textAlign:'center'
        }}>{value}</span>
        {onPlus && <button onClick={onPlus} className="btn btn-ghost" style={{padding: '0 4px', fontSize: 14}}>+</button>}
      </div>
    </div>
  );
}

// ============ Opponent boards (compact) ============
function OpponentBoards({players, activeIdx}) {
  const opponents = players.map((p, i) => ({...p, idx: i})).filter(p => p.idx !== activeIdx);
  return (
    <div style={{borderBottom: '1px solid var(--line-1)', padding: '10px 20px 12px', background: 'var(--bg-0)'}}>
      <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 8}}>
        <span className="eyebrow">Opponents</span>
        <div style={{flex: 1, height: 1, background: 'var(--line-1)'}}/>
      </div>
      <div style={{display:'flex', gap: 16, overflowX:'auto'}}>
        {opponents.map(p => (
          <div key={p.id} style={{flex: 1, minWidth: 280, background:'var(--bg-1)', border:'1px solid var(--line-1)', borderRadius: 8, padding: 10}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 8}}>
              <span style={{fontSize: 12, fontWeight: 600}}>{p.name}</span>
              <span style={{fontSize: 11, color:'var(--fg-3)', fontFamily:'var(--font-mono)'}}>{p.battlefieldIds.length} permanents · {p.landIds.length} lands</span>
            </div>
            <div style={{display:'flex', gap: 4, overflowX:'auto', paddingBottom: 4}}>
              {[...p.battlefieldIds, ...p.landIds].map(perm => {
                const c = cardById(perm.cardId);
                if (!c) return null;
                return (
                  <div key={perm.iid} style={{
                    width: 38, height: 54, borderRadius: 4,
                    background: colorTone(c.colors),
                    border: '1px solid oklch(0 0 0 / 0.4)',
                    transform: perm.tapped ? 'rotate(90deg) translateX(8px)' : 'none',
                    transition: 'transform 200ms',
                    flexShrink: 0,
                    position:'relative',
                  }} title={c.name}>
                    <div style={{position:'absolute', bottom: 2, left: 2, fontSize: 7, color:'oklch(1 0 0 / 0.9)', fontWeight: 600, lineHeight: 1}}>{c.name.split(' ')[0]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ Battlefield ============
function Battlefield({player, onDropZone, onTogglePerm, onSelect, selectedIid}) {
  const [hoverZone, setHoverZone] = React.useState(null);
  const zoneProps = (zone) => ({
    onDragOver: (e) => { e.preventDefault(); setHoverZone(zone); },
    onDragLeave: () => setHoverZone(null),
    onDrop: (e) => { setHoverZone(null); onDropZone(zone, e); },
    className: hoverZone === zone ? 'drop-target' : '',
  });

  return (
    <div style={{flex: 1, overflowY:'auto', padding: '20px 24px', display:'flex', flexDirection:'column', gap: 14}}>
      {/* Creatures lane */}
      <div {...zoneProps('battlefield-creatures')} style={{
        flex: 1, minHeight: 200,
        display:'flex', flexDirection:'column', gap: 8,
        padding: 14,
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 10,
      }}>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <span className="eyebrow">Battlefield · Creatures & Spells</span>
          <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>{player.battlefieldIds.length}</span>
          <div style={{flex: 1}}/>
          <span style={{fontSize: 10, color:'var(--fg-4)'}}>Drop to play · click to tap</span>
        </div>
        <div style={{flex: 1, display:'flex', flexWrap:'wrap', gap: 'var(--density-gap)', alignContent:'flex-start', minHeight: 'var(--density-card-h)'}}>
          {player.battlefieldIds.length === 0 && (
            <div style={{flex: 1, display:'grid', placeItems:'center', color:'var(--fg-4)', fontSize: 12, fontStyle:'italic'}}>
              No permanents yet. Drag a creature here from your hand.
            </div>
          )}
          {player.battlefieldIds.map(perm => {
            const c = cardById(perm.cardId);
            if (!c) return null;
            return (
              <div key={perm.iid} onClick={() => onTogglePerm(perm.iid)} onDoubleClick={() => onSelect(perm.iid)} style={{position: 'relative'}}>
                <CardFace card={c} tapped={perm.tapped} sick={perm.sick} counter={perm.counter} dragData={{cardId: c.id, fromZone: 'battlefield-creatures', iid: perm.iid}} />
                {perm.isToken && <span style={{position:'absolute', top: -4, right: -4, fontSize: 8, fontFamily:'var(--font-mono)', background:'var(--accent)', color:'var(--bg-0)', padding: '1px 4px', borderRadius: 3, fontWeight: 700, textTransform:'uppercase'}}>TKN</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Lands lane */}
      <div {...zoneProps('battlefield-lands')} style={{
        display:'flex', flexDirection:'column', gap: 8,
        padding: 14,
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 10,
      }}>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <span className="eyebrow">Lands</span>
          <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>
            {player.landIds.filter(l => !l.tapped).length} / {player.landIds.length} available
          </span>
        </div>
        <div style={{display:'flex', flexWrap:'wrap', gap: 'var(--density-gap)', minHeight: 'var(--density-card-h)'}}>
          {player.landIds.length === 0 && (
            <div style={{flex: 1, display:'grid', placeItems:'center', color:'var(--fg-4)', fontSize: 12, fontStyle:'italic', minHeight: 'var(--density-card-h)'}}>
              No lands in play.
            </div>
          )}
          {player.landIds.map(perm => {
            const c = cardById(perm.cardId);
            if (!c) return null;
            return (
              <div key={perm.iid} onClick={() => onTogglePerm(perm.iid)}>
                <CardFace card={c} tapped={perm.tapped} dragData={{cardId: c.id, fromZone: 'battlefield-lands', iid: perm.iid}} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============ Side panel ============
function SidePanel({state, onClose}) {
  const [tab, setTab] = React.useState('log');
  const [note, setNote] = React.useState('');
  return (
    <aside style={{borderLeft: '1px solid var(--line-1)', display:'flex', flexDirection:'column', overflow:'hidden', background:'var(--bg-1)'}}>
      <div style={{display:'flex', alignItems:'center', borderBottom: '1px solid var(--line-1)'}}>
        {['log', 'notes'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex: 1, padding: '12px 0',
            background: tab === t ? 'var(--bg-2)' : 'transparent',
            border:'none',
            color: tab === t ? 'var(--fg-0)' : 'var(--fg-3)',
            fontWeight: 500, fontSize: 12,
            textTransform:'uppercase', letterSpacing:'0.08em',
          }}>{t}</button>
        ))}
        <button className="btn btn-ghost btn-icon" onClick={onClose} title="Hide panel (L)" style={{margin: '0 8px'}}><Icon name="close" size={14}/></button>
      </div>
      {tab === 'log' && (
        <div style={{flex: 1, overflowY:'auto'}}>
          {state.log.map((entry, i) => (
            <div key={i} style={{padding: '8px 14px', borderBottom: '1px solid var(--line-1)', display:'flex', gap: 10}}>
              <span style={{fontFamily:'var(--font-mono)', fontSize: 10, color:'var(--fg-3)', minWidth: 28}}>T{entry.turn}</span>
              <div style={{flex: 1}}>
                <span style={{fontSize: 11, color:'var(--accent)', fontWeight: 600}}>{entry.who}</span>
                <span style={{fontSize: 12, color:'var(--fg-2)', marginLeft: 6}}>{entry.text}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {tab === 'notes' && (
        <div style={{flex: 1, padding: 14, display:'flex', flexDirection:'column', gap: 10}}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Jot down anything — opponent's tells, sequencing notes, board threats…"
            className="input"
            style={{minHeight: 200, resize:'vertical', fontFamily:'var(--font-sans)', lineHeight: 1.5}}
          />
          <div style={{fontSize: 10, color:'var(--fg-4)', fontFamily:'var(--font-mono)', textTransform:'uppercase'}}>
            Saves with the game.
          </div>
        </div>
      )}
    </aside>
  );
}

// ============ Bottom bar (hand + zones + actions) ============
function BottomBar({player, onDropZone, onZoneClick, onScry, onToken, onNextPlayer, nextPlayerName, logOpen, onToggleLog}) {
  const [hoverZone, setHoverZone] = React.useState(null);
  const handProps = {
    onDragOver: (e) => { e.preventDefault(); setHoverZone('hand'); },
    onDragLeave: () => setHoverZone(null),
    onDrop: (e) => { setHoverZone(null); onDropZone('hand', e); },
  };

  return (
    <div style={{
      display:'grid', gridTemplateColumns: '1fr auto', gap: 0,
      borderTop: '1px solid var(--line-1)',
      background: 'var(--bg-1)',
    }}>
      <div {...handProps} style={{
        padding: '12px 16px',
        background: hoverZone === 'hand' ? 'var(--accent-soft)' : 'transparent',
        outline: hoverZone === 'hand' ? '1px dashed var(--accent-line)' : 'none',
        outlineOffset: -8,
      }}>
        <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 8}}>
          <span className="eyebrow">Hand · {player.name}</span>
          <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>{player.handIds.length} cards</span>
        </div>
        <div style={{display:'flex', gap: 'var(--density-gap)', overflowX:'auto', minHeight: 'var(--density-card-h)'}}>
          {player.handIds.map((cardId, i) => {
            const c = cardById(cardId);
            if (!c) return null;
            return <CardFace key={i} card={c} dragData={{cardId, fromZone: 'hand', handIdx: i}} />;
          })}
          {player.handIds.length === 0 && (
            <div style={{display:'grid', placeItems:'center', color:'var(--fg-4)', fontSize: 12, fontStyle:'italic', flex: 1, minHeight: 'var(--density-card-h)'}}>
              Empty hand.
            </div>
          )}
        </div>
      </div>

      {/* Zone tabs + actions */}
      <div style={{borderLeft: '1px solid var(--line-1)', padding: '12px 14px', display:'flex', flexDirection:'column', gap: 8, minWidth: 280}}>
        <div className="eyebrow">Zones & actions</div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 6}}>
          <ZoneTab icon="graveyard" label="Graveyard" count={player.graveyardIds.length} onClick={() => onZoneClick('graveyard')} />
          <ZoneTab icon="exile" label="Exile" count={player.exileIds.length} onClick={() => onZoneClick('exile')} />
          <ZoneTab icon="deck" label="Library" count={player.libraryCount} onClick={() => onZoneClick('library')} />
        </div>
        <div style={{display:'flex', gap: 6}}>
          <button className="btn btn-sm" style={{flex:1, justifyContent:'center'}} onClick={onScry}>
            <Icon name="scry" size={12}/> Scry <span className="kbd">S</span>
          </button>
          <button className="btn btn-sm" style={{flex:1, justifyContent:'center'}} onClick={onToken}>
            <Icon name="token" size={12}/> Token <span className="kbd">T</span>
          </button>
          <button className="btn btn-sm btn-icon" onClick={onToggleLog} title="Toggle log (L)">
            <Icon name="note" size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}

function ZoneTab({icon, label, count, onClick}) {
  const [hover, setHover] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onDragOver={(e) => { e.preventDefault(); setHover(true); }}
      onDragLeave={() => setHover(false)}
      style={{
        display:'flex', flexDirection:'column', alignItems:'center', gap: 2,
        padding: '8px 6px',
        background: hover ? 'var(--accent-soft)' : 'var(--bg-2)',
        border: hover ? '1px dashed var(--accent-line)' : '1px solid var(--line-1)',
        borderRadius: 6,
        color:'var(--fg-2)',
      }}>
      <Icon name={icon} size={14}/>
      <span style={{fontSize: 10, fontWeight: 500, textTransform:'uppercase', letterSpacing:'0.06em'}}>{label}</span>
      <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-0)'}}>{count}</span>
    </button>
  );
}

// ============ Modals ============
function ScryModal({player, onClose}) {
  // Simulate looking at top 3 of library
  const [topCards] = React.useState(['c10', 'c17', 'c11']);
  const [order, setOrder] = React.useState(topCards.map((id, i) => ({id, dest: 'top'})));

  return (
    <Modal title="Scry · Top of library" onClose={onClose} width={620}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={onClose}>Confirm order</button>
      </>}>
      <p style={{margin: '0 0 16px', color:'var(--fg-2)'}}>
        Look at the top {topCards.length} cards of your library. Put any number on the bottom; rest stay on top in chosen order.
      </p>
      <div style={{display:'flex', gap: 12, justifyContent:'center', marginBottom: 16}}>
        {order.map((entry, i) => {
          const c = cardById(entry.id);
          return (
            <div key={i} style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 8}}>
              <CardFace card={c} draggable={false} style={{width: 100, height: 140}}/>
              <div style={{display:'flex', flexDirection:'column', gap: 4, width: '100%'}}>
                <button onClick={() => setOrder(o => o.map((e, idx) => idx === i ? {...e, dest: 'top'} : e))}
                  className="btn btn-sm" style={{justifyContent:'center', background: entry.dest === 'top' ? 'var(--accent-soft)' : 'var(--bg-2)', borderColor: entry.dest === 'top' ? 'var(--accent)' : 'var(--line-2)'}}>
                  Top
                </button>
                <button onClick={() => setOrder(o => o.map((e, idx) => idx === i ? {...e, dest: 'bottom'} : e))}
                  className="btn btn-sm" style={{justifyContent:'center', background: entry.dest === 'bottom' ? 'var(--accent-soft)' : 'var(--bg-2)', borderColor: entry.dest === 'bottom' ? 'var(--accent)' : 'var(--line-2)'}}>
                  Bottom
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function TokenModal({onCreate, onClose}) {
  const [name, setName] = React.useState('Soldier');
  const [pt, setPt] = React.useState('1/1');
  const [color, setColor] = React.useState('W');
  const presets = [
    { name: 'Soldier', pt: '1/1', color: 'W' },
    { name: 'Spirit',  pt: '1/1', color: 'W' },
    { name: 'Goblin',  pt: '1/1', color: 'R' },
    { name: 'Dragon',  pt: '5/5', color: 'R' },
    { name: 'Zombie',  pt: '2/2', color: 'B' },
    { name: 'Beast',   pt: '3/3', color: 'G' },
  ];

  const create = () => {
    // Inject a synthetic card into the global pool for the token
    const tokenCard = mkCard('tkn-' + Date.now(), name, [], `Creature — ${name} Token`, [color], pt);
    SAMPLE_CARDS.push(tokenCard);
    onCreate({cardId: tokenCard.id});
  };

  return (
    <Modal title="Create token" onClose={onClose} width={560}
      footer={<>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" onClick={create}>Create token</button>
      </>}>
      <div className="eyebrow" style={{marginBottom: 8}}>Presets</div>
      <div style={{display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18}}>
        {presets.map((t, i) => (
          <button key={i} className="btn" onClick={() => { setName(t.name); setPt(t.pt); setColor(t.color); }} style={{justifyContent:'flex-start'}}>
            <span className={`pip pip-${t.color.toLowerCase()}`}/>
            <span>{t.name}</span>
            <span style={{marginLeft:'auto', fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>{t.pt}</span>
          </button>
        ))}
      </div>
      <div style={{display:'grid', gridTemplateColumns: '1fr 100px 1fr', gap: 12}}>
        <div>
          <div className="eyebrow" style={{marginBottom: 6}}>Name</div>
          <input className="input" value={name} onChange={e => setName(e.target.value)}/>
        </div>
        <div>
          <div className="eyebrow" style={{marginBottom: 6}}>P/T</div>
          <input className="input" value={pt} onChange={e => setPt(e.target.value)} style={{textAlign:'center', fontFamily:'var(--font-mono)'}}/>
        </div>
        <div>
          <div className="eyebrow" style={{marginBottom: 6}}>Color</div>
          <div style={{display:'flex', gap: 4}}>
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)} className="btn btn-icon"
                style={{
                  background: color === c ? `var(--mana-${c.toLowerCase()})` : 'var(--bg-2)',
                  borderColor: color === c ? `var(--mana-${c.toLowerCase()})` : 'var(--line-2)',
                  flex: 1, padding: 0, height: 30,
                }}>
                <span style={{fontWeight: 700, fontSize: 11, color: color === c ? 'oklch(0.18 0 0)' : 'var(--fg-2)'}}>{c}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function ZoneDrawer({player, zone, onClose, onDrop}) {
  const ids = zone === 'graveyard' ? player.graveyardIds
            : zone === 'exile'      ? player.exileIds
            : Array(player.libraryCount).fill('?');
  const isLibrary = zone === 'library';

  const titleMap = {graveyard: 'Graveyard', exile: 'Exile', library: 'Library'};

  return (
    <Modal title={`${titleMap[zone]} · ${player.name}`} onClose={onClose} width={760}
      footer={<button className="btn" onClick={onClose}>Close</button>}>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 12}}>
        <span style={{fontFamily:'var(--font-mono)', fontSize: 12, color:'var(--fg-3)'}}>{ids.length} cards</span>
        {isLibrary && <button className="btn btn-sm">Shuffle</button>}
      </div>
      {ids.length === 0 ? (
        <div className="empty">
          <div className="empty-icon"><Icon name={zone === 'graveyard' ? 'graveyard' : zone === 'exile' ? 'exile' : 'deck'} size={20}/></div>
          <div className="empty-title">Nothing here</div>
          <div className="empty-body">Cards moved to {titleMap[zone].toLowerCase()} will appear here.</div>
        </div>
      ) : isLibrary ? (
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fill, 60px)', gap: 6}}>
          {ids.slice(0, 30).map((_, i) => (
            <div key={i} style={{
              width: 60, height: 84, borderRadius: 4,
              background: 'linear-gradient(135deg, var(--bg-3), var(--bg-2))',
              border: '1px solid var(--line-2)',
              display:'grid', placeItems:'center',
              fontFamily:'var(--font-serif)', fontStyle:'italic', fontSize: 18, color: 'var(--fg-3)',
            }}>?</div>
          ))}
          {ids.length > 30 && <div style={{display:'grid', placeItems:'center', fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>+{ids.length - 30}</div>}
        </div>
      ) : (
        <div style={{display:'flex', flexWrap:'wrap', gap: 8}}>
          {ids.map((id, i) => {
            const c = cardById(id);
            if (!c) return null;
            return <CardFace key={i} card={c} dragData={{cardId: c.id, fromZone: zone, gyIdx: i}} />;
          })}
        </div>
      )}
    </Modal>
  );
}

window.ActiveGameplay = ActiveGameplay;
