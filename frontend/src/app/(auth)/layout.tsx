'use client';

import React from 'react';
import Link from 'next/link';
import { Tv } from 'lucide-react';
import { useSettings, BrandTwoToneText } from '@/context/SettingsContext';
import HeroParallaxBackground from '@/components/HeroParallaxBackground';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { systemName, systemLogo, heroConfig } = useSettings();

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden bg-[#030712] selection:bg-red-600 selection:text-white">
      {/* Dynamic Netflix-Style Parallax Hero Background */}
      <HeroParallaxBackground config={heroConfig} />

      {/* Header / Brand */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform duration-200 overflow-hidden shrink-0 ${
              systemLogo
                ? 'bg-transparent shadow-none'
                : 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-600/30'
            }`}
          >
            {systemLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={systemLogo} alt={systemName} className="w-full h-full object-contain" />
            ) : (
              <Tv className="w-5 h-5 text-white" />
            )}
          </div>
          <div className="flex flex-col overflow-hidden">
            <BrandTwoToneText className="text-xl font-black tracking-tight truncate" />
            <span className="text-[10px] tracking-widest uppercase text-gray-400 font-semibold -mt-1">
              Plataforma Digital
            </span>
          </div>
        </Link>
      </header>

      {/* Auth Content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center text-xs text-gray-500">
        &copy; {new Date().getFullYear()} {systemName}. Todos los derechos reservados.
      </footer>
    </div>
  );
}