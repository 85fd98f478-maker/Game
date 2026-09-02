import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { api, fmtDetail } from "../api";
import { toast } from "sonner";
import { User, Ghost, Skull, Wrench, Crown, EyeOff, Shield, Sword, Zap, Flame } from "lucide-react";
import { characterArt } from "../game/artwork";

// Codename here and portrait art in game/images.js (CHARACTER_IMG) are both
// keyed by this stable `id` (av_1..av_12), never by name — so they can't
// desync even if a codename or archetype comment changes. Keep new avatars
// added to BOTH lists using the same next av_N id.
const AVATARS = [
  { id: "av_1", name: "Razor", color: "#A855F7", Icon: User },
  { id: "av_2", name: "Ghost", color: "#00F0FF", Icon: Ghost },
  { id: "av_3", name: "Viper", color: "#EF4444", Icon: Skull },
  { id: "av_4", name: "Spark", color: "#10B981", Icon: Wrench },
  { id: "av_5", name: "Midas", color: "#F59E0B", Icon: Crown },
  { id: "av_6", name: "Wraith", color: "#EC4899", Icon: EyeOff },
  { id: "av_7", name: "Nova", color: "#A855F7", Icon: Zap },
  { id: "av_8", name: "Valkyrie", color: "#38BDF8", Icon: Shield },
  { id: "av_9", name: "Sable", color: "#F59E0B", Icon: Sword },
  { id: "av_10", name: "Bloodthirst", color: "#EF4444", Icon: Flame },
  { id: "av_11", name: "Revenant", color: "#38BDF8", Icon: Ghost },
  { id: "av_12", name: "Overlord", color: "#F59E0B", Icon: Crown },
];

const REF_IMG = "/dashboard/char_select_banner.png";

export default function CharacterSelect() {
  const { catalog, setUser } = useAuth();
  const nav = useNavigate();
  const [avatar, setAvatar] = useState(null);
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(false);

  const specs = catalog?.specializations || [];

  const create = async () => {
    if (!avatar || !spec) { toast.error("Choose avatar and specialization."); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/character/create", { avatar_id: avatar, specialization: spec });
      setUser(data);
      toast.success("Character created. Entering Neon City...");
      nav("/game");
    } catch (err) { toast.error(fmtDetail(err.response?.data?.detail) || err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#020204" }}>
      <div style={{ position: "relative", height: 320, overflow: "hidden", borderBottom: "1px solid rgba(0,240,255,0.35)" }}>
        <img src={REF_IMG} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 78%", opacity: 0.85 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(2,2,4,0.35) 0%, transparent 35%, rgba(2,2,4,0.85) 100%)" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 20% 0%, rgba(0,240,255,0.12) 0%, transparent 55%)" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "flex-end", padding: "0 44px 34px" }}>
          <div>
            <div className="font-display" style={{ fontSize: 38, fontWeight: 900, letterSpacing: "0.32em", lineHeight: 1, color: "#EC4899", textShadow: "0 0 14px rgba(236,72,153,0.95), 0 0 32px rgba(236,72,153,0.55)" }}>NEON CITY</div>
            <h1 className="font-display" style={{ fontSize: 58, margin: "8px 0 0", fontWeight: 900, letterSpacing: "0.08em", lineHeight: 1.02, background: "linear-gradient(90deg,#00F0FF 0%,#A855F7 38%,#EC4899 72%,#F59E0B 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 16px rgba(236,72,153,0.75)) drop-shadow(0 0 42px rgba(0,240,255,0.55))" }}>THE LAW OF SILENCE</h1>
            <div className="font-display" style={{ fontSize: 18, marginTop: 16, color: "#fff", letterSpacing: "0.32em", fontWeight: 800, textShadow: "0 0 12px rgba(168,85,247,0.6)" }}>CHARACTER <span style={{ color: "#EC4899" }}>SELECT</span></div>
            <div style={{ color: "#94a3b8", fontSize: 13, maxWidth: 620, marginTop: 8 }}>Pick your fighter. Every path is different. Every choice matters. No one owns you. The city is yours.</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 20px 80px" }} className="fade-in-up">
        <div style={{ marginBottom: 36 }}>
          <div className="label-caps" style={{ marginBottom: 14 }}>AVATAR · APPEARANCE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14 }}>
            {AVATARS.map(a => {
              const Icon = a.Icon;
              const selected = avatar === a.id;
              return (
                <button data-testid={`avatar-${a.id}`} key={a.id} onClick={() => setAvatar(a.id)} className="card-glow" style={{ padding: 0, textAlign: "left", borderColor: selected ? a.color : undefined, boxShadow: selected ? `0 0 24px ${a.color}66` : undefined, overflow: "hidden" }}>
                  <div style={{ height: 260, position: "relative", overflow: "hidden", borderBottom: `1px solid ${a.color}33`, ...characterArt(a.id) }}>
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 50%, rgba(3,3,8,0.6) 100%)` }} />
                    <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${a.color}22 0%, transparent 60%)` }} />
                  </div>
                  <div style={{ padding: 14, display: "flex", alignItems: "center", gap: 8 }}>
                    <Icon size={15} color={a.color} style={{ filter: `drop-shadow(0 0 5px ${a.color}aa)` }} />
                    <div className="font-display" style={{ fontSize: 15, color: "#fff", fontWeight: 800, letterSpacing: "0.1em" }}>{a.name.toUpperCase()}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div className="label-caps" style={{ marginBottom: 14 }}>SPECIALIZATION · YOUR EDGE</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
            {specs.map(s => (
              <button data-testid={`spec-${s.id}`} key={s.id} onClick={() => setSpec(s.id)} className="card-glow" style={{ padding: 24, textAlign: "left", borderColor: spec === s.id ? s.color : undefined, boxShadow: spec === s.id ? `0 0 24px ${s.color}55` : undefined, minHeight: 180 }}>
                <div className="font-display" style={{ fontSize: 24, fontWeight: 900, color: s.color, letterSpacing: "0.12em", marginBottom: 8 }}>{s.name.toUpperCase()}</div>
                <div style={{ height: 2, width: 42, background: s.color, marginBottom: 14, boxShadow: `0 0 12px ${s.color}` }}></div>
                <div style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 1.55 }}>{s.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 44, display: "flex", justifyContent: "center" }}>
          <button data-testid="create-character" onClick={create} disabled={!avatar || !spec || loading} className="btn-primary" style={{ padding: "18px 56px", fontSize: 14 }}>
            {loading ? "..." : "ENTER NEON CITY →"}
          </button>
        </div>
      </div>
    </div>
  );
}
