import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./components/AppShell";

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
      <BrowserRouter>
        <RequireAuth>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Placeholder title="Home" />} />
              <Route path="/decks" element={<Placeholder title="Decks" />} />
              <Route path="/games" element={<Placeholder title="Games" />} />
              <Route path="/settings" element={<Placeholder title="Settings" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </RequireAuth>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
