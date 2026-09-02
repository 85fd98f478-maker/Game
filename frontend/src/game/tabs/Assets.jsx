import { useState } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Home as HomeIcon, Building2, Landmark, Shield, DollarSign } from "lucide-react";
import { PROPERTY_IMG, BUSINESS_IMG } from "../images";

export default function Assets() {
  const { user, catalog, refresh } = useAuth();
  const [tab, setTab] = useState("properties");
  const [depAmt, setDepAmt] = useState(1000);
  if (!catalog) return null;

  const buyProp = async (p) => { try { await api.post("/property/buy", { item_id: p.id }); await refresh(); toast.success(`Acquired ${p.name}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const upgrade = async (p) => { try { const { data } = await api.post("/property/upgrade-security", { item_id: p.id }); await refresh(); toast.success(`Security upgraded (-$${data.cost})`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const buyBiz = async (b) => { try { await api.post("/business/buy", { item_id: b.id }); await refresh(); toast.success(`Acquired ${b.name}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const collect = async () => {
    try {
      const { data } = await api.post("/business/collect");
      await refresh();
      if (data.fines > 0) toast.error(`Collected $${data.income} but paid $${data.fines} in fines. Net: $${data.net}`);
      else toast.success(`+$${data.income} collected from businesses.`);
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
  };
  const deposit = async () => { try { const { data } = await api.post("/bank/deposit", { amount: depAmt }); await refresh(); toast.success(`Deposited $${depAmt} · fee $${data.fee} · credited $${data.credited}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const withdraw = async () => { try { const { data } = await api.post("/bank/withdraw", { amount: depAmt }); await refresh(); toast.success(`Withdrew $${depAmt} · fee $${data.fee} · received $${data.received}`); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div>
        <h2 className="font-display" style={{ fontSize: 26, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>ASSETS</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Real estate. Business fronts. Bank. Every asset generates income — or a target.</div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button data-testid="tab-properties" onClick={() => setTab("properties")} className={tab === "properties" ? "btn-primary" : "btn-outline"} style={{ padding: "8px 16px", fontSize: 11 }}><HomeIcon size={12} style={{ display: "inline", marginRight: 6 }} /> PROPERTIES</button>
        <button data-testid="tab-businesses" onClick={() => setTab("businesses")} className={tab === "businesses" ? "btn-primary" : "btn-outline"} style={{ padding: "8px 16px", fontSize: 11 }}><Building2 size={12} style={{ display: "inline", marginRight: 6 }} /> BUSINESSES</button>
        <button data-testid="tab-bank" onClick={() => setTab("bank")} className={tab === "bank" ? "btn-primary" : "btn-outline"} style={{ padding: "8px 16px", fontSize: 11 }}><Landmark size={12} style={{ display: "inline", marginRight: 6 }} /> BANK</button>
      </div>

      {tab === "properties" && <>
        <div className="card-glow" style={{ padding: 20 }}>
          <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>OWNED PROPERTIES · Higher security = safer from PvP raids & police</div>
          {(user.properties || []).length === 0 && <div style={{ color: "#64748B", fontSize: 13 }}>You don't own any properties. Buy one below for storage & defense.</div>}
          <div style={{ display: "grid", gap: 10 }}>
            {(user.properties || []).map(p => {
              const meta = catalog.properties.find(x => x.id === p.id); if (!meta) return null;
              const upCost = Math.floor(p.security * 250 + 2000);
              return (
                <div key={p.instance_id || p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, border: `1px solid ${p.security > 60 ? "#10B981" : p.security > 30 ? "#F59E0B" : "#EF4444"}55` }}>
                  <div>
                    <div className="font-display" style={{ color: "#fff" }}>{meta.name.toUpperCase()}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>Cars {meta.storage_cars} · Weapons {meta.storage_weapons} · Cash Stash ${p.cash_stash || 0}</div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <div style={{ textAlign: "right" }}>
                      <div className="label-caps"><Shield size={10} style={{ display: "inline" }} /> SECURITY</div>
                      <div className="font-display" style={{ color: p.security > 60 ? "#10B981" : p.security > 30 ? "#F59E0B" : "#EF4444", fontSize: 20 }}>{p.security}%</div>
                    </div>
                    <button data-testid={`upgrade-${p.id}`} onClick={() => upgrade(p)} disabled={p.security >= 100 || user.money < upCost} className="btn-outline" style={{ padding: "8px 12px", fontSize: 10 }}>+5% ({fmtMoney(upCost)})</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <div className="label-caps neon-pink" style={{ marginBottom: 12 }}>REAL ESTATE MARKET</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
            {catalog.properties.map(p => {
              const owned = (user.properties || []).some(x => x.id === p.id);
              return (
                <div key={p.id} className="card-glow" style={{ padding: 0, overflow: "hidden" }}>
                  {PROPERTY_IMG[p.id] && <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
                    <img src={PROPERTY_IMG[p.id]} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.9 }} />
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(3,3,8,0.5) 60%, #08080f 100%)" }} />
                    <div style={{ position: "absolute", top: 12, left: 14 }}>
                      <div className="label-caps" style={{ color: "#F59E0B" }}>TIER {p.tier}</div>
                    </div>
                  </div>}
                  <div style={{ padding: 18 }}>
                    <div className="label-caps" style={{ color: "#F59E0B", letterSpacing: "0.2em" }}>{p.district.replace("_", " ").toUpperCase()}</div>
                    <div className="font-display" style={{ color: "#fff", fontSize: 16, marginTop: 4, letterSpacing: "0.06em" }}>{p.name.toUpperCase()}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8", margin: "10px 0", minHeight: 34 }}>{p.desc}</div>
                    <div style={{ fontSize: 11, color: "#64748B", display: "grid", gap: 3 }}>
                      <div>STORAGE: <span style={{ color: "#fff" }}>{p.storage_cars} cars · {p.storage_weapons} weapons</span></div>
                      <div>BASE SECURITY: <span style={{ color: "#fff" }}>{p.security}%</span></div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                      <div className="font-display neon-gold">{fmtMoney(p.price)}</div>
                      <button data-testid={`buy-prop-${p.id}`} onClick={() => buyProp(p)} disabled={owned || user.money < p.price} className="btn-primary" style={{ padding: "8px 12px", fontSize: 11 }}>{owned ? "OWNED" : "BUY"}</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>}

      {tab === "businesses" && <>
        {(user.businesses || []).length > 0 && <div className="card-glow" style={{ padding: 20, borderColor: "rgba(16,185,129,0.4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <div className="label-caps neon-green">DAILY INCOME</div>
              <div className="font-display neon-green" style={{ fontSize: 26 }}>{fmtMoney((user.businesses || []).reduce((acc, b) => { const m = catalog.businesses.find(x => x.id === b.id); return acc + (m?.daily_income || 0); }, 0))}/day</div>
              <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Income accrues hourly. Collect before it caps at 48h.</div>
            </div>
            <button data-testid="collect-income" onClick={collect} className="btn-primary" style={{ padding: "12px 20px" }}><DollarSign size={14} style={{ display: "inline", marginRight: 4 }} /> COLLECT INCOME</button>
          </div>
        </div>}

        <div>
          <div className="label-caps neon-pink" style={{ marginBottom: 12 }}>BUSINESS OPPORTUNITIES · Fronts. Higher risk = higher reward.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
            {catalog.businesses.map(b => {
              const owned = (user.businesses || []).some(x => x.id === b.id);
              const riskPct = Math.round(b.inspection_risk * 100);
              return (
                <div key={b.id} className="card-glow" style={{ padding: 18 }}>
                  <div className="label-caps" style={{ color: "#EC4899" }}>{b.district.replace("_", " ").toUpperCase()}</div>
                  <div className="font-display" style={{ color: "#fff", fontSize: 16, marginTop: 4, letterSpacing: "0.06em" }}>{b.name.toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", margin: "10px 0", minHeight: 34 }}>{b.desc}</div>
                  <div style={{ fontSize: 11, color: "#64748B", display: "grid", gap: 3 }}>
                    <div>DAILY: <span className="neon-green">{fmtMoney(b.daily_income)}</span></div>
                    <div>INSPECTION RISK: <span style={{ color: riskPct > 20 ? "#EF4444" : "#F59E0B" }}>{riskPct}%</span></div>
                    <div>FINE RANGE: <span style={{ color: "#EF4444" }}>{fmtMoney(b.fine_min)} – {fmtMoney(b.fine_max)}</span></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                    <div className="font-display neon-gold">{fmtMoney(b.price)}</div>
                    <button data-testid={`buy-biz-${b.id}`} onClick={() => buyBiz(b)} disabled={owned || user.money < b.price} className="btn-primary" style={{ padding: "8px 12px", fontSize: 11 }}>{owned ? "OWNED" : "BUY"}</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </>}

      {tab === "bank" && <div className="card-glow" style={{ padding: 24 }}>
        <div className="label-caps neon-cyan">NEON CITY BANK</div>
        <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Store cash safely — bank funds can't be stolen in raids. A 10% fee applies to deposits and withdrawals.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 18 }}>
          <div style={{ padding: 16, border: "1px solid #1a2436" }}><div className="label-caps">Cash on hand</div><div className="font-display neon-green" style={{ fontSize: 24 }}>{fmtMoney(user.money)}</div></div>
          <div style={{ padding: 16, border: "1px solid #1a2436" }}><div className="label-caps">Bank Balance</div><div className="font-display neon-cyan" style={{ fontSize: 24 }}>{fmtMoney(user.bank || 0)}</div></div>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><div className="label-caps">Amount</div><input data-testid="bank-amount" type="number" min={1} value={depAmt} onChange={e => setDepAmt(+e.target.value)} style={{ width: 140 }} /></div>
          <button data-testid="bank-deposit" onClick={deposit} className="btn-primary" style={{ padding: "10px 16px" }}>DEPOSIT</button>
          <button data-testid="bank-withdraw" onClick={withdraw} className="btn-outline" style={{ padding: "10px 16px" }}>WITHDRAW</button>
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: "#F59E0B" }} data-testid="bank-fee-preview">
          Fee (10%): {fmtMoney(Math.round((depAmt || 0) * 0.1))} · Deposit credits {fmtMoney((depAmt || 0) - Math.round((depAmt || 0) * 0.1))} to bank · Withdraw returns {fmtMoney((depAmt || 0) - Math.round((depAmt || 0) * 0.1))} cash
        </div>
      </div>}
    </div>
  );
}
