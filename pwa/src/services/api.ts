/**
 * API Service for MezaStreaming PWA
 * Supports dynamic switching between Localhost, LAN (192.168.x.x), and Internet Cloud
 */

const STORAGE_API_KEY = 'mezastream_api_url';
const STORAGE_TOKEN_KEY = 'mezastream_token';
const STORAGE_REFRESH_TOKEN_KEY = 'mezastream_refresh_token';
const STORAGE_USER_KEY = 'mezastream_user';

export const getDefaultApiUrl = (): string => {
  // If user explicitly configured an override
  const custom = localStorage.getItem(STORAGE_API_KEY);
  if (custom && custom.trim() !== '') return custom.trim();

  // If in browser environment
  if (typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;
    // Local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    // LAN connection (e.g. 192.168.1.50)
    if (/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)) {
      return `http://${hostname}:3001/api`;
    }
    // Production Internet Domain
    return `${protocol}//${hostname}:3001/api`;
  }

  return 'http://localhost:3001/api';
};

export const getApiUrl = (): string => {
  return localStorage.getItem(STORAGE_API_KEY) || getDefaultApiUrl();
};

export const setApiUrl = (url: string) => {
  if (!url || url.trim() === '') {
    localStorage.removeItem(STORAGE_API_KEY);
  } else {
    localStorage.setItem(STORAGE_API_KEY, url.trim().replace(/\/$/, ''));
  }
};

export const getToken = (): string | null => {
  return localStorage.getItem(STORAGE_TOKEN_KEY);
};

export const setToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(STORAGE_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
  }
};

export const getRefreshToken = (): string | null => {
  return localStorage.getItem(STORAGE_REFRESH_TOKEN_KEY);
};

export const setRefreshToken = (token: string | null) => {
  if (token) {
    localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
  }
};

export const getStoredUser = (): any | null => {
  const data = localStorage.getItem(STORAGE_USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
};

export const setStoredUser = (user: any | null) => {
  if (user) {
    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(STORAGE_USER_KEY);
  }
};

// Test connection and measure ping latency
export const testServerConnection = async (targetUrl?: string): Promise<{ success: boolean; latencyMs: number; error?: string }> => {
  const baseUrl = targetUrl || getApiUrl();
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${baseUrl}/settings`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - startTime;
    return { success: res.ok, latencyMs };
  } catch (err: any) {
    return { success: false, latencyMs: -1, error: err.message || 'Timeout o sin conexión' };
  }
};

let isRefreshingPwa = false;

// Generic authenticated fetch wrapper with automatic token refresh (SRS RNF-S06)
export async function apiRequest<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const isAuthEndpoint =
      endpoint.includes('/auth/login') ||
      endpoint.includes('/auth/register') ||
      endpoint.includes('/auth/refresh') ||
      endpoint.includes('/auth/2fa');

    const refreshToken = getRefreshToken();

    if (!isAuthEndpoint && refreshToken && !isRefreshingPwa) {
      isRefreshingPwa = true;
      try {
        const refreshRes = await fetch(`${baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken = refreshData.access_token || refreshData.accessToken || refreshData.token;
          const newRefreshToken = refreshData.refreshToken || refreshData.refresh_token;

          setToken(newAccessToken);
          if (newRefreshToken) setRefreshToken(newRefreshToken);
          if (refreshData.user) setStoredUser(refreshData.user);

          isRefreshingPwa = false;

          // Reintentar la solicitud original con el nuevo token
          headers['Authorization'] = `Bearer ${newAccessToken}`;
          const retryRes = await fetch(url, { ...options, headers });
          const retryData = await retryRes.json().catch(() => null);
          if (!retryRes.ok) {
            throw new Error(retryData?.message || 'Error en la solicitud');
          }
          return retryData as T;
        }
      } catch (_) {
        // Falló refresh -> continuar con deslogueo
      } finally {
        isRefreshingPwa = false;
      }
    }

    // Session expired or invalid
    setToken(null);
    setRefreshToken(null);
    setStoredUser(null);
    window.dispatchEvent(new Event('auth:unauthorized'));
    throw new Error('Sesión expirada o no autorizada');
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const msg = data?.message || (Array.isArray(data?.message) ? data.message.join(', ') : 'Error en la solicitud');
    throw new Error(msg);
  }

  return data as T;
}

// Concrete Service Calls
export const api = {
  // Auth
  auth: {
    login: (credentials: { identifier?: string; email?: string; whatsapp?: string; password: string }) => {
      // Backend auth expects { email, password }
      const payload = {
        email: credentials.email || credentials.whatsapp || credentials.identifier,
        password: credentials.password,
      };
      return apiRequest<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    },
    register: (userData: { nombre: string; whatsapp: string; email?: string; password: string; pais?: string }) => {
      return apiRequest<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });
    },
    getProfile: () => apiRequest<any>('/auth/me'),
  },

  // Settings & Public Info
  settings: {
    get: () => apiRequest<any>('/settings'),
  },

  // Plans & Services Catalog
  catalog: {
    getServices: () => apiRequest<any[]>('/services'),
    getPlans: () => apiRequest<any[]>('/plans'),
    createOrder: (orderData: { customerId?: string; clienteNombre?: string; clienteWhatsapp?: string; planId: string; metodoPago: string; comprobanteUrl?: string }) => {
      return apiRequest<any>('/orders', {
        method: 'POST',
        body: JSON.stringify(orderData),
      });
    },
  },

  // Client Portal
  portal: {
    getSummary: () => apiRequest<any>('/portal/summary'),
    getSubscriptions: () => apiRequest<any[]>('/portal/subscriptions'),
    getSubscription: (id: string) => apiRequest<any>(`/portal/subscriptions/${id}`),
    markCredentialsViewed: (id: string) => apiRequest<any>(`/portal/subscriptions/${id}/view-credentials`, { method: 'POST' }),
    requestHouseholdCode: (id: string) => apiRequest<any>(`/portal/subscriptions/${id}/household-code`, { method: 'POST' }),
    reportOccupiedScreen: (subscriptionId: string, motivo?: string) => {
      return apiRequest<any>('/portal/report-occupied-screen', {
        method: 'POST',
        body: JSON.stringify({ subscriptionId, motivo }),
      });
    },
    getTickets: () => apiRequest<any[]>('/portal/tickets'),
    requestWarranty: (ticketData: { subscriptionId: string; motivo: string; descripcion: string }) => {
      return apiRequest<any>('/portal/warranty', {
        method: 'POST',
        body: JSON.stringify(ticketData),
      });
    },
    getOrders: () => apiRequest<any[]>('/portal/orders'),
    getOrderDetails: (id: string) => apiRequest<any>(`/portal/orders/${id}`),
    uploadOrderReceipt: (orderId: string, comprobanteUrl: string) => {
      return apiRequest<any>(`/orders/${orderId}/receipt`, {
        method: 'PATCH',
        body: JSON.stringify({ comprobanteUrl }),
      });
    },
    updateProfile: (data: { nombre?: string; whatsapp?: string; pais?: string }) => {
      return apiRequest<any>('/portal/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
  },

  // Seller / Admin POS & Inventory & Affiliates
  seller: {
    createSale: (saleData: {
      customerId?: string;
      clienteNombre?: string;
      clienteWhatsapp?: string;
      clienteEmail?: string;
      planId: string;
      cantidad?: number;
      metodoPago: string;
      referenciaExterna?: string;
      despachoInmediato?: boolean;
      comprobanteUrl?: string;
    }) => {
      return apiRequest<any>('/orders/seller-sale', {
        method: 'POST',
        body: JSON.stringify(saleData),
      });
    },
    getInventorySummary: () => apiRequest<any>('/accounts/summary'),
    getAccounts: (params?: { planId?: string; estado?: string }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest<any[]>(`/accounts${q ? `?${q}` : ''}`);
    },
    getAllOrders: (params?: { estado?: string; limit?: number }) => {
      const q = new URLSearchParams(params as any).toString();
      return apiRequest<any[]>(`/orders${q ? `?${q}` : ''}`);
    },
    getCustomers: (search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return apiRequest<any[]>(`/customers${q}`);
    },
    approveOrder: (id: string) => apiRequest<any>(`/orders/${id}/approve`, { method: 'POST' }),
    getAffiliateProfile: (affiliateId?: string) => {
      const q = affiliateId ? `?affiliateId=${encodeURIComponent(affiliateId)}` : '';
      return apiRequest<any>(`/affiliates/me${q}`);
    },
    requestWithdrawal: (dto: { monto: number; metodoPago?: string; datosPago?: string }) => {
      return apiRequest<any>('/affiliates/withdraw', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
    },
  },
};
