import { useState } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Crosshair, Zap, Sword, Target, Skull, Flame } from "lucide-react";
import { weaponArt } from "../artwork";
import { ARMOR_IMG } from "../images";

const CATS = ["melee", "pistol", "smg", "rifle", "shotgun", "sniper", "special"];
const CAT_COLORS = { melee: "#A855F7", pistol: "#38BDF8", smg: "#10B981", rifle: "#22C55E", shotgun: "#F59E0B", sniper: "#F97316", special: "#EF4444" };
const CAT_ICON = { melee: Sword, pistol: Crosshair, smg: Target, rifle: Target, shotgun: Flame, sniper: Skull, special: Zap };

const ARSENAL_BG = "/dashboard/arsenal_banner.png";

export default function Arsenal() {
  const { user, catalog, refresh } = useAuth();
  const [cat, setCat] = useState("pistol");
  const [ammoType, setAmmoType] = useState("pistol");
  const [ammoQty, setAmmoQty] = useState(50);
  if (!catalog) return null;

  const buy = async (w) => { try { await api.post("/player/buy-weapon", { item_id: w.id }); await refresh(); toast.success(`Acquired ${w.name}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const buyArmor = async (a) => { try { await api.post("/player/buy-armor", { item_id: a.id }); await refresh(); toast.success(`Acquired ${a.name}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const buyAmmo = async () => { try { await api.post("/player/buy-ammo", { ammo_type: ammoType, quantity: ammoQty }); await refresh(); toast.success(`+${ammoQty} ${ammoType} ammo`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const heal = async () => { try { const { data } = await api.post("/player/heal"); await refresh(); toast.success(`Healed for $${data.cost}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  const items = catalog.weapons.filter(w => w.cat === cat).sort((a, b) => a.price - b.price);
  const color = CAT_COLORS[cat];
  const Icon = CAT_ICON[cat] || Crosshair;

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div className="hologram-border" style={{ position: "relative", overflow: "hidden", height: 170 }}>
        <img src={ARSENAL_BG} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 30%", opacity: 0.35 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(2,2,4,0.9) 0%, rgba(2,2,4,0.4) 100%)" }} />
        <div style={{ position: "relative", padding: 28, display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
          <div className="label-caps neon-cyan">ARMORY · BLACK MARKET</div>
          <h2 className="font-display" style={{ fontSize: 32, color: "#fff", letterSpacing: "0.1em", margin: "6px 0", fontWeight: 900 }}>ARSENAL</h2>
          <div style={{ color: "#cbd5e1", fontSize: 13, maxWidth: 620 }}>From brutal melee to high-tech firearms. The right weapon makes all the difference.</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {CATS.map(c => (
          <button data-testid={`cat-${c}`} key={c} onClick={() => setCat(c)} className={cat === c ? "btn-primary" : "btn-outline"} style={{ padding: "8px 16px", fontSize: 11, borderColor: cat === c ? undefined : `${CAT_COLORS[c]}55`, color: cat === c ? undefined : CAT_COLORS[c] }}>{c.toUpperCase()}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 }}>
        {items.map(w => {
          const owned = user.weapons.find(x => x.id === w.id);
          const canAfford = user.money >= w.price;
          return (
            <div key={w.id} className="card-glow" style={{ padding: 0, borderColor: `${color}55`, overflow: "hidden" }}>
              <div style={{ height: 140, position: "relative", overflow: "hidden", borderBottom: `1px solid ${color}33`, ...weaponArt(w.id, w.cat) }}>
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, transparent 0%, rgba(3,3,8,0.3) 65%, rgba(5,5,8,0.75) 100%)` }} />
                <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${color}22 0%, transparent 55%)` }} />
              </div>
              <div style={{ padding: 16 }}>
                <div className="font-display" style={{ color, fontSize: 14, fontWeight: 800, letterSpacing: "0.1em" }}>{w.name.toUpperCase()}</div>
                <div style={{ margin: "10px 0", fontSize: 11, color: "#94a3b8", display: "grid", gap: 3 }}>
                  <div>DAMAGE: <span className="font-display" style={{ color: "#fff" }}>{w.damage}</span></div>
                  <div>ACCURACY: <span className="font-display" style={{ color: "#fff" }}>{w.accuracy}</span></div>
                  <div>RELIABILITY: <span className="font-display" style={{ color: "#fff" }}>{w.reliability}</span></div>
                  {w.ammo_type && <div>AMMO: <span style={{ color: "#F59E0B" }}>{w.ammo_type}</span></div>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
                  <div className="font-display neon-gold" style={{ fontSize: 16 }}>{fmtMoney(w.price)}</div>
                  <button data-testid={`buy-${w.id}`} onClick={() => buy(w)} disabled={!canAfford} className="btn-primary" style={{ padding: "8px 14px", fontSize: 11 }}>BUY</button>
                </div>
                {owned && <div style={{ marginTop: 6, fontSize: 10, color: "#10B981", letterSpacing: "0.15em" }}>OWNED × {owned.qty}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-purple" style={{ marginBottom: 12 }}>ARMOR SHOP</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
          {catalog.armors.map(a => (
            <div key={a.id} style={{ padding: 0, border: "1px solid #1a2436", overflow: "hidden" }}>
              {ARMOR_IMG[a.id] && <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
                <img src={ARMOR_IMG[a.id]} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, #08080f 100%)" }} />
              </div>}
              <div style={{ padding: 14 }}>
                <div className="font-display" style={{ color: "#fff", fontSize: 14 }}>{a.name.toUpperCase()}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", margin: "6px 0" }}>-{a.damage_reduction}% damage taken</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className="font-display neon-gold">{fmtMoney(a.price)}</div>
                  <button data-testid={`buy-armor-${a.id}`} onClick={() => buyArmor(a)} disabled={user.money < a.price} className="btn-primary" style={{ padding: "6px 12px", fontSize: 11 }}>BUY</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-gold" style={{ marginBottom: 12 }}>AMMO EXCHANGE</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><div className="label-caps">Type</div><select data-testid="ammo-type" value={ammoType} onChange={e => setAmmoType(e.target.value)}>{Object.keys(catalog.ammo_prices).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
          <div><div className="label-caps">Qty</div><input data-testid="ammo-qty" type="number" min={1} max={5000} value={ammoQty} onChange={e => setAmmoQty(+e.target.value)} style={{ width: 100 }} /></div>
          <div className="font-display neon-gold" style={{ fontSize: 18 }}>{fmtMoney(catalog.ammo_prices[ammoType] * ammoQty)}</div>
          <button data-testid="buy-ammo" onClick={buyAmmo} className="btn-primary">BUY AMMO</button>
        </div>
      </div>

      {user.health < 100 && (
        <div className="card-glow" style={{ padding: 20, borderColor: "rgba(34,197,94,0.4)" }}>
          <div className="label-caps neon-green" style={{ marginBottom: 8 }}>MEDICAL SERVICES</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ color: "#94a3b8", fontSize: 13 }}>Restore HP to 100% · Cost: ${(100 - user.health) * 25}</div>
            <button data-testid="heal-btn" onClick={heal} className="btn-primary" style={{ padding: "8px 14px" }}>HEAL</button>
          </div>
        </div>
      )}
    </div>
  );
}
