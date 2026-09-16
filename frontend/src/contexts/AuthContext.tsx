import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMe, isAuthenticated, login as apiLogin, logout as apiLogout } from '../services/api';
import type { AuthUser } from '../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarSessao() {
      if (isAuthenticated()) {
        setUser(await getMe());
      }
      setLoading(false);
    }
    carregarSessao();
  }, []);

  async function login(email: string, password: string) {
    await apiLogin(email, password);
    setUser(await getMe());
  }

  function logout() {
    apiLogout();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider');
  }
  return context;
}
