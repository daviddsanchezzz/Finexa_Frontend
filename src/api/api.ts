import axios from "axios";
import { storage } from "../utils/storage";
import { Platform } from "react-native";

const getBaseUrl = () => {
  // 1) Si hay variable de entorno, la usamos (para Netlify / producción)
  if (process.env.EXPO_PUBLIC_API_URL) {
    console.log("🔧 Usando EXPO_PUBLIC_API_URL:", process.env.EXPO_PUBLIC_API_URL);
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // 2) Entorno de desarrollo: elegimos según plataforma
  if (__DEV__) {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      // 👉 MÓVIL FÍSICO / EMULADOR: usar IP del PC
      const url = "http://192.168.43.1:3000"; // TU IP LOCAL AQUÍ
      console.log("📱 Dev móvil, usando:", url);
      return url;
    } else {
      // 👉 WEB (expo start --web): localhost funciona
      const url = "http://localhost:3000";
      console.log("🌐 Dev web, usando:", url);
      return url;
    }
  }

  // 3) Fallback por si acaso (podrías poner la URL de producción aquí)
  const fallback = "http://localhost:3000";
  console.log("⚠️ Fallback baseURL:", fallback);
  return fallback;
};

const api = axios.create({
  baseURL: getBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config: any) => {
  const token = await storage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
