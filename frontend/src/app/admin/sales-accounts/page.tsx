'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import TablePagination from '@/components/TablePagination';
import {
  KeyRound,
  Search,
  Printer,
  Download,
  Eye,
  EyeOff,
  Copy,
  Check,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Tv,
  ShoppingBag,
  ExternalLink,
  Loader2,
  RefreshCw,
  Send,
  Bell,
  Clock,
  Phone,
} from 'lucide-react';
import { useDialog } from '@/components/Dialog';

// Mensaje de normas de uso que se adjunta al copiar credenciales
const TERMS_MESSAGE = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 NORMAS DE USO Y CONDICIONES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ PERMITIDO:
• Usar el servicio de forma personal en el perfil/pantalla asignada.
• Disfrutar el contenido dentro de los límites del plan adquirido.

❌ PROHIBIDO (puede causar CANCELACIÓN inmediata sin reembolso):
• Compartir las credenciales con terceros no autorizados.
• Cambiar la contraseña, nombre del perfil o PIN sin autorización.
• Agregar o eliminar perfiles de la cuenta.
• Acceder desde más dispositivos de los permitidos simultáneamente.
• Intentar hacer descargas masivas o uso comercial del servicio.
• Ceder, vender o transferir el acceso a otra persona.

⚠️ IMPORTANTE:
• El incumplimiento de estas normas resultará en la SUSPENSIÓN o CANCELACIÓN inmediata de su cuenta SIN derecho a reembolso.
• Si detecta problemas técnicos, comuníquese con soporte ANTES de hacer cualquier cambio en la cuenta.
• Su acceso es personal e intransferible.

Gracias por confiar en nuestros servicios. 🙏
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

export default function SalesAccountsPage() {
  const { alert } = useDialog();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // UI state
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/subscriptions');
      setSubscriptions(res.data);
    } catch (err) {
      console.error('Error al cargar cuentas vendidas:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Copiar credenciales completas + normas de uso
  const handleCopyFullAccess = (sub: any) => {
    const cred = sub.credenciales;
    if (!cred?.email) return;
    const accId = sub.accountId || sub.credenciales?.id || sub.id;
    const accCode = `#ACC-${accId.substring(0, 8).toUpperCase()}`;
    const msg = [
      `🎬 *${sub.plataforma}* — ${sub.planNombre}`,
      `🆔 *ID Cuenta:* ${accCode} (${accId})`,
      ``,
      `📧 *Correo:* ${cred.email}`,
      `🔑 *Contraseña:* ${cred.password || 'N/A'}`,
      cred.perfil ? `👤 *Perfil:* ${cred.perfil}` : null,
      cred.pin ? `🔒 *PIN:* ${cred.pin}` : null,
      `📅 *Vencimiento:* ${sub.fechaFin ? new Date(sub.fechaFin).toLocaleDateString('es-CO') : 'N/A'}`,
      ``,
      TERMS_MESSAGE,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(msg);
    setCopiedId(`full-${sub.id}`);
    setTimeout(() => setCopiedId(null), 3000);
  };

  // Enviar credenciales completas + normas de uso por WhatsApp
  const handleSendWhatsAppFullAccess = async (sub: any) => {
    const cred = sub.credenciales;
    if (!cred?.email) {
      await alert('Esta cuenta vendida aún no cuenta con credenciales asignadas.', {
        type: 'warning',
        title: 'Sin Credenciales',
      });
      return;
    }

    const rawPhone = sub.cliente?.telefono || sub.cliente?.whatsapp || sub.customer?.whatsapp;
    const phone = rawPhone ? rawPhone.replace(/\D/g, '') : '';
    if (!phone) {
      await alert('Este cliente no tiene un número de WhatsApp registrado.', {
        type: 'warning',
        title: 'Sin Teléfono de WhatsApp',
      });
      return;
    }

    const accId = sub.accountId || sub.credenciales?.id || sub.id;
    const accCode = `#ACC-${accId.substring(0, 8).toUpperCase()}`;
    const msg = [
      `Hola *${sub.cliente?.nombre || 'Estimado Cliente'}* 👋, aquí tienes los detalles de acceso y credenciales de tu servicio:`,
      ``,
      `🎬 *${sub.plataforma}* — ${sub.planNombre}`,
      `🆔 *ID Cuenta:* ${accCode} (${accId})`,
      ``,
      `📧 *Correo:* ${cred.email}`,
      `🔑 *Contraseña:* ${cred.password || 'N/A'}`,
      cred.perfil ? `👤 *Perfil:* ${cred.perfil}` : null,
      cred.pin ? `🔒 *PIN:* ${cred.pin}` : null,
      `📅 *Vencimiento:* ${sub.fechaFin ? new Date(sub.fechaFin).toLocaleDateString('es-CO') : 'N/A'}`,
      ``,
      TERMS_MESSAGE,
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const toggleReveal = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Enviar recordatorio de WhatsApp según estado
  const handleSendWhatsAppReminder = async (sub: any, type: 'pronto' | 'vencida' | 'recuperar') => {
    const phone = sub.cliente?.telefono?.replace(/\D/g, '');
    if (!phone) {
      await alert('Este cliente no tiene número de WhatsApp registrado.', { type: 'warning', title: 'Sin WhatsApp' });
      return;
    }
    setSendingReminder(sub.id);
    const plataforma = sub.plataforma;
    const vencimiento = sub.fechaFin ? new Date(sub.fechaFin).toLocaleDateString('es-CO') : 'pronto';
    let mensaje = '';
    if (type === 'pronto') {
      mensaje = `Hola ${sub.cliente?.nombre || 'cliente'} 👋, te recordamos que tu suscripción de *${plataforma}* vence el *${vencimiento}* (en 3 días). Para renovar y continuar disfrutando el servicio, comunícate con nosotros. ¡No pierdas tu acceso! 🎬`;
    } else if (type === 'vencida') {
      mensaje = `Hola ${sub.cliente?.nombre || 'cliente'} 👋, tu suscripción de *${plataforma}* ha *VENCIDO* el ${vencimiento}. Renueva ahora para recuperar tu acceso inmediatamente. ¡Estamos aquí para atenderte! 🔄`;
    } else {
      mensaje = `Hola ${sub.cliente?.nombre || 'cliente'} 👋, notamos que llevas 3 días sin renovar tu suscripción de *${plataforma}*. ¡Te extrañamos! 😊 Queremos ofrecerte una *oferta especial* para que vuelvas a disfrutar de tu contenido favorito. Escríbenos y te ayudamos. 🎁`;
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
    setSendingReminder(null);
  };

  // Las cuentas vendidas solo se pueden ver, no modificar

  // Extraer lista única de plataformas para el selector
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    subscriptions.forEach((s) => {
      if (s.plataforma) set.add(s.plataforma);
    });
    return Array.from(set);
  }, [subscriptions]);

  // Filtrado reactivo
  const filteredSubscriptions = useMemo(() => {
    return subscriptions.filter((sub) => {
      const cleanSearch = searchTerm.trim().toLowerCase();
      const accountCode = `#ACC-${(sub.accountId || sub.credenciales?.id || sub.id || '').substring(0, 8).toUpperCase()}`;

      const matchesSearch =
        !cleanSearch ||
        sub.plataforma?.toLowerCase().includes(cleanSearch) ||
        sub.planNombre?.toLowerCase().includes(cleanSearch) ||
        sub.cliente?.nombre?.toLowerCase().includes(cleanSearch) ||
        sub.cliente?.email?.toLowerCase().includes(cleanSearch) ||
        sub.vendedor?.nombre?.toLowerCase().includes(cleanSearch) ||
        sub.credenciales?.email?.toLowerCase().includes(cleanSearch) ||
        sub.accountId?.toLowerCase().includes(cleanSearch) ||
        accountCode.toLowerCase().includes(cleanSearch);

      const matchesPlatform = !platformFilter || sub.plataforma === platformFilter;
      const matchesChannel = (() => {
        if (!channelFilter) return true;
        const cf = channelFilter.toUpperCase();
        const subCanal = (sub.canalVenta || '').toUpperCase();
        const hasVendedor = Boolean(sub.vendedor?.nombre || sub.vendedorId || sub.vendedorNombre);

        if (cf === 'VENDEDOR') {
          return subCanal === 'VENDEDOR' || hasVendedor;
        }
        if (cf === 'EN_LINEA' || cf === 'ONLINE') {
          return (subCanal === 'ONLINE' || subCanal === 'EN_LINEA' || !subCanal) && !hasVendedor;
        }
        return subCanal === cf;
      })();
      const matchesStatus = !statusFilter || sub.estado === statusFilter;

      let matchesDate = true;
      if (startDate || endDate) {
        const rawDate = sub.fechaInicio || sub.createdAt || sub.order?.createdAt;
        if (rawDate) {
          const itemDate = new Date(rawDate);
          if (startDate) {
            const [sY, sM, sD] = startDate.split('-').map(Number);
            const startLimit = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
            if (itemDate < startLimit) matchesDate = false;
          }
          if (endDate) {
            const [eY, eM, eD] = endDate.split('-').map(Number);
            const endLimit = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
            if (itemDate > endLimit) matchesDate = false;
          }
        }
      }

      return matchesSearch && matchesPlatform && matchesChannel && matchesStatus && matchesDate;
    });
  }, [subscriptions, searchTerm, platformFilter, channelFilter, statusFilter, startDate, endDate]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, platformFilter, channelFilter, statusFilter, startDate, endDate]);

  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSubscriptions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSubscriptions, currentPage]);

  // Métricas
  const kpis = useMemo(() => {
    const total = filteredSubscriptions.length;
    const activas = filteredSubscriptions.filter((s) => s.estado === 'ACTIVA').length;
    const porVencer = filteredSubscriptions.filter(
      (s) => s.estado === 'ACTIVA' && s.diasRestantes <= 5 && s.diasRestantes > 0
    ).length;
    const suspendidas = filteredSubscriptions.filter((s) => s.estado === 'SUSPENDIDA').length;
    const totalFacturado = filteredSubscriptions.reduce((acc, s) => acc + (s.precio || 0), 0);

    return { total, activas, porVencer, suspendidas, totalFacturado };
  }, [filteredSubscriptions]);

  // Columnas para exportación CSV
  const exportColumns: ColumnDef[] = [
    { key: 'id', label: 'ID Suscripción' },
    { key: 'plataforma', label: 'Plataforma' },
    { key: 'planNombre', label: 'Plan' },
    {
      key: 'canalVenta',
      label: 'Canal de Venta',
      format: (val, row) => (val === 'VENDEDOR' ? `Vendedor: ${row.vendedor?.nombre || 'N/A'}` : 'Venta en Línea'),
    },
    {
      key: 'cliente',
      label: 'Cliente',
      format: (c) => (c ? `${c.nombre} (${c.email})` : 'N/A'),
    },
    {
      key: 'clienteTelefono',
      label: 'Teléfono Cliente',
      format: (_, row) => row.cliente?.telefono || 'N/A',
    },
    {
      key: 'fechaInicio',
      label: 'Fecha y Hora Venta',
      format: (val) => (val ? new Date(val).toLocaleString('es-CO') : 'N/A'),
    },
    {
      key: 'fechaFin',
      label: 'Vencimiento',
      format: (val) => (val ? new Date(val).toLocaleDateString('es-CO') : 'N/A'),
    },
    {
      key: 'diasRestantes',
      label: 'Días Restantes',
      format: (val) => (val !== undefined ? `${val} días` : '0 días'),
    },
    {
      key: 'precio',
      label: 'Valor COP',
      format: (val) => (val ? `$${Number(val).toLocaleString('es-CO')}` : '$0'),
    },
    {
      key: 'accountId',
      label: 'ID Cuenta Inventario',
      format: (_, row) => `#ACC-${(row.accountId || row.credenciales?.id || row.id).substring(0, 8).toUpperCase()} (${row.accountId || row.credenciales?.id || row.id})`,
    },
    {
      key: 'emailCuenta',
      label: 'Email Cuenta',
      format: (_, row) => row.credenciales?.email || '',
    },
    {
      key: 'passwordCuenta',
      label: 'Password Cuenta',
      format: (_, row) => row.credenciales?.password || '',
    },
    {
      key: 'perfilPin',
      label: 'Perfil y PIN',
      format: (_, row) => `${row.credenciales?.perfil || 'Todo'} / PIN: ${row.credenciales?.pin || 'Sin PIN'}`,
    },
    { key: 'estado', label: 'Estado' },
  ];

  const handleExportCSV = () => {
    exportToCSV('reporte_cuentas_vendidas', exportColumns, filteredSubscriptions);
  };

  const handlePrint = () => {
    triggerPrintReport({
      title: 'Reporte de Cuentas Vendidas y Suscripciones',
      subtitle: `Filtros aplicados: ${platformFilter || 'Todas las plataformas'} | Canal: ${channelFilter || 'Todos'} | Total registros: ${filteredSubscriptions.length}`,
      summaryCards: [
        { label: 'Total Cuentas Vendidas', value: kpis.total },
        { label: 'Cuentas Activas', value: kpis.activas },
        { label: 'Por Vencer (<= 5 días)', value: kpis.porVencer },
        { label: 'Suspendidas', value: kpis.suspendidas },
        { label: 'Facturación Total', value: `$${kpis.totalFacturado.toLocaleString('es-CO')}` },
      ],
      columns: [
        { key: 'plataforma', label: 'Plataforma / Plan', format: (_, r) => `${r.plataforma} - ${r.planNombre}` },
        { key: 'cliente', label: 'Cliente', format: (c) => (c ? `${c.nombre} (${c.email})` : 'N/A') },
        {
          key: 'canalVenta',
          label: 'Canal',
          format: (v, r) => (v === 'VENDEDOR' ? `Vendedor: ${r.vendedor?.nombre}` : 'En Línea'),
        },
        { key: 'fechaInicio', label: 'Fecha Venta', format: (v) => new Date(v).toLocaleString('es-CO') },
        { key: 'diasRestantes', label: 'Días Rest.', format: (d) => `${d}d` },
        { key: 'precio', label: 'Precio', format: (p) => `$${Number(p).toLocaleString('es-CO')}` },
        {
          key: 'credenciales',
          label: 'ID Cuenta & Credencial',
          format: (_, r) => {
            const accCode = `#ACC-${(r.accountId || r.credenciales?.id || r.id).substring(0, 8).toUpperCase()}`;
            return `${accCode} - ${r.credenciales?.email || '-'}`;
          },
        },
        { key: 'estado', label: 'Estado' },
      ],
      rows: filteredSubscriptions,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <KeyRound className="w-6 h-6 text-red-500" />
            <span>Cuentas Vendidas y Suscripciones</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Auditoría completa de todas las cuentas comercializadas en línea o por la red de vendedores.
          </p>
        </div>

        {/* Acciones de Exportación e Impresión */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={fetchSubscriptions}
            disabled={refreshing}
            className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer"
            data-tooltip="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-500' : ''}`} />
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-200 rounded-xl transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-sky-400" />
            <span>Imprimir Reporte</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Exportar Excel / CSV</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total Vendidas</div>
          <div className="text-xl font-bold text-white mt-1">{kpis.total}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Histórico filtrado</div>
        </div>

        <div className="p-3.5 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">Activas</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{kpis.activas}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">En servicio vigente</div>
        </div>

        <div className="p-3.5 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">Por Vencer</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{kpis.porVencer}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Vencen en ≤ 5 días</div>
        </div>

        <div className="p-3.5 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">Suspendidas</div>
          <div className="text-xl font-bold text-rose-400 mt-1">{kpis.suspendidas}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Acceso pausado</div>
        </div>

        <div className="p-3.5 bg-gray-950/60 border border-gray-850 rounded-2xl col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">Recaudación</div>
          <div className="text-xl font-bold text-purple-300 mt-1">
            ${kpis.totalFacturado.toLocaleString('es-CO')}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">COP en ventas</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Buscador */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por plataforma, cliente, correo o vendedor..."
              className="w-full pl-9 pr-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-600 transition-colors"
            />
          </div>

          {/* Filtro Plataforma */}
          <div>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-red-600"
            >
              <option value="">Todas las plataformas</option>
              {availablePlatforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Canal de Venta */}
          <div>
            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-red-600"
            >
              <option value="">Todos los canales</option>
              <option value="EN_LINEA">Venta en Línea (Web)</option>
              <option value="VENDEDOR">Por Vendedor / Afiliado</option>
            </select>
          </div>

          {/* Filtro Estado */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-red-600"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVA">Activa</option>
              <option value="VENCIDA">Vencida</option>
              <option value="SUSPENDIDA">Suspendida</option>
              <option value="CANCELADA">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Rango de Fechas */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-850/60 flex-wrap text-xs text-gray-400">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <span>Rango de compra:</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-red-600"
            />
            <span>hasta</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-red-600"
            />
          </div>
          {(startDate || endDate || searchTerm || platformFilter || channelFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPlatformFilter('');
                setChannelFilter('');
                setStatusFilter('');
                setStartDate('');
                setEndDate('');
              }}
              className="text-xs text-red-400 hover:text-red-300 underline ml-auto cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Cuentas Vendidas */}
      <div className="bg-gray-950/60 border border-gray-850 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-850 bg-gray-900/50 text-[11px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-3.5 px-4">Plataforma / Plan</th>
                <th className="py-3.5 px-4">Cliente</th>
                <th className="py-3.5 px-4">Canal / Vendedor</th>
                <th className="py-3.5 px-4">Fecha & Hora</th>
                <th className="py-3.5 px-4">Días Rest.</th>
                <th className="py-3.5 px-4">Valor</th>
                <th className="py-3.5 px-4">Credenciales Asignadas</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-red-500" />
                      <span>Cargando cuentas vendidas...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredSubscriptions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    No se encontraron cuentas vendidas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedSubscriptions.map((sub) => {
                  const isSuspended = sub.estado === 'SUSPENDIDA';
                  const isExpired = sub.estado === 'VENCIDA' || sub.diasRestantes <= 0;
                  const isPasswordRevealed = revealedPasswords[sub.id];

                  return (
                    <tr
                      key={sub.id}
                      className={`hover:bg-gray-900/40 transition-colors ${
                        isSuspended ? 'bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Plataforma / Plan */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-red-950/50 border border-red-900/40 flex items-center justify-center shrink-0">
                            <Tv className="w-4 h-4 text-red-400" />
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              <span>{sub.plataforma}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSendWhatsAppFullAccess(sub);
                                }}
                                className="text-emerald-400 hover:text-emerald-300 p-0.5 rounded hover:bg-emerald-950/50 transition-colors cursor-pointer"
                                data-tooltip="Enviar credenciales y términos por WhatsApp"
                                title="Enviar credenciales y términos por WhatsApp"
                              >
                                <Phone className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="text-[10px] text-gray-400">{sub.planNombre}</div>
                          </div>
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-3.5 px-4">
                        {sub.cliente ? (
                          <div>
                            <div className="font-medium text-white flex items-center gap-1.5">
                              <span>{sub.cliente.nombre}</span>
                              {sub.cliente.telefono && (
                                <a
                                  href={`https://wa.me/${sub.cliente.telefono.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  title={`Contactar por WhatsApp: ${sub.cliente.telefono}`}
                                  className="text-emerald-400 hover:text-emerald-300"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400">{sub.cliente.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-500 italic">Cliente eliminado</span>
                        )}
                      </td>

                      {/* Canal / Vendedor */}
                      <td className="py-3.5 px-4">
                        {(sub.canalVenta?.toUpperCase() === 'VENDEDOR' || sub.vendedor) && sub.vendedor ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-blue-950/60 border border-blue-900/40 text-[10px] text-blue-300 font-medium">
                            <ShoppingBag className="w-3 h-3 text-blue-400" />
                            <span>Vendedor: {sub.vendedor.nombre}</span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-900 border border-gray-800 text-[10px] text-gray-400">
                            Web Directo
                          </span>
                        )}
                      </td>

                      {/* Fecha & Hora */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-gray-200">
                          {new Date(sub.fechaInicio).toLocaleDateString('es-CO')}
                        </div>
                        <div className="text-[10px] text-gray-500">
                          {new Date(sub.fechaInicio).toLocaleTimeString('es-CO', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Días Restantes */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            isExpired
                              ? 'bg-red-950/80 text-red-400 border border-red-900/40'
                              : sub.diasRestantes <= 5
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-900/40'
                              : 'bg-emerald-950/80 text-emerald-400 border border-emerald-900/40'
                          }`}
                        >
                          {sub.diasRestantes > 0 ? `${sub.diasRestantes} días` : 'Vencida'}
                        </span>
                      </td>

                      {/* Valor */}
                      <td className="py-3.5 px-4 font-semibold text-white whitespace-nowrap">
                        ${Number(sub.precio || 0).toLocaleString('es-CO')}
                      </td>

                      {/* Credenciales */}
                      <td className="py-3.5 px-4">
                        {sub.credenciales?.email ? (
                          <div className="space-y-1 max-w-[200px]">
                            {/* Código Único de la Cuenta */}
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 font-mono text-[10px] font-bold"
                                title={`ID Cuenta Completo: ${sub.accountId || sub.credenciales?.id || sub.id}`}
                              >
                                #ACC-{(sub.accountId || sub.credenciales?.id || sub.id).substring(0, 8).toUpperCase()}
                              </span>
                              {(sub.accountId || sub.credenciales?.id) && (
                                <span className="text-[9px] text-gray-500 font-mono hidden sm:inline" title={sub.accountId || sub.credenciales?.id}>
                                  ({(sub.accountId || sub.credenciales?.id).substring(0, 13)}...)
                                </span>
                              )}
                              <button
                                onClick={() => handleCopy(sub.accountId || sub.credenciales?.id || `#ACC-${sub.id.substring(0, 8).toUpperCase()}`, `code-${sub.id}`)}
                                className="text-gray-500 hover:text-white shrink-0 p-0.5"
                                data-tooltip="Copiar ID de cuenta"
                                title="Copiar ID de cuenta"
                              >
                                {copiedId === `code-${sub.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => handleSendWhatsAppFullAccess(sub)}
                                className="text-emerald-400 hover:text-emerald-300 shrink-0 p-0.5 transition-colors"
                                data-tooltip="Enviar credenciales y normas por WhatsApp"
                                title="Enviar credenciales y normas por WhatsApp"
                              >
                                <Phone className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] text-gray-300 font-mono truncate">
                              <span className="truncate">{sub.credenciales.email}</span>
                              <button
                                onClick={() => handleCopy(sub.credenciales.email, `e-${sub.id}`)}
                                className="text-gray-500 hover:text-white shrink-0 p-0.5"
                                data-tooltip="Copiar correo"
                              >
                                {copiedId === `e-${sub.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center gap-1 text-[11px] text-gray-400 font-mono">
                              <span>
                                {isPasswordRevealed
                                  ? sub.credenciales.password
                                  : '••••••••'}
                              </span>
                              <button
                                onClick={() => toggleReveal(sub.id)}
                                className="text-gray-500 hover:text-white shrink-0 p-0.5"
                                title={isPasswordRevealed ? 'Ocultar contraseña' : 'Ver contraseña'}
                              >
                                {isPasswordRevealed ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                onClick={() => handleCopy(sub.credenciales.password, `p-${sub.id}`)}
                                className="text-gray-500 hover:text-white shrink-0 p-0.5"
                                data-tooltip="Copiar contraseña"
                              >
                                {copiedId === `p-${sub.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            {(sub.credenciales.perfil || sub.credenciales.pin) && (
                              <div className="text-[10px] text-sky-400/90 font-mono">
                                Perf: {sub.credenciales.perfil || 'N/A'} | PIN: {sub.credenciales.pin || 'Sin PIN'}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500 italic text-[11px]">Sin asignar</span>
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.estado === 'ACTIVA'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : sub.estado === 'SUSPENDIDA'
                              ? 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                              : 'bg-gray-900 text-gray-400 border border-gray-800'
                          }`}
                        >
                          {sub.estado === 'ACTIVA' && <CheckCircle2 className="w-3 h-3" />}
                          {sub.estado === 'SUSPENDIDA' && <AlertTriangle className="w-3 h-3" />}
                          {sub.estado === 'VENCIDA' && <XCircle className="w-3 h-3" />}
                          <span>{sub.estado}</span>
                        </span>
                      </td>

                      {/* Acciones - Solo recordatorios WhatsApp */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end gap-1">
                          {/* Enviar credenciales completas + normas por WhatsApp */}
                          <button
                            onClick={() => handleSendWhatsAppFullAccess(sub)}
                            data-tooltip="Enviar acceso completo y normas de uso por WhatsApp"
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-300 border border-emerald-800/80 hover:border-emerald-700 transition-colors cursor-pointer"
                          >
                            <Phone className="w-3 h-3 text-emerald-400" />
                            <span>Enviar WhatsApp</span>
                          </button>

                          {/* Copiar acceso completo + normas */}
                          <button
                            onClick={() => handleCopyFullAccess(sub)}
                            data-tooltip="Copiar credenciales + normas de uso para enviar al cliente"
                            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                              copiedId === `full-${sub.id}`
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-gray-900 text-gray-300 border border-gray-700 hover:border-sky-600 hover:text-sky-300'
                            }`}
                          >
                            {copiedId === `full-${sub.id}` ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedId === `full-${sub.id}` ? '¡Copiado!' : 'Copiar Acceso'}</span>
                          </button>

                          {/* Botones WhatsApp según estado */}
                          {sub.cliente?.telefono && (
                            <>
                              {sub.estado === 'ACTIVA' && sub.diasRestantes <= 3 && sub.diasRestantes > 0 && (
                                <button
                                  onClick={() => handleSendWhatsAppReminder(sub, 'pronto')}
                                  data-tooltip="Enviar recordatorio: vence en 3 días"
                                  disabled={sendingReminder === sub.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/50 hover:bg-amber-900/60 transition-colors cursor-pointer"
                                >
                                  <Bell className="w-3 h-3" />
                                  <span>Aviso Vencimiento</span>
                                </button>
                              )}
                              {(sub.estado === 'VENCIDA' || sub.diasRestantes <= 0) && sub.diasRestantes > -3 && (
                                <button
                                  onClick={() => handleSendWhatsAppReminder(sub, 'vencida')}
                                  data-tooltip="Enviar aviso: cuenta vencida"
                                  disabled={sendingReminder === sub.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-red-950/60 text-red-300 border border-red-800/50 hover:bg-red-900/60 transition-colors cursor-pointer"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>Aviso Vencida</span>
                                </button>
                              )}
                              {sub.diasRestantes <= -3 && (
                                <button
                                  onClick={() => handleSendWhatsAppReminder(sub, 'recuperar')}
                                  data-tooltip="Enviar mensaje de recuperación (3+ días vencida)"
                                  disabled={sendingReminder === sub.id}
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold bg-purple-950/60 text-purple-300 border border-purple-800/50 hover:bg-purple-900/60 transition-colors cursor-pointer"
                                >
                                  <Clock className="w-3 h-3" />
                                  <span>Recuperar Cliente</span>
                                </button>
                              )}
                            </>
                          )}
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
          currentPage={currentPage}
          totalItems={filteredSubscriptions.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

    </div>
  );
}
