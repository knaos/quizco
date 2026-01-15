import { useState } from "react";
import { GameProvider } from "./contexts/GameContext";
import { HostDashboard } from "./components/HostDashboard";
import { PlayerView } from "./components/PlayerView";
import { AdminPanel } from "./components/AdminPanel";
import { HostLogin } from "./components/HostLogin";

function App() {
  const isHost = window.location.search.includes("host=true");
  const isAdmin = window.location.search.includes("admin=true");
  
  const [hostAuthenticated, setHostAuthenticated] = useState(
    localStorage.getItem("quizco_host_authenticated") === "true"
  );

  const handleHostLogin = (password: string) => {
    // Simple host password for now, can be moved to env/db later
    if (password === "host123") {
      setHostAuthenticated(true);
      localStorage.setItem("quizco_host_authenticated", "true");
    } else {
      alert("Invalid host password");
    }
  };

  return (
    <GameProvider>
      {isAdmin ? (
        <AdminPanel />
      ) : isHost ? (
        hostAuthenticated ? (
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

export default App;
