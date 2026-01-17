import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GameProvider } from "./contexts/GameContext";
import { HostDashboard } from "./components/HostDashboard";
import { PlayerView } from "./components/PlayerView";
import { AdminPanel } from "./components/AdminPanel";
import { HostLogin } from "./components/HostLogin";

function HostRoute({ children }: { children: React.ReactNode }) {
  const { isHostAuthenticated, loginHost } = useAuth();

  if (!isHostAuthenticated) {
    return (
      <HostLogin
        onLogin={(password) => {
          if (!loginHost(password)) {
            alert("Invalid host password");
          }
        }}
      />
    );
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GameProvider>
          <Routes>
            <Route path="/admin" element={<AdminPanel />} />
            <Route
              path="/host"
              element={
                <HostRoute>
                  <HostDashboard />
                </HostRoute>
              }
            />
            <Route path="/play" element={<PlayerView />} />
            <Route path="/" element={<Navigate to="/play" replace />} />
          </Routes>
        </GameProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
