// src/lib/api.ts
import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar el access token a cada petición
api.interceptors.request.use((config) => {
  const token = Cookies.get('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Estado para evitar múltiples llamadas simultáneas de refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Interceptor de respuesta: Manejo de 401 con Refresh Token rotativo (SRS RNF-S06)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      const url = originalRequest.url || '';
      const isAuthEndpoint =
        url.includes('/auth/login') ||
        url.includes('/auth/register') ||
        url.includes('/auth/lookup-email') ||
        url.includes('/auth/refresh') ||
        url.includes('/auth/2fa');

      if (isAuthEndpoint) {
        return Promise.reject(error);
      }

      const refreshToken = Cookies.get('refreshToken');
      if (!refreshToken) {
        // Sin refresh token -> redirigir a login si es ruta protegida
        if (typeof window !== 'undefined') {
          const path = window.location.pathname;
          if (path.startsWith('/client') || path.startsWith('/admin')) {
            Cookies.remove('token');
            Cookies.remove('refreshToken');
            Cookies.remove('user');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } },
        );

        const { access_token, refreshToken: newRefreshToken, user } = refreshResponse.data;

        // Guardar nuevos tokens (Access Token 8h, Refresh Token 30d)
        Cookies.set('token', access_token, { expires: 1 / 3 }); // 8 horas
        if (newRefreshToken) {
          Cookies.set('refreshToken', newRefreshToken, { expires: 30 }); // 30 días
        }
        if (user) {
          Cookies.set('user', JSON.stringify(user), { expires: 30 });
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers['Authorization'] = `Bearer ${access_token}`;

        processQueue(null, access_token);
        return api(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        Cookies.remove('token');
        Cookies.remove('refreshToken');
        Cookies.remove('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;