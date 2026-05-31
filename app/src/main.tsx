import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./components/AppShell";
import { ToastProvider } from "./components/Toast";
import { DecksView } from "./features/decks/DecksView";
import { BuilderView } from "./features/decks/BuilderView";
import { LobbyNewView } from "./features/lobby/LobbyNewView";
import { LobbyView } from "./features/lobby/LobbyView";
import { GameView } from "./features/game/GameView";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="empty-state" style={{ flex: 1, display: "flex" }}>
      <div className="empty-title">{title}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <RequireAuth>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<Placeholder title="Home" />} />
                <Route path="/decks" element={<DecksView />} />
                <Route path="/decks/new" element={<BuilderView />} />
                <Route path="/decks/:deckId" element={<BuilderView />} />
                <Route path="/games" element={<Placeholder title="Games" />} />
                <Route path="/lobby/new" element={<LobbyNewView />} />
                <Route path="/lobby/:gameId" element={<LobbyView />} />
                <Route path="/games/:gameId" element={<GameView />} />
                <Route path="/settings" element={<Placeholder title="Settings" />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </RequireAuth>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
