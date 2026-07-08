// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { RequireAuth } from "../auth/RequireAuth";
import { LoginView } from "../auth/LoginView";
import { LandingView } from "../features/landing/LandingView";

const mockAuth = vi.hoisted(() => ({ current: { user: null as unknown, loading: false } }));

vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({
    ...mockAuth.current,
    signInGoogle: vi.fn(),
    signInEmail: vi.fn(),
    signUpEmail: vi.fn(),
  }),
}));

function LocationProbe({ label }: { label: string }) {
  const loc = useLocation();
  return <div data-testid={label}>{loc.pathname + loc.search}</div>;
}

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/welcome" element={<><LandingView /><LocationProbe label="loc" /></>} />
        <Route path="/login" element={<><LoginView /><LocationProbe label="loc" /></>} />
        <Route
          path="*"
          element={
            <RequireAuth>
              <div data-testid="app" />
              <LocationProbe label="loc" />
            </RequireAuth>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(() => {
  cleanup();
  mockAuth.current = { user: null, loading: false };
});

describe("route guards", () => {
  it("signed-out visitor to / lands on /welcome", () => {
    renderApp("/");
    expect(screen.getByTestId("loc").textContent).toBe("/welcome");
  });

  it("signed-out deep link redirects to /login with next", () => {
    renderApp("/games/abc");
    expect(screen.getByTestId("loc").textContent).toBe("/login?next=%2Fgames%2Fabc");
  });

  it("after sign-in, /login honors next param", () => {
    mockAuth.current = { user: { uid: "u1" }, loading: false };
    renderApp("/login?next=%2Fgames%2Fabc");
    expect(screen.getByTestId("loc").textContent).toBe("/games/abc");
  });

  it("/login rejects external next values", () => {
    mockAuth.current = { user: { uid: "u1" }, loading: false };
    renderApp("/login?next=//evil.example");
    expect(screen.getByTestId("loc").textContent).toBe("/");
  });

  it("signed-in visitor to /welcome redirects to /", () => {
    mockAuth.current = { user: { uid: "u1" }, loading: false };
    renderApp("/welcome");
    expect(screen.getByTestId("app")).toBeInTheDocument();
  });

  it("signed-in user reaches protected routes", () => {
    mockAuth.current = { user: { uid: "u1" }, loading: false };
    renderApp("/decks");
    expect(screen.getByTestId("app")).toBeInTheDocument();
    expect(screen.getByTestId("loc").textContent).toBe("/decks");
  });
});
