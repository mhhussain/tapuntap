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
import { HomeView } from "./features/home/HomeView";
import { GamesView } from "./features/games/GamesView";
import { EndGameView } from "./features/game/endgame/EndGameView";
import { SettingsView } from "./features/settings/SettingsView";
import { PlaytestListView } from "./features/playtest/PlaytestListView";
import { PlaytestNewView } from "./features/playtest/PlaytestNewView";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <RequireAuth>
            <Routes>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomeView />} />
                <Route path="/decks" element={<DecksView />} />
                <Route path="/decks/new" element={<BuilderView />} />
                <Route path="/decks/:deckId" element={<BuilderView />} />
                <Route path="/games" element={<GamesView />} />
                <Route path="/lobby/new" element={<LobbyNewView />} />
                <Route path="/lobby/:gameId" element={<LobbyView />} />
                <Route path="/games/:gameId" element={<GameView />} />
                <Route path="/games/:gameId/end" element={<EndGameView />} />
                <Route path="/playtest" element={<PlaytestListView />} />
                <Route path="/playtest/new" element={<PlaytestNewView />} />
                <Route path="/settings" element={<SettingsView />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </RequireAuth>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  </React.StrictMode>
);
