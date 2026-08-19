import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: User) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,
  loading: true,

  loadStoredAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      const userStr = await SecureStore.getItemAsync('auth_user');
      if (token && userStr) {
        set({
          token,
          user: JSON.parse(userStr),
          isAuthenticated: true,
        });
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      set({ loading: false });
    }
  },

  login: async (token: string, user: User) => {
    await SecureStore.setItemAsync('auth_token', token);
    await SecureStore.setItemAsync('auth_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  register: async (name: string, email: string, password: string, phone: string) => {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await response.json();
    if (data.ok) {
      await useAuthStore.getState().login(data.data.token, data.data.user);
    } else {
      throw new Error(data.error || 'Registration failed');
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('auth_user');
    set({ token: null, user: null, isAuthenticated: false });
  },
}));
