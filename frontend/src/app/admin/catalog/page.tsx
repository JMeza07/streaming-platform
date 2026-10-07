'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import {
  Film,
  Plus,
  Tv,
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Layers,
  Sparkles,
  Pencil,
  Trash2,
  Printer,
  Download,
  Calculator,
  HelpCircle,
  ShieldAlert,
  Percent,
  Package,
  MessageSquare,
  Copy,
  Check,
  Lock,
  Unlock,
  Send,
} from 'lucide-react';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import TablePagination from '@/components/TablePagination';
import { useDialog } from '@/components/Dialog';
import { useSettings } from '@/context/SettingsContext';

export default function CatalogPage() {
  const { alert } = useDialog();
  const { systemName } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const paginatedServices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return services.slice(start, start + ITEMS_PER_PAGE);
  }, [services, currentPage]);

  const [activeTab, setActiveTab] = useState<'services' | 'combos' | 'templates'>('services');
  const [combos, setCombos] = useState<any[]>([]);
  const [templateCatalog, setTemplateCatalog] = useState<any | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Modales de creación
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showComboModal, setShowComboModal] = useState(false);

  // Modales de edición y eliminación
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<any | null>(null);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planToDelete, setPlanToDelete] = useState<any | null>(null);
  const [comboToDelete, setComboToDelete] = useState<any | null>(null);

  // Formularios
  const [newService, setNewService] = useState({
    nombre: '',
    logoUrl: '',
    descripcion: '',
    usaPin: true,
  });

  const [editServiceForm, setEditServiceForm] = useState({
    nombre: '',
    logoUrl: '',
    descripcion: '',
    usaPin: true,
  });

  const [newPlan, setNewPlan] = useState({
    serviceId: '',
    nombrePlan: '',
    precio: '',
    resolucion: '4K UHD',
    pantallasSimultaneas: 1,
    duracionDias: 30,
    garantiaDias: 30,
  });

  const [editPlanForm, setEditPlanForm] = useState({
    serviceId: '',
    nombrePlan: '',
    precio: '',
    resolucion: '4K UHD',
    pantallasSimultaneas: 1,
    duracionDias: 30,
    garantiaDias: 30,
  });

  const [newCombo, setNewCombo] = useState<{
    nombre: string;
    descripcion: string;
    precioCombo: string;
    items: Array<{ planId: string; cantidad: number }>;
  }>({
    nombre: '',
    descripcion: '',
    precioCombo: '',
    items: [{ planId: '', cantidad: 1 }, { planId: '', cantidad: 1 }],
  });

  // Calculadora de Precios basada en Manual Operativo (Costo Raíz + Tasa de Riesgo Caída + Margen Deseado)
  const [showCalculatorNew, setShowCalculatorNew] = useState(false);
  const [showCalculatorEdit, setShowCalculatorEdit] = useState(false);
  const [calcParams, setCalcParams] = useState({
    rootCost: 12000, // Costo cuenta raíz mayorista (COP)
    riskRate: 20, // Tasa de caída / reposición sin garantía (%)
    desiredMargin: 40, // Margen de ganancia neto (%)
    profileCount: 4, // Perfiles vendibles por cuenta
  });

  const computedPricing = useMemo(() => {
    const root = Number(calcParams.rootCost) || 0;
    const risk = Number(calcParams.riskRate) || 0;
    const margin = Number(calcParams.desiredMargin) || 0;
    const profiles = Math.max(1, Number(calcParams.profileCount) || 1);

    // 1. Costo Operativo Real: Costo Raíz + (Costo Raíz * Tasa de Riesgo)
    const reserveFundPerAccount = root * (risk / 100);
    const actualOperatingCost = root + reserveFundPerAccount;

    // 2. Costo Unitario por Perfil: Costo Operativo Real / Perfiles Vendibles
    const unitCost = actualOperatingCost / profiles;

    // 3. Precio Final Sugerido: Costo Unitario / (1 - Margen Deseado)
    const marginFactor = Math.max(0.01, 1 - margin / 100);
    const finalPricePerProfile = unitCost / marginFactor;

    // Fondo de Contingencia por perfil vendido
    const contingencyPerProfile = reserveFundPerAccount / profiles;
    // Ganancia neta esperada por perfil
    const profitPerProfile = finalPricePerProfile - unitCost;

    return {
      actualOperatingCost: Math.round(actualOperatingCost),
      reserveFundPerAccount: Math.round(reserveFundPerAccount),
      unitCost: Math.round(unitCost),
      finalPrice: Math.round(finalPricePerProfile),
      contingencyPerProfile: Math.round(contingencyPerProfile),
      profitPerProfile: Math.round(profitPerProfile),
    };
  }, [calcParams]);

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const [sRes, pRes, cRes] = await Promise.all([
        api.get('/services'),
        api.get('/plans'),
        api.get('/combos?all=true').catch(() => ({ data: [] })),
      ]);
      setServices(sRes.data);
      setPlans(pRes.data);
      setCombos(cRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateCatalog = async () => {
    try {
      setLoadingTemplate(true);
      const res = await api.get('/services/templates/catalog');
      setTemplateCatalog(res.data);
    } catch (err) {
      console.error('Error cargando plantilla de precios:', err);
    } finally {
      setLoadingTemplate(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  useEffect(() => {
    if (activeTab === 'templates') {
      fetchTemplateCatalog();
    }
  }, [activeTab]);

  const openEditService = (service: any) => {
    setEditingService(service);
    setEditServiceForm({
      nombre: service.nombre || '',
      logoUrl: service.logoUrl || '',
      descripcion: service.descripcion || '',
      usaPin: service.usaPin !== false,
    });
    setFormError('');
  };

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setFormLoading(true);
    setFormError('');

    try {
      await api.patch(`/services/${editingService.id}`, editServiceForm);
      setEditingService(null);
      setSuccessMsg('¡Plataforma actualizada exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCatalog();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al actualizar plataforma');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteService = async () => {
    if (!serviceToDelete) return;
    setFormLoading(true);
    try {
      await api.delete(`/services/${serviceToDelete.id}`);
      setServiceToDelete(null);
      setSuccessMsg('¡Plataforma eliminada exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCatalog();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'No se pudo eliminar la plataforma (puede tener planes o cuentas asociadas)', { type: 'error', title: 'Error al Eliminar' });
    } finally {
      setFormLoading(false);
    }
  };

  const openEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setEditPlanForm({
      serviceId: plan.serviceId,
      nombrePlan: plan.nombrePlan,
      precio: plan.precio.toString(),
      resolucion: plan.resolucion || '4K UHD',
      pantallasSimultaneas: plan.pantallasSimultaneas || 1,
      duracionDias: plan.duracionDias || 30,
      garantiaDias: plan.garantiaDias || 30,
    });
    setFormError('');
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    setFormLoading(true);
    setFormError('');

    try {
      await api.patch(`/plans/${editingPlan.id}`, {
        ...editPlanForm,
        precio: Number(editPlanForm.precio),
        pantallasSimultaneas: Number(editPlanForm.pantallasSimultaneas),
        duracionDias: Number(editPlanForm.duracionDias),
        garantiaDias: Number(editPlanForm.garantiaDias),
      });
      setEditingPlan(null);
      setSuccessMsg('¡Plan actualizado exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCatalog();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al actualizar el plan');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    setFormLoading(true);
    try {
      await api.delete(`/plans/${planToDelete.id}`);
      setPlanToDelete(null);
      setSuccessMsg('¡Plan eliminado exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCatalog();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'No se pudo eliminar el plan (puede tener inventario u órdenes asociadas)', { type: 'error', title: 'Error al Eliminar' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      await api.post('/services', newService);
      setShowServiceModal(false);
      setNewService({ nombre: '', logoUrl: '', descripcion: '', usaPin: true });
      setSuccessMsg('¡Plataforma creada exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCatalog();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al crear la plataforma');
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      await api.post('/plans', {
        ...newPlan,
        precio: Number(newPlan.precio),
        pantallasSimultaneas: Number(newPlan.pantallasSimultaneas),
        duracionDias: Number(newPlan.duracionDias),
        garantiaDias: Number(newPlan.garantiaDias),
      });
      setShowPlanModal(false);
      setNewPlan({
        serviceId: '',
        nombrePlan: '',
        precio: '',
        resolucion: '4K UHD',
        pantallasSimultaneas: 1,
        duracionDias: 30,
        garantiaDias: 30,
      });
      setSuccessMsg('¡Plan creado exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCatalog();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al crear el plan');
    } finally {
      setFormLoading(false);
    }
  };

  // =========================================================================
  // SRS RF-006 (PUNTO 15): LÓGICA DE COMBOS MULTI-PLATAFORMA
  // =========================================================================
  const computedComboRegularTotal = useMemo(() => {
    let total = 0;
    newCombo.items.forEach((item) => {
      if (!item.planId) return;
      const plan = plans.find((p) => p.id === item.planId);
      if (plan) total += Number(plan.precio) * (item.cantidad || 1);
    });
    return total;
  }, [newCombo.items, plans]);

  const computedComboDiscount = useMemo(() => {
    const regular = computedComboRegularTotal;
    const comboPrice = Number(newCombo.precioCombo) || 0;
    if (regular <= 0 || comboPrice <= 0) return { ahorro: 0, porcentaje: 0, isValid: true };
    const ahorro = regular - comboPrice;
    const porcentaje = regular > 0 ? (ahorro / regular) * 100 : 0;
    return {
      ahorro,
      porcentaje: Math.round(porcentaje),
      isValid: comboPrice < regular,
    };
  }, [computedComboRegularTotal, newCombo.precioCombo]);

  const handleCreateCombo = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = newCombo.items.filter((i) => i.planId);
    if (validItems.length < 2) {
      await alert('Un combo promocional debe incluir al menos 2 planes o plataformas diferentes.', { type: 'warning' });
      return;
    }
    const comboPrice = Number(newCombo.precioCombo);
    if (comboPrice >= computedComboRegularTotal) {
      await alert(
        `El precio del combo ($${comboPrice.toLocaleString('es-CO')}) debe ser estrictamente menor que la suma de sus precios individuales ($${computedComboRegularTotal.toLocaleString('es-CO')}) para garantizar el ahorro al cliente.`,
        { type: 'error', title: 'Precio Inválido' }
      );
      return;
    }

    setFormLoading(true);
    setFormError('');
    try {
      await api.post('/combos', {
        nombre: newCombo.nombre,
        descripcion: newCombo.descripcion,
        precioCombo: comboPrice,
        items: validItems,
      });
      setShowComboModal(false);
      setNewCombo({
        nombre: '',
        descripcion: '',
        precioCombo: '',
        items: [{ planId: '', cantidad: 1 }, { planId: '', cantidad: 1 }],
      });
      setSuccessMsg('¡Combo promocional creado exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCatalog();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al crear el combo');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteCombo = async () => {
    if (!comboToDelete) return;
    setFormLoading(true);
    try {
      await api.delete(`/combos/${comboToDelete.id}`);
      setComboToDelete(null);
      setSuccessMsg('¡Combo eliminado exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchCatalog();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'No se pudo eliminar el combo', { type: 'error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopyTemplate = () => {
    if (!templateCatalog?.templateText) return;
    navigator.clipboard.writeText(templateCatalog.templateText);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 3000);
  };

  const formatCOP = (amount: any) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const handleExportCSV = () => {
    const exportColumns: ColumnDef[] = [
      { key: 'plataforma', label: 'Plataforma', format: (_, r) => r.service?.nombre || 'N/A' },
      { key: 'nombrePlan', label: 'Nombre Plan' },
      { key: 'precio', label: 'Precio COP', format: (val) => `$${Number(val).toLocaleString('es-CO')}` },
      { key: 'pantallas', label: 'Pantallas' },
      { key: 'duracionDias', label: 'Duración (Días)' },
      { key: 'stockDisponible', label: 'Stock Disponible', format: (v) => v || 0 },
      { key: 'activo', label: 'Estado', format: (v) => (v ? 'Activo' : 'Inactivo') },
    ];
    exportToCSV('catalogo_streaming_oficial', exportColumns, plans);
  };

  const handlePrintCatalog = () => {
    triggerPrintReport({
      title: 'Catálogo Oficial de Streaming y Planes',
      subtitle: `${systemName || 'MezaStreaming'} - Listado de tarifas, condiciones y disponibilidad en tiempo real`,
      summaryCards: [
        { label: 'Total Plataformas', value: services.length },
        { label: 'Total Planes', value: plans.length },
        {
          label: 'Total Stock Disponible',
          value: plans.reduce((acc, p) => acc + (p.stockDisponible || 0), 0),
        },
      ],
      columns: [
        { key: 'plataforma', label: 'Plataforma', format: (_, r) => r.service?.nombre || 'N/A' },
        { key: 'nombrePlan', label: 'Plan' },
        { key: 'precio', label: 'Precio (COP)', format: (v) => `$${Number(v).toLocaleString('es-CO')}` },
        { key: 'pantallas', label: 'Pantallas', format: (p) => `${p} pant.` },
        { key: 'duracionDias', label: 'Duración', format: (d) => `${d} días` },
        { key: 'stockDisponible', label: 'Stock', format: (s) => (s > 0 ? `${s} disp.` : 'AGOTADO') },
        { key: 'activo', label: 'Estado', format: (a) => (a ? 'Activo' : 'Inactivo') },
      ],
      rows: plans,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Film className="w-6 h-6 text-red-500" />
            <span>Catálogo de Streaming</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Configuración de plataformas, planes, precios y condiciones de garantía
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintCatalog}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
          {activeTab === 'combos' && (
            <button
              onClick={() => setShowComboModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-purple-950/40 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Combo</span>
            </button>
          )}
          {activeTab === 'services' && (
            <>
              <button
                onClick={() => {
                  setNewPlan({ ...newPlan, serviceId: services[0]?.id || '' });
                  setShowPlanModal(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-gray-400" />
                <span>Nuevo Plan</span>
              </button>
              <button
                onClick={() => setShowServiceModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nueva Plataforma</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'services'
              ? 'bg-red-600/20 text-red-400 border border-red-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
          }`}
        >
          <Film className="w-4 h-4" />
          <span>Plataformas & Planes ({services.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('combos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'combos'
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Combos de Plataformas ({combos.length})</span>
          <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold">
            Multi-Servicio
          </span>
        </button>

        <button
          onClick={() => setActiveTab('templates')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'templates'
              ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
              : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Plantillas WhatsApp (Catálogo Vivo)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold">
            Dinámico
          </span>
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-xs font-medium">
          {successMsg}
        </div>
      )}

      {/* ================= PESTAÑA 1: PLATAFORMAS & PLANES ================= */}
      {activeTab === 'services' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {paginatedServices.map((service) => {
              const servicePlans = plans.filter((p) => p.serviceId === service.id);

              return (
                <div
                  key={service.id}
                  className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4 hover:border-gray-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Cabecera del servicio */}
                    <div className="flex items-start justify-between gap-4 pb-4 border-b border-gray-800">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {service.logoUrl ? (
                          <img
                            src={service.logoUrl}
                            alt={service.nombre}
                            className="w-9 h-9 object-contain rounded-lg shrink-0 bg-black/40 p-1 mt-0.5"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-red-950 flex items-center justify-center font-bold text-red-400 shrink-0 mt-0.5">
                            {service.nombre.substring(0, 2)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="text-base font-bold text-white">{service.nombre}</h3>
                            {service.usaPin === false && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-950/60 text-sky-400 border border-sky-800/40 flex items-center gap-1">
                                <Unlock className="w-2.5 h-2.5" /> Sin PIN
                              </span>
                            )}
                          </div>
                          {service.descripcion && (
                            <p className="text-xs text-gray-400 mt-0.5 leading-relaxed break-words">
                              {service.descripcion}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {service.stockDisponibleTotal !== undefined && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            service.stockDisponibleTotal > 0
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                              : 'bg-red-950/70 text-red-400 border-red-800/40'
                          }`}>
                            {service.stockDisponibleTotal} {service.stockDisponibleTotal === 1 ? 'cuenta libre' : 'cuentas libres'}
                          </span>
                        )}
                        <span className="text-[11px] font-semibold bg-red-950/70 text-red-400 border border-red-800/40 px-2 py-0.5 rounded-full">
                          {servicePlans.length} {servicePlans.length === 1 ? 'plan' : 'planes'}
                        </span>
                        <button
                          onClick={() => openEditService(service)}
                          data-tooltip="Editar plataforma"
                          className="p-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setServiceToDelete(service)}
                          data-tooltip="Eliminar plataforma"
                          className="p-1.5 rounded-lg border border-gray-800 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Lista de planes */}
                    <div className="space-y-2.5 pt-4">
                      {servicePlans.length === 0 ? (
                        <p className="text-xs text-gray-500 italic py-2">
                          Sin planes creados. Agrega un plan para este servicio.
                        </p>
                      ) : (
                        servicePlans.map((plan) => (
                          <div
                            key={plan.id}
                            className="p-3 bg-gray-950/50 border border-gray-800 rounded-xl flex items-center justify-between text-xs hover:border-gray-750 transition-colors"
                          >
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-white">{plan.nombrePlan}</p>
                                {plan.stockDisponible !== undefined && plan.stockDisponible <= 0 ? (
                                  <span className="px-2 py-0.5 rounded-md bg-red-950/80 border border-red-800 text-red-400 font-extrabold text-[9px] uppercase tracking-wider animate-pulse">
                                    Stock: 0 (Agotado)
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-semibold text-[9px]">
                                    Stock: {plan.stockDisponible !== undefined ? plan.stockDisponible : '—'} disp.
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                                <span>{plan.resolucion || 'FHD'}</span>
                                <span>•</span>
                                <span>{plan.pantallasSimultaneas} pantalla(s)</span>
                                <span>•</span>
                                <span>{plan.duracionDias} días</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5">
                              <div className="text-right">
                                <p className="font-bold text-white text-sm">{formatCOP(plan.precio)}</p>
                                <span className="text-[10px] text-emerald-400">
                                  Garantía: {plan.garantiaDias}d
                                </span>
                              </div>
                              <div className="flex items-center gap-1 border-l border-gray-800 pl-2">
                                <button
                                  onClick={() => openEditPlan(plan)}
                                  data-tooltip="Editar plan"
                                  className="p-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setPlanToDelete(plan)}
                                  data-tooltip="Eliminar plan"
                                  className="p-1.5 rounded-lg border border-gray-800 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-850">
                    <button
                      onClick={() => {
                        setNewPlan({ ...newPlan, serviceId: service.id });
                        setShowPlanModal(true);
                      }}
                      className="w-full py-2 bg-gray-950 hover:bg-gray-850 border border-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 text-red-500" />
                      <span>Agregar Plan a {service.nombre}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={services.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {/* ================= PESTAÑA 2: COMBOS DE PLATAFORMAS ================= */}
      {activeTab === 'combos' && (
        <div className="space-y-6">
          {combos.length === 0 ? (
            <div className="bg-gray-900/60 border border-purple-900/40 rounded-2xl p-12 text-center space-y-4">
              <Package className="w-12 h-12 text-purple-400 mx-auto opacity-70" />
              <h3 className="text-base font-bold text-white">No hay Combos Registrados</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                Crea paquetes multi-servicio (ej. Dúo Netflix + Disney+) con tarifas atractivas asegurando ahorro real respecto a la compra individual.
              </p>
              <button
                onClick={() => setShowComboModal(true)}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-purple-950/40"
              >
                Crear Primer Combo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {combos.map((combo) => (
                <div
                  key={combo.id}
                  className="bg-gray-900/60 border border-purple-900/30 rounded-2xl p-6 backdrop-blur-md space-y-4 hover:border-purple-600/50 transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-800">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          Combo Promocional
                        </span>
                        <h3 className="text-base font-bold text-white mt-1.5">{combo.nombre}</h3>
                        {combo.descripcion && (
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                            {combo.descripcion}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setComboToDelete(combo)}
                        className="p-1.5 rounded-lg border border-gray-800 hover:bg-red-950/40 text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Plataformas Incluidas */}
                    <div className="space-y-2 pt-3">
                      <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                        Plataformas Incluidas:
                      </div>
                      <div className="space-y-1.5">
                        {combo.items?.map((item: any) => (
                          <div
                            key={item.id}
                            className="p-2 rounded-xl bg-gray-950/60 border border-gray-800 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-white">
                              {item.serviceNombre} ({item.planNombre})
                            </span>
                            <span className="text-gray-400 text-[11px]">
                              ${Number(item.precioUnitario).toLocaleString('es-CO')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Resumen de Precios y Descuento */}
                  <div className="pt-3 border-t border-gray-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400 line-through">
                        Suma regular: ${Number(combo.precioRegularTotal).toLocaleString('es-CO')}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                        Ahorro: {Number(combo.descuentoPorcentaje || 0).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-purple-300">Precio Combo:</span>
                      <span className="text-lg font-bold text-white">
                        ${Number(combo.precioCombo).toLocaleString('es-CO')} COP
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400 flex items-center justify-between pt-1">
                      <span>Disponibilidad actual:</span>
                      <span className={`font-bold ${combo.stockDisponible > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {combo.stockDisponible > 0 ? `${combo.stockDisponible} combo(s) armables` : 'Sin stock conjunto'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= PESTAÑA 3: PLANTILLAS OFICIALES WHATSAPP ================= */}
      {activeTab === 'templates' && (
        <div className="bg-gray-900/60 border border-emerald-900/30 rounded-2xl p-6 backdrop-blur-md space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
                <span>Lista Oficial de Precios para WhatsApp</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Generada en tiempo real conectada a la base de datos con plataformas, resoluciones y combos activos.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTemplate}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                {copiedTemplate ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedTemplate ? '¡Copiado!' : 'Copiar Catálogo'}</span>
              </button>
              <button
                onClick={() => {
                  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(templateCatalog?.templateText || '')}`;
                  window.open(url, '_blank');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Enviar por WhatsApp</span>
              </button>
            </div>
          </div>

          <div className="relative">
            {loadingTemplate ? (
              <div className="h-64 flex flex-col items-center justify-center bg-gray-950/80 rounded-xl border border-gray-850">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                <span className="text-xs text-gray-400">Compilando catálogo de precios en tiempo real...</span>
              </div>
            ) : (
              <textarea
                readOnly
                rows={16}
                value={templateCatalog?.templateText || ''}
                className="w-full bg-gray-950/90 border border-gray-800 rounded-xl p-4 text-xs font-mono text-emerald-200/90 leading-relaxed outline-none resize-none shadow-inner"
              />
            )}
          </div>
        </div>
      )}

      {/* MODAL: NUEVA PLATAFORMA */}
      {showServiceModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white">Nueva Plataforma de Streaming</h3>
              <button onClick={() => setShowServiceModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateService} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  required
                  value={newService.nombre}
                  onChange={(e) => setNewService({ ...newService, nombre: e.target.value })}
                  placeholder="Ej. Paramount+, Deezer, Crunchyroll"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">URL del Logotipo (opcional)</label>
                <input
                  type="url"
                  value={newService.logoUrl}
                  onChange={(e) => setNewService({ ...newService, logoUrl: e.target.value })}
                  placeholder="https://ejemplo.com/logo.png"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={newService.descripcion}
                  onChange={(e) => setNewService({ ...newService, descripcion: e.target.value })}
                  placeholder="Breve descripción del catálogo..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Requiere PIN por Perfil (SRS Req. 2)</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Desmarca si la plataforma no utiliza PIN de perfil (ej. Spotify, Prime Video, etc.).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={newService.usaPin}
                  onChange={(e) => setNewService({ ...newService, usaPin: e.target.checked })}
                  className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                />
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Servicio</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO PLAN */}
      {showPlanModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white">Crear Nuevo Plan de Suscripción</h3>
              <button onClick={() => setShowPlanModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Plataforma</label>
                <select
                  required
                  value={newPlan.serviceId}
                  onChange={(e) => setNewPlan({ ...newPlan, serviceId: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Selecciona la plataforma</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Nombre del Plan</label>
                <input
                  type="text"
                  required
                  value={newPlan.nombrePlan}
                  onChange={(e) => setNewPlan({ ...newPlan, nombrePlan: e.target.value })}
                  placeholder="Ej. 1 Perfil Privado 4K UHD"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-semibold">Precio de Venta (COP)</label>
                    <button
                      type="button"
                      onClick={() => setShowCalculatorNew(!showCalculatorNew)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20"
                    >
                      <Calculator className="w-3 h-3" />
                      {showCalculatorNew ? 'Ocultar Asistente' : 'Calcular con Riesgo'}
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={newPlan.precio}
                    onChange={(e) => setNewPlan({ ...newPlan, precio: e.target.value })}
                    placeholder="6000"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Resolución</label>
                  <input
                    type="text"
                    value={newPlan.resolucion}
                    onChange={(e) => setNewPlan({ ...newPlan, resolucion: e.target.value })}
                    placeholder="4K UHD, 1080p, etc."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {/* ASISTENTE DE PRICING BASADO EN MANUAL DE OPERACIONES */}
              {showCalculatorNew && (
                <div className="p-4 bg-gradient-to-br from-amber-500/5 to-orange-500/5 border border-amber-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                      <Calculator className="w-4 h-4" />
                      <span>Modelo Matemático de Pricing (Manual de Operaciones)</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">Fórmula con Fondo de Reserva</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Costo Raíz Mayorista</label>
                      <input
                        type="number"
                        value={calcParams.rootCost}
                        onChange={(e) => setCalcParams({ ...calcParams, rootCost: Number(e.target.value) })}
                        placeholder="12000"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Tasa Riesgo Caída (%)</label>
                      <input
                        type="number"
                        value={calcParams.riskRate}
                        onChange={(e) => setCalcParams({ ...calcParams, riskRate: Number(e.target.value) })}
                        placeholder="20"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Margen Neto (%)</label>
                      <input
                        type="number"
                        value={calcParams.desiredMargin}
                        onChange={(e) => setCalcParams({ ...calcParams, desiredMargin: Number(e.target.value) })}
                        placeholder="40"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Perfiles Vendibles</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={calcParams.profileCount}
                        onChange={(e) => setCalcParams({ ...calcParams, profileCount: Number(e.target.value) })}
                        placeholder="4"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Resultados calculados */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-amber-500/10 text-[11px]">
                    <div className="bg-gray-950/80 p-2 rounded-xl border border-gray-800">
                      <span className="text-gray-400 block text-[10px]">Costo Operativo Real</span>
                      <span className="font-mono font-bold text-white">${computedPricing.actualOperatingCost.toLocaleString()}</span>
                      <span className="text-[9px] text-amber-400 block mt-0.5">(Incluye ${computedPricing.reserveFundPerAccount.toLocaleString()} reserva)</span>
                    </div>

                    <div className="bg-gray-950/80 p-2 rounded-xl border border-gray-800">
                      <span className="text-gray-400 block text-[10px]">Costo Mínimo Unitario</span>
                      <span className="font-mono font-bold text-white">${computedPricing.unitCost.toLocaleString()} / perfil</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">Base de absorción</span>
                    </div>

                    <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
                      <div>
                        <span className="text-emerald-400 block text-[10px] font-bold">Precio Sugerido PVP</span>
                        <span className="font-mono font-black text-emerald-300 text-sm">
                          ${computedPricing.finalPrice.toLocaleString()} COP
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setNewPlan({ ...newPlan, precio: String(computedPricing.finalPrice) });
                        }}
                        className="mt-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-1 px-2 rounded-lg text-center transition-all shadow-sm"
                      >
                        Aplicar Precio al Plan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Pantallas</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={newPlan.pantallasSimultaneas}
                    onChange={(e) => setNewPlan({ ...newPlan, pantallasSimultaneas: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Duración (Días)</label>
                  <input
                    type="number"
                    min={1}
                    value={newPlan.duracionDias}
                    onChange={(e) => setNewPlan({ ...newPlan, duracionDias: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Garantía (Días)</label>
                  <input
                    type="number"
                    min={1}
                    value={newPlan.garantiaDias}
                    onChange={(e) => setNewPlan({ ...newPlan, garantiaDias: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Plan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PLATAFORMA */}
      {editingService && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                <span>Editar Plataforma</span>
              </h3>
              <button onClick={() => setEditingService(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateService} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Nombre del Servicio</label>
                <input
                  type="text"
                  required
                  value={editServiceForm.nombre}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, nombre: e.target.value })}
                  placeholder="Ej. Paramount+, Deezer, Crunchyroll"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">URL del Logotipo (opcional)</label>
                <input
                  type="url"
                  value={editServiceForm.logoUrl}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, logoUrl: e.target.value })}
                  placeholder="https://ejemplo.com/logo.png"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Descripción</label>
                <textarea
                  rows={3}
                  value={editServiceForm.descripcion}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, descripcion: e.target.value })}
                  placeholder="Breve descripción del catálogo..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Requiere PIN por Perfil (SRS Req. 2)</span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Desmarca si la plataforma no utiliza PIN de perfil (ej. Spotify, Prime Video, etc.).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={editServiceForm.usaPin}
                  onChange={(e) => setEditServiceForm({ ...editServiceForm, usaPin: e.target.checked })}
                  className="w-4 h-4 accent-blue-600 rounded cursor-pointer"
                />
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR PLATAFORMA */}
      {serviceToDelete && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Confirmar Eliminación</span>
              </h3>
              <button onClick={() => setServiceToDelete(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs text-gray-300">
                ¿Estás seguro de que deseas eliminar permanentemente la plataforma <span className="font-semibold text-white">{serviceToDelete.nombre}</span>? Si existen planes o cuentas asociadas, el sistema protegerá la integridad de la base de datos.
              </p>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setServiceToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteService}
                disabled={formLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Plataforma</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR PLAN */}
      {editingPlan && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                <span>Editar Plan de Suscripción</span>
              </h3>
              <button onClick={() => setEditingPlan(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePlan} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Plataforma</label>
                <select
                  required
                  value={editPlanForm.serviceId}
                  onChange={(e) => setEditPlanForm({ ...editPlanForm, serviceId: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Nombre del Plan</label>
                <input
                  type="text"
                  required
                  value={editPlanForm.nombrePlan}
                  onChange={(e) => setEditPlanForm({ ...editPlanForm, nombrePlan: e.target.value })}
                  placeholder="Ej. 1 Perfil Privado 4K UHD"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-gray-400 font-semibold">Precio de Venta (COP)</label>
                    <button
                      type="button"
                      onClick={() => setShowCalculatorEdit(!showCalculatorEdit)}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20"
                    >
                      <Calculator className="w-3 h-3" />
                      {showCalculatorEdit ? 'Ocultar Asistente' : 'Calcular con Riesgo'}
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    min={1000}
                    value={editPlanForm.precio}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, precio: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Resolución</label>
                  <input
                    type="text"
                    value={editPlanForm.resolucion}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, resolucion: e.target.value })}
                    placeholder="4K UHD, 1080p, etc."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              {/* ASISTENTE DE PRICING BASADO EN MANUAL DE OPERACIONES */}
              {showCalculatorEdit && (
                <div className="p-4 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 border border-blue-500/20 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                      <Calculator className="w-4 h-4" />
                      <span>Modelo Matemático de Pricing (Manual de Operaciones)</span>
                    </div>
                    <span className="text-[10px] text-gray-400 font-mono">Fórmula con Fondo de Reserva</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Costo Raíz Mayorista</label>
                      <input
                        type="number"
                        value={calcParams.rootCost}
                        onChange={(e) => setCalcParams({ ...calcParams, rootCost: Number(e.target.value) })}
                        placeholder="12000"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Tasa Riesgo Caída (%)</label>
                      <input
                        type="number"
                        value={calcParams.riskRate}
                        onChange={(e) => setCalcParams({ ...calcParams, riskRate: Number(e.target.value) })}
                        placeholder="20"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Margen Neto (%)</label>
                      <input
                        type="number"
                        value={calcParams.desiredMargin}
                        onChange={(e) => setCalcParams({ ...calcParams, desiredMargin: Number(e.target.value) })}
                        placeholder="40"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-1">Perfiles Vendibles</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={calcParams.profileCount}
                        onChange={(e) => setCalcParams({ ...calcParams, profileCount: Number(e.target.value) })}
                        placeholder="4"
                        className="w-full bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-1.5 text-white font-mono text-xs"
                      />
                    </div>
                  </div>

                  {/* Resultados calculados */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-blue-500/10 text-[11px]">
                    <div className="bg-gray-950/80 p-2 rounded-xl border border-gray-800">
                      <span className="text-gray-400 block text-[10px]">Costo Operativo Real</span>
                      <span className="font-mono font-bold text-white">${computedPricing.actualOperatingCost.toLocaleString()}</span>
                      <span className="text-[9px] text-blue-400 block mt-0.5">(Incluye ${computedPricing.reserveFundPerAccount.toLocaleString()} reserva)</span>
                    </div>

                    <div className="bg-gray-950/80 p-2 rounded-xl border border-gray-800">
                      <span className="text-gray-400 block text-[10px]">Costo Mínimo Unitario</span>
                      <span className="font-mono font-bold text-white">${computedPricing.unitCost.toLocaleString()} / perfil</span>
                      <span className="text-[9px] text-gray-500 block mt-0.5">Base de absorción</span>
                    </div>

                    <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
                      <div>
                        <span className="text-emerald-400 block text-[10px] font-bold">Precio Sugerido PVP</span>
                        <span className="font-mono font-black text-emerald-300 text-sm">
                          ${computedPricing.finalPrice.toLocaleString()} COP
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditPlanForm({ ...editPlanForm, precio: String(computedPricing.finalPrice) });
                        }}
                        className="mt-1 text-[10px] bg-blue-600 hover:bg-blue-500 text-white font-bold py-1 px-2 rounded-lg text-center transition-all shadow-sm"
                      >
                        Aplicar Precio al Plan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Pantallas</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={editPlanForm.pantallasSimultaneas}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, pantallasSimultaneas: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Duración (Días)</label>
                  <input
                    type="number"
                    min={1}
                    value={editPlanForm.duracionDias}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, duracionDias: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Garantía (Días)</label>
                  <input
                    type="number"
                    min={1}
                    value={editPlanForm.garantiaDias}
                    onChange={(e) => setEditPlanForm({ ...editPlanForm, garantiaDias: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingPlan(null)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR PLAN */}
      {planToDelete && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Confirmar Eliminación de Plan</span>
              </h3>
              <button onClick={() => setPlanToDelete(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs text-gray-300">
                ¿Estás seguro de que deseas eliminar permanentemente el plan <span className="font-semibold text-white">{planToDelete.nombrePlan}</span>? Si existen órdenes o cuentas en inventario asociadas a este plan, el sistema protegerá los registros existentes.
              </p>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setPlanToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePlan}
                disabled={formLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Plan</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: NUEVO COMBO PROMOCIONAL (SRS RF-006) */}
      {showComboModal && (
        <div className="fixed inset-0 z-[10010] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-purple-900/50 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 shrink-0 bg-gray-950/95">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Nuevo Combo de Plataformas</h3>
                  <span className="text-[10px] text-purple-400 font-semibold">Paquete Multi-Servicio con Ahorro Garantizado</span>
                </div>
              </div>
              <button onClick={() => setShowComboModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCombo} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Nombre del Combo *</label>
                  <input
                    type="text"
                    required
                    value={newCombo.nombre}
                    onChange={(e) => setNewCombo({ ...newCombo, nombre: e.target.value })}
                    placeholder="Ej. Combo Dúo (Netflix + Disney+)"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Descripción / Beneficios</label>
                  <input
                    type="text"
                    value={newCombo.descripcion}
                    onChange={(e) => setNewCombo({ ...newCombo, descripcion: e.target.value })}
                    placeholder="Ej. 2 pantallas independientes para ver simultáneamente sin cortes"
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                {/* Selección de Planes del Combo */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-purple-300 uppercase tracking-wider">
                      Planes que Componen el Combo (Mínimo 2)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setNewCombo({
                          ...newCombo,
                          items: [...newCombo.items, { planId: '', cantidad: 1 }],
                        })
                      }
                      className="text-[11px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Agregar otra plataforma
                    </button>
                  </div>

                  <div className="space-y-2">
                    {newCombo.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-gray-900 border border-gray-800">
                        <select
                          required
                          value={item.planId}
                          onChange={(e) => {
                            const updated = [...newCombo.items];
                            updated[idx].planId = e.target.value;
                            setNewCombo({ ...newCombo, items: updated });
                          }}
                          className="flex-1 bg-gray-950 border border-gray-800 rounded-lg px-2.5 py-2 text-white text-xs outline-none focus:border-purple-500"
                        >
                          <option value="">Selecciona plataforma y plan</option>
                          {plans.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.service?.nombre} — {p.nombrePlan} (${Number(p.precio).toLocaleString('es-CO')})
                            </option>
                          ))}
                        </select>

                        {newCombo.items.length > 2 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = newCombo.items.filter((_, i) => i !== idx);
                              setNewCombo({ ...newCombo, items: updated });
                            }}
                            className="p-2 text-gray-500 hover:text-rose-400 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Cálculo Dinámico de Precios */}
                <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-900/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Suma de precios regulares:</span>
                    <span className="text-white font-bold font-mono">
                      ${computedComboRegularTotal.toLocaleString('es-CO')} COP
                    </span>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Precio Promocional del Combo (COP) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1000}
                      value={newCombo.precioCombo}
                      onChange={(e) => setNewCombo({ ...newCombo, precioCombo: e.target.value })}
                      placeholder={`Menor a ${computedComboRegularTotal || 20000}`}
                      className="w-full bg-gray-900 border border-purple-800/60 rounded-xl px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-purple-400"
                    />
                  </div>

                  {Number(newCombo.precioCombo) > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-900/30">
                      <span className="text-gray-400">Ahorro para el cliente:</span>
                      <span
                        className={`font-bold ${
                          computedComboDiscount.isValid ? 'text-emerald-400' : 'text-rose-400 font-extrabold'
                        }`}
                      >
                        {computedComboDiscount.isValid
                          ? `$${computedComboDiscount.ahorro.toLocaleString('es-CO')} (${computedComboDiscount.porcentaje}%)`
                          : '⚠️ El precio debe ser menor que la suma individual'}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 sm:p-5 border-t border-gray-850 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowComboModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading || !computedComboDiscount.isValid}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-purple-950/40"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Combo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINAR COMBO */}
      {comboToDelete && (
        <div className="fixed inset-0 z-[10010] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-rose-500" />
              <span>Eliminar Combo Promocional</span>
            </h3>
            <p className="text-xs text-gray-400">
              ¿Estás seguro de que deseas desactivar el combo <span className="text-white font-semibold">{comboToDelete.nombre}</span>?
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setComboToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCombo}
                disabled={formLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
