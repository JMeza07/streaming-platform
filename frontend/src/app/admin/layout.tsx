'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import {
  LayoutDashboard,
  Database,
  ShoppingCart,
  Film,
  Headset,
  MessageSquare,
  Users,
  LogOut,
  Tv,
  Menu,
  X,
  Shield,
  Activity,
  UserCheck,
  KeyRound,
  BarChart3,
  Settings,
  Contact,
  Wallet,
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
} from 'lucide-react';
import { useSettings, BrandTwoToneText } from '@/context/SettingsContext';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Catálogo de Streaming', href: '/admin/catalog', icon: Film },
  { label: 'Inventario de Cuentas', href: '/admin/inventory', icon: Database },
  { label: 'Órdenes y Ventas', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Cuentas Vendidas', href: '/admin/sales-accounts', icon: KeyRound },
  { label: 'Renovaciones', href: '/admin/renewals', icon: RefreshCw },
  { label: 'Directorio de Clientes', href: '/admin/customers', icon: Contact },
  { label: 'Garantías y Soporte', href: '/admin/warranty', icon: Headset },
  { label: 'WhatsApp CRM', href: '/admin/whatsapp', icon: MessageSquare },
  { label: 'Módulo de Caja', href: '/admin/caja', icon: Wallet },
  { label: 'Informes e Ingresos', href: '/admin/reports', icon: BarChart3 },
  { label: 'Afiliados y Retiros', href: '/admin/affiliates', icon: Users },
  { label: 'Mi Perfil y Ganancias', href: '/admin/seller', icon: UserCheck },
  { label: 'Usuarios y Roles', href: '/admin/users', icon: ShieldCheck },
  { label: 'Auditoría del Sistema', href: '/admin/audit', icon: ShieldAlert },
  { label: 'Configuración & Backups', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { systemName, systemLogo } = useSettings();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Validación de acceso estricta a la ruta actual
  const checkAccess = useCallback((currentUser: any, path: string) => {
    if (!currentUser) return true;
    if (path === '/admin/dashboard') return true;

    // Si modulosPermitidos está configurado específicamente por el Administrador:
    let allowedModules: string[] | null = null;
    if (Array.isArray(currentUser.modulosPermitidos) && currentUser.modulosPermitidos.length > 0) {
      allowedModules = currentUser.modulosPermitidos;
    } else if (currentUser.rol === 'ASESOR_COMERCIAL') {
      // Restricción por defecto para ASESOR_COMERCIAL si no tiene módulos personalizados asignados
      allowedModules = ['/admin/seller', '/admin/customers', '/admin/orders'];
    }

    if (allowedModules) {
      const isAllowed =
        allowedModules.includes(path) ||
        allowedModules.some((m: string) => path === m || path.startsWith(`${m}/`));

      if (!isAllowed) {
        // Redirigir a la primera ruta permitida o a /admin/seller
        const fallback =
          allowedModules.find((m: string) => m !== path) ||
          (currentUser.rol === 'ASESOR_COMERCIAL' ? '/admin/seller' : '/admin/dashboard');
        router.replace(fallback);
        return false;
      }
      return true;
    }
    return true;
  }, [router]);

  // Carga inicial y sincronización continua con la base de datos
  useEffect(() => {
    setMounted(true);
    const token = Cookies.get('token');
    const userCookie = Cookies.get('user');

    if (!token || !userCookie) {
      router.replace('/login');
      return;
    }

    try {
      const parsedUser = JSON.parse(userCookie);
      const rol = parsedUser.rol;

      if (rol !== 'ADMIN' && rol !== 'SOPORTE' && rol !== 'VENDEDOR' && rol !== 'ASESOR_COMERCIAL') {
        router.replace('/client/dashboard');
        return;
      }

      setUser(parsedUser);
      checkAccess(parsedUser, pathname);

      // Sincronizar en tiempo real con la base de datos (/auth/me) para no depender de cookies obsoletas:
      api.get('/auth/me').then((res) => {
        if (res.data?.user) {
          const freshUser = res.data.user;
          setUser(freshUser);
          Cookies.set('user', JSON.stringify(freshUser), { expires: 7 });
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(freshUser));
          }
          checkAccess(freshUser, pathname);
        }
      }).catch((err) => {
        console.error('Error sincronizando perfil de usuario:', err);
      });
    } catch (err) {
      router.replace('/login');
    }
  }, [router, pathname, checkAccess]);

  // Escuchar eventos globales de actualización de módulos (cambios en vivo)
  useEffect(() => {
    const handleModulesUpdated = (event: any) => {
      const detail = event.detail;
      if (!detail) return;
      const { userId, modulosPermitidos: newMods } = detail;

      setUser((prevUser: any) => {
        const currentId = prevUser?.id || prevUser?.userId;
        if (currentId && currentId === userId) {
          const updated = { ...prevUser, modulosPermitidos: newMods };
          Cookies.set('user', JSON.stringify(updated), { expires: 7 });
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(updated));
          }
          checkAccess(updated, pathname);
          return updated;
        }
        return prevUser;
      });
    };

    window.addEventListener('system-modules-updated', handleModulesUpdated);
    return () => window.removeEventListener('system-modules-updated', handleModulesUpdated);
  }, [pathname, checkAccess]);

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/login');
  };

  // Filtrado reactivo de elementos de navegación según los módulos permitidos
  const visibleNavItems = useMemo(() => {
    if (!user) return [];

    // Si modulosPermitidos está configurado específicamente por el Administrador:
    if (Array.isArray(user.modulosPermitidos) && user.modulosPermitidos.length > 0) {
      return navItems.filter((item) =>
        item.href === '/admin/dashboard' || user.modulosPermitidos.includes(item.href)
      );
    }

    // Restricción por defecto para ASESOR_COMERCIAL si no tiene módulos personalizados asignados:
    if (user.rol === 'ASESOR_COMERCIAL') {
      const allowedAsesor = ['/admin/seller', '/admin/customers', '/admin/orders'];
      return navItems.filter((item) =>
        allowedAsesor.includes(item.href)
      );
    }

    // Por defecto, mostrar todos
    return navItems;
  }, [user]);

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Verificando credenciales administrativas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex">
      {/* SIDEBAR ESCRITORIO */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-30 bg-gray-950/80 backdrop-blur-xl border-r border-gray-800/80">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-gray-850">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
              systemLogo
                ? 'bg-transparent shadow-none'
                : 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-md shadow-red-600/20'
            }`}
          >
            {systemLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={systemLogo} alt={systemName} className="w-full h-full object-contain" />
            ) : (
              <Tv className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="overflow-hidden">
            <BrandTwoToneText className="text-lg font-black tracking-tight block truncate" />
            <span className="block text-[10px] tracking-widest uppercase text-gray-400 font-medium -mt-1">
              Backoffice
            </span>
          </div>
        </div>

        {/* Navegación */}
        <div className="flex-1 py-4 px-3 overflow-y-auto space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-gray-500">
            Operaciones
          </div>
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600/20 to-red-600/5 text-red-400 border border-red-800/40'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/60'
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-red-500' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-sm shadow-red-500" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Usuario y Cierre de Sesión */}
        <div className="p-3 border-t border-gray-850/80 bg-gray-950/40">
          <div className="flex items-center justify-between p-2 rounded-xl bg-gray-900/60 border border-gray-800/60">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-red-950 border border-red-800/60 flex items-center justify-center text-red-400 shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-white truncate">{user.nombre}</p>
                <span className="inline-block text-[9px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.2 rounded border border-red-900/40 uppercase">
                  {user.rol}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              data-tooltip="Salir"
              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Topbar */}
        <header className="h-16 sticky top-0 z-20 bg-gray-950/80 backdrop-blur-xl border-b border-gray-850 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-850 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Backend Conectado
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-gray-300">{user.email}</p>
              <p className="text-[10px] text-gray-500">Sesión Administrativa Activa</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-800 hover:bg-gray-850 text-xs font-medium text-gray-300 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </header>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
            <div className="w-72 bg-gray-950 h-full p-4 flex flex-col border-r border-gray-800">
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2 overflow-hidden">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${
                      systemLogo
                        ? 'bg-transparent shadow-none'
                        : 'bg-red-600'
                    }`}
                  >
                    {systemLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={systemLogo} alt={systemName} className="w-full h-full object-contain" />
                    ) : (
                      <Tv className="w-4 h-4 text-white" />
                    )}
                  </div>
                  <BrandTwoToneText className="text-base font-bold truncate" />
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 py-4 space-y-1 overflow-y-auto">
                {visibleNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                        isActive
                          ? 'bg-red-600/20 text-red-400 border border-red-800/40'
                          : 'text-gray-400 hover:bg-gray-900'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-gray-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-red-950/40 text-red-400 border border-red-900/40 text-xs font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Salir del sistema</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-5 lg:p-6 max-w-[1650px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
