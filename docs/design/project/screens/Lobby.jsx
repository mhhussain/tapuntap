// ============ Lobby ============
// Entry (create / join) → Room (seats, invite, ready, start).
// Handles: zero-decks empty state, waiting vs ready, host remove + start gating.

function Lobby({ initialView = 'entry', seedRoom = null, noDecks = false, onStart, onLeave, onNeedDeck }) {
  const [view, setView] = React.useState(seedRoom ? 'room' : initialView); // 'entry' | 'room'
  const [room, setRoom] = React.useState(seedRoom);

  const createGame = ({ name, format, deckId }) => {
    const fmt = FORMATS.find(f => f.id === format) || FORMATS[0];
    const deck = SAMPLE_DECKS.find(d => d.id === deckId);
    const seats = Array.from({ length: fmt.seats }, (_, i) => {
      if (i === 0) return { id: 's0', name: CURRENT_USER.name, colors: deck?.colors || CURRENT_USER.colors, deckId, deckName: deck?.name, ready: false, isHost: true, isYou: true };
      return { id: 's'+i, empty: true };
    });
    // Pre-seat a couple of demo players so waiting/ready states are visible
    if (seats[1]) seats[1] = { id:'s1', name:'Kavi', colors:['U','W'], deckName:'Tideglass Control', ready:true };
    if (seats[2]) seats[2] = { id:'s2', name:'Mara', colors:['B'], deckName:'Sable Reckoning', ready:false };
    setRoom({ name: name || "Untitled Table", format: fmt.name, inviteCode: genInviteCode(), seats });
    setView('room');
  };

  const joinGame = ({ code, deckId }) => {
    const deck = SAMPLE_DECKS.find(d => d.id === deckId);
    // Joining an existing host's room
    const seats = [
      { id:'s0', name:'Theo', colors:['G','U'], deckName:'Brambletide Midrange', ready:true, isHost:true },
      { id:'s1', name: CURRENT_USER.name, colors: deck?.colors || CURRENT_USER.colors, deckId, deckName: deck?.name, ready:false, isYou:true },
      { id:'s2', name:'Juno', colors:['R'], deckName:'Cinderforge Aggro', ready:true },
      { id:'s3', empty:true },
    ];
    setRoom({ name: "Theo's Commander Table", format: 'Commander', inviteCode: (code||'').toUpperCase() || 'SABLE-2291', seats, joinedAsGuest: true });
    setView('room');
  };

  if (noDecks) {
    return (
      <>
        <LobbyTopbar onLeave={onLeave} title="New game" />
        <div style={{flex:1, display:'grid', placeItems:'center', padding: 24}}>
          <div className="empty" style={{maxWidth: 440}}>
            <div className="empty-icon"><Icon name="cards" size={20}/></div>
            <div className="empty-title">Build a deck first</div>
            <div className="empty-body">You need at least one deck before you can create or join a game. Decks live in your library — build one, then come back to start a table.</div>
            <button className="btn btn-primary" style={{marginTop: 6}} onClick={onNeedDeck}>
              <Icon name="plus" size={14}/> Go to Deck Library
            </button>
          </div>
        </div>
      </>
    );
  }

  return view === 'entry'
    ? <LobbyEntry onCreate={createGame} onJoin={joinGame} onLeave={onLeave} />
    : <LobbyRoom room={room} setRoom={setRoom} onStart={onStart} onLeave={() => { setRoom(null); setView('entry'); }} onExit={onLeave} />;
}

function LobbyTopbar({ onLeave, title, tag }) {
  return (
    <div className="topbar">
      <button className="btn btn-ghost" onClick={onLeave}><Icon name="prev" size={14}/> Back</button>
      <div className="topbar-title">{title}</div>
      {tag && <span className="tag tag-warn">{tag}</span>}
      <div className="topbar-spacer"/>
    </div>
  );
}

// ---------- Entry: create + join ----------
function LobbyEntry({ onCreate, onJoin, onLeave }) {
  const [name, setName] = React.useState("Wren's Table");
  const [format, setFormat] = React.useState('commander');
  const [createDeck, setCreateDeck] = React.useState(SAMPLE_DECKS[0]?.id || '');
  const [code, setCode] = React.useState('');
  const [joinDeck, setJoinDeck] = React.useState(SAMPLE_DECKS[0]?.id || '');

  const fmt = FORMATS.find(f => f.id === format);

  return (
    <>
      <LobbyTopbar onLeave={onLeave} title="New game" />
      <div style={{flex:1, overflowY:'auto', display:'grid', placeItems:'start center', padding:'32px 24px'}}>
        <div style={{width:'100%', maxWidth: 880}}>
          <div style={{textAlign:'center', marginBottom: 28}}>
            <h1 style={{fontFamily:'var(--font-serif)', fontStyle:'italic', fontWeight: 400, fontSize: 40, color:'var(--fg-0)', margin:'0 0 6px'}}>Start a table</h1>
            <p style={{margin:0, color:'var(--fg-3)'}}>Host a new game, or join a friend's with their invite code.</p>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap: 20}}>
            {/* Create */}
            <div style={{background:'var(--bg-1)', border:'1px solid var(--line-2)', borderRadius: 12, padding: 22, display:'flex', flexDirection:'column', gap: 16}}>
              <div style={{display:'flex', alignItems:'center', gap: 10}}>
                <div style={{width:28, height:28, borderRadius:7, background:'var(--accent-soft)', border:'1px solid var(--accent-line)', display:'grid', placeItems:'center', color:'var(--accent)'}}><Icon name="plus" size={15}/></div>
                <h2 style={{margin:0, fontSize: 16, fontWeight: 600, color:'var(--fg-0)'}}>Create a game</h2>
              </div>

              <Labeled label="Game name">
                <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Friday Commander Night"/>
              </Labeled>

              <Labeled label="Format">
                <div style={{display:'flex', flexWrap:'wrap', gap: 6}}>
                  {FORMATS.map(f => (
                    <button key={f.id} onClick={() => setFormat(f.id)} className="btn btn-sm"
                      style={{
                        background: format === f.id ? 'var(--accent-soft)' : 'var(--bg-2)',
                        borderColor: format === f.id ? 'var(--accent)' : 'var(--line-2)',
                        color: format === f.id ? 'var(--accent)' : 'var(--fg-2)',
                      }}>{f.name}</button>
                  ))}
                </div>
                {fmt && <div style={{fontSize: 11, color:'var(--fg-4)', marginTop: 6, fontFamily:'var(--font-mono)'}}>{fmt.note}</div>}
              </Labeled>

              <Labeled label="Your deck">
                <DeckPicker value={createDeck} onChange={setCreateDeck} />
              </Labeled>

              <button className="btn btn-primary" style={{justifyContent:'center', padding:'10px 0', marginTop: 4}}
                onClick={() => onCreate({ name, format, deckId: createDeck })}>
                Create & open lobby <Icon name="arrow-right" size={14}/>
              </button>
            </div>

            {/* Join */}
            <div style={{background:'var(--bg-1)', border:'1px solid var(--line-1)', borderRadius: 12, padding: 22, display:'flex', flexDirection:'column', gap: 16}}>
              <div style={{display:'flex', alignItems:'center', gap: 10}}>
                <div style={{width:28, height:28, borderRadius:7, background:'var(--bg-2)', border:'1px solid var(--line-2)', display:'grid', placeItems:'center', color:'var(--fg-2)'}}><Icon name="import" size={15}/></div>
                <h2 style={{margin:0, fontSize: 16, fontWeight: 600, color:'var(--fg-0)'}}>Join by invite code</h2>
              </div>

              <Labeled label="Invite code">
                <input className="input" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="EMBER-4827"
                  style={{fontFamily:'var(--font-mono)', fontSize: 18, letterSpacing:'0.08em', textAlign:'center', padding:'12px 10px'}}/>
              </Labeled>

              <Labeled label="Your deck">
                <DeckPicker value={joinDeck} onChange={setJoinDeck} />
              </Labeled>

              <div style={{flex:1}}/>
              <button className="btn" style={{justifyContent:'center', padding:'10px 0'}}
                disabled={!code.trim()}
                onClick={() => onJoin({ code, deckId: joinDeck })}>
                <Icon name="arrow-right" size={14}/> Join table
              </button>
              <p style={{margin:0, fontSize: 11, color:'var(--fg-4)', textAlign:'center'}}>Ask the host for their code, or open their share link.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function Labeled({ label, children }) {
  return (
    <div>
      <div className="eyebrow" style={{marginBottom: 6}}>{label}</div>
      {children}
    </div>
  );
}

function DeckPicker({ value, onChange }) {
  const deck = SAMPLE_DECKS.find(d => d.id === value);
  return (
    <div style={{display:'flex', gap: 8, alignItems:'center'}}>
      <select className="input" value={value} onChange={e => onChange(e.target.value)} style={{flex:1}}>
        {SAMPLE_DECKS.map(d => <option key={d.id} value={d.id}>{d.name} ({d.colors.join('')})</option>)}
      </select>
      {deck && (
        <div style={{display:'flex', alignItems:'center', gap: 8, padding:'7px 10px', background:'var(--bg-2)', borderRadius: 6, border:'1px solid var(--line-1)'}}>
          <ColorDots colors={deck.colors}/>
          <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>{deck.cardCount}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Room: seats, invite, ready, start ----------
function LobbyRoom({ room, setRoom, onStart, onLeave, onExit }) {
  const [copied, setCopied] = React.useState(false);
  const [confirmLeave, setConfirmLeave] = React.useState(false);

  const youSeat = room.seats.find(s => s.isYou);
  const isHost = !!youSeat?.isHost;
  const filled = room.seats.filter(s => !s.empty);
  const allReady = filled.every(s => s.ready);
  const canStart = isHost && filled.length >= 2 && allReady;

  const toggleReady = () => {
    setRoom(r => ({ ...r, seats: r.seats.map(s => s.isYou ? { ...s, ready: !s.ready } : s) }));
  };
  const removePlayer = (id) => {
    setRoom(r => ({ ...r, seats: r.seats.map(s => s.id === id ? { id: s.id, empty: true } : s) }));
  };
  const copyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const cols = room.seats.length <= 2 ? 2 : 2;

  return (
    <>
      <div className="topbar">
        <button className="btn btn-ghost" onClick={() => setConfirmLeave(true)}><Icon name="prev" size={14}/> Leave</button>
        <div className="topbar-title">{room.name}</div>
        <span className="tag tag-warn" style={{textTransform:'uppercase'}}>● Lobby</span>
        <span className="topbar-sub">{room.format}</span>
        <div className="topbar-spacer"/>
        <span style={{fontSize: 12, color:'var(--fg-3)', fontFamily:'var(--font-mono)'}}>{filled.length}/{room.seats.length} seated</span>
      </div>

      <div style={{flex:1, overflowY:'auto', display:'grid', placeItems:'start center', padding:'28px 24px'}}>
        <div style={{width:'100%', maxWidth: 760, display:'flex', flexDirection:'column', gap: 22}}>

          {/* Invite banner */}
          <div style={{
            display:'flex', alignItems:'center', gap: 20, padding: 20,
            background:'linear-gradient(180deg, var(--accent-soft), transparent), var(--bg-1)',
            border:'1px solid var(--accent-line)', borderRadius: 12,
          }}>
            <div style={{flex:1}}>
              <div className="eyebrow" style={{marginBottom: 8}}>Invite code</div>
              <div style={{fontFamily:'var(--font-mono)', fontSize: 34, fontWeight: 700, letterSpacing:'0.06em', color:'var(--fg-0)', lineHeight: 1}}>{room.inviteCode}</div>
              <div style={{fontSize: 12, color:'var(--fg-3)', marginTop: 8}}>Share this code (or the link) so up to {room.seats.length} players can join.</div>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap: 8}}>
              <button className="btn btn-primary" onClick={copyLink} style={{justifyContent:'center', minWidth: 150}}>
                {copied ? <><Icon name="check" size={14}/> Copied!</> : <><Icon name="export" size={14}/> Copy invite link</>}
              </button>
              <button className="btn" onClick={copyLink} style={{justifyContent:'center'}}>
                <Icon name="duplicate" size={14}/> Copy code only
              </button>
            </div>
          </div>

          {/* Seats */}
          <div>
            <div style={{display:'flex', alignItems:'center', gap: 10, marginBottom: 12}}>
              <span className="eyebrow">Seats</span>
              <span style={{fontFamily:'var(--font-mono)', fontSize: 11, color:'var(--fg-3)'}}>{filled.length} of {room.seats.length}</span>
              <div style={{flex:1, height:1, background:'var(--line-1)'}}/>
              <span style={{fontSize: 11, color: allReady ? 'var(--good)' : 'var(--warn)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.06em'}}>
                {allReady ? 'All players ready' : 'Waiting on players'}
              </span>
            </div>
            <div style={{display:'grid', gridTemplateColumns:`repeat(${cols}, 1fr)`, gap: 12}}>
              {room.seats.map((seat, i) => (
                <SeatCard key={seat.id} seat={seat} index={i} isHostView={isHost} inviteCode={room.inviteCode}
                  onToggleReady={toggleReady} onRemove={() => removePlayer(seat.id)} onCopy={copyLink} />
              ))}
            </div>
          </div>

          {/* Action bar */}
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'space-between', gap: 16,
            padding:'16px 20px', background:'var(--bg-2)', border:'1px solid var(--line-2)', borderRadius: 12,
          }}>
            <div>
              {isHost ? (
                <>
                  <div className="eyebrow">{canStart ? 'Ready to play' : 'Not ready yet'}</div>
                  <div style={{fontSize: 13, color:'var(--fg-2)', marginTop: 4}}>
                    {filled.length < 2 ? 'Need at least 2 seated players.'
                      : !allReady ? 'All seated players must mark ready.'
                      : `${filled.length} players · ${room.format}`}
                  </div>
                </>
              ) : (
                <>
                  <div className="eyebrow">Waiting for host</div>
                  <div style={{fontSize: 13, color:'var(--fg-2)', marginTop: 4}}>The host will start when everyone's ready.</div>
                </>
              )}
            </div>
            <div style={{display:'flex', gap: 8}}>
              <button className="btn" onClick={() => setConfirmLeave(true)}>{isHost ? 'Cancel game' : 'Leave'}</button>
              {isHost ? (
                <button className="btn btn-primary" disabled={!canStart} onClick={onStart}
                  style={{padding:'8px 22px', fontSize: 14, opacity: canStart ? 1 : 0.45}}>
                  <Icon name="play" size={13}/> Start game
                </button>
              ) : (
                <button className="btn btn-primary" onClick={() => {}} style={{padding:'8px 22px'}}>
                  {youSeat?.ready ? 'Ready ✓' : 'Mark ready'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {confirmLeave && (
        <Modal title={isHost ? 'Cancel this game?' : 'Leave this lobby?'} onClose={() => setConfirmLeave(false)} width={440}
          footer={<>
            <button className="btn" onClick={() => setConfirmLeave(false)}>Stay</button>
            <button className="btn" style={{background:'var(--bad)', borderColor:'var(--bad)', color:'white'}} onClick={onLeave}>
              {isHost ? 'Cancel game' : 'Leave lobby'}
            </button>
          </>}>
          <p style={{margin:0, color:'var(--fg-2)', lineHeight: 1.6}}>
            {isHost
              ? 'Cancelling closes the lobby for everyone and frees up all seats. This can\'t be undone.'
              : 'You\'ll be removed from this table. You can rejoin with the invite code while the lobby is open.'}
          </p>
        </Modal>
      )}
    </>
  );
}

function SeatCard({ seat, index, isHostView, inviteCode, onToggleReady, onRemove, onCopy }) {
  const [hover, setHover] = React.useState(false);

  if (seat.empty) {
    return (
      <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 10,
          padding: 20, minHeight: 132,
          border:'1.5px dashed var(--line-2)', borderRadius: 12,
          background: hover ? 'var(--bg-1)' : 'transparent', transition:'background 120ms',
        }}>
        <div style={{width: 36, height: 36, borderRadius: 9, border:'1.5px dashed var(--line-3)', display:'grid', placeItems:'center', color:'var(--fg-4)'}}>
          <Icon name="plus" size={16}/>
        </div>
        <div style={{fontSize: 12, color:'var(--fg-3)'}}>Seat {index + 1} · open</div>
        <button className="btn btn-sm" onClick={onCopy}><Icon name="export" size={12}/> Share invite</button>
      </div>
    );
  }

  const canRemove = isHostView && !seat.isYou && !seat.isHost;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        position:'relative',
        display:'flex', flexDirection:'column', gap: 12,
        padding: 16, minHeight: 132,
        background:'var(--bg-1)',
        border: `1px solid ${seat.ready ? 'oklch(0.74 0.13 155 / 0.5)' : 'var(--line-1)'}`,
        borderRadius: 12,
        transition:'border-color 150ms',
      }}>
      <div style={{display:'flex', alignItems:'center', gap: 12}}>
        <Avatar name={seat.name} colors={seat.colors} size={40} ring={seat.isYou}/>
        <div style={{flex:1, minWidth:0}}>
          <div style={{display:'flex', alignItems:'center', gap: 8}}>
            <span style={{fontWeight: 600, color:'var(--fg-0)'}}>{seat.name}</span>
            {seat.isHost && <span className="tag" style={{padding:'1px 6px'}}>Host</span>}
            {seat.isYou && <span style={{fontSize: 10, color:'var(--accent)', fontFamily:'var(--font-mono)', textTransform:'uppercase'}}>You</span>}
          </div>
          <div style={{display:'flex', alignItems:'center', gap: 6, marginTop: 4}}>
            <ColorDots colors={seat.colors} size={8}/>
            <span style={{fontSize: 12, color:'var(--fg-3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{seat.deckName || 'No deck chosen'}</span>
          </div>
        </div>
        {canRemove && hover && (
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onRemove} title="Remove player" style={{color:'var(--bad)'}}>
            <Icon name="close" size={14}/>
          </button>
        )}
      </div>

      <div style={{marginTop:'auto'}}>
        {seat.isYou ? (
          <button onClick={onToggleReady} className="btn" style={{
            width:'100%', justifyContent:'center',
            background: seat.ready ? 'oklch(0.74 0.13 155 / 0.16)' : 'var(--bg-2)',
            borderColor: seat.ready ? 'oklch(0.74 0.13 155 / 0.5)' : 'var(--line-2)',
            color: seat.ready ? 'var(--good)' : 'var(--fg-1)',
          }}>
            {seat.ready ? <><Icon name="check" size={13}/> Ready</> : 'Mark ready'}
          </button>
        ) : (
          <div style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap: 6,
            padding:'6px 0', borderRadius: 6,
            fontSize: 12, fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.06em',
            color: seat.ready ? 'var(--good)' : 'var(--warn)',
            background: seat.ready ? 'oklch(0.74 0.13 155 / 0.1)' : 'oklch(0.78 0.14 70 / 0.1)',
          }}>
            {seat.ready ? <><Icon name="check" size={12}/> Ready</> : <><Spinner size={11}/> Waiting…</>}
          </div>
        )}
      </div>
    </div>
  );
}

window.Lobby = Lobby;
