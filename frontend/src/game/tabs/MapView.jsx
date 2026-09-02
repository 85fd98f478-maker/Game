import { useAuth } from "../../AuthContext";
import { CITY_MAP_BG } from "../images";

export default function MapView() {
  const { user, catalog } = useAuth();
  if (!catalog) return null;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div>
        <h2 className="font-display" style={{ fontSize: 24, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>NEON CITY MAP</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Build your crew, plan every move carefully, and climb your way through the underworld.</div>
      </div>

      <div className="hologram-border" style={{ position: "relative", overflow: "hidden", height: 240, background: "#05060f" }}>
        <img src="/dashboard/char_select_banner.png" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(2,2,4,0.9) 0%, rgba(2,2,4,0.35) 55%, transparent 100%)" }} />
        <div style={{ position: "relative", padding: 28, display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
          <div className="label-caps neon-cyan">THE LAW OF SILENCE</div>
          <h2 className="font-display" style={{ fontSize: 34, color: "#fff", letterSpacing: "0.1em", margin: "6px 0", fontWeight: 900, textShadow: "0 0 16px rgba(0,240,255,0.5)" }}>NEON CITY</h2>
          <div style={{ color: "#cbd5e1", fontSize: 13, maxWidth: 620 }}>Eight districts. Countless opportunities. Every zone has its own risks and rewards.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12 }}>
        {catalog.districts.slice().sort((a, b) => parseInt(a.level_range) - parseInt(b.level_range)).map(d => {
          const heistsHere = catalog.heists.filter(h => h.district === d.id);
          return (
            <div key={d.id} className="card-glow" data-testid={`district-${d.id}`} style={{ padding: 18, borderLeft: `4px solid ${d.color}` }}>
              <div className="font-display" style={{ color: d.color, fontSize: 16, fontWeight: 800, letterSpacing: "0.1em" }}>{d.name.toUpperCase()}</div>
              <div className="label-caps" style={{ marginTop: 4 }}>LVL {d.level_range}</div>
              <div style={{ marginTop: 10, display: "grid", gap: 3 }}>
                {heistsHere.map(h => (
                  <div key={h.id} style={{ fontSize: 11, color: user.level >= h.min_level ? "#dbe4ee" : "#475569" }}>• {h.name} <span style={{ color: "#64748B" }}>· LVL {h.min_level}+</span></div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
