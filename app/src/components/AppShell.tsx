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
  ];
  return (
    <div className="app">
      <nav className="rail">
        <div className="rail-logo" title="tapuntap">t</div>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === "/"}
            className={({ isActive }) => `rail-btn${isActive ? " active" : ""}`} title={l.tip}>
            <Icon name={l.icon} size={18} />
          </NavLink>
        ))}
        <div className="rail-spacer" />
        <NavLink to="/settings" className={({ isActive }) => `rail-btn${isActive ? " active" : ""}`} title="Settings">
          <Icon name="settings" size={18} />
        </NavLink>
        <button className="rail-btn" title={`Sign out (${user?.displayName || user?.email || ""})`}
          onClick={() => signOutUser().then(() => navigate("/")).catch((e) => console.error("sign-out failed:", e))}>
          {(user?.displayName || user?.email || "?").slice(0, 1).toUpperCase()}
        </button>
      </nav>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
