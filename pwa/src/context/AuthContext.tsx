import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  getToken,
  setToken,
  setRefreshToken,
  getStoredUser,
  setStoredUser,
  getApiUrl,
  setApiUrl,
  testServerConnection,
  api
} from '../services/api';

export type UserRole = 'CLIENTE' | 'VENDEDOR' | 'ADMIN' | 'SOPORTE' | 'ASESOR_COMERCIAL' | 'GUEST';

export interface UserProfile {
  id: string;
  nombre: string;
  email?: string;
  whatsapp?: string;
  pais?: string;
  rol: UserRole;
  customerId?: string;
  saldoBilletera?: number;
  strikes?: number;
}

interface NetworkInfo {
  online: boolean;
  latencyMs: number;
  isLan: boolean;
  serverUrl: string;
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  role: UserRole;
  isClient: boolean;
  isSellerOrAdmin: boolean;
  network: NetworkInfo;
  toastMessage: string | null;
  login: (identifier: string, pass: string) => Promise<any>;
  register: (data: { nombre: string; whatsapp: string; email?: string; password: string }) => Promise<any>;
  logout: () => void;
  showToast: (msg: string) => void;
  checkNetwork: (customUrl?: string) => Promise<number>;
  setCustomServerUrl: (url: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setAuthToken] = useState<string | null>(getToken());
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [network, setNetwork] = useState<NetworkInfo>({
    online: true,
    latencyMs: 0,
    isLan: false,
    serverUrl: getApiUrl(),
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  const checkNetwork = async (targetUrl?: string): Promise<number> => {
    const url = targetUrl || getApiUrl();
    const result = await testServerConnection(url);
    const isLan = url.includes('192.168.') || url.includes('10.') || url.includes('localhost') || url.includes('127.0.0.1');

    setNetwork({
      online: result.success,
      latencyMs: result.latencyMs,
      isLan,
      serverUrl: url,
    });
    return result.latencyMs;
  };

  const setCustomServerUrl = async (url: string) => {
    setApiUrl(url);
    await checkNetwork(url);
    showToast('Servidor actualizado');
  };

  const refreshProfile = async () => {
    if (!getToken()) return;
    try {
      const res = await api.auth.getProfile();
      if (res && res.user) {
        setUser(res.user);
        setStoredUser(res.user);
      }
    } catch {
      // Ignore background refresh errors
    }
  };

  useEffect(() => {
    checkNetwork();
    const interval = setInterval(() => checkNetwork(), 25000);

    const handleUnauthorized = () => {
      setAuthToken(null);
      setUser(null);
      showToast('Tu sesión ha expirado');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      clearInterval(interval);
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const login = async (identifier: string, pass: string) => {
    const res = await api.auth.login({
      identifier,
      password: pass,
    });

    const token = res?.access_token || res?.accessToken || res?.token;
    const refreshToken = res?.refreshToken || res?.refresh_token;
    if (res && token) {
      setToken(token);
      if (refreshToken) setRefreshToken(refreshToken);
      setAuthToken(token);

      const loggedUser: UserProfile = res.user;
      setUser(loggedUser);
      setStoredUser(loggedUser);

      showToast(`¡Bienvenido, ${loggedUser.nombre}!`);
      return res;
    }
    return res;
  };

  const register = async (data: { nombre: string; whatsapp: string; email?: string; password: string }) => {
    const res = await api.auth.register(data);
    const token = res?.access_token || res?.accessToken || res?.token;
    const refreshToken = res?.refreshToken || res?.refresh_token;
    if (res && token) {
      setToken(token);
      if (refreshToken) setRefreshToken(refreshToken);
      setAuthToken(token);
      const registeredUser: UserProfile = res.user;
      setUser(registeredUser);
      setStoredUser(registeredUser);
      showToast(`¡Cuenta creada con éxito!`);
    }
    return res;
  };

  const logout = () => {
    setToken(null);
    setRefreshToken(null);
    setAuthToken(null);
    setStoredUser(null);
    setUser(null);
    showToast('Sesión cerrada');
  };

  const role: UserRole = user?.rol || 'GUEST';
  const isClient = role === 'CLIENTE';
  const isSellerOrAdmin = role === 'VENDEDOR' || role === 'ADMIN' || role === 'SOPORTE';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isClient,
        isSellerOrAdmin,
        network,
        toastMessage,
        login,
        register,
        logout,
        showToast,
        checkNetwork,
        setCustomServerUrl,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
