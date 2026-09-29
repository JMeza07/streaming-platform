'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  Users,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Loader2,
  DollarSign,
  TrendingUp,
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  ShieldCheck,
  Phone,
  User,
  Printer,
  Download,
  UserX,
  UserCheck,
} from 'lucide-react';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import TablePagination from '@/components/TablePagination';
import { useDialog } from '@/components/Dialog';

export default function AffiliatesPage() {
  const { alert, confirm } = useDialog();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'affiliates' | 'withdrawals'>('affiliates');
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Paginación (10 filas máx)
  const [currentAffiliatesPage, setCurrentAffiliatesPage] = useState(1);
  const [currentWithdrawalsPage, setCurrentWithdrawalsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const paginatedAffiliates = useMemo(() => {
    const start = (currentAffiliatesPage - 1) * ITEMS_PER_PAGE;
    return affiliates.slice(start, start + ITEMS_PER_PAGE);
  }, [affiliates, currentAffiliatesPage]);

  const paginatedWithdrawals = useMemo(() => {
    const start = (currentWithdrawalsPage - 1) * ITEMS_PER_PAGE;
    return withdrawals.slice(start, start + ITEMS_PER_PAGE);
  }, [withdrawals, currentWithdrawalsPage]);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAffiliate, setEditingAffiliate] = useState<any | null>(null);
  const [affiliateToDelete, setAffiliateToDelete] = useState<any | null>(null);
  const [resolveWithdrawalModal, setResolveWithdrawalModal] = useState<{
    withdrawal: any;
    accion: 'aprobar' | 'rechazar';
    inputVal: string;
  } | null>(null);

  // Formularios
  const [createForm, setCreateForm] = useState({
    nombre: '',
    email: '',
    password: '',
    phone: '',
    codigoReferido: '',
    rango: 'bronce',
    referidoPor: '',
  });

  const [editForm, setEditForm] = useState({
    nombre: '',
    phone: '',
    codigoReferido: '',
    rango: 'bronce',
    walletBalance: 0,
    referidoPor: '',
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const raw = Cookies.get('user') || (typeof window !== 'undefined' ? localStorage.getItem('user') : null);
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const isAdmin = currentUser?.rol === 'ADMIN';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [affRes, withRes, statRes] = await Promise.all([
        api.get('/affiliates'),
        api.get('/affiliates/withdrawals/all'),
        api.get('/affiliates/stats'),
      ]);
      setAffiliates(affRes.data);
      setWithdrawals(withRes.data);
      setStats(statRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      await api.post('/affiliates/register', {
        ...createForm,
        phone: createForm.phone || undefined,
        codigoReferido: createForm.codigoReferido || undefined,
        referidoPor: createForm.referidoPor || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({
        nombre: '',
        email: '',
        password: '',
        phone: '',
        codigoReferido: '',
        rango: 'bronce',
        referidoPor: '',
      });
      setSuccessMsg('¡Afiliado registrado exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al registrar afiliado');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (aff: any) => {
    setEditingAffiliate(aff);
    setEditForm({
      nombre: aff.user?.nombre || '',
      phone: aff.user?.phone || aff.user?.whatsapp || '',
      codigoReferido: aff.codigoReferido || '',
      rango: aff.rango || 'bronce',
      walletBalance: Number(aff.walletBalance) || 0,
      referidoPor: aff.referidoPor || '',
    });
    setFormError('');
  };

  const handleUpdateAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAffiliate) return;
    setFormLoading(true);
    setFormError('');

    try {
      await api.patch(`/affiliates/${editingAffiliate.id}`, {
        ...editForm,
        walletBalance: Number(editForm.walletBalance),
        referidoPor: editForm.referidoPor || null,
      });
      setEditingAffiliate(null);
      setSuccessMsg('¡Información del afiliado actualizada exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al actualizar afiliado');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAffiliate = async () => {
    if (!affiliateToDelete) return;
    setFormLoading(true);
    try {
      await api.delete(`/affiliates/${affiliateToDelete.id}`);
      setAffiliateToDelete(null);
      setSuccessMsg('¡Afiliado eliminado exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al eliminar afiliado', { type: 'error', title: 'Error al Eliminar' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmWithdrawal = async () => {
    if (!resolveWithdrawalModal) return;
    const { withdrawal, accion, inputVal } = resolveWithdrawalModal;

    if (!inputVal.trim()) {
      await alert(accion === 'aprobar' ? 'Ingresa el comprobante o referencia de pago' : 'Ingresa el motivo del rechazo', { type: 'warning', title: 'Campo requerido' });
      return;
    }

    try {
      setResolvingId(withdrawal.id);
      await api.post('/affiliates/withdrawals/resolve', {
        withdrawalId: withdrawal.id,
        accion,
        comprobantePago: accion === 'aprobar' ? inputVal.trim() : undefined,
        motivoRechazo: accion === 'rechazar' ? inputVal.trim() : undefined,
      });
      setResolveWithdrawalModal(null);
      setSuccessMsg(`Solicitud de retiro ${accion === 'aprobar' ? 'aprobada' : 'rechazada'} exitosamente.`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al procesar el retiro', { type: 'error', title: 'Error de Retiro' });
    } finally {
      setResolvingId(null);
    }
  };

  const formatCOP = (val: any) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const handleToggleUserActive = async (aff: any) => {
    const isCurrentlyActive = aff.user?.activo !== false;
    const actionText = isCurrentlyActive ? 'bloquear/suspender' : 'reactivar';
    const ok = await confirm(
      `¿Está seguro de que desea ${actionText} la cuenta del vendedor ${aff.user?.nombre}?`,
      { type: isCurrentlyActive ? 'danger' : 'confirm', title: `${isCurrentlyActive ? 'Suspender' : 'Reactivar'} Vendedor`, confirmText: isCurrentlyActive ? 'Sí, suspender' : 'Sí, reactivar' }
    );
    if (!ok) {
      return;
    }

    try {
      const res = await api.patch(`/users/${aff.userId}/toggle-active`);
      setAffiliates((prev) =>
        prev.map((a) =>
          a.id === aff.id ? { ...a, user: { ...a.user, activo: res.data.user.activo } } : a
        )
      );
      setSuccessMsg(res.data.message);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al cambiar estado del vendedor', { type: 'error', title: 'Error de Estado' });
    }
  };

  const handleExportCSV = () => {
    if (activeTab === 'affiliates') {
      const exportColumns: ColumnDef[] = [
        { key: 'nombre', label: 'Nombre', format: (_, r) => r.user?.nombre || 'N/A' },
        { key: 'email', label: 'Email', format: (_, r) => r.user?.email || 'N/A' },
        { key: 'phone', label: 'Teléfono', format: (_, r) => r.phone || r.user?.telefono || 'N/A' },
        { key: 'codigoReferido', label: 'Código Referido' },
        { key: 'rango', label: 'Rango' },
        { key: 'walletBalance', label: 'Saldo COP', format: (val) => `$${Number(val).toLocaleString('es-CO')}` },
        { key: 'activo', label: 'Estado Cuenta', format: (_, r) => (r.user?.activo !== false ? 'Activo' : 'SUSPENDIDO') },
        { key: 'createdAt', label: 'Fecha Ingreso', format: (val) => new Date(val).toLocaleDateString('es-CO') },
      ];
      exportToCSV('red_afiliados_vendedores', exportColumns, affiliates);
    } else {
      const exportColumns: ColumnDef[] = [
        { key: 'id', label: 'ID Retiro' },
        { key: 'vendedor', label: 'Vendedor', format: (_, r) => r.affiliate?.user?.nombre || 'N/A' },
        { key: 'email', label: 'Email', format: (_, r) => r.affiliate?.user?.email || 'N/A' },
        { key: 'monto', label: 'Monto Solicitado COP', format: (val) => `$${Number(val).toLocaleString('es-CO')}` },
        { key: 'metodoPago', label: 'Método' },
        { key: 'datosPago', label: 'Datos Pago' },
        { key: 'estado', label: 'Estado' },
        { key: 'createdAt', label: 'Fecha Solicitud', format: (val) => new Date(val).toLocaleDateString('es-CO') },
      ];
      exportToCSV('solicitudes_retiro_afiliados', exportColumns, withdrawals);
    }
  };

  const handlePrint = () => {
    if (activeTab === 'affiliates') {
      triggerPrintReport({
        title: 'Red Oficial de Afiliados y Revendedores',
        subtitle: `STREAMCONTROL - Listado general de la fuerza comercial y saldos acumulados`,
        summaryCards: [
          { label: 'Total Vendedores', value: affiliates.length },
          {
            label: 'Vendedores Activos',
            value: affiliates.filter((a) => a.user?.activo !== false).length,
          },
          {
            label: 'Total en Billeteras',
            value: `$${affiliates
              .reduce((acc, a) => acc + Number(a.walletBalance || 0), 0)
              .toLocaleString('es-CO')}`,
          },
        ],
        columns: [
          { key: 'nombre', label: 'Vendedor', format: (_, r) => `${r.user?.nombre || 'N/A'} (${r.user?.email || ''})` },
          { key: 'phone', label: 'Teléfono', format: (p, r) => p || r.user?.telefono || 'N/A' },
          { key: 'codigoReferido', label: 'Código' },
          { key: 'rango', label: 'Rango', format: (r) => String(r).toUpperCase() },
          { key: 'walletBalance', label: 'Saldo', format: (b) => `$${Number(b).toLocaleString('es-CO')}` },
          { key: 'activo', label: 'Estado', format: (_, r) => (r.user?.activo !== false ? 'Activo' : 'SUSPENDIDO') },
        ],
        rows: affiliates,
      });
    } else {
      triggerPrintReport({
        title: 'Historial de Solicitudes de Retiro de Comisiones',
        subtitle: `STREAMCONTROL - Auditoría de desembolsos y pagos a vendedores`,
        columns: [
          { key: 'vendedor', label: 'Vendedor', format: (_, r) => r.affiliate?.user?.nombre || 'N/A' },
          { key: 'monto', label: 'Monto', format: (m) => `$${Number(m).toLocaleString('es-CO')}` },
          { key: 'metodoPago', label: 'Método / Cuenta', format: (m, r) => `${m || 'Bancolombia'}: ${r.datosPago || '-'}` },
          { key: 'estado', label: 'Estado', format: (e) => String(e).toUpperCase() },
          { key: 'createdAt', label: 'Fecha', format: (d) => new Date(d).toLocaleDateString('es-CO') },
        ],
        rows: withdrawals,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-red-500" />
            <span>Red de Afiliados y Revendedores</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Control de comisiones multinivel, saldos en billetera y aprobación de retiros
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrint}
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

          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Afiliado</span>
            </button>
          )}

          <button
            onClick={fetchData}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-xs font-medium">
          {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('affiliates')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'affiliates'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          Vendedores Activos ({affiliates.length})
        </button>
        <button
          onClick={() => setActiveTab('withdrawals')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'withdrawals'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          Solicitudes de Retiro ({withdrawals.filter((w) => w.estado === 'pendiente').length} pendientes)
        </button>
        <button
          onClick={() => setActiveTab('ranks' as any)}
          className={`ml-auto px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === ('ranks' as any)
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          📊 Escala de Rangos
        </button>
      </div>

      {/* ESCALA OFICIAL DE RANGOS */}
      {(activeTab as any) === 'ranks' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-950/20 border border-amber-800/40 rounded-2xl">
            <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4" />
              Escala Oficial de Rangos y Porcentajes de Ganancia
            </h2>
            <p className="text-xs text-amber-200/70">Para escalar de rango, el vendedor debe acumular el número de servicios vendidos requerido. Las comisiones aplican sobre el valor total de cada venta.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { rango: 'bronce', label: 'Bronce', emoji: '🥉', comision: 5, minVentas: 0, maxVentas: 99, color: 'amber', borderColor: 'border-amber-700/60', bg: 'bg-amber-950/30', textColor: 'text-amber-300', badgeBg: 'bg-amber-900/60', desc: 'Rango inicial para nuevos revendedores.' },
              { rango: 'plata', label: 'Plata', emoji: '🥈', comision: 10, minVentas: 100, maxVentas: 299, color: 'gray', borderColor: 'border-slate-600/60', bg: 'bg-slate-900/40', textColor: 'text-slate-300', badgeBg: 'bg-slate-800/60', desc: 'Requiere haber vendido 100 o más servicios.' },
              { rango: 'oro', label: 'Oro', emoji: '🥇', comision: 15, minVentas: 300, maxVentas: 499, color: 'yellow', borderColor: 'border-yellow-600/60', bg: 'bg-yellow-950/30', textColor: 'text-yellow-300', badgeBg: 'bg-yellow-900/60', desc: 'Requiere haber vendido 300 o más servicios.' },
              { rango: 'diamante', label: 'Diamante', emoji: '💎', comision: 20, minVentas: 500, maxVentas: null, color: 'sky', borderColor: 'border-sky-500/60', bg: 'bg-sky-950/30', textColor: 'text-sky-300', badgeBg: 'bg-sky-900/60', desc: 'Nivel máximo. Requiere 500 o más servicios vendidos.' },
            ].map((rank) => (
              <div key={rank.rango} className={`p-5 rounded-2xl border ${rank.borderColor} ${rank.bg} flex flex-col gap-3 relative overflow-hidden`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-2xl">{rank.emoji}</span>
                    <h3 className={`text-base font-black ${rank.textColor} mt-1`}>{rank.label}</h3>
                  </div>
                  <div className={`${rank.badgeBg} px-3 py-1.5 rounded-xl text-center`}>
                    <span className={`text-xl font-black ${rank.textColor}`}>{rank.comision}%</span>
                    <p className="text-[9px] text-gray-400 mt-0.5">COMISIÓN</p>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">{rank.desc}</p>
                <div className="mt-auto">
                  <div className="flex justify-between items-center text-[10px] text-gray-500 mb-1">
                    <span>Servicios mínimos</span>
                    <span className={`font-bold ${rank.textColor}`}>{rank.minVentas === 0 ? 'Inicio' : `${rank.minVentas}+`}</span>
                  </div>
                  {rank.maxVentas && (
                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                      <span>Siguiente rango en</span>
                      <span className="font-bold text-white">{rank.maxVentas + 1} ventas</span>
                    </div>
                  )}
                  {!rank.maxVentas && (
                    <div className="text-[10px] text-sky-400 font-semibold">✨ Rango Máximo Alcanzado</div>
                  )}
                </div>
                {/* Afiliados en este rango */}
                <div className="pt-2 border-t border-white/10">
                  <span className="text-[10px] text-gray-500">Vendedores en este rango: </span>
                  <span className={`text-[10px] font-bold ${rank.textColor}`}>
                    {affiliates.filter((a) => a.rango === rank.rango).length}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 bg-gray-950/60 border border-gray-800 rounded-2xl">
            <h3 className="text-xs font-bold text-white mb-3">Progreso de Vendedores por Rango</h3>
            <div className="space-y-2">
              {[
                { rango: 'bronce', label: 'Bronce 🥉', color: 'bg-amber-500' },
                { rango: 'plata', label: 'Plata 🥈', color: 'bg-slate-400' },
                { rango: 'oro', label: 'Oro 🥇', color: 'bg-yellow-400' },
                { rango: 'diamante', label: 'Diamante 💎', color: 'bg-sky-400' },
              ].map((r) => {
                const count = affiliates.filter((a) => a.rango === r.rango).length;
                const pct = affiliates.length > 0 ? Math.round((count / affiliates.length) * 100) : 0;
                return (
                  <div key={r.rango} className="flex items-center gap-3 text-xs">
                    <span className="w-24 text-gray-400 shrink-0">{r.label}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${r.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-300 w-16 text-right">{count} vendedores ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB: AFILIADOS */}
      {activeTab === 'affiliates' && (
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Vendedor / Correo</th>
                  <th className="px-5 py-3.5">Código Referido</th>
                  <th className="px-5 py-3.5">Rango</th>
                  <th className="px-5 py-3.5">Saldo en Billetera</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5">Fecha de Registro</th>
                  {isAdmin && <th className="px-5 py-3.5 text-right">Acciones</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60">
                {affiliates.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 7 : 6} className="px-5 py-12 text-center text-gray-500">
                      No hay afiliados registrados en el sistema.
                    </td>
                  </tr>
                ) : (
                  paginatedAffiliates.map((aff) => (
                    <tr key={aff.id} className="hover:bg-gray-850/40 transition-colors">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-white">{aff.user?.nombre}</p>
                        <p className="text-[11px] text-gray-400">{aff.user?.email}</p>
                        {(aff.user?.phone || aff.user?.whatsapp) && (
                          <p className="text-[10px] text-emerald-400 font-mono">
                            {aff.user?.phone || aff.user?.whatsapp}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono bg-red-950/60 text-red-300 px-2 py-1 rounded border border-red-800/40 font-bold">
                          {aff.codigoReferido}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="capitalize font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 text-[10px]">
                          {aff.rango}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-emerald-400 text-sm">{formatCOP(aff.walletBalance)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            aff.user?.activo !== false
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          {aff.user?.activo !== false ? 'Activo' : 'SUSPENDIDO'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-gray-400 text-[11px]">
                        {new Date(aff.createdAt).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleToggleUserActive(aff)}
                              title={
                                aff.user?.activo !== false
                                  ? 'Bloquear / Suspender vendedor'
                                  : 'Reactivar vendedor'
                              }
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                aff.user?.activo !== false
                                  ? 'border-gray-800 text-gray-400 hover:text-rose-400 hover:bg-rose-950/30'
                                  : 'border-emerald-800 text-emerald-400 hover:bg-emerald-950/40'
                              }`}
                            >
                              {aff.user?.activo !== false ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => openEditModal(aff)}
                              data-tooltip="Editar información del afiliado"
                              className="p-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setAffiliateToDelete(aff)}
                              data-tooltip="Eliminar afiliado"
                              className="p-1.5 rounded-lg border border-gray-800 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={currentAffiliatesPage}
            totalItems={affiliates.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentAffiliatesPage}
          />
        </div>
      )}

      {/* TAB: RETIROS */}
      {activeTab === 'withdrawals' && (
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Vendedor</th>
                  <th className="px-5 py-3.5">Monto Solicitado</th>
                  <th className="px-5 py-3.5">Método y Datos de Pago</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60">
                {withdrawals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                      No hay solicitudes de retiro pendientes de pago.
                    </td>
                  </tr>
                ) : (
                  paginatedWithdrawals.map((w) => {
                    const isPending = w.estado === 'pendiente';

                    return (
                      <tr key={w.id} className="hover:bg-gray-850/40 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white">{w.affiliate?.user?.nombre}</p>
                          <p className="text-[11px] text-gray-400">{w.affiliate?.user?.email}</p>
                        </td>
                        <td className="px-5 py-4 font-bold text-white text-sm">{formatCOP(w.monto)}</td>
                        <td className="px-5 py-4">
                          <p className="text-gray-200">{w.metodoPago || 'Nequi / Bancolombia'}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{w.datosPago}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                              isPending
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                            }`}
                          >
                            {w.estado}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isPending && isAdmin ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() =>
                                  setResolveWithdrawalModal({
                                    withdrawal: w,
                                    accion: 'aprobar',
                                    inputVal: '',
                                  })
                                }
                                disabled={resolvingId === w.id}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                Aprobar y Pagar
                              </button>
                              <button
                                onClick={() =>
                                  setResolveWithdrawalModal({
                                    withdrawal: w,
                                    accion: 'rechazar',
                                    inputVal: '',
                                  })
                                }
                                disabled={resolvingId === w.id}
                                className="px-3 py-1.5 bg-gray-800 hover:bg-red-950/50 hover:text-red-300 text-gray-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-500 italic">
                              {isPending ? 'Pendiente' : 'Completado'}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={currentWithdrawalsPage}
            totalItems={withdrawals.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentWithdrawalsPage}
          />
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVO AFILIADO (Solo Admin) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-red-500" />
                <span>Registrar Nuevo Afiliado / Revendedor</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAffiliate} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    placeholder="Ej. Carlos Vendedor"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    placeholder="+57 300 123 4567"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="afiliado@stream.com"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Contraseña de Acceso</label>
                  <input
                    type="password"
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Código de Referido (opcional)</label>
                  <input
                    type="text"
                    value={createForm.codigoReferido}
                    onChange={(e) => setCreateForm({ ...createForm, codigoReferido: e.target.value.toUpperCase() })}
                    placeholder="Ej. CARLOSPRO"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white uppercase focus:outline-none focus:ring-2 focus:ring-red-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Rango Inicial</label>
                  <select
                    value={createForm.rango}
                    onChange={(e) => setCreateForm({ ...createForm, rango: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 capitalize"
                  >
                    <option value="bronce">🥉 Bronce — 5% comisión (0-99 servicios)</option>
                    <option value="plata">🥈 Plata — 10% comisión (100-299 servicios)</option>
                    <option value="oro">🥇 Oro — 15% comisión (300-499 servicios)</option>
                    <option value="diamante">💎 Diamante — 20% comisión (500+ servicios)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Código de Patrocinador / Referido Por (opcional)</label>
                <input
                  type="text"
                  value={createForm.referidoPor}
                  onChange={(e) => setCreateForm({ ...createForm, referidoPor: e.target.value })}
                  placeholder="Código de quien lo refirió..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 font-mono"
                />
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  <span>Registrar Afiliado</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR INFORMACIÓN DE AFILIADO */}
      {editingAffiliate && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                <span>Modificar Información de Afiliado</span>
              </h3>
              <button onClick={() => setEditingAffiliate(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAffiliate} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    required
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">WhatsApp / Teléfono</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="+57..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Código de Referido</label>
                  <input
                    type="text"
                    required
                    value={editForm.codigoReferido}
                    onChange={(e) => setEditForm({ ...editForm, codigoReferido: e.target.value.toUpperCase() })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Rango</label>
                  <select
                    value={editForm.rango}
                    onChange={(e) => setEditForm({ ...editForm, rango: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 capitalize"
                  >
                    <option value="bronce">🥉 Bronce — 5% comisión (0-99 servicios)</option>
                    <option value="plata">🥈 Plata — 10% comisión (100-299 servicios)</option>
                    <option value="oro">🥇 Oro — 15% comisión (300-499 servicios)</option>
                    <option value="diamante">💎 Diamante — 20% comisión (500+ servicios)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Saldo en Billetera (COP)</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={editForm.walletBalance}
                    onChange={(e) => setEditForm({ ...editForm, walletBalance: Number(e.target.value) })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">ID Patrocinador (referidoPor)</label>
                  <input
                    type="text"
                    value={editForm.referidoPor}
                    onChange={(e) => setEditForm({ ...editForm, referidoPor: e.target.value })}
                    placeholder="Opcional"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingAffiliate(null)}
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

      {/* MODAL: CONFIRMAR ELIMINACIÓN DE AFILIADO */}
      {affiliateToDelete && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Confirmar Eliminación</span>
              </h3>
              <button onClick={() => setAffiliateToDelete(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs text-gray-300">
                ¿Estás seguro de que deseas eliminar permanentemente a <span className="font-semibold text-white">{affiliateToDelete.user?.nombre}</span> ({affiliateToDelete.codigoReferido}) de la red de afiliados?
              </p>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setAffiliateToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAffiliate}
                disabled={formLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Afiliado</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROCESAR SOLICITUD DE RETIRO */}
      {resolveWithdrawalModal && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white">
                {resolveWithdrawalModal.accion === 'aprobar'
                  ? 'Aprobar y Pagar Solicitud de Retiro'
                  : 'Rechazar Solicitud de Retiro'}
              </h3>
              <button onClick={() => setResolveWithdrawalModal(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">

            <div className="bg-gray-950 p-3 rounded-xl border border-gray-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">Afiliado:</span>
                <span className="text-white font-medium">{resolveWithdrawalModal.withdrawal.affiliate?.user?.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Monto:</span>
                <span className="text-emerald-400 font-bold">{formatCOP(resolveWithdrawalModal.withdrawal.monto)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Método / Cuenta:</span>
                <span className="text-gray-300">{resolveWithdrawalModal.withdrawal.metodoPago} - {resolveWithdrawalModal.withdrawal.datosPago}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                {resolveWithdrawalModal.accion === 'aprobar'
                  ? 'Comprobante de Pago / Referencia Bancaria'
                  : 'Motivo del Rechazo de la Solicitud'}
              </label>
              <textarea
                rows={3}
                value={resolveWithdrawalModal.inputVal}
                onChange={(e) =>
                  setResolveWithdrawalModal({ ...resolveWithdrawalModal, inputVal: e.target.value })
                }
                placeholder={
                  resolveWithdrawalModal.accion === 'aprobar'
                    ? 'Ej. Transf. Nequi Ref #98234234 o enlace al comprobante'
                    : 'Ej. Datos de cuenta inválidos o saldo inconsistente.'
                }
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                onClick={() => setResolveWithdrawalModal(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmWithdrawal}
                disabled={resolvingId === resolveWithdrawalModal.withdrawal.id}
                className={`px-4 py-2 font-semibold text-white rounded-xl cursor-pointer flex items-center gap-1.5 ${
                  resolveWithdrawalModal.accion === 'aprobar'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {resolvingId === resolveWithdrawalModal.withdrawal.id && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {resolveWithdrawalModal.accion === 'aprobar' ? 'Confirmar Pago' : 'Confirmar Rechazo'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
