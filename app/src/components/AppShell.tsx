import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Icon } from "./Icon";

export function AppShell() {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const links: Array<{ to: string; icon: string; tip: string }> = [
    { to: "/", icon: "home", tip: "Home" },
    { to: "/decks", icon: "decks", tip: "Decks" },
    { to: "/games", icon: "games", tip: "Games" },
    { to: "/playtest", icon: "play", tip: "Playtest" },
  ];
  const displayName = user?.displayName || user?.email || "";
  const initial = (displayName || "?").slice(0, 1).toUpperCase();
  return (
    <div className="app">
      <nav className="rail">
        <div className="rail-logo" title="tapuntap">t</div>
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) => `rail-btn${isActive ? " active" : ""}`}
            data-tip={l.tip}
          >
            <Icon name={l.icon} size={18} />
          </NavLink>
        ))}
        <div className="rail-spacer" />
        <NavLink
          to="/settings"
          className={({ isActive }) => `rail-btn${isActive ? " active" : ""}`}
          data-tip="Settings"
        >
          <Icon name="settings" size={18} />
        </NavLink>
        <button
          className="rail-btn"
          data-tip={`Sign out (${displayName})`}
          onClick={() =>
            signOutUser()
              .then(() => navigate("/"))
              .catch((e) => console.error("sign-out failed:", e))
          }
        >
          {initial}
        </button>
      </nav>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
