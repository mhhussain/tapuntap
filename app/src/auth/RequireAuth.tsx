import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import { AuthScreen } from "./AuthScreen";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="empty-state" style={{ flex: 1, display: "flex" }}>
        <div className="empty-title">Loading…</div>
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  return <>{children}</>;
}
