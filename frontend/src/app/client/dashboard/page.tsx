'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  Tv,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  ShieldCheck,
  RefreshCw,
  HelpCircle,
  ShoppingBag,
  User,
  Phone,
  Globe,
  Loader2,
  X,
  Send,
  Calendar,
  Layers,
  FileText,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  ArrowRight,
  Sparkles,
  CreditCard,
  Search,
  Headset,
  ExternalLink,
  Upload,
  Landmark,
  Image as ImageIcon,
  Ban,
  Smartphone,
  KeyRound,
} from 'lucide-react';
import TablePagination from '@/components/TablePagination';
import { useDialog } from '@/components/Dialog';

const NORMAS_USO_TEXT = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

export default function ClientDashboardPage() {
  const { alert } = useDialog();
  const [summary, setSummary] = useState<any>(null);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'subs' | 'plans' | 'orders' | 'tickets' | 'profile'>('subs');

  // Paginación (10 filas máx)
  const [currentOrdersPage, setCurrentOrdersPage] = useState(1);
  const [currentTicketsPage, setCurrentTicketsPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const paginatedOrders = useMemo(() => {
    const start = (currentOrdersPage - 1) * ITEMS_PER_PAGE;
    return orders.slice(start, start + ITEMS_PER_PAGE);
  }, [orders, currentOrdersPage]);

  const paginatedTickets = useMemo(() => {
    const start = (currentTicketsPage - 1) * ITEMS_PER_PAGE;
    return tickets.slice(start, start + ITEMS_PER_PAGE);
  }, [tickets, currentTicketsPage]);

  // Modal de Detalle de la Orden de Venta
  const [viewingOrder, setViewingOrder] = useState<any | null>(null);
  const [cancelledViewingOrder, setCancelledViewingOrder] = useState<any | null>(null);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);
  const [viewingReceiptFile, setViewingReceiptFile] = useState<File | null>(null);
  const [viewingReceiptPreview, setViewingReceiptPreview] = useState<string | null>(null);
  const [viewingUploadingReceipt, setViewingUploadingReceipt] = useState(false);
  const [viewingReceiptSuccessMsg, setViewingReceiptSuccessMsg] = useState('');
  const [viewingReceiptErrorMsg, setViewingReceiptErrorMsg] = useState('');
  const [isEditingViewingReceipt, setIsEditingViewingReceipt] = useState(false);
  const [previewLightboxUrl, setPreviewLightboxUrl] = useState<string | null>(null);

  // Catálogo de Planes Disponibles dentro del Portal
  const [services, setServices] = useState<any[]>([]);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Modal de Compra dentro del Portal
  const [selectedPlanForPurchase, setSelectedPlanForPurchase] = useState<any | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState('Nequi / Bancolombia / Daviplata');
  const [purchaseLoading, setPurchaseLoading] = useState(false);
  const [purchaseSuccessOrder, setPurchaseSuccessOrder] = useState<any | null>(null);
  const [purchaseError, setPurchaseError] = useState('');

  // Comprobante de pago y copiado de datos de consignación
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState('');
  const [receiptErrorMsg, setReceiptErrorMsg] = useState('');
  const [copiedPaymentField, setCopiedPaymentField] = useState<string | null>(null);

  // Copiado y claves
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});

  // Modal de Garantía
  const [showWarrantyModal, setShowWarrantyModal] = useState(false);
  const [selectedSubForWarranty, setSelectedSubForWarranty] = useState<any | null>(null);
  const [warrantyReason, setWarrantyReason] = useState('clave_incorrecta');
  const [warrantyDetails, setWarrantyDetails] = useState('');
  const [warrantyLoading, setWarrantyLoading] = useState(false);
  const [warrantySuccessMsg, setWarrantySuccessMsg] = useState('');

  // Modal de Renovación
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedSubForRenew, setSelectedSubForRenew] = useState<any | null>(null);
  const [renewMethod, setRenewMethod] = useState('Nequi');
  const [renewLoading, setRenewLoading] = useState(false);
  const [renewReceiptFile, setRenewReceiptFile] = useState<File | null>(null);
  const [renewReceiptPreview, setRenewReceiptPreview] = useState<string | null>(null);
  const [renewCopiedKey, setRenewCopiedKey] = useState<string | null>(null);
  const [renewSuccessData, setRenewSuccessData] = useState<any | null>(null);
  const [renewErrorMsg, setRenewErrorMsg] = useState('');

  // Perfil
  const [profileData, setProfileData] = useState({
    nombre: '',
    whatsapp: '',
    pais: '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');

  // 2FA Google Authenticator (Opcional para Clientes)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorSetupData, setTwoFactorSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [twoFactorInputCode, setTwoFactorInputCode] = useState('');
  const [twoFactorActionLoading, setTwoFactorActionLoading] = useState(false);
  const [twoFactorActionError, setTwoFactorActionError] = useState('');
  const [copied2FASecret, setCopied2FASecret] = useState(false);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      const [sumRes, subsRes, ordRes, tickRes, servRes, plansRes, setRes] = await Promise.all([
        api.get('/portal/summary'),
        api.get('/portal/subscriptions'),
        api.get('/portal/orders'),
        api.get('/portal/tickets'),
        api.get('/services'),
        api.get('/plans'),
        api.get('/settings').catch(() => ({ data: null })),
      ]);

      setSummary(sumRes.data);
      setSubscriptions(subsRes.data);
      setOrders(ordRes.data);
      setTickets(tickRes.data);
      setServices(servRes.data);
      setAvailablePlans(plansRes.data);
      if (setRes?.data) setSettings(setRes.data);

      setProfileData({
        nombre: sumRes.data.nombre || '',
        whatsapp: sumRes.data.whatsapp || '',
        pais: sumRes.data.pais || '',
      });

      // Obtener estado 2FA del cliente
      api.get('/auth/me').then((meRes) => {
        if (meRes.data?.user?.twoFactorEnabled !== undefined) {
          setTwoFactorEnabled(Boolean(meRes.data.user.twoFactorEnabled));
        }
      }).catch(() => {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen2FAModal = async () => {
    setTwoFactorActionError('');
    setTwoFactorInputCode('');
    setCopied2FASecret(false);

    if (!twoFactorEnabled) {
      setTwoFactorActionLoading(true);
      setShow2FAModal(true);
      try {
        const res = await api.get('/auth/2fa/setup');
        setTwoFactorSetupData(res.data);
      } catch (err: any) {
        setTwoFactorActionError(err.response?.data?.message || 'Error al generar código QR de 2FA');
      } finally {
        setTwoFactorActionLoading(false);
      }
    } else {
      setTwoFactorSetupData(null);
      setShow2FAModal(true);
    }
  };

  const handleToggle2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorInputCode.trim().length !== 6) return;

    setTwoFactorActionLoading(true);
    setTwoFactorActionError('');

    try {
      if (!twoFactorEnabled) {
        await api.post('/auth/2fa/toggle', {
          enable: true,
          secret: twoFactorSetupData?.secret,
          code: twoFactorInputCode.trim(),
        });
        setTwoFactorEnabled(true);
        setShow2FAModal(false);
        await alert('¡Google Authenticator ha sido activado exitosamente para tu cuenta de cliente!', {
          type: 'success',
          title: '2FA Activado',
        });
      } else {
        await api.post('/auth/2fa/toggle', {
          enable: false,
          code: twoFactorInputCode.trim(),
        });
        setTwoFactorEnabled(false);
        setShow2FAModal(false);
        await alert('La autenticación en dos pasos ha sido desactivada.', {
          type: 'info',
          title: '2FA Desactivado',
        });
      }
    } catch (err: any) {
      setTwoFactorActionError(err.response?.data?.message || 'Código incorrecto. Verifica la aplicación Google Authenticator.');
    } finally {
      setTwoFactorActionLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const togglePassword = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const resetViewingReceiptState = () => {
    setViewingReceiptFile(null);
    setViewingReceiptPreview(null);
    setViewingUploadingReceipt(false);
    setViewingReceiptSuccessMsg('');
    setViewingReceiptErrorMsg('');
    setIsEditingViewingReceipt(false);
  };

  const handleCloseViewingOrder = () => {
    setViewingOrder(null);
    resetViewingReceiptState();
  };

  const handleViewingReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await alert('Por favor selecciona una imagen válida (JPG, PNG o WebP)', { type: 'warning', title: 'Formato inválido' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      await alert('La imagen no debe superar los 8MB', { type: 'warning', title: 'Archivo muy grande' });
      return;
    }

    setViewingReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setViewingReceiptPreview(reader.result as string);
      setViewingReceiptErrorMsg('');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveViewingReceipt = async (orderId: string) => {
    if (viewingOrder?.comprobanteVerificado) {
      await alert('El comprobante de pago de esta orden ya ha sido verificado. No se permite adjuntar un nuevo comprobante ni modificar el existente (modo de solo lectura).', {
        type: 'warning',
        title: 'Comprobante Verificado',
      });
      return;
    }
    if (!viewingReceiptPreview) {
      await alert('Por favor selecciona la imagen de tu comprobante de pago primero.', { type: 'warning', title: 'Comprobante requerido' });
      return;
    }

    setViewingUploadingReceipt(true);
    setViewingReceiptErrorMsg('');
    try {
      await api.patch(`/orders/${orderId}/receipt`, {
        comprobanteUrl: viewingReceiptPreview,
      });

      // Actualizar la orden en vista
      setViewingOrder((prev: any) => (prev ? { ...prev, comprobanteUrl: viewingReceiptPreview } : null));

      // Actualizar la lista local de órdenes
      setOrders((prev: any[]) =>
        prev.map((o) => (o.id === orderId ? { ...o, comprobanteUrl: viewingReceiptPreview } : o))
      );

      setViewingReceiptFile(null);
      setViewingReceiptPreview(null);
      setIsEditingViewingReceipt(false);
      setViewingReceiptSuccessMsg('¡Comprobante adjuntado exitosamente a tu orden de compra!');

      await alert('El comprobante de pago ha sido guardado exitosamente en la orden de compra y registrado en la base de datos.', {
        type: 'success',
        title: 'Comprobante Guardado',
      });

      fetchClientData();
    } catch (err: any) {
      setViewingReceiptErrorMsg(err.response?.data?.message || 'Error al guardar el comprobante de pago');
    } finally {
      setViewingUploadingReceipt(false);
    }
  };

  const extractMotivoCancelacion = (order: any): string => {
    if (order?.motivoCancelacion) return order.motivoCancelacion;
    const desc = order?.descripcionVenta;
    if (!desc) return 'Cancelación de la orden por parte del administrador.';
    const m = desc.match(/\[VENTA CANCELADA[^\]]*\]:\s*(.+)$/i);
    if (m && m[1]) return m[1].trim();
    const m2 = desc.match(/Motivo:\s*([^|]+)/i);
    if (m2 && m2[1]) return m2[1].trim();
    return desc;
  };

  // Ver Detalle de la Orden de Venta
  const handleViewOrderDetails = async (orderId: string, preloadedOrder?: any) => {
    resetViewingReceiptState();

    let orderData = preloadedOrder;
    if (!orderData) {
      orderData = orders.find((o) => o.id === orderId);
    }

    if (orderData && (orderData.estado === 'CANCELADO' || orderData.estado === 'CANCELADA')) {
      setCancelledViewingOrder(orderData);
      return;
    }

    if (orderData && orderData.items && orderData.items.length > 0) {
      setViewingOrder(orderData);
      return;
    }

    try {
      setLoadingOrderDetails(true);
      const res = await api.get(`/portal/orders/${orderId}`);
      if (res.data?.estado === 'CANCELADO' || res.data?.estado === 'CANCELADA') {
        setCancelledViewingOrder(res.data);
      } else {
        setViewingOrder(res.data);
      }
    } catch (err: any) {
      await alert(err.response?.data?.message || 'No se pudo cargar el detalle de la orden de venta', { type: 'error', title: 'Error de Carga' });
    } finally {
      setLoadingOrderDetails(false);
    }
  };

  // Abrir Garantía / Soporte desde una Orden de Venta
  const handleOpenWarrantyFromOrder = (order: any, subItem?: any) => {
    let targetSub = null;
    if (subItem) {
      targetSub = subscriptions.find((s) => s.id === subItem.id) || subItem;
    }
    if (!targetSub && order.subscriptions && order.subscriptions.length > 0) {
      targetSub = subscriptions.find((s) => s.id === order.subscriptions[0].id) || order.subscriptions[0];
    }
    if (!targetSub && order.items && order.items.length > 0) {
      targetSub = subscriptions.find((s) => s.orderId === order.id || s.plan === order.items[0].plan);
    }

    if (!targetSub && order) {
      targetSub = {
        id: order.subscriptions?.[0]?.id || order.id,
        orderId: order.id,
        servicio: order.items?.[0]?.servicio || 'Servicio Digital',
        plan: order.items?.[0]?.plan || 'Plan Streaming',
      };
    }

    if (targetSub) {
      setSelectedSubForWarranty(targetSub);
      setWarrantyDetails(`Referencia Orden de Venta: #ORD-${order.id.substring(0, 8).toUpperCase()} (ID: ${order.id})`);
      setShowWarrantyModal(true);
    } else {
      const whatsappNumber = (settings?.whatsappNumber || '573000000000').replace(/[^0-9]/g, '');
      const msg = encodeURIComponent(
        `Hola, requiero soporte para mi compra con ID: #ORD-${order.id.substring(0, 8).toUpperCase()} (ID: ${order.id}). Servicio: ${order.items?.[0]?.servicio || 'Plataforma'}`
      );
      window.open(`https://wa.me/${whatsappNumber}?text=${msg}`, '_blank');
    }
  };

  const handleCopyPaymentInfo = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPaymentField(fieldKey);
    setTimeout(() => {
      setCopiedPaymentField((curr) => (curr === fieldKey ? null : curr));
    }, 2000);
  };

  const handleReceiptFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await alert('Por favor selecciona una imagen válida (JPG, PNG o WebP)', { type: 'warning', title: 'Formato inválido' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      await alert('La imagen no debe superar los 8MB', { type: 'warning', title: 'Archivo muy grande' });
      return;
    }

    setReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUploadReceipt = async (orderId: string) => {
    if (!receiptPreview) {
      await alert('Por favor selecciona la imagen de tu comprobante de pago primero.', { type: 'warning', title: 'Comprobante requerido' });
      return;
    }

    setUploadingReceipt(true);
    setReceiptErrorMsg('');
    try {
      await api.patch(`/orders/${orderId}/receipt`, {
        comprobanteUrl: receiptPreview,
      });

      setReceiptSuccessMsg('¡Comprobante adjuntado con éxito! Tu orden continuará en estado PENDIENTE hasta que sea validada y aprobada por el administrador.');
      
      setPurchaseSuccessOrder((prev: any) => ({
        ...prev,
        order: {
          ...prev?.order,
          comprobanteUrl: receiptPreview,
        },
      }));

      fetchClientData();
    } catch (err: any) {
      setReceiptErrorMsg(err.response?.data?.message || 'Error al subir el comprobante de pago');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Abrir modal de compra dentro del portal
  const handleOpenPurchase = async (plan: any) => {
    if (plan.stockDisponible !== undefined && plan.stockDisponible <= 0) {
      await alert('Este plan se encuentra temporalmente agotado.', { type: 'warning', title: 'Plan Agotado' });
      return;
    }
    setSelectedPlanForPurchase(plan);
    setPurchaseSuccessOrder(null);
    setPurchaseError('');
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptSuccessMsg('');
    setReceiptErrorMsg('');
    setCopiedPaymentField(null);
    setShowPurchaseModal(true);
  };

  // Confirmar compra desde el portal
  const handleConfirmPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanForPurchase) return;

    setPurchaseLoading(true);
    setPurchaseError('');

    try {
      // Obtener customerId de summary o de cookie
      let customerId = summary?.customerId;
      if (!customerId) {
        const userCookie = Cookies.get('user');
        if (userCookie) {
          const parsed = JSON.parse(userCookie);
          customerId = parsed.customerId;
        }
      }

      if (!customerId) {
        setPurchaseError('No se pudo identificar tu cuenta de cliente. Por favor recarga la página.');
        setPurchaseLoading(false);
        return;
      }

      const orderRes = await api.post('/orders', {
        customerId,
        items: [{ planId: selectedPlanForPurchase.id, cantidad: 1 }],
        metodoPago: purchasePaymentMethod,
      });

      setPurchaseSuccessOrder(orderRes.data);

      // Refrescar órdenes y resumen en segundo plano
      const [sumRes, ordRes] = await Promise.all([
        api.get('/portal/summary'),
        api.get('/portal/orders'),
      ]);
      setSummary(sumRes.data);
      setOrders(ordRes.data);
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setPurchaseError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al procesar la compra');
    } finally {
      setPurchaseLoading(false);
    }
  };

  const handleRequestWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForWarranty) return;

    setWarrantyLoading(true);
    try {
      const res = await api.post('/portal/warranty', {
        subscriptionId: selectedSubForWarranty.id,
        motivoReporte: warrantyReason,
        descripcionAdicional: warrantyDetails.trim() || undefined,
      });

      setWarrantySuccessMsg(res.data?.mensajeCliente || 'Reporte enviado con éxito');
      setTimeout(() => {
        setWarrantySuccessMsg('');
        setShowWarrantyModal(false);
        fetchClientData();
      }, 2500);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al enviar reporte de garantía', { type: 'error', title: 'Error al Enviar' });
    } finally {
      setWarrantyLoading(false);
    }
  };

  const handleCopyRenewField = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setRenewCopiedKey(key);
    setTimeout(() => {
      setRenewCopiedKey((curr) => (curr === key ? null : curr));
    }, 2000);
  };

  const handleRenewReceiptChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      await alert('Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP)', { type: 'warning', title: 'Formato inválido' });
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      await alert('La imagen no debe superar los 8MB', { type: 'warning', title: 'Archivo muy grande' });
      return;
    }

    setRenewReceiptFile(file);
    const reader = new FileReader();
    reader.onload = () => {
      setRenewReceiptPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenRenewModal = (sub: any) => {
    setSelectedSubForRenew(sub);
    setRenewReceiptFile(null);
    setRenewReceiptPreview(null);
    setRenewSuccessData(null);
    setRenewErrorMsg('');
    setShowRenewModal(true);
  };

  const handleRenew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForRenew) return;

    setRenewLoading(true);
    setRenewErrorMsg('');
    try {
      const res = await api.post('/portal/renew', {
        subscriptionId: selectedSubForRenew.id,
        metodoPago: renewMethod,
        comprobanteUrl: renewReceiptPreview || undefined,
      });

      setRenewSuccessData({
        orderId: res.data.orderId,
        total: res.data.total,
        message: res.data.message,
        sub: selectedSubForRenew,
        receipt: renewReceiptPreview,
      });
      fetchClientData();
    } catch (err: any) {
      setRenewErrorMsg(err.response?.data?.message || 'Error al procesar la renovación');
    } finally {
      setRenewLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await api.patch('/portal/profile', profileData);
      setProfileSuccessMsg('¡Perfil actualizado con éxito!');
      setTimeout(() => setProfileSuccessMsg(''), 3000);
      fetchClientData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al actualizar perfil', { type: 'error', title: 'Error de Perfil' });
    } finally {
      setSavingProfile(false);
    }
  };

  const formatCOP = (val: any) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(val) || 0);
  };

  const filteredAvailablePlans = availablePlans.filter((p) => {
    if (catalogCategory === 'all') return true;
    return p.serviceId === catalogCategory;
  });

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        <p className="text-xs text-gray-400">Cargando tus suscripciones y credenciales...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de Modo Mantenimiento si está activo */}
      {settings?.mantenimiento && (
        <div className="p-4 bg-amber-950/60 border border-amber-800/80 rounded-2xl flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="block text-amber-300 font-bold">Aviso del Sistema: Modo Mantenimiento Activo</strong>
            <p className="mt-0.5 text-amber-200/90 leading-relaxed">
              {settings.mensajeMantenimiento ||
                'Estamos realizando labores de mantenimiento preventivo en el servidor. Tus cuentas activas continúan operando con normalidad.'}
            </p>
          </div>
        </div>
      )}

      {/* Banner de Bienvenida y Resumen */}
      <div className="bg-gradient-to-r from-red-950/40 via-gray-900/60 to-gray-900/40 border border-red-900/30 rounded-2xl p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Mi Panel de Suscripciones
            </span>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-0.5">
              ¡Hola, {summary?.nombre || 'Cliente'}! 👋
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Aquí puedes ver tus accesos, copiar tus contraseñas, comprar nuevos planes y reportar problemas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2 bg-gray-950/80 border border-gray-800 rounded-xl text-center">
              <span className="text-xs text-gray-400 block">Suscripciones</span>
              <span className="text-lg font-bold text-white">{summary?.suscripcionesActivas || 0}</span>
            </div>
            <div className="px-4 py-2 bg-gray-950/80 border border-gray-800 rounded-xl text-center">
              <span className="text-xs text-gray-400 block">Por Vencer</span>
              <span className="text-lg font-bold text-amber-400">{summary?.porVencer || 0}</span>
            </div>

            {/* BOTÓN RÁPIDO PARA COMPRAR NUEVO PLAN */}
            <button
              onClick={() => setActiveTab('plans')}
              className="px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/25 flex items-center gap-2 cursor-pointer transition-all hover:scale-105"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Comprar Nuevo Plan</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs de Navegación */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('subs')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'subs'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          Mis Cuentas Activas ({subscriptions.length})
        </button>

        {/* PESTAÑA: PLANES DISPONIBLES / COMPRAR */}
        <button
          onClick={() => setActiveTab('plans')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'plans'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-300 hover:text-white hover:bg-gray-900 border border-red-900/40 bg-red-950/20'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-red-400" />
          <span>Planes Disponibles ({availablePlans.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          Historial de Pedidos ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'tickets'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          Garantías & Tickets ({tickets.length})
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
            activeTab === 'profile'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          Ajustes de Perfil
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: MIS SUSCRIPCIONES */}
      {/* ========================================================================= */}
      {activeTab === 'subs' && (
        <div className="space-y-4">
          {subscriptions.length === 0 ? (
            <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-12 text-center space-y-4">
              <Tv className="w-12 h-12 text-gray-600 mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">No tienes suscripciones activas</h3>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Explora nuestro catálogo y adquiere tus plataformas favoritas para disfrutar de inmediato con garantía completa.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('plans')}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Explorar Planes Disponibles</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {subscriptions.map((sub) => {
                const isRevealed = revealedPasswords[sub.id];
                const isExpiringSoon = sub.diasRestantes <= 3;

                return (
                  <div
                    key={sub.id}
                    className="bg-gray-900/70 border border-gray-800/80 hover:border-gray-700/90 rounded-2xl p-6 backdrop-blur-md flex flex-col justify-between space-y-5 transition-all shadow-xl"
                  >
                    <div>
                      {/* Cabecera */}
                      <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                        <div className="flex items-center gap-3">
                          {sub.logoUrl ? (
                            <img
                              src={sub.logoUrl}
                              alt={sub.servicio}
                              className="w-10 h-10 object-contain rounded-xl bg-black/40 p-1 border border-gray-800 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center font-bold text-red-400">
                              {sub.servicio.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <h3 className="text-base font-bold text-white">{sub.servicio}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <p className="text-xs text-gray-400">{sub.plan}</p>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                              isExpiringSoon
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                                : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                            }`}
                          >
                            {sub.diasRestantes > 0
                              ? `${sub.diasRestantes} días restantes`
                              : 'Vence Hoy'}
                          </span>
                          <span className="block text-[10px] text-gray-500 mt-0.5">
                            Vence: {new Date(sub.fechaVencimiento).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Tarjeta de Credenciales */}
                      <div className="mt-4 bg-gray-950/90 border border-gray-800 rounded-xl p-4 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                            Datos de Acceso
                          </span>
                          <span className="text-[10px] text-emerald-400 font-medium">Garantía Activa</span>
                        </div>

                        {/* Correo */}
                        <div className="flex items-center justify-between bg-gray-900/80 px-3 py-2 rounded-lg border border-gray-850">
                          <div className="overflow-hidden pr-2">
                            <span className="text-[10px] text-gray-500 block">Correo / Usuario</span>
                            <span className="font-mono text-gray-200 truncate block">
                              {sub.credenciales?.email}
                            </span>
                          </div>
                          <button
                            onClick={() => handleCopy(sub.credenciales?.email, `${sub.id}-email`)}
                            className="text-gray-400 hover:text-white p-1 cursor-pointer"
                            data-tooltip="Copiar correo"
                          >
                            {copiedKey === `${sub.id}-email` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Contraseña */}
                        <div className="flex items-center justify-between bg-gray-900/80 px-3 py-2 rounded-lg border border-gray-850">
                          <div>
                            <span className="text-[10px] text-gray-500 block">Contraseña</span>
                            <span className="font-mono text-gray-200">
                              {isRevealed ? sub.credenciales?.password : '••••••••••••'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => togglePassword(sub.id)}
                              className="text-gray-400 hover:text-white p-1 cursor-pointer"
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopy(sub.credenciales?.password, `${sub.id}-pass`)}
                              className="text-gray-400 hover:text-white p-1 cursor-pointer"
                              data-tooltip="Copiar contraseña"
                            >
                              {copiedKey === `${sub.id}-pass` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Perfil & PIN */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-900/80 px-3 py-2 rounded-lg border border-gray-850">
                            <span className="text-[10px] text-gray-500 block">Perfil Asignado</span>
                            <span className="font-semibold text-emerald-400 truncate block">
                              {sub.credenciales?.perfil || 'Principal'}
                            </span>
                          </div>
                          <div className="bg-gray-900/80 px-3 py-2 rounded-lg border border-gray-850">
                            <span className="text-[10px] text-gray-500 block">PIN de Perfil</span>
                            <span className="font-mono font-bold text-amber-400">
                              {sub.credenciales?.pin || 'Sin PIN'}
                            </span>
                          </div>
                        </div>

                        {/* Botón copiar todo */}
                        <button
                          onClick={() =>
                            handleCopy(
                              `Servicio: ${sub.servicio}\nPlan: ${sub.plan}\nCorreo: ${sub.credenciales?.email}\nContraseña: ${sub.credenciales?.password}\nPerfil: ${sub.credenciales?.perfil || 'Principal'}\nPIN: ${sub.credenciales?.pin || 'N/A'}`,
                              sub.id
                            )
                          }
                          className="w-full py-1.5 rounded-lg bg-gray-900 hover:bg-gray-850 border border-gray-800 text-[11px] font-medium text-gray-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedKey === sub.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">¡Credenciales copiadas al portapapeles!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copiar Todo el Acceso</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* ID de la Compra / Orden de Venta */}
                      <div className="mt-3 bg-gray-950/70 border border-purple-900/30 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">
                              ID de la Compra / Orden de Venta
                            </span>
                            <span className="font-mono text-purple-300 font-bold text-xs">
                              {sub.orderId ? `#ORD-${sub.orderId.substring(0, 8).toUpperCase()}` : 'Venta Directa'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {sub.orderId && (
                            <>
                              <button
                                onClick={() => handleCopy(sub.orderId, `${sub.id}-orderId`)}
                                data-tooltip="Copiar"
                                className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition-colors cursor-pointer border border-gray-800"
                              >
                                {copiedKey === `${sub.id}-orderId` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                onClick={() => handleViewOrderDetails(sub.orderId, sub.order)}
                                data-tooltip="Detalle"
                                className="px-2.5 py-1.5 rounded-lg bg-purple-950/60 hover:bg-purple-900/70 border border-purple-800/60 text-purple-300 hover:text-white text-[11px] font-semibold transition-colors cursor-pointer inline-flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5 text-purple-400" />
                                <span>Ver Orden</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Acciones de Suscripción */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => {
                          setSelectedSubForWarranty(sub);
                          setShowWarrantyModal(true);
                        }}
                        className="flex-1 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/40 border border-red-900/40 text-red-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-red-400" />
                        <span>Reportar Problema</span>
                      </button>

                      <button
                        onClick={() => handleOpenRenewModal(sub)}
                        className="flex-1 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 border border-emerald-900/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Renovar Cuenta</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CATÁLOGO DE PLANES DISPONIBLES (NUEVO) */}
      {/* ========================================================================= */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white">Planes y Servicios Disponibles</h2>
              <p className="text-xs text-gray-400">
                Adquiere nuevas plataformas con activación inmediata vinculadas a tu cuenta de cliente.
              </p>
            </div>

            {/* Filtro por Categorías */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
              <button
                onClick={() => setCatalogCategory('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  catalogCategory === 'all'
                    ? 'bg-red-600 text-white shadow-md'
                    : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'
                }`}
              >
                Todas ({availablePlans.length})
              </button>
              {services.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setCatalogCategory(s.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    catalogCategory === s.id
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-gray-950 text-gray-400 hover:text-white border border-gray-800'
                  }`}
                >
                  {s.logoUrl && <img src={s.logoUrl} alt="" className="w-3 h-3 object-contain" />}
                  <span>{s.nombre}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Grid de Planes Disponibles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredAvailablePlans.map((plan) => {
              const service = services.find((s) => s.id === plan.serviceId);

              return (
                <div
                  key={plan.id}
                  className="bg-gray-900/70 border border-gray-800/90 hover:border-red-600/50 rounded-2xl p-5 backdrop-blur-md flex flex-col justify-between space-y-4 transition-all hover:shadow-xl group"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                      <div className="flex items-center gap-3">
                        {service?.logoUrl ? (
                          <img
                            src={service.logoUrl}
                            alt={service.nombre}
                            className="w-10 h-10 object-contain rounded-xl bg-black/40 p-1 border border-gray-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center font-bold text-red-400">
                            {service?.nombre?.substring(0, 2) || 'ST'}
                          </div>
                        )}
                        <div>
                          <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider block">
                            {service?.nombre}
                          </span>
                          <h3 className="text-sm font-bold text-white leading-tight">
                            {plan.nombrePlan}
                          </h3>
                        </div>
                      </div>

                      {/* Insignia de Stock */}
                      <div>
                        {plan.stockDisponible !== undefined && plan.stockDisponible <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-950/80 text-red-400 border border-red-800/80 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Agotado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{plan.stockDisponible !== undefined ? `${plan.stockDisponible} en stock` : 'Disponible'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Precio */}
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-white">{formatCOP(plan.precio)}</span>
                        <span className="text-xs text-gray-400">/ {plan.duracionDias} días</span>
                      </div>
                      <span className="inline-block mt-1 text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
                        Garantía completa {plan.garantiaDias} días
                      </span>
                    </div>

                    {/* Características */}
                    <ul className="space-y-1.5 text-xs text-gray-300 pt-1">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Resolución: <strong>{plan.resolucion || '1080p FHD'}</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Pantallas: <strong>{plan.pantallasSimultaneas} simultánea(s)</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Perfil personal protegido con PIN</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>Despacho al instante vía WhatsApp</span>
                      </li>
                    </ul>
                  </div>

                  {/* Botón de compra */}
                  {plan.stockDisponible !== undefined && plan.stockDisponible <= 0 ? (
                    <button
                      disabled
                      className="w-full py-2.5 bg-gray-800 text-gray-400 border border-gray-750 text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-not-allowed opacity-60"
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>Agotado Temporalmente</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenPurchase(plan)}
                      className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.02]"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Adquirir Plan ({formatCOP(plan.precio)})</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORIAL DE PEDIDOS Y ÓRDENES DE VENTA */}
      {/* ========================================================================= */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-5 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>Historial de Compras y Órdenes de Venta</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Consulta el ID de compra y el detalle completo de tus órdenes registradas para fácil control y soporte inmediato.
              </p>
            </div>
            <div className="text-xs text-gray-400 font-medium bg-gray-950/70 border border-gray-800 px-3 py-1.5 rounded-xl self-start sm:self-auto">
              Total Órdenes: <strong className="text-white">{orders.length}</strong>
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">ID de la Compra</th>
                    <th className="px-5 py-3.5">Fecha y Hora</th>
                    <th className="px-5 py-3.5">Planes Comprados</th>
                    <th className="px-5 py-3.5">Total</th>
                    <th className="px-5 py-3.5">Método de Pago</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-right">Detalle y Soporte</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850/60">
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-gray-500">
                        Aún no tienes órdenes de venta registradas.
                      </td>
                    </tr>
                  ) : (
                    paginatedOrders.map((o) => (
                      <tr
                        key={o.id}
                        className="hover:bg-gray-800/40 transition group cursor-pointer"
                        onClick={() => handleViewOrderDetails(o.id, o)}
                      >
                        {/* ID DE LA COMPRA */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-purple-300 font-bold bg-purple-950/60 border border-purple-800/50 px-2 py-1 rounded-lg text-xs">
                              #ORD-{o.id.substring(0, 8).toUpperCase()}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(o.id, `${o.id}-order-col`);
                              }}
                              data-tooltip="Copiar"
                              className="text-gray-400 hover:text-white p-1 rounded-md bg-gray-950 hover:bg-gray-800 transition-colors cursor-pointer border border-gray-800"
                            >
                              {copiedKey === `${o.id}-order-col` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          {o.referenciaExterna && (
                            <span className="text-[10px] text-gray-500 block mt-0.5 font-mono">
                              Ref: {o.referenciaExterna}
                            </span>
                          )}
                        </td>

                        {/* FECHA Y HORA */}
                        <td className="px-5 py-4 text-gray-400">
                          <span className="text-white block font-medium">
                            {new Date(o.fecha || o.createdAt).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="text-[10px] text-gray-500 block">
                            {new Date(o.fecha || o.createdAt).toLocaleTimeString('es-CO', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        {/* PLANES COMPRADOS */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {o.items?.map((item: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 font-medium text-white">
                                {item.logoUrl && (
                                  <img
                                    src={item.logoUrl}
                                    alt={item.servicio}
                                    className="w-4 h-4 rounded object-contain bg-black/50 p-0.5 border border-gray-800"
                                  />
                                )}
                                <span>{item.servicio} - {item.plan}</span>
                                <span className="text-gray-400 text-[10px]">({item.cantidad}x)</span>
                              </div>
                            ))}
                          </div>
                        </td>

                        {/* TOTAL */}
                        <td className="px-5 py-4 font-bold text-white">{formatCOP(o.total)}</td>

                        {/* METODO DE PAGO */}
                        <td className="px-5 py-4 text-gray-300">
                          <span className="bg-gray-950/70 border border-gray-800 px-2 py-0.5 rounded text-[11px]">
                            {o.metodoPago || 'Transferencia'}
                          </span>
                        </td>

                        {/* ESTADO */}
                        <td className="px-5 py-4">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                              o.estado === 'PAGADO'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                : o.estado === 'PENDIENTE'
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                                : 'bg-red-950/60 text-red-400 border-red-800/60'
                            }`}
                          >
                            {o.estado}
                          </span>
                          {o.comprobanteVerificado && (
                            <span className="flex items-center gap-1 mt-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-md w-fit">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                              <span>Comprobante verificado</span>
                            </span>
                          )}
                        </td>

                        {/* DETALLE Y SOPORTE */}
                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewOrderDetails(o.id, o)}
                              data-tooltip={o.estado === 'CANCELADO' || o.estado === 'CANCELADA' ? 'Orden Cancelada' : 'Detalle'}
                              className={`px-2.5 py-1.5 border rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                                o.estado === 'CANCELADO' || o.estado === 'CANCELADA'
                                  ? 'bg-red-950/40 hover:bg-red-900/60 border-red-800/60 text-red-300 hover:text-white'
                                  : 'bg-purple-950/40 hover:bg-purple-900/60 border-purple-800/50 text-purple-300 hover:text-white'
                              }`}
                            >
                              {o.estado === 'CANCELADO' || o.estado === 'CANCELADA' ? (
                                <>
                                  <Ban className="w-3.5 h-3.5 text-red-400" />
                                  <span>Orden Cancelada</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                                  <span>Detalle de la Orden de Venta</span>
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <TablePagination
              currentPage={currentOrdersPage}
              totalItems={orders.length}
              itemsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCurrentOrdersPage}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: GARANTÍAS Y TICKETS */}
      {/* ========================================================================= */}
      {activeTab === 'tickets' && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Fecha Reporte</th>
                  <th className="px-5 py-3.5">Servicio</th>
                  <th className="px-5 py-3.5">ID de Compra</th>
                  <th className="px-5 py-3.5">Motivo</th>
                  <th className="px-5 py-3.5 text-right">Estado Ticket</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                      No tienes tickets ni reportes de garantía abiertos.
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-850/40 transition-colors">
                      <td className="px-5 py-4 text-gray-400">
                        {new Date(t.fechaCreacion).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-medium text-white">
                        {t.servicio} - {t.plan}
                      </td>
                      <td className="px-5 py-4">
                        {t.orderId ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-purple-300 font-bold bg-purple-950/70 border border-purple-800/50 px-2 py-0.5 rounded text-[11px]">
                              #ORD-{t.orderId.substring(0, 8).toUpperCase()}
                            </span>
                            <button
                              onClick={() => handleCopy(t.orderId, `${t.id}-ord-col`)}
                              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors cursor-pointer"
                              title="Copiar ID de compra"
                            >
                              {copiedKey === `${t.id}-ord-col` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ) : (
                          <span className="text-gray-500 text-[11px]">Venta Directa</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-300">{t.motivo}</td>
                      <td className="px-5 py-4 text-right">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            t.estado === 'resuelto'
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                              : 'bg-blue-950/60 text-blue-400 border-blue-800/60'
                          }`}
                        >
                          {t.estado === 'pendiente_revision' ? 'En Revisión (10 min)' : t.estado}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={currentTicketsPage}
            totalItems={tickets.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentTicketsPage}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: AJUSTES DE PERFIL */}
      {/* ========================================================================= */}
      {activeTab === 'profile' && (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 backdrop-blur-md max-w-xl">
          <div className="border-b border-gray-800 pb-3 mb-4">
            <h3 className="text-base font-bold text-white">Mis Datos de Cliente</h3>
            <p className="text-xs text-gray-400">
              Mantén tu número de WhatsApp actualizado para asegurar la entrega de tus credenciales.
            </p>
          </div>

          {profileSuccessMsg && (
            <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-400 font-semibold mb-1">Nombre Completo</label>
              <input
                type="text"
                required
                value={profileData.nombre}
                onChange={(e) => setProfileData({ ...profileData, nombre: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-semibold mb-1">WhatsApp de Notificaciones</label>
              <input
                type="tel"
                required
                value={profileData.whatsapp}
                onChange={(e) => setProfileData({ ...profileData, whatsapp: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block text-gray-400 font-semibold mb-1">País</label>
              <input
                type="text"
                value={profileData.pais}
                onChange={(e) => setProfileData({ ...profileData, pais: e.target.value })}
                placeholder="Colombia"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-all"
              >
                {savingProfile && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Guardar Cambios</span>
              </button>
            </div>
          </form>

          {/* ========================================================================= */}
          {/* SECCIÓN: SEGURIDAD Y 2FA (OPCIONAL PARA CLIENTES)                        */}
          {/* ========================================================================= */}
          <div className="mt-8 pt-6 border-t border-gray-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">Google Authenticator (2FA)</h4>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      twoFactorEnabled
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {twoFactorEnabled ? 'Activado (Protegido)' : 'Opcional (Desactivado)'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed max-w-md">
                  Añade una capa extra de seguridad a tu cuenta solicitando un código temporal de 6 dígitos cada vez que inicies sesión.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpen2FAModal}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all shrink-0 flex items-center gap-2 ${
                  twoFactorEnabled
                    ? 'border border-gray-700 bg-gray-800 hover:bg-rose-950/40 hover:border-rose-800 hover:text-rose-300 text-gray-300'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{twoFactorEnabled ? 'Desactivar 2FA' : 'Activar 2FA con Google'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPRAR PLAN DENTRO DEL PORTAL */}
      {/* ========================================================================= */}
      {showPurchaseModal && selectedPlanForPurchase && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-850 shrink-0 bg-gray-900/95 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-white">Confirmar Compra de Plan</h3>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-850 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            {purchaseSuccessOrder ? (
              <>
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                  <div className="space-y-4 py-2 text-center animate-in fade-in zoom-in-95">
                <div className="w-13 h-13 bg-emerald-950/80 border border-emerald-600/60 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">¡Orden Registrada con Éxito!</h4>
                  <p className="text-xs text-gray-300">
                    Número de Orden:{' '}
                    <span className="font-mono font-bold text-red-400">
                      #{purchaseSuccessOrder.order?.id?.substring(0, 8)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Total a cancelar:{' '}
                    <strong className="text-white text-sm">{formatCOP(selectedPlanForPurchase.precio)}</strong>
                  </p>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/60 border border-amber-800/80 text-amber-300 text-[11px] font-semibold mt-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Estado: PENDIENTE DE REVISIÓN Y APROBACIÓN</span>
                  </div>
                </div>

                {/* 1. SECCIÓN DE MEDIOS DE PAGO Y CONSIGNACIÓN CONFIGURADOS POR EL ADMINISTRADOR */}
                <div className="space-y-2.5 pt-2 text-left">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Landmark className="w-4 h-4 text-purple-400" />
                      <span>Cuentas para Consignación o Transferencia</span>
                    </div>
                    <span className="text-[10px] text-gray-400">Copia cada dato con un clic</span>
                  </div>

                  <div className="space-y-2.5">
                    {((settings?.mediosPago && Array.isArray(settings.mediosPago) && settings.mediosPago.length > 0)
                      ? settings.mediosPago.filter((m: any) => m.activo !== false)
                      : [
                          {
                            id: 'nequi-def',
                            banco: 'Nequi',
                            tipoCuenta: 'Billetera Digital',
                            numeroCuenta: '3001234567',
                            titular: 'StreamControl Pagos',
                            documento: 'CC 1.098.765.432',
                            instrucciones: 'Envía a Nequi directamente. Adjunta tu soporte tras realizarlo.',
                          },
                          {
                            id: 'bancolombia-def',
                            banco: 'Bancolombia',
                            tipoCuenta: 'Cuenta de Ahorros',
                            numeroCuenta: '912-000123-45',
                            titular: 'StreamControl SAS',
                            documento: 'NIT 901.234.567-8',
                            instrucciones: 'Transferencia directa desde App Bancolombia o QR sin costo.',
                          },
                          {
                            id: 'daviplata-def',
                            banco: 'Daviplata',
                            tipoCuenta: 'Billetera Digital',
                            numeroCuenta: '3001234567',
                            titular: 'StreamControl Pagos',
                            documento: 'CC 1.098.765.432',
                            instrucciones: 'Acepta transferencias directas de Daviplata o vía Transfiya.',
                          },
                        ]
                    )
                      .sort((a: any, b: any) => {
                        const aIsNequi = a.banco?.toLowerCase().includes('nequi');
                        const bIsNequi = b.banco?.toLowerCase().includes('nequi');
                        if (aIsNequi && !bIsNequi) return -1;
                        if (!aIsNequi && bIsNequi) return 1;
                        return 0;
                      })
                      .map((medio: any) => {
                        const isMain = medio.banco?.toLowerCase().includes('nequi');
                        return (
                          <div
                            key={medio.id}
                            className={`p-3.5 rounded-xl space-y-2 text-xs transition-all shadow-sm ${
                              isMain
                                ? 'bg-purple-950/20 border-2 border-purple-500/80 shadow-md shadow-purple-950/40 ring-1 ring-purple-500/30'
                                : 'bg-gray-950/90 border border-gray-800 hover:border-purple-800/60'
                            }`}
                          >
                            {/* Cabecera del Medio de Pago */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-gray-850">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-white flex items-center gap-1.5 text-xs">
                                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                                  {medio.banco}
                                </span>
                                {isMain && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black tracking-wide shadow-sm flex items-center gap-1">
                                    ★ PRINCIPAL
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-950/80 border border-purple-800/60 text-purple-300 font-semibold">
                                {medio.tipoCuenta}
                              </span>
                            </div>

                        {/* Número de Cuenta con Botón Copiar */}
                        <div className="flex items-center justify-between bg-black/60 px-3 py-2 rounded-lg border border-gray-800/80">
                          <div>
                            <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                              Número de Cuenta / Teléfono:
                            </span>
                            <span className="font-mono font-bold text-emerald-400 text-sm tracking-wider">
                              {medio.numeroCuenta}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopyPaymentInfo(medio.numeroCuenta, `num-${medio.id}`)}
                            className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-gray-700 hover:text-white"
                          >
                            {copiedPaymentField === `num-${medio.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-gray-400" />
                                <span>Copiar</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Titular y Documento con Botones Copiar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-850">
                            <div className="truncate mr-1.5">
                              <span className="text-[9px] text-gray-400 uppercase font-semibold block">Titular:</span>
                              <span className="text-gray-200 font-medium truncate block">{medio.titular}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyPaymentInfo(medio.titular, `tit-${medio.id}`)}
                              className="px-2 py-1 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 hover:text-white text-[10px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                              title="Copiar Titular"
                            >
                              {copiedPaymentField === `tit-${medio.id}` ? (
                                <span className="text-emerald-400 font-bold">¡Copiado!</span>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-gray-400" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-850">
                            <div className="truncate mr-1.5">
                              <span className="text-[9px] text-gray-400 uppercase font-semibold block">Documento / NIT:</span>
                              <span className="text-gray-200 font-mono truncate block">{medio.documento}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyPaymentInfo(medio.documento, `doc-${medio.id}`)}
                              className="px-2 py-1 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 hover:text-white text-[10px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                              title="Copiar Documento"
                            >
                              {copiedPaymentField === `doc-${medio.id}` ? (
                                <span className="text-emerald-400 font-bold">¡Copiado!</span>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3 text-gray-400" />
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {medio.instrucciones && (
                          <p className="text-[10px] text-gray-400 italic pt-1 border-t border-gray-850">
                            {medio.instrucciones}
                          </p>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>

                {/* 2. SECCIÓN: ADJUNTAR IMAGEN DE CONFIRMACIÓN DEL PAGO (SIN APROBAR) */}
                <div className="p-4 bg-gray-950/90 border border-gray-800 rounded-xl text-left space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Upload className="w-4 h-4 text-sky-400" />
                      <span>Adjuntar Comprobante de Pago</span>
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-amber-300 font-semibold">
                      Aprobación Manual Requerida
                    </span>
                  </div>

                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Sube la captura de pantalla o recibo de tu consignación. Tu orden se guardará con el comprobante adjunto, pero <strong>permanecerá en estado PENDIENTE</strong> hasta que un administrador o vendedor la verifique y apruebe en el sistema.
                  </p>

                  {receiptErrorMsg && (
                    <div className="p-2.5 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      <span>{receiptErrorMsg}</span>
                    </div>
                  )}

                  {/* Estado si ya fue adjuntado con éxito */}
                  {(receiptSuccessMsg || purchaseSuccessOrder.order?.comprobanteUrl) ? (
                    <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/70 rounded-xl space-y-2.5">
                      <div className="flex items-center gap-2 text-xs text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>{receiptSuccessMsg || '¡Comprobante adjuntado con éxito!'}</span>
                      </div>
                      <p className="text-[11px] text-emerald-400/90 leading-relaxed">
                        El soporte ha sido guardado. <strong>La orden queda registrada en estado PENDIENTE</strong> y será procesada por nuestro equipo administrativo para entregarte las credenciales de acceso.
                      </p>
                      <div className="mt-2 relative w-full max-h-44 rounded-lg overflow-hidden border border-emerald-900/80 bg-black/60 flex items-center justify-center p-2">
                        <img
                          src={receiptPreview || purchaseSuccessOrder.order?.comprobanteUrl}
                          alt="Comprobante de pago"
                          className="max-h-40 object-contain rounded"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      <input
                        type="file"
                        accept="image/*"
                        id="receipt-file-input-portal"
                        onChange={handleReceiptFileChange}
                        className="hidden"
                      />

                      {!receiptPreview ? (
                        <label
                          htmlFor="receipt-file-input-portal"
                          className="w-full py-4 border-2 border-dashed border-gray-700 hover:border-sky-500 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-gray-900/50 hover:bg-gray-900 transition-all text-xs text-gray-300"
                        >
                          <Upload className="w-5 h-5 text-sky-400" />
                          <span className="font-semibold text-white">Haz clic aquí para seleccionar el comprobante</span>
                          <span className="text-[10px] text-gray-400">Archivos JPG, PNG o WebP (máx. 8MB)</span>
                        </label>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative w-full max-h-44 rounded-lg overflow-hidden border border-gray-800 bg-black/60 flex items-center justify-center p-2">
                            <img src={receiptPreview} alt="Vista previa del comprobante" className="max-h-40 object-contain rounded" />
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptFile(null);
                                setReceiptPreview(null);
                              }}
                              className="absolute top-2 right-2 p-1 rounded-full bg-black/80 hover:bg-red-950 text-gray-300 hover:text-red-400 transition-colors"
                              title="Quitar imagen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <button
                            type="button"
                            disabled={uploadingReceipt}
                            onClick={() => handleUploadReceipt(purchaseSuccessOrder.order?.id)}
                            className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-950/50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {uploadingReceipt ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                            <span>Guardar y Adjuntar Comprobante</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 3. AVISO DE ACTIVACIÓN Y ACCIONES */}
                <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-left text-emerald-200 space-y-1.5">
                  <p className="font-semibold flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                    <span>Activación de tu servicio:</span>
                  </p>
                  <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                    También puedes enviar tu comprobante por WhatsApp indicando el número de orden{' '}
                    <strong>#{purchaseSuccessOrder.order?.id?.substring(0, 8)}</strong> para agilizar la validación y entrega de tus credenciales.
                  </p>
                </div>

                </div>
              </div>

                {/* Pie fijo con botones de éxito */}
                <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                  <button
                    onClick={() => {
                      setShowPurchaseModal(false);
                      setActiveTab('orders');
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gray-850 hover:bg-gray-800 text-white font-bold text-xs rounded-xl border border-gray-700 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Ver en Historial de Pedidos</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <a
                      href={`https://wa.me/${(settings?.whatsappSoporte || '+573001234567').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `¡Hola! Acabo de crear la orden #${purchaseSuccessOrder.order?.id?.substring(
                          0,
                          8
                        )} para el plan "${selectedPlanForPurchase.nombrePlan}" (${services.find((s) => s.id === selectedPlanForPurchase.serviceId)?.nombre}) por ${formatCOP(
                          selectedPlanForPurchase.precio
                        )} desde mi portal. Adjunto mi comprobante para la verificación.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Enviar Comprobante por WhatsApp</span>
                    </a>

                    <button
                      onClick={() => setShowPurchaseModal(false)}
                      className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <form onSubmit={handleConfirmPurchase} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                  {purchaseError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{purchaseError}</span>
                    </div>
                  )}

                  {/* Resumen del Plan */}
                  <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-850 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {services.find((s) => s.id === selectedPlanForPurchase.serviceId)?.logoUrl && (
                        <img
                          src={services.find((s) => s.id === selectedPlanForPurchase.serviceId)?.logoUrl}
                          alt=""
                          className="w-9 h-9 object-contain rounded-lg bg-black/40 p-1 border border-gray-850"
                        />
                      )}
                      <div>
                        <p className="font-bold text-white text-sm">
                          {services.find((s) => s.id === selectedPlanForPurchase.serviceId)?.nombre}
                        </p>
                        <p className="text-gray-400">{selectedPlanForPurchase.nombrePlan}</p>
                        <span className="text-[10px] text-emerald-400">
                          {selectedPlanForPurchase.pantallasSimultaneas} pantalla(s) • {selectedPlanForPurchase.duracionDias} días
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-white">
                        {formatCOP(selectedPlanForPurchase.precio)}
                      </span>
                      <span className="block text-[10px] text-gray-500">Pago único</span>
                    </div>
                  </div>

                  {/* Datos del Cliente Autenticado */}
                  <div className="p-3 bg-gray-950 rounded-xl border border-gray-850 space-y-1">
                    <span className="text-[10px] text-gray-400 uppercase font-semibold block">
                      Comprando con tu cuenta verificada:
                    </span>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{summary?.nombre}</span>
                      <span className="text-gray-400 font-mono">{summary?.email}</span>
                    </div>
                    <div className="text-[11px] text-emerald-400 pt-0.5">
                      WhatsApp de entrega: <strong>{summary?.whatsapp}</strong>
                    </div>
                  </div>

                  {/* Método de pago */}
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Método de Pago</label>
                    <select
                      value={purchasePaymentMethod}
                      onChange={(e) => setPurchasePaymentMethod(e.target.value)}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white cursor-pointer"
                    >
                      <option value="Nequi / Bancolombia / Daviplata">Nequi / Bancolombia / Daviplata</option>
                      <option value="Tarjeta de Crédito / Débito">Tarjeta de Crédito / Débito</option>
                      <option value="PSE">PSE</option>
                    </select>
                  </div>
                </div>

                {/* Pie fijo con botones de acción */}
                <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowPurchaseModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={purchaseLoading}
                    className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {purchaseLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Confirmar Pedido ({formatCOP(selectedPlanForPurchase.precio)})</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: REPORTAR PROBLEMA / GARANTÍA */}
      {/* ========================================================================= */}
      {showWarrantyModal && selectedSubForWarranty && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-800 shrink-0 bg-gray-900/95 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-white">Solicitar Garantía</h3>
              </div>
              <button onClick={() => setShowWarrantyModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido */}
            {warrantySuccessMsg ? (
              <>
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                  <div className="p-6 bg-emerald-950/40 border border-emerald-800 rounded-xl text-center space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-full bg-emerald-900/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400 mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-white text-base">Reporte Recibido con Éxito</h4>
                    <p className="text-xs text-gray-300 max-w-md mx-auto leading-relaxed">{warrantySuccessMsg}</p>
                  </div>
                </div>
                <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowWarrantyModal(false)}
                    className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs rounded-xl cursor-pointer"
                  >
                    Entendido y Cerrar
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleRequestWarranty} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Cuenta a reportar</label>
                  <div className="p-2.5 bg-gray-950 rounded-xl border border-gray-800 text-white font-medium">
                    <p className="font-bold text-white">{selectedSubForWarranty.servicio} ({selectedSubForWarranty.plan})</p>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      Correo: {selectedSubForWarranty.credenciales?.email || 'Asignada'} | Perfil: {selectedSubForWarranty.credenciales?.perfil || 'Principal'}
                    </p>
                  </div>
                </div>

                {/* ID de la Compra / Orden de Venta */}
                <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block font-semibold">
                        ID de la Compra / Orden de Venta
                      </span>
                      <span className="font-mono text-purple-300 font-bold text-xs">
                        {selectedSubForWarranty.orderId
                          ? `#ORD-${selectedSubForWarranty.orderId.substring(0, 8).toUpperCase()}`
                          : `#SUB-${selectedSubForWarranty.id.substring(0, 8).toUpperCase()}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        selectedSubForWarranty.orderId || selectedSubForWarranty.id,
                        'warranty-sub-order'
                      )
                    }
                    data-tooltip="Copiar"
                    className="p-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'warranty-sub-order' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">¿Qué problema presentas?</label>
                  <select
                    value={warrantyReason}
                    onChange={(e) => setWarrantyReason(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="clave_incorrecta">Contraseña incorrecta / no deja entrar</option>
                    <option value="pantalla_bloqueada">Pantalla bloqueada / límite de pantallas</option>
                    <option value="perfil_borrado">Perfil borrado o modificado por otro usuario</option>
                    <option value="error_sistema">Membresía pausada o caída</option>
                    <option value="otro">Otro problema</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">
                    Detalles adicionales (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={warrantyDetails}
                    onChange={(e) => setWarrantyDetails(e.target.value)}
                    placeholder="Ej. Me sale mensaje de contraseña incorrecta desde hoy en la mañana..."
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white"
                  />
                </div>

                </div>

                {/* Pie fijo con botones de acción */}
                <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowWarrantyModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={warrantyLoading}
                    className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-red-600/20"
                  >
                    {warrantyLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Enviar Reporte</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RENOVAR CUENTA (SOLICITA Y PRESENTA LA MISMA INFORMACIÓN QUE COMPRA) */}
      {/* ========================================================================= */}
      {showRenewModal && selectedSubForRenew && (() => {
        const sub = selectedSubForRenew;
        const subPlan = availablePlans.find(
          (p) => p.nombrePlan === sub.plan || p.id === sub.planId
        );
        const renewPrice = subPlan?.precio || 0;
        const medios = (settings?.mediosPago?.filter((m: any) => m.activo) || []).sort((a: any, b: any) => {
          const aIsNequi = a.banco?.toLowerCase().includes('nequi');
          const bIsNequi = b.banco?.toLowerCase().includes('nequi');
          if (aIsNequi && !bIsNequi) return -1;
          if (!aIsNequi && bIsNequi) return 1;
          return 0;
        });

        return (
          <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-gray-950 border border-emerald-500/50 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl shadow-emerald-950/40 overflow-hidden animate-in zoom-in-95">
              {/* Encabezado Fijo */}
              <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-950/95 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400 shrink-0">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>Renovación de Cuenta</span>
                      {sub.orderId && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-950/70 border border-purple-800 text-purple-300 font-mono text-[11px]">
                          #ORD-{sub.orderId.substring(0, 8).toUpperCase()}
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Extiende la vigencia conservando tu mismo perfil y credenciales de acceso
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRenewModal(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-900 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Contenido */}
              {renewSuccessData ? (
                <>
                  <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                    {/* PANTALLA DE ÉXITO */}
                    <div className="space-y-4 text-center py-2 animate-in fade-in">
                    <div className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-700/80 flex items-center justify-center text-emerald-400 mx-auto">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white">¡Solicitud de Renovación Registrada!</h4>
                      <p className="text-xs text-gray-300">
                        Orden de renovación <strong className="text-emerald-400 font-mono">#ORD-{renewSuccessData.orderId?.substring(0, 8).toUpperCase()}</strong>
                      </p>
                      <p className="text-[11px] text-gray-400 max-w-md mx-auto leading-relaxed pt-1">
                        Tu solicitud ha sido guardada en estado <strong>PENDIENTE</strong>. Nuestro equipo validará el comprobante de pago para extender la vigencia de tu cuenta.
                      </p>
                    </div>

                    {renewSuccessData.receipt && (
                      <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800 inline-block">
                        <span className="text-[10px] text-gray-400 block mb-1">Comprobante adjunto:</span>
                        <img
                          src={renewSuccessData.receipt}
                          alt="Comprobante"
                          className="max-h-36 object-contain rounded-lg mx-auto border border-gray-700"
                        />
                      </div>
                    )}

                    <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-left space-y-1.5 text-xs text-emerald-200">
                      <p className="font-semibold flex items-center gap-1.5">
                        <MessageCircle className="w-4 h-4 text-emerald-400" />
                        <span>Acelerar Aprobación por WhatsApp:</span>
                      </p>
                      <p className="text-[11px] text-emerald-300/90 leading-relaxed">
                        Puedes enviar tu comprobante directamente a nuestra línea de soporte indicando tu número de orden <strong>#ORD-{renewSuccessData.orderId?.substring(0, 8).toUpperCase()}</strong>.
                      </p>
                    </div>

                    </div>
                  </div>

                  {/* Pie fijo con botones de éxito */}
                  <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex flex-col sm:flex-row gap-2 justify-end text-xs">
                    <a
                      href={`https://wa.me/${(settings?.whatsappSoporte || '+573001234567').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `¡Hola! Acabo de solicitar la renovación de mi servicio (${sub.servicio} - ${sub.plan}) con la orden #ORD-${renewSuccessData.orderId?.substring(0, 8).toUpperCase()}. Adjunto mi comprobante para la verificación.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Notificar por WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={() => setShowRenewModal(false)}
                      className="py-2.5 px-4 bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white font-semibold rounded-xl border border-gray-800 transition-colors cursor-pointer"
                    >
                      Entendido y Cerrar
                    </button>
                  </div>
                </>
              ) : (
                /* FORMULARIO DE RENOVACIÓN COMPLETO */
                <form onSubmit={handleRenew} className="flex-1 flex flex-col overflow-hidden">
                  <div className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
                    {renewErrorMsg && (
                      <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                        <span>{renewErrorMsg}</span>
                      </div>
                    )}

                    {/* Resumen de la cuenta a renovar */}
                    <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-[11px] uppercase tracking-wider font-semibold">
                          Cuenta a Extender
                        </span>
                        <span className="font-extrabold text-emerald-400 font-mono text-sm">
                          {formatCOP(renewPrice)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs">{sub.servicio} - {sub.plan}</span>
                        {sub.orderId && <span className="font-mono text-[11px] text-purple-300">#ORD-{sub.orderId.substring(0, 8).toUpperCase()}</span>}
                      </div>
                      <div className="text-[11px] text-gray-400 space-y-0.5 border-t border-gray-850 pt-2 font-mono">
                        <p>Correo de acceso: <strong className="text-white">{sub.accountEmail || 'Asignado en tu perfil'}</strong></p>
                        <p>Perfil: <span className="text-emerald-400">{sub.perfilAsignado || 'Principal'}</span> | PIN: <span className="text-amber-400">{sub.pin || 'N/A'}</span></p>
                        <p className="text-gray-500 pt-0.5">Vencimiento actual: {new Date(sub.fechaVencimiento).toLocaleDateString('es-CO')}</p>
                      </div>
                    </div>

                    {/* 1. Medios de pago y datos para la consignación */}
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="font-semibold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
                          <Landmark className="w-3.5 h-3.5 text-sky-400" />
                          <span>Medios de Pago y Datos para Consignar</span>
                        </label>
                        <span className="text-[10px] text-gray-500">Copia los datos para transferir</span>
                      </div>

                      <div className="space-y-2">
                        {medios.length > 0 ? (
                          medios.map((medio: any) => {
                            const isMain = medio.banco?.toLowerCase().includes('nequi');
                            return (
                              <div
                                key={medio.id}
                                className={`p-3 rounded-xl space-y-2 transition-colors ${
                                  isMain
                                    ? 'bg-purple-950/20 border-2 border-purple-500/80 shadow-md shadow-purple-950/30'
                                    : 'bg-gray-900/90 border border-gray-800 hover:border-gray-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-white text-xs flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                      {medio.banco} ({medio.tipoCuenta})
                                    </span>
                                    {isMain && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black tracking-wide shadow-sm">
                                        ★ PRINCIPAL
                                      </span>
                                    )}
                                  </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopyRenewField(medio.numeroCuenta, `renew-num-${medio.id}`)}
                                  className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-750 text-gray-200 text-[10px] flex items-center gap-1 transition-colors cursor-pointer border border-gray-700"
                                >
                                  {renewCopiedKey === `renew-num-${medio.id}` ? (
                                    <>
                                      <Check className="w-3 h-3 text-emerald-400" />
                                      <span className="text-emerald-400 font-bold">¡Copiado!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3 text-gray-400" />
                                      <span>Copiar Cuenta</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                                <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-850">
                                  <div className="truncate mr-1.5">
                                    <span className="text-[9px] text-gray-400 uppercase font-semibold block">Número:</span>
                                    <span className="text-emerald-400 font-mono font-bold truncate block">{medio.numeroCuenta}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-850">
                                  <div className="truncate mr-1.5">
                                    <span className="text-[9px] text-gray-400 uppercase font-semibold block">Titular:</span>
                                    <span className="text-gray-200 font-medium truncate block">{medio.titular}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyRenewField(medio.titular, `renew-tit-${medio.id}`)}
                                    className="px-2 py-1 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 text-[10px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                                  >
                                    {renewCopiedKey === `renew-tit-${medio.id}` ? (
                                      <span className="text-emerald-400 font-bold">¡Copiado!</span>
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {medio.documento && (
                                <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-lg border border-gray-850 text-[11px]">
                                  <span className="text-gray-400 text-[10px]">Documento / NIT: <strong className="text-gray-200 font-mono">{medio.documento}</strong></span>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyRenewField(medio.documento, `renew-doc-${medio.id}`)}
                                    className="px-2 py-0.5 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    {renewCopiedKey === `renew-doc-${medio.id}` ? (
                                      <span className="text-emerald-400 font-bold">¡Copiado!</span>
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              )}

                              {medio.instrucciones && (
                                <p className="text-[10px] text-gray-400 italic pt-1 border-t border-gray-850">
                                  {medio.instrucciones}
                                </p>
                              )}
                            </div>
                          );
                        })
                        ) : (
                          <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-gray-400 text-xs">
                            Comunícate por WhatsApp para recibir los datos de transferencia.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Método de Pago Seleccionado */}
                    <div>
                      <label className="block text-gray-400 font-semibold mb-1">
                        Método utilizado para tu pago
                      </label>
                      <select
                        value={renewMethod}
                        onChange={(e) => setRenewMethod(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-xl p-2.5 text-white cursor-pointer focus:outline-none focus:border-emerald-500"
                      >
                        <option value="Nequi">Nequi</option>
                        <option value="Bancolombia">Bancolombia</option>
                        <option value="Daviplata">Daviplata</option>
                        <option value="PSE / Transferencia Bancaria">PSE / Transferencia Bancaria</option>
                        <option value="Efectivo / Corresponsal">Efectivo / Corresponsal</option>
                      </select>
                    </div>

                    {/* 2. Adjuntar Comprobante de Pago */}
                    <div className="p-3.5 bg-gray-900/90 border border-gray-800 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Upload className="w-3.5 h-3.5 text-sky-400" />
                          <span>Adjuntar Comprobante de Pago</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950/70 border border-amber-800 text-amber-300 font-semibold">
                          Aprobación Requerida
                        </span>
                      </div>

                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        Sube la captura o recibo de tu consignación. Tu orden de renovación se creará en estado <strong>PENDIENTE</strong> y se extenderá tu fecha de vencimiento una vez sea validada por el administrador.
                      </p>

                      <input
                        type="file"
                        accept="image/*"
                        id="renew-receipt-input"
                        onChange={handleRenewReceiptChange}
                        className="hidden"
                      />

                      {renewReceiptPreview ? (
                        <div className="space-y-2">
                          <div className="relative w-full max-h-40 rounded-lg overflow-hidden border border-gray-700 bg-black/60 flex items-center justify-center p-2">
                            <img
                              src={renewReceiptPreview}
                              alt="Vista previa comprobante"
                              className="max-h-36 object-contain rounded"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setRenewReceiptFile(null);
                                setRenewReceiptPreview(null);
                              }}
                              className="absolute top-2 right-2 p-1 rounded-full bg-black/80 hover:bg-red-950 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                              title="Remover imagen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[10px] text-emerald-400 text-center font-medium">
                            ✓ Comprobante listo para enviar
                          </p>
                        </div>
                      ) : (
                        <label
                          htmlFor="renew-receipt-input"
                          className="w-full py-4 border-2 border-dashed border-gray-700 hover:border-emerald-500 rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer bg-gray-950/50 hover:bg-gray-950 transition-all text-xs text-gray-300"
                        >
                          <Upload className="w-5 h-5 text-emerald-400" />
                          <span className="font-semibold text-white">Haz clic para subir tu comprobante de pago</span>
                          <span className="text-[10px] text-gray-400">Formatos JPG, PNG o WebP (máx. 8MB)</span>
                        </label>
                      )}
                    </div>

                    </div>

                    {/* Botones de acción fijos en footer */}
                    <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                      <button
                        type="button"
                        onClick={() => setShowRenewModal(false)}
                        className="px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={renewLoading}
                        className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2 disabled:opacity-50 cursor-pointer transition-all"
                      >
                        {renewLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Enviando solicitud...</span>
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            <span>Confirmar Solicitud de Renovación</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
            </div>
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* MODAL: DETALLE DE LA ORDEN DE VENTA */}
      {/* ========================================================================= */}
      {viewingOrder && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl shadow-purple-950/30 overflow-hidden animate-in zoom-in-95">
            {/* Cabecera Fija */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-purple-400 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">Detalle de la Orden de Venta</h3>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        viewingOrder.estado === 'PAGADO'
                          ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                          : viewingOrder.estado === 'PENDIENTE'
                          ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                          : 'bg-red-950/60 text-red-400 border-red-800/60'
                      }`}
                    >
                      {viewingOrder.estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-purple-300 font-bold text-xs">
                      #ORD-{viewingOrder.id.substring(0, 8).toUpperCase()}
                    </span>
                    <button
                      onClick={() => handleCopy(viewingOrder.id, 'modal-order-id')}
                      data-tooltip="Copiar"
                      className="p-1 rounded bg-gray-950 hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 text-[10px] inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'modal-order-id' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-semibold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar ID</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={handleCloseViewingOrder}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Scrolleable */}
            <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">

            {/* ========================================================================= */}
            {/* TARJETA DESTACADA: FECHA DE VENCIMIENTO Y DÍAS QUE LE RESTAN AL CLIENTE */}
            {/* ========================================================================= */}
            {(() => {
              const orderSubs = (viewingOrder.subscriptions && viewingOrder.subscriptions.length > 0)
                ? viewingOrder.subscriptions
                : subscriptions.filter((s: any) => s.orderId === viewingOrder.id);

              const hoy = new Date();
              hoy.setHours(0, 0, 0, 0);

              if (orderSubs.length > 0) {
                const primarySub = orderSubs[0];
                const venc = primarySub.fechaVencimiento ? new Date(primarySub.fechaVencimiento) : null;
                const inicio = primarySub.fechaInicio
                  ? new Date(primarySub.fechaInicio)
                  : (viewingOrder.fecha ? new Date(viewingOrder.fecha) : new Date(viewingOrder.createdAt));

                const diasRestantes = typeof primarySub.diasRestantes === 'number'
                  ? primarySub.diasRestantes
                  : venc
                  ? Math.ceil((new Date(venc).setHours(0, 0, 0, 0) - hoy.getTime()) / (1000 * 60 * 60 * 24))
                  : 0;

                const fechaVencLarga = venc
                  ? venc.toLocaleDateString('es-CO', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : 'No definida';

                const fechaVencCorta = venc ? venc.toLocaleDateString('es-CO') : 'N/A';
                const fechaInicioCorta = inicio ? inicio.toLocaleDateString('es-CO') : 'N/A';

                const duracionDias = primarySub.plan?.duracionDias || viewingOrder.items?.[0]?.duracionDias || 30;
                const porcentajeRestante = Math.max(5, Math.min(100, Math.round((Math.max(0, diasRestantes) / duracionDias) * 100)));

                return (
                  <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-indigo-500/40 hover:border-indigo-500/60 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden transition-all">
                    {/* Resplandor decorativo de fondo */}
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Cabecera de la Tarjeta de Vencimiento */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3.5 border-b border-gray-800/80 relative z-10">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-sm">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase flex items-center gap-2">
                            <span>Vigencia y Vencimiento del Servicio</span>
                            {orderSubs.length > 1 && (
                              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-300">
                                {orderSubs.length} cuentas en esta orden
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] sm:text-[11px] text-gray-400">
                            Tiempo de servicio contratado, fecha límite y días restantes para tu cuenta
                          </p>
                        </div>
                      </div>

                      <span
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-md inline-flex items-center gap-1.5 ${
                          diasRestantes > 5
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/50'
                            : diasRestantes > 0
                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-amber-950/50'
                            : diasRestantes === 0
                            ? 'bg-orange-950/80 text-orange-300 border-orange-500/50 shadow-orange-950/50 animate-pulse'
                            : 'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-rose-950/50'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {diasRestantes > 1
                          ? `${diasRestantes} DÍAS RESTANTES`
                          : diasRestantes === 1
                          ? '1 DÍA RESTANTE'
                          : diasRestantes === 0
                          ? '¡VENCE HOY!'
                          : `VENCIDO HACE ${Math.abs(diasRestantes)} DÍAS`}
                      </span>
                    </div>

                    {/* Cajas Principales: FECHA DE VENCIMIENTO & DÍAS QUE LE RESTAN */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 relative z-10">
                      {/* 1. FECHA DE VENCIMIENTO */}
                      <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3.5 space-y-2 hover:border-gray-700 transition-colors">
                        <span className="text-[10px] text-indigo-300 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          FECHA DE VENCIMIENTO
                        </span>
                        <div className="space-y-1">
                          <p className="text-base sm:text-lg font-black text-white capitalize leading-tight">
                            {fechaVencLarga}
                          </p>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-gray-950 text-indigo-200 border border-gray-800">
                              {fechaVencCorta}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              (Válido hasta las 23:59 hrs)
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-500 pt-1.5 border-t border-gray-850">
                          Fecha de Activación: <strong className="text-gray-300 font-mono">{fechaInicioCorta}</strong>
                        </p>
                      </div>

                      {/* 2. DÍAS QUE LE RESTAN AL CLIENTE */}
                      <div
                        className={`border rounded-xl p-3.5 space-y-2 transition-colors ${
                          diasRestantes > 5
                            ? 'bg-emerald-950/30 border-emerald-700/50'
                            : diasRestantes > 0
                            ? 'bg-amber-950/30 border-amber-700/50'
                            : diasRestantes === 0
                            ? 'bg-orange-950/30 border-orange-700/50'
                            : 'bg-rose-950/30 border-rose-700/50'
                        }`}
                      >
                        <span className="text-[10px] text-gray-300 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          DÍAS QUE LE RESTAN AL CLIENTE
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                              diasRestantes > 5
                                ? 'text-emerald-400'
                                : diasRestantes > 0
                                ? 'text-amber-400'
                                : diasRestantes === 0
                                ? 'text-orange-400'
                                : 'text-rose-400'
                            }`}
                          >
                            {diasRestantes > 0 ? diasRestantes : diasRestantes === 0 ? '0' : Math.abs(diasRestantes)}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-gray-200">
                            {diasRestantes > 1
                              ? 'Días de servicio activos'
                              : diasRestantes === 1
                              ? 'Día de servicio activo'
                              : diasRestantes === 0
                              ? 'Horas restantes (vence hoy)'
                              : 'Días transcurridos desde vencimiento'}
                          </span>
                        </div>

                        {/* Barra de Progreso de Tiempo */}
                        <div className="space-y-1 pt-1">
                          <div className="w-full bg-gray-950 h-2 rounded-full overflow-hidden border border-gray-800 flex">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                diasRestantes > 5
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                  : diasRestantes > 0
                                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                                  : 'bg-rose-500'
                              }`}
                              style={{ width: `${porcentajeRestante}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-400 font-mono">
                            <span>
                              {diasRestantes > 0 ? `${diasRestantes} días por disfrutar` : 'Servicio finalizado'}
                            </span>
                            <span>Plan de {duracionDias} días</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Desglose individual si hay múltiples cuentas */}
                    {orderSubs.length > 1 && (
                      <div className="mt-3.5 pt-3 border-t border-gray-800/80 space-y-2 relative z-10">
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                          Detalle individual por cuenta contratada:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {orderSubs.map((s: any, idx: number) => {
                            const sVenc = s.fechaVencimiento ? new Date(s.fechaVencimiento) : null;
                            const sDias = typeof s.diasRestantes === 'number'
                              ? s.diasRestantes
                              : sVenc
                              ? Math.ceil((new Date(sVenc).setHours(0, 0, 0, 0) - hoy.getTime()) / (1000 * 60 * 60 * 24))
                              : 0;

                            return (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg bg-gray-950/70 border border-gray-850 flex items-center justify-between text-[11px]"
                              >
                                <div>
                                  <strong className="text-white block">{s.servicio} ({s.plan})</strong>
                                  <span className="text-gray-400 text-[10px]">
                                    Vence:{' '}
                                    <strong className="text-indigo-300 font-mono">
                                      {sVenc ? sVenc.toLocaleDateString('es-CO') : 'N/A'}
                                    </strong>
                                  </span>
                                </div>
                                <span
                                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    sDias > 5
                                      ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                      : sDias > 0
                                      ? 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                                      : 'bg-rose-950/60 text-rose-400 border-rose-800/60'
                                  }`}
                                >
                                  {sDias > 0 ? `${sDias} días rest.` : sDias === 0 ? 'Vence hoy' : 'Vencida'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              // Si la orden aún está PENDIENTE o en proceso de activación
              const planItem = viewingOrder.items?.[0];
              const duracionDias = planItem?.duracionDias || 30;

              return (
                <div className="bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-800/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase">
                          Vigencia y Vencimiento del Servicio
                        </h4>
                        <p className="text-[10px] text-gray-400">
                          Orden en estado {viewingOrder.estado} • Activación en proceso
                        </p>
                      </div>
                    </div>

                    <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase border bg-amber-950/80 text-amber-300 border-amber-500/50 inline-flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      {viewingOrder.estado === 'PENDIENTE' ? 'Pendiente de Aprobación' : viewingOrder.estado}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="bg-gray-900/90 border border-gray-800 rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] text-amber-300 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        FECHA DE VENCIMIENTO ESTIMADA
                      </span>
                      <p className="text-sm sm:text-base font-bold text-white">
                        +{duracionDias} días a partir de la activación
                      </p>
                      <p className="text-[10px] text-gray-400 leading-relaxed">
                        La fecha exacta de vencimiento se calculará y registrará automáticamente cuando el administrador verifique y apruebe tu pago.
                      </p>
                    </div>

                    <div className="bg-amber-950/20 border border-amber-800/40 rounded-xl p-3.5 space-y-1.5">
                      <span className="text-[10px] text-gray-300 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        DÍAS QUE LE RESTAN AL CLIENTE
                      </span>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black font-mono text-amber-400">
                          {duracionDias}
                        </span>
                        <span className="text-xs font-bold text-gray-200">
                          Días completos de servicio contratados
                        </span>
                      </div>
                      <p className="text-[10px] text-emerald-400 font-medium">
                        ✓ Tu vigencia comenzará a contar únicamente cuando la orden sea aprobada y recibas tus credenciales.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Grid de Información de la Orden (Datos de Base de Datos) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* ID Completo & Registro */}
              <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                  Identificador de Compra (UUID)
                </span>
                <p className="font-mono text-gray-200 text-[11px] break-all select-all bg-gray-900/80 p-2 rounded-lg border border-gray-850">
                  {viewingOrder.id}
                </p>
                <span className="text-[10px] text-gray-500 block">
                  Registrado el:{' '}
                  <strong className="text-gray-300">
                    {new Date(viewingOrder.fecha || viewingOrder.createdAt).toLocaleString('es-CO')}
                  </strong>
                </span>
              </div>

              {/* Pago y Monto */}
              <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-3.5 space-y-1.5">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                  Información Financiera
                </span>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Total Facturado:</span>
                  <span className="text-base font-black text-white">{formatCOP(viewingOrder.total)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Método de Pago:</span>
                  <span className="font-semibold text-emerald-400">{viewingOrder.metodoPago || 'Transferencia'}</span>
                </div>
                {viewingOrder.referenciaExterna && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Ref. Transacción:</span>
                    <span className="font-mono text-purple-300">{viewingOrder.referenciaExterna}</span>
                  </div>
                )}
              </div>

              {/* Asesor y Comprobante de Pago */}
              <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-4 sm:col-span-2 space-y-3.5 text-xs">
                {/* Asesor / Vendedor */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-gray-850">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                      Atención y Asesor Comercial
                    </span>
                    <p className="text-gray-300 text-xs mt-0.5">
                      Asesor / Vendedor:{' '}
                      <strong className="text-white">
                        {viewingOrder.vendedorNombre || 'Venta directa en plataforma'}
                      </strong>
                    </p>
                  </div>

                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-purple-950/60 border border-purple-800/50 text-purple-300 font-semibold self-start sm:self-auto inline-flex items-center gap-1.5">
                    <FileText className="w-3 h-3 text-purple-400" />
                    <span>Orden #ORD-{viewingOrder.id.substring(0, 8).toUpperCase()}</span>
                  </span>
                </div>

                {/* Comprobante de Pago de la Orden de Compra */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-sky-400" />
                      <span>Comprobante de Pago de esta Orden</span>
                    </span>

                    {viewingOrder.comprobanteVerificado ? (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/70 border border-emerald-800/70 text-emerald-300 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Comprobante verificado</span>
                      </span>
                    ) : viewingOrder.comprobanteUrl ? (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-950/70 border border-blue-800/70 text-blue-300 font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" />
                        <span>Soporte Registrado</span>
                      </span>
                    ) : (
                      <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-amber-950/70 border border-amber-800/70 text-amber-300 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-400" />
                        <span>Sin Soporte Adjunto</span>
                      </span>
                    )}
                  </div>

                  {/* Avisos contextuales */}
                  {viewingReceiptErrorMsg && (
                    <div className="p-2.5 rounded-lg bg-red-950/70 border border-red-800 text-red-200 text-xs flex items-center gap-2 animate-in fade-in">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{viewingReceiptErrorMsg}</span>
                    </div>
                  )}

                  {viewingReceiptSuccessMsg && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{viewingReceiptSuccessMsg}</span>
                    </div>
                  )}

                  {/* CASO A: Ya tiene comprobante y NO está en modo edición */}
                  {viewingOrder.comprobanteUrl && !isEditingViewingReceipt && !viewingReceiptPreview && (
                    <div className="p-3 bg-gray-900/90 border border-gray-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          onClick={() => setPreviewLightboxUrl(viewingOrder.comprobanteUrl)}
                          className="w-14 h-14 rounded-lg overflow-hidden border border-gray-700 bg-black/80 flex items-center justify-center cursor-pointer hover:border-sky-500 transition-all shrink-0 group relative"
                          title="Clic para ampliar imagen en pantalla completa"
                        >
                          <img
                            src={viewingOrder.comprobanteUrl}
                            alt="Comprobante de pago"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Eye className="w-4 h-4 text-white" />
                          </div>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-white font-semibold text-xs flex items-center gap-1.5">
                            {viewingOrder.comprobanteVerificado ? (
                              <span className="text-emerald-400">✓ Comprobante verificado por el equipo de soporte</span>
                            ) : (
                              <span>Comprobante digital registrado en el sistema</span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-400">
                            {viewingOrder.comprobanteVerificado
                              ? 'El pago fue validado exitosamente. Este archivo se encuentra bloqueado en modo de solo lectura y no puede ser alterado ni reemplazado.'
                              : `Soporte de pago enlazado exclusivamente a la orden #ORD-${viewingOrder.id.substring(0, 8).toUpperCase()}.`}
                          </p>
                          {viewingOrder.comprobanteVerificado ? (
                            <span className="text-[10px] text-emerald-400 font-mono block">
                              🔒 Modo Solo Lectura (Verificado)
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-mono block">
                              ✓ Guardado en base de datos
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 flex-wrap">
                        <button
                          type="button"
                          onClick={() => setPreviewLightboxUrl(viewingOrder.comprobanteUrl)}
                          className="px-3 py-1.5 rounded-lg bg-blue-950/70 hover:bg-blue-900/80 border border-blue-800/60 text-blue-300 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Soporte</span>
                        </button>

                        {/* Si el comprobante ya fue verificado, NO se permite cambiarlo; es estrictamente view-only */}
                        {!viewingOrder.comprobanteVerificado && (
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingViewingReceipt(true);
                              setViewingReceiptFile(null);
                              setViewingReceiptPreview(null);
                              setViewingReceiptErrorMsg('');
                              setViewingReceiptSuccessMsg('');
                            }}
                            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 hover:text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Cambiar Comprobante</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* CASO B: No tiene comprobante O el usuario activó la edición para subir/reemplazar (SOLO si no está verificado) */}
                  {(!viewingOrder.comprobanteUrl || isEditingViewingReceipt) && !viewingOrder.comprobanteVerificado && (
                    <div className="space-y-2.5">
                      <input
                        type="file"
                        accept="image/*"
                        id={`viewing-receipt-input-${viewingOrder.id}`}
                        onChange={handleViewingReceiptFileChange}
                        className="hidden"
                      />

                      {!viewingReceiptPreview ? (
                        <div className="space-y-2">
                          <label
                            htmlFor={`viewing-receipt-input-${viewingOrder.id}`}
                            className="w-full py-4 px-4 border-2 border-dashed border-gray-700 hover:border-sky-500 rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-gray-900/60 hover:bg-gray-900 transition-all text-xs text-gray-300 group"
                          >
                            <div className="w-9 h-9 rounded-xl bg-sky-950/60 border border-sky-800/50 flex items-center justify-center text-sky-400 group-hover:scale-105 transition-transform">
                              <Upload className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-white text-xs">
                              {viewingOrder.comprobanteUrl ? 'Seleccionar nuevo comprobante para reemplazar' : 'Haz clic aquí para adjuntar el comprobante de pago'}
                            </span>
                            <span className="text-[10px] text-gray-400 text-center">
                              Formatos permitidos: JPG, PNG o WebP (máx. 8MB). Quedará relacionado únicamente a esta orden de compra.
                            </span>
                          </label>

                          {isEditingViewingReceipt && (
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingViewingReceipt(false);
                                  setViewingReceiptFile(null);
                                  setViewingReceiptPreview(null);
                                }}
                                className="px-3 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                Cancelar
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-gray-900/90 border border-sky-500/40 rounded-xl space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                              <Upload className="w-3.5 h-3.5 text-sky-400" />
                              <span>Vista previa del comprobante a guardar</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setViewingReceiptFile(null);
                                setViewingReceiptPreview(null);
                              }}
                              className="text-gray-400 hover:text-red-400 p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                              title="Descartar imagen"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="relative w-full max-h-48 rounded-lg overflow-hidden border border-gray-800 bg-black/70 flex items-center justify-center p-2">
                            <img
                              src={viewingReceiptPreview}
                              alt="Vista previa del comprobante"
                              className="max-h-44 object-contain rounded"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setViewingReceiptFile(null);
                                setViewingReceiptPreview(null);
                                if (viewingOrder.comprobanteUrl) {
                                  setIsEditingViewingReceipt(false);
                                }
                              }}
                              className="px-3 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              disabled={viewingUploadingReceipt}
                              onClick={() => handleSaveViewingReceipt(viewingOrder.id)}
                              className="px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-950/50 inline-flex items-center gap-2 cursor-pointer transition-all"
                            >
                              {viewingUploadingReceipt ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  <span>Guardando en BD...</span>
                                </>
                              ) : (
                                <>
                                  <Upload className="w-4 h-4" />
                                  <span>Guardar Comprobante en la Orden</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Planes e Ítems Comprados */}
            <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-4 space-y-3 text-xs">
              <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                Planes Adquiridos en esta Orden
              </span>
              <div className="space-y-2">
                {viewingOrder.items?.map((item: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-gray-900/80 border border-gray-850 rounded-xl gap-2"
                  >
                    <div className="flex items-center gap-2.5">
                      {item.logoUrl ? (
                        <img
                          src={item.logoUrl}
                          alt={item.servicio}
                          className="w-8 h-8 rounded-lg object-contain bg-black/60 p-1 border border-gray-800"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-red-950 text-red-400 flex items-center justify-center font-bold text-xs border border-red-800">
                          {item.servicio ? item.servicio.substring(0, 2) : 'PL'}
                        </div>
                      )}
                      <div>
                        <p className="font-bold text-white text-xs">{item.servicio} - {item.plan}</p>
                        <p className="text-[11px] text-gray-400">
                          Cantidad: <strong className="text-gray-200">{item.cantidad}</strong>
                          {item.duracionDias ? ` | Vigencia: ${item.duracionDias} días` : ''}
                          {item.resolucion ? ` | ${item.resolucion}` : ''}
                        </p>
                      </div>
                    </div>

                    <div className="text-left sm:text-right font-mono">
                      <p className="text-white font-bold text-xs">
                        {formatCOP(item.subtotal || item.precioUnitario * item.cantidad)}
                      </p>
                      <p className="text-[10px] text-gray-500">Unitario: {formatCOP(item.precioUnitario)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Suscripciones generadas */}
            {(() => {
              const activeSubs = (viewingOrder.subscriptions && viewingOrder.subscriptions.length > 0)
                ? viewingOrder.subscriptions
                : subscriptions.filter((s: any) => s.orderId === viewingOrder.id);

              if (!activeSubs || activeSubs.length === 0) return null;

              return (
                <div className="bg-gray-950/70 border border-gray-800 rounded-xl p-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                      Cuentas y Suscripciones Activadas
                    </span>
                    <span className="text-[10px] text-indigo-400 font-mono">
                      {activeSubs.length} cuenta(s) vinculada(s)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {activeSubs.map((sub: any, sIdx: number) => {
                      const hoy = new Date();
                      hoy.setHours(0, 0, 0, 0);
                      const venc = sub.fechaVencimiento ? new Date(sub.fechaVencimiento) : null;
                      const diasRestantes = typeof sub.diasRestantes === 'number'
                        ? sub.diasRestantes
                        : venc
                        ? Math.ceil((new Date(venc).setHours(0, 0, 0, 0) - hoy.getTime()) / (1000 * 60 * 60 * 24))
                        : 0;

                      const fechaPago = sub.fechaInicio || viewingOrder.fecha || viewingOrder.createdAt;

                      return (
                        <div
                          key={sIdx}
                          className="p-3.5 bg-gray-900/90 border border-gray-800 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-white text-xs">{sub.servicio} ({sub.plan})</p>
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                                  sub.estado === 'ACTIVA'
                                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60'
                                    : 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                                }`}
                              >
                                {sub.estado}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <p className="text-[11px] text-gray-300 font-mono">
                                {sub.emailCuenta ? `Usuario: ${sub.emailCuenta}` : 'Cuenta asignada'}
                                {sub.perfilAsignado ? ` | Perfil: ${sub.perfilAsignado}` : ''}
                              </p>
                            </div>
                            <p className="text-[10px] text-gray-500 mt-1">
                              Inicio:{' '}
                              <strong className="text-gray-400">
                                {sub.fechaInicio ? new Date(sub.fechaInicio).toLocaleDateString('es-CO') : 'N/A'}
                              </strong>
                            </p>
                          </div>

                          <div className="flex flex-col sm:items-end justify-center gap-1.5 self-start sm:self-auto bg-gray-950/80 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-gray-800/70 sm:border-0 w-full sm:w-auto">
                            {/* Días que le restan al cliente */}
                            <span
                              className={`self-start sm:self-end px-3 py-1 rounded-full text-xs font-black uppercase border inline-flex items-center gap-1.5 shadow-md ${
                                diasRestantes > 5
                                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60'
                                  : diasRestantes > 0
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-600/60'
                                  : diasRestantes === 0
                                  ? 'bg-orange-950/80 text-orange-300 border-orange-600/60'
                                  : 'bg-rose-950/80 text-rose-300 border-rose-600/60'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {diasRestantes > 1
                                ? `${diasRestantes} Días Restantes`
                                : diasRestantes === 1
                                ? '1 Día Restante'
                                : diasRestantes === 0
                                ? 'Vence Hoy'
                                : `Vencida (${Math.abs(diasRestantes)}d)`}
                            </span>

                            {/* Fecha de Pago y Fecha de Vencimiento Destacada */}
                            <div className="text-[11px] space-y-1 text-left sm:text-right">
                              <p className="text-gray-400 flex items-center gap-1.5 sm:justify-end">
                                <span className="text-gray-500">Fecha de Pago:</span>
                                <strong className="text-gray-300 font-mono">
                                  {fechaPago ? new Date(fechaPago).toLocaleDateString('es-CO') : 'N/A'}
                                </strong>
                              </p>
                              <p className="text-white flex items-center gap-1.5 sm:justify-end font-semibold">
                                <span className="text-indigo-300 font-bold uppercase text-[10px]">
                                  Fecha de Vencimiento:
                                </span>
                                <strong className="text-emerald-400 font-mono text-xs bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                                  {venc ? venc.toLocaleDateString('es-CO') : 'N/A'}
                                </strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* NORMAS DE USO Y CONDICIONES */}
            <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-gray-850">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white tracking-wide">
                      📋 NORMAS DE USO Y CONDICIONES
                    </h4>
                    <p className="text-[10px] text-gray-400">Reglas obligatorias para la preservación de la garantía y vigencia del servicio</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(NORMAS_USO_TEXT, 'order-normas-uso')}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white border border-gray-800 text-[11px] inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  title="Copiar texto de normas y condiciones"
                >
                  {copiedKey === 'order-normas-uso' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-semibold">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-gray-400" />
                      <span>Copiar Normas</span>
                    </>
                  )}
                </button>
              </div>

              {/* PERMITIDO */}
              <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <span>✅ PERMITIDO:</span>
                </p>
                <ul className="text-xs text-emerald-200/90 space-y-1 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Usar el servicio de forma personal en el perfil/pantalla asignada.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span>Disfrutar el contenido dentro de los límites del plan adquirido.</span>
                  </li>
                </ul>
              </div>

              {/* PROHIBIDO */}
              <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3.5 space-y-1.5">
                <p className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                  <span>❌ PROHIBIDO (puede causar CANCELACIÓN inmediata sin reembolso):</span>
                </p>
                <ul className="text-xs text-rose-200/90 space-y-1 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Compartir las credenciales con terceros no autorizados.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Cambiar la contraseña, nombre del perfil o PIN sin autorización.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Agregar o eliminar perfiles de la cuenta.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Acceder desde más dispositivos de los permitidos simultáneamente.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Intentar hacer descargas masivas o uso comercial del servicio.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-rose-400 font-bold">•</span>
                    <span>Ceder, vender o transferir el acceso a otra persona.</span>
                  </li>
                </ul>
              </div>

              {/* IMPORTANTE */}
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3.5 space-y-1.5">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <span>⚠️ IMPORTANTE:</span>
                </p>
                <ul className="text-xs text-amber-200/90 space-y-1.5 pl-1">
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>El incumplimiento de estas normas resultará en la <strong>SUSPENSIÓN</strong> o <strong>CANCELACIÓN</strong> inmediata de su cuenta <strong>SIN derecho a reembolso</strong>.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>Si detecta problemas técnicos, comuníquese con soporte <strong>ANTES</strong> de hacer cualquier cambio en la cuenta.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">•</span>
                    <span>Su acceso es personal e intransferible.</span>
                  </li>
                </ul>
              </div>

              <div className="pt-1 text-center border-t border-gray-850">
                <p className="text-xs text-gray-300 font-medium">
                  Gracias por confiar en nuestros servicios. 🙏
                </p>
              </div>
            </div>
          </div>

          {/* Pie del Modal Fijo con Soporte y Cerrar */}
            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <button
                onClick={() => handleOpenWarrantyFromOrder(viewingOrder)}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 inline-flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Headset className="w-4 h-4" />
                <span>Solicitar Soporte de esta Compra</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <a
                  href={`https://wa.me/${(settings?.whatsappNumber || '573000000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Hola, requiero soporte para mi compra con ID: #ORD-${viewingOrder.id.substring(0, 8).toUpperCase()} (UUID: ${viewingOrder.id}). Servicio: ${viewingOrder.items?.[0]?.servicio || 'Plataforma'}`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-800/60 text-emerald-300 hover:text-white font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Soporte WhatsApp</span>
                </a>

                <button
                  onClick={handleCloseViewingOrder}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ORDEN CANCELADA (SOLO LECTURA, SIN ACCIONES PERMITIDAS) */}
      {/* ========================================================================= */}
      {cancelledViewingOrder && (
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950 border border-red-800/60 rounded-2xl w-full max-w-xl shadow-2xl shadow-red-950/50 overflow-hidden animate-in zoom-in-95 flex flex-col">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800 bg-gray-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-500/50 flex items-center justify-center text-red-400 shrink-0 shadow-sm shadow-red-950/50">
                  <Ban className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-white tracking-wide uppercase">
                      Orden Cancelada
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-950/90 text-red-400 border border-red-800/80 shadow-sm">
                      Cancelada
                    </span>
                  </div>
                  <span className="font-mono text-purple-300 font-bold text-xs">
                    #ORD-{cancelledViewingOrder.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCancelledViewingOrder(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido Central */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
              {/* Icono de Cancelación Central y Estado */}
              <div className="text-center py-2 space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-red-950/90 to-red-900/40 border-2 border-red-500/60 text-red-400 flex items-center justify-center mx-auto shadow-xl shadow-red-950/80">
                  <Ban className="w-8 h-8 text-red-400" />
                </div>
                <h4 className="text-base font-extrabold text-white uppercase tracking-wider">
                  Esta orden de venta ha sido cancelada
                </h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                  La transacción fue dada de baja por la administración de la plataforma y su estado actual es cerrado.
                </p>
              </div>

              {/* MOTIVO DE CANCELACIÓN DESTACADO */}
              <div className="p-4 rounded-xl bg-red-950/30 border border-red-800/70 space-y-2 text-left shadow-lg shadow-red-950/30">
                <span className="text-[10px] text-red-300 uppercase tracking-wider font-extrabold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>MOTIVO POR EL CUAL SE CANCELÓ:</span>
                </span>
                <div className="p-3.5 bg-black/60 rounded-lg border border-red-900/60">
                  <p className="text-xs sm:text-sm font-semibold text-red-200 leading-relaxed break-words whitespace-pre-wrap">
                    {extractMotivoCancelacion(cancelledViewingOrder)}
                  </p>
                </div>
              </div>

              {/* Resumen de la Orden Cancelada (Solo Lectura) */}
              <div className="p-3.5 bg-gray-950/80 border border-gray-850 rounded-xl space-y-2.5 text-left">
                <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold block">
                  Información de la Compra Cancelada:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px]">Total Facturado:</span>
                    <strong className="text-white font-mono text-sm">{formatCOP(cancelledViewingOrder.total)}</strong>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px]">Método de Pago:</span>
                    <span className="text-gray-300 font-medium">{cancelledViewingOrder.metodoPago || 'Transferencia'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block text-[10px]">Fecha de Registro:</span>
                    <span className="text-gray-400 font-mono text-[11px]">
                      {new Date(cancelledViewingOrder.fecha || cancelledViewingOrder.createdAt).toLocaleString('es-CO')}
                    </span>
                  </div>
                </div>

                {cancelledViewingOrder.items && cancelledViewingOrder.items.length > 0 && (
                  <div className="pt-2 border-t border-gray-850 space-y-1">
                    <span className="text-[10px] text-gray-500 block">Servicios incluidos:</span>
                    {cancelledViewingOrder.items.map((it: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-gray-300 text-[11px]">
                        <span>• {it.servicio} - {it.plan} ({it.cantidad}x)</span>
                        <span className="font-mono text-gray-500">{formatCOP(it.subtotal || it.precioUnitario * it.cantidad)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Aviso de Inhabilitación de Acciones */}
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-left flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  No se permite adjuntar comprobantes, renovar ni realizar más operaciones sobre esta orden de compra. Si requieres el servicio, debes realizar una nueva solicitud.
                </p>
              </div>
            </div>

            {/* Pie del Modal con Soporte y Botón Cerrar */}
            <div className="p-4 sm:p-5 border-t border-gray-800 bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <a
                href={`https://wa.me/${(settings?.whatsappNumber || '573000000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `Hola, requiero información sobre mi orden cancelada #ORD-${cancelledViewingOrder.id.substring(0, 8).toUpperCase()} (UUID: ${cancelledViewingOrder.id}). Motivo: ${extractMotivoCancelacion(cancelledViewingOrder)}`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-800/60 text-emerald-300 hover:text-white font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>Consultar por WhatsApp</span>
              </a>

              <button
                type="button"
                onClick={() => setCancelledViewingOrder(null)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white font-bold cursor-pointer transition-colors"
              >
                Entendido / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Visor de Comprobante en Pantalla Completa */}
      {previewLightboxUrl && (
        <div
          className="fixed inset-0 z-[10000] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewLightboxUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex items-center justify-between p-3 border-b border-gray-800 bg-gray-950/80">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-purple-400" />
                <span>Comprobante de Pago Adjunto</span>
              </span>
              <button
                type="button"
                onClick={() => setPreviewLightboxUrl(null)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 overflow-auto max-h-[75vh] flex items-center justify-center">
              <img
                src={previewLightboxUrl}
                alt="Comprobante de Pago"
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg border border-gray-800"
              />
            </div>
            <div className="w-full p-2.5 border-t border-gray-800 bg-gray-950/80 flex items-center justify-end gap-2">
              <a
                href={previewLightboxUrl}
                download="comprobante-pago.png"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir / Descargar</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewLightboxUrl(null)}
                className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ACTIVAR O DESACTIVAR 2FA GOOGLE AUTHENTICATOR (CLIENTES)           */}
      {/* ========================================================================= */}
      {show2FAModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-5 border-b border-gray-850 flex items-center justify-between bg-gray-950/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  {twoFactorEnabled ? 'Desactivar Autenticación en 2 Pasos' : 'Vincular Google Authenticator'}
                </h3>
              </div>
              <button
                onClick={() => setShow2FAModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleToggle2FA} className="p-6 space-y-4 text-xs">
              {twoFactorActionError && (
                <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{twoFactorActionError}</span>
                </div>
              )}

              {!twoFactorEnabled ? (
                <>
                  <p className="text-gray-300 leading-relaxed">
                    1. Abre tu aplicación <strong className="text-white">Google Authenticator</strong> en tu celular y escanea el siguiente código QR:
                  </p>

                  <div className="flex flex-col items-center justify-center p-4 bg-gray-950 rounded-xl border border-gray-800">
                    {twoFactorActionLoading && !twoFactorSetupData ? (
                      <div className="w-44 h-44 flex flex-col items-center justify-center gap-2 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                        <span>Generando clave segura...</span>
                      </div>
                    ) : twoFactorSetupData?.qrCode ? (
                      <div className="p-2 bg-white rounded-xl shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={twoFactorSetupData.qrCode}
                          alt="QR Google Authenticator"
                          className="w-44 h-44 object-contain"
                        />
                      </div>
                    ) : null}

                    {twoFactorSetupData?.secret && (
                      <div className="w-full mt-3 pt-3 border-t border-gray-850">
                        <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                          <span>O escribe esta clave secreta:</span>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(twoFactorSetupData.secret);
                              setCopied2FASecret(true);
                              setTimeout(() => setCopied2FASecret(false), 2000);
                            }}
                            className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-semibold cursor-pointer"
                          >
                            {copied2FASecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copied2FASecret ? 'Copiada' : 'Copiar clave'}</span>
                          </button>
                        </div>
                        <code className="block bg-gray-900 border border-gray-800 rounded p-1.5 text-center font-mono text-[10px] text-gray-200 tracking-wider break-all select-all">
                          {twoFactorSetupData.secret}
                        </code>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">
                      2. Ingresa el código de 6 dígitos que muestra tu app para confirmar:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      value={twoFactorInputCode}
                      onChange={(e) => setTwoFactorInputCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-[0.3em] text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-200 text-xs">
                    ¿Estás seguro de que deseas desactivar la autenticación en dos pasos? Tu cuenta solo estará protegida por contraseña.
                  </div>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">
                      Ingresa el código actual de Google Authenticator para confirmar la desactivación:
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={twoFactorInputCode}
                      onChange={(e) => setTwoFactorInputCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-[0.3em] text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShow2FAModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-800 hover:bg-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={twoFactorActionLoading || twoFactorInputCode.length !== 6}
                  className={`px-5 py-2 rounded-xl text-white font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all ${
                    twoFactorEnabled
                      ? 'bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/40'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-950/40'
                  }`}
                >
                  {twoFactorActionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{twoFactorEnabled ? 'Desactivar Seguridad' : 'Activar 2FA'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
