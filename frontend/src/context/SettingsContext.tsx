'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Tv } from 'lucide-react';

export interface HeroConfig {
  enabled: boolean;
  images: string[];
  transitionDuration: number; // segundos entre diapositivas
  fadeSpeed: number; // velocidad de disolvencia en segundos
  opacity: number; // 0.05 a 1.0 (opacidad de las imágenes de fondo)
  overlayColor: string; // color hex o rgb de la capa frontal
  overlayOpacity: number; // 0.0 a 1.0 (opacidad de la capa frontal)
  enableParallax: boolean; // parallax interactivo con mouse/scroll
  enableKenBurns: boolean; // animación continua de zoom y desplazamiento suave
  overlayGradient: 'cinematic' | 'radial' | 'linear' | 'none';
}

export const DEFAULT_HERO_CONFIG: HeroConfig = {
  enabled: true,
  images: [
    'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2069&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2084&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop',
  ],
  transitionDuration: 6,
  fadeSpeed: 1.5,
  opacity: 0.40,
  overlayColor: '#030712',
  overlayOpacity: 0.70,
  enableParallax: true,
  enableKenBurns: true,
  overlayGradient: 'cinematic',
};

export interface SystemSettings {
  id?: string;
  nombrePlataforma: string;
  logoUrl?: string | null;
  whatsappSoporte: string;
  moneda: string;
  comisionBase: number;
  garantiaDiasBase: number;
  mantenimiento: boolean;
  mensajeMantenimiento: string;
  mediosPago?: any[];
  heroConfig?: HeroConfig;
  [key: string]: any;
}

interface SettingsContextValue {
  systemName: string;
  systemLogo: string | null;
  heroConfig: HeroConfig;
  settings: SystemSettings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  setLocalBrand: (name: string, logo: string | null) => void;
}

const defaultSettings: SystemSettings = {
  nombrePlataforma: 'MezaStreaming',
  logoUrl: null,
  whatsappSoporte: '+57 300 123 4567',
  moneda: 'COP',
  comisionBase: 10,
  garantiaDiasBase: 30,
  mantenimiento: false,
  mensajeMantenimiento: 'Estamos realizando mejoras programadas en el servidor.',
  mediosPago: [],
  heroConfig: DEFAULT_HERO_CONFIG,
};

const SettingsContext = createContext<SettingsContextValue>({
  systemName: 'MezaStreaming',
  systemLogo: null,
  heroConfig: DEFAULT_HERO_CONFIG,
  settings: defaultSettings,
  loading: true,
  refreshSettings: async () => {},
  updateSettings: async () => {},
  setLocalBrand: () => {},
});

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a <SettingsProvider>');
  }
  return context;
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const systemName = settings.nombrePlataforma || 'MezaStreaming';
  const systemLogo = settings.logoUrl || null;
  const heroConfig: HeroConfig = {
    ...DEFAULT_HERO_CONFIG,
    ...(settings.heroConfig || {}),
    images:
      Array.isArray(settings.heroConfig?.images) && settings.heroConfig.images.length > 0
        ? settings.heroConfig.images
        : DEFAULT_HERO_CONFIG.images,
  };

  const refreshSettings = useCallback(async () => {
    try {
      const res = await api.get('/settings');
      if (res.data) {
        setSettings({
          ...res.data,
          nombrePlataforma: res.data.nombrePlataforma || 'MezaStreaming',
          logoUrl: res.data.logoUrl || null,
          heroConfig: {
            ...DEFAULT_HERO_CONFIG,
            ...(res.data.heroConfig || {}),
            images:
              Array.isArray(res.data.heroConfig?.images) && res.data.heroConfig.images.length > 0
                ? res.data.heroConfig.images
                : DEFAULT_HERO_CONFIG.images,
          },
        });
      }
    } catch (err) {
      console.error('Error al cargar configuraciones globales del sistema:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<SystemSettings>) => {
    try {
      const res = await api.put('/settings', newSettings);
      if (res.data) {
        setSettings((prev) => ({
          ...prev,
          ...res.data,
          nombrePlataforma: res.data.nombrePlataforma || prev.nombrePlataforma,
          logoUrl: res.data.logoUrl !== undefined ? res.data.logoUrl : prev.logoUrl,
          heroConfig: res.data.heroConfig
            ? {
                ...DEFAULT_HERO_CONFIG,
                ...res.data.heroConfig,
                images:
                  Array.isArray(res.data.heroConfig.images) && res.data.heroConfig.images.length > 0
                    ? res.data.heroConfig.images
                    : DEFAULT_HERO_CONFIG.images,
              }
            : prev.heroConfig,
        }));
      }
    } catch (err) {
      console.error('Error al actualizar configuraciones globales:', err);
      throw err;
    }
  }, []);

  const setLocalBrand = useCallback((name: string, logo: string | null) => {
    setSettings((prev) => ({
      ...prev,
      nombrePlataforma: name,
      logoUrl: logo,
    }));
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  // Actualizar favicon y title si el logo/nombre cambia
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (systemName) {
        document.title = `${systemName} - Plataforma de Streaming`;
      }
      if (systemLogo) {
        let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          document.getElementsByTagName('head')[0].appendChild(link);
        }
        link.href = systemLogo;
      }
    }
  }, [systemName, systemLogo]);

  return (
    <SettingsContext.Provider
      value={{
        systemName,
        systemLogo,
        heroConfig,
        settings,
        loading,
        refreshSettings,
        updateSettings,
        setLocalBrand,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

// ─── Componentes de Marca Reutilizables ─────────────────────────────────────

export function BrandLogo({
  className = '',
  sizeClassName = 'w-9 h-9',
  iconClassName = 'w-5 h-5 text-white',
  imageClassName = 'w-full h-full object-contain',
}: {
  className?: string;
  sizeClassName?: string;
  iconClassName?: string;
  imageClassName?: string;
}) {
  const { systemLogo, systemName } = useSettings();

  return (
    <div
      className={`rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
        systemLogo
          ? 'bg-transparent shadow-none'
          : 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-600/25'
      } ${sizeClassName} ${className}`}
    >
      {systemLogo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={systemLogo} alt={systemName} className={imageClassName} />
      ) : (
        <Tv className={iconClassName} />
      )}
    </div>
  );
}

export function splitBrandName(name: string): { first: string; second: string } {
  if (!name) return { first: '', second: '' };
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex !== -1) {
    const words = trimmed.split(/\s+/);
    const half = Math.ceil(words.length / 2);
    const first = words.slice(0, half).join(' ') + ' ';
    const second = words.slice(half).join(' ');
    return { first, second };
  } else {
    const half = trimmed.length === 1 ? 1 : Math.floor(trimmed.length / 2);
    return {
      first: trimmed.substring(0, half),
      second: trimmed.substring(half),
    };
  }
}

export function BrandTwoToneText({
  name,
  className = 'text-lg font-black tracking-tight',
  whiteClassName = 'text-white',
  redClassName = 'text-red-500',
}: {
  name?: string;
  className?: string;
  whiteClassName?: string;
  redClassName?: string;
}) {
  const { systemName } = useSettings();
  const targetName = name !== undefined ? name : systemName;
  const { first, second } = splitBrandName(targetName);

  return (
    <span className={className}>
      <span className={whiteClassName}>{first}</span>
      <span className={redClassName}>{second}</span>
    </span>
  );
}

export function BrandText({
  className = 'text-lg font-black tracking-tight',
  subtitle,
  subtitleClassName = 'block text-[9px] tracking-widest uppercase text-gray-400 font-semibold -mt-1',
}: {
  className?: string;
  subtitle?: string;
  subtitleClassName?: string;
}) {
  const { systemName } = useSettings();

  return (
    <div>
      <BrandTwoToneText name={systemName} className={className} />
      {subtitle && <span className={subtitleClassName}>{subtitle}</span>}
    </div>
  );
}

