import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Car, Bike, Truck, Zap } from "lucide-react";
import { vehicleArt } from "../artwork";

const CAT_COLORS = { compact: "#A855F7", sport: "#38BDF8", muscle: "#10B981", super: "#22C55E", bike: "#F59E0B", armored: "#EF4444", utility: "#06B6D4", special: "#EC4899" };
const CAT_ICON = { compact: Car, sport: Car, muscle: Car, super: Car, bike: Bike, armored: Truck, utility: Truck, special: Zap };

const REF_BG = "/dashboard/garage_banner.png";

function Stat({ label, value, color }) {
  const pct = Math.min(100, value);
  return (
    <div style={{ marginBottom: 5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#64748B", letterSpacing: "0.2em", marginBottom: 3 }}><span>{label}</span><span style={{ color: "#dbe4ee" }}>{value}</span></div>
      <div className="bar"><div className="bar-fill" style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }} /></div>
    </div>
  );
}

export default function Garage() {
  const { user, catalog, refresh } = useAuth();
  if (!catalog) return null;

  const buy = async (v) => { try { await api.post("/player/buy-vehicle", { item_id: v.id }); await refresh(); toast.success(`Acquired ${v.name}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div className="hologram-border" style={{ position: "relative", overflow: "hidden", height: 170 }}>
        <img src={REF_BG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 70%", opacity: 0.35 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(2,2,4,0.9) 0%, rgba(2,2,4,0.4) 100%)" }} />
        <div style={{ position: "relative", padding: 28, display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
          <div className="label-caps neon-cyan">RIDE IN STYLE</div>
          <h2 className="font-display" style={{ fontSize: 32, color: "#fff", letterSpacing: "0.1em", margin: "6px 0", fontWeight: 900 }}>GARAGE</h2>
          <div style={{ color: "#cbd5e1", fontSize: 13, maxWidth: 620 }}>Fast, loud and built for the streets. Each vehicle has a different utility during operations.</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
        {catalog.vehicles.filter(v => v.price > 0).sort((a, b) => a.price - b.price).map(v => {
          const color = CAT_COLORS[v.cat] || "#00F0FF";
          const Icon = CAT_ICON[v.cat] || Car;
          const owned = user.vehicles.some(x => x.id === v.id);
          return (
            <div key={v.id} className="card-glow" style={{ padding: 0, borderColor: `${color}55`, overflow: "hidden" }}>
              <div style={{ height: 160, position: "relative", overflow: "hidden", borderBottom: `1px solid ${color}33`, ...vehicleArt(v.id, v.cat) }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 0%, rgba(3,3,8,0.25) 65%, rgba(5,5,8,0.75) 100%)` }} />
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${color}22 0%, transparent 55%)` }} />
              </div>
              <div style={{ padding: 16 }}>
                <div className="font-display" style={{ color: "#fff", fontSize: 16, fontWeight: 800, letterSpacing: "0.06em", marginBottom: 4 }}>{v.name.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 10, minHeight: 32 }}>{v.utility}</div>
                <Stat label="SPEED" value={v.speed} color={color} />
                <Stat label="HANDLING" value={v.handling} color={color} />
                <Stat label="ARMOR" value={v.armor} color={color} />
                <Stat label="ESCAPE" value={v.escape} color={color} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginTop: 6 }}><span className="label-caps">CREW CAPACITY</span><span className="font-display" style={{ color: "#00F0FF" }}>{v.capacity} seats</span></div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                  <div><div className="font-display neon-gold" style={{ fontSize: 16 }}>{fmtMoney(v.price)}</div><div style={{ fontSize: 9, color: "#EF4444", letterSpacing: "0.15em" }}>CASH ONLY · ILLEGAL</div></div>
                  <button data-testid={`buy-v-${v.id}`} onClick={() => buy(v)} disabled={user.money < v.price} className="btn-primary" style={{ padding: "8px 14px", fontSize: 11 }}>{user.money < v.price ? "NEED CASH" : "BUY"}</button>
                </div>
                {owned && <div style={{ marginTop: 6, fontSize: 10, color: "#10B981", letterSpacing: "0.15em" }}>OWNED</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
