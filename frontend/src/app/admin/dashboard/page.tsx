'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  DollarSign,
  Users,
  Database,
  Tv,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  ShoppingCart,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Film,
  Headset,
  MessageSquare,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);

  const fetchDashboard = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/dashboard/full');
      setData(res.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar métricas del dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const userCookie = Cookies.get('user');
    if (userCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch (e) {
        console.error(e);
      }
    }
    fetchDashboard();
  }, []);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-900 rounded-xl w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-gray-900 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-gray-900 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-gray-900 rounded-2xl lg:col-span-2" />
          <div className="h-80 bg-gray-900 rounded-2xl" />
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const stock = data?.stock || [];
  const alerts = data?.alerts || {};
  const topPlatforms = data?.topPlatforms || [];
  const pendingOrders = alerts?.ordenesPendientes || 0;
  const pendingWarrantyTickets = alerts?.ticketsGarantiaPendientes || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <span>{user?.rol === 'ADMIN' ? 'Panel de Control General' : 'Panel de Control Personal'}</span>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
              user?.rol === 'ADMIN'
                ? 'bg-red-950/70 text-red-400 border-red-900/50'
                : 'bg-emerald-950/70 text-emerald-400 border-emerald-900/50'
            }`}>
              {user?.rol === 'ADMIN' ? 'En Vivo (Global)' : 'Mis Operaciones'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            {user?.rol === 'ADMIN'
              ? 'Resumen global de ventas, stock de cuentas y estado de la plataforma'
              : 'Resumen exclusivo de tus ventas generadas, clientes y operaciones personales'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchDashboard}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-900/80 hover:bg-gray-850 text-xs font-medium text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-red-400' : ''}`} />
            <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
          </button>
          <Link
            href="/admin/orders"
            className={`relative flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-medium rounded-xl shadow-lg transition-all ${
              pendingOrders > 0
                ? 'animate-subtle-zoom shadow-red-600/40 ring-2 ring-red-500/40'
                : 'shadow-red-600/20'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Ver Órdenes</span>
            {pendingOrders > 0 && (
              <span className="absolute -top-2.5 -right-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60"></span>
                <span className="relative inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-amber-400 text-gray-950 text-[11px] font-black shadow-md border-2 border-gray-950">
                  {pendingOrders > 99 ? '99+' : pendingOrders}
                </span>
              </span>
            )}
          </Link>
          {pendingWarrantyTickets > 0 && (
            <Link
              href="/admin/warranty"
              className="relative flex items-center gap-2 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-amber-600/30 animate-subtle-zoom ring-2 ring-amber-500/40 transition-all"
            >
              <Headset className="w-3.5 h-3.5" />
              <span>Tickets Garantia</span>
              <span className="absolute -top-2.5 -right-2 flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60"></span>
                <span className="relative inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-red-400 text-gray-950 text-[11px] font-black shadow-md border-2 border-gray-950">
                  {pendingWarrantyTickets > 99 ? '99+' : pendingWarrantyTickets}
                </span>
              </span>
            </Link>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 border border-red-800 text-red-300 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* ACCIONES FRECUENTES: SOBRE EL RESUMEN GLOBAL EN TARJETAS MENOS ALTAS */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-red-400" />
            Acciones Frecuentes
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Inventario (Todos los roles administrativos) */}
          <Link
            href="/admin/inventory"
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/70 hover:bg-gray-850 border border-gray-800/80 hover:border-red-600/40 text-gray-200 transition-all shadow-sm hover:shadow-red-950/20 group flex-1 min-w-[150px]"
          >
            <div className="w-8 h-8 rounded-lg bg-red-950/70 border border-red-900/50 flex items-center justify-center text-red-400 shrink-0 group-hover:scale-105 transition-transform">
              <Database className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-bold text-white truncate leading-tight">Inventario</span>
              <span className="text-[10px] text-gray-400 block truncate">
                {user?.rol === 'ADMIN' ? 'Cargar cuentas' : 'Consultar stock'}
              </span>
            </div>
          </Link>

          {/* Catálogo (Solo ADMIN) */}
          {user?.rol === 'ADMIN' && (
            <Link
              href="/admin/catalog"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/70 hover:bg-gray-850 border border-gray-800/80 hover:border-purple-600/40 text-gray-200 transition-all shadow-sm hover:shadow-purple-950/20 group flex-1 min-w-[150px]"
            >
              <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-900/50 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
                <Film className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-white truncate leading-tight">Catálogo</span>
                <span className="text-[10px] text-gray-400 block truncate">Planes y precios</span>
              </div>
            </Link>
          )}

          {/* Órdenes y Ventas (ADMIN, VENDEDOR, SOPORTE) */}
          <Link
            href="/admin/orders"
            className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/70 hover:bg-gray-850 border border-gray-800/80 hover:border-emerald-600/40 text-gray-200 transition-all shadow-sm hover:shadow-emerald-950/20 group flex-1 min-w-[150px]"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <ShoppingCart className="w-4 h-4" />
            </div>
            <div className="overflow-hidden">
              <span className="block text-xs font-bold text-white truncate leading-tight">Ventas</span>
              <span className={`text-[10px] block truncate font-medium ${pendingOrders > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
                {pendingOrders > 0
                  ? `${pendingOrders} pendientes`
                  : user?.rol === 'SOPORTE' ? 'Ver pedidos' : 'Aprobar entregas'}
              </span>
            </div>
          </Link>

          {/* Garantias y Soporte (Solo ADMIN y SOPORTE) */}
          {(user?.rol === 'ADMIN' || user?.rol === 'SOPORTE') && (
            <Link
              href="/admin/warranty"
              className={`flex items-center gap-3 p-3 rounded-xl bg-gray-900/70 hover:bg-gray-850 border text-gray-200 transition-all shadow-sm group flex-1 min-w-[150px] relative ${
                pendingWarrantyTickets > 0
                  ? 'border-amber-700/60 hover:border-amber-500/60 shadow-amber-950/20'
                  : 'border-gray-800/80 hover:border-amber-600/40 hover:shadow-amber-950/20'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg border flex items-center justify-center text-amber-400 shrink-0 group-hover:scale-105 transition-transform ${
                pendingWarrantyTickets > 0 ? 'bg-amber-950/80 border-amber-800/60' : 'bg-amber-950/70 border-amber-900/50'
              }`}>
                <Headset className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-white truncate leading-tight">Garantias</span>
                <span className={`text-[10px] block truncate font-medium ${
                  pendingWarrantyTickets > 0 ? 'text-amber-400' : 'text-gray-400'
                }`}>
                  {pendingWarrantyTickets > 0 ? `${pendingWarrantyTickets} pendientes` : 'Soporte 24/7'}
                </span>
              </div>
              {pendingWarrantyTickets > 0 && (
                <span className="absolute -top-1.5 -right-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-40"></span>
                  <span className="relative flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-amber-400 text-gray-950 text-[9px] font-black">
                    {pendingWarrantyTickets}
                  </span>
                </span>
              )}
            </Link>
          )}

          {/* Afiliados y Retiros (Solo ADMIN) */}
          {user?.rol === 'ADMIN' && (
            <Link
              href="/admin/affiliates"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/70 hover:bg-gray-850 border border-gray-800/80 hover:border-blue-600/40 text-gray-200 transition-all shadow-sm hover:shadow-blue-950/20 group flex-1 min-w-[150px]"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-950/70 border border-blue-900/50 flex items-center justify-center text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-white truncate leading-tight">Afiliados</span>
                <span className="text-[10px] text-gray-400 block truncate">Pagar retiros</span>
              </div>
            </Link>
          )}

          {/* WhatsApp CRM (Solo ADMIN) */}
          {user?.rol === 'ADMIN' && (
            <Link
              href="/admin/whatsapp"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-900/70 hover:bg-gray-850 border border-gray-800/80 hover:border-emerald-600/40 text-gray-200 transition-all shadow-sm hover:shadow-emerald-950/20 group flex-1 min-w-[150px]"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-900/50 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="block text-xs font-bold text-white truncate leading-tight">WhatsApp</span>
                <span className="text-[10px] text-gray-400 block truncate">CRM y bots</span>
              </div>
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards (Resumen Global para ADMIN / Operaciones Personales para VENDEDOR) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ventas Hoy */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md group hover:border-gray-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {user?.rol === 'ADMIN' ? 'Ventas Hoy (Global)' : 'Mis Ventas Hoy'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {formatCOP(metrics.ventasHoy?.total || 0)}
            </h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <span className="text-emerald-400 font-semibold">{metrics.ventasHoy?.cantidad || 0}</span>
              <span>{user?.rol === 'ADMIN' ? 'pedidos pagados hoy en el sistema' : 'tus pedidos pagados hoy'}</span>
            </p>
          </div>
        </div>

        {/* Ventas Mes */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md group hover:border-gray-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {user?.rol === 'ADMIN' ? 'Ingresos del Mes (Global)' : 'Mis Ingresos del Mes'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-red-950/80 border border-red-800/60 flex items-center justify-center text-red-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {formatCOP(metrics.ventasMes?.total || 0)}
            </h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <span className="text-red-400 font-semibold">{metrics.ventasMes?.cantidad || 0}</span>
              <span>{user?.rol === 'ADMIN' ? 'órdenes globales en los últimos 30 días' : 'tus órdenes en los últimos 30 días'}</span>
            </p>
          </div>
        </div>

        {/* Suscripciones Activas */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md group hover:border-gray-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              {user?.rol === 'ADMIN' ? 'Suscripciones Activas (Global)' : 'Mis Clientes con Suscripción'}
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-800/60 flex items-center justify-center text-blue-400">
              <Tv className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {metrics.suscripcionesActivas || 0}
            </h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
              <span>{user?.rol === 'ADMIN' ? 'Clientes disfrutando servicio' : 'Tus clientes con suscripción activa'}</span>
            </p>
          </div>
        </div>

        {/* Cuentas en Stock */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-5 relative overflow-hidden backdrop-blur-md group hover:border-gray-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Stock en Almacén
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-black text-white tracking-tight">
              {metrics.stockDisponible || 0}
            </h3>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
              <span>cuentas disponibles</span>
            </p>
          </div>
        </div>
      </div>

      {/* Grid Central: Stock por Servicio y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventario por Plataforma */}
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Tv className="w-4 h-4 text-red-500" />
              <span>Estado del Inventario por Plataforma</span>
            </h2>
            <Link
              href="/admin/inventory"
              className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Gestionar inventario</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {stock.map((platform: any) => {
              const isLow = platform.stockDisponible <= 2;
              return (
                <div
                  key={platform.id}
                  className="p-4 rounded-xl bg-gray-950/60 border border-gray-850 flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      {platform.logoUrl ? (
                        <img
                          src={platform.logoUrl}
                          alt={platform.nombre}
                          className="w-7 h-7 object-contain rounded shrink-0 bg-black/40 p-0.5"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded bg-red-950 flex items-center justify-center font-bold text-red-400 text-xs">
                          {platform.nombre.substring(0, 2)}
                        </div>
                      )}
                      <div>
                        <h4 className="text-sm font-semibold text-white leading-tight">
                          {platform.nombre}
                        </h4>
                        <p className="text-[11px] text-gray-400">
                          {platform.planes?.length || 0} planes activos
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-lg font-black ${
                          isLow ? 'text-red-400' : 'text-emerald-400'
                        }`}
                      >
                        {platform.stockDisponible}
                      </span>
                      <span className="block text-[10px] uppercase font-bold tracking-wider text-gray-500 -mt-1">
                        Disponibles
                      </span>
                    </div>
                  </div>

                  {/* Barra de estado visual */}
                  <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isLow ? 'bg-red-500' : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(10, platform.stockDisponible * 20))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas del Negocio */}
        <div className="space-y-6">
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Alertas del Negocio</span>
            </h2>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-200">
                <p className="font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Suscripciones por vencer (3 días)</span>
                </p>
                <p className="text-lg font-black text-amber-400 mt-1">
                  {data?.subscriptions?.porVencer || 0}
                </p>
                <p className="text-[11px] text-amber-300/70 mt-0.5">
                  Los recordatorios automáticos de WhatsApp están listos para ser enviados.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-gray-950/60 border border-gray-800 text-gray-300">
                <p className="font-semibold text-white">Tickets de Garantía Pendientes</p>
                <p className="text-lg font-black text-red-400 mt-1">
                  {alerts?.ticketsGarantiaPendientes || 0}
                </p>
                <Link
                  href="/admin/warranty"
                  className="inline-flex items-center gap-1 text-[11px] text-red-400 hover:text-red-300 font-medium mt-1"
                >
                  <span>Revisar tickets de soporte</span>
                  <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}