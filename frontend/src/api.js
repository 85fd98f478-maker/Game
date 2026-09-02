import axios from "axios";

const BACKEND = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem("tls_token");
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

export function saveToken(t) { localStorage.setItem("tls_token", t); }
export function clearToken() { localStorage.removeItem("tls_token"); }
export function getToken() { return localStorage.getItem("tls_token"); }

export function fmtMoney(n) {
  if (n === null || n === undefined) return "$0";
  return "$" + Number(n).toLocaleString();
}

export function fmtDetail(d) {
  if (d == null) return "Something went wrong.";
  if (typeof d === "string") return d;
  if (Array.isArray(d)) return d.map(e => (e && e.msg) ? e.msg : JSON.stringify(e)).join(" ");
  if (d && d.msg) return d.msg;
  return String(d);
}
