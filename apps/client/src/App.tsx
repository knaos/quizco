import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { GameProvider } from "./contexts/GameContext";
import { useAuth } from "./contexts/useAuth";
import { HostDashboard } from "./components/HostDashboard";
import { PlayerView } from "./components/PlayerView";
import { AdminPanel } from "./components/AdminPanel";
import { HostLogin } from "./components/HostLogin";
import { AudienceView } from "./components/audience/AudienceView";
import { JerusalemWallDemo } from "./components/demo/JerusalemWallDemo";

function HostRoute({ children }: { children: React.ReactNode }) {
  const { isHostAuthenticated, loginHost } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (!isHostAuthenticated) {
    return (
      <HostLogin
        error={error}
        onLogin={async (password) => {
          const success = await loginHost(password);
          setError(success ? null : "host.invalid_password");
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
        <Routes>
          <Route path="/admin" element={<AdminPanel />} />
          <Route
            path="/host"
            element={
              <GameProvider>
                <HostRoute>
                  <HostDashboard />
                </HostRoute>
              </GameProvider>
            }
          />
          <Route
            path="/play"
            element={
              <GameProvider>
                <PlayerView />
              </GameProvider>
            }
          />
          <Route
            path="/audience"
            element={
              <GameProvider>
                <AudienceView />
              </GameProvider>
            }
          />
          <Route path="/demo" element={<JerusalemWallDemo />} />
          <Route path="/" element={<Navigate to="/play" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
