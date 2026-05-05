import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const TOKEN_KEY = "medsafety_token";
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AuthContext = createContext({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {}
    setToken(null);
    setUser(null);
  }, []);

  // Validate token on mount / when it changes
  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const r = await axios.get(`${API}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) {
          setUser(r.data);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          logout();
          setLoading(false);
        }
      }
    }
    setLoading(true);
    check();
    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = useCallback(async (email, password) => {
    const r = await axios.post(`${API}/auth/login`, { email, password });
    const { access_token, user: u } = r.data;
    try {
      localStorage.setItem(TOKEN_KEY, access_token);
    } catch {}
    setToken(access_token);
    setUser(u);
    return u;
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
