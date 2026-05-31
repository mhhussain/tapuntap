import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import { AuthScreen } from "./AuthScreen";
import { Spinner } from "../components/Spinner";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

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

  if (!user) return <AuthScreen />;
  return <>{children}</>;
}
