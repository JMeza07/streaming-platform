// src/lib/api.ts
import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el token a cada petición
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores (ej. token expirado en rutas protegidas)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // No redirigir si el 401 proviene de un intento de login/registro/lookup
      const isAuthEndpoint = 
        url.includes('/auth/login') || 
        url.includes('/auth/register') || 
        url.includes('/auth/lookup-email');
      
      if (!isAuthEndpoint && typeof window !== 'undefined') {
        const path = window.location.pathname;
        // Solo redirigir si el usuario está en rutas protegidas
        if (path.startsWith('/client') || path.startsWith('/admin')) {
          Cookies.remove('token');
          Cookies.remove('user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;