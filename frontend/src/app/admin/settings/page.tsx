'use client';

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  Settings,
  ShieldAlert,
  Save,
  Download,
  Upload,
  Database,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Power,
  MessageSquare,
  HelpCircle,
  Clock,
  Sparkles,
  FileCheck,
  Landmark,
  CreditCard,
  Plus,
  Trash2,
  Edit3,
  X,
  Copy,
  Check,
  Tv,
  Image as ImageIcon,
  Sliders,
  Palette,
  Eye,
  Film,
  Layers,
  Move,
  Maximize2,
  Layout,
  HardDrive,
} from 'lucide-react';
import { useDialog } from '@/components/Dialog';
import {
  useSettings,
  BrandTwoToneText,
  DEFAULT_HERO_CONFIG,
  HeroConfig,
} from '@/context/SettingsContext';
import HeroParallaxBackground from '@/components/HeroParallaxBackground';

export interface MedioPago {
  id: string;
  banco: string;
  tipoCuenta: string;
  numeroCuenta: string;
  titular: string;
  documento: string;
  instrucciones?: string;
  activo: boolean;
}

const HERO_PRESETS = [
  {
    name: 'Netflix Collage',
    url: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?q=80&w=2069&auto=format&fit=crop',
    icon: '🍿',
  },
  {
    name: 'Cine 4K & Pantallas',
    url: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=2025&auto=format&fit=crop',
    icon: '🎬',
  },
  {
    name: 'Neón & Streaming',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=2084&auto=format&fit=crop',
    icon: '🌌',
  },
  {
    name: 'Cartelera Estrenos',
    url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?q=80&w=2070&auto=format&fit=crop',
    icon: '🎭',
  },
  {
    name: 'Auditorio IMAX',
    url: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?q=80&w=2070&auto=format&fit=crop',
    icon: '📽️',
  },
];

const COLOR_SWATCHES = [
  { name: 'Negro Profundo', value: '#030712' },
  { name: 'Netflix Dark', value: '#141414' },
  { name: 'Azul Medianoche', value: '#020617' },
  { name: 'Rojo Carmesí', value: '#1a0505' },
  { name: 'Púrpura Cine', value: '#0f0728' },
  { name: 'Azul Espacial', value: '#081325' },
  { name: 'Puro Negro', value: '#000000' },
];

export default function SettingsPage() {
  const { alert, confirm } = useDialog();
  const { refreshSettings, setLocalBrand } = useSettings();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Pestaña Activa: 'configuracion' | 'personalizacion' | 'backups'
  const [activeTab, setActiveTab] = useState<'configuracion' | 'personalizacion' | 'backups'>('configuracion');

  // Backup & Restore states
  const [downloadingBackup, setDownloadingBackup] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Payment Methods Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [paymentForm, setPaymentForm] = useState<MedioPago>({
    id: '',
    banco: 'Bancolombia',
    tipoCuenta: 'Cuenta de Ahorros',
    numeroCuenta: '',
    titular: '',
    documento: '',
    instrucciones: '',
    activo: true,
  });

  // Hero Background customizer state
  const [newHeroImageUrl, setNewHeroImageUrl] = useState('');

  // Formulario de configuraciones
  const [formData, setFormData] = useState({
    mantenimiento: false,
    mensajeMantenimiento: '',
    nombrePlataforma: 'MezaStreaming',
    logoUrl: '',
    whatsappSoporte: '+57 300 123 4567',
    moneda: 'COP',
    comisionBase: 10,
    garantiaDiasBase: 30,
    notificacionesEmail: true,
    mediosPago: [] as MedioPago[],
    heroConfig: DEFAULT_HERO_CONFIG as HeroConfig,
  });

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.get('/settings');
      if (res.data) {
        setFormData({
          mantenimiento: Boolean(res.data.mantenimiento),
          mensajeMantenimiento: res.data.mensajeMantenimiento || 'Estamos realizando mejoras programadas en el servidor.',
          nombrePlataforma: res.data.nombrePlataforma || 'MezaStreaming',
          logoUrl: res.data.logoUrl || '',
          whatsappSoporte: res.data.whatsappSoporte || '+57 300 123 4567',
          moneda: res.data.moneda || 'COP',
          comisionBase: Number(res.data.comisionBase) || 10,
          garantiaDiasBase: Number(res.data.garantiaDiasBase) || 30,
          notificacionesEmail: Boolean(res.data.notificacionesEmail),
          mediosPago: Array.isArray(res.data.mediosPago) ? res.data.mediosPago : [],
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
      console.error('Error al obtener configuraciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingSettings(true);
    setFeedbackMsg('');
    setErrorMsg('');

    try {
      await api.put('/settings', formData);
      setLocalBrand(formData.nombrePlataforma, formData.logoUrl || null);
      await refreshSettings();
      setFeedbackMsg('¡Cambios guardados y sincronizados exitosamente en toda la plataforma!');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al guardar la configuración');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await alert('Por favor selecciona una imagen válida (PNG, JPG, SVG, WebP)', {
        type: 'warning',
        title: 'Formato inválido',
      });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      await alert('El logo no debe superar los 2MB de tamaño', {
        type: 'warning',
        title: 'Archivo muy grande',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({ ...prev, logoUrl: base64 }));
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // GESTIÓN DE FONDO HERO Y PARALLAX (NETFLIX)
  // ==========================================
  const handleAddHeroImageUrl = () => {
    if (!newHeroImageUrl.trim()) return;
    setFormData((prev) => ({
      ...prev,
      heroConfig: {
        ...prev.heroConfig,
        images: [...(prev.heroConfig?.images || []), newHeroImageUrl.trim()],
      },
    }));
    setNewHeroImageUrl('');
  };

  const handleAddPresetImage = (url: string) => {
    if (formData.heroConfig?.images?.includes(url)) {
      alert('Esta imagen ya se encuentra en la lista de rotación.', { type: 'info' });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      heroConfig: {
        ...prev.heroConfig,
        images: [...(prev.heroConfig?.images || []), url],
      },
    }));
  };

  const handleRemoveHeroImage = (index: number) => {
    if ((formData.heroConfig?.images || []).length <= 1) {
      alert('Debe haber al menos 1 imagen configurada para el fondo.', { type: 'warning' });
      return;
    }
    setFormData((prev) => ({
      ...prev,
      heroConfig: {
        ...prev.heroConfig,
        images: prev.heroConfig.images.filter((_, i) => i !== index),
      },
    }));
  };

  const handleHeroFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WebP)', { type: 'warning' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar los 5MB de tamaño', { type: 'warning' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        heroConfig: {
          ...prev.heroConfig,
          images: [...(prev.heroConfig?.images || []), base64],
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // GESTIÓN DE MEDIOS DE PAGO Y CONSIGNACIÓN
  // ==========================================
  const handleOpenAddPayment = () => {
    setEditingPaymentId(null);
    setPaymentForm({
      id: `pago-${Date.now()}`,
      banco: 'Bancolombia',
      tipoCuenta: 'Cuenta de Ahorros',
      numeroCuenta: '',
      titular: '',
      documento: '',
      instrucciones: '',
      activo: true,
    });
    setShowPaymentModal(true);
  };

  const handleOpenEditPayment = (item: MedioPago) => {
    setEditingPaymentId(item.id);
    setPaymentForm({ ...item });
    setShowPaymentModal(true);
  };

  const handleSavePaymentModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentForm.banco.trim() || !paymentForm.numeroCuenta.trim()) {
      await alert('El nombre del banco/billetera y el número de cuenta son obligatorios.', { type: 'warning', title: 'Campos requeridos' });
      return;
    }

    let updatedList: MedioPago[] = [];
    if (editingPaymentId) {
      updatedList = formData.mediosPago.map((item) =>
        item.id === editingPaymentId ? { ...paymentForm } : item
      );
    } else {
      updatedList = [
        ...formData.mediosPago,
        { ...paymentForm, id: paymentForm.id || `pago-${Date.now()}` },
      ];
    }

    const updatedFormData = { ...formData, mediosPago: updatedList };
    setFormData(updatedFormData);
    setShowPaymentModal(false);

    try {
      setSavingSettings(true);
      await api.put('/settings', updatedFormData);
      setFeedbackMsg('Medio de pago guardado y sincronizado con éxito');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al guardar el medio de pago');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTogglePaymentActive = async (id: string) => {
    const updatedList = formData.mediosPago.map((item) =>
      item.id === id ? { ...item, activo: !item.activo } : item
    );
    const updatedFormData = { ...formData, mediosPago: updatedList };
    setFormData(updatedFormData);

    try {
      await api.put('/settings', updatedFormData);
      setFeedbackMsg('Estado del medio de pago actualizado');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al actualizar medio de pago');
    }
  };

  const handleDeletePayment = async (id: string) => {
    const ok = await confirm('¿Seguro que deseas eliminar este medio de pago?', { type: 'danger', title: 'Eliminar Medio de Pago', confirmText: 'Sí, eliminar' });
    if (!ok) return;
    const updatedList = formData.mediosPago.filter((item) => item.id !== id);
    const updatedFormData = { ...formData, mediosPago: updatedList };
    setFormData(updatedFormData);

    try {
      await api.put('/settings', updatedFormData);
      setFeedbackMsg('Medio de pago eliminado del sistema');
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Error al eliminar medio de pago');
    }
  };

  // Crear y descargar copia de seguridad
  const handleDownloadBackup = async () => {
    try {
      setDownloadingBackup(true);
      const res = await api.get('/settings/backup');
      const backupData = res.data;

      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      const platformSlug = (formData.nombrePlataforma || 'MezaStreaming').toLowerCase().replace(/\s+/g, '_');
      link.download = `backup_${platformSlug}_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setFeedbackMsg('Copia de seguridad generada y descargada exitosamente');
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al generar la copia de seguridad', { type: 'error', title: 'Error de Respaldo' });
    } finally {
      setDownloadingBackup(false);
    }
  };

  // Manejar selección de archivo de restauración
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setRestoreFile(e.target.files[0]);
    }
  };

  // Ejecutar restauración
  const handleExecuteRestore = async () => {
    if (!restoreFile) return;

    try {
      setRestoring(true);
      setErrorMsg('');

      const text = await restoreFile.text();
      const parsedData = JSON.parse(text);

      const res = await api.post('/settings/restore', { data: parsedData });
      setShowRestoreModal(false);
      setRestoreFile(null);
      setRestoreSuccess(res.data?.message || 'Copia de seguridad restaurada correctamente.');
      fetchSettings();
      setTimeout(() => setRestoreSuccess(null), 6000);
    } catch (err: any) {
      await alert(
        'Error al restaurar archivo: ' +
          (err.response?.data?.message || err.message || 'Formato JSON inválido'),
        { type: 'error', title: 'Error de Restauración' }
      );
    } finally {
      setRestoring(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        <p className="text-xs text-gray-400">Cargando parámetros globales de la plataforma...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-red-500" />
            <span>Panel de Configuración del Sistema</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Administra los parámetros de operaciones, personalización visual y resguardos de la base de datos.
          </p>
        </div>

        <button
          onClick={fetchSettings}
          className="p-2 bg-gray-900 border border-gray-850 hover:border-gray-700 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer self-start sm:self-auto shadow-sm"
          title="Recargar parámetros"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* FEEDBACK & ALERTS */}
      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {restoreSuccess && (
        <div className="p-3.5 bg-emerald-950/70 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2.5 animate-in fade-in">
          <FileCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <strong>¡Restauración Exitosa!</strong>
            <p className="text-[11px] text-emerald-400/90">{restoreSuccess}</p>
          </div>
        </div>
      )}

      {/* ─── PESTAÑAS DE NAVEGACIÓN INDEPENDIENTES ─── */}
      <div className="flex items-center gap-2 border-b border-gray-850 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('configuracion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'configuracion'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/25 ring-1 ring-red-500/50'
              : 'bg-gray-900/70 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Configuración</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('personalizacion')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'personalizacion'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg shadow-red-600/25 ring-1 ring-red-500/50'
              : 'bg-gray-900/70 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Palette className="w-4 h-4 text-amber-400" />
          <span>Personalización</span>
          <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px] font-mono text-gray-300">
            {formData.heroConfig?.images?.length || 0} imgs
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('backups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'backups'
              ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/25 ring-1 ring-sky-500/50'
              : 'bg-gray-900/70 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Database className="w-4 h-4 text-sky-400" />
          <span>Copias de Seguridad</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ─── PESTAÑA 1: CONFIGURACIÓN (OPERACIONES DEL SISTEMA) ─────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'configuracion' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in duration-200">
          {/* TARJETA 1.1: MODO MANTENIMIENTO */}
          <div className="p-5 bg-gray-950/70 border border-gray-850 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-850">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                    formData.mantenimiento
                      ? 'bg-amber-950/80 border border-amber-800/80 text-amber-400'
                      : 'bg-gray-900 border border-gray-800 text-gray-400'
                  }`}
                >
                  <Power className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Modo Mantenimiento</h2>
                  <p className="text-[11px] text-gray-400">
                    Suspende temporalmente el acceso a la tienda y al portal para clientes.
                  </p>
                </div>
              </div>

              {/* Switch */}
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.mantenimiento}
                  onChange={(e) =>
                    setFormData({ ...formData, mantenimiento: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                <span className="ml-2.5 text-xs font-semibold text-white">
                  {formData.mantenimiento ? 'ACTIVO (Tienda Cerrada)' : 'INACTIVO (En Línea)'}
                </span>
              </label>
            </div>

            {formData.mantenimiento && (
              <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-300">
                <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p>
                  <strong>Atención:</strong> Los visitantes públicos y clientes verán una pantalla de mantenimiento con el mensaje configurado abajo. <strong>Los Administradores conservan acceso total al Backoffice.</strong>
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Mensaje visible para los clientes durante el mantenimiento
              </label>
              <textarea
                rows={2}
                value={formData.mensajeMantenimiento}
                onChange={(e) =>
                  setFormData({ ...formData, mensajeMantenimiento: e.target.value })
                }
                placeholder="Ejemplo: Estamos realizando labores de mantenimiento programado. Volveremos en breve..."
                className="w-full px-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
              />
            </div>
          </div>

          {/* TARJETA 1.2: PARÁMETROS OPERATIVOS */}
          <div className="p-6 bg-gray-950/80 border border-gray-850 rounded-2xl shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-850">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600/20 to-rose-600/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-950/40">
                <Settings className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Parámetros Operativos del Negocio
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Líneas oficiales de atención, divisa comercial, comisiones y respaldo a clientes.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* WhatsApp Soporte */}
              <div className="p-3.5 bg-gray-900/40 border border-gray-800/80 rounded-xl space-y-1.5">
                <label className="block text-gray-300 font-semibold text-xs">WhatsApp Oficial Soporte</label>
                <input
                  type="text"
                  required
                  value={formData.whatsappSoporte}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsappSoporte: e.target.value })
                  }
                  placeholder="+57 300 000 0000"
                  className="w-full px-3 py-2 bg-gray-950/80 border border-gray-800 focus:border-red-600 rounded-lg text-white font-medium text-xs focus:outline-none transition-colors"
                />
                <span className="text-[10px] text-gray-500 block">Número para el botón flotante y ayuda.</span>
              </div>

              {/* Moneda Principal */}
              <div className="p-3.5 bg-gray-900/40 border border-gray-800/80 rounded-xl space-y-1.5">
                <label className="block text-gray-300 font-semibold text-xs">Moneda Principal</label>
                <select
                  value={formData.moneda}
                  onChange={(e) => setFormData({ ...formData, moneda: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-950/80 border border-gray-800 focus:border-red-600 rounded-lg text-white font-medium text-xs focus:outline-none transition-colors"
                >
                  <option value="COP">COP ($ Pesos Colombianos)</option>
                  <option value="USD">USD ($ Dólares)</option>
                  <option value="MXN">MXN ($ Pesos Mexicanos)</option>
                </select>
                <span className="text-[10px] text-gray-500 block">Divisa visible en catálogos y órdenes.</span>
              </div>

              {/* Comisión Base */}
              <div className="p-3.5 bg-gray-900/40 border border-gray-800/80 rounded-xl space-y-1.5">
                <label className="block text-gray-300 font-semibold text-xs">Comisión Vendedores (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  value={formData.comisionBase}
                  onChange={(e) =>
                    setFormData({ ...formData, comisionBase: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-gray-950/80 border border-gray-800 focus:border-red-600 rounded-lg text-white font-medium text-xs focus:outline-none transition-colors"
                />
                <span className="text-[10px] text-gray-500 block">Porcentaje por defecto a revendedores.</span>
              </div>

              {/* Días Base de Garantía */}
              <div className="p-3.5 bg-gray-900/40 border border-gray-800/80 rounded-xl space-y-1.5">
                <label className="block text-gray-300 font-semibold text-xs">Garantía Base (Días)</label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  required
                  value={formData.garantiaDiasBase}
                  onChange={(e) =>
                    setFormData({ ...formData, garantiaDiasBase: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-gray-950/80 border border-gray-800 focus:border-red-600 rounded-lg text-white font-medium text-xs focus:outline-none transition-colors"
                />
                <span className="text-[10px] text-gray-500 block">Días de respaldo estándar al cliente.</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-850 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-gray-500">
                Los cambios operativos se sincronizan en tiempo real.
              </span>
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 font-bold text-xs text-white shadow-lg shadow-red-950/40 hover:shadow-red-900/50 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Guardar Parámetros Operativos</span>
              </button>
            </div>
          </div>

          {/* TARJETA 1.3: MEDIOS DE PAGO Y CUENTAS PARA CONSIGNACIÓN */}
          <div className="p-5 bg-gray-950/70 border border-gray-850 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-850">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800/80 text-purple-400 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Medios de Pago & Cuentas para Consignación</h2>
                  <p className="text-[11px] text-gray-400">
                    Cuentas bancarias y billeteras donde los clientes consignarán el valor de sus compras.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddPayment}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950/40 transition-all cursor-pointer self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Medio de Pago</span>
              </button>
            </div>

            {formData.mediosPago.length === 0 ? (
              <div className="p-8 text-center bg-gray-900/40 border border-dashed border-gray-800 rounded-xl space-y-2">
                <CreditCard className="w-8 h-8 text-gray-600 mx-auto" />
                <p className="text-xs text-gray-400 font-medium">No hay medios de pago configurados.</p>
                <button
                  type="button"
                  onClick={handleOpenAddPayment}
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
                >
                  Agregar el primer medio de pago
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {[...formData.mediosPago]
                  .sort((a, b) => {
                    const aIsNequi = a.banco?.toLowerCase().includes('nequi');
                    const bIsNequi = b.banco?.toLowerCase().includes('nequi');
                    if (aIsNequi && !bIsNequi) return -1;
                    if (!aIsNequi && bIsNequi) return 1;
                    return 0;
                  })
                  .map((item) => {
                    const isMain = item.banco?.toLowerCase().includes('nequi');
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                          isMain
                            ? 'bg-purple-950/20 border-purple-500/80 shadow-lg shadow-purple-950/30 ring-1 ring-purple-500/30'
                            : item.activo
                            ? 'bg-gray-900/70 border-gray-800 hover:border-purple-800/60 shadow-lg'
                            : 'bg-gray-950/40 border-gray-850 opacity-60'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-gray-800/80">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-sm text-white flex items-center gap-1.5">
                                <CreditCard className="w-4 h-4 text-purple-400" />
                                {item.banco}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800/60 text-purple-300 font-semibold">
                                {item.tipoCuenta}
                              </span>
                              {isMain && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black tracking-wide shadow-sm flex items-center gap-1">
                                  ★ PRINCIPAL
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleTogglePaymentActive(item.id)}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                                item.activo
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80'
                                  : 'bg-gray-800 text-gray-400 border-gray-700'
                              }`}
                              title={item.activo ? 'Clic para desactivar' : 'Clic para activar'}
                            >
                              {item.activo ? 'Activo' : 'Inactivo'}
                            </button>
                          </div>

                          <div className="space-y-1.5 mt-2.5 text-xs">
                            <div>
                              <span className="text-[10px] text-gray-400 uppercase font-semibold block">Número de Cuenta / Tel:</span>
                              <div className="flex items-center justify-between gap-2 bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-800 mt-0.5 font-mono text-white text-xs">
                                <span className="font-bold tracking-wider">{item.numeroCuenta}</span>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                              <div>
                                <span className="text-[10px] text-gray-400 block font-semibold">Titular:</span>
                                <span className="text-gray-200 font-medium truncate block">{item.titular}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-gray-400 block font-semibold">Documento/NIT:</span>
                                <span className="text-gray-200 font-mono truncate block">{item.documento}</span>
                              </div>
                            </div>

                            {item.instrucciones && (
                              <p className="text-[10px] text-gray-400 italic pt-1 border-t border-gray-850/80 line-clamp-2">
                                {item.instrucciones}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-800/80 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditPayment(item)}
                            className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors cursor-pointer text-xs flex items-center gap-1 px-2"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(item.id)}
                            className="p-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 transition-colors cursor-pointer text-xs flex items-center gap-1 px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ─── PESTAÑA 2: PERSONALIZACIÓN (MARCA & FONDO HERO PARALLAX) ────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'personalizacion' && (
        <form onSubmit={handleSaveSettings} className="space-y-6 animate-in fade-in duration-200">
          {/* TARJETA 2.1: IDENTIDAD VISUAL DE LA MARCA */}
          <div className="p-6 bg-gray-950/80 border border-gray-850 rounded-2xl shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600/20 to-red-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-950/40">
                  <Tv className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Identidad Visual de la Marca
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Personaliza el nombre de la plataforma y el logotipo oficial visible en barras, correos y portal.
                  </p>
                </div>
              </div>

              {/* Vista Previa en Vivo de la Barra */}
              <div className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-black/60 border border-gray-800 shadow-inner">
                <span className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase">
                  Vista Previa en Barra:
                </span>
                <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${
                      formData.logoUrl
                        ? 'bg-transparent shadow-none'
                        : 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-md shadow-red-600/20'
                    }`}
                  >
                    {formData.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <Tv className="w-3.5 h-3.5 text-white" />
                    )}
                  </div>
                  <BrandTwoToneText name={formData.nombrePlataforma || 'MezaStreaming'} className="text-xs font-black tracking-tight" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
              {/* Columna Izquierda: Nombre Comercial (5 cols) */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
                <div>
                  <label className="block text-gray-300 font-semibold text-xs mb-1.5">
                    Nombre Comercial de la Plataforma
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.nombrePlataforma}
                    onChange={(e) =>
                      setFormData({ ...formData, nombrePlataforma: e.target.value })
                    }
                    placeholder="Ej. MezaStreaming"
                    className="w-full px-3.5 py-2.5 bg-gray-950/80 border border-gray-800 focus:border-red-600 rounded-xl text-white font-semibold text-sm focus:outline-none transition-all placeholder:text-gray-600"
                  />
                  <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
                    Aparece con formato bicolor en la barra superior de administración, portal de clientes y correos.
                  </p>
                </div>

                <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl">
                  <div className="flex items-center gap-2 text-[11px] text-red-300 font-medium">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    <span>Se divide automáticamente: mitad en blanco y mitad en rojo.</span>
                  </div>
                </div>
              </div>

              {/* Columna Derecha: Logo Oficial del Sistema (7 cols) */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-3 lg:border-l lg:border-gray-800 lg:pl-5">
                <div>
                  <label className="block text-gray-300 font-semibold text-xs mb-1.5">
                    Logo Oficial del Sistema
                  </label>
                  <div className="flex items-start gap-4">
                    {/* Caja de Logo */}
                    <div
                      className={`w-16 h-16 rounded-2xl border-2 border-dashed border-gray-800 hover:border-gray-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner relative group transition-colors ${
                        formData.logoUrl ? 'bg-transparent' : 'bg-black/70'
                      }`}
                    >
                      {formData.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-600">
                          <Tv className="w-6 h-6" />
                          <span className="text-[9px] uppercase font-bold tracking-wider mt-0.5">Icono</span>
                        </div>
                      )}
                    </div>

                    {/* Acciones de carga de logo */}
                    <div className="flex-1 space-y-2.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-750 border border-gray-700 hover:border-gray-600 text-xs font-semibold text-white transition-all cursor-pointer shadow-sm active:scale-95">
                          <Upload className="w-3.5 h-3.5 text-red-400" />
                          <span>Subir Logo</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp, image/svg+xml"
                            onChange={handleLogoFileChange}
                            className="hidden"
                          />
                        </label>

                        {formData.logoUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, logoUrl: '' })}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-800 hover:border-rose-900/60 bg-gray-900/60 hover:bg-rose-950/40 text-xs font-medium text-gray-400 hover:text-rose-300 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Quitar Logo</span>
                          </button>
                        )}
                        <span className="text-[10px] text-gray-500 font-medium">Formatos: PNG, JPG, WebP o SVG (máx. 2MB)</span>
                      </div>

                      {/* Enlace directo URL */}
                      <input
                        type="text"
                        value={formData.logoUrl || ''}
                        onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                        placeholder="O pega una URL directa de imagen (https://...)"
                        className="w-full px-3 py-2 bg-gray-950/80 border border-gray-800 focus:border-red-600 rounded-xl text-white text-xs placeholder:text-gray-600 focus:outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TARJETA 2.2: FONDO HERO BANNER & EFECTO PARALLAX (ESTILO NETFLIX) */}
          <div className="p-6 bg-gray-950/80 border border-gray-850 rounded-2xl shadow-xl space-y-6">
            {/* Cabecera Principal */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-850">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600/25 to-rose-600/10 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-lg shadow-red-950/40">
                  <Film className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      Fondo Hero Banner & Efecto Parallax (Estilo Netflix)
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-800/60 text-[10px] font-bold text-red-400">
                      Portada 4K
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Rotación de múltiples imágenes de cine/streaming con efecto parallax, velocidad de transición, opacidad y tonalidad de capa frontal.
                  </p>
                </div>
              </div>

              {/* Switch Habilitar Fondo */}
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={formData.heroConfig?.enabled !== false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      heroConfig: {
                        ...formData.heroConfig,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                <span className="ml-2.5 text-xs font-semibold text-white">
                  {formData.heroConfig?.enabled !== false ? 'FONDO ACTIVO' : 'DESACTIVADO'}
                </span>
              </label>
            </div>

            {/* SIMULADOR EN VIVO (LIVE INTERACTIVE PREVIEW) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-gray-300 font-semibold">
                <div className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-red-400" />
                  <span>Simulador en Tiempo Real (Mueve el mouse para probar el Parallax)</span>
                </div>
                <span className="text-[11px] text-gray-500 font-normal">
                  {formData.heroConfig?.images?.length || 0} imagen(es) en rotación
                </span>
              </div>

              <div className="relative w-full h-56 sm:h-64 rounded-2xl overflow-hidden border border-gray-800 bg-gray-950 shadow-2xl flex flex-col items-center justify-center p-6 text-center group">
                {/* Fondo Parallax Real en el simulador */}
                <HeroParallaxBackground config={formData.heroConfig} isInteractivePreview={true} />

                {/* Contenido Simulado del Hero */}
                <div className="relative z-10 space-y-2 max-w-lg pointer-events-none">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-950/80 border border-red-800/60 text-red-300 text-[10px] font-bold shadow-md">
                    <Sparkles className="w-3 h-3 text-red-400" />
                    <span>Entrega Automática e Inmediata por WhatsApp</span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight">
                    Tu Streaming Favorito en{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-amber-500">
                      4K Ultra HD
                    </span>
                  </h3>
                  <p className="text-[11px] text-gray-300 line-clamp-2">
                    Accede a cuentas y perfiles privados de Netflix, Disney+, Max, Spotify, Prime Video y YouTube con garantía total.
                  </p>
                  <div className="pt-2 flex items-center justify-center gap-2">
                    <div className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold shadow-lg shadow-red-600/30">
                      Ver Catálogo
                    </div>
                    <div className="px-4 py-1.5 rounded-lg bg-gray-900/90 border border-gray-700 text-gray-200 text-[11px] font-semibold">
                      Buscar Mi Cuenta
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN A: GALERÍA Y ADICIÓN DE IMÁGENES */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-200">
                  <ImageIcon className="w-3.5 h-3.5 text-red-500" />
                  <span>Imágenes de Fondo en Rotación ({formData.heroConfig?.images?.length || 0})</span>
                </label>
                <span className="text-[11px] text-gray-500">
                  Se alternan automáticamente según el tiempo de transición seleccionado.
                </span>
              </div>

              {/* Presets Rápidos */}
              <div className="p-3.5 bg-gray-900/50 border border-gray-800/80 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Biblioteca de Fondos 4K Predefinidos (Clic para añadir a tu rotación):</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {HERO_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleAddPresetImage(preset.url)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-950/80 hover:bg-gray-800 border border-gray-800 hover:border-red-600/50 text-xs text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
                    >
                      <span>{preset.icon}</span>
                      <span className="font-medium">{preset.name}</span>
                      <Plus className="w-3 h-3 text-red-400" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Input para agregar URL directa y Subir desde PC */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={newHeroImageUrl}
                    onChange={(e) => setNewHeroImageUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddHeroImageUrl();
                      }
                    }}
                    placeholder="Pega la URL de una imagen (ej. https://images.unsplash.com/...)"
                    className="w-full px-3.5 py-2.5 bg-gray-950/90 border border-gray-800 focus:border-red-600 rounded-xl text-white text-xs placeholder:text-gray-600 focus:outline-none transition-colors"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAddHeroImageUrl}
                  disabled={!newHeroImageUrl.trim()}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all cursor-pointer shadow-md shadow-red-950/30 flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Imagen</span>
                </button>

                <label className="px-4 py-2.5 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-750 hover:border-gray-600 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 active:scale-95 shrink-0">
                  <Upload className="w-3.5 h-3.5 text-red-400" />
                  <span>Subir de PC</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/webp"
                    onChange={handleHeroFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Grid de miniaturas cargadas */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 pt-2">
                {(formData.heroConfig?.images || []).map((imgUrl, index) => (
                  <div
                    key={`${imgUrl}-${index}`}
                    className="group relative rounded-xl overflow-hidden border border-gray-800 bg-gray-900 aspect-video shadow-md hover:border-red-500/60 transition-all"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`Hero ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-between p-1.5">
                      <div className="flex items-center justify-between">
                        <span className="px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-gray-300 font-bold">
                          #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveHeroImage(index)}
                          className="p-1 rounded bg-rose-950/90 hover:bg-rose-900 text-rose-300 border border-rose-800/80 transition-colors cursor-pointer"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-[8px] text-gray-400 truncate max-w-full font-mono">
                        {imgUrl.startsWith('data:') ? 'Imagen subida' : imgUrl}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECCIÓN B: CONTROLADORES DE TIEMPO, OPACIDAD Y TRANSICIÓN */}
            <div className="space-y-4 pt-3 border-t border-gray-850">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                <Sliders className="w-3.5 h-3.5 text-red-500" />
                <span>Parámetros de Transición y Opacidad</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Tiempo de Transición entre Imágenes */}
                <div className="p-4 bg-gray-900/50 border border-gray-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Tiempo por Diapositiva</span>
                    </label>
                    <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800/80 text-amber-300 font-mono text-xs font-bold">
                      {formData.heroConfig?.transitionDuration || 6}s
                    </span>
                  </div>

                  <input
                    type="range"
                    min="2"
                    max="30"
                    step="1"
                    value={formData.heroConfig?.transitionDuration || 6}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        heroConfig: {
                          ...formData.heroConfig,
                          transitionDuration: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-red-600 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>2s (Rápido)</span>
                    <span>6s (Recomendado)</span>
                    <span>30s (Lento)</span>
                  </div>
                </div>

                {/* 2. Suavidad / Velocidad de Fade */}
                <div className="p-4 bg-gray-900/50 border border-gray-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-sky-400" />
                      <span>Velocidad de Disolvencia (Fade)</span>
                    </label>
                    <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-800/80 text-sky-300 font-mono text-xs font-bold">
                      {formData.heroConfig?.fadeSpeed || 1.5}s
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.5"
                    max="3.0"
                    step="0.1"
                    value={formData.heroConfig?.fadeSpeed || 1.5}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        heroConfig: {
                          ...formData.heroConfig,
                          fadeSpeed: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-sky-500 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>0.5s (Corte suave)</span>
                    <span>1.5s (Cinemático)</span>
                    <span>3.0s (Ultra suave)</span>
                  </div>
                </div>

                {/* 3. Opacidad de Imagen de Fondo */}
                <div className="p-4 bg-gray-900/50 border border-gray-800/80 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Opacidad de la Imagen</span>
                    </label>
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-mono text-xs font-bold">
                      {Math.round((formData.heroConfig?.opacity ?? 0.4) * 100)}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="0.05"
                    max="1.0"
                    step="0.05"
                    value={formData.heroConfig?.opacity ?? 0.4}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        heroConfig: {
                          ...formData.heroConfig,
                          opacity: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-emerald-500 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[10px] text-gray-500">
                    <span>5% (Muy tenue)</span>
                    <span>40% (Recomendado)</span>
                    <span>100% (Vívido)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN C: CAPA FRONTAL DE COLOR (TONALIDAD & TRANSPARENCIA) */}
            <div className="space-y-4 pt-3 border-t border-gray-850">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                <span>Capa Frontal de Color, Tonalidad y Efectos Especiales</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 p-5 bg-gray-900/40 border border-gray-800/80 rounded-2xl">
                {/* Selector de Color y Tonalidad (6 cols) */}
                <div className="lg:col-span-6 space-y-3">
                  <div>
                    <label className="block text-gray-300 font-semibold text-xs mb-1.5">
                      Tonalidad / Color de Capa Frontal
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.heroConfig?.overlayColor || '#030712'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            heroConfig: {
                              ...formData.heroConfig,
                              overlayColor: e.target.value,
                            },
                          })
                        }
                        className="w-12 h-10 rounded-xl bg-transparent border border-gray-750 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={formData.heroConfig?.overlayColor || '#030712'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            heroConfig: {
                              ...formData.heroConfig,
                              overlayColor: e.target.value,
                            },
                          })
                        }
                        placeholder="#030712"
                        className="w-32 px-3 py-2 bg-gray-950 border border-gray-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  {/* Paleta Rápida de Muestras de Color */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-gray-400 font-semibold block uppercase">
                      Paletas Predefinidas:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_SWATCHES.map((swatch) => (
                        <button
                          key={swatch.value}
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              heroConfig: {
                                ...formData.heroConfig,
                                overlayColor: swatch.value,
                              },
                            })
                          }
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] transition-all cursor-pointer ${
                            formData.heroConfig?.overlayColor === swatch.value
                              ? 'bg-purple-950 border-purple-500 text-white shadow-sm'
                              : 'bg-gray-950/80 border-gray-800 text-gray-400 hover:text-white'
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-gray-700"
                            style={{ backgroundColor: swatch.value }}
                          />
                          <span>{swatch.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Slider de Transparencia de Capa Frontal y Switches (6 cols) */}
                <div className="lg:col-span-6 space-y-4 lg:border-l lg:border-gray-800 lg:pl-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-gray-200">
                        Opacidad / Fuerza de la Capa Frontal
                      </label>
                      <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800/80 text-purple-300 font-mono text-xs font-bold">
                        {Math.round((formData.heroConfig?.overlayOpacity ?? 0.7) * 100)}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={formData.heroConfig?.overlayOpacity ?? 0.7}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          heroConfig: {
                            ...formData.heroConfig,
                            overlayOpacity: Number(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-purple-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mt-1">
                      <span>0% (Sin color)</span>
                      <span>70% (Equilibrado)</span>
                      <span>100% (Oscuro total)</span>
                    </div>
                  </div>

                  {/* Toggles de Efectos Parallax y Ken Burns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-950/80 border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors">
                      <span className="text-xs font-semibold text-gray-300">
                        Efecto Parallax 3D
                      </span>
                      <input
                        type="checkbox"
                        checked={formData.heroConfig?.enableParallax !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            heroConfig: {
                              ...formData.heroConfig,
                              enableParallax: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-gray-700 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-gray-950/80 border border-gray-800 hover:border-gray-700 cursor-pointer transition-colors">
                      <span className="text-xs font-semibold text-gray-300">
                        Zoom Cinemático (Ken Burns)
                      </span>
                      <input
                        type="checkbox"
                        checked={formData.heroConfig?.enableKenBurns !== false}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            heroConfig: {
                              ...formData.heroConfig,
                              enableKenBurns: e.target.checked,
                            },
                          })
                        }
                        className="rounded border-gray-700 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Botón Guardar Personalización */}
            <div className="pt-4 border-t border-gray-850 flex items-center justify-between flex-wrap gap-3">
              <span className="text-xs text-gray-500">
                Se sincroniza inmediatamente en la portada principal y portales.
              </span>
              <button
                type="submit"
                disabled={savingSettings}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 font-bold text-xs text-white shadow-lg shadow-red-950/40 hover:shadow-red-900/50 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              >
                {savingSettings ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Guardar Personalización Visual</span>
              </button>
            </div>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ─── PESTAÑA 3: COPIAS DE SEGURIDAD (BACKUP & RESTORE) ──────────── */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'backups' && (
        <div className="p-6 bg-gray-950/80 border border-gray-850 rounded-2xl space-y-5 animate-in fade-in duration-200">
          <div className="pb-4 border-b border-gray-850 flex items-center gap-2.5">
            <Database className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-base font-bold text-white">Copias de Seguridad de la Base de Datos</h2>
              <p className="text-xs text-gray-400">
                Resguardo completo y restauración de todas las cuentas, usuarios, órdenes y suscripciones en formato JSON.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Opción 1: Descargar Backup */}
            <div className="p-5 bg-gray-900/70 border border-gray-800 rounded-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Generar Copia de Seguridad</span>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Descarga un volcado íntegro de la base de datos (cuentas en inventario, ventas, tickets, configuraciones y afiliados).
                </p>
              </div>

              <button
                type="button"
                onClick={handleDownloadBackup}
                disabled={downloadingBackup}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer active:scale-95"
              >
                {downloadingBackup ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>Descargar Archivo de Respaldo (.json)</span>
              </button>
            </div>

            {/* Opción 2: Restaurar Backup */}
            <div className="p-5 bg-gray-900/70 border border-gray-800 rounded-xl flex flex-col justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <Upload className="w-4 h-4 text-sky-400" />
                  <span>Restaurar Copia de Seguridad</span>
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Carga un archivo de respaldo generado previamente para restaurar o sincronizar la información del sistema.
                </p>
              </div>

              <div className="space-y-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                  className="w-full text-xs text-gray-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-800 file:text-gray-300 hover:file:bg-gray-700 cursor-pointer"
                />
                <button
                  type="button"
                  disabled={!restoreFile}
                  onClick={() => setShowRestoreModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md shadow-sky-950/40 transition-all cursor-pointer active:scale-95"
                >
                  <Upload className="w-4 h-4" />
                  <span>Iniciar Proceso de Restauración</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DE CONFIRMACIÓN DE RESTAURACIÓN ─── */}
      {showRestoreModal && (
        <div className="fixed inset-0 z-[10010] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-amber-900/80 rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 shrink-0 bg-gray-950/95 text-amber-400">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="text-base font-bold text-white">¿Confirmar Restauración?</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-300 leading-relaxed">
                Está a punto de sincronizar y restaurar la base de datos con el archivo{' '}
                <strong className="text-white font-mono">{restoreFile?.name}</strong>.
              </p>

              <div className="p-3 bg-amber-950/40 border border-amber-900/60 rounded-xl text-xs text-amber-300">
                Las tablas principales (servicios, planes, cuentas, órdenes y usuarios) serán actualizadas con la información de la copia de seguridad.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-gray-850 shrink-0 bg-gray-950/95">
              <button
                type="button"
                onClick={() => setShowRestoreModal(false)}
                className="px-3.5 py-2 rounded-xl bg-gray-900 border border-gray-850 text-xs font-semibold text-gray-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={restoring}
                onClick={handleExecuteRestore}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-xs text-white shadow-md shadow-amber-900/40 cursor-pointer"
              >
                {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{restoring ? 'Restaurando...' : 'Sí, Restaurar Ahora'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL AGREGAR / EDITAR MEDIO DE PAGO ─── */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-purple-900/60 rounded-2xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 shrink-0 bg-gray-950/95">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-950 border border-purple-800 flex items-center justify-center text-purple-400">
                  <Landmark className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {editingPaymentId ? 'Editar Medio de Pago' : 'Nuevo Medio de Pago'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-850 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePaymentModal} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Banco / Billetera *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Bancolombia, Nequi, Daviplata"
                      value={paymentForm.banco}
                      onChange={(e) => setPaymentForm({ ...paymentForm, banco: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Tipo de Cuenta *</label>
                    <select
                      value={paymentForm.tipoCuenta}
                      onChange={(e) => setPaymentForm({ ...paymentForm, tipoCuenta: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-600"
                    >
                      <option value="Cuenta de Ahorros">Cuenta de Ahorros</option>
                      <option value="Billetera Digital">Billetera Digital</option>
                      <option value="Cuenta Corriente">Cuenta Corriente</option>
                      <option value="Llave Bre-B / Transfiya">Llave Bre-B / Transfiya</option>
                      <option value="Corresponsal / Efectivo">Corresponsal / Efectivo</option>
                      <option value="Otro">Otro</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Número de Cuenta / Teléfono / Llave *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 300 123 4567 o 912-000123-45"
                    value={paymentForm.numeroCuenta}
                    onChange={(e) => setPaymentForm({ ...paymentForm, numeroCuenta: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white font-mono focus:outline-none focus:border-purple-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Titular de la Cuenta *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. MezaStreaming SAS o Juan Pérez"
                      value={paymentForm.titular}
                      onChange={(e) => setPaymentForm({ ...paymentForm, titular: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-600"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Documento / Cédula / NIT *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. CC 1.234.567.890 o NIT..."
                      value={paymentForm.documento}
                      onChange={(e) => setPaymentForm({ ...paymentForm, documento: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">
                    Instrucciones o nota para el cliente (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Transferencia directa sin comisión / Enviar comprobante"
                    value={paymentForm.instrucciones || ''}
                    onChange={(e) => setPaymentForm({ ...paymentForm, instrucciones: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-purple-600"
                  />
                </div>
              </div>

              {/* Botones de acción Fijos abajo */}
              <div className="p-4 sm:p-5 border-t border-gray-850 shrink-0 bg-gray-950 flex flex-wrap items-center justify-between gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={paymentForm.activo}
                    onChange={(e) => setPaymentForm({ ...paymentForm, activo: e.target.checked })}
                    className="rounded border-gray-700 text-purple-600 focus:ring-purple-500 w-4 h-4"
                  />
                  <span className="text-gray-200 font-semibold">Habilitar y mostrar a clientes</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="px-3 py-2 rounded-xl bg-gray-900 border border-gray-800 text-gray-300 hover:text-white font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-900/40 cursor-pointer flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Guardar Medio</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
