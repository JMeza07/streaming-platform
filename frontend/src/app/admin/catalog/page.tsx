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

  // Modales de creación
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  // Modales de edición y eliminación
  const [editingService, setEditingService] = useState<any | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<any | null>(null);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [planToDelete, setPlanToDelete] = useState<any | null>(null);

  // Formularios
  const [newService, setNewService] = useState({
    nombre: '',
    logoUrl: '',
    descripcion: '',
  });

  const [editServiceForm, setEditServiceForm] = useState({
    nombre: '',
    logoUrl: '',
    descripcion: '',
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
      const [sRes, pRes] = await Promise.all([
        api.get('/services'),
        api.get('/plans'),
      ]);
      setServices(sRes.data);
      setPlans(pRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const openEditService = (service: any) => {
    setEditingService(service);
    setEditServiceForm({
      nombre: service.nombre || '',
      logoUrl: service.logoUrl || '',
      descripcion: service.descripcion || '',
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
      setNewService({ nombre: '', logoUrl: '', descripcion: '' });
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
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-xs font-medium">
          {successMsg}
        </div>
      )}

      {/* Grid de Plataformas y Planes */}
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
                      <h3 className="text-base font-bold text-white">{service.nombre}</h3>
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
    </div>
  );
}
