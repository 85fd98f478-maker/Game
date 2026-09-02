import { useEffect, useState, useCallback } from "react";
import { useAuth } from "../../AuthContext";
import { api, fmtDetail } from "../../api";
import { toast } from "sonner";
import { Crown, Shield, Ghost, Crosshair, LogOut, X } from "lucide-react";
import { ITEM_IMG_BY_ID } from "../images";

const RANK_META = {
  "Neon King": { icon: Crown, color: "#F59E0B" },
  "GridMaster": { icon: Shield, color: "#A855F7" },
  "Hitman": { icon: Crosshair, color: "#EF4444" },
  "Ghost": { icon: Ghost, color: "#38BDF8" },
};

export default function Gang() {
  const { user, catalog, refresh } = useAuth();
  const [gang, setGang] = useState(null);
  const [invites, setInvites] = useState([]);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [maxM, setMaxM] = useState(20);
  const [inviteName, setInviteName] = useState("");
  const [depItem, setDepItem] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try { const { data } = await api.get("/gang"); setGang(data.gang); } catch {}
    try { const { data } = await api.get("/gang/invites"); setInvites(data); } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => { try { await api.post("/gang/create", { name, description: desc, max_members: +maxM }); await refresh(); await load(); toast.success("Gang created — you are the Neon King."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const respond = async (id, accept) => { try { await api.post("/gang/invite/respond", { request_id: id, accept }); await refresh(); await load(); toast.success(accept ? "Joined gang." : "Declined."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const invite = async () => { try { await api.post("/gang/invite", { username: inviteName }); toast.success(`Invite sent to ${inviteName}`); setInviteName(""); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const setRole = async (uid, role) => { try { const { data } = await api.post("/gang/set-role", { user_id: uid, role }); setGang(data.gang); toast.success("Role updated."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const kick = async (uid) => { try { await api.post("/gang/kick", { user_id: uid }); await load(); toast.success("Member removed."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const leave = async () => { try { await api.post("/gang/leave"); await refresh(); await load(); toast.success("Left gang."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const deposit = async () => { if (!depItem) return; try { await api.post("/gang/inventory/deposit", { item_id: depItem, quantity: 1 }); await refresh(); await load(); toast.success("Deposited."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };
  const withdraw = async (id) => { try { await api.post("/gang/inventory/withdraw", { item_id: id, quantity: 1 }); await refresh(); await load(); toast.success("Withdrew."); } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); } };

  if (loading || !catalog) return null;
  const itemName = (id) => catalog ? [...catalog.food, ...catalog.drinks, ...catalog.medicine, ...catalog.blackmarket_items, ...catalog.drones].find((i) => i.id === id)?.name || id : id;
  const myInvOptions = Object.entries(user.inventory || {}).filter(([, q]) => q > 0);

  if (!gang) {
    return (
      <div style={{ display: "grid", gap: 20 }} data-testid="gang-tab">
        <div><h2 className="font-display" style={{ fontSize: 24, color: "#fff", letterSpacing: "0.1em" }}>GANG</h2><div style={{ color: "#64748B", fontSize: 13 }}>Form a crew of real players. Rank up from Ghost to Hitman, GridMaster and Neon King.</div></div>
        {invites.length > 0 && <div className="card-glow" style={{ padding: 18 }}>
          <div className="label-caps neon-cyan" style={{ marginBottom: 10 }}>GANG INVITES</div>
          {invites.map((inv) => <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 10, border: "1px solid #1a2436", marginBottom: 6 }}>
            <div style={{ color: "#fff" }}>{inv.gang_name} <span style={{ color: "#64748B", fontSize: 11 }}>· from {inv.from_username}</span></div>
            <div style={{ display: "flex", gap: 6 }}><button data-testid={`accept-gang-${inv.id}`} onClick={() => respond(inv.id, true)} className="btn-primary" style={{ padding: "5px 12px", fontSize: 11 }}>ACCEPT</button><button onClick={() => respond(inv.id, false)} className="btn-outline" style={{ padding: "5px 12px", fontSize: 11 }}>DECLINE</button></div>
          </div>)}
        </div>}
        <div className="card-glow" style={{ padding: 22, maxWidth: 460 }}>
          <div className="label-caps neon-pink" style={{ marginBottom: 12 }}>CREATE A GANG</div>
          <div style={{ display: "grid", gap: 10 }}>
            <input data-testid="gang-name" placeholder="Gang name" value={name} onChange={(e) => setName(e.target.value)} />
            <input data-testid="gang-desc" placeholder="Description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><span className="label-caps">MAX MEMBERS</span><input data-testid="gang-max" type="number" min={2} max={50} value={maxM} onChange={(e) => setMaxM(e.target.value)} style={{ width: 90 }} /></div>
            <button data-testid="create-gang" onClick={create} disabled={name.length < 3} className="btn-primary" style={{ padding: 12 }}>CREATE GANG</button>
          </div>
        </div>
      </div>
    );
  }

  const me = gang.members.find((m) => m.user_id === user.id);
  const canInvite = me?.permissions?.invite;
  const isLeader = gang.leader_id === user.id;

  return (
    <div style={{ display: "grid", gap: 20 }} data-testid="gang-tab">
      <div style={{ position: "relative", overflow: "hidden", height: 130, border: "1px solid rgba(168,85,247,0.35)" }} data-testid="gang-banner">
        <img src="/dashboard/bg_gang.png" alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.5 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(2,2,4,0.9) 0%, rgba(2,2,4,0.25) 100%)" }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 className="font-display" style={{ fontSize: 26, color: "#fff", letterSpacing: "0.1em" }}>{gang.name.toUpperCase()}</h2>
          <div style={{ color: "#64748B", fontSize: 13 }}>{gang.description || "No description"} · {gang.member_count}/{gang.max_members} members · Earnings {gang.earnings.toLocaleString()}</div>
        </div>
        <button data-testid="leave-gang" onClick={leave} className="btn-outline" style={{ padding: "8px 14px", fontSize: 11, borderColor: "#EF4444", color: "#EF4444" }}><LogOut size={13} style={{ display: "inline", marginRight: 4 }} /> {isLeader ? "DISBAND" : "LEAVE"}</button>
      </div>

      {canInvite && <div className="card-glow" style={{ padding: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input data-testid="gang-invite-name" placeholder="Invite by username" value={inviteName} onChange={(e) => setInviteName(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        <button data-testid="gang-invite-btn" onClick={invite} disabled={!inviteName} className="btn-primary" style={{ padding: "10px 16px", fontSize: 11 }}>SEND INVITE</button>
      </div>}

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-cyan" style={{ marginBottom: 12 }}>MEMBERS</div>
        <div style={{ display: "grid", gap: 8 }}>
          {gang.members.map((m) => {
            const rm = RANK_META[m.rank] || RANK_META.Ghost; const RI = rm.icon;
            return (
              <div key={m.user_id} data-testid={`gang-member-${m.username}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 12, border: "1px solid #1a2436" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <RI size={16} color={rm.color} />
                  <div>
                    <div className="font-display" style={{ color: "#fff", fontSize: 14 }}>{m.username} <span style={{ fontSize: 10, color: m.online ? "#10B981" : "#64748B" }}>{m.online ? "● ONLINE" : "○ OFFLINE"}</span></div>
                    <div className="label-caps" style={{ color: rm.color }}>{m.rank} · LVL {m.level} · {m.gang_heists} gang heists</div>
                  </div>
                </div>
                {isLeader && m.user_id !== user.id && <div style={{ display: "flex", gap: 6 }}>
                  {m.rank !== "GridMaster" ? <button data-testid={`promote-${m.username}`} onClick={() => setRole(m.user_id, "gridmaster")} className="btn-outline" style={{ padding: "4px 8px", fontSize: 9 }}>MAKE GRIDMASTER</button> : <button onClick={() => setRole(m.user_id, "member")} className="btn-outline" style={{ padding: "4px 8px", fontSize: 9 }}>DEMOTE</button>}
                  <button data-testid={`kick-${m.username}`} onClick={() => kick(m.user_id)} className="btn-outline" style={{ padding: "4px 8px", fontSize: 9, borderColor: "#EF4444", color: "#EF4444" }}>KICK</button>
                </div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card-glow" style={{ padding: 20 }}>
        <div className="label-caps neon-pink" style={{ marginBottom: 12 }}>GANG INVENTORY (shared)</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          <select data-testid="gang-dep-select" value={depItem} onChange={(e) => setDepItem(e.target.value)} style={{ flex: 1, minWidth: 180, background: "#05060f", border: "1px solid #1a2436", color: "#fff", padding: 8 }}>
            <option value="">Deposit from your inventory…</option>
            {myInvOptions.map(([id, q]) => <option key={id} value={id}>{itemName(id)} (×{q})</option>)}
          </select>
          <button data-testid="gang-deposit" onClick={deposit} disabled={!depItem} className="btn-primary" style={{ padding: "10px 16px", fontSize: 11 }}>DEPOSIT</button>
        </div>
        {Object.entries(gang.inventory || {}).filter(([, q]) => q > 0).length === 0 ? <div style={{ color: "#64748B", fontSize: 13 }}>Gang stash is empty.</div> :
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 10 }}>
            {Object.entries(gang.inventory).filter(([, q]) => q > 0).map(([id, q]) => (
              <div key={id} data-testid={`gang-inv-${id}`} style={{ border: "1px solid #1a2436", padding: 10 }}>
                <div style={{ position: "relative", height: 80, overflow: "hidden", background: "#05060f" }}>
                  <img src={ITEM_IMG_BY_ID[id]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.8)", border: "1px solid #00F0FF55", color: "#00F0FF", fontFamily: "Orbitron", fontSize: 12, padding: "2px 8px" }}>×{q}</div>
                </div>
                <div className="font-display" style={{ color: "#fff", fontSize: 11, margin: "6px 0" }}>{itemName(id).toUpperCase()}</div>
                {me?.permissions?.manage_inventory && <button data-testid={`gang-withdraw-${id}`} onClick={() => withdraw(id)} className="btn-outline" style={{ padding: "5px 8px", fontSize: 9, width: "100%" }}>WITHDRAW</button>}
              </div>
            ))}
          </div>}
      </div>
    </div>
  );
}
