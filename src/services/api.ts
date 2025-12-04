import axios from 'axios';
import { storage } from '../utils/storage';

// Si usas Expo en Android, puede ser necesario usar tu IP local (por ejemplo 192.168.x.x)
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000',
});

api.interceptors.request.use(async (config: any) => {
  const token = await storage.getItem('access_token');
  if (token) {
    if (!config.headers) config.headers = {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
