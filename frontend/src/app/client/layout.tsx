'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { Tv, LogOut, User, Phone, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useSettings, BrandTwoToneText } from '@/context/SettingsContext';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { systemName, systemLogo } = useSettings();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

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
      const isStaff = parsedUser.rol === 'ADMIN' || parsedUser.rol === 'SOPORTE' || parsedUser.rol === 'VENDEDOR' || parsedUser.rol === 'ASESOR_COMERCIAL';
      if (isStaff) {
        const target = Array.isArray(parsedUser.modulosPermitidos) && parsedUser.modulosPermitidos.length > 0 && !parsedUser.modulosPermitidos.includes('/admin/dashboard')
          ? parsedUser.modulosPermitidos[0]
          : (parsedUser.rol === 'ASESOR_COMERCIAL' ? '/admin/seller' : '/admin/dashboard');
        router.replace(target);
        return;
      }
      setUser(parsedUser);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    router.push('/login');
  };

  if (!mounted || !user) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">Cargando tu portal de cliente...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col selection:bg-red-600 selection:text-white">
      {/* Background glow */}
      <div className="pointer-events-none fixed -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-red-600/10 rounded-full blur-[140px] -z-10" />
      <div className="pointer-events-none fixed bottom-0 right-0 w-[500px] h-[400px] bg-blue-600/5 rounded-full blur-[140px] -z-10" />

      {/* Header */}
      <header className="h-16 bg-gray-950/80 backdrop-blur-xl border-b border-gray-850 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/client/dashboard" className="flex items-center gap-2.5 group">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform overflow-hidden shrink-0 ${
                systemLogo
                  ? 'bg-transparent shadow-none'
                  : 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-600/25'
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
              <span className="block text-[9px] tracking-widest uppercase text-gray-400 font-semibold -mt-1">
                Portal de Cliente
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gray-300">
            <div className="w-8 h-8 rounded-full bg-red-950 border border-red-800/80 flex items-center justify-center text-red-400 font-bold text-xs">
              {user.nombre?.substring(0, 1) || 'C'}
            </div>
            <div className="text-right">
              <p className="font-semibold text-white leading-tight">{user.nombre}</p>
              <p className="text-[10px] text-gray-400">{user.email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-800 hover:bg-gray-850 text-xs text-gray-300 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-850/80 py-6 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} {systemName} • Soporte 24/7 con garantía extendida
      </footer>
    </div>
  );
}
