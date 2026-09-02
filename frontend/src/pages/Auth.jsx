import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { fmtDetail } from "../api";
import { toast } from "sonner";

export default function AuthPage() {
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("signup");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = mode === "signup"
        ? await signup(email, username, password)
        : await login(email, password);
      toast.success(mode === "signup" ? "Profile created. Welcome to Neon City." : "Access granted.");
      nav(user.specialization ? "/game" : "/character-select");
    } catch (err) {
      toast.error(fmtDetail(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="grid-bg" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ maxWidth: 460, width: "100%" }} className="fade-in-up">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="label-caps neon-cyan" style={{ marginBottom: 6 }}>ONLINE CRIME NETWORK</div>
          <h1 className="font-display" style={{ margin: 0, fontSize: 36, fontWeight: 900, color: "#fff", letterSpacing: "0.12em" }}>
            THE LAW OF <span style={{ background: "linear-gradient(90deg,#00F0FF,#EC4899,#A855F7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>SILENCE</span>
          </h1>
          <div style={{ color: "#64748B", fontSize: 13, marginTop: 8, letterSpacing: "0.15em", textTransform: "uppercase" }}>Build your criminal empire</div>
        </div>

        <div className="hologram-border card-glow" style={{ padding: 28 }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
            <button data-testid="auth-tab-signup" onClick={() => setMode("signup")} className={mode === "signup" ? "btn-primary" : "btn-outline"} style={{ flex: 1 }}>Create Profile</button>
            <button data-testid="auth-tab-login" onClick={() => setMode("login")} className={mode === "login" ? "btn-primary" : "btn-outline"} style={{ flex: 1 }}>Sign In</button>
          </div>

          <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
            <div>
              <div className="label-caps" style={{ marginBottom: 6 }}>Email</div>
              <input data-testid="auth-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@neoncity.io" style={{ width: "100%" }} />
            </div>
            {mode === "signup" && (
              <div>
                <div className="label-caps" style={{ marginBottom: 6 }}>Username</div>
                <input data-testid="auth-username" required minLength={3} maxLength={20} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="NYX" style={{ width: "100%" }} />
              </div>
            )}
            <div>
              <div className="label-caps" style={{ marginBottom: 6 }}>Password</div>
              <input data-testid="auth-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ width: "100%" }} />
            </div>
            <button data-testid="auth-submit" type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 8 }}>
              {loading ? "..." : (mode === "signup" ? "Create Profile" : "Enter The City")}
            </button>
          </form>

          <div style={{ marginTop: 20, fontSize: 11, color: "#475569", textAlign: "center", letterSpacing: "0.1em" }}>
            NO NEW GAME · NO CONTINUE · YOUR PROGRESS BELONGS TO YOUR ACCOUNT
          </div>
        </div>
      </div>
    </div>
  );
}
