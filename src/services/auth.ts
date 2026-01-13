import api from '../api/api';
import { storage } from '../utils/storage';

type LoginResponse = {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    email: string;
    name: string;
  };
};

export async function login(email: string, password: string) {
  const res = await api.post<LoginResponse>('/auth/login', { email, password });
  const { access_token, refresh_token, user } = res.data;

  await storage.setItem('access_token', access_token);
  await storage.setItem('refresh_token', refresh_token);
  await storage.setItem('user', JSON.stringify(user));

  return user;
}

export async function logout() {
  await storage.removeItem('access_token');
  await storage.removeItem('refresh_token');
  await storage.removeItem('user');
}

export async function getStoredUser() {
  const user = await storage.getItem('user');
  return user ? JSON.parse(user) : null;
}
