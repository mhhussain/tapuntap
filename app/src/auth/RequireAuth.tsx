import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { Spinner } from "../components/Spinner";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-bg" style={{ display: "grid", placeItems: "center", height: "100vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
          <div style={{ transform: "scale(1.15)", fontFamily: "var(--font-serif)", fontStyle: "italic", fontSize: 40, color: "var(--fg-0)", lineHeight: 1 }}>
            tapuntap
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--fg-3)" }}>
            <Spinner size={16} />
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Restoring session…
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    if (location.pathname === "/") return <Navigate to="/welcome" replace />;
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  return <>{children}</>;
}
