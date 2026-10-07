'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  MessageSquare,
  Sparkles,
  Send,
  Copy,
  Check,
  X,
  Loader2,
  RefreshCw,
  Gift,
  ShieldCheck,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

interface WhatsAppPromoModalProps {
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function WhatsAppPromoModal({
  customerId,
  customerName,
  customerPhone,
  isOpen,
  onClose,
}: WhatsAppPromoModalProps) {
  const [motivo, setMotivo] = useState<string>('PROMOCION_LEALTAD');
  const [loading, setLoading] = useState(false);
  const [promoData, setPromoData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const fetchPromoMessage = async (selectedMotivo: string) => {
    if (!customerId) return;
    setLoading(true);
    try {
      const res = await api.get(`/customers/${customerId}/custom-promo-message?motivo=${selectedMotivo}`);
      setPromoData(res.data);
    } catch (error) {
      console.error('Error fetching promo message:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && customerId) {
      fetchPromoMessage(motivo);
    }
  }, [isOpen, customerId, motivo]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!promoData?.mensajeGenerado) return;
    navigator.clipboard.writeText(promoData.mensajeGenerado);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleOpenWhatsApp = () => {
    if (!promoData?.whatsappUrl) return;
    window.open(promoData.whatsappUrl, '_blank');
  };

  const motivosList = [
    {
      id: 'PROMOCION_LEALTAD',
      label: 'Fidelidad VIP',
      icon: Sparkles,
      desc: 'Descuento especial y beneficios exclusivos para clientes recurrentes',
    },
    {
      id: 'RENOVACION',
      label: 'Renovación Preventiva',
      icon: RefreshCw,
      desc: 'Recordatorio con tarifa preferencial para evitar pérdida de perfiles',
    },
    {
      id: 'VENTA_CRUZADA',
      label: 'Venta Cruzada (Cross-sell)',
      icon: TrendingUp,
      desc: 'Recomienda plataformas complementarias que aún no ha probado',
    },
    {
      id: 'GARANTIA_SEGUIMIENTO',
      label: 'Seguimiento de Calidad',
      icon: ShieldCheck,
      desc: 'Verificación proactiva de satisfacción y funcionamiento técnico',
    },
    {
      id: 'RECUPERACION',
      label: 'Recuperar Inactivo',
      icon: Gift,
      desc: 'Cupón especial de bienvenida para clientes que no compran hace tiempo',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Generador de Copy WhatsApp
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold uppercase">
                  SRS Req. 1
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Para: <span className="text-slate-200 font-semibold">{customerName || 'Cliente'}</span> ({customerPhone || 'N/A'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Selector de Motivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
              1. Selecciona el Motivo del Contacto
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {motivosList.map((m) => {
                const Icon = m.icon;
                const isSelected = motivo === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setMotivo(m.id)}
                    className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-500/15 border-emerald-500/60 text-white shadow-md shadow-emerald-500/10'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="text-xs font-bold">{m.label}</span>
                    </div>
                    <span className="text-[11px] leading-tight text-slate-400 line-clamp-2">
                      {m.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Vista Previa del Mensaje Adaptado */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                2. Mensaje Personalizado según Historial
              </label>
              {promoData?.cliente?.plataformasCompradas?.length > 0 && (
                <div className="text-[11px] text-slate-400">
                  Historial:{' '}
                  <span className="text-amber-400 font-semibold">
                    {promoData.cliente.plataformasCompradas.join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="relative">
              {loading ? (
                <div className="h-44 flex flex-col items-center justify-center bg-slate-950/70 border border-slate-800 rounded-xl">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
                  <span className="text-xs text-slate-400">Analizando historial del cliente y redactando copy...</span>
                </div>
              ) : (
                <textarea
                  readOnly
                  value={promoData?.mensajeGenerado || ''}
                  rows={7}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3.5 text-xs text-emerald-200/90 font-mono leading-relaxed outline-none resize-none shadow-inner"
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            onClick={handleCopy}
            disabled={loading || !promoData?.mensajeGenerado}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 disabled:opacity-50"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            {copied ? '¡Copiado al portapapeles!' : 'Copiar Texto'}
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
            <button
              onClick={handleOpenWhatsApp}
              disabled={loading || !promoData?.whatsappUrl}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              Enviar a WhatsApp
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
