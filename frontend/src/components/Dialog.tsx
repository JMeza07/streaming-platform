'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  HelpCircle,
  X,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

type DialogType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'danger';

interface DialogOptions {
  type?: DialogType;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

interface DialogState extends DialogOptions {
  open: boolean;
  resolve?: (value: boolean) => void;
}

interface DialogContextValue {
  alert: (message: string, options?: Omit<DialogOptions, 'message'>) => Promise<void>;
  confirm: (message: string, options?: Omit<DialogOptions, 'message'>) => Promise<boolean>;
}

// ─── Context ─────────────────────────────────────────────────────────────────

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used within <DialogProvider>');
  return ctx;
}

// ─── Icon & Colors per type ──────────────────────────────────────────────────

const typeConfig: Record<
  DialogType,
  {
    icon: React.ElementType;
    iconClass: string;
    iconBg: string;
    confirmClass: string;
    titleColor: string;
    borderColor: string;
    glowColor: string;
  }
> = {
  success: {
    icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    iconBg: 'bg-emerald-950/80 border-emerald-800/60',
    confirmClass: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30',
    titleColor: 'text-emerald-300',
    borderColor: 'border-emerald-900/60',
    glowColor: 'shadow-emerald-950/40',
  },
  error: {
    icon: XCircle,
    iconClass: 'text-rose-400',
    iconBg: 'bg-rose-950/80 border-rose-800/60',
    confirmClass: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30',
    titleColor: 'text-rose-300',
    borderColor: 'border-rose-900/60',
    glowColor: 'shadow-rose-950/40',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-400',
    iconBg: 'bg-amber-950/80 border-amber-800/60',
    confirmClass: 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30',
    titleColor: 'text-amber-300',
    borderColor: 'border-amber-900/60',
    glowColor: 'shadow-amber-950/40',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-400',
    iconBg: 'bg-blue-950/80 border-blue-800/60',
    confirmClass: 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30',
    titleColor: 'text-blue-300',
    borderColor: 'border-blue-900/60',
    glowColor: 'shadow-blue-950/40',
  },
  confirm: {
    icon: HelpCircle,
    iconClass: 'text-violet-400',
    iconBg: 'bg-violet-950/80 border-violet-800/60',
    confirmClass: 'bg-violet-600 hover:bg-violet-500 shadow-violet-600/30',
    titleColor: 'text-violet-300',
    borderColor: 'border-violet-900/60',
    glowColor: 'shadow-violet-950/40',
  },
  danger: {
    icon: AlertTriangle,
    iconClass: 'text-red-400',
    iconBg: 'bg-red-950/80 border-red-800/60',
    confirmClass: 'bg-red-600 hover:bg-red-500 shadow-red-600/30',
    titleColor: 'text-red-300',
    borderColor: 'border-red-900/60',
    glowColor: 'shadow-red-950/40',
  },
};

// ─── Default titles per type ─────────────────────────────────────────────────

const defaultTitles: Record<DialogType, string> = {
  success: 'Operación Exitosa',
  error: 'Ha Ocurrido un Error',
  warning: 'Atención Requerida',
  info: 'Información del Sistema',
  confirm: '¿Confirmar Acción?',
  danger: 'Acción Irreversible',
};

// ─── Modal UI Component ──────────────────────────────────────────────────────

function DialogModal({ state, onClose }: { state: DialogState; onClose: (result: boolean) => void }) {
  const cfg = typeConfig[state.type || 'info'];
  const Icon = cfg.icon;
  const title = state.title || defaultTitles[state.type || 'info'];
  const isConfirm = state.type === 'confirm' || state.type === 'danger';

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false);
      if (e.key === 'Enter') onClose(true);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!state.open) return null;

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.6)' }}
      onClick={() => onClose(false)}
    >
      {/* Card */}
      <div
        className={`
          relative w-full max-w-md
          bg-gray-950 border ${cfg.borderColor}
          rounded-2xl shadow-2xl ${cfg.glowColor}
          animate-in zoom-in-95 fade-in duration-200
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div
          className={`absolute top-0 left-8 right-8 h-0.5 rounded-full opacity-60 ${
            state.type === 'success'
              ? 'bg-emerald-500'
              : state.type === 'error'
              ? 'bg-rose-500'
              : state.type === 'warning' || state.type === 'danger'
              ? 'bg-amber-500'
              : state.type === 'confirm'
              ? 'bg-violet-500'
              : 'bg-blue-500'
          }`}
        />

        <div className="p-6 pt-7">
          {/* Close button */}
          <button
            onClick={() => onClose(false)}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Icon + Title */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center border shrink-0
                ${cfg.iconBg}
              `}
            >
              <Icon className={`w-6 h-6 ${cfg.iconClass}`} />
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className={`text-base font-bold tracking-tight ${cfg.titleColor}`}>
                {title}
              </h3>
              <p className="text-sm text-gray-300 mt-1.5 leading-relaxed">
                {state.message}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className={`flex items-center gap-3 mt-5 ${isConfirm ? 'justify-end' : 'justify-center'}`}>
            {isConfirm && (
              <button
                onClick={() => onClose(false)}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-300 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 transition-all cursor-pointer"
              >
                {state.cancelText || 'Cancelar'}
              </button>
            )}
            <button
              autoFocus
              onClick={() => onClose(true)}
              className={`
                px-5 py-2 rounded-xl text-sm font-bold text-white
                ${cfg.confirmClass}
                shadow-lg transition-all cursor-pointer
                active:scale-95
              `}
            >
              {state.confirmText || (isConfirm ? 'Confirmar' : 'Entendido')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

let globalAlert: ((message: string, options?: Omit<DialogOptions, 'message'>) => Promise<void>) | null = null;
let globalConfirm: ((message: string, options?: Omit<DialogOptions, 'message'>) => Promise<boolean>) | null = null;

export const dialog = {
  alert: (message: string, options?: Omit<DialogOptions, 'message'>) => {
    if (globalAlert) return globalAlert(message, options);
    if (typeof window !== 'undefined') window.alert(message);
    return Promise.resolve();
  },
  confirm: (message: string, options?: Omit<DialogOptions, 'message'>) => {
    if (globalConfirm) return globalConfirm(message, options);
    if (typeof window !== 'undefined') return Promise.resolve(window.confirm(message));
    return Promise.resolve(true);
  }
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>({ open: false, message: '' });

  const openDialog = useCallback(
    (options: DialogOptions): Promise<boolean> =>
      new Promise((resolve) => {
        setState({ ...options, open: true, resolve });
      }),
    []
  );

  const close = useCallback((result: boolean) => {
    setState((prev) => {
      prev.resolve?.(result);
      return { ...prev, open: false };
    });
  }, []);

  const alert = useCallback(
    async (message: string, options?: Omit<DialogOptions, 'message'>) => {
      await openDialog({ type: 'info', ...options, message });
    },
    [openDialog]
  );

  const confirm = useCallback(
    (message: string, options?: Omit<DialogOptions, 'message'>): Promise<boolean> =>
      openDialog({ type: 'confirm', ...options, message }),
    [openDialog]
  );

  useEffect(() => {
    globalAlert = alert;
    globalConfirm = confirm;
    return () => {
      globalAlert = null;
      globalConfirm = null;
    };
  }, [alert, confirm]);

  return (
    <DialogContext.Provider value={{ alert, confirm }}>
      {children}
      {state.open && <DialogModal state={state} onClose={close} />}
    </DialogContext.Provider>
  );
}

