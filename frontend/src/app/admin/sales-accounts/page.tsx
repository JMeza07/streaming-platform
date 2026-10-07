'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
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
  RotateCcw,
  DollarSign,
  X,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  FileText,
  MessageCircle,
  CheckCheck,
  Timer,
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
  const searchParams = useSearchParams();
  const tabParam = searchParams?.get('tab');
  const [activeTab, setActiveTab] = useState<'sold' | 'expiring'>('sold');

  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Alertas de vencimiento y CRM
  const [expiringData, setExpiringData] = useState<any | null>(null);
  const [loadingExpiring, setLoadingExpiring] = useState(false);
  const [expiringTimeFilter, setExpiringTimeFilter] = useState<'all' | '3d' | '7d' | '15d' | '30d' | 'expired'>('all');
  const [expiringSearch, setExpiringSearch] = useState('');
  const [expiringPlatformFilter, setExpiringPlatformFilter] = useState('');
  const [currentExpiringPage, setCurrentExpiringPage] = useState(1);

  // Filtros Cuentas Vendidas
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

  // Estado de Renovación Directa por Asesor
  const [renewingSub, setRenewingSub] = useState<any | null>(null);
  const [renewForm, setRenewForm] = useState({
    dias: 30,
    precio: '',
    metodoPago: 'EFECTIVO_TRANSFERENCIA',
    notas: '',
    comprobantePreview: '',
  });
  const [renewLoading, setRenewLoading] = useState(false);

  const formatCOP = (val: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const handleRenewReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await alert('Por favor selecciona un archivo de imagen válido (JPG, PNG, WebP).', {
        type: 'warning',
        title: 'Formato no válido',
      });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      await alert('La imagen del comprobante no debe superar los 8MB', {
        type: 'warning',
        title: 'Archivo muy grande',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setRenewForm((prev) => ({ ...prev, comprobantePreview: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const openRenewModal = (sub: any) => {
    setRenewingSub(sub);
    setRenewForm({
      dias: sub.plan?.duracionDias || sub.duracionDias || 30,
      precio: String(sub.valor || sub.precio || sub.precioRenovacion || ''),
      metodoPago: 'EFECTIVO_TRANSFERENCIA',
      notas: '',
      comprobantePreview: '',
    });
  };

  const handleDirectRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingSub) return;

    if (!renewForm.comprobantePreview || !renewForm.comprobantePreview.trim()) {
      await alert('Es obligatorio adjuntar el comprobante de pago para poder aprobar y procesar la renovación.', {
        type: 'warning',
        title: 'Comprobante Requerido',
      });
      return;
    }

    setRenewLoading(true);
    try {
      const res = await api.post(`/subscriptions/${renewingSub.id}/renew`, {
        dias: Number(renewForm.dias) || 30,
        precio: renewForm.precio ? Number(renewForm.precio) : Number(renewingSub.valor || renewingSub.precio || renewingSub.precioRenovacion),
        metodoPago: renewForm.metodoPago,
        notas: renewForm.notas,
        comprobanteUrl: renewForm.comprobantePreview,
      });
      await alert(res.data?.message || 'Suscripción renovada exitosamente.', {
        type: 'success',
        title: 'Renovación Exitosa',
      });
      setRenewingSub(null);
      fetchSubscriptions();
      fetchExpiringAlerts();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al renovar la suscripción', {
        type: 'error',
        title: 'Error de Renovación',
      });
    } finally {
      setRenewLoading(false);
    }
  };

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

  const fetchExpiringAlerts = async () => {
    try {
      setLoadingExpiring(true);
      const res = await api.get('/subscriptions/expiration-alerts?dias=30');
      setExpiringData(res.data);
    } catch (err: any) {
      console.error('Error al cargar alertas de vencimiento:', err);
    } finally {
      setLoadingExpiring(false);
    }
  };

  // Enviar recordatorio personalizado de vencimiento por WhatsApp
  const handleSendExpirationReminderWhatsApp = async (item: any) => {
    const phone = (item.whatsapp || item.phoneClean || '').replace(/\D/g, '');
    if (!phone) {
      await alert('El cliente no tiene un número de WhatsApp registrado para enviarle el recordatorio.', {
        type: 'warning',
        title: 'Sin WhatsApp',
      });
      return;
    }

    try {
      await api.post(`/subscriptions/${item.id}/mark-notified`);
      setExpiringData((prev: any) => {
        if (!prev) return prev;
        const updateItem = (it: any) =>
          it.id === item.id
            ? { ...it, notificadoWhatsapp: true, ultimoAvisoVencimiento: new Date().toISOString() }
            : it;
        return {
          ...prev,
          items: prev.items ? prev.items.map(updateItem) : [],
          vencenHoy: prev.vencenHoy ? prev.vencenHoy.map(updateItem) : [],
          vencen1Dia: prev.vencen1Dia ? prev.vencen1Dia.map(updateItem) : [],
          vencen3Dias: prev.vencen3Dias ? prev.vencen3Dias.map(updateItem) : [],
          vencen7Dias: prev.vencen7Dias ? prev.vencen7Dias.map(updateItem) : [],
          vencen15Dias: prev.vencen15Dias ? prev.vencen15Dias.map(updateItem) : [],
          vencen30Dias: prev.vencen30Dias ? prev.vencen30Dias.map(updateItem) : [],
          yaVencidas: prev.yaVencidas ? prev.yaVencidas.map(updateItem) : [],
        };
      });
    } catch (e) {
      console.error('Error registrando notificación:', e);
    }

    const url = item.waLink || `https://wa.me/${phone}?text=${encodeURIComponent(item.waMessage || '')}`;
    window.open(url, '_blank');
    setFeedbackMsg(`Recordatorio WhatsApp preparado y registrado para ${item.clienteNombre}`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  useEffect(() => {
    if (tabParam === 'expiring') {
      setActiveTab('expiring');
    }
  }, [tabParam]);

  useEffect(() => {
    fetchSubscriptions();
    fetchExpiringAlerts();
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

  // Filtrado reactivo de suscripciones por vencer
  const filteredExpiringItems = useMemo(() => {
    if (!expiringData?.items) return [];
    let list: any[] = expiringData.items;

    if (expiringTimeFilter === '3d') {
      list = list.filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 3);
    } else if (expiringTimeFilter === '7d') {
      list = list.filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 7);
    } else if (expiringTimeFilter === '15d') {
      list = list.filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 15);
    } else if (expiringTimeFilter === '30d') {
      list = list.filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 30);
    } else if (expiringTimeFilter === 'expired') {
      list = list.filter((i: any) => i.faltanDias < 0);
    }

    if (expiringSearch.trim()) {
      const q = expiringSearch.toLowerCase().trim();
      list = list.filter(
        (i: any) =>
          i.clienteNombre?.toLowerCase().includes(q) ||
          i.clienteEmail?.toLowerCase().includes(q) ||
          (i.whatsapp || '').includes(q) ||
          i.servicio?.toLowerCase().includes(q) ||
          i.plan?.toLowerCase().includes(q) ||
          i.emailCuenta?.toLowerCase().includes(q) ||
          (i.accountCode || '').toLowerCase().includes(q) ||
          (i.accountId || '').toLowerCase().includes(q)
      );
    }

    if (expiringPlatformFilter) {
      list = list.filter((i: any) => i.servicio?.toLowerCase() === expiringPlatformFilter.toLowerCase());
    }

    return list;
  }, [expiringData, expiringTimeFilter, expiringSearch, expiringPlatformFilter]);

  useEffect(() => {
    setCurrentExpiringPage(1);
  }, [expiringTimeFilter, expiringSearch, expiringPlatformFilter]);

  const paginatedExpiringItems = useMemo(() => {
    const start = (currentExpiringPage - 1) * ITEMS_PER_PAGE;
    return filteredExpiringItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredExpiringItems, currentExpiringPage]);

  // KPIs de Próximos a Vencer
  const expiringKPIs = useMemo(() => {
    const items = expiringData?.items || [];
    const en3d = items.filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 3).length;
    const en7d = items.filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 7).length;
    const en15d = items.filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 15).length;
    const total30d = items.filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 30).length;
    const yaExpiradas = items.filter((i: any) => i.faltanDias < 0).length;
    const valorTotalRenovaciones = items
      .filter((i: any) => i.faltanDias >= 0 && i.faltanDias <= 30)
      .reduce((sum: number, i: any) => sum + (Number(i.precioRenovacion) || 0), 0);
    const notificadosCount = items.filter((i: any) => i.notificadoWhatsapp).length;

    return { en3d, en7d, en15d, total30d, yaExpiradas, valorTotalRenovaciones, notificadosCount };
  }, [expiringData]);

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

      {/* Selector de Pestañas Principales */}
      <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-2 flex items-center gap-2 overflow-x-auto shadow-xl">
        <button
          onClick={() => setActiveTab('sold')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'sold'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-[#030712] border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Cuentas Vendidas ({subscriptions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('expiring')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
            activeTab === 'expiring'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/30'
              : 'bg-[#030712] border border-amber-900/40 text-amber-300 hover:text-white hover:bg-gray-800'
          }`}
        >
          <Clock className="w-4 h-4 text-amber-400" />
          <span>Próximos a Vencer</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-950 border border-amber-800 text-amber-300">
            {expiringKPIs.total30d + expiringKPIs.yaExpiradas}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: CUENTAS VENDIDAS */}
      {/* ========================================================================= */}
      {activeTab === 'sold' && (
        <div className="space-y-6">
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
                          {/* Botón de Renovación Inmediata por Asesor */}
                          <button
                            onClick={() => openRenewModal(sub)}
                            data-tooltip="Renovar suscripción y extender días de vigencia"
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-sm transition-all cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Renovar</span>
                          </button>

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
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: PRÓXIMOS A VENCER (CRM Y RECORDATORIOS WHATSAPP) */}
      {/* ========================================================================= */}
      {activeTab === 'expiring' && (
        <div className="space-y-6">
          {/* Tarjetas KPI de Vencimientos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="p-4 bg-[#0b0f19] border border-red-900/60 rounded-2xl shadow-xl">
              <div className="text-[10px] uppercase font-bold text-red-400 tracking-wider flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <span>Vencen en ≤ 3 Días</span>
              </div>
              <div className="text-2xl font-bold text-red-400 mt-1">{expiringKPIs.en3d}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Urgencia Máxima</div>
            </div>

            <div className="p-4 bg-[#0b0f19] border border-amber-900/60 rounded-2xl shadow-xl">
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                Vencen en ≤ 7 Días
              </div>
              <div className="text-2xl font-bold text-amber-400 mt-1">{expiringKPIs.en7d}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Semana en curso</div>
            </div>

            <div className="p-4 bg-[#0b0f19] border border-sky-900/60 rounded-2xl shadow-xl">
              <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
                Vencen en ≤ 15 Días
              </div>
              <div className="text-2xl font-bold text-sky-300 mt-1">{expiringKPIs.en15d}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">Próxima quincena</div>
            </div>

            <div className="p-4 bg-[#0b0f19] border border-purple-900/60 rounded-2xl shadow-xl">
              <div className="text-[10px] uppercase font-bold text-purple-400 tracking-wider">
                Total Próximos (30d)
              </div>
              <div className="text-2xl font-bold text-purple-300 mt-1">{expiringKPIs.total30d}</div>
              <div className="text-[10px] text-gray-500 mt-0.5">En el mes</div>
            </div>

            <div className="p-4 bg-[#0b0f19] border border-emerald-900/60 rounded-2xl shadow-xl">
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                Valor Total a Renovar
              </div>
              <div className="text-xl font-bold text-emerald-300 mt-1">
                {formatCOP(expiringKPIs.valorTotalRenovaciones)}
              </div>
              <div className="text-[10px] text-gray-500 mt-0.5">Ingresos potenciales</div>
            </div>
          </div>

          {/* Barra de Filtros de Vencimiento */}
          <div className="p-4 bg-[#0b0f19] border border-gray-850 rounded-2xl space-y-3 shadow-xl">
            <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-800">
              <span className="text-xs font-semibold text-gray-400 mr-1 flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5 text-amber-400" />
                <span>Rango de Urgencia:</span>
              </span>
              <button
                onClick={() => setExpiringTimeFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expiringTimeFilter === 'all'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-[#030712] border border-gray-800 text-gray-300 hover:text-white hover:bg-gray-800'
                }`}
              >
                Todos los Próximos (≤ 30d) ({expiringKPIs.total30d})
              </button>
              <button
                onClick={() => setExpiringTimeFilter('3d')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  expiringTimeFilter === '3d'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-red-950 border border-red-900 text-red-300 hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span>Críticos (≤ 3 días) ({expiringKPIs.en3d})</span>
              </button>
              <button
                onClick={() => setExpiringTimeFilter('7d')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expiringTimeFilter === '7d'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-[#030712] border border-amber-900/60 text-amber-300 hover:text-white'
                }`}
              >
                En ≤ 7 días ({expiringKPIs.en7d})
              </button>
              <button
                onClick={() => setExpiringTimeFilter('15d')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expiringTimeFilter === '15d'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-[#030712] border border-sky-900/60 text-sky-300 hover:text-white'
                }`}
              >
                En ≤ 15 días ({expiringKPIs.en15d})
              </button>
              <button
                onClick={() => setExpiringTimeFilter('expired')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  expiringTimeFilter === 'expired'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                Expiradas / Vencidas ({expiringKPIs.yaExpiradas})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="relative lg:col-span-2">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={expiringSearch}
                  onChange={(e) => setExpiringSearch(e.target.value)}
                  placeholder="Buscar por cliente, WhatsApp, plataforma, correo o #ACC..."
                  className="w-full pl-9 pr-3 py-2 bg-[#030712] border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <select
                  value={expiringPlatformFilter}
                  onChange={(e) => setExpiringPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-[#030712] border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-red-600"
                >
                  <option value="">Todas las plataformas</option>
                  {availablePlatforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={fetchExpiringAlerts}
                  disabled={loadingExpiring}
                  className="px-3.5 py-2 bg-[#030712] hover:bg-gray-850 border border-gray-800 rounded-xl text-xs text-gray-300 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingExpiring ? 'animate-spin text-red-500' : ''}`} />
                  <span>Refrescar</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-400 pt-1">
              <div>
                Mostrando <strong className="text-white">{filteredExpiringItems.length}</strong> suscripciones por vencer
              </div>
              {(expiringSearch || expiringPlatformFilter || expiringTimeFilter !== 'all') && (
                <button
                  onClick={() => {
                    setExpiringSearch('');
                    setExpiringPlatformFilter('');
                    setExpiringTimeFilter('all');
                  }}
                  className="text-xs text-red-400 hover:text-red-300 underline cursor-pointer"
                >
                  Restablecer filtros
                </button>
              )}
            </div>
          </div>

          {/* Tabla de Suscripciones Próximas a Vencer */}
          <div className="bg-[#0b0f19] border border-gray-850 rounded-2xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#030712] border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Cliente & WhatsApp</th>
                    <th className="py-2.5 px-3">Plataforma / Plan</th>
                    <th className="py-2.5 px-3">ID Cuenta & Perfil</th>
                    <th className="py-2.5 px-3">Fecha Vencimiento</th>
                    <th className="py-2.5 px-3">Precio Renovación</th>
                    <th className="py-2.5 px-3">Estado Aviso</th>
                    <th className="py-2.5 px-3 text-right">Acción WhatsApp CRM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850">
                  {loadingExpiring ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                          <span>Calculando suscripciones próximas a vencer...</span>
                        </div>
                      </td>
                    </tr>
                  ) : paginatedExpiringItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-gray-500">
                        No hay suscripciones por vencer en este rango de tiempo.
                      </td>
                    </tr>
                  ) : (
                    paginatedExpiringItems.map((item) => {
                      const formattedDate = new Date(item.fechaVencimiento).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      });

                      const isExpired = item.faltanDias < 0;

                      return (
                        <tr key={item.id} className="hover:bg-[#030712] transition-colors">
                          {/* Cliente */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-lg bg-red-950/70 border border-red-800/50 flex items-center justify-center text-red-400 font-bold text-xs shrink-0">
                                {item.clienteNombre?.substring(0, 2).toUpperCase() || 'CL'}
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold text-white text-xs truncate max-w-[160px]">
                                  {item.clienteNombre}
                                </div>
                                <div className="text-[10px] text-gray-400 truncate max-w-[160px]">
                                  {item.clienteEmail}
                                </div>
                                {item.phoneClean && (
                                  <a
                                    href={`https://wa.me/${item.phoneClean}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-medium"
                                  >
                                    <MessageCircle className="w-3 h-3" />
                                    <span>{item.whatsapp}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Plataforma / Plan */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {item.servicioLogo ? (
                                <img
                                  src={item.servicioLogo}
                                  alt={item.servicio}
                                  className="w-7 h-7 object-contain rounded bg-black p-0.5 border border-gray-800 shrink-0"
                                />
                              ) : (
                                <div className="w-7 h-7 rounded bg-red-950 flex items-center justify-center font-bold text-red-400 text-[10px] shrink-0">
                                  {item.servicio?.substring(0, 2)}
                                </div>
                              )}
                              <div>
                                <span className="font-bold text-white text-xs block leading-tight">
                                  {item.servicio}
                                </span>
                                <span className="text-[10px] text-red-400 font-medium">
                                  {item.plan}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* ID Cuenta & Perfil */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="space-y-0.5">
                              {item.accountCode && (
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-purple-300 font-bold bg-purple-950 border border-purple-800 px-1.5 py-0.2 rounded text-[10px]">
                                    {item.accountCode}
                                  </span>
                                  <button
                                    onClick={() => handleCopy(item.accountCode, `${item.id}-acc`)}
                                    className="text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                                    title="Copiar ID Cuenta"
                                  >
                                    {copiedId === `${item.id}-acc` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}
                              <div className="text-[11px] text-gray-300">
                                Perfil: <strong className="text-white">{item.perfilAsignado}</strong>
                                {item.pinPerfil && <span className="text-gray-400"> (PIN: {item.pinPerfil})</span>}
                              </div>
                              <div className="text-[10px] text-gray-500 truncate max-w-[150px]">
                                {item.emailCuenta}
                              </div>
                            </div>
                          </td>

                          {/* Vencimiento & Cuenta Regresiva */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-white flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                <span>{formattedDate}</span>
                              </div>
                              <div>
                                {isExpired ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-950 text-red-400 border border-red-800 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span>Expiró hace {Math.abs(item.faltanDias)}d</span>
                                  </span>
                                ) : item.faltanDias === 0 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-950 text-red-400 border border-red-800 animate-pulse shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span>¡VENCE HOY!</span>
                                  </span>
                                ) : item.faltanDias === 1 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-950 text-amber-400 border border-amber-800 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                    <span>Vence Mañana (1d)</span>
                                  </span>
                                ) : item.faltanDias <= 3 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-red-950 text-red-400 border border-red-800 shadow-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                    <span>Vence en {item.faltanDias} días</span>
                                  </span>
                                ) : item.faltanDias <= 7 ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                    <span>Vence en {item.faltanDias} días</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-950 text-sky-300 border border-sky-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                    <span>Vence en {item.faltanDias} días</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Precio Renovación */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            <span className="text-sm font-black text-white">
                              {formatCOP(item.precioRenovacion)}
                            </span>
                          </td>

                          {/* Estado Aviso */}
                          <td className="py-3 px-3 whitespace-nowrap">
                            {item.notificadoWhatsapp ? (
                              <div className="space-y-0.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                  <CheckCheck className="w-3 h-3 text-emerald-400" />
                                  <span>Recordatorio Enviado</span>
                                </span>
                                {item.ultimoAvisoVencimiento && (
                                  <div className="text-[9px] text-gray-500">
                                    {new Date(item.ultimoAvisoVencimiento).toLocaleDateString('es-CO')}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-900 text-gray-400 border border-gray-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-600" />
                                <span>Pendiente</span>
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Principal: Enviar Recordatorio WhatsApp */}
                              <button
                                onClick={() => handleSendExpirationReminderWhatsApp(item)}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all ${
                                  item.notificadoWhatsapp
                                    ? 'bg-emerald-950 border border-emerald-800 text-emerald-300 hover:bg-emerald-900'
                                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-950'
                                }`}
                              >
                                <Send className="w-3 h-3" />
                                <span>{item.notificadoWhatsapp ? 'Reenviar WhatsApp' : 'Enviar Recordatorio'}</span>
                              </button>

                              {/* Botón Renovar Directo */}
                              <button
                                onClick={() =>
                                  openRenewModal({
                                    id: item.id,
                                    plataforma: item.servicio,
                                    planNombre: item.plan,
                                    fechaVencimiento: item.fechaVencimiento,
                                    valor: item.precioRenovacion,
                                    cliente: { nombre: item.clienteNombre },
                                  })
                                }
                                data-tooltip="Renovar suscripción inmediatamente"
                                className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-md shadow-purple-950/40 flex items-center gap-1 cursor-pointer transition-all"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Renovar</span>
                              </button>

                              {/* Botón Enviar Normas y Accesos */}
                              <button
                                onClick={() =>
                                  handleSendWhatsAppFullAccess({
                                    id: item.id,
                                    plataforma: item.servicio,
                                    planNombre: item.plan,
                                    accountId: item.accountId,
                                    fechaFin: item.fechaVencimiento,
                                    cliente: { nombre: item.clienteNombre, telefono: item.whatsapp },
                                    credenciales: {
                                      id: item.accountId,
                                      email: item.emailCuenta,
                                      password: item.passwordCuenta,
                                      perfil: item.perfilAsignado,
                                      pin: item.pinPerfil,
                                    },
                                  })
                                }
                                data-tooltip="Enviar accesos y normas de uso por WhatsApp"
                                className="p-1.5 bg-[#030712] hover:bg-gray-850 border border-gray-800 text-gray-400 hover:text-white rounded-lg cursor-pointer transition-colors"
                              >
                                <FileText className="w-3.5 h-3.5 text-purple-400" />
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
              currentPage={currentExpiringPage}
              totalItems={filteredExpiringItems.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentExpiringPage}
            />
          </div>
        </div>
      )}

      {/* MODAL: RENOVAR SUSCRIPCIÓN DIRECTA */}
      {renewingSub && (
        <div className="fixed inset-0 z-[10010] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-purple-900/50 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 bg-gray-950/95">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Renovar Suscripción</h3>
                  <span className="text-[10px] text-purple-300 font-medium">Extender vigencia y registrar pago</span>
                </div>
              </div>
              <button onClick={() => setRenewingSub(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectRenew} className="p-6 space-y-4 text-xs">
              <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-white font-bold">
                  <span>{renewingSub.plataforma}</span>
                  <span className="text-emerald-400">{renewingSub.planNombre}</span>
                </div>
                <div className="text-[11px] text-gray-400 flex items-center justify-between">
                  <span>Cliente: <strong className="text-gray-200">{renewingSub.cliente?.nombre || 'Cliente'}</strong></span>
                  <span>Vence: <strong className="text-amber-400">{new Date(renewingSub.fechaVencimiento).toLocaleDateString('es-CO')}</strong></span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Días a Extender *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={renewForm.dias}
                    onChange={(e) => setRenewForm({ ...renewForm, dias: Number(e.target.value) || 30 })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Valor Cobrado (COP) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={renewForm.precio}
                    onChange={(e) => setRenewForm({ ...renewForm, precio: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Método de Pago</label>
                <select
                  value={renewForm.metodoPago}
                  onChange={(e) => setRenewForm({ ...renewForm, metodoPago: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                >
                  <option value="EFECTIVO_TRANSFERENCIA">Efectivo / Transferencia Bancaria</option>
                  <option value="NEQUI">Nequi</option>
                  <option value="BANCOLOMBIA">Bancolombia</option>
                  <option value="DAVIPLATA">Daviplata</option>
                  <option value="SALDO_BILLETERA">Saldo Billetera</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Notas Internas</label>
                <input
                  type="text"
                  value={renewForm.notas}
                  onChange={(e) => setRenewForm({ ...renewForm, notas: e.target.value })}
                  placeholder="Ej. Renovación pagada en sucursal"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Comprobante de Pago (OBLIGATORIO) */}
              <div className="p-3 bg-purple-950/20 border border-purple-800/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-white font-bold flex items-center gap-1.5 text-xs">
                    <Upload className="w-3.5 h-3.5 text-purple-400" />
                    <span>Comprobante de Pago *</span>
                  </label>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-950/80 border border-red-800 text-red-300 font-bold">
                    Requerido para aprobar
                  </span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Adjunte la captura o recibo de transferencia del cliente para auditar y autorizar la renovación.
                </p>

                <input
                  type="file"
                  accept="image/*"
                  id="direct-renew-receipt"
                  onChange={handleRenewReceiptChange}
                  className="hidden"
                />

                {renewForm.comprobantePreview ? (
                  <div className="space-y-2">
                    <div className="relative w-full max-h-36 rounded-lg overflow-hidden border border-purple-700 bg-black/60 flex items-center justify-center p-1.5">
                      <img
                        src={renewForm.comprobantePreview}
                        alt="Comprobante de renovación"
                        className="max-h-32 object-contain rounded"
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Comprobante cargado</span>
                      </span>
                      <label
                        htmlFor="direct-renew-receipt"
                        className="text-purple-300 hover:text-purple-200 underline cursor-pointer"
                      >
                        Cambiar imagen
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="direct-renew-receipt"
                    className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-purple-800/60 hover:border-purple-500 rounded-xl bg-gray-950/60 cursor-pointer transition-colors group text-center"
                  >
                    <ImageIcon className="w-6 h-6 text-purple-400 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="font-semibold text-white text-[11px]">
                      Haz clic para seleccionar el comprobante
                    </span>
                    <span className="text-[10px] text-gray-400">JPG, PNG o WebP (máx. 8MB)</span>
                  </label>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-850">
                <button
                  type="button"
                  onClick={() => setRenewingSub(null)}
                  className="px-4 py-2 rounded-xl text-gray-400 hover:text-white border border-gray-800 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={renewLoading || !renewForm.comprobantePreview}
                  className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-purple-950/50 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {renewLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Confirmar y Aprobar Renovación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
