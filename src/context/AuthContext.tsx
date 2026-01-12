import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/api";
import { storage } from "../utils/storage";

type User = {
  id: number;
  name: string;
  email: string;
  avatar: string;
};

type AuthContextType = {
  user: User | null;
  hydrated: boolean;          // ya leímos storage
  checkingSession: boolean;   // estamos validando /auth/me
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
      const token = await storage.getItem("access_token");

      // Ya podemos renderizar (Login o App). NO bloqueamos por red.
      if (!cancelled) setHydrated(true);

      if (!token) return;

      // Si hay token, validamos en background
      try {
        if (!cancelled) setCheckingSession(true);

        api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

        const res = await api.get("/auth/me"); // si 401, tu interceptor intentará refresh
        if (!cancelled) setUser(res.data.user);
      } catch {
        // Si falla, el interceptor ya limpiará tokens si refresh falla.
        // Aquí solo reflejamos sesión no válida.
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
