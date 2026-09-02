import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, saveToken, clearToken, getToken } from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      return data;
    } catch { setUser(null); return null; }
  }, []);

  useEffect(() => {
    (async () => {
      if (getToken()) await refresh();
      try { const { data } = await api.get("/catalog"); setCatalog(data); } catch (e) { console.error(e); }
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (email, username, password) => {
    const { data } = await api.post("/auth/signup", { email, username, password });
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => { clearToken(); setUser(null); };

  return (
    <AuthCtx.Provider value={{ user, setUser, loading, catalog, login, signup, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
