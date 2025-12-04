import React, { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";
import { storage } from "../utils/storage"; // 👈 Usamos nuestro wrapper

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
          // Inyecta el token para que axios lo use automáticamente
          api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
          const res = await api.get("/auth/me");
          setUser(res.data.user);
        } catch (err) {
          await storage.removeItem("access_token");
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

    // Guarda el token con nuestro wrapper (funciona en web + móvil)
    await storage.setItem("access_token", access_token);
    await storage.setItem("refresh_token", refresh_token);


    // Añade el token a axios globalmente
    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;

    setUser(user);
  };

  const logout = async () => {
    await storage.removeItem("access_token");
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
