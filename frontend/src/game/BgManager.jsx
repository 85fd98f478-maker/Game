import { useState, useRef } from "react";
import { useAuth } from "../AuthContext";
import { api, fmtDetail } from "../api";
import { toast } from "sonner";
import { X, Image as ImageIcon, Upload, Trash2 } from "lucide-react";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
const SECTIONS = [
  { id: "home", label: "Dashboard" },
  { id: "character", label: "Character" },
  { id: "inventory", label: "Inventory" },
  { id: "arsenal", label: "Arsenal" },
  { id: "garage", label: "Garage" },
  { id: "crew", label: "Crew" },
  { id: "heists", label: "Heists" },
  { id: "assets", label: "Properties" },
  { id: "businesses", label: "Businesses" },
  { id: "pvp", label: "PvP Raids" },
  { id: "map", label: "Map" },
  { id: "progress", label: "Progress" },
];

function toAbs(url) { return url && url.startsWith("/") ? BACKEND + url : url; }

export default function BgManager({ onClose }) {
  const { user, refresh } = useAuth();
  const [busy, setBusy] = useState(null);
  const inputs = useRef({});

  const upload = async (section, file) => {
    if (!file) return;
    setBusy(section);
    try {
      const fd = new FormData();
      fd.append("section", section);
      fd.append("file", file);
      await api.post("/player/upload-bg", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await refresh();
      toast.success(`${section} background updated.`);
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
    finally { setBusy(null); }
  };

  const clear = async (section) => {
    setBusy(section);
    try {
      await api.post("/player/set-bg", { section, url: "" });
      await refresh();
      toast.success(`${section} background reset.`);
    } catch (e) { toast.error(fmtDetail(e.response?.data?.detail)); }
    finally { setBusy(null); }
  };

  const bgs = user.custom_bgs || {};

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="hologram-border" style={{ background: "#050508", padding: 24, maxWidth: 620, width: "100%", maxHeight: "88vh", overflowY: "auto" }} data-testid="bg-manager">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div className="label-caps neon-cyan"><ImageIcon size={12} style={{ display: "inline", marginRight: 6 }} /> UPLOAD BACKGROUNDS</div>
            <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>Upload an image from your computer for each section. Max 5MB · PNG/JPG/WEBP.</div>
          </div>
          <button data-testid="bg-close" onClick={onClose} style={{ color: "#94a3b8" }}><X size={18} /></button>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          {SECTIONS.map(s => {
            const current = bgs[s.id];
            return (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "56px 100px 1fr auto auto", gap: 8, alignItems: "center", padding: "8px 10px", border: "1px solid #1a1a26" }}>
                <div style={{ width: 56, height: 34, background: current ? `url("${toAbs(current)}") center/cover` : "#0a0a12", border: "1px solid #1a1a26" }} />
                <span className="font-display" style={{ fontSize: 11, color: "#fff", letterSpacing: "0.08em" }}>{s.label.toUpperCase()}</span>
                <div style={{ fontSize: 11, color: current ? "#10B981" : "#64748B" }}>{current ? "Custom set" : "Default gradient"}</div>
                <input ref={el => inputs.current[s.id] = el} data-testid={`bg-file-${s.id}`} type="file" accept="image/png,image/jpeg,image/webp,image/gif" style={{ display: "none" }} onChange={e => upload(s.id, e.target.files[0])} />
                <div style={{ display: "flex", gap: 6 }}>
                  <button data-testid={`bg-upload-${s.id}`} onClick={() => inputs.current[s.id]?.click()} disabled={busy === s.id} className="btn-primary" style={{ padding: "6px 10px", fontSize: 10 }}><Upload size={11} style={{ display: "inline", marginRight: 4 }} /> {busy === s.id ? "..." : "UPLOAD"}</button>
                  {current && <button data-testid={`bg-clear-${s.id}`} onClick={() => clear(s.id)} className="btn-outline" style={{ padding: "6px 8px", fontSize: 10, borderColor: "#EF4444", color: "#EF4444" }}><Trash2 size={11} /></button>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
