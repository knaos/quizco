import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { GameProvider } from "./contexts/GameContext";
import { HostDashboard } from "./components/HostDashboard";
import { PlayerView } from "./components/PlayerView";
import { AdminPanel } from "./components/AdminPanel";
import { HostLogin } from "./components/HostLogin";

function AppContent() {
  const isHost = window.location.search.includes("host=true");
  const isAdmin = window.location.search.includes("admin=true");
  const { isHostAuthenticated, loginHost } = useAuth();

  const handleHostLogin = (password: string) => {
    if (!loginHost(password)) {
      alert("Invalid host password");
    }
  };

  return (
    <GameProvider>
      {isAdmin ? (
        <AdminPanel />
      ) : isHost ? (
        isHostAuthenticated ? (
          <HostDashboard />
        ) : (
          <HostLogin onLogin={handleHostLogin} />
        )
      ) : (
        <PlayerView />
      )}
    </GameProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
