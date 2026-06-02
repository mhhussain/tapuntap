// ============ Auth — Login & Sign-up ============
// Centered front door. Loading splash → auth form. Google primary + email/password.
// Sign in / Sign up toggle, full validation + error states.

function AuthSplash() {
  // Shown before auth resolves — no flash of the app behind it.
  return (
    <div className="auth-bg" style={{display:'grid', placeItems:'center', height:'100vh'}}>
      <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 22}}>
        <div style={{transform:'scale(1.15)'}}><Wordmark size={40} /></div>
        <div style={{display:'flex', alignItems:'center', gap: 10, color:'var(--fg-3)'}}>
          <Spinner size={16} />
          <span style={{fontFamily:'var(--font-mono)', fontSize: 12, textTransform:'uppercase', letterSpacing:'0.12em'}}>Restoring session…</span>
        </div>
      </div>
    </div>
  );
}

// Toy validators
const isEmail = (s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
const pwStrength = (s) => {
  let score = 0;
  if (s.length >= 8) score++;
  if (/[A-Z]/.test(s) && /[a-z]/.test(s)) score++;
  if (/\d/.test(s)) score++;
  if (/[^A-Za-z0-9]/.test(s)) score++;
  return score; // 0..4
};

function Auth({ onAuthed }) {
  const [mode, setMode] = React.useState('signin'); // signin | signup
  const [email, setEmail] = React.useState('');
  const [pw, setPw] = React.useState('');
  const [name, setName] = React.useState('');
  const [touched, setTouched] = React.useState({});
  const [submitting, setSubmitting] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [formError, setFormError] = React.useState(null); // server-style error banner

  const strength = pwStrength(pw);
  const emailValid = isEmail(email);

  // Field-level validation messages (only after blur/submit)
  const emailErr = touched.email && !emailValid ? 'Enter a valid email address.' : null;
  const pwErr = touched.pw && mode === 'signup' && pw && strength < 2
    ? 'Password is too weak — add length, a number, or a symbol.'
    : (touched.pw && !pw ? 'Password is required.' : null);
  const nameErr = touched.name && mode === 'signup' && !name.trim() ? 'Choose a display name.' : null;

  const switchMode = (m) => {
    setMode(m);
    setFormError(null);
    setTouched({});
  };

  const submit = (e) => {
    e?.preventDefault();
    setTouched({ email: true, pw: true, name: true });
    setFormError(null);

    if (!emailValid) return;
    if (!pw) return;
    if (mode === 'signup' && (!name.trim() || strength < 2)) return;

    setSubmitting(true);
    // Simulate the server round-trip + canned error states by trigger inputs
    setTimeout(() => {
      setSubmitting(false);
      if (mode === 'signin' && email !== 'wren@tapuntap.gg' && pw !== 'demo') {
        // demo: any creds work EXCEPT a reserved "wrong@" trigger
        if (email.startsWith('wrong@')) {
          setFormError({ kind: 'bad', text: "That email and password don't match. Try again." });
          return;
        }
      }
      if (mode === 'signup' && email === 'taken@tapuntap.gg') {
        setFormError({ kind: 'bad', text: 'An account with this email already exists. Sign in instead?' });
        return;
      }
      onAuthed();
    }, 850);
  };

  const googleAuth = () => {
    setGoogleLoading(true);
    setTimeout(() => onAuthed(), 1100);
  };

  return (
    <div className="auth-bg" style={{display:'grid', placeItems:'center', height:'100vh', padding: 24, overflowY:'auto'}}>
      <div style={{width: '100%', maxWidth: 396, display:'flex', flexDirection:'column', gap: 22}}>

        {/* Brand */}
        <div style={{display:'flex', flexDirection:'column', alignItems:'center', gap: 10, marginBottom: 4}}>
          <Wordmark size={36} />
          <p style={{margin: 0, color:'var(--fg-3)', fontSize: 13, textAlign:'center'}}>
            Track multiplayer Magic in real time.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background:'var(--bg-1)', border:'1px solid var(--line-2)', borderRadius: 14,
          padding: 24, boxShadow: 'var(--shadow-2)',
        }}>
          {/* Tab toggle */}
          <div style={{display:'flex', background:'var(--bg-0)', border:'1px solid var(--line-1)', borderRadius: 8, padding: 3, marginBottom: 20}}>
            {[['signin','Sign in'], ['signup','Sign up']].map(([m, label]) => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: '7px 0', borderRadius: 6, border:'none',
                background: mode === m ? 'var(--bg-3)' : 'transparent',
                color: mode === m ? 'var(--fg-0)' : 'var(--fg-3)',
                fontWeight: 600, fontSize: 13, transition:'all 120ms',
              }}>{label}</button>
            ))}
          </div>

          {/* Google */}
          <button className="btn" onClick={googleAuth} disabled={googleLoading || submitting}
            style={{width:'100%', justifyContent:'center', padding: '10px 0', fontWeight: 600, fontSize: 14, background:'var(--bg-2)'}}>
            {googleLoading ? <Spinner size={16}/> : <GoogleGlyph/>}
            {googleLoading ? 'Connecting…' : 'Continue with Google'}
          </button>

          {/* Divider */}
          <div style={{display:'flex', alignItems:'center', gap: 12, margin:'18px 0'}}>
            <div style={{flex:1, height:1, background:'var(--line-1)'}}/>
            <span style={{fontSize: 11, color:'var(--fg-4)', fontFamily:'var(--font-mono)', textTransform:'uppercase', letterSpacing:'0.1em'}}>or</span>
            <div style={{flex:1, height:1, background:'var(--line-1)'}}/>
          </div>

          {/* Server error banner */}
          {formError && (
            <div style={{
              display:'flex', alignItems:'flex-start', gap: 10, padding: '10px 12px', marginBottom: 16,
              background:'oklch(0.68 0.18 25 / 0.12)', border:'1px solid oklch(0.68 0.18 25 / 0.4)', borderRadius: 8,
            }}>
              <span style={{color:'var(--bad)', marginTop: 1}}><Icon name="close" size={14}/></span>
              <div style={{fontSize: 13, color:'var(--fg-1)', flex: 1}}>
                {formError.text}
                {formError.text.includes('Sign in') && (
                  <button onClick={() => switchMode('signin')} style={{background:'none', border:'none', color:'var(--accent)', padding: 0, marginLeft: 4, textDecoration:'underline', cursor:'pointer', fontSize: 13}}>Sign in</button>
                )}
              </div>
            </div>
          )}

          <form onSubmit={submit} style={{display:'flex', flexDirection:'column', gap: 14}}>
            {mode === 'signup' && (
              <AuthField label="Display name" error={nameErr}>
                <input className="input" value={name} placeholder="e.g. Wren"
                  onChange={e => setName(e.target.value)}
                  onBlur={() => setTouched(t => ({...t, name: true}))}
                  style={{borderColor: nameErr ? 'var(--bad)' : undefined}}/>
              </AuthField>
            )}

            <AuthField label="Email" error={emailErr}>
              <input className="input" type="email" value={email} placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setTouched(t => ({...t, email: true}))}
                style={{borderColor: emailErr ? 'var(--bad)' : undefined}}/>
            </AuthField>

            <AuthField
              label="Password"
              error={pwErr}
              aside={mode === 'signin' && (
                <button type="button" className="auth-link" title="Coming soon" onClick={e => e.preventDefault()}>Forgot password?</button>
              )}>
              <input className="input" type="password" value={pw} placeholder={mode === 'signup' ? 'At least 8 characters' : '••••••••'}
                onChange={e => setPw(e.target.value)}
                onBlur={() => setTouched(t => ({...t, pw: true}))}
                style={{borderColor: pwErr ? 'var(--bad)' : undefined}}/>
              {mode === 'signup' && pw && <StrengthMeter score={strength} />}
            </AuthField>

            <button type="submit" className="btn btn-primary" disabled={submitting || googleLoading}
              style={{width:'100%', justifyContent:'center', padding: '10px 0', fontSize: 14, marginTop: 2}}>
              {submitting ? <Spinner size={16}/> : null}
              {submitting ? 'Just a moment…' : (mode === 'signin' ? 'Sign in' : 'Create account')}
            </button>
          </form>
        </div>

        {/* Footnote */}
        <p style={{margin: 0, textAlign:'center', fontSize: 11, color:'var(--fg-4)', lineHeight: 1.6}}>
          {mode === 'signup'
            ? 'By creating an account you agree to the Terms of Play and Privacy Policy.'
            : 'tapuntap tracks game state — it does not enforce rules.'}
        </p>
      </div>
    </div>
  );
}

function AuthField({ label, error, aside, children }) {
  return (
    <div>
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 6}}>
        <span className="eyebrow">{label}</span>
        {aside}
      </div>
      {children}
      {error && (
        <div style={{display:'flex', alignItems:'center', gap: 6, marginTop: 6, color:'var(--bad)', fontSize: 12}}>
          <Icon name="close" size={11}/> {error}
        </div>
      )}
    </div>
  );
}

function StrengthMeter({ score }) {
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['var(--bad)', 'var(--bad)', 'var(--warn)', 'var(--good)', 'var(--good)'];
  return (
    <div style={{marginTop: 8}}>
      <div style={{display:'flex', gap: 4}}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i < score ? colors[score] : 'var(--bg-3)',
            transition:'background 200ms',
          }}/>
        ))}
      </div>
      <div style={{fontSize: 11, color: colors[score], marginTop: 4, fontFamily:'var(--font-mono)'}}>{labels[score]}</div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24">
      <path fill="#EA4335" d="M12 5.5c1.6 0 3 .55 4.1 1.6l3-3C17.1 2.1 14.7 1 12 1 7.4 1 3.4 3.6 1.5 7.4l3.5 2.7C5.9 7.3 8.7 5.5 12 5.5z"/>
      <path fill="#4285F4" d="M23 12.3c0-.8-.07-1.5-.2-2.3H12v4.5h6.2c-.27 1.4-1.07 2.6-2.3 3.4l3.5 2.7c2.05-1.9 3.6-4.7 3.6-8.3z"/>
      <path fill="#FBBC05" d="M5 14.1c-.25-.7-.4-1.5-.4-2.3s.15-1.6.4-2.3L1.5 6.8C.7 8.4.25 10.1.25 12s.45 3.6 1.25 5.2L5 14.1z"/>
      <path fill="#34A853" d="M12 23c2.7 0 5-1 6.65-2.7l-3.5-2.7c-.95.65-2.2 1-3.15 1-3.3 0-6.1-1.8-7-4.5L1.5 17c1.9 3.8 5.9 6 10.5 6z"/>
    </svg>
  );
}

window.Auth = Auth;
window.AuthSplash = AuthSplash;
