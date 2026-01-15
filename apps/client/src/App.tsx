import { GameProvider } from "./contexts/GameContext";
import { HostDashboard } from "./components/HostDashboard";
import { PlayerView } from "./components/PlayerView";
import { AdminPanel } from "./components/AdminPanel";

function App() {
  const isHost = window.location.search.includes("host=true");
  const isAdmin = window.location.search.includes("admin=true");

  return (
    <GameProvider>
      {isAdmin ? (
        <AdminPanel />
      ) : isHost ? (
        <HostDashboard />
      ) : (
        <PlayerView />
      )}
    </GameProvider>
  );
}

export default App;
