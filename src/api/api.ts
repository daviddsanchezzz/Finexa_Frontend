import axios from "axios";
import { storage } from "../utils/storage";

const API_URL = "http://192.168.68.54:3000";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config: any) => {
  const token = await storage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
