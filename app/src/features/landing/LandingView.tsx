import { Fragment } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../auth/useAuth";
import { Icon } from "../../components/Icon";

const FEATURES = [
  {
    icon: "games",
    title: "Multiplayer, up to 4",
    body: "Create a game, share the invite code, and play with friends in real time — no accounts to hunt down, no setup ritual.",
  },
  {
    icon: "decks",
    title: "Deck builder",
    body: "Search every printed card via Scryfall, build and version your decks, and bring them straight to the table.",
  },
  {
    icon: "play",
    title: "Solo playtest",
    body: "Pilot 2–4 seats yourself to goldfish a deck or rehearse a matchup before game night.",
  },
  {
    icon: "tap",
    title: "Freeform, like paper",
    body: "tapuntap tracks state — life, zones, counters, turns. It never enforces rules, so you play exactly like you would across a real table.",
  },
];

const STEPS = [
  { n: "01", title: "Build a deck", body: "Import a list or build from scratch with full card search." },
  { n: "02", title: "Start a game", body: "Create a lobby and send the invite code to up to three friends." },
  { n: "03", title: "Play in real time", body: "Every tap, draw, and life change syncs live to everyone at the table." },
];

export function LandingView() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return (
    <div className="landing">
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <img src="/brand/tapuntap-logo.svg" alt="tapuntap" className="landing-brand-logo" />
          <Link to="/login" className="btn btn-primary">Sign in</Link>
        </div>
      </header>

      <main className="landing-main">

      <section className="landing-hero">
        <img src="/brand/tapuntap-hero.svg" alt="tapuntap" className="landing-hero-img" />
        <p className="landing-tagline">
          Play Magic: The Gathering with friends, right in the browser. A shared virtual
          table that tracks the game state while you play — no rules engine, no friction.
        </p>
        <div className="landing-cta">
          <Link to="/login" className="btn btn-primary landing-cta-btn">
            Get started <Icon name="arrow-right" size={14} />
          </Link>
          <Link to="/login" className="btn landing-cta-btn">Sign in</Link>
        </div>
      </section>

      <section className="landing-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="landing-card">
            <span className="landing-card-icon"><Icon name={f.icon} size={20} /></span>
            <h3>{f.title}</h3>
            <p>{f.body}</p>
          </div>
        ))}
      </section>

      <section className="landing-steps">
        <h2 className="landing-steps-heading">How it works</h2>
        <div className="landing-steps-grid">
          {STEPS.map((s, i) => (
            <Fragment key={s.n}>
              <div className="landing-step">
                <span className="landing-step-n">{s.n}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
              {i < STEPS.length - 1 && (
                <span className="landing-step-arrow" aria-hidden="true">
                  <Icon name="arrow-right" size={18} />
                </span>
              )}
            </Fragment>
          ))}
        </div>
      </section>

      </main>

      <footer className="landing-footer">
        <div className="landing-footer-inner">
          <p>
          tapuntap is unofficial Fan Content permitted under the Wizards of the Coast Fan
          Content Policy. Not approved or endorsed by Wizards. Portions of the materials
          used are property of Wizards of the Coast. © Wizards of the Coast LLC.
        </p>
          <p>Card data and imagery courtesy of Scryfall.</p>
          <p>© 2026 tapuntap · v{__APP_VERSION__}</p>
        </div>
      </footer>
    </div>
  );
}
