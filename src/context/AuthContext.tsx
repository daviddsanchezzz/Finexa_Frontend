import React, { createContext, useContext, useEffect, useState } from "react";
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
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      const token = await storage.getItem("access_token");

      if (token) {
        try {
          // opcional (request interceptor ya lo hace), pero ayuda en arranque
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

          // Si el token caducó, /auth/me devolverá 401 y api.ts intentará refresh
          const res = await api.get("/auth/me");
          setUser(res.data.user);
        } catch {
          // No borres tokens aquí; api.ts los borra si refresh falla de verdad
          setUser(null);
        }
      }

      setLoading(false);
    };

    checkToken();
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
    await storage.removeItem("refresh_token"); // ✅ importante
    delete api.defaults.headers.common["Authorization"];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
};
