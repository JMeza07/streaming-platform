'use client';

import React, { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import TablePagination from '@/components/TablePagination';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import {
  Users,
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
  Download,
  Printer,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  X,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  ShieldAlert,
  Globe,
  KeyRound,
  FileText,
  LifeBuoy,
  MessageCircle,
} from 'lucide-react';
import { useDialog } from '@/components/Dialog';
import Cookies from 'js-cookie';

// Normas de Uso y Condiciones adjuntas a cada entrega de suscripción
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

export default function CustomersManagementPage() {
  const { alert, confirm } = useDialog();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Enviar credenciales y términos de la suscripción por WhatsApp
  const handleSendSubscriptionWhatsApp = async (sub: any, cust: any) => {
    const rawPhone = cust?.whatsapp || cust?.telefono || cust?.user?.phone || '';
    const phone = rawPhone.replace(/\D/g, '');

    if (!phone) {
      await alert('El cliente no tiene un número de WhatsApp registrado para enviarle los accesos.', {
        type: 'warning',
        title: 'Sin WhatsApp',
      });
      return;
    }

    const platformName = sub.plan?.service?.nombre || sub.plataforma || 'Servicio Streaming';
    const planName = sub.plan?.nombrePlan || sub.planNombre || '';
    const accId = sub.account?.id || sub.accountId || '';
    const accCode = accId ? `#ACC-${accId.substring(0, 8).toUpperCase()}` : '';
    const email = sub.account?.emailCuenta || 'N/A';
    const password = sub.account?.passwordCuenta || 'N/A';
    const perfil = sub.account?.perfilAsignado;
    const pin = sub.account?.pinPerfil;
    const vencimiento = sub.fechaVencimiento ? new Date(sub.fechaVencimiento).toLocaleDateString('es-CO') : 'N/A';
    const clientName = cust?.user?.nombre || cust?.nombre || 'Estimado Cliente';

    const msg = [
      `Hola *${clientName}* 👋, aquí tienes los detalles de acceso y credenciales de tu suscripción:`,
      ``,
      `🎬 *${platformName}* — ${planName}`,
      accCode ? `🆔 *ID Cuenta:* ${accCode} (${accId})` : null,
      ``,
      `📧 *Correo:* ${email}`,
      `🔑 *Contraseña:* ${password}`,
      perfil ? `👤 *Perfil:* ${perfil}` : null,
      pin ? `🔒 *PIN:* ${pin}` : null,
      `📅 *Vencimiento:* ${vencimiento}`,
      ``,
      TERMS_MESSAGE,
    ].filter(Boolean).join('\n');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [hasOrdersFilter, setHasOrdersFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Notificaciones y feedback
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modales
  const [viewingCustomer, setViewingCustomer] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Formulario de edición
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    whatsapp: '',
    phone: '',
    pais: 'Colombia',
    activo: true,
    password: '',
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  // Mostrar contraseñas en modal de detalle
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  const handleCopy = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const togglePasswordReveal = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Cargar lista de clientes
  const fetchCustomers = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err: any) {
      console.error('Error al cargar clientes:', err);
      showFeedback('Error al cargar el directorio de clientes', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const userCookie = Cookies.get('user');
    if (userCookie) {
      try {
        setCurrentUser(JSON.parse(userCookie));
      } catch (e) {
        console.error(e);
      }
    }
    fetchCustomers();
  }, []);

  const isAdmin = currentUser?.rol === 'ADMIN';

  // Extraer lista única de nombres de plataformas para el selector
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    customers.forEach((c) => {
      c.plataformas?.forEach((p: any) => {
        const name = typeof p === 'string' ? p : p?.nombre;
        if (name) set.add(name);
      });
    });
    return Array.from(set);
  }, [customers]);

  // Filtrado reactivo en frontend
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const term = searchTerm.toLowerCase();
      const phoneVal = (c.telefono || c.whatsapp || '').toString();
      const matchesSearch =
        !searchTerm ||
        c.nombre?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        phoneVal.includes(term) ||
        c.pais?.toLowerCase().includes(term) ||
        c.cuentas?.some((acc: any) =>
          acc.id?.toLowerCase().includes(term) ||
          acc.codigo?.toLowerCase().includes(term) ||
          acc.emailCuenta?.toLowerCase().includes(term)
        ) ||
        c.plataformas?.some((p: any) =>
          p.accountCodes?.some((cd: string) => cd.toLowerCase().includes(term)) ||
          p.accountIds?.some((id: string) => id.toLowerCase().includes(term))
        );

      const matchesStatus =
        !statusFilter ||
        (statusFilter === 'ACTIVO' ? c.activo : !c.activo);

      const matchesPlatform =
        !platformFilter ||
        c.plataformas?.some((p: any) => {
          const name = typeof p === 'string' ? p : p?.nombre;
          return name?.toLowerCase() === platformFilter.toLowerCase();
        });

      const matchesOrders =
        !hasOrdersFilter ||
        (hasOrdersFilter === 'yes' ? c.totalOrdenes > 0 : c.totalOrdenes === 0);

      let matchesDate = true;
      if (startDate) {
        matchesDate = matchesDate && new Date(c.createdAt) >= new Date(startDate);
      }
      if (endDate) {
        const endD = new Date(endDate);
        endD.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && new Date(c.createdAt) <= endD;
      }

      return matchesSearch && matchesStatus && matchesPlatform && matchesOrders && matchesDate;
    });
  }, [customers, searchTerm, statusFilter, platformFilter, hasOrdersFilter, startDate, endDate]);

  // Paginación de 10 filas por vista
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, platformFilter, hasOrdersFilter, startDate, endDate]);

  const paginatedCustomers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  // KPIs
  const kpis = useMemo(() => {
    const total = filteredCustomers.length;
    const activos = filteredCustomers.filter((c) => c.activo).length;
    const suspendidos = filteredCustomers.filter((c) => !c.activo).length;
    const conSuscripciones = filteredCustomers.filter((c) => (c.suscripcionesActivas || 0) > 0).length;
    const totalFacturado = filteredCustomers.reduce((acc, c) => acc + (c.totalGastado || 0), 0);

    return { total, activos, suspendidos, conSuscripciones, totalFacturado };
  }, [filteredCustomers]);

  // Abrir Modal de Detalle 360°
  const openDetailModal = async (cust: any) => {
    try {
      setLoadingDetail(true);
      setViewingCustomer(null);
      const res = await api.get(`/customers/${cust.id}`);
      setViewingCustomer(res.data);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al cargar perfil 360° del cliente', { type: 'error', title: 'Error de Carga' });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Abrir Modal de Edición
  const openEditModal = (cust: any) => {
    setEditingCustomer(cust);
    setEditForm({
      nombre: cust.nombre || '',
      email: cust.email || '',
      whatsapp: cust.whatsapp || cust.telefono || '',
      phone: cust.telefono || cust.whatsapp || '',
      pais: cust.pais || 'Colombia',
      activo: cust.activo !== false,
      password: '',
    });
    setShowEditPassword(false);
  };

  // Guardar Cambios de Contacto y Estado
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    try {
      setActionLoading(true);
      const payload: any = {
        nombre: editForm.nombre,
        email: editForm.email,
        whatsapp: editForm.whatsapp,
        phone: editForm.whatsapp,
        pais: editForm.pais,
      };
      if (isAdmin) {
        payload.activo = editForm.activo;
        if (editForm.password && editForm.password.trim()) {
          payload.password = editForm.password.trim();
        }
      }
      const res = await api.patch(`/customers/${editingCustomer.id}`, payload);
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === editingCustomer.id
            ? {
                ...c,
                nombre: editForm.nombre,
                email: editForm.email,
                whatsapp: editForm.whatsapp,
                telefono: editForm.whatsapp,
                pais: editForm.pais,
                ...(isAdmin ? { activo: editForm.activo } : {}),
              }
            : c
        )
      );
      showFeedback(
        isAdmin && editForm.password && editForm.password.trim()
          ? 'Información y contraseña del cliente actualizadas correctamente'
          : 'Información del cliente actualizada correctamente'
      );
      setEditingCustomer(null);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al actualizar información del cliente', { type: 'error', title: 'Error de Actualización' });
    } finally {
      setActionLoading(false);
    }
  };

  // Alternar Estado Activo / Suspendido (Solo Administrador)
  const handleToggleStatus = async (cust: any) => {
    if (!isAdmin) {
      await alert('Solo los administradores pueden cambiar el estado de la cuenta de un cliente.', { type: 'warning', title: 'Acción no permitida' });
      return;
    }
    const actionLabel = cust.activo ? 'bloquear/suspender' : 'reactivar';
    const ok = await confirm(
      `¿Está seguro de que desea ${actionLabel} la cuenta del cliente "${cust.nombre}"?`,
      { type: cust.activo ? 'danger' : 'confirm', title: `${cust.activo ? 'Suspender' : 'Reactivar'} Cliente`, confirmText: cust.activo ? 'Sí, suspender' : 'Sí, reactivar' }
    );
    if (!ok) {
      return;
    }

    try {
      const res = await api.patch(`/customers/${cust.id}/toggle-active`);
      setCustomers((prev) =>
        prev.map((c) => (c.id === cust.id ? { ...c, activo: res.data.activo } : c))
      );
      showFeedback(res.data.message);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al modificar estado del cliente', { type: 'error', title: 'Error de Estado' });
    }
  };

  // Eliminar Cliente
  const handleDeleteCustomer = async () => {
    if (!deletingCustomer) return;

    try {
      setActionLoading(true);
      const res = await api.delete(`/customers/${deletingCustomer.id}`);
      setCustomers((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
      showFeedback(res.data.message);
      setDeletingCustomer(null);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al eliminar cliente', { type: 'error', title: 'Error al Eliminar' });
    } finally {
      setActionLoading(false);
    }
  };

  // Exportar a Excel / CSV con BOM UTF-8
  const handleExportCSV = () => {
    const columns: ColumnDef[] = [
      { key: 'id', label: 'ID Cliente' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'email', label: 'Email' },
      {
        key: 'telefono',
        label: 'Teléfono / WhatsApp',
        format: (_, r) => r.telefono || r.whatsapp || 'N/A',
      },
      { key: 'pais', label: 'País', format: (p) => p || 'Colombia' },
      {
        key: 'plataformas',
        label: 'Plataformas Adquiridas',
        format: (p) =>
          p && p.length > 0
            ? p
                .map((item: any) => (typeof item === 'string' ? item : item?.nombre))
                .filter(Boolean)
                .join(', ')
            : 'Ninguna',
      },
      {
        key: 'cuentas',
        label: 'IDs de Cuentas Adquiridas',
        format: (_, r) =>
          r.cuentas && r.cuentas.length > 0
            ? r.cuentas.map((a: any) => `${a.servicio}: ${a.codigo || a.id} (${a.id})`).join('; ')
            : 'Sin cuentas asignadas',
      },
      {
        key: 'totalGastado',
        label: 'Total Gastado (COP)',
        format: (v) => `$${Number(v || 0).toLocaleString('es-CO')}`,
      },
      { key: 'totalOrdenes', label: 'Total Órdenes Pagadas' },
      { key: 'suscripcionesActivas', label: 'Suscripciones Activas' },
      {
        key: 'createdAt',
        label: 'Fecha Registro',
        format: (d) => new Date(d).toLocaleDateString('es-CO'),
      },
      {
        key: 'activo',
        label: 'Estado de Cuenta',
        format: (a) => (a ? 'Activo' : 'SUSPENDIDO / BLOQUEADO'),
      },
    ];

    exportToCSV('directorio_clientes_completo', columns, filteredCustomers);
    showFeedback('Archivo CSV generado y descargado correctamente');
  };

  // Imprimir Reporte de Clientes
  const handlePrint = () => {
    triggerPrintReport({
      title: 'Directorio de Clientes con Información de Contacto',
      subtitle: `Filtros: ${platformFilter || 'Todas las plataformas'} | Estado: ${
        statusFilter || 'Todos'
      } | Total registros: ${filteredCustomers.length}`,
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
          label: 'Total Facturado',
          value: `$${filteredCustomers
            .reduce((sum, c) => sum + (c.totalGastado || 0), 0)
            .toLocaleString('es-CO')}`,
        },
      ],
      columns: [
        { key: 'nombre', label: 'Cliente', format: (n, r) => `${n} (${r.email})` },
        { key: 'telefono', label: 'WhatsApp / Tel', format: (_, r) => r.telefono || r.whatsapp || 'N/A' },
        { key: 'pais', label: 'País', format: (p) => p || 'Colombia' },
        {
          key: 'plataformas',
          label: 'Plataformas & IDs Cuenta',
          format: (p, r) => {
            const platList =
              p && p.length > 0
                ? p.map((item: any) => (typeof item === 'string' ? item : item?.nombre)).filter(Boolean).join(', ')
                : 'Sin compras';
            const accList =
              r.cuentas && r.cuentas.length > 0
                ? r.cuentas.map((a: any) => `${a.codigo || a.id}`).join(', ')
                : '';
            return accList ? `${platList} [${accList}]` : platList;
          },
        },
        {
          key: 'totalGastado',
          label: 'Total Gastado',
          format: (v) => `$${Number(v || 0).toLocaleString('es-CO')}`,
        },
        { key: 'totalOrdenes', label: 'Órdenes' },
        {
          key: 'createdAt',
          label: 'Fecha Registro',
          format: (d) => new Date(d).toLocaleDateString('es-CO'),
        },
        { key: 'activo', label: 'Estado', format: (a) => (a ? 'Activo' : 'SUSPENDIDO') },
      ],
      rows: filteredCustomers,
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setPlatformFilter('');
    setStatusFilter('');
    setHasOrdersFilter('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-red-500" />
            <span>Directorio de Clientes & CRM</span>
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Gestión integral de clientes, contactos de WhatsApp, historial de compras, control de acceso y eliminación segura.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative group/tooltip inline-flex items-center">
            <button
              onClick={fetchCustomers}
              disabled={refreshing}
              className="p-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-500' : ''}`} />
            </button>
            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex flex-col items-end">
              <div className="bg-gray-900 border border-gray-700 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-2xl whitespace-nowrap">
                Actualizar datos
              </div>
              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700 mr-3 -mt-[1px]"></div>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-200 rounded-xl cursor-pointer shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-900/30 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Alerta de Feedback */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-medium animate-fadeIn ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800/80 text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Tarjetas KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            Total Clientes
          </div>
          <div className="text-2xl font-bold text-white mt-1">{kpis.total}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">En base de datos</div>
        </div>

        <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
            Clientes Activos
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{kpis.activos}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Acceso habilitado</div>
        </div>

        <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider">
            Suspendidos / Bloqueados
          </div>
          <div className="text-2xl font-bold text-rose-400 mt-1">{kpis.suspendidos}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Acceso revocado</div>
        </div>

        <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-sky-400 tracking-wider">
            Con Suscripción Activa
          </div>
          <div className="text-2xl font-bold text-sky-300 mt-1">{kpis.conSuscripciones}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Cuentas vigentes</div>
        </div>

        <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
            Total Facturado
          </div>
          <div className="text-xl font-bold text-amber-300 mt-1">
            ${kpis.totalFacturado.toLocaleString('es-CO')}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">En órdenes pagadas</div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Buscador */}
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, correo, WhatsApp o país..."
              className="w-full pl-9 pr-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
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

          {/* Filtro Estado */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-red-600"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVO">Activos</option>
              <option value="SUSPENDIDO">Suspendidos / Bloqueados</option>
            </select>
          </div>

          {/* Filtro Compras */}
          <div>
            <select
              value={hasOrdersFilter}
              onChange={(e) => setHasOrdersFilter(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900/80 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-red-600"
            >
              <option value="">Historial compras</option>
              <option value="yes">Con compras realizadas</option>
              <option value="no">Sin compras aún</option>
            </select>
          </div>

          {/* Botón limpiar */}
          <div className="flex items-center">
            <button
              onClick={clearFilters}
              className="w-full py-2 px-3 bg-gray-900 hover:bg-gray-850 text-gray-400 hover:text-white border border-gray-800 rounded-xl text-xs font-medium cursor-pointer transition-colors"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Fila secundaria de fechas */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-900 text-xs text-gray-400">
          <span className="flex items-center gap-1.5 text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            <span>Fecha de Registro:</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-red-600"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1 bg-gray-900 border border-gray-800 rounded-lg text-xs text-gray-300 focus:outline-none focus:border-red-600"
            />
          </div>
          {(startDate || endDate || searchTerm || platformFilter || statusFilter || hasOrdersFilter) && (
            <span className="text-[11px] text-red-400 ml-auto">
              Mostrando {filteredCustomers.length} de {customers.length} clientes
            </span>
          )}
        </div>
      </div>

      {/* Tabla de Clientes - Sin barra de desplazamiento horizontal y con tooltips superiores */}
      <div className="bg-gray-950/70 border border-gray-850 rounded-2xl shadow-xl overflow-visible">
        <div className="w-full overflow-visible">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-gray-850 bg-gray-900/60 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                <th className="py-2.5 px-3 rounded-tl-2xl">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold">
                    <KeyRound className="w-3 h-3 text-amber-400" />
                    <span>WhatsApp (Clave Principal)</span>
                  </div>
                </th>
                <th className="py-2.5 px-3">Cliente</th>
                <th className="py-2.5 px-2">Billetera</th>
                <th className="py-2.5 px-2 text-center">Strikes</th>
                <th className="py-2.5 px-2">Ubicación</th>
                <th className="py-2.5 px-2">Plataformas</th>
                <th className="py-2.5 px-2">Gasto Total</th>
                <th className="py-2.5 px-2">Suscripciones</th>
                <th className="py-2.5 px-2">Registro</th>
                <th className="py-2.5 px-2">Estado</th>
                <th className="py-2.5 px-3 text-right rounded-tr-2xl">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-855/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto" />
                    <span className="block mt-2">Cargando directorio de clientes...</span>
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-500">
                    No se encontraron clientes con los filtros especificados.
                  </td>
                </tr>
              ) : (
                paginatedCustomers.map((cust) => {
                  const phoneNum = (cust.telefono || cust.whatsapp || '').toString();
                  const cleanPhone = phoneNum.replace(/\D/g, '');

                  return (
                    <tr
                      key={cust.id}
                      className={`hover:bg-gray-800/40 transition group cursor-pointer ${
                        !cust.activo ? 'bg-rose-950/15' : ''
                      }`}
                      onClick={() => openDetailModal(cust)}
                    >
                      {/* WhatsApp / Teléfono (Clave Principal) */}
                      <td className="py-2 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            PK
                          </span>
                          {phoneNum ? (
                            <div className="flex items-center gap-1">
                              <a
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-800/50 text-emerald-300 font-mono font-bold text-xs transition-colors"
                              >
                                <Phone className="w-3 h-3 text-emerald-400" />
                                <span>{phoneNum}</span>
                                <ExternalLink className="w-2.5 h-2.5 text-emerald-400/70 ml-0.5" />
                              </a>
                              <div className="relative group/tooltip inline-flex items-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(phoneNum, `ph-${cust.id}`);
                                  }}
                                  className="text-gray-500 hover:text-white p-1 cursor-pointer transition-colors"
                                >
                                  {copiedId === `ph-${cust.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex flex-col items-center">
                                  <div className="bg-gray-900 border border-gray-700 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-2xl whitespace-nowrap">
                                    Copiar clave/teléfono
                                  </div>
                                  <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700 -mt-[1px]"></div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-500 italic text-[11px]">Sin teléfono</span>
                          )}
                        </div>
                      </td>

                      {/* Cliente */}
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-red-950/60 border border-red-800/40 flex items-center justify-center font-bold text-red-400 text-[11px] shrink-0">
                            {cust.nombre ? cust.nombre.substring(0, 2).toUpperCase() : 'CL'}
                          </div>
                          <div className="min-w-0 max-w-[130px] xl:max-w-[180px]">
                            <div className="font-semibold text-white text-xs truncate">
                              {cust.nombre}
                            </div>
                            <div className="text-[10px] text-gray-400 truncate flex items-center gap-1">
                              <Mail className="w-2.5 h-2.5 text-gray-500 shrink-0" />
                              <span className="truncate">{cust.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Billetera / Saldo a Favor (Escenario 1) */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 font-semibold text-xs ${
                          Number(cust.walletBalance || 0) > 0 ? 'text-emerald-400 font-bold' : 'text-gray-400'
                        }`}>
                          <DollarSign className="w-3 h-3 text-emerald-500" />
                          <span>${Number(cust.walletBalance || 0).toLocaleString('es-CO')}</span>
                        </span>
                      </td>

                      {/* Infracciones / Strikes (Escenario 3) */}
                      <td className="py-2 px-2 whitespace-nowrap text-center">
                        {Number(cust.strikes || 0) >= 3 || cust.estadoUsuario === 'SUSPENDIDO' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            3/3 SUSPENDIDO
                          </span>
                        ) : Number(cust.strikes || 0) > 0 ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            ⚠️ {cust.strikes}/3 Strikes
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">0/3</span>
                        )}
                      </td>

                      {/* Ubicación */}
                      <td className="py-2 px-2 whitespace-nowrap text-gray-300">
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <Globe className="w-3 h-3 text-gray-500 shrink-0" />
                          <span>{cust.pais || 'Colombia'}</span>
                        </span>
                      </td>

                      {/* Plataformas */}
                      <td className="py-2 px-2">
                        <div className="flex flex-wrap gap-1 max-w-[140px] xl:max-w-[170px]">
                          {cust.plataformas && cust.plataformas.length > 0 ? (
                            cust.plataformas.map((plat: any, idx: number) => {
                              const platName = typeof plat === 'string' ? plat : plat?.nombre || 'Plataforma';
                              return (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-950/40 border border-red-900/40 text-red-300 text-[9px] rounded font-medium shrink-0"
                                >
                                  <Tv className="w-2.5 h-2.5" />
                                  <span>{platName}</span>
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-gray-500 text-[10px] italic">
                              Sin compras
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Gasto Total & Compras */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <div className="font-semibold text-white text-xs">
                          ${Number(cust.totalGastado || 0).toLocaleString('es-CO')}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {cust.totalOrdenes || 0} {cust.totalOrdenes === 1 ? 'orden' : 'órdenes'}
                        </div>
                      </td>

                      {/* Suscripciones */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        {cust.suscripcionesActivas > 0 ? (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/50 border border-emerald-800/50 text-emerald-300 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>{cust.suscripcionesActivas} activa(s)</span>
                          </span>
                        ) : cust.totalSuscripciones > 0 ? (
                          <span className="text-[10px] text-gray-400">
                            {cust.totalSuscripciones} históricas
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[10px] italic">Ninguna</span>
                        )}
                      </td>

                      {/* Registro */}
                      <td className="py-2 px-2 text-gray-400 whitespace-nowrap text-[11px]">
                        {new Date(cust.createdAt).toLocaleDateString('es-CO')}
                      </td>

                      {/* Estado */}
                      <td className="py-2 px-2 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cust.activo
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                              : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                          }`}
                        >
                          {cust.activo ? (
                            <>
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              <span>Activo</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-2.5 h-2.5" />
                              <span>SUSPENDIDO</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Acciones con Tooltips Superiores y Alineados al Marco */}
                      <td className="py-2 px-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          {/* 1. Ver Detalle 360° */}
                          <div className="relative group/tooltip inline-flex items-center">
                            <button
                              onClick={() => openDetailModal(cust)}
                              className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-sky-400 hover:text-sky-300 rounded-lg cursor-pointer transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex flex-col items-end">
                              <div className="bg-gray-900 border border-gray-700 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-2xl whitespace-nowrap">
                                Ver Perfil 360°
                              </div>
                              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700 mr-[9px] -mt-[1px]"></div>
                            </div>
                          </div>

                          {/* 2. Editar Contacto y Estado */}
                          <div className="relative group/tooltip inline-flex items-center">
                            <button
                              onClick={() => openEditModal(cust)}
                              className="p-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-amber-400 hover:text-amber-300 rounded-lg cursor-pointer transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex flex-col items-end">
                              <div className="bg-gray-900 border border-gray-700 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-2xl whitespace-nowrap">
                                Editar Información y Estado
                              </div>
                              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700 mr-[9px] -mt-[1px]"></div>
                            </div>
                          </div>

                          {/* 3. Bloquear / Reactivar - Solo Administrador */}
                          {isAdmin && (
                            <div className="relative group/tooltip inline-flex items-center">
                              <button
                                onClick={() => handleToggleStatus(cust)}
                                className={`p-1.5 border rounded-lg cursor-pointer transition-colors ${
                                  cust.activo
                                    ? 'bg-gray-900 hover:bg-rose-950/40 border-gray-800 text-gray-400 hover:text-rose-400'
                                    : 'bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-800/40 text-emerald-300'
                                }`}
                              >
                                {cust.activo ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex flex-col items-end">
                                <div className="bg-gray-900 border border-gray-700 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-2xl whitespace-nowrap">
                                  {cust.activo ? 'Suspender / Bloquear Cliente' : 'Reactivar Acceso'}
                                </div>
                                <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-gray-700 mr-[9px] -mt-[1px]"></div>
                              </div>
                            </div>
                          )}

                          {/* 4. Eliminar Cliente (Alineado al marco de la ventana) */}
                          <div className="relative group/tooltip inline-flex items-center">
                            <button
                              onClick={() => setDeletingCustomer(cust)}
                              className="p-1.5 bg-gray-900 hover:bg-rose-950/60 border border-gray-800 hover:border-rose-900/50 text-gray-400 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute bottom-full right-0 mb-2 opacity-0 group-hover/tooltip:opacity-100 transition-opacity duration-150 pointer-events-none z-50 flex flex-col items-end">
                              <div className="bg-gray-900 border border-rose-900/60 text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg shadow-2xl whitespace-nowrap">
                                Eliminar Permanentemente
                              </div>
                              <div className="w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-rose-900 mr-[9px] -mt-[1px]"></div>
                            </div>
                          </div>
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
          totalItems={filteredCustomers.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* ================= MODAL PERFIL 360° ================= */}
      {viewingCustomer && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-gray-850 p-5 shrink-0 bg-gray-950/95">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-red-950/60 border border-red-800/50 flex items-center justify-center font-bold text-red-400 text-lg">
                  {viewingCustomer.user?.nombre?.substring(0, 2).toUpperCase() || 'CL'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white leading-tight">
                      {viewingCustomer.user?.nombre}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        viewingCustomer.user?.activo
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                          : 'bg-rose-950/80 text-rose-400 border border-rose-800/60'
                      }`}
                    >
                      {viewingCustomer.user?.activo ? 'Activo' : 'SUSPENDIDO'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{viewingCustomer.user?.email}</p>
                </div>
              </div>

              <button
                onClick={() => setViewingCustomer(null)}
                className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Central Scrollable */}
            <div className="p-6 space-y-6 flex-1 overflow-y-auto">
              {/* Tarjetas Resumen de Perfil */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-gray-400">Teléfono / WhatsApp</span>
                <div className="text-sm font-semibold text-emerald-400 mt-1 flex items-center justify-between">
                  <span>{viewingCustomer.whatsapp || viewingCustomer.user?.phone || 'Sin número'}</span>
                  {(viewingCustomer.whatsapp || viewingCustomer.user?.phone) && (
                    <a
                      href={`https://wa.me/${(viewingCustomer.whatsapp || viewingCustomer.user?.phone).replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-400 hover:text-emerald-300"
                      data-tooltip="Abrir WhatsApp"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-gray-400">Billetera / Saldo</span>
                <div className="text-sm font-black text-emerald-400 mt-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                  <span>${Number(viewingCustomer.walletBalance || 0).toLocaleString('es-CO')}</span>
                </div>
              </div>

              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-gray-400">Infracciones (Strikes)</span>
                <div className="text-sm font-black mt-1">
                  {Number(viewingCustomer.strikes || 0) >= 3 || viewingCustomer.estadoUsuario === 'SUSPENDIDO' ? (
                    <span className="text-rose-400">3/3 SUSPENDIDO</span>
                  ) : Number(viewingCustomer.strikes || 0) > 0 ? (
                    <span className="text-amber-400">⚠️ {viewingCustomer.strikes}/3 Strikes</span>
                  ) : (
                    <span className="text-emerald-400">0/3 Impecable</span>
                  )}
                </div>
              </div>

              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-gray-400">Total Gastado</span>
                <div className="text-sm font-semibold text-white mt-1">
                  ${Number(viewingCustomer.totalGastado || 0).toLocaleString('es-CO')}
                </div>
              </div>

              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-gray-400">Suscripciones</span>
                <div className="text-sm font-semibold text-sky-400 mt-1">
                  {viewingCustomer.subscriptions?.length || 0} registradas
                </div>
              </div>

              <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-gray-400">Fecha Registro</span>
                <div className="text-sm font-semibold text-gray-300 mt-1">
                  {new Date(viewingCustomer.createdAt).toLocaleDateString('es-CO')}
                </div>
              </div>
            </div>

            {/* Sección: Suscripciones y Credenciales */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Tv className="w-4 h-4 text-red-500" />
                <span>Suscripciones y Credenciales Entregadas ({viewingCustomer.subscriptions?.length || 0})</span>
              </h4>

              {viewingCustomer.subscriptions?.length === 0 ? (
                <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-xl text-xs text-gray-500 text-center">
                  El cliente aún no tiene suscripciones asignadas.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {viewingCustomer.subscriptions.map((sub: any) => {
                    const isPwdShown = revealedPasswords[sub.id];
                    return (
                      <div
                        key={sub.id}
                        className="p-4 bg-gray-900/50 border border-gray-800 rounded-xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {sub.plan?.service?.logoUrl ? (
                              <img
                                src={sub.plan.service.logoUrl}
                                alt=""
                                className="w-6 h-6 object-contain rounded shrink-0 bg-black/40 p-0.5"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded bg-red-950 flex items-center justify-center font-bold text-red-400 text-xs">
                                <Tv className="w-3 h-3" />
                              </div>
                            )}
                            <div>
                              <div className="text-xs font-bold text-white">
                                {sub.plan?.service?.nombre} - {sub.plan?.nombrePlan}
                              </div>
                              <div className="text-[10px] text-gray-400">
                                Vence: {new Date(sub.fechaVencimiento).toLocaleDateString('es-CO')}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleSendSubscriptionWhatsApp(sub, viewingCustomer)}
                              className="p-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900/90 text-emerald-400 border border-emerald-800/80 transition-colors cursor-pointer"
                              data-tooltip="Enviar accesos y términos por WhatsApp"
                              title="Enviar accesos y términos por WhatsApp"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                sub.estado === 'ACTIVA'
                                  ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40'
                                  : sub.estado === 'EN_GARANTIA'
                                  ? 'bg-amber-950/60 text-amber-400 border border-amber-800/40'
                                  : 'bg-rose-950/60 text-rose-400 border border-rose-800/40'
                              }`}
                            >
                              {sub.estado}
                            </span>
                          </div>
                        </div>

                        {/* Credenciales de la cuenta */}
                        {sub.account ? (
                          <div className="p-2.5 bg-black/40 border border-gray-800/80 rounded-lg text-[11px] font-mono space-y-1.5">
                            {/* ID Único de la Cuenta Comprada */}
                            <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-gray-800/80">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400 uppercase font-sans font-bold">ID Cuenta:</span>
                                <span className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 font-mono text-[10px] font-bold">
                                  #ACC-{(sub.account.id || sub.accountId || '').substring(0, 8).toUpperCase()}
                                </span>
                                <span className="text-[9px] text-gray-500 font-mono hidden sm:inline" title={sub.account.id || sub.accountId}>
                                  ({sub.account.id || sub.accountId})
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopy(sub.account.id || sub.accountId, `modal-acc-${sub.id}`)}
                                className="text-gray-500 hover:text-white p-0.5 cursor-pointer"
                                data-tooltip="Copiar ID de la cuenta"
                                title="Copiar ID de la cuenta"
                              >
                                {copiedId === `modal-acc-${sub.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>

                            <div className="flex items-center justify-between text-gray-300">
                              <span className="truncate">{sub.account.emailCuenta}</span>
                              <button
                                onClick={() => handleCopy(sub.account.emailCuenta, `m-${sub.id}`)}
                                className="text-gray-500 hover:text-white p-0.5"
                                data-tooltip="Copiar correo"
                              >
                                {copiedId === `m-${sub.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-gray-400">
                              <span>{isPwdShown ? sub.account.passwordCuenta : '••••••••'}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => togglePasswordReveal(sub.id)}
                                  className="text-gray-500 hover:text-white p-0.5"
                                  title={isPwdShown ? 'Ocultar clave' : 'Ver clave'}
                                >
                                  {isPwdShown ? (
                                    <EyeOff className="w-3 h-3" />
                                  ) : (
                                    <Eye className="w-3 h-3" />
                                  )}
                                </button>
                                <button
                                  onClick={() =>
                                    handleCopy(sub.account.passwordCuenta, `p-${sub.id}`)
                                  }
                                  className="text-gray-500 hover:text-white p-0.5"
                                  data-tooltip="Copiar contraseña"
                                >
                                  {copiedId === `p-${sub.id}` ? (
                                    <Check className="w-3 h-3 text-emerald-400" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                            {(sub.account.perfilAsignado || sub.account.pinPerfil) && (
                              <div className="flex items-center gap-3 text-[10px] text-gray-400 pt-1 border-t border-gray-800">
                                {sub.account.perfilAsignado && (
                                  <span>Perfil: <strong className="text-gray-200">{sub.account.perfilAsignado}</strong></span>
                                )}
                                {sub.account.pinPerfil && (
                                  <span>PIN: <strong className="text-amber-400">{sub.account.pinPerfil}</strong></span>
                                )}
                              </div>
                            )}
                            <button
                              onClick={() => handleSendSubscriptionWhatsApp(sub, viewingCustomer)}
                              className="w-full mt-2 py-1.5 px-3 bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-800/80 text-emerald-300 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Phone className="w-3 h-3 text-emerald-400" />
                              <span>Enviar Credenciales & Normas por WhatsApp</span>
                            </button>
                          </div>
                        ) : (
                          <div className="text-[10px] text-gray-500 italic">Sin cuenta vinculada</div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sección: Historial de Pedidos */}
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-500" />
                <span>Historial de Compras ({viewingCustomer.orders?.length || 0})</span>
              </h4>

              {viewingCustomer.orders?.length === 0 ? (
                <div className="p-4 bg-gray-900/40 border border-gray-800 rounded-xl text-xs text-gray-500 text-center">
                  Sin pedidos registrados.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-800">
                  <table className="w-full text-left text-xs text-gray-300">
                    <thead className="bg-gray-900/80 text-[10px] uppercase font-bold text-gray-400 border-b border-gray-800">
                      <tr>
                        <th className="py-2.5 px-3">Fecha & Hora</th>
                        <th className="py-2.5 px-3">Productos</th>
                        <th className="py-2.5 px-3">Total COP</th>
                        <th className="py-2.5 px-3">Método Pago</th>
                        <th className="py-2.5 px-3">Vendedor</th>
                        <th className="py-2.5 px-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-850">
                      {viewingCustomer.orders.map((o: any) => (
                        <tr key={o.id} className="hover:bg-gray-900/40">
                          <td className="py-2 px-3 whitespace-nowrap text-gray-400">
                            {new Date(o.createdAt).toLocaleString('es-CO')}
                          </td>
                          <td className="py-2 px-3">
                            {o.items?.map((it: any) => it.plan?.nombrePlan).join(', ') || 'Plan de streaming'}
                          </td>
                          <td className="py-2 px-3 font-semibold text-white">
                            ${Number(o.total).toLocaleString('es-CO')}
                          </td>
                          <td className="py-2 px-3 text-gray-400">{o.metodoPago || 'Nequi / Bancolombia'}</td>
                          <td className="py-2 px-3 text-gray-300">
                            {o.vendedorNombre ? (
                              <span className="text-blue-400 font-medium">Vendedor: {o.vendedorNombre}</span>
                            ) : (
                              <span className="text-gray-500">Web Directo</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.estado === 'PAGADO'
                                  ? 'bg-emerald-950/60 text-emerald-400'
                                  : 'bg-amber-950/60 text-amber-400'
                              }`}
                            >
                              {o.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            </div>

            {/* Footer Modal Fijo */}
            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-between gap-3 text-xs">
              {viewingCustomer.whatsapp || viewingCustomer.user?.phone ? (
                <a
                  href={`https://wa.me/${(viewingCustomer.whatsapp || viewingCustomer.user?.phone).replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Contactar por WhatsApp</span>
                </a>
              ) : (
                <div />
              )}
              <button
                onClick={() => setViewingCustomer(null)}
                className="px-5 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-300 rounded-xl cursor-pointer transition-colors"
              >
                Cerrar Perfil 360°
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDITAR CONTACTO ================= */}
      {editingCustomer && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-850 p-5 shrink-0 bg-gray-950/95">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-white">Editar Información del Cliente</h3>
              </div>
              <button
                onClick={() => setEditingCustomer(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 mb-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  <span>WhatsApp / Celular (Clave Principal) *</span>
                </label>
                <input
                  type="text"
                  required
                  value={editForm.whatsapp}
                  onChange={(e) => setEditForm({ ...editForm, whatsapp: e.target.value })}
                  placeholder="Ej: 573042141522"
                  className="w-full px-3 py-2 bg-gray-900 border border-emerald-900/60 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono font-bold"
                />
                <p className="text-[10px] text-gray-500 mt-0.5">Identificador único principal del cliente en toda la plataforma.</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  Correo Electrónico (Opcional)
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="ejemplo@correo.com (opcional)"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">
                  País
                </label>
                <input
                  type="text"
                  value={editForm.pais}
                  onChange={(e) => setEditForm({ ...editForm, pais: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                />
              </div>

              {/* Solo Administrador puede ver y cambiar contraseña y estado de la cuenta */}
              {isAdmin && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Nueva Contraseña de Acceso (Opcional)
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editForm.password}
                        onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        placeholder="Dejar en blanco para conservar la actual"
                        className="w-full px-3 py-2 pr-10 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 placeholder-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-0.5 cursor-pointer"
                      >
                        {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Permite cambiarle la contraseña al cliente para evitar que pierda su cuenta o restaurar su acceso si la olvidó.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-300 mb-1">
                      Estado de la Cuenta
                    </label>
                    <select
                      value={editForm.activo ? 'ACTIVO' : 'SUSPENDIDO'}
                      onChange={(e) => setEditForm({ ...editForm, activo: e.target.value === 'ACTIVO' })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white focus:outline-none focus:border-red-600"
                    >
                      <option value="ACTIVO">✅ Activo (Acceso Habilitado)</option>
                      <option value="SUSPENDIDO">⛔ Suspendido / Bloqueado</option>
                    </select>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Si se suspende, el cliente no podrá acceder a la plataforma.
                    </p>
                  </div>
                </>
              )}

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-medium text-gray-300 border border-gray-800 rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-amber-900/30 cursor-pointer flex items-center gap-1.5"
                >
                  {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL ELIMINAR CLIENTE ================= */}
      {deletingCustomer && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-red-900/50 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 shrink-0 bg-gray-950/95">
              <div className="flex items-center gap-3 text-red-500">
                <div className="p-2 bg-red-950/60 rounded-xl border border-red-900/40">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">¿Eliminar Cliente Definitivamente?</h3>
                  <p className="text-xs text-gray-400">Esta acción no se puede deshacer.</p>
                </div>
              </div>
              <button
                onClick={() => setDeletingCustomer(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="p-3.5 bg-red-950/30 border border-red-900/40 rounded-xl text-xs text-red-300 space-y-1.5">
                <p>
                  Vas a eliminar a <strong className="text-white">{deletingCustomer.nombre}</strong> ({deletingCustomer.email}).
                </p>
                <p className="text-[11px] text-gray-400">
                  • Sus suscripciones se darán de baja y las cuentas ocupadas volverán a estar <strong>DISPONIBLES</strong> en el inventario.
                </p>
                <p className="text-[11px] text-gray-400">
                  • Se limpiará su usuario, historial de compras y registros asociados en el sistema.
                </p>
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setDeletingCustomer(null)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-medium text-gray-300 border border-gray-800 rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCustomer}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-red-900/40 cursor-pointer flex items-center gap-1.5"
              >
                {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Permanentemente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
