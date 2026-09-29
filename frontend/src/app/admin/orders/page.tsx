'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import TablePagination from '@/components/TablePagination';
import {
  ShoppingCart,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Send,
  Loader2,
  Copy,
  Check,
  Phone,
  User,
  ShieldCheck,
  X,
  Eye,
  ExternalLink,
  UserCheck,
  Printer,
  Download,
  PlusCircle,
  Sparkles,
  Wallet,
  Tv,
  Film,
  Upload,
  Image as ImageIcon,
  ZoomIn,
  Lock,
  FileCheck,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
  RotateCcw,
  Ban,
  CheckSquare,
  Square,
} from 'lucide-react';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import { useDialog } from '@/components/Dialog';

export default function OrdersPage() {
  const { alert } = useDialog();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [deliveredModalData, setDeliveredModalData] = useState<any | null>(null);
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Control de Verificación Obligatoria de Comprobante de Pago antes de Aprobar
  const [unverifiedWarningOrder, setUnverifiedWarningOrder] = useState<any | null>(null);
  const [verifiedReceiptOrders, setVerifiedReceiptOrders] = useState<{ [orderId: string]: boolean }>({});

  // Filtros adicionales: Ventas por Día, por Vendedor y Tipo (Venta vs Renovación)
  const [dateFilter, setDateFilter] = useState('');
  const [sellerFilter, setSellerFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [accountActionLoading, setAccountActionLoading] = useState<string | null>(null);

  // Estados para Cancelación de Venta y Devolución de Cuentas al Inventario
  const [cancellingOrder, setCancellingOrder] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('Solicitud de cancelación por el cliente');
  const [selectedAccountsToRestore, setSelectedAccountsToRestore] = useState<{ [accountId: string]: boolean }>({});
  const [submittingCancel, setSubmittingCancel] = useState(false);

  // Estados para Registro de Nueva Venta por Vendedor / Admin
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [salePlans, setSalePlans] = useState<any[]>([]);
  const [saleCustomers, setSaleCustomers] = useState<any[]>([]);
  const [loadingSaleData, setLoadingSaleData] = useState(false);
  const [submittingSale, setSubmittingSale] = useState(false);
  const [saleSuccessData, setSaleSuccessData] = useState<any | null>(null);
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [saleAffiliates, setSaleAffiliates] = useState<any[]>([]);
  const [affiliateSearchTerm, setAffiliateSearchTerm] = useState('');
  const [saleReceiptImage, setSaleReceiptImage] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState({
    customerId: '',
    clienteNombre: '',
    clienteEmail: '',
    clienteWhatsapp: '',
    planId: '',
    cantidad: 1,
    metodoPago: 'Nequi',
    referenciaExterna: '',
    notas: '',
    despachoInmediato: true,
    afiliadoId: '',
  });

  useEffect(() => {
    const raw = Cookies.get('user') || (typeof window !== 'undefined' ? localStorage.getItem('user') : null);
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  const canApprove = currentUser?.rol === 'ADMIN' || currentUser?.rol === 'VENDEDOR';
  const canRegisterSale = (currentUser?.rol === 'ADMIN' || currentUser?.rol === 'VENDEDOR') && currentUser?.rol !== 'ASESOR_COMERCIAL';

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await api.get('/orders', {
        params: statusFilter ? { estado: statusFilter } : {},
      });
      setOrders(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  // Abrir modal de venta (opcionalmente con plan preseleccionado)
  const openSaleModal = async (preselectedPlanId?: string) => {
    if (currentUser?.rol === 'ASESOR_COMERCIAL') {
      return;
    }
    setShowSaleModal(true);
    setLoadingSaleData(true);
    setCustomerSearchTerm('');
    setAffiliateSearchTerm('');
    setSaleReceiptImage(null);
    try {
      const [plansRes, custRes, affRes] = await Promise.all([
        api.get('/plans'),
        api.get('/customers').catch(() => ({ data: { customers: [] } })),
        api.get('/affiliates').catch(() => ({ data: [] })),
      ]);
      const plans = plansRes.data || [];
      const customers = custRes.data?.customers || custRes.data || [];
      const safeCustomers = Array.isArray(customers) ? customers : [];
      const affiliates = Array.isArray(affRes.data) ? affRes.data : [];
      setSalePlans(plans);
      setSaleCustomers(safeCustomers);
      setSaleAffiliates(affiliates);

      const targetPlan = preselectedPlanId || (plans.find((p: any) => p.stockDisponible > 0)?.id || plans[0]?.id || '');
      setSaleForm((prev) => ({
        ...prev,
        planId: targetPlan,
        customerId: safeCustomers[0]?.id || '',
        afiliadoId: '',
      }));
    } catch (err) {
      console.error('Error cargando planes/clientes/afiliados:', err);
    } finally {
      setLoadingSaleData(false);
    }
  };

  // Detectar parámetro ?action=new-sale desde URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('action') === 'new-sale') {
        openSaleModal(params.get('planId') || undefined);
      }
    }
  }, []);

  // Procesar registro de venta
  const handleSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.planId) {
      await alert('Por favor selecciona un plan para realizar la venta', { type: 'warning', title: 'Plan requerido' });
      return;
    }

    if (customerMode === 'existing' && !saleForm.customerId) {
      await alert('Por favor selecciona un cliente registrado o cambia a la pestaña Nuevo Cliente', { type: 'warning', title: 'Cliente requerido' });
      return;
    }

    if (customerMode === 'new' && (!saleForm.clienteNombre || !saleForm.clienteEmail)) {
      await alert('Por favor completa el nombre y correo del nuevo cliente', { type: 'warning', title: 'Datos incompletos' });
      return;
    }

    const isEfectivo =
      saleForm.metodoPago.toLowerCase().includes('efectivo') ||
      saleForm.metodoPago.toLowerCase().includes('cash');

    if (!isEfectivo && !saleReceiptImage) {
      await alert(`Para pagos con ${saleForm.metodoPago} es obligatorio adjuntar una imagen como soporte del pago.`, { type: 'warning', title: 'Comprobante requerido' });
      return;
    }

    try {
      setSubmittingSale(true);
      const payload: any = {
        planId: saleForm.planId,
        cantidad: Number(saleForm.cantidad) || 1,
        metodoPago: saleForm.metodoPago,
        referenciaExterna: saleForm.referenciaExterna || undefined,
        notas: saleForm.notas || undefined,
        despachoInmediato: saleForm.despachoInmediato,
        comprobanteUrl: saleReceiptImage || undefined,
        afiliadoId: saleForm.afiliadoId || undefined,
      };

      if (customerMode === 'existing') {
        payload.customerId = saleForm.customerId;
      } else {
        payload.clienteNombre = saleForm.clienteNombre;
        payload.clienteEmail = saleForm.clienteEmail;
        payload.clienteWhatsapp = saleForm.clienteWhatsapp || '+573000000000';
      }

      const res = await api.post('/orders/seller-sale', payload);
      setShowSaleModal(false);
      setSaleReceiptImage(null);
      fetchOrders();

      if (res.data.suscripciones?.length > 0) {
        setSaleSuccessData(res.data);
      } else {
        await alert(res.data.message || 'Venta registrada con éxito', { type: 'success', title: 'Venta Registrada' });
      }
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al procesar la venta', { type: 'error', title: 'Error en la Venta' });
    } finally {
      setSubmittingSale(false);
    }
  };

  const handleSaleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, WEBP).', { type: 'warning', title: 'Formato inválido' });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      await alert('El archivo supera el tamaño máximo permitido de 20MB.', { type: 'warning', title: 'Archivo demasiado grande' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setSaleReceiptImage(base64);
    };
    reader.onerror = () => {
      void alert('Error al leer el archivo de imagen.', { type: 'error', title: 'Error de Lectura' });
    };
    reader.readAsDataURL(file);
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await alert('Por favor seleccione un archivo de imagen válido (PNG, JPG, WEBP).', { type: 'warning', title: 'Formato inválido' });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      await alert('El archivo supera el tamaño máximo permitido de 20MB.', { type: 'warning', title: 'Archivo demasiado grande' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setReceiptImage(base64);
    };
    reader.onerror = () => {
      void alert('Error al leer el archivo de imagen.', { type: 'error', title: 'Error de Lectura' });
    };
    reader.readAsDataURL(file);
  };

  const handleApprove = async (orderId: string, comprobanteUrl?: string) => {
    try {
      setApprovingId(orderId);
      const res = await api.post(`/orders/${orderId}/approve`, {
        comprobanteUrl,
      });
      setDeliveredModalData(res.data);
      fetchOrders();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al aprobar y entregar la orden', { type: 'error', title: 'Error al Aprobar' });
    } finally {
      setApprovingId(null);
    }
  };

  const openCancelSaleModal = (order: any) => {
    setCancellingOrder(order);
    setCancelReason('Solicitud de cancelación por el cliente');
    // Preseleccionar todas las cuentas de inventario entregadas para devolverlas a DISPONIBLE
    const map: { [accountId: string]: boolean } = {};
    if (order.subscriptions && order.subscriptions.length > 0) {
      order.subscriptions.forEach((sub: any) => {
        const accId = sub.accountId || sub.account?.id;
        if (accId) {
          map[accId] = true;
        }
      });
    }
    setSelectedAccountsToRestore(map);
  };

  const handleExecuteCancelSale = async () => {
    if (!cancellingOrder) return;

    const accountIdsToRestore = Object.keys(selectedAccountsToRestore).filter(
      (id) => selectedAccountsToRestore[id],
    );

    try {
      setSubmittingCancel(true);
      const res = await api.post(`/orders/${cancellingOrder.id}/cancel`, {
        motivo: cancelReason.trim() || 'Cancelación de venta',
        accountIdsToRestore,
      });

      await alert(res.data.message || 'Venta cancelada exitosamente y cuentas devueltas al inventario.', { type: 'success', title: 'Venta Cancelada' });
      setCancellingOrder(null);
      if (viewingOrder?.id === cancellingOrder.id) {
        setViewingOrder(null);
      }
      fetchOrders();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al cancelar la venta', { type: 'error', title: 'Error al Cancelar' });
    } finally {
      setSubmittingCancel(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const formatCOP = (amount: any) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  // Lista de vendedores únicos disponibles para filtrar
  const availableSellers = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const name = o.vendedorNombre || o.vendedor?.nombre;
      if (name) set.add(name);
    });
    return Array.from(set).sort();
  }, [orders]);

  const filteredOrders = orders.filter((o) => {
    const customerName = o.customer?.user?.nombre?.toLowerCase() || '';
    const customerEmail = o.customer?.user?.email?.toLowerCase() || '';
    const phone = o.customer?.whatsapp || '';
    const seller = (o.vendedorNombre || o.vendedor?.nombre || '').toLowerCase();
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      customerName.includes(search) ||
      customerEmail.includes(search) ||
      phone.includes(search) ||
      seller.includes(search) ||
      o.id.includes(search);

    // Filtro por Día (Ventas por Día)
    let matchesDate = true;
    if (dateFilter) {
      const rawDate = o.createdAt || o.fecha;
      if (rawDate) {
        const oDate = new Date(rawDate);
        const [y, m, d] = dateFilter.split('-').map(Number);
        const start = new Date(y, m - 1, d, 0, 0, 0, 0);
        const end = new Date(y, m - 1, d, 23, 59, 59, 999);
        matchesDate = oDate >= start && oDate <= end;
      }
    }

    // Filtro por Vendedor
    let matchesSeller = true;
    if (sellerFilter) {
      if (sellerFilter === '__directa__') {
        matchesSeller = !o.vendedorNombre && !o.vendedor?.nombre;
      } else {
        const orderSeller = o.vendedorNombre || o.vendedor?.nombre || '';
        matchesSeller = orderSeller === sellerFilter;
      }
    }

    // Filtro por Tipo (Venta vs Renovación)
    let matchesType = true;
    const isRenewal = Boolean(o.descripcionVenta?.includes('[RENOVACIÓN]'));
    if (typeFilter === 'VENTA') {
      matchesType = !isRenewal;
    } else if (typeFilter === 'RENOVACION') {
      matchesType = isRenewal;
    }

    return matchesSearch && matchesDate && matchesSeller && matchesType;
  });

  // Paginación de 10 filas por vista
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateFilter, sellerFilter, typeFilter, statusFilter]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  const handleExportCSV = () => {
    const exportColumns: ColumnDef[] = [
      { key: 'id', label: 'ID Orden' },
      { key: 'cliente', label: 'Cliente', format: (_, r) => r.user?.nombre || r.guestName || 'Invitado' },
      { key: 'email', label: 'Email', format: (_, r) => r.user?.email || r.guestEmail || 'N/A' },
      { key: 'telefono', label: 'Teléfono', format: (_, r) => r.user?.telefono || r.guestPhone || 'N/A' },
      {
        key: 'items',
        label: 'Planes Comprados',
        format: (_, r) =>
          r.items
            ?.map((it: any) => `${it.plan?.service?.nombre} (${it.plan?.nombrePlan}) x${it.cantidad}`)
            .join(' | ') || '',
      },
      {
        key: 'vendedor',
        label: 'Vendedor',
        format: (_, r) => (r.seller ? r.seller.nombre : 'Venta Directa'),
      },
      {
        key: 'total',
        label: 'Total COP',
        format: (val) => `$${Number(val).toLocaleString('es-CO')}`,
      },
      { key: 'metodoPago', label: 'Método de Pago' },
      { key: 'estado', label: 'Estado' },
      {
        key: 'createdAt',
        label: 'Fecha y Hora',
        format: (val) => new Date(val).toLocaleString('es-CO'),
      },
    ];
    exportToCSV('reporte_ordenes_ventas', exportColumns, filteredOrders);
  };

  const handlePrintOrders = () => {
    const totalMonto = filteredOrders.reduce((acc, o) => acc + Number(o.total || 0), 0);
    const pagadas = filteredOrders.filter((o) => o.estado === 'PAGADO').length;
    const pendientes = filteredOrders.filter((o) => o.estado === 'PENDIENTE').length;

    triggerPrintReport({
      title: 'Reporte de Órdenes y Ventas',
      subtitle: `STREAMCONTROL - Estado: ${statusFilter || 'Todos'} | Total órdenes: ${filteredOrders.length}`,
      summaryCards: [
        { label: 'Total Órdenes', value: filteredOrders.length },
        { label: 'Pagadas / Aprobadas', value: pagadas },
        { label: 'Pendientes', value: pendientes },
        { label: 'Volumen Facturado', value: `$${totalMonto.toLocaleString('es-CO')}` },
      ],
      columns: [
        { key: 'id', label: 'ID', format: (id) => id.slice(0, 8) },
        { key: 'cliente', label: 'Cliente', format: (_, r) => `${r.user?.nombre || r.guestName || 'Invitado'} (${r.user?.telefono || r.guestPhone || '-'})` },
        {
          key: 'items',
          label: 'Servicio / Plan',
          format: (_, r) =>
            r.items?.map((it: any) => `${it.plan?.service?.nombre} (${it.plan?.nombrePlan})`).join(', ') || '-',
        },
        { key: 'vendedor', label: 'Vendedor', format: (_, r) => r.seller?.nombre || 'Directo' },
        { key: 'total', label: 'Total', format: (v) => `$${Number(v).toLocaleString('es-CO')}` },
        { key: 'estado', label: 'Estado' },
        { key: 'createdAt', label: 'Fecha', format: (d) => new Date(d).toLocaleDateString('es-CO') },
      ],
      rows: filteredOrders,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-red-500" />
            <span>Órdenes y Ventas</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Bandeja de pedidos, verificación de pagos y despacho automático de credenciales
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintOrders}
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
          <button
            onClick={fetchOrders}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </button>

          {canRegisterSale && (
            <button
              onClick={() => openSaleModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-bold text-white rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer transform active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registrar Venta</span>
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Buscar por cliente o teléfono..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-950/80 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Filtro por Día (Ventas por Día) */}
          <div className="flex items-center gap-1.5 bg-gray-950/80 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-300">
            <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <span className="text-[11px] text-gray-400 hidden lg:inline">Día:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
              title="Filtrar ventas por día"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-gray-400 hover:text-white p-0.5 text-xs"
                title="Limpiar fecha"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filtro por Vendedor */}
          <div className="flex items-center gap-1.5 bg-gray-950/80 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-300">
            <UserCheck className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={sellerFilter}
              onChange={(e) => setSellerFilter(e.target.value)}
              className="bg-transparent text-xs text-gray-300 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-gray-950 text-white">Todos los Vendedores</option>
              <option value="__directa__" className="bg-gray-950 text-white">Venta directa en plataforma</option>
              {availableSellers.map((sellerName) => (
                <option key={sellerName} value={sellerName} className="bg-gray-950 text-white">
                  {sellerName}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por Tipo (Venta vs Renovación) */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-gray-950/80 border border-gray-800 text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
          >
            <option value="">Todos los Tipos</option>
            <option value="VENTA">Solo Ventas Nuevas</option>
            <option value="RENOVACION">Solo Renovaciones</option>
          </select>

          {/* Filtro por Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-950/80 border border-gray-800 text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600 cursor-pointer"
          >
            <option value="">Todos los Estados</option>
            <option value="PENDIENTE">Pendientes de Pago</option>
            <option value="PAGADO">Pagados / Entregados</option>
            <option value="CANCELADO">Cancelados</option>
            <option value="FALLIDO">Fallidos</option>
          </select>

          {(dateFilter || sellerFilter || typeFilter) && (
            <button
              onClick={() => {
                setDateFilter('');
                setSellerFilter('');
                setTypeFilter('');
              }}
              className="px-2.5 py-1.5 text-[11px] text-red-400 hover:text-red-300 bg-red-950/40 border border-red-900/40 rounded-xl transition-colors cursor-pointer"
            >
              Restablecer
            </button>
          )}
        </div>
      </div>

      {/* Tabla de Órdenes */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Cliente</th>
                <th className="px-5 py-3.5">Planes Solicitados</th>
                <th className="px-5 py-3.5">Vendedor & Registro</th>
                <th className="px-5 py-3.5">Total & Método</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850/60">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                    No hay pedidos registrados con los filtros actuales.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const isPending = order.estado === 'PENDIENTE';
                  const isPaid = order.estado === 'PAGADO';
                  const isCancelled = order.estado === 'CANCELADO';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-800/40 transition group cursor-pointer"
                      onClick={() => {
                        setViewingOrder(order);
                        setReceiptImage(order.comprobanteUrl || null);
                      }}
                    >
                      {/* Cliente */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-white flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <span>{order.customer?.user?.nombre || 'Cliente'}</span>
                          </p>
                          <p className="text-[11px] text-gray-400">{order.customer?.user?.email}</p>
                          <p className="text-[11px] text-emerald-400 font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            <span>{order.customer?.whatsapp}</span>
                          </p>
                        </div>
                      </td>

                      {/* Items & Tipo */}
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div>
                            {order.descripcionVenta?.includes('[RENOVACIÓN]') ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950/80 text-indigo-300 border border-indigo-700/60 shadow-sm">
                                <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin-reverse" />
                                <span>Renovación</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-slate-400 border border-slate-800">
                                <ShoppingCart className="w-3 h-3 text-slate-400" />
                                <span>Venta Directa</span>
                              </span>
                            )}
                          </div>
                          {order.items?.map((it: any) => (
                            <div key={it.id} className="flex items-center gap-2">
                              <span className="font-bold text-white">{it.cantidad}x</span>
                              <span className="text-gray-200">
                                {it.plan?.service?.nombre} - {it.plan?.nombrePlan}
                              </span>
                            </div>
                          ))}
                          {order.descripcionVenta?.includes('[RENOVACIÓN]') && (
                            <p className="text-[10px] text-indigo-300/80 font-mono truncate max-w-[260px]" title={order.descripcionVenta}>
                              {order.descripcionVenta}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Vendedor & Registro */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {order.vendedorNombre || order.vendedor?.nombre ? (
                            <div>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-950/60 border border-blue-800/40 text-blue-300 font-semibold text-[11px]">
                                <UserCheck className="w-3 h-3 text-blue-400" />
                                <span>{order.vendedorNombre || order.vendedor?.nombre}</span>
                              </span>
                              {order.vendedorComision ? (
                                <p className="text-[10px] text-emerald-400 font-mono mt-0.5">
                                  Ganancia: +{formatCOP(order.vendedorComision)} ({order.vendedorPorcentaje}%)
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-gray-900 border border-gray-800 text-gray-400 text-[10px]">
                              Venta Online Directa
                            </span>
                          )}
                          <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3 text-gray-500" />
                            <span>
                              {new Date(order.createdAt).toLocaleString('es-CO', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true,
                              })}
                            </span>
                          </p>
                        </div>
                      </td>

                      {/* Total */}
                      <td className="px-5 py-4">
                        <div>
                          <p className="font-bold text-white text-sm">{formatCOP(order.total)}</p>
                          <p className="text-[11px] text-gray-400">{order.metodoPago || 'Transferencia / Nequi'}</p>
                          {order.comprobanteUrl && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setVerifiedReceiptOrders((prev) => ({ ...prev, [order.id]: true }));
                                setZoomedImage(order.comprobanteUrl);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-colors mt-1 ${
                                verifiedReceiptOrders[order.id]
                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 hover:bg-emerald-900/50'
                                    : 'bg-amber-950/70 text-amber-300 border-amber-800/80 hover:bg-amber-900/60'
                              }`}
                              title={
                                verifiedReceiptOrders[order.id]
                                  ? 'Comprobante revisado (clic para ver de nuevo)'
                                  : 'Comprobante adjunto por verificar (clic para revisar)'
                              }
                            >
                              {verifiedReceiptOrders[order.id] ? (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>Soporte Verificado</span>
                                </>
                              ) : (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-amber-400 animate-pulse" />
                                  <span>Soporte por Revisar</span>
                                </>
                              )}
                            </button>
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
                            <span>Pagado</span>
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950/60 text-rose-400 border border-rose-800/50 uppercase">
                            <Ban className="w-3 h-3" />
                            <span>Cancelado</span>
                          </span>
                        )}
                        {!isPending && !isPaid && !isCancelled && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-950/60 text-red-400 border border-red-800/50 uppercase">
                            <XCircle className="w-3 h-3" />
                            <span>{order.estado}</span>
                          </span>
                        )}
                      </td>

                      {/* Botón de acción */}
                      <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setViewingOrder(order);
                              setReceiptImage(order.comprobanteUrl || null);
                            }}
                            data-tooltip="Ver"
                            className="px-2.5 py-1.5 bg-gray-950/80 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-400" />
                            <span>Ver Detalle</span>
                          </button>

                          {isPending && canApprove && (
                            <button
                              onClick={() => {
                                const isCash = (order.metodoPago || '').toLowerCase().includes('efectivo');
                                if (!isCash && !order.comprobanteUrl) {
                                  setViewingOrder(order);
                                  setReceiptImage(null);
                                  return;
                                }

                                // Condicionar la aprobación: si la orden cuenta con una imagen,
                                // el sistema no permite aprobar sin antes haber verificado el comprobante
                                if (order.comprobanteUrl && !verifiedReceiptOrders[order.id]) {
                                  setUnverifiedWarningOrder(order);
                                  return;
                                }

                                handleApprove(order.id, order.comprobanteUrl);
                              }}
                              disabled={approvingId === order.id}
                              data-tooltip="Aprobar"
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {approvingId === order.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>Entregando...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Aprobar</span>
                                </>
                              )}
                            </button>
                          )}

                          {order.estado !== 'CANCELADO' && canApprove && (
                            <button
                              onClick={() => openCancelSaleModal(order)}
                              data-tooltip="Cancelar Venta"
                              className="px-2.5 py-1.5 bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 hover:border-red-600/80 text-red-300 hover:text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                              <span>Cancelar</span>
                            </button>
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

        {/* Paginador de 10 filas */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredOrders.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* MODAL DE ENTREGA EXITOSA */}
      {deliveredModalData && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">¡Entrega Inmediata Exitosa!</h3>
                  <p className="text-[11px] text-gray-400">Las credenciales fueron asignadas y despachadas</p>
                </div>
              </div>
              <button
                onClick={() => setDeliveredModalData(null)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-3">
                {deliveredModalData.suscripciones?.map((sub: any, idx: number) => (
                  <div
                    key={idx}
                    className="bg-gray-950 border border-gray-800 rounded-xl p-4 text-xs space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-red-400 text-sm">{sub.servicio}</span>
                      <span className="text-[11px] text-gray-400">{sub.plan}</span>
                    </div>

                    <div className="space-y-1 font-mono text-[11px] bg-gray-900/80 p-2.5 rounded-lg border border-gray-850">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Correo:</span>
                        <span className="text-white font-bold">{sub.email}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Clave:</span>
                        <span className="text-white font-bold">{sub.password}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Perfil:</span>
                        <span className="text-emerald-400">{sub.perfil || 'Principal'}</span>
                      </div>
                      {sub.pin && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">PIN:</span>
                          <span className="text-amber-400 font-bold">{sub.pin}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
                💬 <strong>WhatsApp automático:</strong> El mensaje con las credenciales y las instrucciones de garantía fue enviado al cliente.
              </div>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end text-xs">
              <button
                onClick={() => setDeliveredModalData(null)}
                className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl cursor-pointer"
              >
                Entendido y Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE COMPLETO DE LA ORDEN */}
      {viewingOrder && (() => {
        const isCash = Boolean(
          viewingOrder.metodoPago &&
          (viewingOrder.metodoPago.toLowerCase().includes('efectivo') ||
           viewingOrder.metodoPago.toLowerCase().includes('cash'))
        );
        const currentReceipt = receiptImage || viewingOrder.comprobanteUrl;
        const canApproveThisOrder = isCash || Boolean(currentReceipt);

        return (
          <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
              {/* Cabecera Fija */}
              <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 shrink-0 bg-gray-900/95 backdrop-blur-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
                    <Eye className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Detalle de la Orden de Venta</h3>
                    <p className="text-[11px] text-gray-400 font-mono">ID: {viewingOrder.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setViewingOrder(null);
                    setReceiptImage(null);
                  }}
                  data-tooltip="Cerrar"
                  className="text-gray-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido con scroll interno */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Información del Cliente */}
                <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5 space-y-2">
                  <p className="font-semibold text-white text-[11px] uppercase tracking-wider text-gray-400">
                    Datos del Cliente
                  </p>
                  <div>
                    <p className="text-white font-medium">{viewingOrder.customer?.user?.nombre || 'Cliente'}</p>
                    <p className="text-gray-400 text-[11px]">{viewingOrder.customer?.user?.email}</p>
                  </div>
                  {viewingOrder.customer?.whatsapp && (
                    <a
                      href={`https://wa.me/${viewingOrder.customer.whatsapp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      data-tooltip="WhatsApp"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/50 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-400 rounded-lg font-mono text-[11px] transition-colors"
                    >
                      <Phone className="w-3 h-3" />
                      <span>WhatsApp: {viewingOrder.customer.whatsapp}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Información del Pago */}
                <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5 space-y-2">
                  <p className="font-semibold text-white text-[11px] uppercase tracking-wider text-gray-400">
                    Estado y Pago
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Estado:</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] border uppercase ${
                        viewingOrder.estado === 'PAGADO'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                          : viewingOrder.estado === 'PENDIENTE'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                          : 'bg-red-950/60 text-red-400 border-red-800/50'
                      }`}
                    >
                      {viewingOrder.estado}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Método:</span>
                    <span className="text-white font-medium">{viewingOrder.metodoPago || 'Nequi / Bancolombia'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Fecha:</span>
                    <span className="text-gray-300">
                      {new Date(viewingOrder.createdAt).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {/* Información de la Venta & Vendedor */}
                <div className="sm:col-span-2 bg-gradient-to-r from-gray-950 to-gray-900 border border-gray-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-white text-[11px] uppercase tracking-wider text-gray-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                      <span>Información de la Venta & Vendedor</span>
                    </p>
                    <span className="text-[11px] text-gray-400 font-mono">
                      {new Date(viewingOrder.createdAt).toLocaleString('es-CO', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      })}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Vendedor Asignado:</span>
                      <span className="text-white font-bold text-sm flex items-center gap-1.5">
                        {viewingOrder.vendedorNombre || viewingOrder.vendedor?.nombre || 'Venta Online Directa (Sin Vendedor)'}
                      </span>
                    </div>
                    {viewingOrder.vendedorComision ? (
                      <div>
                        <span className="text-gray-400 block text-[10px]">Comisión / Ganancia Vendedor:</span>
                        <span className="font-bold text-emerald-400 font-mono text-sm">
                          +{formatCOP(viewingOrder.vendedorComision)} ({viewingOrder.vendedorPorcentaje}%)
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-400 block text-[10px]">Canal de Venta:</span>
                        <span className="text-gray-300 text-xs">Directo Plataforma Web</span>
                      </div>
                    )}
                  </div>
                  {viewingOrder.descripcionVenta && (
                    <div className="pt-2 border-t border-gray-850">
                      <span className="text-gray-400 block text-[10px]">Descripción Oficial de la Venta:</span>
                      <p className="text-xs text-gray-200 font-mono bg-gray-950/70 px-2.5 py-1.5 rounded-lg border border-gray-850 mt-1">
                        {viewingOrder.descripcionVenta}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Ítems comprados */}
              <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5 space-y-2.5 text-xs">
                <p className="font-semibold text-white text-[11px] uppercase tracking-wider text-gray-400">
                  Planes y Servicios Solicitados
                </p>
                <div className="divide-y divide-gray-850">
                  {viewingOrder.items?.map((it: any) => (
                    <div key={it.id} className="py-2 flex items-center justify-between first:pt-0 last:pb-0">
                      <div>
                        <p className="font-medium text-white">
                          {it.plan?.service?.nombre} - {it.plan?.nombrePlan}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {it.cantidad} unidad(es) × {formatCOP(it.precioUnitario)}
                        </p>
                      </div>
                      <p className="font-bold text-white text-sm">
                        {formatCOP(Number(it.precioUnitario) * Number(it.cantidad))}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-gray-800 flex justify-between items-center">
                  <span className="font-bold text-white">Total de la Orden:</span>
                  <span className="font-extrabold text-base text-emerald-400">
                    {formatCOP(viewingOrder.total)}
                  </span>
                </div>
              </div>

              {/* Cuentas de Inventario Entregadas / Vinculadas en esta Orden */}
              {viewingOrder.subscriptions && viewingOrder.subscriptions.length > 0 && (
                <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white text-[11px] uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cuentas de Inventario Entregadas en este Pedido</span>
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {viewingOrder.subscriptions.length} cuenta(s) asignada(s)
                    </span>
                  </div>

                  <div className="space-y-2">
                    {viewingOrder.subscriptions.map((sub: any) => {
                      const acc = sub.account;
                      const accCode = `#ACC-${(acc?.id || sub.accountId || '').substring(0, 8).toUpperCase()}`;

                      return (
                        <div
                          key={sub.id}
                          className="p-3 bg-gray-900/80 border border-gray-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 font-mono text-[11px] font-bold inline-flex items-center gap-1">
                                {accCode}
                              </span>
                              <button
                                onClick={() => handleCopy(accCode, `ord-acc-${sub.id}`)}
                                className="text-gray-500 hover:text-white p-0.5"
                                data-tooltip="Copiar código de cuenta"
                              >
                                {copiedKey === `ord-acc-${sub.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <span className="font-bold text-white text-xs">
                                {sub.plan?.service?.nombre} ({sub.plan?.nombrePlan})
                              </span>
                              {acc?.estado && (
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                    acc.estado === 'DISPONIBLE'
                                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                                      : acc.estado === 'OCUPADA'
                                      ? 'bg-blue-950/60 text-blue-400 border-blue-800/50'
                                      : acc.estado === 'DEFECTUOSA'
                                      ? 'bg-rose-950/60 text-rose-400 border-rose-800/50'
                                      : 'bg-red-950/60 text-red-400 border-red-800/50'
                                  }`}
                                >
                                  Inv: {acc.estado}
                                </span>
                              )}
                            </div>

                            <p className="font-mono text-[11px] text-gray-300">
                              Correo: <strong className="text-white">{acc?.emailCuenta || 'N/A'}</strong>
                              {acc?.perfilAsignado ? ` | Perfil: ${acc.perfilAsignado}` : ''}
                              {acc?.pinPerfil ? ` | PIN: ${acc.pinPerfil}` : ''}
                            </p>
                            {sub.fechaVencimiento && (() => {
                              const hoy = new Date();
                              hoy.setHours(0, 0, 0, 0);
                              const venc = new Date(sub.fechaVencimiento);
                              const diasRestantes = Math.ceil((new Date(venc).setHours(0, 0, 0, 0) - hoy.getTime()) / (1000 * 60 * 60 * 24));
                              return (
                                <div className="flex items-center gap-2 pt-1 text-[11px]">
                                  <span className="text-gray-400">
                                    Vence: <strong className="text-indigo-300 font-mono">{venc.toLocaleDateString('es-CO')}</strong>
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                      diasRestantes > 5
                                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                        : diasRestantes > 0
                                        ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                                        : diasRestantes === 0
                                        ? 'bg-orange-950/60 text-orange-400 border-orange-800/60'
                                        : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                                    }`}
                                  >
                                    {diasRestantes > 1
                                      ? `${diasRestantes} días restantes`
                                      : diasRestantes === 1
                                      ? '1 día restante'
                                      : diasRestantes === 0
                                      ? 'Vence hoy'
                                      : `Vencida (${Math.abs(diasRestantes)}d)`}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Acciones Rápidas sobre la Cuenta de Inventario */}
                          {acc?.id && (
                            <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
                              <span className="text-[10px] text-gray-400">Estado:</span>
                              <select
                                value={acc.estado || 'OCUPADA'}
                                onChange={async (e) => {
                                  const newStatus = e.target.value;
                                  try {
                                    setAccountActionLoading(acc.id);
                                    await api.patch(`/accounts/${acc.id}`, { estado: newStatus });
                                    acc.estado = newStatus;
                                    setViewingOrder({ ...viewingOrder });
                                    fetchOrders();
                                  } catch (err: any) {
                                    alert(err.response?.data?.message || 'Error al actualizar estado de la cuenta');
                                  } finally {
                                    setAccountActionLoading(null);
                                  }
                                }}
                                disabled={accountActionLoading === acc.id}
                                className="bg-gray-950 border border-gray-700 text-[11px] text-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:border-red-600 cursor-pointer"
                                title="Cambiar estado en inventario (Suspender/Bloquear/Defectuosa/Disponible)"
                              >
                                <option value="OCUPADA">Ocupada</option>
                                <option value="BLOQUEADA">Bloquear</option>
                                <option value="DEFECTUOSA">Defectuosa</option>
                                <option value="DISPONIBLE">Disponible</option>
                                <option value="VENCIDA">Vencida</option>
                              </select>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECCIÓN DE COMPROBANTE DE PAGO (REQUERIDO PARA PAGOS ELECTRÓNICOS) */}
              <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-purple-400" />
                    <span className="font-semibold text-white text-[11px] uppercase tracking-wider">
                      Comprobante de Pago
                    </span>
                  </div>
                  {isCash ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                      <CheckCircle2 className="w-3 h-3" />
                      Pago en Efectivo (Sin soporte digital)
                    </span>
                  ) : currentReceipt ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                      <FileCheck className="w-3 h-3" />
                      Comprobante Adjunto
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/50">
                      <AlertCircle className="w-3 h-3" />
                      Requerido para activar
                    </span>
                  )}
                </div>

                {currentReceipt ? (
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-900/80 p-3 rounded-xl border border-gray-800">
                    <div
                      onClick={() => {
                        setVerifiedReceiptOrders((prev) => ({ ...prev, [viewingOrder.id]: true }));
                        setZoomedImage(currentReceipt);
                      }}
                      className="relative group cursor-pointer w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0 bg-black"
                      data-tooltip="Ver"
                    >
                      <img
                        src={currentReceipt}
                        alt="Comprobante de Pago"
                        className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <ZoomIn className="w-5 h-5 text-white" />
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5 text-center sm:text-left">
                      <p className="text-white font-medium text-xs">
                        Comprobante de pago adjunto por el cliente
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {verifiedReceiptOrders[viewingOrder.id]
                          ? '✅ Has verificado este comprobante en la sesión actual.'
                          : '⚠️ Debes inspeccionar la imagen antes de poder aprobar la orden.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setVerifiedReceiptOrders((prev) => ({ ...prev, [viewingOrder.id]: true }));
                            setZoomedImage(currentReceipt);
                          }}
                          data-tooltip="Ver"
                          className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <ZoomIn className="w-3.5 h-3.5 text-purple-400" />
                          <span>Ver Completo (Inspeccionar)</span>
                        </button>

                        {viewingOrder.estado === 'PENDIENTE' && (
                          <label
                            data-tooltip="Editar"
                            className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5 text-blue-400" />
                            <span>Cambiar Imagen</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleReceiptFileChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    {isCash ? (
                      <div className="space-y-2">
                        <p className="text-[11px] text-gray-400 italic">
                          El cliente pagó en efectivo. La activación está permitida directamente sin necesidad de comprobante digital.
                        </p>
                        {viewingOrder.estado === 'PENDIENTE' && (
                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 text-xs cursor-pointer transition-colors">
                            <Upload className="w-3.5 h-3.5 text-purple-400" />
                            <span>Adjuntar recibo físico opcional</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleReceiptFileChange}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-[11px] text-amber-300/90 flex items-start gap-2">
                          <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                          <span>
                            Para pagos con <strong>{viewingOrder.metodoPago || 'Medio Electrónico'}</strong> (Nequi, Bancolombia, Daviplata, Bre-B, Tarjeta Débito, PSE, etc.) <strong>es obligatorio adjuntar la imagen del comprobante</strong> como soporte para activar el botón de aprobación.
                          </span>
                        </div>

                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 hover:border-purple-500/80 bg-gray-900/60 hover:bg-purple-950/10 rounded-xl p-4 cursor-pointer transition-all">
                          <div className="w-10 h-10 rounded-full bg-purple-950/70 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-2">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-white font-medium text-xs">Haga clic para adjuntar comprobante de pago</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Formatos válidos: PNG, JPG, JPEG, WEBP (Hasta 20MB)</p>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleReceiptFileChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Acciones de pie de modal Fijo */}
            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-between gap-2 text-xs flex-wrap">
                <div>
                  {viewingOrder.estado !== 'CANCELADO' && canApprove && (
                    <button
                      type="button"
                      onClick={() => openCancelSaleModal(viewingOrder)}
                      className="px-3.5 py-2 bg-red-950/60 hover:bg-red-900/80 border border-red-800/60 hover:border-red-600 text-red-300 hover:text-white font-semibold rounded-xl inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-950/30"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                      <span>Cancelar Venta</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setViewingOrder(null);
                      setReceiptImage(null);
                    }}
                    data-tooltip="Cerrar"
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl cursor-pointer"
                  >
                    Cerrar
                  </button>

                {viewingOrder.estado === 'PENDIENTE' && canApprove && (
                  <button
                    onClick={async () => {
                      if (!canApproveThisOrder) {
                        alert('Debe adjuntar una imagen del comprobante de pago para poder aprobar pedidos por medios electrónicos.');
                        return;
                      }

                      // Condicionar la aprobación: si la orden cuenta con una imagen,
                      // el sistema no permite aprobar sin antes haber verificado el comprobante
                      if (currentReceipt && !verifiedReceiptOrders[viewingOrder.id]) {
                        setUnverifiedWarningOrder(viewingOrder);
                        return;
                      }

                      await handleApprove(viewingOrder.id, currentReceipt);
                      setViewingOrder(null);
                      setReceiptImage(null);
                    }}
                    disabled={approvingId === viewingOrder.id || !canApproveThisOrder}
                    data-tooltip={canApproveThisOrder ? 'Aprobar' : 'Bloqueado'}
                    className={`px-4 py-2 font-semibold rounded-xl inline-flex items-center gap-1.5 transition-all text-xs ${
                      canApproveThisOrder
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 cursor-pointer'
                        : 'bg-gray-800 text-gray-500 border border-gray-700/50 cursor-not-allowed opacity-60'
                    }`}
                  >
                    {approvingId === viewingOrder.id ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Aprobando y Entregando...</span>
                      </>
                    ) : !canApproveThisOrder ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-gray-500" />
                        <span>Aprobar y Despachar Pedido (Adjunte Soporte)</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Aprobar y Despachar Pedido</span>
                      </>
                    )}
                  </button>
                )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL EN EL CENTRO: ADVERTENCIA DE VERIFICACIÓN OBLIGATORIA DE COMPROBANTE */}
      {/* ========================================================================= */}
      {unverifiedWarningOrder && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-amber-500/80 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl shadow-amber-950/40 overflow-hidden animate-in zoom-in-95">
            {/* Cabecera con Icono de Advertencia */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-2.5 text-amber-400">
                <div className="w-9 h-9 rounded-xl bg-amber-950/80 border border-amber-800/80 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Advertencia: Verificación Requerida</h3>
                  <p className="text-[11px] text-amber-400/90 font-medium">Revisión obligatoria del comprobante de pago</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnverifiedWarningOrder(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-850 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              {/* Mensaje de Advertencia */}
              <div className="p-4 bg-amber-950/30 border border-amber-800/60 rounded-xl space-y-2 text-xs text-amber-200">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-300 text-xs">
                      No es posible aprobar esta compra sin antes revisar el comprobante
                    </p>
                    <p className="text-[11px] text-amber-200/90 leading-relaxed">
                      La compra realizada por el cliente ya cuenta con una imagen de soporte adjunta. Por motivos de control y prevención de errores o fraudes, 
                      <strong> el sistema no permite aprobar esta compra sin antes haber verificado el comprobante de pago</strong> (revisar la imagen del recibo o consignación).
                    </p>
                  </div>
                </div>
              </div>

              {/* Resumen de la Orden */}
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-gray-800/80">
                <span className="text-gray-400">Número de Orden:</span>
                <span className="font-mono font-bold text-white">
                  #ORD-{unverifiedWarningOrder.id.substring(0, 8).toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Cliente:</span>
                <span className="font-semibold text-white">
                  {unverifiedWarningOrder.customer?.user?.nombre || 'Cliente'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total a Validar:</span>
                <span className="font-mono font-black text-emerald-400 text-sm">
                  {formatCOP(unverifiedWarningOrder.total)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Método Declarado:</span>
                <span className="text-gray-300">
                  {unverifiedWarningOrder.metodoPago || 'Nequi / Bancolombia'}
                </span>
              </div>
            </div>

            {/* Vista previa e inspección de la imagen */}
            <div className="space-y-2">
              <span className="text-[11px] text-gray-400 block font-semibold">
                Imagen del comprobante adjuntada por el cliente:
              </span>
              <div
                onClick={() => {
                  setVerifiedReceiptOrders((prev) => ({ ...prev, [unverifiedWarningOrder.id]: true }));
                  setZoomedImage(unverifiedWarningOrder.comprobanteUrl);
                }}
                className="relative group cursor-pointer w-full h-44 rounded-xl overflow-hidden border-2 border-dashed border-amber-800/70 hover:border-amber-400 bg-black/70 flex items-center justify-center transition-all shadow-inner"
                title="Haz clic para inspeccionar en pantalla completa"
              >
                <img
                  src={unverifiedWarningOrder.comprobanteUrl}
                  alt="Comprobante de pago"
                  className="w-full h-full object-contain p-1 transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 text-white">
                  <ZoomIn className="w-6 h-6 text-amber-400" />
                  <span className="text-xs font-bold">Clic para Abrir e Inspeccionar en Pantalla Completa</span>
                </div>
              </div>

              {verifiedReceiptOrders[unverifiedWarningOrder.id] ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    ¡Comprobante verificado con éxito! Ahora puede autorizar la entrega de las credenciales.
                  </span>
                </div>
              ) : (
                <p className="text-[11px] text-center text-amber-400/90 font-medium italic">
                  Presiona "Revisar Comprobante Ahora" para abrir la imagen antes de poder aprobar la venta.
                </p>
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex flex-col sm:flex-row items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setUnverifiedWarningOrder(null)}
              className="w-full sm:w-auto px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancelar / Cerrar
            </button>

            {!verifiedReceiptOrders[unverifiedWarningOrder.id] ? (
              <button
                type="button"
                onClick={() => {
                  setVerifiedReceiptOrders((prev) => ({ ...prev, [unverifiedWarningOrder.id]: true }));
                  setZoomedImage(unverifiedWarningOrder.comprobanteUrl);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all animate-pulse"
              >
                <ZoomIn className="w-4 h-4" />
                <span>Revisar Comprobante Ahora</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={approvingId === unverifiedWarningOrder.id}
                onClick={async () => {
                  const ord = unverifiedWarningOrder;
                  setUnverifiedWarningOrder(null);
                  await handleApprove(ord.id, ord.comprobanteUrl);
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {approvingId === unverifiedWarningOrder.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Aprobando y Entregando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aprobar Compra y Despachar Pedido</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    )}

      {/* ========================================================================= */}
      {/* MODAL: CANCELAR VENTA Y DEVOLVER CUENTAS AL INVENTARIO COMO DISPONIBLES */}
      {/* ========================================================================= */}
      {cancellingOrder && (() => {
        const orderCode = `#ORD-${cancellingOrder.id.substring(0, 8).toUpperCase()}`;
        const subscriptions = cancellingOrder.subscriptions || [];
        const hasAccounts = subscriptions.length > 0;
        const allSelected = hasAccounts && subscriptions.every((sub: any) => {
          const accId = sub.accountId || sub.account?.id;
          return selectedAccountsToRestore[accId];
        });
        const selectedCount = Object.keys(selectedAccountsToRestore).filter(
          (k) => selectedAccountsToRestore[k]
        ).length;

        const toggleSelectAll = () => {
          if (allSelected) {
            setSelectedAccountsToRestore({});
          } else {
            const map: { [id: string]: boolean } = {};
            subscriptions.forEach((sub: any) => {
              const accId = sub.accountId || sub.account?.id;
              if (accId) map[accId] = true;
            });
            setSelectedAccountsToRestore(map);
          }
        };

        const toggleAccount = (accId: string) => {
          setSelectedAccountsToRestore((prev) => ({
            ...prev,
            [accId]: !prev[accId],
          }));
        };

        const quickReasons = [
          'Solicitud de cancelación por el cliente',
          'Problemas con el servicio / Fallas técnicas',
          'Comprobante de pago rechazado o inválido',
          'Error en datos de facturación / pedido duplicado',
          'Garantía aplicada / Cambio de servicio',
        ];

        return (
          <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-gray-950 border border-red-500/50 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl shadow-red-950/40 overflow-hidden animate-in zoom-in-95">
              {/* Encabezado Fijo */}
              <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-950/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800/80 flex items-center justify-center text-red-400 shrink-0">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Cancelar Venta y Devolver Cuentas</span>
                      <span className="px-2 py-0.5 rounded-md bg-red-950/70 border border-red-800 text-red-300 font-mono text-[11px]">
                        {orderCode}
                      </span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Cliente: <strong className="text-white">{cancellingOrder.customer?.user?.nombre || 'Cliente'}</strong> • Total: <strong className="text-emerald-400">{formatCOP(cancellingOrder.total)}</strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido con scroll */}
              <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs">
                {/* Banner de advertencia */}
                <div className="p-3.5 bg-red-950/20 border border-red-900/40 rounded-xl text-red-200/90 space-y-1">
                  <div className="flex items-center gap-2 font-bold text-red-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Confirmación de Cancelación de Venta</span>
                  </div>
                  <p className="text-[11px] text-gray-300 leading-relaxed">
                    Al confirmar, el estado de la venta cambiará a <strong className="text-red-400">CANCELADO</strong> y las suscripciones quedarán anuladas. Puedes seleccionar las cuentas vinculadas que deseas retornar inmediatamente al inventario como <strong className="text-emerald-400">DISPONIBLE</strong>.
                  </p>
                </div>

                {/* Selección de Cuentas a Devolver */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cuentas a Devolver al Inventario</span>
                    </label>
                    {hasAccounts && (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer font-medium"
                      >
                        {allSelected ? 'Deseleccionar todas' : 'Seleccionar todas'}
                      </button>
                    )}
                  </div>

                  {hasAccounts ? (
                    <div className="space-y-2">
                      {subscriptions.map((sub: any) => {
                        const acc = sub.account;
                        const accId = sub.accountId || acc?.id;
                        const isSelected = !!selectedAccountsToRestore[accId];
                        const accCode = `#ACC-${(accId || '').substring(0, 8).toUpperCase()}`;

                        return (
                          <div
                            key={sub.id}
                            onClick={() => toggleAccount(accId)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                              isSelected
                                ? 'bg-emerald-950/30 border-emerald-700/60 shadow-sm shadow-emerald-950/40'
                                : 'bg-gray-900/60 border-gray-800 hover:border-gray-700 opacity-75'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="shrink-0 text-emerald-400">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-gray-600" />
                                )}
                              </div>
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-[11px] text-amber-400">
                                    {accCode}
                                  </span>
                                  <span className="font-bold text-white text-xs">
                                    {sub.plan?.service?.nombre} - {sub.plan?.nombrePlan}
                                  </span>
                                </div>
                                <p className="font-mono text-[11px] text-gray-300">
                                  {acc?.emailCuenta || 'Sin correo registrado'}
                                  {acc?.perfilAsignado ? ` | Perfil: ${acc.perfilAsignado}` : ''}
                                </p>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Retorna DISPONIBLE</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-800 text-gray-400 border border-gray-700">
                                  <span>No devolver</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-xl text-gray-400 text-center text-xs">
                      Esta orden no tiene cuentas de inventario asignadas (el pedido no fue despachado previamente).
                    </div>
                  )}
                </div>

                {/* Motivo de Cancelación */}
                <div className="space-y-2">
                  <label className="font-semibold text-white uppercase text-[11px] tracking-wider block">
                    Motivo de la Cancelación
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {quickReasons.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() => setCancelReason(reason)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer border ${
                          cancelReason === reason
                            ? 'bg-red-950/80 text-red-300 border-red-700'
                            : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-700 hover:text-white'
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={2}
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Describe el motivo de la cancelación para el registro de auditoría..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600"
                  />
                </div>

                {/* Detalle de comisiones a revertir (si aplica) */}
                {cancellingOrder.vendedorComision && Number(cancellingOrder.vendedorComision) > 0 && (
                  <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-amber-300 text-[11px] flex items-center justify-between">
                    <span>Reversión de ganancia de vendedor:</span>
                    <span className="font-bold text-amber-400 font-mono">
                      -{formatCOP(cancellingOrder.vendedorComision)} ({cancellingOrder.vendedorNombre || cancellingOrder.vendedor?.nombre || 'Vendedor'})
                    </span>
                  </div>
                )}
              </div>

              {/* Pie de modal Fijo */}
              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  disabled={submittingCancel}
                  className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white text-xs font-semibold rounded-xl border border-gray-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Regresar
                </button>

                <button
                  type="button"
                  onClick={handleExecuteCancelSale}
                  disabled={submittingCancel}
                  className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-950/60 flex items-center gap-2 cursor-pointer transition-all disabled:opacity-50"
                >
                  {submittingCancel ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Procesando cancelación...</span>
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>
                        Confirmar Cancelación {hasAccounts ? `(${selectedCount} a devolver)` : ''}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL LIGHTBOX: VER COMPROBANTE EN TAMAÑO COMPLETO */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-[10030] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setZoomedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setZoomedImage(null)}
              data-tooltip="Cerrar"
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1.5 rounded-lg bg-gray-900/80 border border-gray-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Comprobante en Alta Resolución"
              className="max-h-[85vh] max-w-full rounded-xl object-contain border border-gray-850 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: REGISTRAR NUEVA VENTA (ROL VENDEDOR / POS) */}
      {/* ======================================================== */}
      {showSaleModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Cabecera */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Registrar Nueva Venta (Vendedor / POS)</h2>
                  <p className="text-xs text-gray-400">
                    Venta directa operada por: <strong className="text-gray-200">{currentUser?.nombre}</strong> ({currentUser?.rol})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSaleModal(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            {loadingSaleData ? (
              <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                <p className="text-xs">Cargando catálogo de planes y clientes...</p>
              </div>
            ) : (() => {
              const trimmedCustomerSearch = customerSearchTerm.trim().toLowerCase();
              const filteredSaleCustomers = saleCustomers.filter((c: any) => {
                if (!trimmedCustomerSearch) return true;
                const name = (c.nombre || c.user?.nombre || '').toLowerCase();
                const email = (c.email || c.user?.email || '').toLowerCase();
                const phone = (c.whatsapp || c.telefono || c.user?.phone || '').toLowerCase();
                return (
                  name.includes(trimmedCustomerSearch) ||
                  email.includes(trimmedCustomerSearch) ||
                  phone.includes(trimmedCustomerSearch)
                );
              });
              const selectedCustomerObj = saleCustomers.find((c: any) => c.id === saleForm.customerId);

              const trimmedAffiliateSearch = affiliateSearchTerm.trim().toLowerCase();
              const filteredSaleAffiliates = saleAffiliates.filter((a: any) => {
                if (!trimmedAffiliateSearch) return true;
                const name = (a.nombre || a.user?.nombre || '').toLowerCase();
                const code = (a.codigoReferido || '').toLowerCase();
                const email = (a.email || a.user?.email || '').toLowerCase();
                return (
                  name.includes(trimmedAffiliateSearch) ||
                  code.includes(trimmedAffiliateSearch) ||
                  email.includes(trimmedAffiliateSearch)
                );
              });
              const selectedAffiliateObj = saleAffiliates.find((a: any) => a.id === saleForm.afiliadoId);

              return (
                <form onSubmit={handleSaleSubmit} className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  {/* CUADRO DE BÚSQUEDA RÁPIDA DE CLIENTES (ARRIBA DE INFORMACIÓN DEL CLIENTE) */}
                  <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Search className="w-3.5 h-3.5 text-red-500" />
                        Buscar Cliente en Sistema (Nombre, Email o Teléfono)
                      </span>
                      {customerSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearchTerm('')}
                          data-tooltip="Limpiar"
                          className="text-[10px] text-gray-400 hover:text-white font-medium transition cursor-pointer"
                        >
                          Limpiar búsqueda
                        </button>
                      )}
                    </div>

                    <div className="relative">
                      <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={customerSearchTerm}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomerSearchTerm(val);
                          if (customerMode === 'new' && val) {
                            setCustomerMode('existing');
                          }
                        }}
                        placeholder="Buscar por nombre, correo electrónico o teléfono/WhatsApp..."
                        className="w-full bg-gray-900 border border-gray-800 focus:border-red-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                      />
                      {customerSearchTerm && (
                        <button
                          type="button"
                          onClick={() => setCustomerSearchTerm('')}
                          data-tooltip="Cerrar"
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Notificación Dinámica Automática de Coincidencia o Inexistencia */}
                    {trimmedCustomerSearch !== '' && (
                      <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                        {filteredSaleCustomers.length > 0 ? (
                          <div className="p-2.5 bg-emerald-950/40 border border-emerald-800/50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>
                                  Cliente localizado en el sistema ({filteredSaleCustomers.length} coincidencia
                                  {filteredSaleCustomers.length > 1 ? 's' : ''})
                                </span>
                              </span>
                              <span className="text-[10px] text-emerald-300/80">Clic para seleccionar</span>
                            </div>

                            <div className="max-h-36 overflow-y-auto divide-y divide-emerald-900/40 rounded-lg bg-gray-950/90 border border-emerald-900/50">
                              {filteredSaleCustomers.slice(0, 6).map((c: any) => {
                                const isSelected = saleForm.customerId === c.id;
                                const name = c.user?.nombre || c.nombre || 'Cliente';
                                const email = c.user?.email || c.email || 'Sin correo';
                                const phone = c.whatsapp || c.telefono || c.user?.phone || 'Sin WhatsApp';

                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => {
                                      setCustomerMode('existing');
                                      setSaleForm((prev) => ({ ...prev, customerId: c.id }));
                                    }}
                                    className={`p-2 flex items-center justify-between cursor-pointer transition-colors text-xs ${
                                      isSelected
                                        ? 'bg-emerald-900/40 text-white'
                                        : 'hover:bg-gray-900 text-gray-300 hover:text-white'
                                    }`}
                                  >
                                    <div className="space-y-0.5">
                                      <p className="font-bold flex items-center gap-1.5">
                                        <User className="w-3 h-3 text-emerald-400" />
                                        <span>{name}</span>
                                        {isSelected && (
                                          <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                            Seleccionado
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
                                        <span>{email}</span>
                                        <span>•</span>
                                        <span className="font-mono text-emerald-400/90">{phone}</span>
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      data-tooltip="Seleccionar"
                                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition cursor-pointer ${
                                        isSelected
                                          ? 'bg-emerald-600 text-white'
                                          : 'bg-gray-800 hover:bg-emerald-600 hover:text-white text-gray-300'
                                      }`}
                                    >
                                      {isSelected ? 'Listo' : 'Seleccionar'}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 bg-amber-950/30 border border-amber-800/50 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                            <div className="space-y-0.5">
                              <p className="font-semibold text-amber-400 flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                                <span>El cliente NO existe en el sistema</span>
                              </p>
                              <p className="text-[11px] text-amber-300/80">
                                No se encontraron registros con &quot;{customerSearchTerm}&quot;. Proceda a crearlo para continuar con la venta.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setCustomerMode('new');
                                const term = customerSearchTerm.trim();
                                let newNombre = '';
                                let newEmail = '';
                                let newPhone = '';
                                if (term.includes('@')) {
                                  newEmail = term;
                                } else if (/^[0-9+\s()-]+$/.test(term)) {
                                  newPhone = term;
                                } else {
                                  newNombre = term;
                                }
                                setSaleForm((prev) => ({
                                  ...prev,
                                  customerId: '',
                                  clienteNombre: newNombre || prev.clienteNombre,
                                  clienteEmail: newEmail || prev.clienteEmail,
                                  clienteWhatsapp: newPhone || prev.clienteWhatsapp,
                                }));
                              }}
                              data-tooltip="Crear"
                              className="px-3 py-1.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-lg shadow-md shadow-red-600/20 text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                            >
                              <PlusCircle className="w-3.5 h-3.5" />
                              <span>Crear y Continuar Venta</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Selector de Modo de Cliente */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                        Información del Cliente *
                      </label>
                      <div className="flex items-center p-0.5 bg-gray-950 border border-gray-800 rounded-lg text-xs">
                        <button
                          type="button"
                          onClick={() => setCustomerMode('existing')}
                          className={`px-3 py-1 rounded-md transition ${
                            customerMode === 'existing'
                              ? 'bg-red-600 text-white font-semibold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Cliente Registrado
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustomerMode('new')}
                          className={`px-3 py-1 rounded-md transition ${
                            customerMode === 'new'
                              ? 'bg-red-600 text-white font-semibold'
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          + Nuevo Cliente
                        </button>
                      </div>
                    </div>

                    {customerMode === 'existing' ? (
                      <div>
                        {saleCustomers.length === 0 ? (
                          <div className="p-3 rounded-lg bg-gray-950 border border-gray-800 text-xs text-gray-400 flex items-center justify-between">
                            <span>No hay clientes en el directorio aún.</span>
                            <button
                              type="button"
                              onClick={() => setCustomerMode('new')}
                              className="text-red-400 hover:underline font-semibold"
                            >
                              Crear nuevo cliente
                            </button>
                          </div>
                        ) : (
                          <>
                            <select
                              required
                              value={saleForm.customerId}
                              onChange={(e) => setSaleForm({ ...saleForm, customerId: e.target.value })}
                              className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-red-500"
                            >
                              <option value="">-- Selecciona un cliente registrado --</option>
                              {filteredSaleCustomers.map((c: any) => (
                                <option key={c.id} value={c.id}>
                                  {c.user?.nombre || c.nombre || 'Cliente'} ({c.user?.email || c.email || 'Sin correo'}) • WA: {c.whatsapp || 'N/A'}
                                </option>
                              ))}
                            </select>

                            {selectedCustomerObj && (
                              <div className="mt-2 p-2.5 bg-gray-950/80 border border-emerald-900/40 rounded-lg flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                                    <Check className="w-3 h-3" />
                                  </div>
                                  <div>
                                    <p className="font-semibold text-white text-xs">
                                      {selectedCustomerObj.user?.nombre || selectedCustomerObj.nombre || 'Cliente'}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {selectedCustomerObj.user?.email || selectedCustomerObj.email} • WA:{' '}
                                      {selectedCustomerObj.whatsapp || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                                  Seleccionado
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-gray-950/60 p-3 rounded-xl border border-gray-800">
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Nombre Completo *</span>
                        <input
                          type="text"
                          required={customerMode === 'new'}
                          value={saleForm.clienteNombre}
                          onChange={(e) => setSaleForm({ ...saleForm, clienteNombre: e.target.value })}
                          placeholder="Ej: Daniel Restrepo"
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">Correo Electrónico *</span>
                        <input
                          type="email"
                          required={customerMode === 'new'}
                          value={saleForm.clienteEmail}
                          onChange={(e) => setSaleForm({ ...saleForm, clienteEmail: e.target.value })}
                          placeholder="daniel@gmail.com"
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block mb-1">WhatsApp Móvil</span>
                        <input
                          type="text"
                          value={saleForm.clienteWhatsapp}
                          onChange={(e) => setSaleForm({ ...saleForm, clienteWhatsapp: e.target.value })}
                          placeholder="+57 300 123 4567"
                          className="w-full bg-gray-900 border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-red-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Selección de Producto y Plan */}
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                    Servicio & Plan de Streaming *
                  </label>
                  <select
                    required
                    value={saleForm.planId}
                    onChange={(e) => setSaleForm({ ...saleForm, planId: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-red-500"
                  >
                    <option value="">-- Selecciona el plan a vender --</option>
                    {salePlans.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.service?.nombre} • {p.nombrePlan} ({formatCOP(p.precio)}) • Stock: {p.stockDisponible || 0} disp.
                      </option>
                    ))}
                  </select>

                  {/* Detalle del plan seleccionado */}
                  {saleForm.planId && (() => {
                    const sel = salePlans.find((p: any) => p.id === saleForm.planId);
                    if (!sel) return null;
                    const hasStock = (sel.stockDisponible || 0) >= (saleForm.cantidad || 1);
                    return (
                      <div className="mt-2 p-2.5 rounded-lg bg-gray-950 border border-gray-800/80 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Film className="w-4 h-4 text-red-500 shrink-0" />
                          <span className="text-gray-300">
                            {sel.service?.nombre} - {sel.nombrePlan} ({sel.duracionDias} días)
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            hasStock
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                              : 'bg-red-950/60 text-red-400 border border-red-800/50'
                          }`}
                        >
                          Stock: {sel.stockDisponible || 0} disponibles
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Cantidad y Método de Pago */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Cantidad de Cuentas / Pantallas
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      required
                      value={saleForm.cantidad}
                      onChange={(e) => setSaleForm({ ...saleForm, cantidad: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Método de Pago Recibido *
                    </label>
                    <select
                      required
                      value={saleForm.metodoPago}
                      onChange={(e) => setSaleForm({ ...saleForm, metodoPago: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-red-500"
                    >
                      <option value="Nequi">Nequi</option>
                      <option value="Bancolombia">Bancolombia</option>
                      <option value="Daviplata">Daviplata</option>
                      <option value="Bre-B">Bre-B</option>
                      <option value="PSE">PSE</option>
                      <option value="Tarjeta Débito">Tarjeta Débito</option>
                      <option value="Tarjeta Crédito">Tarjeta Crédito</option>
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Efectivo Físico">Efectivo Físico (Caja)</option>
                    </select>
                  </div>
                </div>

                {/* Referencia y Notas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Referencia / Comprobante (Opcional)
                    </label>
                    <input
                      type="text"
                      value={saleForm.referenciaExterna}
                      onChange={(e) => setSaleForm({ ...saleForm, referenciaExterna: e.target.value })}
                      placeholder="Ej: NEQ-1029384"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                      Notas Internas de Venta (Opcional)
                    </label>
                    <input
                      type="text"
                      value={saleForm.notas}
                      onChange={(e) => setSaleForm({ ...saleForm, notas: e.target.value })}
                      placeholder="Ej: Cliente contactado por WhatsApp"
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                {/* ASESOR COMERCIAL / AFILIADO (OPCIONAL) */}
                <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      Asesor Comercial / Afiliado (Opcional)
                    </span>
                    {saleForm.afiliadoId && (
                      <button
                        type="button"
                        onClick={() => {
                          setSaleForm({ ...saleForm, afiliadoId: '' });
                          setAffiliateSearchTerm('');
                        }}
                        className="text-[10px] text-gray-400 hover:text-white font-medium transition cursor-pointer"
                      >
                        Quitar asignación
                      </button>
                    )}
                  </div>

                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={affiliateSearchTerm}
                      onChange={(e) => setAffiliateSearchTerm(e.target.value)}
                      placeholder="Buscar afiliado por nombre, código o correo..."
                      className="w-full bg-gray-900 border border-gray-800 focus:border-amber-500 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none transition-all"
                    />
                    {affiliateSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setAffiliateSearchTerm('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Resultados de búsqueda de afiliados */}
                  {affiliateSearchTerm.trim() !== '' && (
                    <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                      {filteredSaleAffiliates.length > 0 ? (
                        <div className="p-2.5 bg-amber-950/30 border border-amber-800/40 rounded-lg space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>
                                Asesor localizado ({filteredSaleAffiliates.length} coincidencia
                                {filteredSaleAffiliates.length > 1 ? 's' : ''})
                              </span>
                            </span>
                            <span className="text-[10px] text-amber-300/80">Clic para seleccionar</span>
                          </div>

                          <div className="max-h-36 overflow-y-auto divide-y divide-amber-900/30 rounded-lg bg-gray-950 border border-amber-900/40">
                            {filteredSaleAffiliates.slice(0, 6).map((aff: any) => {
                              const isSelected = saleForm.afiliadoId === aff.id;
                              return (
                                <div
                                  key={aff.id}
                                  onClick={() => {
                                    setSaleForm((prev) => ({ ...prev, afiliadoId: aff.id }));
                                    setAffiliateSearchTerm('');
                                  }}
                                  className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition ${
                                    isSelected
                                      ? 'bg-amber-950/60 text-amber-200'
                                      : 'hover:bg-gray-900 text-gray-300'
                                  }`}
                                >
                                  <div>
                                    <span className="font-semibold block">{aff.nombre}</span>
                                    <span className="text-[10px] text-gray-400">
                                      Código: <strong className="text-amber-400">{aff.codigoReferido}</strong> • {aff.email}
                                    </span>
                                  </div>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-gray-900 border border-gray-800 text-amber-400 font-mono font-semibold">
                                    {aff.rango ? aff.rango.toUpperCase() : 'BRONCE'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-900/60 border border-gray-800 rounded-lg text-center text-xs text-gray-400">
                          No se encontraron afiliados o asesores comerciales con ese criterio.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Asesor Seleccionado o Selector Tradicional */}
                  {selectedAffiliateObj ? (
                    <div className="p-2.5 bg-amber-950/25 border border-amber-800/50 rounded-lg flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-amber-950 border border-amber-700/60 flex items-center justify-center text-amber-400">
                          <Check className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-xs">
                            {selectedAffiliateObj.nombre}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Cód: <strong className="text-amber-400">{selectedAffiliateObj.codigoReferido}</strong> • Comisión liquidada a su billetera
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-950/80 px-2.5 py-1 rounded-full border border-amber-700/50">
                        Asesor Asignado
                      </span>
                    </div>
                  ) : (
                    <select
                      value={saleForm.afiliadoId}
                      onChange={(e) => setSaleForm({ ...saleForm, afiliadoId: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">-- Sin asesor comercial (Venta directa de {currentUser?.nombre || 'la plataforma'}) --</option>
                      {saleAffiliates.map((aff: any) => (
                        <option key={aff.id} value={aff.id}>
                          {aff.nombre} (Cód: {aff.codigoReferido}) - {aff.email}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* SECCIÓN DE COMPROBANTE DE PAGO (OBLIGATORIO PARA MEDIOS ELECTRÓNICOS) */}
                {(() => {
                  const isSaleCash = Boolean(
                    saleForm.metodoPago &&
                    (saleForm.metodoPago.toLowerCase().includes('efectivo') ||
                     saleForm.metodoPago.toLowerCase().includes('cash'))
                  );

                  return (
                    <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-4 h-4 text-purple-400" />
                          <span className="font-semibold text-white text-[11px] uppercase tracking-wider">
                            Comprobante de Pago
                          </span>
                        </div>
                        {isSaleCash ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                            <CheckCircle2 className="w-3 h-3" />
                            Pago en Efectivo (Sin soporte digital)
                          </span>
                        ) : saleReceiptImage ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                            <FileCheck className="w-3 h-3" />
                            Comprobante Adjunto
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/50">
                            <AlertCircle className="w-3 h-3" />
                            Requerido para activar
                          </span>
                        )}
                      </div>

                      {saleReceiptImage ? (
                        <div className="flex flex-col sm:flex-row items-center gap-3 bg-gray-900/80 p-3 rounded-xl border border-gray-800">
                          <div
                            onClick={() => setZoomedImage(saleReceiptImage)}
                            className="relative group cursor-pointer w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-gray-700 flex-shrink-0 bg-black"
                            data-tooltip="Ver"
                          >
                            <img
                              src={saleReceiptImage}
                              alt="Comprobante de Pago"
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <ZoomIn className="w-5 h-5 text-white" />
                            </div>
                          </div>

                          <div className="flex-1 space-y-1.5 text-center sm:text-left">
                            <p className="text-white font-medium text-xs">Comprobante de pago verificado</p>
                            <p className="text-[11px] text-gray-400">
                              Esta imagen quedará registrada en la base de datos asociada únicamente a esta venta.
                            </p>
                            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setZoomedImage(saleReceiptImage)}
                                data-tooltip="Ver"
                                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <ZoomIn className="w-3.5 h-3.5 text-purple-400" />
                                <span>Ver Completo</span>
                              </button>

                              <label
                                data-tooltip="Editar"
                                className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5 text-blue-400" />
                                <span>Cambiar Imagen</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSaleReceiptFileChange}
                                  className="hidden"
                                />
                              </label>

                              <button
                                type="button"
                                onClick={() => setSaleReceiptImage(null)}
                                data-tooltip="Eliminar"
                                className="px-2.5 py-1 bg-red-950/60 hover:bg-red-900/60 border border-red-800/50 text-red-300 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Quitar</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          {isSaleCash ? (
                            <div className="space-y-2">
                              <p className="text-[11px] text-gray-400 italic">
                                El cliente pagó en efectivo. La activación y confirmación de la venta está permitida directamente sin necesidad de comprobante digital.
                              </p>
                              <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-800 text-gray-300 text-xs cursor-pointer transition-colors">
                                <Upload className="w-3.5 h-3.5 text-purple-400" />
                                <span>Adjuntar recibo físico opcional</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSaleReceiptFileChange}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-[11px] text-amber-300/90 flex items-start gap-2">
                                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                <span>
                                  Para ventas con pago por <strong>{saleForm.metodoPago}</strong> (Nequi, Bancolombia, Daviplata, Bre-B, Tarjeta Débito, PSE, etc.) <strong>es obligatorio adjuntar la imagen del comprobante</strong> como soporte para activar el botón de registrar venta.
                                </span>
                              </div>

                              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 hover:border-purple-500/80 bg-gray-900/60 hover:bg-purple-950/10 rounded-xl p-4 cursor-pointer transition-all">
                                <div className="w-10 h-10 rounded-full bg-purple-950/70 border border-purple-800/50 flex items-center justify-center text-purple-400 mb-2">
                                  <Upload className="w-5 h-5" />
                                </div>
                                <p className="text-white font-medium text-xs">Haga clic o arrastre el comprobante de pago aquí</p>
                                <p className="text-[10px] text-gray-400 mt-0.5">Formatos válidos: PNG, JPG, JPEG, WEBP (Hasta 20MB)</p>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleSaleReceiptFileChange}
                                  className="hidden"
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Switch Despacho Inmediato */}
                <div className="p-3 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-white block">
                      Despacho Inmediato de Credenciales (Recomendado)
                    </span>
                    <span className="text-[11px] text-gray-400">
                      Asigna la cuenta FIFO, marca la orden como PAGADA y acredita tu comisión al instante.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSaleForm({ ...saleForm, despachoInmediato: !saleForm.despachoInmediato })}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                      saleForm.despachoInmediato ? 'bg-emerald-600 justify-end' : 'bg-gray-800 justify-start'
                    }`}
                  >
                    <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                  </button>
                </div>

                {/* Resumen Financiero de la Venta */}
                {(() => {
                  const sel = salePlans.find((p: any) => p.id === saleForm.planId);
                  const totalVenta = (sel ? Number(sel.precio) : 0) * (saleForm.cantidad || 1);
                  return (
                    <div className="p-4 rounded-xl bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950 border border-gray-800 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-gray-400 block">Total a Cobrar al Cliente:</span>
                        <span className="text-xl font-black text-emerald-400 font-mono">
                          {formatCOP(totalVenta)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-gray-400 block uppercase tracking-wider">
                          {selectedAffiliateObj ? 'Canal / Asesor Asignado:' : 'Canal / Vendedor:'}
                        </span>
                        <span className="text-xs font-bold text-gray-200 flex items-center justify-end gap-1">
                          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                          <span>
                            {selectedAffiliateObj
                              ? `${selectedAffiliateObj.nombre} (Op: ${currentUser?.nombre || 'Admin'})`
                              : (currentUser?.nombre || 'Vendedor')}
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })()}
                </div>

                {/* Botones de acción fijos abajo */}
                {(() => {
                  const isSaleCash = Boolean(
                    saleForm.metodoPago &&
                    (saleForm.metodoPago.toLowerCase().includes('efectivo') ||
                     saleForm.metodoPago.toLowerCase().includes('cash'))
                  );
                  const canConfirmSale = isSaleCash || Boolean(saleReceiptImage);

                  return (
                    <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setShowSaleModal(false);
                          setSaleReceiptImage(null);
                        }}
                        data-tooltip="Cerrar"
                        className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={submittingSale || !canConfirmSale}
                        data-tooltip={canConfirmSale ? 'Registrar' : 'Bloqueado'}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                          canConfirmSale
                            ? 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-lg shadow-red-600/20 cursor-pointer'
                            : 'bg-gray-800 text-gray-500 border border-gray-700/50 cursor-not-allowed opacity-60'
                        }`}
                      >
                        {submittingSale ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Procesando Venta...</span>
                          </>
                        ) : !canConfirmSale ? (
                          <>
                            <Lock className="w-4 h-4 text-gray-500" />
                            <span>Registrar y Confirmar Venta (Requiere Soporte)</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            <span>Registrar y Confirmar Venta</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })()}
              </form>
            )})()}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ÉXITO DE VENTA Y ENTREGA DE CREDENCIALES */}
      {/* ======================================================== */}
      {saleSuccessData && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">¡Venta Realizada con Éxito!</h3>
              </div>
              <button
                onClick={() => setSaleSuccessData(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-white">¡Venta Realizada con Éxito!</h3>
              <p className="text-xs text-gray-400">
                La orden <strong className="text-gray-200">#{saleSuccessData.orderId?.slice(0, 8)}</strong> ha sido pagada y despachada correctamente.
              </p>
            </div>

            {/* Resumen económico */}
            <div className="grid grid-cols-2 gap-2 bg-gray-950 p-3 rounded-xl border border-gray-800 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px]">Total Venta:</span>
                <span className="font-bold text-emerald-400 font-mono text-sm">
                  {formatCOP(saleSuccessData.total)}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Tu Ganancia / Comisión:</span>
                <span className="font-bold text-blue-400 font-mono text-sm">
                  +{formatCOP(saleSuccessData.vendedor?.comision)} ({saleSuccessData.vendedor?.porcentaje})
                </span>
              </div>
            </div>

            {/* Credenciales Despachadas */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider block">
                Credenciales Asignadas para Entrega:
              </span>
              {saleSuccessData.suscripciones?.map((s: any, idx: number) => (
                <div key={idx} className="bg-gray-950 border border-gray-800 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-850">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-red-500" />
                      <span>{s.servicio} - {s.plan}</span>
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Vence: {new Date(s.fechaVencimiento).toLocaleDateString('es-CO')}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between bg-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-800">
                      <span className="text-gray-400">Email:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white truncate max-w-[120px]">{s.emailCuenta}</span>
                        <button
                          onClick={() => handleCopy(s.emailCuenta, `email-${idx}`)}
                          className="text-gray-400 hover:text-white"
                          data-tooltip="Copiar"
                        >
                          {copiedKey === `email-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-800">
                      <span className="text-gray-400">Clave:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-white">{s.passwordCuenta}</span>
                        <button
                          onClick={() => handleCopy(s.passwordCuenta, `pass-${idx}`)}
                          className="text-gray-400 hover:text-white"
                          data-tooltip="Copiar"
                        >
                          {copiedKey === `pass-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {s.perfilAsignado && (
                      <div className="flex items-center justify-between bg-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-800">
                        <span className="text-gray-400">Perfil:</span>
                        <span className="text-amber-400 font-bold">{s.perfilAsignado}</span>
                      </div>
                    )}

                    {s.pinPerfil && (
                      <div className="flex items-center justify-between bg-gray-900 px-2.5 py-1.5 rounded-lg border border-gray-800">
                        <span className="text-gray-400">PIN:</span>
                        <span className="text-cyan-400 font-bold">{s.pinPerfil}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            </div>

            {/* Acciones de entrega rápida */}
            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex flex-col sm:flex-row gap-2">
              {saleSuccessData.cliente?.whatsapp && (
                <a
                  href={`https://wa.me/${saleSuccessData.cliente.whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `¡Hola ${saleSuccessData.cliente.nombre || ''}! Gracias por tu compra. Aquí tienes las credenciales de tu cuenta de streaming:\n` +
                      saleSuccessData.suscripciones
                        ?.map(
                          (s: any) =>
                            `📺 ${s.servicio} (${s.plan})\n📧 Correo: ${s.emailCuenta}\n🔑 Contraseña: ${s.passwordCuenta}${
                              s.perfilAsignado ? `\n👤 Perfil: ${s.perfilAsignado}` : ''
                            }${s.pinPerfil ? `\n🔒 PIN: ${s.pinPerfil}` : ''}\n📅 Vence: ${new Date(s.fechaVencimiento).toLocaleDateString('es-CO')}`,
                        )
                        .join('\n\n') +
                      `\n\n¡Que lo disfrutes! Si necesitas ayuda o garantía, contáctanos.`,
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 transition cursor-pointer"
                  data-tooltip="WhatsApp"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </a>
              )}

              <button
                onClick={() => setSaleSuccessData(null)}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
