import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail, fmtMoney } from "../../api";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import PaymentSelector from "../PaymentSelector";

export default function Prison() {
  const { user, refresh } = useAuth();
  const [status, setStatus] = useState(null);
  const [method, setMethod] = useState("cash");
  const [left, setLeft] = useState(0);

  const load = useCallback(async () => { try { const { data } = await api.get("/prison/status"); setStatus(data); if (data.in_prison) setLeft(data.remaining_seconds); if (data.released) await refresh(); } catch {} }, [refresh]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { const t = setInterval(() => setLeft((l) => (l <= 1 ? 0 : l - 1)), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { if (status?.in_prison && left === 0 && status.remaining_seconds > 0) load(); }, [left]); // eslint-disable-line

  const payBail = async () => { try { await api.post("/prison/pay-bail", { payment_method: method }); await refresh(); await load(); toast.success("Bail paid. You are free."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  const fmtTime = (s) => `${Math.floor(s / 60)}m ${s % 60}s`;

  if (!status) return null;

  if (!status.in_prison) {
    return (
      <div style={{ display: "grid", gap: 20 }} data-testid="prison-tab">
        <div><h2 className="font-display" style={{ fontSize: 24, color: "#fff", letterSpacing: "0.1em" }}>PRISON</h2><div style={{ color: "#64748B", fontSize: 13 }}>You are a free operator. Stay sharp — a botched heist can land you here.</div></div>
        <div className="card-glow" style={{ padding: 40, textAlign: "center", color: "#10B981" }}><div className="font-display" style={{ fontSize: 22 }}>NOT INCARCERATED</div><div style={{ color: "#64748B", fontSize: 12, marginTop: 6 }}>All heists available (respecting individual cooldowns).</div></div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="prison-tab">
      <div className="hologram-border card-glow" style={{ padding: 30, borderColor: "rgba(239,68,68,0.5)", position: "relative", overflow: "hidden" }}>
        <img src="/dashboard/bg_prison.png" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(10,5,8,0.85), rgba(2,2,4,0.7))" }} />
        <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <Lock size={26} color="#EF4444" />
          <div className="font-display" style={{ fontSize: 30, color: "#EF4444", letterSpacing: "0.15em", fontWeight: 900 }} data-testid="in-prison">IN PRISON</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 16, marginTop: 16 }}>
          <div><div className="label-caps">TIME REMAINING</div><div className="font-display" style={{ fontSize: 24, color: "#fff" }} data-testid="prison-time">{fmtTime(left)}</div></div>
          <div><div className="label-caps">BAIL PRICE</div><div className="font-display neon-gold" style={{ fontSize: 24 }} data-testid="bail-price">{fmtMoney(status.bail)}</div></div>
          <div><div className="label-caps">REASON FOR ARREST</div><div className="font-display" style={{ fontSize: 16, color: "#EF4444" }} data-testid="prison-reason">{status.reason}</div></div>
        </div>
        <div style={{ marginTop: 16, padding: 12, border: "1px solid rgba(239,68,68,0.3)", color: "#EF4444", fontSize: 12 }}>All heists are locked while you're incarcerated. Pay bail to be released immediately, or wait out your sentence.</div>
        </div>
      </div>

      <div className="card-glow" style={{ padding: 22, maxWidth: 460 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>PAY BAIL</div>
        <PaymentSelector allowed={["cash", "bank"]} value={method} onChange={setMethod} price={status.bail} cash={user.money} bank={user.bank} />
        <button data-testid="pay-bail" onClick={payBail} className="btn-primary" style={{ width: "100%", padding: 12, marginTop: 16 }}>PAY BAIL · {fmtMoney(status.bail)}</button>
      </div>
    </div>
  );
}
