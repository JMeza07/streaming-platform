'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import TablePagination from '@/components/TablePagination';
import {
  Truck,
  Plus,
  Search,
  Building2,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pencil,
  Trash2,
  ShoppingBag,
  ExternalLink,
  Phone,
  Mail,
  FileText,
  Loader2,
  X,
  Printer,
  Download,
  ShieldAlert,
  ArrowUpRight,
  Database,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import { useDialog } from '@/components/Dialog';

export default function SuppliersPage() {
  const { alert, confirm } = useDialog();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<any | null>(null);
  const [selectedProviderDetail, setSelectedProviderDetail] = useState<any | null>(null);
  const [showBatchModal, setShowBatchModal] = useState<any | null>(null);

  // Formulario Proveedor (Crear/Editar)
  const [providerForm, setProviderForm] = useState({
    nombre: '',
    contacto: '',
    telefono: '',
    email: '',
    notas: '',
  });

  // Formulario Registro de Lote / Compra
  const [batchForm, setBatchForm] = useState({
    costoTotalLote: '',
    cantidadCuentas: 1,
    fechaCompra: new Date().toISOString().split('T')[0],
    planId: '',
    rawAccountsText: '', // formato email:password o email:password:perfil:pin
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 8;

  useEffect(() => {
    const raw = Cookies.get('user') || (typeof window !== 'undefined' ? localStorage.getItem('user') : null);
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  const isAdmin = currentUser?.rol === 'ADMIN';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [provRes, srvRes, plansRes] = await Promise.all([
        api.get('/providers'),
        api.get('/services').catch(() => ({ data: [] })),
        api.get('/plans').catch(() => ({ data: [] })),
      ]);
      setProviders(provRes.data || []);
      setServices(srvRes.data || []);
      setPlans(plansRes.data || []);
    } catch (err: any) {
      console.error('Error cargando datos de proveedores:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtrado y estadísticas globales
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch =
        (p.nombre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.contacto?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (p.telefono?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      const matchesStatus = !statusFilter || p.estado === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [providers, searchTerm, statusFilter]);

  const paginatedProviders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProviders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProviders, currentPage]);

  // Métricas financieras consolidadas
  const totalStats = useMemo(() => {
    let invertido = 0;
    let potencialVenta = 0;
    let totalCuentas = 0;
    let totalActivas = 0;
    let proveedoresActivos = 0;
    let proveedoresCaidos = 0;

    providers.forEach((p) => {
      if (p.estado === 'ACTIVO') proveedoresActivos++;
      else if (p.estado === 'CAIDO') proveedoresCaidos++;

      invertido += Number(p.metricas?.totalCostoInvertido || 0);
      potencialVenta += Number(p.metricas?.totalVentaPotencial || 0);
      totalCuentas += Number(p.metricas?.cuentasTotales || 0);
      totalActivas += Number(p.metricas?.cuentasActivas || 0);
    });

    const ganancia = potencialVenta - invertido;
    const margen = invertido > 0 ? (ganancia / invertido) * 100 : 0;

    return {
      invertido,
      potencialVenta,
      ganancia,
      margen: Math.round(margen * 10) / 10,
      totalCuentas,
      totalActivas,
      proveedoresActivos,
      proveedoresCaidos,
    };
  }, [providers]);

  // Manejo de Crear Proveedor
  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const payload: any = {
        nombre: providerForm.nombre.trim(),
        contacto: providerForm.contacto?.trim() || undefined,
        telefono: providerForm.telefono?.trim() || undefined,
        email: providerForm.email?.trim() || undefined,
        notas: providerForm.notas?.trim() || undefined,
      };

      if (editingProvider) {
        await api.put(`/providers/${editingProvider.id}`, payload);
        setSuccessMsg(`Proveedor "${payload.nombre}" actualizado con éxito.`);
      } else {
        await api.post('/providers', payload);
        setSuccessMsg(`Proveedor "${payload.nombre}" creado exitosamente.`);
      }
      setShowAddModal(false);
      setEditingProvider(null);
      setProviderForm({ nombre: '', contacto: '', telefono: '', email: '', notas: '' });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al guardar proveedor');
    } finally {
      setFormLoading(false);
    }
  };

  // Caída masiva de proveedor (Escenario 9)
  const handleMarkDown = async (prov: any) => {
    const isConfirmed = await confirm(
      `¿Marcar al proveedor "${prov.nombre}" como CAÍDO? Todas sus cuentas raíz se marcarán como caídas, los clientes asociados entrarán en garantía con días congelados y se creará una incidencia maestra.`,
      { type: 'danger', title: 'Caída Masiva de Proveedor', confirmText: 'Confirmar Caída' }
    );
    if (!isConfirmed) return;

    try {
      await api.post(`/providers/${prov.id}/mark-down`, { reason: 'Caída de servidor reportada por el proveedor mayorista' });
      setSuccessMsg(`Proveedor ${prov.nombre} marcado como CAÍDO. Garantías aplicadas en cascada.`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al reportar caída masiva', { type: 'error', title: 'Error' });
    }
  };

  // Reactivar proveedor
  const handleReactivate = async (prov: any) => {
    const isConfirmed = await confirm(
      `¿Reactivar al proveedor "${prov.nombre}"? Se restablecerán sus cuentas raíz y se descongelarán las suscripciones de los clientes.`,
      { type: 'info', title: 'Reactivar Proveedor', confirmText: 'Reactivar' }
    );
    if (!isConfirmed) return;

    try {
      const res = await api.post(`/providers/${prov.id}/reactivate`);
      setSuccessMsg(res.data?.message || `Proveedor ${prov.nombre} reactivado exitosamente.`);
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al reactivar proveedor', { type: 'error', title: 'Error' });
    }
  };

  // Registrar Lote de Compra
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showBatchModal) return;

    setFormLoading(true);
    setFormError('');

    try {
      // Parsear cuentas si se pegó texto
      const parsedAccounts: any[] = [];
      if (batchForm.rawAccountsText.trim()) {
        const lines = batchForm.rawAccountsText.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const parts = trimmed.split(/[:;,]/).map((p) => p.trim());
          if (parts.length >= 2) {
            parsedAccounts.push({
              planId: batchForm.planId,
              emailCuenta: parts[0],
              passwordCuenta: parts[1],
              perfilAsignado: parts[2] || null,
              pinPerfil: parts[3] || null,
            });
          }
        }
      }

      const totalCuentas = parsedAccounts.length > 0 ? parsedAccounts.length : Number(batchForm.cantidadCuentas || 1);

      await api.post(`/providers/${showBatchModal.id}/batches`, {
        costoTotalLote: Number(batchForm.costoTotalLote),
        cantidadCuentas: totalCuentas,
        fechaCompra: batchForm.fechaCompra,
        cuentas: parsedAccounts.length > 0 ? parsedAccounts : undefined,
      });

      setSuccessMsg(`Lote de compra registrado exitosamente con ${totalCuentas} cuentas.`);
      setShowBatchModal(null);
      setBatchForm({
        costoTotalLote: '',
        cantidadCuentas: 1,
        fechaCompra: new Date().toISOString().split('T')[0],
        planId: '',
        rawAccountsText: '',
      });
      fetchData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al registrar lote de compra');
    } finally {
      setFormLoading(false);
    }
  };

  // Ver detalle profundo de un proveedor
  const handleOpenDetail = async (provId: string) => {
    try {
      setLoading(true);
      const res = await api.get(`/providers/${provId}`);
      setSelectedProviderDetail(res.data);
    } catch (err: any) {
      await alert('Error al cargar detalle del proveedor', { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  // Exportar a CSV
  const handleExportCSV = () => {
    const columns: ColumnDef[] = [
      { key: 'id', label: 'ID' },
      { key: 'nombre', label: 'Proveedor' },
      { key: 'contacto', label: 'Contacto', format: (val) => val || 'N/A' },
      { key: 'telefono', label: 'Teléfono', format: (val) => val || 'N/A' },
      { key: 'email', label: 'Email', format: (val) => val || 'N/A' },
      { key: 'estado', label: 'Estado' },
      {
        key: 'metricas',
        label: 'Total Invertido',
        format: (_, p) => `$${Number(p.metricas?.totalCostoInvertido || 0).toLocaleString()}`,
      },
      {
        key: 'metricas',
        label: 'Venta Proyectada',
        format: (_, p) => `$${Number(p.metricas?.totalVentaPotencial || 0).toLocaleString()}`,
      },
      {
        key: 'metricas',
        label: 'Margen Estimado',
        format: (_, p) => `$${Number(p.metricas?.margenGananciaEstimada || 0).toLocaleString()}`,
      },
      {
        key: 'metricas',
        label: 'ROI (%)',
        format: (_, p) => `${p.metricas?.roi || 0}%`,
      },
      {
        key: 'metricas',
        label: 'Cuentas Compradas',
        format: (_, p) => String(p.metricas?.cuentasTotales || 0),
      },
    ];
    exportToCSV('proveedores_streaming_compras', columns, filteredProviders);
  };

  const handlePrint = () => {
    const columns: ColumnDef[] = [
      { key: 'nombre', label: 'Proveedor' },
      { key: 'contacto', label: 'Contacto', format: (v) => v || '-' },
      { key: 'telefono', label: 'Teléfono', format: (v) => v || '-' },
      { key: 'estado', label: 'Estado' },
      {
        key: 'metricas',
        label: 'Inversión',
        format: (_, p) => `$${Number(p.metricas?.totalCostoInvertido || 0).toLocaleString()}`,
      },
      {
        key: 'metricas',
        label: 'Venta PVP',
        format: (_, p) => `$${Number(p.metricas?.totalVentaPotencial || 0).toLocaleString()}`,
      },
      {
        key: 'metricas',
        label: 'Margen',
        format: (_, p) => `$${Number(p.metricas?.margenGananciaEstimada || 0).toLocaleString()} (${p.metricas?.roi || 0}%)`,
      },
      {
        key: 'metricas',
        label: 'Cuentas',
        format: (_, p) => `${p.metricas?.cuentasTotales || 0} (${p.metricas?.cuentasActivas || 0} activas)`,
      },
    ];

    triggerPrintReport({
      title: 'Reporte General de Proveedores y Compras',
      subtitle: 'Distribución mayorista de cuentas de streaming, costos y retorno comercial',
      columns,
      rows: filteredProviders,
      summaryCards: [
        { label: 'Costo Invertido', value: `$${totalStats.invertido.toLocaleString()}` },
        { label: 'Venta PVP Proyectada', value: `$${totalStats.potencialVenta.toLocaleString()}` },
        { label: 'Margen Estimado', value: `$${totalStats.ganancia.toLocaleString()} (${totalStats.margen}%)` },
        { label: 'Total Cuentas Compradas', value: totalStats.totalCuentas },
      ],
    });
  };

  return (
    <div className="space-y-6 text-gray-200">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Proveedores Mayoristas & Compras
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  B2B
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                Control de proveedores a quienes compras las cuentas, registro de lotes de adquisición, costos y rentabilidad.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900/80 hover:bg-gray-800 border border-gray-700/80 rounded-xl text-xs font-semibold text-gray-300 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-gray-400" />
            Imprimir
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900/80 hover:bg-gray-800 border border-gray-700/80 rounded-xl text-xs font-semibold text-gray-300 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            Exportar CSV
          </button>
          {isAdmin && (
            <button
              onClick={() => {
                setEditingProvider(null);
                setProviderForm({ nombre: '', contacto: '', telefono: '', email: '', notas: '' });
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-900/30 hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </button>
          )}
        </div>
      </div>

      {/* MENSAJE DE ÉXITO */}
      {successMsg && (
        <div className="flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-sm animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TARJETAS DE MÉTRICAS GLOBALES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Costo Invertido */}
        <div className="p-4 bg-gray-900/60 border border-gray-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Costo Invertido (Compras)</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ${totalStats.invertido.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Costo total pagado a proveedores mayoristas</p>
        </div>

        {/* Venta Proyectada */}
        <div className="p-4 bg-gray-900/60 border border-gray-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-sky-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Venta Proyectada (PVP)</span>
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ${totalStats.potencialVenta.toLocaleString()}
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Valor comercial de reventa de las cuentas</p>
        </div>

        {/* Margen Estimado */}
        <div className="p-4 bg-gray-900/60 border border-gray-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Margen de Ganancia</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 tracking-tight">
              ${totalStats.ganancia.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
              +{totalStats.margen}% ROI
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">Retorno neto estimado por reventa</p>
        </div>

        {/* Proveedores & Lotes */}
        <div className="p-4 bg-gray-900/60 border border-gray-800/80 rounded-2xl relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cuentas Compradas</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tracking-tight">
              {totalStats.totalCuentas}
            </span>
            <span className="text-xs text-emerald-400">
              ({totalStats.totalActivas} activas/vendidas)
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-1">
            {totalStats.proveedoresActivos} proveedores activos · {totalStats.proveedoresCaidos} caídos
          </p>
        </div>
      </div>

      {/* BARRA DE FILTRO Y BÚSQUEDA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-gray-900/40 p-3 rounded-2xl border border-gray-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Buscar por nombre de proveedor, contacto, teléfono o correo..."
            className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="">Todos los Estados</option>
            <option value="ACTIVO">Solo Activos</option>
            <option value="CAIDO">Solo Caídos</option>
          </select>
        </div>
      </div>

      {/* TABLA PRINCIPAL DE PROVEEDORES */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl backdrop-blur-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
            <p className="text-xs">Cargando directorio de proveedores mayoristas...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-800/50 border border-gray-700/50 flex items-center justify-center text-gray-500">
              <Truck className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white mb-1">No se encontraron proveedores</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto mb-5">
              No hay proveedores que coincidan con la búsqueda o aún no has registrado a tus distribuidores mayoristas de cuentas.
            </p>
            {isAdmin && (
              <button
                onClick={() => {
                  setEditingProvider(null);
                  setProviderForm({ nombre: '', contacto: '', telefono: '', email: '', notas: '' });
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                <Plus className="w-4 h-4" />
                Registrar Primer Proveedor
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950/80 text-gray-400 font-semibold uppercase tracking-wider border-b border-gray-800">
                <tr>
                  <th className="px-5 py-3.5">Proveedor</th>
                  <th className="px-4 py-3.5">Contacto / WhatsApp</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5 text-right">Inversión (Costo)</th>
                  <th className="px-4 py-3.5 text-right">Venta Potencial</th>
                  <th className="px-4 py-3.5 text-right">Margen / ROI</th>
                  <th className="px-4 py-3.5 text-center">Cuentas</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {paginatedProviders.map((p) => {
                  const costo = Number(p.metricas?.totalCostoInvertido || 0);
                  const venta = Number(p.metricas?.totalVentaPotencial || 0);
                  const margen = Number(p.metricas?.margenGananciaEstimada || 0);
                  const roi = Number(p.metricas?.roi || 0);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-800/30 transition-colors group"
                    >
                      {/* Proveedor */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-sm">
                            {p.nombre.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                              {p.nombre}
                            </div>
                            <div className="text-[11px] text-gray-400 mt-0.5">
                              {p.email || 'Sin correo registrado'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="px-4 py-4 text-gray-300">
                        {p.contacto ? (
                          <div className="font-medium text-white">{p.contacto}</div>
                        ) : (
                          <span className="text-gray-500 italic">No especificado</span>
                        )}
                        {p.telefono && (
                          <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-0.5">
                            <Phone className="w-3 h-3" />
                            {p.telefono}
                          </div>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="px-4 py-4">
                        {p.estado === 'ACTIVO' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Activo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                            Caído
                          </span>
                        )}
                      </td>

                      {/* Costo Invertido */}
                      <td className="px-4 py-4 text-right font-mono font-bold text-white">
                        ${costo.toLocaleString()}
                      </td>

                      {/* Venta Potencial */}
                      <td className="px-4 py-4 text-right font-mono text-gray-300">
                        ${venta.toLocaleString()}
                      </td>

                      {/* Margen & ROI */}
                      <td className="px-4 py-4 text-right">
                        <div className="font-mono font-bold text-emerald-400">
                          +${margen.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-semibold text-emerald-500">
                          {roi}% ROI
                        </div>
                      </td>

                      {/* Cuentas Totales / Activas */}
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-gray-800 text-gray-200 font-mono font-semibold text-[11px]">
                          {p.metricas?.cuentasTotales || 0}
                        </span>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {p.metricas?.cuentasActivas || 0} vendidas
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenDetail(p.id)}
                            title="Ver resumen y cuentas compradas"
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <>
                              <button
                                onClick={() => {
                                  setShowBatchModal(p);
                                  setBatchForm({
                                    costoTotalLote: '',
                                    cantidadCuentas: 1,
                                    fechaCompra: new Date().toISOString().split('T')[0],
                                    planId: plans[0]?.id || '',
                                    rawAccountsText: '',
                                  });
                                }}
                                title="Registrar lote de compra"
                                className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              >
                                <ShoppingBag className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => {
                                  setEditingProvider(p);
                                  setProviderForm({
                                    nombre: p.nombre,
                                    contacto: p.contacto || '',
                                    telefono: p.telefono || '',
                                    email: p.email || '',
                                    notas: p.notas || '',
                                  });
                                  setShowAddModal(true);
                                }}
                                title="Editar datos del proveedor"
                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {p.estado === 'ACTIVO' ? (
                                <button
                                  onClick={() => handleMarkDown(p)}
                                  title="Marcar proveedor como CAÍDO (Escenario 9)"
                                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                  <ShieldAlert className="w-4 h-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleReactivate(p)}
                                  title="Reactivar proveedor y descongelar garantías"
                                  className="p-1.5 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 rounded-lg transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {filteredProviders.length > 0 && (
          <div className="p-4 border-t border-gray-800">
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredProviders.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* MODAL: CREAR / EDITAR PROVEEDOR */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                {editingProvider ? 'Editar Proveedor Mayorista' : 'Registrar Nuevo Proveedor'}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-gray-400 font-semibold mb-1">
                  Nombre de la Empresa / Mayorista <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. CuentasPro Latam, Distribuidor Prime, etc."
                  value={providerForm.nombre}
                  onChange={(e) => setProviderForm({ ...providerForm, nombre: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Nombre de Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej. Carlos Vendedor"
                    value={providerForm.contacto}
                    onChange={(e) => setProviderForm({ ...providerForm, contacto: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    placeholder="+573001234567"
                    value={providerForm.telefono}
                    onChange={(e) => setProviderForm({ ...providerForm, telefono: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Correo Electrónico de Soporte B2B</label>
                <input
                  type="email"
                  placeholder="soporte@proveedormayorista.com"
                  value={providerForm.email}
                  onChange={(e) => setProviderForm({ ...providerForm, email: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Notas / Condiciones Comerciales</label>
                <textarea
                  rows={3}
                  placeholder="Condiciones de reposición, enlaces de telegram, reglas de garantía, métodos de pago..."
                  value={providerForm.notas}
                  onChange={(e) => setProviderForm({ ...providerForm, notas: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingProvider ? 'Guardar Cambios' : 'Crear Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR LOTE DE COMPRA AL PROVEEDOR */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-emerald-400" />
                  Registrar Compra de Lote
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Proveedor: <span className="text-emerald-400 font-semibold">{showBatchModal.nombre}</span>
                </p>
              </div>
              <button
                onClick={() => setShowBatchModal(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="p-5 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">
                    Costo Total Pagado ($) <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ej. 150000"
                    value={batchForm.costoTotalLote}
                    onChange={(e) => setBatchForm({ ...batchForm, costoTotalLote: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Fecha de Compra</label>
                  <input
                    type="date"
                    required
                    value={batchForm.fechaCompra}
                    onChange={(e) => setBatchForm({ ...batchForm, fechaCompra: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Plan / Servicio Comprado</label>
                <select
                  value={batchForm.planId}
                  onChange={(e) => setBatchForm({ ...batchForm, planId: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Selecciona el plan</option>
                  {plans.map((pl) => (
                    <option key={pl.id} value={pl.id}>
                      {pl.service?.nombre || 'Streaming'} - {pl.nombrePlan} (${Number(pl.precio).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">
                  Cuentas / Perfiles Recibidos (Opcional - Formato Masivo)
                </label>
                <p className="text-[11px] text-gray-500 mb-1.5">
                  Pega una por línea: <code>email:password</code> o <code>email:password:perfil:pin</code>. Si lo dejas vacío, solo se registrará el gasto y lote contable.
                </p>
                <textarea
                  rows={4}
                  placeholder={`cuenta1@proveedor.com:pass123\ncuenta2@proveedor.com:pass456:Perfil 1:1234`}
                  value={batchForm.rawAccountsText}
                  onChange={(e) => setBatchForm({ ...batchForm, rawAccountsText: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white font-mono text-[11px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl font-semibold text-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Registrar Compra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE PROFUNDO DEL PROVEEDOR */}
      {selectedProviderDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="sticky top-0 bg-gray-900/95 backdrop-blur-md p-5 border-b border-gray-800 flex items-center justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-bold">
                  <Truck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedProviderDetail.nombre}
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        selectedProviderDetail.estado === 'ACTIVO'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}
                    >
                      {selectedProviderDetail.estado}
                    </span>
                  </h2>
                  <p className="text-xs text-gray-400">
                    Historial de compras, lotes adquiridos y cuentas vinculadas.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedProviderDetail(null)}
                className="text-gray-400 hover:text-white p-1.5 rounded-xl hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-xs">
              {/* Tarjetas de Métricas de este proveedor */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl">
                  <span className="text-gray-400 block mb-1">Inversión Total en Compras</span>
                  <span className="text-xl font-black text-white font-mono">
                    ${Number(selectedProviderDetail.metricas?.totalInvertido || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl">
                  <span className="text-gray-400 block mb-1">Venta Proyectada (PVP)</span>
                  <span className="text-xl font-black text-sky-400 font-mono">
                    ${Number(selectedProviderDetail.metricas?.totalVentaProyectada || 0).toLocaleString()}
                  </span>
                </div>
                <div className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl">
                  <span className="text-gray-400 block mb-1">Margen Neto / Ganancia</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    +${Number(selectedProviderDetail.metricas?.margenGanancia || 0).toLocaleString()}
                    <span className="text-xs text-emerald-500 ml-1.5">
                      ({selectedProviderDetail.metricas?.margenPorcentaje}%)
                    </span>
                  </span>
                </div>
              </div>

              {/* Lotes de Compra Registrados */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-emerald-400" />
                  Lotes de Compra Adquiridos ({selectedProviderDetail.batches?.length || 0})
                </h3>
                {selectedProviderDetail.batches?.length === 0 ? (
                  <p className="text-gray-500 italic p-4 bg-gray-950 rounded-xl border border-gray-800">
                    No se han registrado lotes de compra formal para este proveedor aún.
                  </p>
                ) : (
                  <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
                        <tr>
                          <th className="px-4 py-2.5">Fecha</th>
                          <th className="px-4 py-2.5">Cuentas en Lote</th>
                          <th className="px-4 py-2.5 text-right">Costo Total</th>
                          <th className="px-4 py-2.5 text-right">Costo Promedio Unitario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {selectedProviderDetail.batches.map((b: any) => {
                          const unitCost = b.cantidadCuentas > 0 ? Number(b.costoTotalLote) / b.cantidadCuentas : 0;
                          return (
                            <tr key={b.id} className="hover:bg-gray-900/50">
                              <td className="px-4 py-2.5 font-mono text-gray-300">
                                {new Date(b.fechaCompra).toLocaleDateString()}
                              </td>
                              <td className="px-4 py-2.5 text-white font-semibold">
                                {b.cantidadCuentas} cuentas
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono font-bold text-white">
                                ${Number(b.costoTotalLote).toLocaleString()}
                              </td>
                              <td className="px-4 py-2.5 text-right font-mono text-emerald-400">
                                ${Math.round(unitCost).toLocaleString()} / c.u.
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Cuentas Raíz Adquiridas */}
              <div>
                <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" />
                  Cuentas Raíz (Master Accounts) Compradas ({selectedProviderDetail.rootAccounts?.length || 0})
                </h3>
                {selectedProviderDetail.rootAccounts?.length === 0 ? (
                  <p className="text-gray-500 italic p-4 bg-gray-950 rounded-xl border border-gray-800">
                    Sin cuentas maestras asignadas a este proveedor.
                  </p>
                ) : (
                  <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-950">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-900 text-gray-400 border-b border-gray-800">
                        <tr>
                          <th className="px-4 py-2.5">Correo Raíz</th>
                          <th className="px-4 py-2.5">Servicio</th>
                          <th className="px-4 py-2.5">Vencimiento</th>
                          <th className="px-4 py-2.5 text-right">Costo Compra</th>
                          <th className="px-4 py-2.5 text-center">Perfiles / Ocupación</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {selectedProviderDetail.rootAccounts.map((ra: any) => (
                          <tr key={ra.id} className="hover:bg-gray-900/50">
                            <td className="px-4 py-2.5 font-mono text-white font-semibold">
                              {ra.email}
                            </td>
                            <td className="px-4 py-2.5 text-emerald-400">
                              {ra.service?.nombre || 'Streaming'}
                            </td>
                            <td className="px-4 py-2.5 text-gray-300">
                              {ra.fechaVencimientoRaiz
                                ? new Date(ra.fechaVencimientoRaiz).toLocaleDateString()
                                : 'Sin fecha'}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-white">
                              ${Number(ra.costoCompra || 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-2.5 text-center text-gray-400">
                              {ra.accounts?.length || 0} perfiles
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
