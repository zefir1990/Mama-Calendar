import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

import { authorize, register as registerApi } from '@/api/auth';
import { clearToken, getToken, setToken as setStoredToken, subscribe } from '@/api/token';

interface AuthContextValue {
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  loginError: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setTokenState] = useState<string | null>(() => getToken());
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe(() => {
      setTokenState(getToken());
    });
    return unsubscribe;
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    try {
      setLoginError(null);
      const newToken = await authorize(username, password);
      setStoredToken(newToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setLoginError(message);
      throw err;
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    try {
      setLoginError(null);
      await registerApi(username, password);
      const newToken = await authorize(username, password);
      setStoredToken(newToken);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setLoginError(message);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setLoginError(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isAuthenticated: token !== null, login, register, logout, loginError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
