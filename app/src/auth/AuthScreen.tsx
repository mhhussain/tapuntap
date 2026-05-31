import { useState } from "react";
import { useAuth } from "./useAuth";

export function AuthScreen() {
  const { signInGoogle, signInEmail, signUpEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function friendly(code: string, message: string) {
    if (code === "auth/invalid-credential") return "Invalid email or password.";
    if (code === "auth/email-already-in-use") return "That email is already registered. Try signing in.";
    if (code === "auth/weak-password") return "Password should be at least 6 characters.";
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    return message;
  }

  async function onEmailSubmit() {
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") await signInEmail(email.trim(), password);
      else await signUpEmail(email.trim(), password);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(friendly(err.code || "", err.message || "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">tapuntap</div>
        <p className="login-sub">Sign in to build decks and play.</p>

        <button className="btn btn-primary" disabled={busy} onClick={() => signInGoogle().catch((e) => {
          const err = e as { code?: string; message?: string };
          if (err.code === "auth/popup-closed-by-user" || err.code === "auth/cancelled-popup-request") return;
          setError(friendly(err.code || "", err.message || "Sign-in failed."));
        })}>
          Continue with Google
        </button>

        <div className="login-divider"><span>or</span></div>

        <input className="input" type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password} onChange={(e) => setPassword(e.target.value)} />

        <div style={{ fontSize: 12, color: "var(--err,#f66)", minHeight: 16 }}>{error}</div>

        <button className="btn btn-secondary" disabled={busy} onClick={onEmailSubmit}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <button className="btn btn-ghost" style={{ marginTop: 8 }}
          onClick={() => { setError(""); setMode(mode === "signin" ? "signup" : "signin"); }}>
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
