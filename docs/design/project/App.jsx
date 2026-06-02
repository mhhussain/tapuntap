// ============ App Shell — auth gate + routing + Tweaks ============

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "density": "comfortable",
  "playerCount": 2
}/*EDITMODE-END*/;

// Build a live "room" object from a lobby game record (for Open lobby)
function buildSeedRoom(game) {
  const seats = game.players.map((p, i) => ({
    id: 's' + i,
    name: p.name,
    colors: p.colors,
    deckName: p.deck,
    ready: !!p.ready,
    isHost: !!p.host,
    isYou: p.name === 'You',
  }));
  while (seats.length < (game.seatsTotal || seats.length)) {
    seats.push({ id: 's' + seats.length, empty: true });
  }
  return { name: game.title, format: game.format, inviteCode: game.inviteCode, seats };
}

function App() {
  // Auth gate
  const [authState, setAuthState] = React.useState('resolving'); // resolving | out | in

  // App routing
  const [screen, setScreen] = React.useState('games'); // library | games | lobby | gameplay | endgame | settings
  const [lobbyConfig, setLobbyConfig] = React.useState({ initialView: 'entry', seedRoom: null, noDecks: false });
  const [summaryGame, setSummaryGame] = React.useState(null);

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULS);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);

  // Resolve "session" on first load → reveals auth (no flash of the app)
  React.useEffect(() => {
    const t = setTimeout(() => setAuthState('out'), 1300);
    return () => clearTimeout(t);
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute('data-density', tweaks.density);
  }, [tweaks.density]);

  // Tweaks protocol
  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({type: '__edit_mode_available'}, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const closeTweaks = () => {
    setTweaksOpen(false);
    window.parent.postMessage({type: '__edit_mode_dismissed'}, '*');
  };

  // ---- Routing helpers ----
  const openNewGame = () => { setLobbyConfig({ initialView: 'entry', seedRoom: null, noDecks: false }); setScreen('lobby'); };
  const openLobbyFor = (gameId) => {
    const g = SAMPLE_GAMES.find(x => x.id === gameId);
    setLobbyConfig({ initialView: 'room', seedRoom: g ? buildSeedRoom(g) : null, noDecks: false });
    setScreen('lobby');
  };
  const viewSummary = (gameId) => { setSummaryGame(SAMPLE_GAMES.find(x => x.id === gameId)); setScreen('endgame'); };
  const endActiveGame = () => {
    // Active demo game → summary with no winner yet (mark-winner flow)
    const g = SAMPLE_GAMES.find(x => x.id === 'g1');
    setSummaryGame({ ...g, status: 'complete', winner: null,
      finalStandings: g.players.map(p => ({ name: p.name, deck: p.deck, colors: p.colors, life: p.name === 'You' ? 14 : 0 })) });
    setScreen('endgame');
  };

  // ---- Auth states ----
  if (authState === 'resolving') return <AuthSplash />;
  if (authState === 'out') return <Auth onAuthed={() => { setAuthState('in'); setScreen('games'); }} />;

  // ---- Authed app ----
  return (
    <div className="app">
      <nav className="rail">
        <div className="rail-logo" title="tapuntap" style={{padding: 0}}>
          <span style={{color:'var(--accent)'}}><Icon name="tap" size={18}/></span>
        </div>
        <button className={`rail-btn ${screen === 'library' ? 'active' : ''}`} onClick={() => setScreen('library')} data-tip="Deck Library">
          <Icon name="library" size={18}/>
        </button>
        <button className={`rail-btn ${['games','lobby','gameplay','endgame'].includes(screen) ? 'active' : ''}`} onClick={() => setScreen('games')} data-tip="Games">
          <Icon name="games" size={18}/>
        </button>
        <div className="rail-spacer"/>
        <button className={`rail-btn ${screen === 'settings' ? 'active' : ''}`} onClick={() => setScreen('settings')} data-tip="Settings">
          <Icon name="settings" size={18}/>
        </button>
        <button className="rail-btn" onClick={() => { setAuthState('resolving'); setTimeout(() => setAuthState('out'), 1100); }} data-tip="Sign out">
          <Icon name="export" size={18}/>
        </button>
      </nav>

      <div className="main" data-screen-label={getScreenLabel(screen)}>
        {screen === 'library'  && <DeckLibrary onStartGame={openNewGame} />}
        {screen === 'games'    && <GameManagement onResume={() => setScreen('gameplay')} onNewGame={openNewGame} onOpenLobby={openLobbyFor} onViewSummary={viewSummary} />}
        {screen === 'lobby'    && (
          <Lobby
            key={JSON.stringify(lobbyConfig)}
            initialView={lobbyConfig.initialView}
            seedRoom={lobbyConfig.seedRoom}
            noDecks={lobbyConfig.noDecks}
            onStart={() => setScreen('gameplay')}
            onLeave={() => setScreen('games')}
            onNeedDeck={() => setScreen('library')}
          />
        )}
        {screen === 'gameplay' && <ActiveGameplay onExit={() => setScreen('games')} onEndGame={endActiveGame} />}
        {screen === 'endgame'  && summaryGame && (
          <EndGame
            game={summaryGame}
            onRematch={openNewGame}
            onBackToGames={() => setScreen('games')}
            onArchive={() => {}}
          />
        )}
        {screen === 'settings' && <Settings onSignOut={() => { setAuthState('resolving'); setTimeout(() => setAuthState('out'), 1100); }} />}
      </div>

      {tweaksOpen && (
        <TweaksPanel onClose={closeTweaks} title="Tweaks">
          <TweakSection title="Display">
            <TweakRadio label="Card density" value={tweaks.density}
              onChange={v => setTweak('density', v)}
              options={[
                {value: 'compact', label: 'Compact'},
                {value: 'comfortable', label: 'Comfortable'},
              ]}/>
          </TweakSection>
          <TweakSection title="Game">
            <TweakSlider label="Default players" min={2} max={6} step={1} value={tweaks.playerCount}
              onChange={v => setTweak('playerCount', v)} />
          </TweakSection>
          <TweakSection title="Jump to screen">
            <div style={{display:'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6}}>
              <TweakButton onClick={() => setScreen('library')}>Library</TweakButton>
              <TweakButton onClick={() => setScreen('games')}>Games list</TweakButton>
              <TweakButton onClick={openNewGame}>Lobby · create</TweakButton>
              <TweakButton onClick={() => openLobbyFor('g0')}>Lobby · room</TweakButton>
              <TweakButton onClick={() => setScreen('gameplay')}>Gameplay</TweakButton>
              <TweakButton onClick={() => viewSummary('g3')}>End-game</TweakButton>
            </div>
          </TweakSection>
          <TweakSection title="States to review">
            <div style={{display:'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6}}>
              <TweakButton onClick={() => { setAuthState('resolving'); setTimeout(() => setAuthState('out'), 1300); }}>Auth loading</TweakButton>
              <TweakButton onClick={() => setAuthState('out')}>Auth screen</TweakButton>
              <TweakButton onClick={() => { setLobbyConfig({ initialView: 'entry', seedRoom: null, noDecks: true }); setScreen('lobby'); }}>Lobby · no decks</TweakButton>
              <TweakButton onClick={() => endActiveGame()}>End · mark winner</TweakButton>
            </div>
          </TweakSection>
        </TweaksPanel>
      )}
    </div>
  );
}

function getScreenLabel(screen) {
  return ({
    library: '01 Deck Library',
    games:   '02 Games',
    lobby:   '03 Lobby',
    gameplay:'04 Active Gameplay',
    endgame: '05 End-game Summary',
    settings:'06 Settings',
  })[screen] || screen;
}

function Settings({ onSignOut }) {
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Settings</div>
        <span className="topbar-sub">Preferences</span>
        <div className="topbar-spacer"/>
        <div style={{display:'flex', alignItems:'center', gap: 10}}>
          <Avatar name={CURRENT_USER.name} colors={CURRENT_USER.colors} size={28}/>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize: 12, fontWeight: 600, color:'var(--fg-1)'}}>{CURRENT_USER.name}</div>
            <div style={{fontSize: 11, color:'var(--fg-3)', fontFamily:'var(--font-mono)'}}>{CURRENT_USER.email}</div>
          </div>
        </div>
      </div>
      <div style={{flex: 1, overflowY:'auto', padding: '32px', display:'grid', placeItems:'start center'}}>
        <div style={{maxWidth: 720, width:'100%', display:'flex', flexDirection:'column', gap: 24}}>
          <SettingsGroup title="Appearance">
            <SettingsRow label="Theme" desc="Background and surface tones throughout the app.">
              <select className="input" style={{maxWidth: 200}} defaultValue="ink">
                <option value="ink">Warm Ink (default)</option>
                <option value="slate">Cool Slate</option>
                <option value="parchment">Parchment</option>
              </select>
            </SettingsRow>
            <SettingsRow label="Font scale" desc="Adjust UI text size globally.">
              <select className="input" style={{maxWidth: 200}} defaultValue="100">
                <option value="90">90%</option>
                <option value="100">100%</option>
                <option value="110">110%</option>
                <option value="120">120%</option>
              </select>
            </SettingsRow>
            <SettingsRow label="Accent color" desc="Used for the active player indicator and primary actions.">
              <div style={{display:'flex', gap: 6}}>
                {['oklch(0.78 0.14 75)', 'oklch(0.7 0.14 30)', 'oklch(0.7 0.13 240)', 'oklch(0.74 0.13 155)'].map((c, i) => (
                  <button key={i} className="btn btn-icon" style={{background: c, borderColor: c, width: 28, height: 28}}/>
                ))}
              </div>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="Gameplay">
            <SettingsRow label="Auto-tap lands when paying mana" desc="Automatically tap appropriate lands when casting spells.">
              <Toggle defaultChecked/>
            </SettingsRow>
            <SettingsRow label="Confirm before discarding" desc="Show a prompt before sending cards to graveyard.">
              <Toggle/>
            </SettingsRow>
            <SettingsRow label="Show summoning sickness indicator" desc="Dim creatures that can't attack this turn.">
              <Toggle defaultChecked/>
            </SettingsRow>
          </SettingsGroup>

          <SettingsGroup title="Keyboard shortcuts">
            <ShortcutRow keys="N" action="Next player / next turn"/>
            <ShortcutRow keys="L" action="Toggle game log"/>
            <ShortcutRow keys="S" action="Open scry panel"/>
            <ShortcutRow keys="T" action="Create token"/>
            <ShortcutRow keys="⌘ Z" action="Undo last action"/>
            <ShortcutRow keys="⌘ S" action="Save game"/>
            <ShortcutRow keys="Esc" action="Close modal / deselect"/>
          </SettingsGroup>

          <SettingsGroup title="Account">
            <SettingsRow label="Card data source" desc="Where to pull card information from.">
              <span style={{fontFamily:'var(--font-mono)', fontSize: 12, color:'var(--fg-2)', display:'flex', alignItems:'center', gap: 8}}>
                <span className="tag tag-good">Connected</span>
                Scryfall API
              </span>
            </SettingsRow>
            <SettingsRow label="Local storage" desc="3 decks · 4 game sessions cached locally.">
              <button className="btn btn-sm">Clear cache</button>
            </SettingsRow>
            <SettingsRow label="Sign out" desc="End your session on this device.">
              <button className="btn btn-sm" onClick={onSignOut}><Icon name="export" size={12}/> Sign out</button>
            </SettingsRow>
          </SettingsGroup>
        </div>
      </div>
    </>
  );
}

function SettingsGroup({title, children}) {
  return (
    <section>
      <h3 style={{fontFamily:'var(--font-serif)', fontStyle:'italic', fontWeight: 400, fontSize: 22, color:'var(--fg-0)', margin: '0 0 12px'}}>{title}</h3>
      <div style={{background:'var(--bg-1)', border:'1px solid var(--line-1)', borderRadius: 8, overflow:'hidden'}}>
        {children}
      </div>
    </section>
  );
}

function SettingsRow({label, desc, children}) {
  return (
    <div style={{display:'flex', alignItems:'center', gap: 16, padding: '14px 18px', borderBottom: '1px solid var(--line-1)'}}>
      <div style={{flex: 1}}>
        <div style={{fontWeight: 500, color:'var(--fg-1)', fontSize: 13}}>{label}</div>
        <div style={{fontSize: 12, color:'var(--fg-3)', marginTop: 2}}>{desc}</div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function ShortcutRow({keys, action}) {
  return (
    <div style={{display:'flex', alignItems:'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--line-1)'}}>
      <span style={{flex: 1, fontSize: 13, color:'var(--fg-2)'}}>{action}</span>
      <span className="kbd" style={{padding: '2px 8px'}}>{keys}</span>
    </div>
  );
}

function Toggle({defaultChecked}) {
  const [on, setOn] = React.useState(!!defaultChecked);
  return (
    <button onClick={() => setOn(o => !o)} style={{
      width: 36, height: 20, borderRadius: 10,
      background: on ? 'var(--accent)' : 'var(--bg-3)',
      border: '1px solid ' + (on ? 'var(--accent)' : 'var(--line-2)'),
      position:'relative', transition: 'all 150ms', padding: 0,
    }}>
      <span style={{
        position:'absolute', top: 1, left: on ? 17 : 1,
        width: 16, height: 16, borderRadius: '50%',
        background: on ? 'oklch(0.18 0.015 250)' : 'var(--fg-3)',
        transition: 'left 150ms',
      }}/>
    </button>
  );
}

window.App = App;
