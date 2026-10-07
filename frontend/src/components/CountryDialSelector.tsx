'use client';

import React from 'react';
import { Globe } from 'lucide-react';

export interface CountryOption {
  code: string;
  iso: string;
  name: string;
  flag: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: '+57', iso: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: '+58', iso: 'VE', name: 'Venezuela', flag: '🇻🇪' },
  { code: '+1', iso: 'US', name: 'Estados Unidos / Canadá', flag: '🇺🇸' },
  { code: '+52', iso: 'MX', name: 'México', flag: '🇲🇽' },
  { code: '+51', iso: 'PE', name: 'Perú', flag: '🇵🇪' },
  { code: '+54', iso: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: '+56', iso: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: '+593', iso: 'EC', name: 'Ecuador', flag: '🇪🇨' },
  { code: '+34', iso: 'ES', name: 'España', flag: '🇪🇸' },
  { code: '+507', iso: 'PA', name: 'Panamá', flag: '🇵🇦' },
  { code: '+1809', iso: 'DO', name: 'Rep. Dominicana', flag: '🇩🇴' },
  { code: '+506', iso: 'CR', name: 'Costa Rica', flag: '🇨🇷' },
  { code: '+591', iso: 'BO', name: 'Bolivia', flag: '🇧🇴' },
  { code: '+502', iso: 'GT', name: 'Guatemala', flag: '🇬🇹' },
  { code: '+503', iso: 'SV', name: 'El Salvador', flag: '🇸🇻' },
  { code: '+504', iso: 'HN', name: 'Honduras', flag: '🇭🇳' },
  { code: '+505', iso: 'NI', name: 'Nicaragua', flag: '🇳🇮' },
  { code: '+598', iso: 'UY', name: 'Uruguay', flag: '🇺🇾' },
  { code: '+595', iso: 'PY', name: 'Paraguay', flag: '🇵🇾' },
];

interface CountryDialSelectorProps {
  indicativo: string;
  numero: string;
  onIndicativoChange: (indicativo: string) => void;
  onNumeroChange: (numero: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export default function CountryDialSelector({
  indicativo = '+57',
  numero = '',
  onIndicativoChange,
  onNumeroChange,
  disabled = false,
  placeholder = '300 123 4567',
  className = '',
}: CountryDialSelectorProps) {
  // Limpiar caracteres no numéricos al escribir el número
  const handlePhoneInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Si el usuario pega un número completo con +, extraer el indicativo automáticamente
    if (raw.startsWith('+')) {
      const match = COUNTRIES.find((c) => raw.startsWith(c.code));
      if (match) {
        onIndicativoChange(match.code);
        const cleanNum = raw.slice(match.code.length).replace(/\D/g, '');
        onNumeroChange(cleanNum);
        return;
      }
    }
    const cleanNum = raw.replace(/\D/g, '');
    onNumeroChange(cleanNum);
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className="relative">
        <select
          value={indicativo}
          onChange={(e) => onIndicativoChange(e.target.value)}
          disabled={disabled}
          className="appearance-none bg-slate-900/80 border border-slate-700/80 text-white text-xs font-semibold rounded-xl pl-3 pr-7 py-2.5 outline-none focus:border-amber-500/60 transition-all cursor-pointer disabled:opacity-50"
        >
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code} className="bg-slate-900 text-white">
              {c.flag} {c.code} ({c.iso})
            </option>
          ))}
        </select>
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">
          ▼
        </span>
      </div>

      <div className="relative flex-1">
        <input
          type="tel"
          value={numero}
          onChange={handlePhoneInput}
          disabled={disabled}
          placeholder={placeholder}
          className="w-full bg-slate-900/80 border border-slate-700/80 text-white text-sm rounded-xl px-3.5 py-2.5 outline-none focus:border-amber-500/60 placeholder:text-slate-500 transition-all disabled:opacity-50 font-mono tracking-wide"
        />
      </div>
    </div>
  );
}
