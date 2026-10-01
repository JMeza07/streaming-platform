'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import Link from 'next/link';
import TablePagination from '@/components/TablePagination';
import {
  RefreshCw,
  Search,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  User,
  Phone,
  ShieldCheck,
  Eye,
  Check,
  Copy,
  X,
  ExternalLink,
  KeyRound,
  Tv,
  Wallet,
  Send,
  Loader2,
  Filter,
  Sparkles,
  RotateCcw,
  FileText,
  CheckSquare,
  Ban,
  ArrowRight,
  ShieldAlert,
  Info,
  ChevronRight,
  ShoppingCart,
  Download,
  CheckCheck,
} from 'lucide-react';
import { useDialog } from '@/components/Dialog';

interface RenewalOrder {
  id: string;
  total: number;
  estado: 'PENDIENTE' | 'PAGADO' | 'CANCELADO' | 'FALLIDO';
  metodoPago: string;
  comprobanteUrl?: string | null;
  comprobanteVerificado?: boolean;
  comprobanteVerificadoAt?: string | null;
  comprobanteVerificadoPor?: string | null;
  descripcionVenta?: string | null;
  vendedorNombre?: string | null;
  vendedorComision?: number | null;
  createdAt: string;
  updatedAt?: string;
  customer?: {
    id: string;
    whatsapp?: string;
    user?: {
      id: string;
      nombre: string;
      email: string;
    };
  };
  items?: Array<{
    id: string;
    cantidad: number;
    precioUnitario: number;
    plan?: {
      id: string;
      nombrePlan: string;
      duracionDias: number;
      service?: {
        id: string;
        nombre: string;
        icono?: string;
      };
    };
  }>;
}

export default function RenewalsPage() {
  const { alert } = useDialog();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [renewals, setRenewals] = useState<RenewalOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Modals & Action States
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [verifiedReceiptOrders, setVerifiedReceiptOrders] = useState<{ [orderId: string]: boolean }>({});
  const [unverifiedWarningOrder, setUnverifiedWarningOrder] = useState<RenewalOrder | null>(null);
  const [confirmApproveOrder, setConfirmApproveOrder] = useState<RenewalOrder | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<RenewalOrder | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Solicitud no procedente o comprobante no válido');
  const [submittingCancel, setSubmittingCancel] = useState(false);
  const [viewingDetailOrder, setViewingDetailOrder] = useState<RenewalOrder | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [billingMismatches, setBillingMismatches] = useState<any[]>([]);

  useEffect(() => {
    const raw = Cookies.get('user') || (typeof window !== 'undefined' ? localStorage.getItem('user') : null);
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  const formatCOP = (val: any) => {
    const num = Number(val) || 0;
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(num);
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const fetchRenewals = async () => {
    try {
      setLoading(true);
      const [res, mismatchesRes] = await Promise.all([
        api.get('/orders/renewals'),
        api.get('/accounts/billing-mismatches').catch(() => ({ data: [] })),
      ]);
      setRenewals(res.data || []);
      setBillingMismatches(mismatchesRes.data || []);
    } catch (err) {
      console.error('Error fetching renewals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRenewals();
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchRenewals();
  };

  // Filtrado reactivo
  const filteredRenewals = useMemo(() => {
    return renewals.filter((item) => {
      // Estado
      if (statusFilter && item.estado !== statusFilter) return false;

      // Fecha
      if (dateFilter) {
        const itemDate = new Date(item.createdAt);
        const [y, m, d] = dateFilter.split('-').map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        if (itemDate < start || itemDate > end) return false;
      }

      // Búsqueda
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const clientName = item.customer?.user?.nombre?.toLowerCase() || '';
        const clientEmail = item.customer?.user?.email?.toLowerCase() || '';
        const clientPhone = item.customer?.whatsapp || '';
        const orderId = item.id.toLowerCase();
        const desc = item.descripcionVenta?.toLowerCase() || '';
        const platform = item.items?.[0]?.plan?.service?.nombre?.toLowerCase() || '';
        const plan = item.items?.[0]?.plan?.nombrePlan?.toLowerCase() || '';

        return (
          clientName.includes(q) ||
          clientEmail.includes(q) ||
          clientPhone.includes(q) ||
          orderId.includes(q) ||
          desc.includes(q) ||
          platform.includes(q) ||
          plan.includes(q)
        );
      }

      return true;
    });
  }, [renewals, statusFilter, dateFilter, searchTerm]);

  // Paginación de 10 filas por vista
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateFilter, searchTerm]);

  const paginatedRenewals = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredRenewals.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRenewals, currentPage]);

  // Métricas KPI
  const stats = useMemo(() => {
    const totalCount = renewals.length;
    const pendingCount = renewals.filter((r) => r.estado === 'PENDIENTE').length;
    const approvedCount = renewals.filter((r) => r.estado === 'PAGADO').length;
    const totalRevenue = renewals
      .filter((r) => r.estado === 'PAGADO')
      .reduce((sum, r) => sum + (Number(r.total) || 0), 0);

    return { totalCount, pendingCount, approvedCount, totalRevenue };
  }, [renewals]);

  // Manejo de Inspección y Verificación de Comprobante
  const handleInspectAndVerify = async (order: RenewalOrder) => {
    if (!order) return;
    if (order.comprobanteUrl) {
      setZoomedImage(order.comprobanteUrl);
    }
    if (!order.comprobanteVerificado && !verifiedReceiptOrders[order.id]) {
      try {
        await api.patch(`/orders/${order.id}/verify-receipt`);
        setVerifiedReceiptOrders((prev) => ({ ...prev, [order.id]: true }));
        setRenewals((prev) =>
          prev.map((o) =>
            o.id === order.id
              ? {
                  ...o,
                  comprobanteVerificado: true,
                  comprobanteVerificadoAt: new Date().toISOString(),
                  comprobanteVerificadoPor: 'Personal Autorizado',
                }
              : o
          )
        );
        if (viewingDetailOrder && viewingDetailOrder.id === order.id) {
          setViewingDetailOrder((prev: any) =>
            prev
              ? {
                  ...prev,
                  comprobanteVerificado: true,
                  comprobanteVerificadoAt: new Date().toISOString(),
                  comprobanteVerificadoPor: 'Personal Autorizado',
                }
              : null
          );
        }
      } catch (err) {
        console.error('Error al marcar comprobante de renovación como verificado:', err);
      }
    }
  };

  // Manejo de Aprobación
  const initiateApprove = (order: RenewalOrder) => {
    if (order.comprobanteUrl && !order.comprobanteVerificado && !verifiedReceiptOrders[order.id]) {
      setUnverifiedWarningOrder(order);
      return;
    }
    setConfirmApproveOrder(order);
  };

  const executeApproval = async () => {
    if (!confirmApproveOrder) return;
    try {
      setApprovingId(confirmApproveOrder.id);
      await api.post(`/orders/${confirmApproveOrder.id}/approve-renewal`, {
        comprobanteUrl: confirmApproveOrder.comprobanteUrl,
      });

      const meta = parseRenewalMeta(confirmApproveOrder.descripcionVenta);
      setFeedbackSuccess(`¡Renovación #${confirmApproveOrder.id.slice(-6)} para cuenta ${meta.accountCode} aprobada con éxito! La vigencia de la suscripción ha sido extendida.`);
      setTimeout(() => setFeedbackSuccess(null), 5000);

      setConfirmApproveOrder(null);
      await fetchRenewals();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al aprobar la renovación', { type: 'error', title: 'Error al Aprobar' });
    } finally {
      setApprovingId(null);
    }
  };

  // Manejo de Cancelación
  const executeCancel = async () => {
    if (!cancellingOrder) return;
    try {
      setSubmittingCancel(true);
      await api.post(`/orders/${cancellingOrder.id}/cancel`, {
        motivo: cancelReason,
        devolverCuentas: [],
      });

      setFeedbackSuccess(`Solicitud de renovación #${cancellingOrder.id.slice(-6)} cancelada.`);
      setTimeout(() => setFeedbackSuccess(null), 4000);

      setCancellingOrder(null);
      await fetchRenewals();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al cancelar la renovación', { type: 'error', title: 'Error al Cancelar' });
    } finally {
      setSubmittingCancel(false);
    }
  };

  // Helper para extraer datos de la descripción
  const parseRenewalMeta = (desc?: string | null) => {
    if (!desc) return { accountCode: 'N/A', email: '', subId: '' };
    const accMatch = desc.match(/Cuenta:\s*([#A-Za-z0-9_-]+)/i);
    const emailMatch = desc.match(/\(([^)]+@[^)]+)\)/i);
    const subMatch = desc.match(/Suscripci[oó]n ID:\s*([a-zA-Z0-9_-]+)/i);

    return {
      accountCode: accMatch ? accMatch[1] : 'Cuenta Asignada',
      email: emailMatch ? emailMatch[1] : '',
      subId: subMatch ? subMatch[1] : '',
    };
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Notificación Flotante de Éxito */}
      {feedbackSuccess && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-3 px-5 py-4 bg-emerald-950/95 border border-emerald-500/50 text-emerald-200 rounded-2xl shadow-2xl backdrop-blur-xl animate-in slide-in-from-top-4 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold">{feedbackSuccess}</p>
        </div>
      )}

      {/* Encabezado Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-gray-900/90 via-indigo-950/40 to-gray-900/90 border border-indigo-900/30 rounded-3xl p-6 backdrop-blur-xl shadow-2xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <RefreshCw className="w-5 h-5 animate-spin-reverse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">Módulo de Renovaciones</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase">
                  Clientes Recurrentes
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Gestión, verificación de comprobantes y extensión de vigencias para cuentas que ya vencieron o están por vencer.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-gray-900/80 border border-gray-800 hover:border-gray-700 hover:text-white transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Actualizar</span>
          </button>

          <Link
            href="/admin/orders"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-400 bg-gray-900/60 border border-gray-800 hover:border-gray-700 hover:text-white transition-all shadow-sm"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-gray-500" />
            <span>Ir a Órdenes</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Renovaciones */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Total Solicitudes</span>
            <div className="w-8 h-8 rounded-xl bg-gray-800/80 flex items-center justify-center text-gray-300">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats.totalCount}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Historial acumulado</p>
        </div>

        {/* Pendientes de Verificación */}
        <div className={`rounded-2xl p-4 backdrop-blur-md relative overflow-hidden border ${
          stats.pendingCount > 0
            ? 'bg-amber-950/20 border-amber-600/40'
            : 'bg-gray-900/60 border-gray-800/80'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs text-amber-300 font-medium flex items-center gap-1.5">
              <span>Por Aprobar</span>
              {stats.pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300 mt-2">{stats.pendingCount}</p>
          <p className="text-[11px] text-amber-400/70 mt-0.5">Comprobantes por revisar</p>
        </div>

        {/* Renovadas con Éxito */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-emerald-400 font-medium">Renovadas Activas</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{stats.approvedCount}</p>
          <p className="text-[11px] text-emerald-400/70 mt-0.5">Cuentas ampliadas</p>
        </div>

        {/* Ingresos por Renovación */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs text-indigo-400 font-medium">Ingresos Renovación</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl lg:text-2xl font-black text-white mt-2">{formatCOP(stats.totalRevenue)}</p>
          <p className="text-[11px] text-indigo-300/70 mt-0.5">Total recaudado</p>
        </div>
      </div>

      {/* Explicación de la Lógica Operativa (Aviso Informativo) */}
      <div className="flex items-start gap-3 p-4 bg-indigo-950/30 border border-indigo-900/40 rounded-2xl text-xs text-indigo-200/90 backdrop-blur-md">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-white">¿Cómo opera el Módulo de Renovaciones?</p>
          <p className="text-indigo-200/80 leading-relaxed">
            A diferencia de una <strong className="text-white">Venta Nueva</strong> (que toma una cuenta libre del inventario), una <strong className="text-indigo-300">Renovación</strong> amplía la fecha de vencimiento de la cuenta que el cliente ya tiene en uso, conservando su correo, perfil y PIN asignados. Al aprobarse aquí, el sistema actualiza la suscripción a estado <span className="text-emerald-400 font-semibold">ACTIVA</span> y no consume stock nuevo de tu bodega.
          </p>
        </div>
      </div>

      {/* Alerta de Desfase de Facturación (Escenario 4) */}
      {billingMismatches.length > 0 && (
        <div className="bg-gradient-to-r from-rose-950/80 via-red-950/40 to-gray-900/90 border-2 border-rose-500/60 rounded-3xl p-5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-300">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Alerta de Renovación Prioritaria — Desfase de Facturación ({billingMismatches.length})
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-500/50">
                    Atención Inmediata
                  </span>
                </div>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  Los clientes tienen vigencia activa que supera la fecha de vencimiento de la cuenta raíz proveedora. Recarga la cuenta raíz antes de que expire.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {billingMismatches.map((item, idx) => (
              <div key={idx} className="bg-gray-950/70 border border-rose-900/40 rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white truncate">{item.serviceName || 'Servicio'}</span>
                  <span className="px-2 py-0.5 rounded-md font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px]">
                    Desfase: {item.daysDifference}d
                  </span>
                </div>
                <div className="text-[11px] text-gray-300 truncate">
                  <span className="text-gray-500">Cuenta Raíz:</span> {item.accountEmail}
                </div>
                <div className="text-[11px] text-gray-300 truncate">
                  <span className="text-gray-500">Cliente:</span> {item.customerName || 'N/A'} {item.customerPhone ? `(${item.customerPhone})` : ''}
                </div>
                <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-[10px] text-gray-400">
                  <span>Raíz vence: <strong className="text-rose-400">{new Date(item.rootAccountExpiresAt).toLocaleDateString()}</strong></span>
                  <span>Cliente vence: <strong className="text-indigo-300">{new Date(item.subscriptionEndsAt).toLocaleDateString()}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por cliente, #ACC, email o servicio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950/80 border border-gray-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filtro Fecha */}
          <div className="flex items-center gap-1.5 bg-gray-950/80 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-300">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-[11px] text-gray-400 hidden lg:inline">Fecha:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
            />
            {dateFilter && (
              <button onClick={() => setDateFilter('')} className="text-gray-400 hover:text-white p-0.5">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filtro Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-950/80 border border-gray-800 text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="">Todos los Estados</option>
            <option value="PENDIENTE">Pendientes de Pago</option>
            <option value="PAGADO">Renovadas (Aprobadas)</option>
            <option value="CANCELADO">Canceladas</option>
          </select>

          {(statusFilter || dateFilter || searchTerm) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setDateFilter('');
                setSearchTerm('');
              }}
              className="px-2.5 py-1.5 text-[11px] text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/40 rounded-xl transition-colors cursor-pointer"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      {/* Tabla Principal de Renovaciones */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Cuenta & Servicio</th>
                <th className="px-5 py-3.5">Planes Solicitados</th>
                <th className="px-5 py-3.5">Total & Soporte</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-500 mb-2" />
                    <span>Cargando solicitudes de renovación...</span>
                  </td>
                </tr>
              ) : filteredRenewals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center text-gray-500">
                    <RefreshCw className="w-8 h-8 text-gray-600 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-gray-400">No hay renovaciones encontradas</p>
                    <p className="text-[11px] text-gray-500 mt-1">
                      Las solicitudes realizadas por clientes desde su panel aparecerán aquí automáticamente.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRenewals.map((order) => {
                  const meta = parseRenewalMeta(order.descripcionVenta);
                  const isPending = order.estado === 'PENDIENTE';
                  const isPaid = order.estado === 'PAGADO';
                  const isCancelled = order.estado === 'CANCELADO';
                  const isReceiptVerified = Boolean(order.comprobanteVerificado || verifiedReceiptOrders[order.id]);

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-800/40 transition group cursor-pointer"
                      onClick={() => setViewingDetailOrder(order)}
                    >
                      {/* Cliente */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{order.customer?.user?.nombre || 'Cliente'}</span>
                          </p>
                          <p className="text-[11px] text-gray-400">{order.customer?.user?.email}</p>
                          {order.customer?.whatsapp && (
                            <a
                              href={`https://wa.me/${order.customer.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                                `Hola ${order.customer?.user?.nombre || ''}, te contactamos respecto a tu solicitud de renovación #${order.id.slice(-6)} en nuestra plataforma.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono flex items-center gap-1 transition-colors"
                              title="Contactar vía WhatsApp"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{order.customer.whatsapp}</span>
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Cuenta & Servicio */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-950/70 border border-indigo-700/50 text-indigo-300 font-mono text-[10px] font-bold">
                              {meta.accountCode}
                            </span>
                            {meta.accountCode !== 'Cuenta Asignada' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(meta.accountCode, `acc_${order.id}`);
                                }}
                                className="text-gray-500 hover:text-white transition-colors"
                                title="Copiar código de cuenta"
                              >
                                {copiedKey === `acc_${order.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            )}
                          </div>
                          {meta.email && (
                            <p className="text-[11px] text-gray-300 font-mono truncate max-w-[190px]" title={meta.email}>
                              {meta.email}
                            </p>
                          )}
                          <p className="text-[10px] text-gray-500 font-mono">
                            Orden: #{order.id.slice(-6)}
                          </p>
                        </div>
                      </td>

                      {/* Planes Solicitados */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {order.items?.map((it: any) => (
                            <div key={it.id} className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-white">{it.cantidad}x</span>
                                <span className="font-medium text-gray-200">
                                  {it.plan?.service?.nombre} - {it.plan?.nombrePlan}
                                </span>
                              </div>
                              <p className="text-[10px] text-indigo-400 font-mono">
                                +{it.plan?.duracionDias || 30} días de vigencia
                              </p>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total & Comprobante */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="font-bold text-white text-sm">{formatCOP(order.total)}</p>
                          <p className="text-[11px] text-gray-400">{order.metodoPago || 'Nequi / Bancolombia'}</p>

                          {order.comprobanteUrl ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleInspectAndVerify(order);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-colors ${
                                isReceiptVerified
                                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/50'
                                  : 'bg-amber-950/70 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
                              }`}
                              title={
                                isReceiptVerified
                                  ? 'Comprobante verificado (clic para ver de nuevo)'
                                  : 'Comprobante adjunto por verificar (clic para revisar y verificar)'
                              }
                            >
                              {isReceiptVerified ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Comprobante verificado</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />
                                  <span>Revisar Comprobante</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="inline-block text-[10px] text-gray-500 italic">
                              Sin comprobante adjunto
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        {isPending && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/50 uppercase">
                            <Clock className="w-3 h-3" />
                            <span>Pendiente</span>
                          </span>
                        )}
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 uppercase">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Renovada</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/50 uppercase">
                            <Ban className="w-3 h-3" />
                            <span>Cancelada</span>
                          </span>
                        )}
                        {!isPending && !isPaid && !isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-900 text-gray-400 border border-gray-800 uppercase">
                            {order.estado}
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => initiateApprove(order)}
                                disabled={approvingId === order.id}
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-950/50 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                title="Aprobar renovación y extender vigencia"
                              >
                                {approvingId === order.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                <span>Aprobar</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setCancellingOrder(order)}
                                className="p-1.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-400 hover:bg-rose-900/40 transition-colors cursor-pointer"
                                title="Rechazar o cancelar solicitud de renovación"
                              >
                                <Ban className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => setViewingDetailOrder(order)}
                            className="p-1.5 rounded-xl bg-gray-800/60 border border-gray-700/60 text-gray-300 hover:text-white hover:bg-gray-700 transition-colors cursor-pointer"
                            title="Ver detalles completos de la renovación"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginador de 10 filas */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredRenewals.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL 1: ADVERTENCIA OBLIGATORIA DE COMPROBANTE NO REVISADO */}
      {unverifiedWarningOrder && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border-2 border-amber-500/80 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-3 text-amber-400">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-7 h-7 text-amber-400 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Verificación de Comprobante Requerida</h3>
                  <p className="text-xs text-amber-400/90 font-medium">Protocolo de seguridad en renovaciones</p>
                </div>
              </div>
              <button onClick={() => setUnverifiedWarningOrder(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="bg-amber-950/40 border border-amber-900/60 rounded-2xl p-4 text-xs text-amber-200/90 space-y-2">
                <p>
                  El cliente adjuntó un comprobante de pago para la renovación de <strong className="text-white">#{unverifiedWarningOrder.id.slice(-6)}</strong> por <strong className="text-white">{formatCOP(unverifiedWarningOrder.total)}</strong>, pero aún <span className="underline font-bold text-amber-300">no lo has visualizado</span>.
                </p>
                <p className="text-[11px] text-gray-400">
                  Por seguridad financiera, debes abrir y verificar la imagen antes de poder autorizar y extender la suscripción.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setUnverifiedWarningOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-gray-800/80 border border-gray-700/80 transition-colors cursor-pointer"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = unverifiedWarningOrder;
                  setUnverifiedWarningOrder(null);
                  if (target) {
                    handleInspectAndVerify(target);
                  }
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 shadow-lg shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>Revisar Comprobante Ahora</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRMACIÓN DE APROBACIÓN DE RENOVACIÓN */}
      {confirmApproveOrder && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-emerald-500/40 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Aprobar y Extender Renovación</h3>
                  <p className="text-xs text-emerald-400 font-mono">Orden #{confirmApproveOrder.id.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => setConfirmApproveOrder(null)}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Detalles de la Renovación */}
            <div className="p-6 space-y-3 text-xs flex-1 overflow-y-auto">
              <div className="bg-gray-950/70 border border-gray-800/80 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Cliente:</span>
                  <span className="font-semibold text-white">{confirmApproveOrder.customer?.user?.nombre || 'Cliente'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Servicio & Plan:</span>
                  <span className="font-semibold text-indigo-300">
                    {confirmApproveOrder.items?.[0]?.plan?.service?.nombre} - {confirmApproveOrder.items?.[0]?.plan?.nombrePlan}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">ID Cuenta a Extender:</span>
                  <span className="font-mono text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-800/60 text-[10px]">
                    {parseRenewalMeta(confirmApproveOrder.descripcionVenta).accountCode}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Ampliación de Vigencia:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    +{confirmApproveOrder.items?.[0]?.plan?.duracionDias || 30} días
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-800/80">
                  <span className="text-gray-400">Total a Recaudar:</span>
                  <span className="font-black text-white text-sm">{formatCOP(confirmApproveOrder.total)}</span>
                </div>
              </div>

              {/* Mensaje de Garantía de Inventario */}
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/40 rounded-2xl flex items-start gap-2.5 text-emerald-300/90 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Esta operación <strong className="text-white">no consume stock de cuentas nuevas</strong>. Mantiene los accesos actuales del cliente y actualiza el contador de días de su suscripción automáticamente.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setConfirmApproveOrder(null)}
                disabled={Boolean(approvingId)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-gray-800/80 border border-gray-700/80 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeApproval}
                disabled={Boolean(approvingId)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {approvingId ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aplicando Renovación...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Confirmar y Extender</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CANCELAR SOLICITUD DE RENOVACIÓN */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-rose-500/40 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-3 text-rose-400">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Cancelar Solicitud de Renovación</h3>
                  <p className="text-xs text-rose-400/90 font-mono">Orden #{cancellingOrder.id.slice(-6)}</p>
                </div>
              </div>
              <button onClick={() => setCancellingOrder(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-3 text-xs">
                <p className="text-gray-300">
                  Indica el motivo por el cual se rechaza o cancela esta solicitud de renovación. La orden quedará marcada como <strong className="text-rose-400">CANCELADA</strong>.
                </p>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">
                    Motivo de Cancelación
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    rows={3}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    placeholder="Ej: Comprobante no corresponde al valor, pago rechazado por el banco, etc."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                disabled={submittingCancel}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-gray-800/80 border border-gray-700/80 transition-colors cursor-pointer disabled:opacity-50"
              >
                Volver
              </button>
              <button
                type="button"
                onClick={executeCancel}
                disabled={submittingCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-lg shadow-rose-950/50 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {submittingCancel ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Cancelando...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirmar Cancelación</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: DETALLE COMPLETO DE RENOVACIÓN */}
      {viewingDetailOrder && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Detalle de Solicitud de Renovación</h3>
                  <p className="text-xs text-gray-400 font-mono">Orden ID: {viewingDetailOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingDetailOrder(null)}
                className="p-1 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs flex-1 overflow-y-auto">
              {/* Bloque Cliente */}
              <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4">
                <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Información del Cliente</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Nombre Completo</span>
                    <p className="font-semibold text-white">{viewingDetailOrder.customer?.user?.nombre || 'Cliente'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Correo Electrónico</span>
                    <p className="font-mono text-gray-300">{viewingDetailOrder.customer?.user?.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">WhatsApp</span>
                    <p className="font-mono text-emerald-400">{viewingDetailOrder.customer?.whatsapp || 'No registrado'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Fecha de Solicitud</span>
                    <p className="text-gray-300 font-mono">
                      {new Date(viewingDetailOrder.createdAt).toLocaleString('es-CO')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Metadatos de la Suscripción */}
              <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4">
                <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Cuenta a Renovar</h4>
                <p className="text-xs font-mono text-gray-200 bg-gray-900 border border-gray-800/80 p-2.5 rounded-xl break-all">
                  {viewingDetailOrder.descripcionVenta || 'Sin descripción'}
                </p>
              </div>

              {/* Items y Costo */}
              <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4">
                <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider mb-2">Detalle de Cobro</h4>
                <div className="space-y-2">
                  {viewingDetailOrder.items?.map((it: any) => (
                    <div key={it.id} className="flex justify-between items-center py-1 border-b border-gray-900">
                      <div>
                        <p className="font-semibold text-white">
                          {it.plan?.service?.nombre} - {it.plan?.nombrePlan}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {it.cantidad} unidad(es) × {formatCOP(it.precioUnitario)} (+{it.plan?.duracionDias || 30} días)
                        </p>
                      </div>
                      <span className="font-bold text-white">{formatCOP(it.precioUnitario * it.cantidad)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-gray-300">Total Liquidado:</span>
                    <span className="text-base font-black text-emerald-400">{formatCOP(viewingDetailOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Comprobante */}
              {viewingDetailOrder.comprobanteUrl && (
                <div className="bg-gray-950/70 border border-gray-800 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Comprobante de Pago Adjunto</h4>
                    {(viewingDetailOrder.comprobanteVerificado || verifiedReceiptOrders[viewingDetailOrder.id]) ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                        <CheckCircle2 className="w-3 h-3" />
                        Comprobante verificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/50">
                        <AlertTriangle className="w-3 h-3 animate-pulse" />
                        Soporte por Revisar
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400">
                    {(viewingDetailOrder.comprobanteVerificado || verifiedReceiptOrders[viewingDetailOrder.id]) ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 inline" />
                        Comprobante verificado. En modo de solo lectura (no permite adjuntar nuevo soporte).
                      </span>
                    ) : (
                      <span className="text-amber-400/90 font-medium">
                        ⚠️ Inspecciona el comprobante antes de autorizar la renovación.
                      </span>
                    )}
                  </p>
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => handleInspectAndVerify(viewingDetailOrder)}
                      className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-2 cursor-pointer shadow-md transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Ver Comprobante (Inspeccionar)</span>
                    </button>
                    {!viewingDetailOrder.comprobanteVerificado && !verifiedReceiptOrders[viewingDetailOrder.id] && (
                      <button
                        type="button"
                        onClick={() => handleInspectAndVerify(viewingDetailOrder)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/70 text-emerald-300 font-semibold text-xs flex items-center gap-2 cursor-pointer transition-all"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Verificar Comprobante</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setViewingDetailOrder(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white bg-gray-800 border border-gray-700 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: LIGHTBOX COMPROBANTE CON ZOOM */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[10030] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-gray-950 border border-gray-800 rounded-3xl p-3 shadow-2xl flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between pb-3 px-2 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-gray-200">Revisión de Comprobante de Pago</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={zoomedImage}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors"
                  title="Abrir en pestaña nueva"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => setZoomedImage(null)}
                  className="p-1.5 rounded-lg bg-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                  title="Cerrar vista"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-2 overflow-auto max-h-[78vh] flex items-center justify-center">
              <img
                src={zoomedImage}
                alt="Comprobante de pago"
                className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg border border-gray-800"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
