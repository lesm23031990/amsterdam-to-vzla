'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'cliente' | 'tienda' | 'admin' | 'repartidor';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  register: (data: { email: string; password: string; name: string; phone?: string; role: string }) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      api.get<User>('/auth/me').then((res) => {
        if (res.ok && res.data) {
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const res = await api.post<{ user: User; token: string }>('/auth/login', { email, password });
    if (res.ok && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return null;
    }
    return res.error || 'Error al iniciar sesión';
  }, []);

  const register = useCallback(async (data: { email: string; password: string; name: string; phone?: string; role: string }): Promise<string | null> => {
    const res = await api.post<{ user: User; token: string }>('/auth/register', data);
    if (res.ok && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      return null;
    }
    return res.error || 'Error al registrarse';
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
