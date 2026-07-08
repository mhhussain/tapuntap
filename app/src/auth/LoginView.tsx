import { Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "./useAuth";
import { AuthScreen } from "./AuthScreen";

/** Public /login route: shows AuthScreen; once signed in, honors ?next=<path>. */
export function LoginView() {
  const { user, loading } = useAuth();
  const [params] = useSearchParams();

  if (loading) return null;
  if (user) {
    const next = params.get("next");
    // Only allow in-app relative paths to avoid open redirects.
    const dest = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    return <Navigate to={dest} replace />;
  }
  return <AuthScreen />;
}
