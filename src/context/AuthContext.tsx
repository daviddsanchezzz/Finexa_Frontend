import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import api, { plainApi } from "../api/api";
import { storage } from "../utils/storage";
import { clearNetWorthCache } from "../utils/netWorthCache";
import { GOOGLE_NONCE_STORAGE_KEY } from "../hooks/useGoogleAuth";

// Decodifica (sin verificar firma, eso ya lo hace el backend) el payload de
// un JWT para leer el claim `nonce` y comprobar que este id_token responde a
// un flujo de OAuth iniciado por este mismo navegador, no a uno pegado a
// mano en la URL (login CSRF).
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

type User = {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  // Moneda base para consolidar patrimonio/estadísticas. ISO 4217.
  currency?: string;
};

type AuthContextType = {
  user: User | null;
  hydrated: boolean;
  checkingSession: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<User>) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
const [hydrated, setHydrated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(false);

useEffect(() => {
  let cancelled = false;

  const bootstrap = async () => {
    try {
      if (!cancelled) setCheckingSession(true);

      // Vuelta del login con Google en web: tras el redirect de página
      // completa, Google devuelve el id_token en el hash de la URL
      // (#id_token=...&...). Se procesa aquí, al arrancar la app.
      if (Platform.OS === "web" && typeof window !== "undefined" && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const idToken = hashParams.get("id_token");
        if (idToken) {
          // Limpia el hash cuanto antes: evita reprocesarlo y no lo deja
          // visible en la barra de direcciones.
          window.history.replaceState(null, "", window.location.pathname + window.location.search);

          const expectedNonce = sessionStorage.getItem(GOOGLE_NONCE_STORAGE_KEY);
          sessionStorage.removeItem(GOOGLE_NONCE_STORAGE_KEY);
          const payload = decodeJwtPayload(idToken);

          if (expectedNonce && payload?.nonce === expectedNonce) {
            try {
              await loginWithGoogle(idToken);
              return;
            } catch {
              // Si falla, sigue con el flujo normal (token guardado / login manual).
            }
          }
          // Si no hay nonce esperado o no coincide, se ignora el id_token:
          // no proviene de un flujo de Google iniciado por este navegador.
        }
      }

      const refreshToken = await storage.getItem("refresh_token");
      if (!refreshToken) return;

      const refreshRes = await plainApi.post("/auth/refresh", { refresh_token: refreshToken });

      const newAccessToken = refreshRes.data?.access_token;
      const newRefreshToken = refreshRes.data?.refresh_token;

      if (!newAccessToken) throw new Error("No access_token");

      await storage.setItem("access_token", newAccessToken);
      if (newRefreshToken) await storage.setItem("refresh_token", newRefreshToken);

      api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

      // Cargar usuario (robusto)
      const meRes = await api.get("/auth/me");

      // OJO: aquí normalizamos estructura
      const u = meRes.data?.user ?? meRes.data;
      if (u?.email) {
        if (!cancelled) setUser(u);
      } else {
        throw new Error("Invalid /auth/me payload");
      }
    } catch (e) {
      await storage.removeItem("access_token");
      await storage.removeItem("refresh_token");
      delete api.defaults.headers.common["Authorization"];
      if (!cancelled) setUser(null);
    } finally {
      if (!cancelled) {
        setCheckingSession(false);
        setHydrated(true); // ✅ aquí, al final
      }
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

  const loginWithGoogle = async (idToken: string) => {
    const res = await api.post("/auth/google", { id_token: idToken });
    const { access_token, refresh_token, user } = res.data;

    await storage.setItem("access_token", access_token);
    await storage.setItem("refresh_token", refresh_token);

    api.defaults.headers.common["Authorization"] = `Bearer ${access_token}`;
    setUser(user);
  };

  const updateUser = (patch: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const refreshUser = async () => {
    const meRes = await api.get("/auth/me");
    const u = meRes.data?.user ?? meRes.data;
    if (u?.email) setUser(u);
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout"); // si lo implementas
    } catch {}

    await storage.removeItem("access_token");
    await storage.removeItem("refresh_token");
    delete api.defaults.headers.common["Authorization"];
    clearNetWorthCache();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, hydrated, checkingSession, login, loginWithGoogle, logout, updateUser, refreshUser }),
    [user, hydrated, checkingSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un AuthProvider");
  return ctx;
};
