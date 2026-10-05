'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import TablePagination from '@/components/TablePagination';
import {
  BarChart3,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  Download,
  Printer,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  UserX,
  UserCheck,
  Tv,
  ExternalLink,
  Loader2,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';
import { useDialog } from '@/components/Dialog';
import { useSettings } from '@/context/SettingsContext';

export default function ReportsPage() {
  const { alert, confirm } = useDialog();
  const { systemName } = useSettings();
  const [activeTab, setActiveTab] = useState<'financial' | 'customers'>('financial');

  // Datos financieros
  const [financialData, setFinancialData] = useState<any>(null);
  const [financialPeriod, setFinancialPeriod] = useState<'byMonth' | 'byDay' | 'byYear'>('byMonth');
  const [loadingFinancial, setLoadingFinancial] = useState(true);

  // Datos de clientes
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [custSearch, setCustSearch] = useState('');
  const [custPlatformFilter, setCustPlatformFilter] = useState('');
  const [custStatusFilter, setCustStatusFilter] = useState('');
  const [custStartDate, setCustStartDate] = useState('');
  const [custEndDate, setCustEndDate] = useState('');

  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Paginación (10 filas máx)
  const [currentFinancialPage, setCurrentFinancialPage] = useState(1);
  const [currentCustomerPage, setCurrentCustomerPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Cargar datos financieros
  const fetchFinancialReports = async () => {
    try {
      setLoadingFinancial(true);
      const res = await api.get('/reports/financial');
      setFinancialData(res.data);
    } catch (err) {
      console.error('Error al cargar informes financieros:', err);
    } finally {
      setLoadingFinancial(false);
    }
  };

  // Cargar directorio de clientes
  const fetchCustomers = async () => {
    try {
      setLoadingCustomers(true);
      const params: any = {};
      if (custPlatformFilter) params.plataforma = custPlatformFilter;
      if (custStartDate) params.startDate = custStartDate;
      if (custEndDate) params.endDate = custEndDate;
      if (custSearch) params.search = custSearch;

      const res = await api.get('/reports/customers', { params });
      setCustomers(res.data);
    } catch (err) {
      console.error('Error al cargar reporte de clientes:', err);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    fetchFinancialReports();
    fetchCustomers();
  }, []);

  // Bloquear / Desbloquear usuario
  const handleToggleCustomerActive = async (cust: any) => {
    const isActive = cust.activo !== false;
    const actionLabel = isActive ? 'bloquear/suspender' : 'reactivar';
    const ok = await confirm(
      `¿Está seguro de que desea ${actionLabel} la cuenta del cliente ${cust.nombre}?`,
      { type: isActive ? 'danger' : 'confirm', title: `${isActive ? 'Suspender' : 'Reactivar'} Cliente`, confirmText: isActive ? 'Sí, suspender' : 'Sí, reactivar' }
    );
    if (!ok) {
      return;
    }

    try {
      const res = await api.patch(`/users/${cust.userId || cust.id}/toggle-active`);
      const newActivo = res.data?.user?.activo !== undefined ? res.data.user.activo : !isActive;
      setCustomers((prev) =>
        prev.map((c) => (c.id === cust.id ? { ...c, activo: newActivo } : c))
      );
      setFeedbackMsg(res.data?.message || `Cliente ${newActivo ? 'reactivado' : 'suspendido'} exitosamente`);
      setTimeout(() => setFeedbackMsg(''), 3000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al modificar estado del usuario', { type: 'error', title: 'Error de Estado' });
    }
  };

  // Obtener plataformas únicas
  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      c.plataformas?.forEach((p: any) => {
        const name = typeof p === 'string' ? p : p?.nombre;
        if (name) set.add(name);
      });
    });
    return Array.from(set);
  }, [customers]);

  // Clientes filtrados
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const phoneVal = c.telefono || c.whatsapp || '';
      const matchesSearch =
        !custSearch ||
        c.nombre?.toLowerCase().includes(custSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(custSearch.toLowerCase()) ||
        phoneVal.includes(custSearch);

      const matchesStatus =
        !custStatusFilter ||
        (custStatusFilter === 'ACTIVO' ? c.activo : !c.activo);

      const matchesPlatform =
        !custPlatformFilter ||
        c.plataformas?.some((p: any) => {
          const name = typeof p === 'string' ? p : p?.nombre;
          return name?.toLowerCase() === custPlatformFilter.toLowerCase();
        });

      return matchesSearch && matchesStatus && matchesPlatform;
    });
  }, [customers, custSearch, custStatusFilter, custPlatformFilter]);

  // Registros financieros seleccionados
  const selectedFinancialRows = useMemo(() => {
    if (!financialData) return [];
    if (financialPeriod === 'byMonth') {
      return (financialData.ingresosPorMes || financialData.byMonth || []).map((r: any) => ({
        period: r.label || r.mes || r.period,
        count: r.cantidad !== undefined ? r.cantidad : r.count,
        total: r.total,
      }));
    }
    if (financialPeriod === 'byDay') {
      return (financialData.ingresosPorDia || financialData.byDay || []).map((r: any) => ({
        period: r.fecha || r.period,
        count: r.cantidad !== undefined ? r.cantidad : r.count,
        total: r.total,
      }));
    }
    return (financialData.ingresosPorAno || financialData.byYear || []).map((r: any) => ({
      period: r.ano || r.period,
      count: r.cantidad !== undefined ? r.cantidad : r.count,
      total: r.total,
    }));
  }, [financialData, financialPeriod]);

  useEffect(() => {
    setCurrentFinancialPage(1);
  }, [financialPeriod]);

  useEffect(() => {
    setCurrentCustomerPage(1);
  }, [custSearch, custPlatformFilter, custStatusFilter, custStartDate, custEndDate]);

  const paginatedFinancialRows = useMemo(() => {
    const start = (currentFinancialPage - 1) * ITEMS_PER_PAGE;
    return selectedFinancialRows.slice(start, start + ITEMS_PER_PAGE);
  }, [selectedFinancialRows, currentFinancialPage]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentCustomerPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentCustomerPage]);

  const totalFacturadoGlobal =
    financialData?.resumen?.totalHistorico || financialData?.summary?.totalVentasGlobal || 0;
  const totalOrdenesCompletadas =
    financialData?.resumen?.totalOrdenes || financialData?.summary?.totalOrdenesCompletadas || 0;
  const promedioOrden =
    financialData?.resumen?.ticketPromedio || financialData?.summary?.promedioOrden || 0;
  const totalComisionesVendedores =
    financialData?.resumen?.totalComisionesVendedores ||
    financialData?.summary?.totalGananciaVendedores ||
    0;

  // Exportar Financiero a CSV
  const handleExportFinancialCSV = () => {
    const periodLabel =
      financialPeriod === 'byMonth' ? 'Mes' : financialPeriod === 'byDay' ? 'Día' : 'Año';

    const columns: ColumnDef[] = [
      { key: 'period', label: periodLabel },
      { key: 'count', label: 'Órdenes Completadas' },
      {
        key: 'total',
        label: 'Total Ingresos COP',
        format: (val) => `$${Number(val).toLocaleString('es-CO')}`,
      },
    ];

    exportToCSV(`reporte_financiero_${financialPeriod}`, columns, selectedFinancialRows);
  };

  // Imprimir Financiero
  const handlePrintFinancial = () => {
    const periodLabel =
      financialPeriod === 'byMonth' ? 'Meses' : financialPeriod === 'byDay' ? 'Días' : 'Años';

    triggerPrintReport({
      title: `Informe Financiero de Ingresos (${periodLabel})`,
      subtitle: `${systemName || 'MezaStreaming'} - Resumen de facturación histórica y flujo de caja`,
      summaryCards: [
        {
          label: 'Total Recaudado Global',
          value: `$${totalFacturadoGlobal.toLocaleString('es-CO')}`,
        },
        {
          label: 'Órdenes Completadas',
          value: totalOrdenesCompletadas,
        },
        {
          label: 'Ticket Promedio',
          value: `$${promedioOrden.toLocaleString('es-CO')}`,
        },
        {
          label: 'Comisiones Vendedores',
          value: `$${totalComisionesVendedores.toLocaleString('es-CO')}`,
        },
      ],
      columns: [
        { key: 'period', label: periodLabel },
        { key: 'count', label: 'Ventas Aprobadas', format: (c) => `${c} pedidos` },
        {
          key: 'total',
          label: 'Ingresos Totales (COP)',
          format: (v) => `$${Number(v).toLocaleString('es-CO')}`,
        },
      ],
      rows: selectedFinancialRows,
    });
  };

  // Exportar Clientes a CSV
  const handleExportCustomersCSV = () => {
    const columns: ColumnDef[] = [
      { key: 'id', label: 'ID Cliente' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'email', label: 'Email' },
      { key: 'telefono', label: 'Teléfono', format: (_, r) => r.telefono || r.whatsapp || 'N/A' },
      {
        key: 'plataformas',
        label: 'Plataformas Contratadas',
        format: (p) =>
          p && p.length > 0
            ? p
                .map((item: any) => (typeof item === 'string' ? item : item?.nombre))
                .filter(Boolean)
                .join(', ')
            : 'Ninguna',
      },
      {
        key: 'totalGastado',
        label: 'Gasto Total COP',
        format: (val) => `$${Number(val).toLocaleString('es-CO')}`,
      },
      { key: 'totalOrdenes', label: 'Órdenes Realizadas', format: (_, r) => r.totalOrdenes ?? r.cantidadOrdenes ?? 0 },
      {
        key: 'createdAt',
        label: 'Fecha Registro',
        format: (_, r) => new Date(r.createdAt || r.fechaRegistro || Date.now()).toLocaleDateString('es-CO'),
      },
      {
        key: 'activo',
        label: 'Estado Cuenta',
        format: (val) => (val ? 'Activo' : 'Suspendido / Bloqueado'),
      },
    ];

    exportToCSV('reporte_clientes_plataformas', columns, filteredCustomers);
  };

  // Imprimir Clientes
  const handlePrintCustomers = () => {
    triggerPrintReport({
      title: 'Directorio de Clientes por Plataformas y Fecha',
      subtitle: `Filtros: ${custPlatformFilter || 'Todas las plataformas'} | Registros: ${filteredCustomers.length}`,
      summaryCards: [
        { label: 'Total Clientes Filtrados', value: filteredCustomers.length },
        {
          label: 'Clientes Activos',
          value: filteredCustomers.filter((c) => c.activo).length,
        },
        {
          label: 'Clientes Suspendidos',
          value: filteredCustomers.filter((c) => !c.activo).length,
        },
        {
          label: 'Total Facturado Clientes',
          value: `$${filteredCustomers
            .reduce((acc, c) => acc + (c.totalGastado || 0), 0)
            .toLocaleString('es-CO')}`,
        },
      ],
      columns: [
        { key: 'nombre', label: 'Cliente', format: (n, r) => `${n} (${r.email})` },
        { key: 'telefono', label: 'Teléfono', format: (_, r) => r.telefono || r.whatsapp || 'N/A' },
        {
          key: 'plataformas',
          label: 'Plataformas',
          format: (p) =>
            p && p.length > 0
              ? p
                  .map((item: any) => (typeof item === 'string' ? item : item?.nombre))
                  .filter(Boolean)
                  .join(', ')
              : 'Sin compras',
        },
        {
          key: 'totalGastado',
          label: 'Total Gastado',
          format: (v) => `$${Number(v).toLocaleString('es-CO')}`,
        },
        { key: 'totalOrdenes', label: 'Compras', format: (_, r) => r.totalOrdenes ?? r.cantidadOrdenes ?? 0 },
        { key: 'createdAt', label: 'Registro', format: (_, r) => new Date(r.createdAt || r.fechaRegistro || Date.now()).toLocaleDateString('es-CO') },
        { key: 'activo', label: 'Estado', format: (a) => (a ? 'Activo' : 'SUSPENDIDO') },
      ],
      rows: filteredCustomers,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-red-500" />
            <span>Informes y Reportes Financieros</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Análisis de ingresos por períodos, histórico de ventas y directorio detallado de clientes con control de acceso.
          </p>
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-1.5 p-1 bg-gray-900 border border-gray-800 rounded-xl">
          <button
            onClick={() => setActiveTab('financial')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'financial'
                ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>Ingresos & Finanzas</span>
          </button>
          <button
            onClick={() => setActiveTab('customers')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'customers'
                ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Clientes & Plataformas</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* TAB 1: FINANCIERO */}
      {activeTab === 'financial' && (
        <div className="space-y-6">
          {/* KPI Cards Globales */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Total Facturado Histórico
              </div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">
                ${totalFacturadoGlobal.toLocaleString('es-CO')}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">COP en órdenes aprobadas</div>
            </div>

            <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Órdenes Completadas
              </div>
              <div className="text-2xl font-bold text-white mt-1">
                {totalOrdenesCompletadas}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Entregas exitosas</div>
            </div>

            <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
              <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                Ticket Promedio
              </div>
              <div className="text-2xl font-bold text-sky-400 mt-1">
                ${promedioOrden.toLocaleString('es-CO')}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">COP por transacción</div>
            </div>

            <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
              <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                Comisiones Vendedores
              </div>
              <div className="text-2xl font-bold text-purple-300 mt-1">
                ${totalComisionesVendedores.toLocaleString('es-CO')}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Pagado / generado en red</div>
            </div>
          </div>

          {/* Selector de Agrupamiento y Botones de Exportar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Agrupar ingresos por:</span>
              <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 p-1 rounded-xl">
                <button
                  onClick={() => setFinancialPeriod('byMonth')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    financialPeriod === 'byMonth'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Meses
                </button>
                <button
                  onClick={() => setFinancialPeriod('byDay')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    financialPeriod === 'byDay'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Días
                </button>
                <button
                  onClick={() => setFinancialPeriod('byYear')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    financialPeriod === 'byYear'
                      ? 'bg-red-600 text-white'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Años
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchFinancialReports}
                className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl cursor-pointer"
                data-tooltip="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrintFinancial}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-200 rounded-xl cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-sky-400" />
                <span>Imprimir Informe</span>
              </button>
              <button
                onClick={handleExportFinancialCSV}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Tabla Financiera */}
          <div className="bg-gray-950/60 border border-gray-850 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-850 bg-gray-900/50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="py-3.5 px-4">
                      {financialPeriod === 'byMonth'
                        ? 'Mes (Año-Mes)'
                        : financialPeriod === 'byDay'
                        ? 'Fecha (Día)'
                        : 'Año'}
                    </th>
                    <th className="py-3.5 px-4">Órdenes Completadas</th>
                    <th className="py-3.5 px-4">Total Ingresos (COP)</th>
                    <th className="py-3.5 px-4">Participación</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850/60 text-xs">
                  {loadingFinancial ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto" />
                        <span className="block mt-2">Calculando ingresos...</span>
                      </td>
                    </tr>
                  ) : selectedFinancialRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-500">
                        No hay ventas registradas para este desglose.
                      </td>
                    </tr>
                  ) : (
                    paginatedFinancialRows.map((row: any, i: number) => {
                      const totalGlobal = totalFacturadoGlobal || 1;
                      const percentage = Math.min(
                        100,
                        Math.round((row.total / (totalGlobal || 1)) * 100)
                      );

                      return (
                        <tr key={i} className="hover:bg-gray-900/40">
                          <td className="py-3.5 px-4 font-mono font-bold text-white">
                            {row.period}
                          </td>
                          <td className="py-3.5 px-4 text-gray-300">
                            {row.count} {row.count === 1 ? 'orden' : 'órdenes'}
                          </td>
                          <td className="py-3.5 px-4 font-semibold text-emerald-400">
                            ${Number(row.total).toLocaleString('es-CO')}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-900 rounded-full h-2 overflow-hidden border border-gray-800">
                                <div
                                  className="bg-red-600 h-2 rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 font-mono">
                                {percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={currentFinancialPage}
              totalItems={selectedFinancialRows.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentFinancialPage}
            />
          </div>
        </div>
      )}

      {/* TAB 2: CLIENTES & PLATAFORMAS */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          {/* Filtros de Clientes */}
          <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Buscador */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  placeholder="Buscar por cliente, correo o tel..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Filtro Plataforma */}
              <div>
                <select
                  value={custPlatformFilter}
                  onChange={(e) => setCustPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-red-600"
                >
                  <option value="">Todas las plataformas</option>
                  {allPlatforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Estado */}
              <div>
                <select
                  value={custStatusFilter}
                  onChange={(e) => setCustStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-red-600"
                >
                  <option value="">Todos los estados</option>
                  <option value="ACTIVO">Activos</option>
                  <option value="SUSPENDIDO">Suspendidos / Bloqueados</option>
                </select>
              </div>

              {/* Botones de acción */}
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={handlePrintCustomers}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-200 rounded-xl cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>Imprimir</span>
                </button>
                <button
                  onClick={handleExportCustomersCSV}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-900/30 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>
          </div>

          {/* Tabla de Clientes */}
          <div className="bg-gray-950/60 border border-gray-850 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-850 bg-gray-900/50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Contacto</th>
                    <th className="py-3.5 px-4">Plataformas Adquiridas</th>
                    <th className="py-3.5 px-4">Gasto Total</th>
                    <th className="py-3.5 px-4">Compras</th>
                    <th className="py-3.5 px-4">Registro</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones de Seguridad</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850/60 text-xs">
                  {loadingCustomers ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto" />
                        <span className="block mt-2">Cargando directorio de clientes...</span>
                      </td>
                    </tr>
                  ) : filteredCustomers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-gray-500">
                        No se encontraron clientes con los filtros especificados.
                      </td>
                    </tr>
                  ) : (
                    paginatedCustomers.map((cust) => (
                      <tr
                        key={cust.id}
                        className={`hover:bg-gray-900/40 transition-colors ${
                          !cust.activo ? 'bg-rose-950/15' : ''
                        }`}
                      >
                        {/* Cliente */}
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{cust.nombre}</div>
                          <div className="text-[10px] text-gray-400">{cust.email}</div>
                        </td>

                        {/* Contacto */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {cust.telefono || cust.whatsapp ? (
                            <a
                              href={`https://wa.me/${(cust.telefono || cust.whatsapp).replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300"
                            >
                              <span>{cust.telefono || cust.whatsapp}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-gray-500 italic">Sin teléfono</span>
                          )}
                        </td>

                        {/* Plataformas */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {cust.plataformas && cust.plataformas.length > 0 ? (
                              cust.plataformas.map((plat: any, idx: number) => {
                                const platName = typeof plat === 'string' ? plat : plat?.nombre || 'Plataforma';
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-950/40 border border-red-900/40 text-red-300 text-[10px] rounded-md font-medium"
                                  >
                                    <Tv className="w-2.5 h-2.5" />
                                    <span>{platName}</span>
                                  </span>
                                );
                              })
                            ) : (
                              <span className="text-gray-500 text-[10px] italic">
                                Sin compras aún
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Gasto Total */}
                        <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                          ${Number(cust.totalGastado || 0).toLocaleString('es-CO')}
                        </td>

                        {/* Compras */}
                        <td className="py-3.5 px-4 text-gray-300 whitespace-nowrap">
                          {cust.totalOrdenes ?? cust.cantidadOrdenes ?? 0} órdenes
                        </td>

                        {/* Registro */}
                        <td className="py-3.5 px-4 text-gray-400 whitespace-nowrap">
                          {new Date(cust.createdAt || cust.fechaRegistro || Date.now()).toLocaleDateString('es-CO')}
                        </td>

                        {/* Estado */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              cust.activo
                                ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                            }`}
                          >
                            {cust.activo ? (
                              <>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Activo</span>
                              </>
                            ) : (
                              <>
                                <XCircle className="w-3 h-3" />
                                <span>SUSPENDIDO</span>
                              </>
                            )}
                          </span>
                        </td>

                        {/* Acciones de Seguridad */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => handleToggleCustomerActive(cust)}
                            title={
                              cust.activo
                                ? 'Suspender / Bloquear acceso a este cliente'
                                : 'Reactivar acceso a este cliente'
                            }
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                              cust.activo
                                ? 'bg-rose-950/50 hover:bg-rose-900/60 text-rose-400 border border-rose-900/50'
                                : 'bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-900/50'
                            }`}
                          >
                            {cust.activo ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Bloquear</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Reactivar</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={currentCustomerPage}
              totalItems={filteredCustomers.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentCustomerPage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
