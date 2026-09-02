import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import AuthPage from "./pages/Auth";
import CharacterSelect from "./pages/CharacterSelect";
import Game from "./pages/Game";
import { Toaster } from "sonner";

function Shell() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
      <div className="font-display neon-cyan" style={{ letterSpacing: "0.4em", fontSize: 14 }}>LOADING NEON CITY...</div>
    </div>
  );

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to={user.specialization ? "/game" : "/character-select"} /> : <AuthPage />} />
      <Route path="/character-select" element={!user ? <Navigate to="/auth" /> : user.specialization ? <Navigate to="/game" /> : <CharacterSelect />} />
      <Route path="/game/*" element={!user ? <Navigate to="/auth" /> : !user.specialization ? <Navigate to="/character-select" /> : <Game />} />
      <Route path="*" element={<Navigate to="/auth" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Shell />
        </BrowserRouter>
        <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: "#09090e", border: "1px solid #1a2436", color: "#e6eef8", fontFamily: "Rajdhani" }}} />
      </AuthProvider>
    </div>
  );
}
