import axios from "axios";
import { storage } from "../utils/storage";
import { Platform } from "react-native";

const getBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log("🔧 Usando EXPO_PUBLIC_API_URL:", process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (__DEV__) {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      const url = "http://192.168.43.1:3000"; // TU IP LOCAL AQUÍ
      console.log("📱 Dev móvil, usando:", url);
      return url;
    } else {
      const url = "http://localhost:3000";
      console.log("🌐 Dev web, usando:", url);
      return url;
    }
  }

  const fallback = "http://localhost:3000";
  console.log("⚠️ Fallback baseURL:", fallback);
  return fallback;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

// ==========================
// 1) REQUEST: añade access token
// ==========================
api.interceptors.request.use(async (config: any) => {
  const token = await storage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ==========================
// 2) RESPONSE: refresh + retry en 401
// ==========================
let isRefreshing = false;

let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: any) => void;
}> = [];

const processQueue = (error: any, token: string | null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token as string);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (!error.response) return Promise.reject(error);

    // Solo evitamos bucle con login/refresh.
    // ✅ Permitimos que /auth/me dispare refresh.
    const url = String(originalRequest?.url || "");
    const isAuthRoute = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (error.response.status === 401 && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
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

        const newAccessToken = refreshRes.data?.access_token;
        if (!newAccessToken) throw new Error("No access_token returned from refresh");

        await storage.setItem("access_token", newAccessToken);

        // ✅ actualiza defaults para próximas requests
        api.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
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
