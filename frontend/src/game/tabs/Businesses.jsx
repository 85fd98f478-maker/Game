import { useState } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { DollarSign, X } from "lucide-react";
import { BUSINESS_IMG } from "../images";
import PaymentSelector from "../PaymentSelector";

export default function Businesses() {
  const { user, catalog, refresh } = useAuth();
  const [modal, setModal] = useState(null);
  const [method, setMethod] = useState("cash");
  const [report, setReport] = useState(null);
  if (!catalog) return null;

  const openBuy = (b) => { setModal(b); setMethod("cash"); };
  const confirmBuy = async () => { try { await api.post("/business/buy", { item_id: modal.id, payment_method: method }); await refresh(); toast.success(`Acquired ${modal.name}`); setModal(null); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const collect = async () => { try { const { data } = await api.post("/business/collect"); await refresh(); setReport(data); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  const dailyIncome = (user.businesses || []).reduce((acc, b) => { const m = catalog.businesses.find((x) => x.id === b.id); return acc + (m?.daily_income || 0); }, 0);

  return (
    <div style={{ display: "grid", gap: 22 }} data-testid="businesses-tab">
      <div>
        <h2 className="font-display" style={{ fontSize: 26, color: "#fff", letterSpacing: "0.1em", marginBottom: 4 }}>BUSINESSES</h2>
        <div style={{ color: "#64748B", fontSize: 13 }}>Legit fronts. Income accrues every 24h. Larger businesses print more — and attract inspectors.</div>
      </div>

      {(user.businesses || []).length > 0 && <div className="card-glow" style={{ padding: 20, borderColor: "rgba(16,185,129,0.4)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="label-caps neon-green">DAILY INCOME</div>
            <div className="font-display neon-green" style={{ fontSize: 26 }}>{fmtMoney(dailyIncome)}/day</div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>Income accrues hourly (cap 48h). Each collect risks an inspection.</div>
          </div>
          <button data-testid="collect-income" onClick={collect} className="btn-primary" style={{ padding: "12px 20px" }}><DollarSign size={14} style={{ display: "inline", marginRight: 4 }} /> COLLECT INCOME</button>
        </div>
      </div>}

      <div>
        <div className="label-caps neon-pink" style={{ marginBottom: 12 }}>BUSINESS OPPORTUNITIES</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 12 }}>
          {catalog.businesses.map((b) => {
            const owned = (user.businesses || []).some((x) => x.id === b.id); const riskPct = Math.round(b.inspection_risk * 100);
            return (
              <div key={b.id} className="card-glow" style={{ padding: 0, overflow: "hidden" }}>
                {BUSINESS_IMG[b.id] && <div style={{ position: "relative", height: 130, overflow: "hidden" }}>
                  <img src={BUSINESS_IMG[b.id]} alt="" loading="lazy" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.85 }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 0%, rgba(3,3,8,0.5) 60%, #08080f 100%)" }} />
                </div>}
                <div style={{ padding: 18 }}>
                  <div className="label-caps" style={{ color: "#EC4899" }}>{b.district.replace("_", " ").toUpperCase()}</div>
                  <div className="font-display" style={{ color: "#fff", fontSize: 16, marginTop: 4 }}>{b.name.toUpperCase()}</div>
                  <div style={{ fontSize: 12, color: "#94a3b8", margin: "10px 0", minHeight: 34 }}>{b.desc}</div>
                  <div style={{ fontSize: 11, color: "#64748B", display: "grid", gap: 3 }}>
                    <div>DAILY: <span className="neon-green">{fmtMoney(b.daily_income)}</span></div>
                    <div>INSPECTION RISK: <span style={{ color: riskPct > 20 ? "#EF4444" : "#F59E0B" }}>{riskPct}%</span></div>
                    <div>FINE RANGE: <span style={{ color: "#EF4444" }}>{fmtMoney(b.fine_min)} – {fmtMoney(b.fine_max)}</span></div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14 }}>
                    <div className="font-display neon-gold">{fmtMoney(b.price)}</div>
                    <button data-testid={`buy-biz-${b.id}`} onClick={() => openBuy(b)} disabled={owned} className="btn-primary" style={{ padding: "8px 12px", fontSize: 11 }}>{owned ? "OWNED" : "BUY"}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {modal && (
        <div onClick={() => setModal(null)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card-glow" data-testid="biz-buy-modal" style={{ padding: 24, maxWidth: 420, width: "100%", background: "#08080f" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}><div className="font-display" style={{ color: "#fff", fontSize: 18 }}>{modal.name.toUpperCase()}</div><button onClick={() => setModal(null)} style={{ color: "#94a3b8" }}><X size={18} /></button></div>
            <div className="font-display neon-gold" style={{ fontSize: 22, marginBottom: 16 }}>{fmtMoney(modal.price)}</div>
            <PaymentSelector allowed={["cash", "bank"]} value={method} onChange={setMethod} price={modal.price} cash={user.money} bank={user.bank} />
            <button data-testid="confirm-buy-biz" onClick={confirmBuy} className="btn-primary" style={{ width: "100%", padding: 12, marginTop: 18 }}>CONFIRM PURCHASE</button>
          </div>
        </div>
      )}

      {report && (
        <div onClick={() => setReport(null)} style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} className="card-glow" data-testid="collect-report" style={{ padding: 24, maxWidth: 480, width: "100%", background: "#08080f", maxHeight: "80vh", overflowY: "auto" }}>
            <div className="font-display" style={{ color: "#fff", fontSize: 20, marginBottom: 6 }}>COLLECTION REPORT</div>
            <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
              <div><div className="label-caps">Income</div><div className="font-display neon-green">{fmtMoney(report.income)}</div></div>
              <div><div className="label-caps">Fines</div><div className="font-display neon-red">{fmtMoney(report.fines)}</div></div>
              <div><div className="label-caps">Net</div><div className="font-display" style={{ color: report.net >= 0 ? "#10B981" : "#EF4444" }}>{fmtMoney(report.net)}</div></div>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {report.events.map((e, i) => (
                <div key={i} style={{ padding: 10, border: `1px solid ${e.type === "inspection" ? "#EF4444" : e.type === "closed" ? "#F59E0B" : "#1a2436"}` }}>
                  <div className="font-display" style={{ color: "#fff", fontSize: 12 }}>{e.biz}{e.result ? ` — ${e.result}` : ""}</div>
                  {e.reason && <div style={{ fontSize: 11, color: "#94a3b8" }}>Reason: {e.reason}</div>}
                  {e.consequence && <div style={{ fontSize: 11, color: "#EF4444" }}>Consequence: {e.consequence}</div>}
                  <div style={{ fontSize: 11, color: "#64748B" }}>{e.msg}</div>
                </div>
              ))}
            </div>
            <button onClick={() => setReport(null)} className="btn-primary" style={{ width: "100%", padding: 12, marginTop: 16 }}>CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
}
