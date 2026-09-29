'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import api from '@/lib/api';
import { exportToCSV, ColumnDef } from '@/lib/exportUtils';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  RefreshCw,
  Filter,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  User,
  Activity,
  Layers,
  FileText,
  Copy,
  Check,
  Globe,
  Terminal,
  Server,
  Lock,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Database,
  ShoppingCart,
  Headset,
  Users as UsersIcon,
  HelpCircle,
  X,
} from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import { useDialog } from '@/components/Dialog';

interface AuditLog {
  id: string;
  accion: string;
  modulo: string;
  severidad: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'CRITICAL';
  descripcion: string;
  detalles: any;
  ip: string | null;
  userAgent: string | null;
  entidadTipo: string | null;
  entidadId: string | null;
  exito: boolean;
  errorMensaje: string | null;
  usuarioId: string | null;
  usuarioNombre: string | null;
  usuarioEmail: string | null;
  usuarioRol: string | null;
  createdAt: string;
  usuario?: {
    nombre: string;
    email: string;
    rol: string;
  } | null;
}

interface AuditStats {
  total: number;
  hoy: number;
  criticos: number;
  fallos: number;
  porSeveridad: Record<string, number>;
  porModulo: Record<string, number>;
  topOperadores: Array<{
    nombre: string;
    email: string;
    rol: string;
    total: number;
  }>;
}

const MODULE_OPTIONS = [
  { value: '', label: 'Todos los Módulos' },
  { value: 'AUTH', label: 'Seguridad y Accesos (AUTH)' },
  { value: 'VENTAS', label: 'Ventas y Despachos (VENTAS)' },
  { value: 'INVENTARIO', label: 'Inventario y Lotes (INVENTARIO)' },
  { value: 'GARANTIAS', label: 'Garantías y Soporte (GARANTIAS)' },
  { value: 'CLIENTES', label: 'Directorio Clientes (CLIENTES)' },
  { value: 'USUARIOS', label: 'Usuarios y Roles (USUARIOS)' },
  { value: 'FINANZAS', label: 'Finanzas y Caja (FINANZAS)' },
  { value: 'SISTEMA', label: 'Sistema y Configuración (SISTEMA)' },
];

const SEVERITY_OPTIONS = [
  { value: '', label: 'Todas las Severidades' },
  { value: 'INFO', label: 'Informativo (INFO)' },
  { value: 'SUCCESS', label: 'Éxito Operativo (SUCCESS)' },
  { value: 'WARNING', label: 'Advertencia (WARNING)' },
  { value: 'ERROR', label: 'Error (ERROR)' },
  { value: 'CRITICAL', label: 'Crítico / Riesgo (CRITICAL)' },
];

export default function AuditPage() {
  const { alert } = useDialog();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filtros
  const [search, setSearch] = useState('');
  const [modulo, setModulo] = useState('');
  const [severidad, setSeveridad] = useState('');
  const [exito, setExito] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modal de inspección
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);

  // Carga de datos
  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params: any = {
        page,
        limit,
      };
      if (search) params.search = search;
      if (modulo) params.modulo = modulo;
      if (severidad) params.severidad = severidad;
      if (exito) params.exito = exito;
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;

      const [logsRes, statsRes] = await Promise.all([
        api.get('/audit', { params }),
        api.get('/audit/stats'),
      ]);

      setLogs(logsRes.data.logs || []);
      setTotalRecords(logsRes.data.total || 0);
      setTotalPages(logsRes.data.totalPages || 1);
      setStats(statsRes.data);
    } catch (err: any) {
      console.error('Error al consultar logs de auditoría:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, search, modulo, severidad, exito, fechaDesde, fechaHasta]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Manejo de exportación
  const handleExportCSV = async () => {
    try {
      const params: any = {};
      if (search) params.search = search;
      if (modulo) params.modulo = modulo;
      if (severidad) params.severidad = severidad;
      if (exito) params.exito = exito;
      if (fechaDesde) params.fechaDesde = fechaDesde;
      if (fechaHasta) params.fechaHasta = fechaHasta;

      const res = await api.get('/audit/export', { params });
      const exportData = res.data || [];

      const columns: ColumnDef[] = [
        {
          key: 'createdAt',
          label: 'Fecha y Hora',
          format: (val) => new Date(val).toLocaleString('es-CO'),
        },
        { key: 'accion', label: 'Acción' },
        { key: 'modulo', label: 'Módulo' },
        { key: 'severidad', label: 'Severidad' },
        {
          key: 'exito',
          label: 'Estado Procedimiento',
          format: (val) => (val ? 'CORRECTO / ÉXITO' : 'FALLIDO / ERROR'),
        },
        {
          key: 'usuarioNombre',
          label: 'Operador',
          format: (val, row) => `${val || row.usuario?.nombre || 'Sistema'} (${row.usuarioRol || row.usuario?.rol || 'SISTEMA'})`,
        },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'entidadTipo', label: 'Tipo Entidad' },
        { key: 'entidadId', label: 'ID Entidad' },
        { key: 'ip', label: 'Dirección IP' },
        { key: 'userAgent', label: 'Navegador / Dispositivo' },
      ];

      exportToCSV('auditoria_sistema', columns, exportData);
    } catch (error) {
      await alert('Error exportando los registros de auditoría', { type: 'error', title: 'Error de Exportación' });
    }
  };

  // Botones de filtro rápido de fecha
  const setQuickDate = (type: 'today' | '7days' | 'month' | 'clear') => {
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().split('T')[0];

    if (type === 'today') {
      const ymd = formatYMD(today);
      setFechaDesde(ymd);
      setFechaHasta(ymd);
    } else if (type === '7days') {
      const past = new Date();
      past.setDate(today.getDate() - 7);
      setFechaDesde(formatYMD(past));
      setFechaHasta(formatYMD(today));
    } else if (type === 'month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setFechaDesde(formatYMD(firstDay));
      setFechaHasta(formatYMD(today));
    } else {
      setFechaDesde('');
      setFechaHasta('');
    }
    setPage(1);
  };

  const resetAllFilters = () => {
    setSearch('');
    setModulo('');
    setSeveridad('');
    setExito('');
    setFechaDesde('');
    setFechaHasta('');
    setPage(1);
  };

  // Ayudantes de estilo para severidades
  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            CRÍTICO
          </span>
        );
      case 'ERROR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" />
            ERROR
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            ADVERTENCIA
          </span>
        );
      case 'SUCCESS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ÉXITO
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Activity className="w-3.5 h-3.5" />
            INFO
          </span>
        );
    }
  };

  const getModuleBadge = (mod: string) => {
    switch (mod) {
      case 'AUTH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
            <Lock className="w-3 h-3 text-indigo-400" />
            Seguridad / Auth
          </span>
        );
      case 'VENTAS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/20">
            <ShoppingCart className="w-3 h-3 text-emerald-400" />
            Ventas / POS
          </span>
        );
      case 'INVENTARIO':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
            <Database className="w-3 h-3 text-cyan-400" />
            Inventario
          </span>
        );
      case 'GARANTIAS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-500/15 text-purple-300 border border-purple-500/20">
            <Headset className="w-3 h-3 text-purple-400" />
            Garantías
          </span>
        );
      case 'CLIENTES':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-sky-500/15 text-sky-300 border border-sky-500/20">
            <User className="w-3 h-3 text-sky-400" />
            Clientes
          </span>
        );
      case 'USUARIOS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/20">
            <UsersIcon className="w-3 h-3 text-amber-400" />
            Usuarios / Roles
          </span>
        );
      case 'FINANZAS':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-teal-500/15 text-teal-300 border border-teal-500/20">
            <FileText className="w-3 h-3 text-teal-400" />
            Finanzas
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-gray-700/40 text-gray-300 border border-gray-600/30">
            <Server className="w-3 h-3 text-gray-400" />
            {mod || 'Sistema'}
          </span>
        );
    }
  };

  const getRoleBadge = (rol?: string | null) => {
    switch (rol) {
      case 'ADMIN':
        return <span className="text-[10px] px-1.5 py-0.5 bg-red-950/80 text-red-400 border border-red-800/40 rounded font-semibold uppercase">Admin</span>;
      case 'VENDEDOR':
        return <span className="text-[10px] px-1.5 py-0.5 bg-emerald-950/80 text-emerald-400 border border-emerald-800/40 rounded font-semibold uppercase">Vendedor</span>;
      case 'SOPORTE':
        return <span className="text-[10px] px-1.5 py-0.5 bg-purple-950/80 text-purple-400 border border-purple-800/40 rounded font-semibold uppercase">Soporte</span>;
      case 'CLIENTE':
        return <span className="text-[10px] px-1.5 py-0.5 bg-blue-950/80 text-blue-400 border border-blue-800/40 rounded font-semibold uppercase">Cliente</span>;
      default:
        return <span className="text-[10px] px-1.5 py-0.5 bg-gray-800 text-gray-400 rounded uppercase">Sistema</span>;
    }
  };

  // Cálculo de tasa de éxito
  const successRate = useMemo(() => {
    if (!stats || stats.total === 0) return 100;
    const ok = stats.total - stats.fallos;
    return Math.max(0, Math.min(100, Math.round((ok / stats.total) * 100)));
  }, [stats]);

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-800/80 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-600 via-red-600 to-amber-500 p-0.5 shadow-lg shadow-red-600/20">
              <div className="w-full h-full bg-gray-950 rounded-[10px] flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-rose-500" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Módulo de Auditoría y Seguridad
                </h1>
                <span className="px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">
                  El Testigo Fiel
                </span>
                <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-semibold uppercase bg-gray-800/80 text-gray-400 border border-gray-700/60 rounded">
                  Solo Administrador
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-0.5">
                Bitácora forense e inmutable de operaciones, ventas, movimientos de inventario, garantías y autenticaciones.
              </p>
            </div>
          </div>
        </div>

        {/* ACCIONES DEL HEADER */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchLogs(true)}
            disabled={refreshing || loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gray-900/80 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-700/60 transition shadow-sm text-sm"
            title="Refrescar registros"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
            <span className="hidden sm:inline">Refrescar</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium shadow-md shadow-red-600/20 transition text-sm"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Registros */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Operaciones</span>
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {stats?.total?.toLocaleString('es-CO') || (loading ? '...' : 0)}
            </span>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-blue-400" />
              Eventos históricos auditados
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-blue-500/5 rounded-full blur-xl group-hover:bg-blue-500/10 transition" />
        </div>

        {/* Card 2: Hoy */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Actividad de Hoy</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {stats?.hoy?.toLocaleString('es-CO') || (loading ? '...' : 0)}
            </span>
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Registros en las últimas 24 horas
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-emerald-500/5 rounded-full blur-xl group-hover:bg-emerald-500/10 transition" />
        </div>

        {/* Card 3: Alertas y Críticos */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Alertas / Críticos</span>
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-rose-400">
              {stats?.criticos || 0}
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.porSeveridad?.['WARNING'] || 0} advertencias registradas
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-rose-500/5 rounded-full blur-xl group-hover:bg-rose-500/10 transition" />
        </div>

        {/* Card 4: Tasa de Procedimientos Exitosos */}
        <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/80 rounded-xl p-5 relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Éxito en Procesos</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-white">
              {successRate}%
            </span>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.fallos || 0} incidencias / fallos detectados
            </p>
          </div>
          <div className="absolute -bottom-6 -right-6 w-20 h-20 bg-amber-500/5 rounded-full blur-xl group-hover:bg-amber-500/10 transition" />
        </div>
      </div>

      {/* BARRA DE FILTROS AVANZADOS */}
      <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por acción, #ORD, #ACC, IP, operador..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-950/80 border border-gray-700/60 focus:border-red-500 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none transition"
            />
          </div>

          {/* Módulo */}
          <div>
            <select
              value={modulo}
              onChange={(e) => {
                setModulo(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-950/80 border border-gray-700/60 focus:border-red-500 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none transition"
            >
              {MODULE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severidad */}
          <div>
            <select
              value={severidad}
              onChange={(e) => {
                setSeveridad(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-950/80 border border-gray-700/60 focus:border-red-500 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none transition"
            >
              {SEVERITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-gray-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Procedimiento Correcto / Incorrecto */}
          <div>
            <select
              value={exito}
              onChange={(e) => {
                setExito(e.target.value);
                setPage(1);
              }}
              className="w-full bg-gray-950/80 border border-gray-700/60 focus:border-red-500 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none transition"
            >
              <option value="" className="bg-gray-900">Todos los Estados (Correcto / Incorrecto)</option>
              <option value="true" className="bg-gray-900">✅ Procedimientos Correctos / Éxitos</option>
              <option value="false" className="bg-gray-900">❌ Procedimientos Incorrectos / Fallidos</option>
            </select>
          </div>
        </div>

        {/* Fila de Fechas y Accesos Rápidos */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-800/60">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-400 flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Rango de Fecha:
            </span>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => {
                setFechaDesde(e.target.value);
                setPage(1);
              }}
              className="bg-gray-950/80 border border-gray-700/60 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-red-500"
            />
            <span className="text-xs text-gray-500">hasta</span>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => {
                setFechaHasta(e.target.value);
                setPage(1);
              }}
              className="bg-gray-950/80 border border-gray-700/60 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-red-500"
            />

            {/* Botones rápidos */}
            <div className="flex items-center gap-1 ml-2">
              <button
                type="button"
                onClick={() => setQuickDate('today')}
                className="px-2 py-1 text-[11px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('7days')}
                className="px-2 py-1 text-[11px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition"
              >
                7 días
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('month')}
                className="px-2 py-1 text-[11px] font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition"
              >
                Este Mes
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(search || modulo || severidad || exito || fechaDesde || fechaHasta) && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar Filtros
              </button>
            )}
            <span className="text-xs text-gray-400 font-mono">
              {totalRecords} registro(s) encontrado(s)
            </span>
          </div>
        </div>
      </div>

      {/* TABLA DE AUDITORÍA */}
      <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800/80 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-950/70 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                <th className="py-3 px-4">Fecha y Hora</th>
                <th className="py-3 px-3">Severidad</th>
                <th className="py-3 px-3">Módulo</th>
                <th className="py-3 px-4">Operador Responsable</th>
                <th className="py-3 px-4">Acción y Descripción</th>
                <th className="py-3 px-3">Procedimiento</th>
                <th className="py-3 px-3">IP / Origen</th>
                <th className="py-3 px-3 text-center">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm">Consultando bitácora de auditoría inmutable...</p>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <ShieldCheck className="w-12 h-12 text-gray-600" />
                      <p className="text-base font-semibold text-gray-300">
                        No se encontraron registros de auditoría
                      </p>
                      <p className="text-xs text-gray-500 max-w-sm">
                        No hay operaciones que coincidan con los filtros seleccionados o el historial está despejado.
                      </p>
                      {(search || modulo || severidad || exito || fechaDesde || fechaHasta) && (
                        <button
                          onClick={resetAllFilters}
                          className="mt-2 px-3.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-medium transition"
                        >
                          Restablecer todos los filtros
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const logDate = new Date(log.createdAt);
                  const fechaStr = logDate.toLocaleDateString('es-CO', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  });
                  const horaStr = logDate.toLocaleTimeString('es-CO', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: true,
                  });

                  const operatorName = log.usuarioNombre || log.usuario?.nombre || 'Sistema Automatizado';
                  const operatorEmail = log.usuarioEmail || log.usuario?.email || '';
                  const operatorRole = log.usuarioRol || log.usuario?.rol || 'SISTEMA';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-800/40 transition group cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      {/* Fecha y Hora */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono text-gray-200 font-medium">{fechaStr}</div>
                        <div className="text-[11px] text-gray-500 font-mono">{horaStr}</div>
                      </td>

                      {/* Severidad */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getSeverityBadge(log.severidad)}
                      </td>

                      {/* Módulo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {getModuleBadge(log.modulo)}
                      </td>

                      {/* Operador */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-gray-200">{operatorName}</span>
                          {getRoleBadge(operatorRole)}
                        </div>
                        {operatorEmail && (
                          <div className="text-[11px] text-gray-400 font-mono">{operatorEmail}</div>
                        )}
                      </td>

                      {/* Acción y Descripción */}
                      <td className="py-3 px-4 max-w-md">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-red-400 text-[11px] uppercase tracking-wide">
                            {log.accion}
                          </span>
                          {log.entidadId && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-800 text-[10px] font-mono text-gray-300 border border-gray-700">
                              {log.entidadId}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-300 text-xs mt-0.5 line-clamp-2 leading-relaxed">
                          {log.descripcion}
                        </p>
                        {log.errorMensaje && (
                          <p className="text-rose-400 text-[11px] mt-1 font-mono bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/40">
                            Error: {log.errorMensaje}
                          </p>
                        )}
                      </td>

                      {/* Procedimiento Correcto / Incorrecto */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {log.exito ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3 text-emerald-400" />
                            Correcto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                            <X className="w-3 h-3 text-rose-400" />
                            Incorrecto / Fallo
                          </span>
                        )}
                      </td>

                      {/* IP / Dispositivo */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-gray-300 font-mono text-[11px]">
                          <Globe className="w-3 h-3 text-gray-500" />
                          {log.ip || '127.0.0.1'}
                        </div>
                      </td>

                      {/* Botón Ver Detalle */}
                      <td className="py-3 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white transition shadow-sm"
                          title="Inspeccionar detalle completo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <TablePagination
          currentPage={page}
          totalItems={totalRecords}
          itemsPerPage={limit}
          onPageChange={setPage}
        />
      </div>

      {/* MODAL DE INSPECCIÓN DETALLADA (TESTIGO FORENSE) */}
      {selectedLog && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gray-900 border border-gray-700 flex items-center justify-center">
                  <Terminal className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Inspección de Registro Forense</h3>
                    {getSeverityBadge(selectedLog.severidad)}
                  </div>
                  <p className="text-xs text-gray-400 font-mono">
                    ID: {selectedLog.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal con Scroll */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Resumen Superior */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    Operador Responsable
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-base">
                      {selectedLog.usuarioNombre || selectedLog.usuario?.nombre || 'Sistema Automatizado'}
                    </span>
                    {getRoleBadge(selectedLog.usuarioRol || selectedLog.usuario?.rol)}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    {selectedLog.usuarioEmail || selectedLog.usuario?.email || 'N/A'}
                  </div>
                  {selectedLog.usuarioId && (
                    <div className="text-[11px] text-gray-500 font-mono">
                      ID Usuario: {selectedLog.usuarioId}
                    </div>
                  )}
                </div>

                <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block">
                    Origen y Entorno
                  </span>
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-200">
                    <Globe className="w-3.5 h-3.5 text-blue-400" />
                    <span>IP: {selectedLog.ip || 'No registrada'}</span>
                  </div>
                  <div className="text-xs text-gray-400">
                    <span className="font-medium text-gray-500">Módulo:</span>{' '}
                    {getModuleBadge(selectedLog.modulo)}
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    <span className="font-medium text-gray-500">Fecha:</span>{' '}
                    {new Date(selectedLog.createdAt).toLocaleString('es-CO')}
                  </div>
                </div>
              </div>

              {/* Acción y Resultado */}
              <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    Acción Ejecutada
                  </span>
                  <div>
                    {selectedLog.exito ? (
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        PROCEDIMIENTO CORRECTO
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        PROCEDIMIENTO INCORRECTO / FALLIDO
                      </span>
                    )}
                  </div>
                </div>

                <div className="font-mono text-lg font-bold text-rose-400">
                  {selectedLog.accion}
                </div>

                <div className="text-sm text-gray-200 bg-gray-950/80 border border-gray-800 p-3 rounded-lg leading-relaxed">
                  {selectedLog.descripcion}
                </div>

                {selectedLog.errorMensaje && (
                  <div className="bg-rose-950/50 border border-rose-800/60 p-3 rounded-lg text-rose-300 text-xs font-mono">
                    <span className="font-bold block text-rose-400 mb-1">Causa del Fallo / Mensaje de Error:</span>
                    {selectedLog.errorMensaje}
                  </div>
                )}

                {selectedLog.entidadId && (
                  <div className="flex items-center gap-2 text-xs pt-1">
                    <span className="text-gray-400">Entidad Afectada:</span>
                    <span className="font-mono px-2 py-0.5 bg-gray-800 rounded text-amber-300 font-semibold border border-gray-700">
                      {selectedLog.entidadTipo ? `${selectedLog.entidadTipo}: ` : ''}{selectedLog.entidadId}
                    </span>
                  </div>
                )}
              </div>

              {/* User Agent */}
              {selectedLog.userAgent && (
                <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Dispositivo / User Agent
                  </span>
                  <p className="text-xs text-gray-300 font-mono break-all bg-gray-950 p-2.5 rounded border border-gray-800">
                    {selectedLog.userAgent}
                  </p>
                </div>
              )}

              {/* Carga de Datos Estructurada (JSON Payload) */}
              <div className="bg-gray-900/70 border border-gray-800/80 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-rose-400" />
                    Detalles Estructurados (Payload JSON)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(selectedLog.detalles || {}, null, 2));
                      setCopiedJson(true);
                      setTimeout(() => setCopiedJson(false), 2000);
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded transition font-medium"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar JSON</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-gray-950 p-3.5 rounded-lg border border-gray-800 overflow-x-auto">
                  <pre className="font-mono text-xs text-emerald-400 leading-relaxed">
                    {selectedLog.detalles
                      ? JSON.stringify(selectedLog.detalles, null, 2)
                      : '// No se registraron metadatos adicionales en esta operación'}
                  </pre>
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="px-6 py-3 border-t border-gray-800 bg-gray-900/60 flex items-center justify-between shrink-0">
              <span className="text-xs text-gray-500 font-mono">
                Registro inmutable firmado digitalmente
              </span>
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium text-xs transition"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
