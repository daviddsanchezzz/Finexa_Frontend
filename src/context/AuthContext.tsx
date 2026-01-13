import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { plainApi } from "../api/api";
import { storage } from "../utils/storage";

type User = {
  id: number;
  name: string;
  email: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  hydrated: boolean;
  checkingSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      if (!cancelled) setHydrated(true);

      const refreshToken = await storage.getItem("refresh_token");
      if (!refreshToken) return;

      try {
        if (!cancelled) setCheckingSession(true);

        // Refresh SIN interceptores
        const refreshRes = await plainApi.post("/auth/refresh", { refresh_token: refreshToken });

        const newAccessToken = refreshRes.data?.access_token;
        const newRefreshToken = refreshRes.data?.refresh_token;

        if (!newAccessToken) throw new Error("No access_token");

        await storage.setItem("access_token", newAccessToken);
        if (newRefreshToken) await storage.setItem("refresh_token", newRefreshToken);

        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

        // Cargar usuario
        const meRes = await api.get("/auth/me");
        if (!cancelled) setUser(meRes.data.user);
      } catch {
        await storage.removeItem("access_token");
        await storage.removeItem("refresh_token");
        delete api.defaults.headers.common["Authorization"];
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post("/auth/login", { email, password });
    const { access_token, refresh_token, user } = res.data;

    await storage.setItem("access_token", access_token);
    await storage.setItem("refresh_token", refresh_token);

    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    setUser(user);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout"); // si lo implementas
    } catch {}

    await storage.removeItem("access_token");
    await storage.removeItem("refresh_token");
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, hydrated, checkingSession, login, logout }),
    [user, hydrated, checkingSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
};
