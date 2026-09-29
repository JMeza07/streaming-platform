'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  UserCheck,
  Wallet,
  TrendingUp,
  Award,
  DollarSign,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Film,
  ShoppingCart,
  RefreshCw,
  Search,
  ArrowUpRight,
  Sparkles,
  Phone,
  Mail,
  Layers,
  ChevronRight,
  Clock,
  CheckCircle2,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import { useDialog } from '@/components/Dialog';

export default function SellerProfilePage() {
  const { alert } = useDialog();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [allAffiliates, setAllAffiliates] = useState<any[]>([]);
  const [selectedAffiliateId, setSelectedAffiliateId] = useState<string>('');
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    monto: '',
    metodoPago: 'Nequi',
    datosPago: '',
  });
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState('');

  // Paginación (10 filas máx)
  const [currentCatalogPage, setCurrentCatalogPage] = useState(1);
  const [currentVentasPage, setCurrentVentasPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredCatalog = useMemo(() => {
    if (!profile) return [];
    const q = catalogSearch.toLowerCase();
    return (profile.catalogoConGanancias || []).filter((item: any) =>
      item.servicioNombre?.toLowerCase().includes(q) ||
      item.nombrePlan?.toLowerCase().includes(q)
    );
  }, [profile, catalogSearch]);

  useEffect(() => {
    setCurrentCatalogPage(1);
  }, [catalogSearch]);

  const paginatedCatalog = useMemo(() => {
    const start = (currentCatalogPage - 1) * ITEMS_PER_PAGE;
    return filteredCatalog.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCatalog, currentCatalogPage]);

  const paginatedVentas = useMemo(() => {
    const start = (currentVentasPage - 1) * ITEMS_PER_PAGE;
    return (profile?.ventasRecientes || []).slice(start, start + ITEMS_PER_PAGE);
  }, [profile, currentVentasPage]);

  const fetchProfile = async (overrideId?: string) => {
    try {
      setLoading(true);
      const target = overrideId !== undefined ? overrideId : selectedAffiliateId;
      const url = target ? `/affiliates/me?affiliateId=${target}` : '/affiliates/me';
      const res = await api.get(url);
      setProfile(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar perfil del vendedor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const raw = Cookies.get('user') || (typeof window !== 'undefined' ? localStorage.getItem('user') : null);
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setCurrentUser(u);
        if (u.rol === 'ADMIN') {
          api.get('/affiliates').then((r) => setAllAffiliates(r.data || [])).catch(console.error);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchProfile();
  }, []);

  const handleCopy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawForm.monto || Number(withdrawForm.monto) <= 0) {
      await alert('Ingresa un monto válido para retirar', { type: 'warning', title: 'Monto inválido' });
      return;
    }
    if (Number(withdrawForm.monto) > (profile?.walletBalance || 0)) {
      await alert('El monto supera tu saldo disponible en billetera', { type: 'warning', title: 'Saldo insuficiente' });
      return;
    }

    try {
      setSubmittingWithdraw(true);
      await api.post('/affiliates/withdraw', {
        monto: Number(withdrawForm.monto),
        metodoPago: withdrawForm.metodoPago,
        datosPago: withdrawForm.datosPago,
      });
      setWithdrawSuccess('¡Solicitud de retiro enviada con éxito! El administrador procesará tu pago.');
      setWithdrawModal(false);
      setWithdrawForm({ monto: '', metodoPago: 'Nequi', datosPago: '' });
      fetchProfile();
      setTimeout(() => setWithdrawSuccess(''), 5000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al solicitar el retiro', { type: 'error', title: 'Error de Retiro' });
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  const formatCOP = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const rankColors: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    bronce: { bg: 'bg-amber-950/60', text: 'text-amber-400', border: 'border-amber-700/50', glow: 'shadow-amber-900/20' },
    plata: { bg: 'bg-slate-900', text: 'text-slate-200', border: 'border-slate-500/50', glow: 'shadow-slate-700/20' },
    oro: { bg: 'bg-yellow-950/60', text: 'text-yellow-400', border: 'border-yellow-600/50', glow: 'shadow-yellow-600/30' },
    diamante: { bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-500/50', glow: 'shadow-cyan-500/30' },
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Cargando perfil y estructura de ganancias...</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="p-8 bg-gray-900/70 border border-gray-800 rounded-2xl text-center max-w-lg mx-auto space-y-4 shadow-xl backdrop-blur-md mt-10">
        <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/60 flex items-center justify-center text-red-400 mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Perfil de Vendedor</h3>
          <p className="text-xs text-gray-400 mt-1">{error || 'No se encontró un perfil de vendedor activo para tu usuario.'}</p>
        </div>
        <button
          onClick={() => fetchProfile()}
          className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reintentar y Cargar Perfil</span>
        </button>
      </div>
    );
  }

  const currentRankStyle = rankColors[profile.rango?.toLowerCase()] || rankColors.bronce;

  const progresoInfo = typeof profile.progresoRango === 'object' && profile.progresoRango !== null
    ? profile.progresoRango
    : { progreso: Number(profile.progresoRango) || 0, siguiente: '', faltante: 0 };
  const progresoPorcentaje = Math.min(100, Math.max(0, Math.round(Number(progresoInfo.progreso) || 0)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <UserCheck className="w-6 h-6 text-red-500" />
            <span>
              {currentUser?.rol === 'ASESOR_COMERCIAL'
                ? 'Mi Perfil de Asesor Comercial y Ganancias'
                : 'Mi Perfil de Vendedor y Comisiones'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {currentUser?.rol === 'ASESOR_COMERCIAL'
              ? 'Estructura de ganancias por afiliación, enlace exclusivo para captación y billetera'
              : 'Estructura de ganancias por rango, catálogo de precios con margen comercial y billetera'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {currentUser?.rol === 'ADMIN' && allAffiliates.length > 0 && (
            <div className="flex items-center gap-2 bg-gray-900/90 border border-gray-800 rounded-xl px-3 py-1.5 text-xs text-gray-300">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-gray-400 hidden sm:inline">Vendedor:</span>
              <select
                value={selectedAffiliateId}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedAffiliateId(val);
                  fetchProfile(val);
                }}
                className="bg-gray-950 border border-gray-800 text-white rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
              >
                <option value="">Mi Perfil (Admin)</option>
                {allAffiliates.map((aff) => (
                  <option key={aff.id} value={aff.id}>
                    {aff.user?.nombre || aff.codigoReferido} ({aff.rango})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchProfile()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Actualizar</span>
          </button>
          <button
            onClick={() => setWithdrawModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>Solicitar Retiro</span>
          </button>
          {currentUser?.rol !== 'ASESOR_COMERCIAL' && (
            <Link
              href="/admin/orders?action=new-sale"
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer transform active:scale-95"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Realizar Venta</span>
            </Link>
          )}
        </div>
      </div>

      {withdrawSuccess && (
        <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{withdrawSuccess}</span>
        </div>
      )}

      {/* TARJETA PRINCIPAL DEL VENDEDOR & RANGOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Perfil & Código de Vendedor */}
        <div className="bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800/80 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-red-600/30">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">{profile.nombre}</h3>
                <span className="text-[11px] text-gray-400 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-gray-500" />
                  {profile.email}
                </span>
              </div>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider border shadow-md ${currentRankStyle.bg} ${currentRankStyle.text} ${currentRankStyle.border}`}
            >
              Rango {profile.rango}
            </span>
          </div>

          {/* Código de Vendedor */}
          <div className="bg-gray-950/70 border border-gray-850 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Tu Código de Vendedor Único
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-base font-extrabold text-white tracking-wider">
                {profile.codigoReferido}
              </span>
              <button
                onClick={() => handleCopy(profile.codigoReferido, 'code')}
                className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[11px]">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[11px]">Copiar</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Enlace de Venta */}
          <div className="bg-gray-950/70 border border-gray-850 rounded-xl p-3.5 space-y-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
              Enlace de Venta con tu Código Asignado
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== 'undefined' ? `${window.location.origin}/?ref=${profile.codigoReferido}` : `/?ref=${profile.codigoReferido}`}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1 text-[11px] text-gray-300 font-mono focus:outline-none"
              />
              <button
                onClick={() =>
                  handleCopy(
                    typeof window !== 'undefined'
                      ? `${window.location.origin}/?ref=${profile.codigoReferido}`
                      : `/?ref=${profile.codigoReferido}`,
                    'link'
                  )
                }
                className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer shadow-md shadow-red-600/20"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[11px]">Copiar Link</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-500">
              Cualquier cliente que compre desde tu enlace registrará la venta automáticamente a tu nombre.
            </p>
          </div>
        </div>

        {/* Billetera y Métricas de Rendimiento */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Billetera Disponible */}
          <div className="bg-gradient-to-br from-gray-900 to-emerald-950/30 border border-emerald-800/40 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  Saldo en Billetera
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-white mt-2 tracking-tight font-mono">
                {formatCOP(profile.walletBalance)}
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Disponible para retiro inmediato a Nequi / Bancolombia
              </p>
            </div>
            <div className="pt-4 border-t border-gray-800/80 mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">Total Ganado Histórico:</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">
                {formatCOP(profile.totalGanado)}
              </span>
            </div>
          </div>

          {/* Porcentaje de Ganancia Actual */}
          <div className="bg-gradient-to-br from-gray-900 to-blue-950/30 border border-blue-800/40 rounded-2xl p-5 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-400">
                  Comisión por Venta
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-950 border border-blue-800/50 flex items-center justify-center text-blue-400">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <p className="text-3xl font-extrabold text-white mt-2 tracking-tight font-mono">
                {profile.porcentajeGanancia}%
              </p>
              <p className="text-[11px] text-gray-400 mt-1">
                Ganancia neta directa sobre cada producto vendido
              </p>
            </div>
            <div className="pt-4 border-t border-gray-800/80 mt-4 flex items-center justify-between">
              <span className="text-xs text-gray-400">Ventas este mes:</span>
              <span className="text-xs font-bold text-blue-400 font-mono">
                {formatCOP(profile.ventasMesActual)}
              </span>
            </div>
          </div>

          {/* ESCALERA DE RANGOS Y PORCENTAJES */}
          <div className="sm:col-span-2 bg-gray-900/60 border border-gray-800/80 rounded-2xl p-5 space-y-3 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-red-500" />
                Escala Oficial de Rangos y Porcentajes de Ganancia
              </span>
              <span className="text-[11px] text-gray-400">
                Progreso hacia {progresoInfo.siguiente ? String(progresoInfo.siguiente) : 'siguiente nivel'}:{' '}
                <strong className="text-white">{progresoPorcentaje}%</strong>
              </span>
            </div>

            {/* Barra de progreso visual */}
            <div className="w-full bg-gray-950 h-2.5 rounded-full overflow-hidden border border-gray-800">
              <div
                className="bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progresoPorcentaje}%` }}
              />
            </div>

            {/* Tarjetas de Rangos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {(profile.rangosEstructura || []).map((r: any) => {
                const isCurrent = profile.rango?.toLowerCase() === r.rango;
                const style = rankColors[r.rango] || rankColors.bronce;

                return (
                  <div
                    key={r.rango}
                    className={`p-3 rounded-xl border transition-all ${
                      isCurrent
                        ? `${style.bg} ${style.border} ring-1 ring-red-500/50 shadow-lg`
                        : 'bg-gray-950/40 border-gray-850 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase ${isCurrent ? style.text : 'text-gray-300'}`}>
                        {r.nombre}
                      </span>
                      {isCurrent && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                      )}
                    </div>
                    <p className="text-lg font-extrabold text-white mt-1 font-mono">{r.porcentaje}%</p>
                    <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{r.descripcion}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* CATÁLOGO DE PRECIOS Y CALCULADORA DE GANANCIAS */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-red-500" />
              <span>Catálogo de Precios & Margen de Ganancia por Producto</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Precios sugeridos al cliente y tu ganancia neta acreditada en cada venta según tu rango del {profile.porcentajeGanancia}%
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Buscar por plataforma o plan..."
              value={catalogSearch}
              onChange={(e) => setCatalogSearch(e.target.value)}
              className="w-full bg-gray-950/80 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>

        {/* Tabla de Precios y Ganancias */}
        <div className="overflow-x-auto rounded-xl border border-gray-800/80">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/90 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Plataforma / Servicio</th>
                <th className="px-5 py-3.5">Plan</th>
                <th className="px-5 py-3.5">Precio Público</th>
                <th className="px-5 py-3.5">Tu Comisión (%)</th>
                <th className="px-5 py-3.5 text-emerald-400 font-bold">Tu Ganancia Neta</th>
                <th className="px-5 py-3.5">Disponibilidad</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850/60 bg-gray-950/30">
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-500">
                    No se encontraron planes que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                paginatedCatalog.map((plan: any) => (
                  <tr key={plan.id} className="hover:bg-gray-850/40 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-red-950/60 border border-red-800/40 flex items-center justify-center text-red-400 shrink-0">
                        <Film className="w-3.5 h-3.5" />
                      </div>
                      <span>{plan.servicioNombre}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-gray-200">{plan.nombrePlan}</p>
                      <span className="text-[10px] text-gray-500">
                        {plan.duracionDias} días • {plan.pantallas} pantalla(s)
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-white font-mono">
                      {formatCOP(plan.precioPublico)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-blue-950/50 border border-blue-800/40 text-blue-300 font-bold text-[10px] font-mono">
                        {plan.porcentajeVendedor}%
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 font-bold font-mono text-sm shadow-sm shadow-emerald-950/40">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                        <span>+{formatCOP(plan.gananciaEstimada)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {plan.stockDisponible > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          {plan.stockDisponible} en stock
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-red-950/40 border border-red-800/40 text-red-400 text-[10px] font-semibold">
                          Agotado
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/orders?action=new-sale&planId=${plan.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm ${
                          plan.stockDisponible > 0
                            ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20 cursor-pointer transform active:scale-95'
                            : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-60 pointer-events-none'
                        }`}
                        data-tooltip="Vender"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>Vender</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentCatalogPage}
          totalItems={filteredCatalog.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentCatalogPage}
        />
      </div>

      {/* HISTORIAL DE VENTAS GESTIONADAS */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-5 space-y-4 backdrop-blur-md shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-500" />
            <span>Mis Ventas Gestionadas & Comisiones Registradas</span>
          </h2>
          <span className="text-xs text-gray-400">
            Últimas {profile.ventasRecientes?.length || 0} ventas
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-800/80">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/90 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Fecha & Hora</th>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Productos / Servicios</th>
                <th className="px-5 py-3.5">Total Venta</th>
                <th className="px-5 py-3.5 text-emerald-400">Tu Ganancia</th>
                <th className="px-5 py-3.5">Descripción de la Venta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850/60 bg-gray-950/30">
              {(!profile.ventasRecientes || profile.ventasRecientes.length === 0) ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-500">
                    Aún no tienes ventas registradas. ¡Comparte tu enlace de vendedor para empezar a ganar!
                  </td>
                </tr>
              ) : (
                paginatedVentas.map((v: any) => (
                  <tr key={v.id} className="hover:bg-gray-850/40 transition-colors">
                    <td className="px-5 py-3.5 whitespace-nowrap text-gray-300 font-mono text-[11px]">
                      {new Date(v.fecha).toLocaleString('es-CO', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-white">{v.clienteNombre}</td>
                    <td className="px-5 py-3.5 text-gray-300 max-w-xs truncate">{v.items}</td>
                    <td className="px-5 py-3.5 font-bold text-white font-mono">
                      {formatCOP(v.total)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-bold text-emerald-400 font-mono">
                        +{formatCOP(v.gananciaVendedor)}
                      </span>
                      <span className="block text-[10px] text-gray-500">({v.porcentajeAplicado}%)</span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-[11px] max-w-sm truncate">
                      {v.descripcionVenta || 'Venta gestionada por vendedor'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={currentVentasPage}
          totalItems={profile.ventasRecientes?.length || 0}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentVentasPage}
        />
      </div>

      {/* MODAL: SOLICITAR RETIRO */}
      {withdrawModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <Wallet className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Solicitud de Retiro de Fondos</h3>
              </div>
              <button
                onClick={() => setWithdrawModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                <div className="bg-gray-950/60 border border-gray-850 rounded-xl p-3 flex justify-between items-center text-xs">
                  <span className="text-gray-400">Saldo Disponible:</span>
                  <span className="font-bold text-emerald-400 font-mono text-sm">
                    {formatCOP(profile.walletBalance)}
                  </span>
                </div>

                <div>
                  <label className="block text-gray-400 font-medium mb-1">Monto a Retirar (COP) *</label>
                  <input
                    type="number"
                    required
                    min="20000"
                    max={profile.walletBalance}
                    placeholder="Ej: 50000"
                    value={withdrawForm.monto}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, monto: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-600 font-mono"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    Monto mínimo de retiro: $20.000 COP
                  </span>
                </div>

                <div>
                  <label className="block text-gray-400 font-medium mb-1">Método de Pago *</label>
                  <select
                    value={withdrawForm.metodoPago}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, metodoPago: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="Nequi">Nequi</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Bancolombia">Bancolombia Ahorros</option>
                    <option value="Transfiya">Llave Transfiya</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-medium mb-1">
                    Número de Cuenta / Teléfono / Titular *
                  </label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Ej: Nequi 3155554433 a nombre de Alejandro Revendedor"
                    value={withdrawForm.datosPago}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, datosPago: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-800 bg-gray-950/40 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setWithdrawModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingWithdraw}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submittingWithdraw ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <span>Enviar Solicitud</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
