// src/api/api.ts
import axios, { InternalAxiosRequestConfig } from "axios";
import { Platform } from "react-native";
import { storage } from "../utils/storage";

export const plainApi = axios.create({
  baseURL: getBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

function getBaseUrl() {
  // Preferencia: variable de entorno (prod/dev)
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  // Desarrollo
  if (__DEV__) {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      return "http://192.168.43.1:3000"; // TU IP LOCAL
    }
    return "http://localhost:3000";
  }

  // Producción (Render)
  return "https://TU-BACKEND.onrender.com";
}

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { "Content-Type": "application/json" },

  // Si algún día pasas a cookies en web:
  // withCredentials: true,
});

// ===================================================
// 1) REQUEST: añade access token (Axios v1 headers.set)
// ===================================================
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await storage.getItem("access_token");

  if (token) {
    config.headers.set("Authorization", `Bearer ${token}`);
  } else {
    // por seguridad, evita que quede un Authorization "viejo"
    config.headers.delete?.("Authorization");
  }

  return config;
});

// ===================================================
// 2) RESPONSE: refresh + cola en 401 (evita tormenta)
// ===================================================
let isRefreshing = false;

let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

function processQueue(error: any, token: string | null) {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (!error?.response) return Promise.reject(error);

    const originalRequest = error.config as any;
    const status = error.response.status;
    const url = String(originalRequest?.url || "");

    // Evitar bucles (login/refresh/register)
    const isAuthRoute =
      url.includes("/auth/login") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/register");

    if (status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      // Si ya hay refresh en curso, encola la request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              (originalRequest.headers as any)["Authorization"] = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      isRefreshing = true;

      try {
        const refreshToken = await storage.getItem("refresh_token");
        if (!refreshToken) throw error;

        const refreshRes = await api.post("/auth/refresh", {
          refresh_token: refreshToken,
        });

        const newAccessToken: string | undefined = refreshRes.data?.access_token;
        const newRefreshToken: string | undefined = refreshRes.data?.refresh_token; // si rotas refresh

        if (!newAccessToken) throw new Error("No access_token returned from refresh");

        await storage.setItem("access_token", newAccessToken);
        if (newRefreshToken) await storage.setItem("refresh_token", newRefreshToken);

        // Defaults para próximas requests
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

        // Desbloquea cola
        processQueue(null, newAccessToken);

        // Reintenta la original
        (originalRequest.headers as any)["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (err) {
        processQueue(err, null);

        await storage.removeItem("access_token");
        await storage.removeItem("refresh_token");
        delete api.defaults.headers.common["Authorization"];

        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
