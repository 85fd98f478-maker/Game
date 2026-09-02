import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { ITEM_IMG_BY_ID, CASH_TIERS, BANK_TIERS, tierImg, WEAPON_ITEM_IMG, WEAPON_IMG, ARMOR_IMG, VEHICLE_ITEM_IMG, VEHICLE_IMG } from "../images";

const weaponImg = (meta) => WEAPON_ITEM_IMG[meta.id] || WEAPON_IMG[meta.cat] || WEAPON_IMG.pistol;
const vehicleImg = (meta) => VEHICLE_ITEM_IMG[meta.id] || VEHICLE_IMG[meta.cat] || VEHICLE_IMG.compact;
const armorImg = (meta) => ARMOR_IMG[meta.id] || ARMOR_IMG.light_armor;
const Thumb = ({ src, size = 56 }) => (
  <div style={{ width: size, height: size, flexShrink: 0, border: "1px solid #1a2436", overflow: "hidden", background: "#05060f" }}>
    <img src={src} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  </div>
);

const SLOTS = ["primary", "secondary", "melee", "armor", "vehicle"];

function MoneyCard({ label, value, tiers, color }) {
  return (
    <div data-testid={`money-${label.toLowerCase()}`} className="card-glow" style={{ padding: 0, overflow: "hidden", borderColor: `${color}55` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16 }}>
        <div style={{ width: 72, height: 72, flexShrink: 0, border: `1px solid ${color}44`, overflow: "hidden", background: "#05060f" }}>
          <img src={tierImg(tiers, value)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <div className="label-caps" style={{ color }}>{label}</div>
          <div className="font-display" style={{ fontSize: 26, color: "#fff", fontWeight: 800 }} data-testid={`money-${label.toLowerCase()}-value`}>{fmtMoney(value)}</div>
        </div>
      </div>
    </div>
  );
}

function ItemStack({ item, qty, onConsume, canConsume, onOpen }) {
  return (
    <div data-testid={`inv-item-${item.id}`} style={{ border: "1px solid #1a2436", padding: 12, display: "grid", gap: 8 }}>
      <div style={{ position: "relative", height: 90, overflow: "hidden", background: "#05060f" }}>
        <img src={ITEM_IMG_BY_ID[item.id]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.8)", border: "1px solid #00F0FF55", color: "#00F0FF", fontFamily: "Orbitron", fontSize: 12, padding: "2px 8px" }} data-testid={`inv-qty-${item.id}`}>×{qty}</div>
      </div>
      <div className="font-display" style={{ color: "#fff", fontSize: 12 }}>{item.name.toUpperCase()}</div>
      {canConsume && <button data-testid={`consume-${item.id}`} onClick={() => onConsume(item)} className="btn-primary" style={{ padding: "6px 10px", fontSize: 10 }}>USE</button>}
      {onOpen && <button data-testid={`open-crate-${item.id}`} onClick={() => onOpen(item)} className="btn-primary" style={{ padding: "6px 10px", fontSize: 10 }}>OPEN CRATE</button>}
    </div>
  );
}

export default function Inventory() {
  const { user, catalog, refresh } = useAuth();
  if (!catalog) return null;

  const allItems = [...catalog.food, ...catalog.drinks, ...catalog.medicine, ...catalog.blackmarket_items];
  const droneMeta = catalog.drones;
  const findItem = (id) => allItems.find((i) => i.id === id) || droneMeta.find((d) => d.id === id);
  const findW = (id) => catalog.weapons.find((w) => w.id === id);
  const findA = (id) => catalog.armors.find((a) => a.id === id);
  const findV = (id) => catalog.vehicles.find((v) => v.id === id);

  const inv = user.inventory || {};
  const drones = user.drones || {};
  const consumableIds = new Set([...catalog.food, ...catalog.drinks, ...catalog.medicine, ...catalog.blackmarket_items.filter((b) => b.type === "bm_medicine")].map((i) => i.id));

  const equip = async (item_id, slot) => { try { await api.post("/player/equip", { item_id, slot }); await refresh(); toast.success("Equipped."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const repair = async (v) => { try { const { data } = await api.post("/player/repair", { vehicle_id: v.id }); await refresh(); toast.success(`Repaired for $${data.cost}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const consume = async (item) => { try { const { data } = await api.post("/inventory/consume", { item_id: item.id }); await refresh(); toast.success(data.message); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const openCrate = async (item) => { try { const { data } = await api.post("/inventory/open-crate", { item_id: item.id }); await refresh(); toast[data.profit >= 0 ? "success" : "error"](data.message); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  const invEntries = Object.entries(inv).filter(([, q]) => q > 0);
  const droneEntries = Object.entries(drones).filter(([, q]) => q > 0);

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="inventory-tab">
      <div>
        <h2 className="font-display" style={{ fontSize: 24, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>INVENTORY</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Everything you own. Consumables reduce in quantity when used.</div>
      </div>

      {/* MONEY VISUALS — Inventory only */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
        <MoneyCard label="CASH" value={user.money} tiers={CASH_TIERS} color="#10B981" />
        <MoneyCard label="BANK" value={user.bank || 0} tiers={BANK_TIERS} color="#38BDF8" />
      </div>

      {/* CONSUMABLES */}
      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>CONSUMABLES</div>
        {invEntries.filter(([id]) => consumableIds.has(id)).length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>No consumables. Buy Food, Drinks or Medicine in the Market.</div> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            {invEntries.filter(([id]) => consumableIds.has(id)).map(([id, q]) => { const it = findItem(id); if (!it) return null; return <ItemStack key={id} item={it} qty={q} canConsume onConsume={consume} />; })}
          </div>}
      </div>

      {/* CONTRABAND / CRATES + DRONES (storage) */}
      {(invEntries.some(([id]) => !consumableIds.has(id)) || droneEntries.length > 0) && (
        <div className="card-glow" style={{ padding: 20 }}>
          <div className="label-caps neon-pink" style={{ marginBottom: 12 }}>GEAR · CRATES · DRONES</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 }}>
            {invEntries.filter(([id]) => !consumableIds.has(id)).map(([id, q]) => { const it = findItem(id); if (!it) return null; return <ItemStack key={id} item={it} qty={q} canConsume={false} onOpen={it.type === "crate" ? openCrate : undefined} />; })}
            {droneEntries.map(([id, q]) => { const it = findItem(id); if (!it) return null; return <ItemStack key={id} item={it} qty={q} canConsume={false} />; })}
          </div>
        </div>
      )}

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>EQUIPPED LOADOUT</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 12 }}>
          {SLOTS.map((s) => {
            const id = user.equipped[s];
            let item = s === "armor" ? findA(id) : s === "vehicle" ? findV(id) : findW(id);
            const img = item ? (s === "armor" ? armorImg(item) : s === "vehicle" ? vehicleImg(item) : weaponImg(item)) : null;
            return (
              <div key={s} data-testid={`slot-${s}`} style={{ border: "1px solid #1a2436", padding: 14, background: id ? "rgba(0,240,255,0.04)" : "transparent", display: "flex", alignItems: "center", gap: 12 }}>
                {img ? <Thumb src={img} size={48} /> : <div style={{ width: 48, height: 48, flexShrink: 0, border: "1px dashed #1a2436", background: "#05060f" }} />}
                <div>
                  <div className="label-caps neon-pink">{s.toUpperCase()}</div>
                  <div className="font-display" style={{ fontSize: 14, color: id ? "#fff" : "#475569", marginTop: 4 }}>{item ? item.name.toUpperCase() : "— EMPTY —"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>WEAPONS OWNED</div>
        {user.weapons.length === 0 && <div style={{ color: "#64748B", fontSize: 13 }}>No weapons yet. Visit Arsenal.</div>}
        <div style={{ display: "grid", gap: 8 }}>
          {user.weapons.map((w) => {
            const meta = findW(w.id); if (!meta) return null;
            const equipped = user.equipped[meta.slot] === w.id;
            return (
              <div key={w.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, border: `1px solid ${equipped ? "rgba(0,240,255,0.5)" : "#1a2436"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Thumb src={weaponImg(meta)} />
                  <div>
                    <div className="font-display" style={{ color: "#fff", fontSize: 14 }}>{meta.name} <span style={{ color: "#64748B", fontSize: 11 }}>× {w.qty}</span></div>
                    <div style={{ fontSize: 11, color: "#94a3b8" }}>DMG {meta.damage} · ACC {meta.accuracy} · REL {meta.reliability}</div>
                  </div>
                </div>
                <button data-testid={`equip-w-${w.id}`} onClick={() => equip(w.id, meta.slot)} className={equipped ? "btn-outline" : "btn-primary"} style={{ padding: "8px 14px", fontSize: 11 }} disabled={equipped}>{equipped ? "EQUIPPED" : "EQUIP"}</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>ARMOR OWNED</div>
        {user.armors.length === 0 && <div style={{ color: "#64748B", fontSize: 13 }}>No armor yet. Visit Arsenal.</div>}
        <div style={{ display: "grid", gap: 8 }}>
          {user.armors.map((a) => {
            const meta = findA(a.id); if (!meta) return null; const eq = user.equipped.armor === a.id;
            return (
              <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, border: `1px solid ${eq ? "rgba(0,240,255,0.5)" : "#1a2436"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Thumb src={armorImg(meta)} /><div><div className="font-display" style={{ color: "#fff" }}>{meta.name} × {a.qty}</div><div style={{ fontSize: 11, color: "#94a3b8" }}>-{meta.damage_reduction}% damage taken</div></div></div>
                <button data-testid={`equip-a-${a.id}`} onClick={() => equip(a.id, "armor")} className={eq ? "btn-outline" : "btn-primary"} style={{ padding: "8px 14px", fontSize: 11 }} disabled={eq}>{eq ? "EQUIPPED" : "EQUIP"}</button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>VEHICLES OWNED</div>
        <div style={{ display: "grid", gap: 8 }}>
          {user.vehicles.map((v) => {
            const meta = findV(v.id); if (!meta) return null; const eq = user.equipped.vehicle === v.id; const dmg = 100 - v.condition;
            return (
              <div key={v.instance_id || v.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, border: `1px solid ${eq ? "rgba(0,240,255,0.5)" : "#1a2436"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Thumb src={vehicleImg(meta)} size={64} />
                  <div>
                  <div className="font-display" style={{ color: "#fff" }}>{meta.name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>SPD {meta.speed} · ESC {meta.escape} · SEATS {meta.capacity}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                    <span className="label-caps" style={{ fontSize: 9, color: v.condition > 60 ? "#10B981" : v.condition > 30 ? "#F59E0B" : "#EF4444" }}>DURABILITY {v.condition}%</span>
                    <div style={{ width: 120, height: 5, background: "#0a0a12" }}><div style={{ width: `${v.condition}%`, height: "100%", background: v.condition > 60 ? "#10B981" : v.condition > 30 ? "#F59E0B" : "#EF4444" }} /></div>
                    <span style={{ fontSize: 9, color: "#64748B" }}>max {meta.max_durability}</span>
                  </div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {dmg > 0 && <button data-testid={`repair-${v.id}`} onClick={() => repair(v)} className="btn-outline" style={{ padding: "8px 14px", fontSize: 11 }}>REPAIR (${dmg * 50})</button>}
                  <button data-testid={`equip-v-${v.id}`} onClick={() => equip(v.id, "vehicle")} className={eq ? "btn-outline" : "btn-primary"} style={{ padding: "8px 14px", fontSize: 11 }} disabled={eq}>{eq ? "IN USE" : "USE"}</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>AMMUNITION</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 10 }}>
          {Object.entries(user.ammo).map(([k, v]) => (
            <div key={k} style={{ padding: 12, border: "1px solid #1a2436" }}>
              <div className="label-caps">{k}</div>
              <div className="font-display" style={{ fontSize: 20, color: v > 0 ? "#fff" : "#475569" }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
