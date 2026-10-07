'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import { useDialog } from '@/components/Dialog';
import { useSettings, BrandTwoToneText } from '@/context/SettingsContext';
import HeroParallaxBackground from '@/components/HeroParallaxBackground';
import {
  Tv,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Phone,
  Clock,
  ChevronRight,
  ArrowRight,
  Star,
  Lock,
  User,
  Mail,
  Globe,
  Loader2,
  Sparkles,
  HelpCircle,
  CreditCard,
  X,
  Search,
  Eye,
  EyeOff,
  AlertCircle,
  MessageCircle,
  ExternalLink,
  Check,
  UserCheck,
  UserPlus,
  LogIn,
  TrendingUp,
  DollarSign,
  ShieldAlert,
  Copy,
  Upload,
  Landmark,
} from 'lucide-react';

export default function HomePage() {
  const { alert } = useDialog();
  const { systemName, systemLogo, heroConfig } = useSettings();
  const [services, setServices] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [user, setUser] = useState<any>(null);
  const [showSellerModal, setShowSellerModal] = useState(false);

  // Modal de Checkout
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutSuccessOrder, setCheckoutSuccessOrder] = useState<any | null>(null);
  const [checkoutError, setCheckoutError] = useState('');

  // Modo de autenticación en checkout ('lookup' = buscar cuenta existente, 'new' = nuevo cliente)
  const [checkoutAuthTab, setCheckoutAuthTab] = useState<'lookup' | 'new'>('lookup');

  // Búsqueda de cuenta en Checkout
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutLookupLoading, setCheckoutLookupLoading] = useState(false);
  const [checkoutLookupResult, setCheckoutLookupResult] = useState<{
    searched: boolean;
    exists: boolean;
    nombre?: string;
    email?: string;
    customerId?: string;
  } | null>(null);
  const [checkoutPassword, setCheckoutPassword] = useState('');
  const [showCheckoutPassword, setShowCheckoutPassword] = useState(false);

  // Formulario para cliente nuevo
  const [guestForm, setGuestForm] = useState({
    nombre: '',
    email: '',
    whatsapp: '',
    pais: 'Colombia',
    password: '',
    metodoPago: 'Nequi / Bancolombia / Daviplata',
  });

  // Modal independiente de "Buscar Mi Cuenta" (Navbar / Hero)
  const [showQuickSearchModal, setShowQuickSearchModal] = useState(false);
  const [quickEmail, setQuickEmail] = useState('');
  const [quickLookupLoading, setQuickLookupLoading] = useState(false);
  const [quickResult, setQuickResult] = useState<{
    searched: boolean;
    exists: boolean;
    nombre?: string;
    email?: string;
  } | null>(null);
  const [quickPassword, setQuickPassword] = useState('');
  const [showQuickPassword, setShowQuickPassword] = useState(false);
  const [quickLoginLoading, setQuickLoginLoading] = useState(false);
  const [quickError, setQuickError] = useState('');
  const [referralCode, setReferralCode] = useState('');

  // Comprobante de pago y copiado de datos de consignación (Checkout público)
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptSuccessMsg, setReceiptSuccessMsg] = useState('');
  const [receiptErrorMsg, setReceiptErrorMsg] = useState('');
  const [copiedPaymentField, setCopiedPaymentField] = useState<string | null>(null);

  useEffect(() => {
    // Capturar código de referido si viene en la URL (?ref=CODIGO)
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) {
        setReferralCode(ref.trim().toUpperCase());
        Cookies.set('ref_code', ref.trim().toUpperCase(), { expires: 14 });
      } else {
        const saved = Cookies.get('ref_code');
        if (saved) setReferralCode(saved);
      }
    }

    // Verificar si hay usuario logueado en cookies
    const userCookie = Cookies.get('user');
    if (userCookie) {
      try {
        setUser(JSON.parse(userCookie));
      } catch (e) {
        console.error(e);
      }
    }

    const fetchCatalog = async () => {
      try {
        setLoading(true);
        const [servRes, planRes, setRes] = await Promise.all([
          api.get('/services'),
          api.get('/plans'),
          api.get('/settings').catch(() => ({ data: null })),
        ]);
        setServices(servRes.data);
        setPlans(planRes.data);
        if (setRes?.data) setSettings(setRes.data);
      } catch (err) {
        console.error('Error cargando catálogo:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCatalog();
  }, []);

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
      
      setCheckoutSuccessOrder((prev: any) => ({
        ...prev,
        order: {
          ...prev?.order,
          comprobanteUrl: receiptPreview,
        },
      }));
    } catch (err: any) {
      setReceiptErrorMsg(err.response?.data?.message || 'Error al subir el comprobante de pago');
    } finally {
      setUploadingReceipt(false);
    }
  };

  // Abrir checkout para un plan
  const handleOpenCheckout = async (plan: any) => {
    if (plan.stockDisponible !== undefined && plan.stockDisponible <= 0) {
      await alert('Este plan se encuentra temporalmente agotado.', { type: 'warning', title: 'Plan Agotado' });
      return;
    }
    setSelectedPlan(plan);
    setCheckoutSuccessOrder(null);
    setCheckoutError('');
    setCheckoutPassword('');
    setShowCheckoutPassword(false);
    setCheckoutLookupResult(null);
    setCheckoutAuthTab('lookup');
    setReceiptFile(null);
    setReceiptPreview(null);
    setReceiptSuccessMsg('');
    setReceiptErrorMsg('');
    setCopiedPaymentField(null);
    setShowCheckoutModal(true);
  };

  // Buscar cuenta por correo dentro del modal de checkout
  const handleLookupInCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!checkoutEmail.trim()) {
      setCheckoutError('Por favor ingresa un correo electrónico.');
      return;
    }

    setCheckoutLookupLoading(true);
    setCheckoutError('');
    try {
      const res = await api.post('/auth/lookup-email', {
        email: checkoutEmail.trim().toLowerCase(),
      });
      setCheckoutLookupResult({
        searched: true,
        exists: res.data.exists,
        nombre: '',
        email: checkoutEmail.trim().toLowerCase(),
        customerId: null,
      });

      if (!res.data.exists) {
        // Pre-cargar el correo en el formulario de registro por si desea registrarse
        setGuestForm((prev) => ({ ...prev, email: checkoutEmail.trim().toLowerCase() }));
      }
    } catch (err: any) {
      setCheckoutError('Error al verificar el correo. Intenta nuevamente.');
    } finally {
      setCheckoutLookupLoading(false);
    }
  };

  // Procesar compra
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);
    setCheckoutError('');

    try {
      let customerId = user?.customerId;
      let token = Cookies.get('token');

      // CASO 1: Si el usuario ya está autenticado
      if (user && customerId && token) {
        const orderRes = await api.post(
          '/orders',
          {
            customerId,
            items: [{ planId: selectedPlan.id, cantidad: 1 }],
            metodoPago: guestForm.metodoPago,
            codigoReferido: referralCode || Cookies.get('ref_code') || undefined,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setCheckoutSuccessOrder(orderRes.data);
        return;
      }

      // CASO 2: Usuario que ya tiene cuenta (buscar por correo y autenticar en el acto)
      if (checkoutAuthTab === 'lookup') {
        if (!checkoutLookupResult?.exists) {
          setCheckoutError('Primero verifica tu correo para continuar con la compra.');
          setCheckoutLoading(false);
          return;
        }

        if (!checkoutPassword) {
          setCheckoutError('Por favor ingresa tu contraseña para acceder.');
          setCheckoutLoading(false);
          return;
        }

        // Iniciar sesión
        const loginRes = await api.post('/auth/login', {
          email: checkoutEmail.trim().toLowerCase(),
          password: checkoutPassword,
        });

        token = loginRes.data.access_token;
        const loggedUser = loginRes.data.user;
        customerId = loggedUser.customerId;

        Cookies.set('token', token, { expires: 7 });
        Cookies.set('user', JSON.stringify(loggedUser), { expires: 7 });
        setUser(loggedUser);

        // Crear la orden con el customerId autenticado
        const orderRes = await api.post(
          '/orders',
          {
            customerId,
            items: [{ planId: selectedPlan.id, cantidad: 1 }],
            metodoPago: guestForm.metodoPago,
            codigoReferido: referralCode || Cookies.get('ref_code') || undefined,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setCheckoutSuccessOrder(orderRes.data);
        return;
      }

      // CASO 3: Usuario nuevo que se registra
      if (checkoutAuthTab === 'new') {
        const registerRes = await api.post('/auth/register', {
          nombre: guestForm.nombre.trim(),
          email: guestForm.email.trim().toLowerCase(),
          whatsapp: guestForm.whatsapp.trim(),
          pais: guestForm.pais,
          password: guestForm.password || 'cliente' + Math.floor(Math.random() * 90000 + 10000),
        });

        token = registerRes.data.access_token;
        const newUser = registerRes.data.user;
        customerId = newUser.customerId;

        Cookies.set('token', token, { expires: 7 });
        Cookies.set('user', JSON.stringify(newUser), { expires: 7 });
        setUser(newUser);

        // Crear la orden de compra
        const orderRes = await api.post(
          '/orders',
          {
            customerId,
            items: [{ planId: selectedPlan.id, cantidad: 1 }],
            metodoPago: guestForm.metodoPago,
            codigoReferido: referralCode || Cookies.get('ref_code') || undefined,
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setCheckoutSuccessOrder(orderRes.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setCheckoutError(Array.isArray(msg) ? msg.join(', ') : msg || 'Error al procesar la compra.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  // Búsqueda de cuenta rápida desde Navbar / Hero
  const handleQuickLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEmail.trim()) return;

    setQuickLookupLoading(true);
    setQuickError('');
    try {
      const res = await api.post('/auth/lookup-email', {
        email: quickEmail.trim().toLowerCase(),
      });
      setQuickResult({
        searched: true,
        exists: res.data.exists,
        nombre: '',
        email: quickEmail.trim().toLowerCase(),
      });
    } catch (err: any) {
      setQuickError('No se pudo verificar el correo. Intenta nuevamente.');
    } finally {
      setQuickLookupLoading(false);
    }
  };

  // Login desde modal de búsqueda rápida
  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPassword) {
      setQuickError('Ingresa tu contraseña.');
      return;
    }

    setQuickLoginLoading(true);
    setQuickError('');
    try {
      const response = await api.post('/auth/login', {
        email: quickEmail.trim().toLowerCase(),
        password: quickPassword,
      });

      const { access_token, user: loggedUser } = response.data;
      Cookies.set('token', access_token, { expires: 7 });
      Cookies.set('user', JSON.stringify(loggedUser), { expires: 7 });
      setUser(loggedUser);

      // Redirigir al portal correspondiente
      const isStaff =
        loggedUser.rol === 'ADMIN' ||
        loggedUser.rol === 'SOPORTE' ||
        loggedUser.rol === 'VENDEDOR' ||
        loggedUser.rol === 'ASESOR_COMERCIAL';
      window.location.href = isStaff
        ? (Array.isArray(loggedUser.modulosPermitidos) && loggedUser.modulosPermitidos.length > 0 && !loggedUser.modulosPermitidos.includes('/admin/dashboard')
            ? loggedUser.modulosPermitidos[0]
            : (loggedUser.rol === 'ASESOR_COMERCIAL' ? '/admin/seller' : '/admin/dashboard'))
        : '/client/dashboard';
    } catch (err: any) {
      const msg = err.response?.data?.message;
      setQuickError(
        typeof msg === 'string'
          ? msg
          : 'Contraseña incorrecta. Por favor verifica e intenta de nuevo.'
      );
    } finally {
      setQuickLoginLoading(false);
    }
  };

  const handleLogout = () => {
    Cookies.remove('token');
    Cookies.remove('user');
    setUser(null);
  };

  const formatCOP = (amount: any) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(Number(amount) || 0);
  };

  const filteredPlans = plans.filter((p) => {
    if (selectedCategory === 'all') return true;
    return p.serviceId === selectedCategory;
  });

  if (!loading && settings?.mantenimiento && user?.rol !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full p-8 bg-gray-950/80 border border-amber-900/60 rounded-3xl shadow-2xl space-y-6">
          <div className="w-16 h-16 bg-amber-950/60 border border-amber-800/80 rounded-2xl mx-auto flex items-center justify-center text-amber-400 shadow-lg shadow-amber-950/50 animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-bold bg-amber-950/60 px-3 py-1 rounded-full border border-amber-900/40">
              Plataforma en Mantenimiento
            </span>
            <h1 className="text-2xl font-black text-white mt-3">
              {systemName}
            </h1>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              {settings.mensajeMantenimiento ||
                'Estamos realizando labores de mantenimiento programado en nuestra plataforma. Volveremos muy pronto.'}
            </p>
          </div>
          <div className="p-4 bg-gray-900/80 border border-gray-800 rounded-2xl text-xs text-gray-300">
            <p className="text-[11px] text-gray-400">¿Tienes alguna duda o solicitud urgente?</p>
            {settings.whatsappSoporte && (
              <a
                href={`https://wa.me/${settings.whatsappSoporte.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-all shadow-md shadow-emerald-950/40"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Contactar Soporte WhatsApp</span>
              </a>
            )}
          </div>
          <div className="pt-2 border-t border-gray-900 text-[10px] text-gray-500">
            Si eres administrador, puedes{' '}
            <Link href="/login" className="text-red-400 hover:underline">
              iniciar sesión aquí
            </Link>
            .
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-gray-100 flex flex-col selection:bg-red-600 selection:text-white relative overflow-x-hidden">
      {/* Dynamic Netflix-Style Parallax Hero Background */}
      <HeroParallaxBackground config={heroConfig} />


      {/* NAVBAR FIJA */}
      <header className="sticky top-0 z-50 bg-[#030712] border-b border-gray-800 px-4 sm:px-8 h-16 flex items-center justify-between shadow-xl">
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden shrink-0 ${
              systemLogo
                ? 'bg-transparent shadow-none'
                : 'bg-gradient-to-tr from-red-600 to-rose-500 shadow-lg shadow-red-600/30'
            }`}
          >
            {systemLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={systemLogo} alt={systemName} className="w-full h-full object-contain" />
            ) : (
              <Tv className="w-5 h-5 text-white" />
            )}
          </div>
          <BrandTwoToneText className="text-xl font-black tracking-tight" />
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-gray-300">
          <a href="#catalogo" className="hover:text-white transition-colors">
            Catálogo de Planes
          </a>
          <a href="#beneficios" className="hover:text-white transition-colors">
            Beneficios
          </a>
          <a href="#preguntas" className="hover:text-white transition-colors">
            Preguntas Frecuentes
          </a>
        </nav>

        <div className="flex items-center gap-2.5">
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href={
                  user.rol === 'ADMIN' || user.rol === 'SOPORTE' || user.rol === 'VENDEDOR' || user.rol === 'ASESOR_COMERCIAL'
                    ? (Array.isArray(user.modulosPermitidos) && user.modulosPermitidos.length > 0 && !user.modulosPermitidos.includes('/admin/dashboard')
                        ? user.modulosPermitidos[0]
                        : (user.rol === 'ASESOR_COMERCIAL' ? '/admin/seller' : '/admin/dashboard'))
                    : '/client/dashboard'
                }
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/20 transition-all flex items-center gap-1.5"
              >
                <span>Mi Portal ({user.nombre?.split(' ')[0]})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <>
              {/* Botón Quiero Vender en Navbar */}
              <button
                onClick={() => setShowSellerModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 text-xs font-bold text-emerald-300 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
              >
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                <span>Quiero Vender</span>
              </button>

              {/* Botón Buscar Mi Cuenta */}
              <button
                onClick={() => {
                  setQuickResult(null);
                  setQuickEmail('');
                  setQuickPassword('');
                  setQuickError('');
                  setShowQuickSearchModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-800 bg-gray-900/60 hover:bg-gray-800 text-xs font-medium text-gray-200 transition-colors cursor-pointer"
              >
                <Search className="w-3.5 h-3.5 text-red-400" />
                <span className="hidden sm:inline">Buscar mi cuenta</span>
              </button>

              <Link
                href="/login"
                className="px-3 py-1.5 rounded-xl border border-gray-800 hover:bg-gray-850 text-xs font-medium text-gray-300 transition-colors"
              >
                Iniciar Sesión
              </Link>

              <a
                href="#catalogo"
                className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-lg shadow-red-600/20 transition-all"
              >
                Comprar Ahora
              </a>
            </>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative z-10 pt-16 pb-16 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-800/50 text-red-300 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <Zap className="w-3.5 h-3.5 text-red-400" />
          <span>Entrega Automática e Inmediata por WhatsApp</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.15]">
          Tu Streaming Favorito en{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-500 to-amber-500">
            4K Ultra HD
          </span>{' '}
          al Mejor Precio
        </h1>

        <p className="text-sm sm:text-base text-gray-300 max-w-2xl mx-auto leading-relaxed">
          Accede a cuentas y perfiles privados de{' '}
          <strong>Netflix, Disney+, Max, Spotify, Prime Video y YouTube</strong> con garantía total,
          soporte 24/7 y activación en segundos.
        </p>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#catalogo"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-sm font-bold shadow-xl shadow-red-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Ver Catálogo y Comprar</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          {/* Botón Quiero Vender en el Hero */}
          <button
            onClick={() => setShowSellerModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-sm font-bold shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 text-white" />
            <span>Quiero Vender</span>
          </button>

          {user ? (
            <Link
              href="/client/dashboard"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-gray-200 text-sm font-semibold transition-all flex items-center justify-center gap-2"
            >
              <span>Ir a Mi Portal de Cliente</span>
              <ArrowRight className="w-4 h-4 text-red-400" />
            </Link>
          ) : (
            <button
              onClick={() => {
                setQuickResult(null);
                setQuickEmail('');
                setQuickPassword('');
                setQuickError('');
                setShowQuickSearchModal(true);
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gray-900/80 hover:bg-gray-800 border border-gray-800 text-gray-200 text-sm font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-red-400" />
              <span>¿Ya tienes cuenta? Búscala aquí</span>
            </button>
          )}
        </div>

        {/* Badges de Confianza */}
        <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-gray-850/80">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
            <ShieldCheck className="w-4 h-4 text-red-500 shrink-0" />
            <span>Garantía de 30 Días</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Entrega en 1 Minuto</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
            <CreditCard className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Nequi / Bancolombia / PSE</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-300">
            <Phone className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Soporte WhatsApp 24/7</span>
          </div>
        </div>
      </section>

      {/* BANNER RÁPIDO: BUSCADOR DE CUENTA PARA CLIENTES REGISTRADOS */}
      {!user && (
        <section className="relative z-10 px-4 sm:px-6 max-w-4xl mx-auto w-full -mt-4 mb-4">
          <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400 shrink-0">
                <Search className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">¿Ya eres cliente de {systemName}?</h3>
                <p className="text-xs text-gray-400">
                  Busca tu cuenta con tu correo para comprar de inmediato o ver tus credenciales activas.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setQuickResult(null);
                setQuickEmail('');
                setQuickPassword('');
                setQuickError('');
                setShowQuickSearchModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-md shadow-red-600/20 shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Buscar mi cuenta</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </section>
      )}

      {/* CATÁLOGO DE PLANES */}
      <section id="catalogo" className="relative z-10 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Plataformas y Planes Disponibles
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            Selecciona tu servicio preferido y recibe tus credenciales de inmediato
          </p>
        </div>

        {/* Filtro de Categorías */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                : 'bg-[#0b0f19] text-gray-300 hover:text-white border border-gray-800'
            }`}
          >
            Todas las Plataformas ({plans.length})
          </button>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedCategory(s.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer flex items-center gap-2 ${
                selectedCategory === s.id
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
                  : 'bg-[#0b0f19] text-gray-300 hover:text-white border border-gray-800'
              }`}
            >
              {s.logoUrl && <img src={s.logoUrl} alt="" className="w-3.5 h-3.5 object-contain" />}
              <span>{s.nombre}</span>
            </button>
          ))}
        </div>

        {/* Grid de Planes */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPlans.map((plan) => {
              const service = services.find((s) => s.id === plan.serviceId);

              return (
                <div
                  key={plan.id}
                  className="bg-[#0b0f19] border border-gray-800 hover:border-red-600/50 rounded-2xl p-6 shadow-2xl flex flex-col justify-between space-y-6 transition-all hover:shadow-2xl group"
                >
                  <div className="space-y-4">
                    {/* Header de la tarjeta */}
                    <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                      <div className="flex items-center gap-3">
                        {service?.logoUrl ? (
                          <img
                            src={service.logoUrl}
                            alt={service.nombre}
                            className="w-10 h-10 object-contain rounded-xl bg-black p-1 border border-gray-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-red-950 flex items-center justify-center font-bold text-red-400">
                            {service?.nombre?.substring(0, 2) || 'ST'}
                          </div>
                        )}
                        <div>
                          <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider block">
                            {service?.nombre}
                          </span>
                          <h3 className="text-base font-bold text-white leading-tight">
                            {plan.nombrePlan}
                          </h3>
                        </div>
                      </div>

                      {/* Insignia de Stock */}
                      <div>
                        {plan.stockDisponible !== undefined && plan.stockDisponible <= 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-red-950 text-red-400 border border-red-800 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            <span>Agotado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span>{plan.stockDisponible !== undefined ? `${plan.stockDisponible} en stock` : 'Disponible'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Precio */}
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{formatCOP(plan.precio)}</span>
                        <span className="text-xs text-gray-400">/ {plan.duracionDias} días</span>
                      </div>
                      <span className="inline-block mt-1 text-[11px] text-emerald-300 font-semibold bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                        Garantía de reposición {plan.garantiaDias} días
                      </span>
                    </div>

                    {/* Características */}
                    <ul className="space-y-2 text-xs text-gray-300 pt-2">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Resolución: <strong>{plan.resolucion || 'FHD 1080p'}</strong>
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>
                          Pantallas: <strong>{plan.pantallasSimultaneas} simultánea(s)</strong>
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Perfil personal protegido con PIN</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Despacho al instante vía WhatsApp</span>
                      </li>
                    </ul>
                  </div>

                  {/* Botón de compra */}
                  {plan.stockDisponible !== undefined && plan.stockDisponible <= 0 ? (
                    <button
                      disabled
                      className="w-full py-3 bg-gray-900 text-gray-500 border border-gray-800 text-xs font-bold rounded-xl shadow-none flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <AlertCircle className="w-4 h-4 text-red-400" />
                      <span>Agotado Temporalmente</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleOpenCheckout(plan)}
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer group-hover:scale-[1.02]"
                    >
                      <span>Comprar Ahora</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* BENEFICIOS SECTION */}
      <section id="beneficios" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-red-500 uppercase tracking-widest">¿Por qué elegirnos?</span>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            La Experiencia de Streaming Más Confiable
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Despacho Inmediato</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Sistema 100% automatizado con cola FIFO que entrega tus cuentas por WhatsApp al validar el pago.
            </p>
          </div>

          <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Garantía Anti-Caídas</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Si tu cuenta presenta cualquier problema, solicítanos reemplazo en 1 clic desde tu portal de cliente.
            </p>
          </div>

          <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <Tv className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Portal de Autogestión</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Accede a tus credenciales, perfil y PIN desde cualquier navegador sin perder nunca tus datos.
            </p>
          </div>

          <div className="bg-[#0b0f19] border border-gray-800 rounded-2xl p-6 shadow-xl space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
              <Phone className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Recordatorios WhatsApp</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Te avisamos con anticipación antes de vencer para que renueves tu mismo perfil sin interrupciones.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section id="preguntas" className="relative z-10 py-16 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">Resolvemos tus dudas principales</p>
        </div>

        <div className="space-y-3 text-xs">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-1">
            <h4 className="font-bold text-white text-sm">¿Cómo y cuándo recibo mi cuenta?</h4>
            <p className="text-gray-400">
              Una vez validado tu pago, nuestro sistema automático te enviará un mensaje por WhatsApp con tu correo, clave, número de perfil y PIN. Además, podrás ver tus credenciales en cualquier momento desde tu Portal de Cliente.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-1">
            <h4 className="font-bold text-white text-sm">¿Qué medios de pago aceptan?</h4>
            <p className="text-gray-400">
              Aceptamos transferencias directas por Nequi, Bancolombia, Daviplata, tarjetas de crédito/débito y PSE.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-1">
            <h4 className="font-bold text-white text-sm">¿Cómo funciona la garantía de reemplazo?</h4>
            <p className="text-gray-400">
              Todos nuestros planes cuentan con garantía durante todo el periodo contratado (30 días). Si una cuenta llega a fallar, ingresas a tu portal, haces clic en "Reportar Problema" y nuestro equipo te asignará una cuenta de reemplazo de inmediato.
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 space-y-1">
            <h4 className="font-bold text-white text-sm">¿Puedo renovar mi mismo perfil al finalizar los 30 días?</h4>
            <p className="text-gray-400">
              ¡Sí! Te enviaremos un aviso a tu WhatsApp 7 días antes de vencer con un enlace para que renueves sin perder tu lista de favoritos ni tu historial.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-gray-850/80 py-8 px-4 text-center text-xs text-gray-500 space-y-2">
        <p>&copy; {new Date().getFullYear()} {systemName} • Todos los derechos reservados.</p>
        <p className="text-[11px] text-gray-600">
          Plataforma independiente de gestión y distribución digital de streaming.
        </p>
      </footer>

      {/* MODAL DE CHECKOUT MEJORADO */}
      {showCheckoutModal && selectedPlan && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Cabecera del modal */}
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div>
                <h3 className="text-base font-bold text-white">Comprar Plan de Streaming</h3>
                <p className="text-xs text-gray-400">Entrega inmediata de credenciales a tu WhatsApp</p>
              </div>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-850 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutSuccessOrder ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                  {/* Resumen del Plan Seleccionado */}
                  <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-850 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {services.find((s) => s.id === selectedPlan.serviceId)?.logoUrl && (
                        <img
                          src={services.find((s) => s.id === selectedPlan.serviceId)?.logoUrl}
                          alt=""
                          className="w-9 h-9 object-contain rounded-lg bg-black/40 p-1 border border-gray-850"
                        />
                      )}
                      <div>
                        <p className="font-bold text-white text-sm">
                          {services.find((s) => s.id === selectedPlan.serviceId)?.nombre}
                        </p>
                        <p className="text-gray-400">{selectedPlan.nombrePlan}</p>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {selectedPlan.pantallasSimultaneas} pantalla(s) • {selectedPlan.duracionDias} días
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-white">{formatCOP(selectedPlan.precio)}</span>
                      <span className="block text-[10px] text-gray-500">Pago único</span>
                    </div>
                  </div>

                  {/* Mensajes de error */}
                  {checkoutError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{checkoutError}</span>
                    </div>
                  )}

                  {/* VISTA DE ÉXITO DE COMPRA */}
                  <div className="space-y-4 py-2 text-center animate-in fade-in zoom-in-95">
                <div className="w-13 h-13 bg-emerald-950/80 border border-emerald-600/60 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-lg shadow-emerald-950/50">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-bold text-white">¡Orden Registrada con Éxito!</h4>
                  <p className="text-xs text-gray-300">
                    Número de Orden:{' '}
                    <span className="font-mono font-bold text-red-400">
                      #{checkoutSuccessOrder.order?.id?.substring(0, 8)}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">
                    Total a cancelar: <strong className="text-white text-sm">{formatCOP(selectedPlan.precio)}</strong>
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
                            titular: `${systemName || 'MezaStreaming'} Pagos`,
                            documento: 'CC 1.098.765.432',
                            instrucciones: 'Envía a Nequi directamente. Adjunta tu soporte tras realizarlo.',
                          },
                          {
                            id: 'bancolombia-def',
                            banco: 'Bancolombia',
                            tipoCuenta: 'Cuenta de Ahorros',
                            numeroCuenta: '912-000123-45',
                            titular: `${systemName || 'MezaStreaming'} SAS`,
                            documento: 'NIT 901.234.567-8',
                            instrucciones: 'Transferencia directa desde App Bancolombia o QR sin costo.',
                          },
                          {
                            id: 'daviplata-def',
                            banco: 'Daviplata',
                            tipoCuenta: 'Billetera Digital',
                            numeroCuenta: '3001234567',
                            titular: `${systemName || 'MezaStreaming'} Pagos`,
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
                            onClick={() => handleCopyPaymentInfo(medio.numeroCuenta, `pub-num-${medio.id}`)}
                            className="px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 text-[11px] font-semibold flex items-center gap-1 transition-all cursor-pointer border border-gray-700 hover:text-white"
                          >
                            {copiedPaymentField === `pub-num-${medio.id}` ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-400 font-bold">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-gray-400" />
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
                              onClick={() => handleCopyPaymentInfo(medio.titular, `pub-tit-${medio.id}`)}
                              className="px-2 py-1 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 hover:text-white text-[10px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                              title="Copiar Titular"
                            >
                              {copiedPaymentField === `pub-tit-${medio.id}` ? (
                                <span className="text-emerald-400 font-bold">¡Copiado!</span>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-gray-400" />
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
                              onClick={() => handleCopyPaymentInfo(medio.documento, `pub-doc-${medio.id}`)}
                              className="px-2 py-1 rounded bg-gray-850 hover:bg-gray-800 text-gray-300 hover:text-white text-[10px] flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                              title="Copiar Documento"
                            >
                              {copiedPaymentField === `pub-doc-${medio.id}` ? (
                                <span className="text-emerald-400 font-bold">¡Copiado!</span>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-gray-400" />
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
                  {(receiptSuccessMsg || checkoutSuccessOrder.order?.comprobanteUrl) ? (
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
                          src={receiptPreview || checkoutSuccessOrder.order?.comprobanteUrl}
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
                        id="receipt-file-input-public"
                        onChange={handleReceiptFileChange}
                        className="hidden"
                      />

                      {!receiptPreview ? (
                        <label
                          htmlFor="receipt-file-input-public"
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
                            onClick={() => handleUploadReceipt(checkoutSuccessOrder.order?.id)}
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
                    <strong>#{checkoutSuccessOrder.order?.id?.substring(0, 8)}</strong> para agilizar la validación y entrega de tus credenciales.
                  </p>
                </div>
              </div>
            </div>

                {/* Botones de acción Fijos abajo */}
                <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex flex-col sm:flex-row items-center justify-end gap-2 text-xs">
                  <a
                    href={`https://wa.me/${(settings?.whatsappSoporte || '+573001234567').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `¡Hola! Acabo de crear la orden #${checkoutSuccessOrder.order?.id?.substring(
                        0,
                        8
                      )} para el plan "${selectedPlan.nombrePlan}" (${services.find((s) => s.id === selectedPlan.serviceId)?.nombre}) por ${formatCOP(
                        selectedPlan.precio
                      )}. Adjunto mi comprobante para la verificación.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar Comprobante por WhatsApp</span>
                  </a>

                  <Link
                    href="/client/dashboard"
                    className="w-full sm:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Ir a Mi Portal de Cliente</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="w-full sm:w-auto px-4 py-2.5 text-xs text-gray-400 hover:text-white bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cerrar ventana
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs">
                  {/* Resumen del Plan Seleccionado */}
                  <div className="bg-gray-950 p-3.5 rounded-xl border border-gray-850 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      {services.find((s) => s.id === selectedPlan.serviceId)?.logoUrl && (
                        <img
                          src={services.find((s) => s.id === selectedPlan.serviceId)?.logoUrl}
                          alt=""
                          className="w-9 h-9 object-contain rounded-lg bg-black/40 p-1 border border-gray-850"
                        />
                      )}
                      <div>
                        <p className="font-bold text-white text-sm">
                          {services.find((s) => s.id === selectedPlan.serviceId)?.nombre}
                        </p>
                        <p className="text-gray-400">{selectedPlan.nombrePlan}</p>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {selectedPlan.pantallasSimultaneas} pantalla(s) • {selectedPlan.duracionDias} días
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-white">{formatCOP(selectedPlan.precio)}</span>
                      <span className="block text-[10px] text-gray-500">Pago único</span>
                    </div>
                  </div>

                  {/* Mensajes de error */}
                  {checkoutError && (
                    <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                      <span>{checkoutError}</span>
                    </div>
                  )}
                {/* SI EL USUARIO YA ESTÁ LOGUEADO */}
                {user ? (
                  <div className="p-3.5 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5" />
                        Comprando con tu cuenta activa
                      </span>
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="text-[10px] text-gray-400 hover:text-red-400 transition-colors underline cursor-pointer"
                      >
                        Cambiar de cuenta
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-bold text-white">{user.nombre}</span>
                      <span className="text-gray-400 font-mono">{user.email}</span>
                    </div>
                  </div>
                ) : (
                  /* SI NO ESTÁ LOGUEADO: SELECTOR DE FLUJO (YA TENGO CUENTA / SOY NUEVO) */
                  <div className="space-y-3.5">
                    {/* Tabs de selección de flujo */}
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-gray-950 border border-gray-850 rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutAuthTab('lookup');
                          setCheckoutError('');
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          checkoutAuthTab === 'lookup'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>Ya tengo cuenta</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCheckoutAuthTab('new');
                          setCheckoutError('');
                        }}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          checkoutAuthTab === 'new'
                            ? 'bg-red-600 text-white shadow-md'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Soy cliente nuevo</span>
                      </button>
                    </div>

                    {/* FLUJO 1: BUSCAR CUENTA POR CORREO */}
                    {checkoutAuthTab === 'lookup' && (
                      <div className="space-y-3 p-3.5 bg-gray-950/70 border border-gray-850 rounded-xl">
                        <div>
                          <label className="block text-gray-400 font-semibold mb-1">
                            Correo Electrónico de tu cuenta
                          </label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                              <input
                                type="email"
                                value={checkoutEmail}
                                onChange={(e) => {
                                  setCheckoutEmail(e.target.value);
                                  setCheckoutLookupResult(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleLookupInCheckout();
                                  }
                                }}
                                placeholder="ejemplo@correo.com"
                                className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={checkoutLookupLoading || !checkoutEmail.trim()}
                              onClick={() => handleLookupInCheckout()}
                              className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                            >
                              {checkoutLookupLoading ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Search className="w-3.5 h-3.5 text-red-400" />
                              )}
                              <span>Buscar</span>
                            </button>
                          </div>
                        </div>

                        {/* Resultado de la búsqueda: Cuenta encontrada */}
                        {checkoutLookupResult?.searched && checkoutLookupResult.exists && (
                          <div className="space-y-3 pt-2 animate-in fade-in">
                            <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-2 text-emerald-300">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                <div>
                                  <p className="font-bold">¡Cuenta encontrada!</p>
                                  <p className="text-[11px] text-emerald-200/80">
                                    Hola, <strong>{checkoutLookupResult.nombre}</strong>
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Contraseña para acceder y comprar */}
                            <div>
                              <label className="block text-gray-400 font-semibold mb-1">
                                Contraseña de tu cuenta
                              </label>
                              <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                <input
                                  type={showCheckoutPassword ? 'text' : 'password'}
                                  required
                                  value={checkoutPassword}
                                  onChange={(e) => setCheckoutPassword(e.target.value)}
                                  placeholder="Ingresa tu contraseña"
                                  className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-9 pr-10 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowCheckoutPassword(!showCheckoutPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                                >
                                  {showCheckoutPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Resultado de la búsqueda: Cuenta NO encontrada */}
                        {checkoutLookupResult?.searched && !checkoutLookupResult.exists && (
                          <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-200 space-y-2 animate-in fade-in">
                            <p className="text-[11px]">
                              No encontramos ninguna cuenta con <strong>{checkoutEmail}</strong>.
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setGuestForm((prev) => ({ ...prev, email: checkoutEmail.trim() }));
                                setCheckoutAuthTab('new');
                              }}
                              className="text-xs font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer"
                            >
                              → Registrarme como cliente nuevo con este correo
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* FLUJO 2: NUEVO CLIENTE (REGISTRO COMPLETO) */}
                    {checkoutAuthTab === 'new' && (
                      <div className="space-y-3 p-3.5 bg-gray-950/70 border border-gray-850 rounded-xl animate-in fade-in">
                        <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider">
                          Datos de Entrega (Se creará tu cuenta de cliente)
                        </p>

                        <div>
                          <label className="block text-gray-400 font-semibold mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            required
                            value={guestForm.nombre}
                            onChange={(e) => setGuestForm({ ...guestForm, nombre: e.target.value })}
                            placeholder="Ej. Andrés Ramírez"
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-gray-400 font-semibold mb-1">Correo Electrónico</label>
                            <input
                              type="email"
                              required
                              value={guestForm.email}
                              onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                              placeholder="andres@ejemplo.com"
                              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                            />
                          </div>
                          <div>
                            <label className="block text-gray-400 font-semibold mb-1">WhatsApp de Entrega</label>
                            <input
                              type="tel"
                              required
                              value={guestForm.whatsapp}
                              onChange={(e) => setGuestForm({ ...guestForm, whatsapp: e.target.value })}
                              placeholder="+57 310 123 4567"
                              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-gray-400 font-semibold mb-1">
                            Crea una Contraseña para tu Portal
                          </label>
                          <input
                            type="password"
                            required
                            minLength={6}
                            value={guestForm.password}
                            onChange={(e) => setGuestForm({ ...guestForm, password: e.target.value })}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Método de pago */}
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Método de Pago</label>
                  <select
                    value={guestForm.metodoPago}
                    onChange={(e) => setGuestForm({ ...guestForm, metodoPago: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white cursor-pointer"
                  >
                    <option value="Nequi / Bancolombia / Daviplata">Nequi / Bancolombia / Daviplata</option>
                    <option value="Tarjeta de Crédito / Débito">Tarjeta de Crédito / Débito</option>
                    <option value="PSE">PSE</option>
                  </select>
                </div>
              </div>

              {/* Botones de acción Fijos abajo */}
              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer transition-colors"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    checkoutLoading ||
                    (!user && checkoutAuthTab === 'lookup' && !checkoutLookupResult?.exists)
                  }
                  className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {checkoutLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {checkoutAuthTab === 'lookup' && !user
                      ? `Acceder y Comprar (${formatCOP(selectedPlan.precio)})`
                      : `Confirmar Pedido (${formatCOP(selectedPlan.precio)})`}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    )}

      {/* MODAL DE BÚSQUEDA RÁPIDA DE CUENTA (NAVBAR / HERO) */}
      {showQuickSearchModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/30 flex items-center justify-center text-red-400">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Buscar Mi Cuenta</h3>
                  <p className="text-xs text-gray-400">Accede con tu correo para ver o comprar planes</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuickSearchModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-850 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">

            {quickError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{quickError}</span>
              </div>
            )}

            {/* Formulario de búsqueda por correo */}
            <form onSubmit={handleQuickLookup} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">
                  Ingresa el Correo Electrónico Registrado
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    required
                    value={quickEmail}
                    onChange={(e) => {
                      setQuickEmail(e.target.value);
                      setQuickResult(null);
                      setQuickError('');
                    }}
                    placeholder="cliente@ejemplo.com"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              {!quickResult?.exists && (
                <button
                  type="submit"
                  disabled={quickLookupLoading || !quickEmail.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {quickLookupLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Buscando cuenta...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Buscar Mi Cuenta</span>
                    </>
                  )}
                </button>
              )}
            </form>

            {/* Resultado: Cuenta encontrada -> Formulario de ingreso de contraseña */}
            {quickResult?.searched && quickResult.exists && (
              <form onSubmit={handleQuickLogin} className="space-y-3 pt-2 border-t border-gray-800 animate-in fade-in">
                <div className="p-3 bg-emerald-950/50 border border-emerald-800/80 rounded-xl flex items-center gap-2.5 text-emerald-300 text-xs">
                  <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <p className="font-bold">¡Cuenta encontrada!</p>
                    <p className="text-[11px] text-emerald-200/80">
                      Hola, <strong>{quickResult.nombre}</strong>. Ingresa tu contraseña para acceder a tu portal.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input
                      type={showQuickPassword ? 'text' : 'password'}
                      required
                      value={quickPassword}
                      onChange={(e) => setQuickPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowQuickPassword(!showQuickPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showQuickPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={quickLoginLoading}
                  className="w-full py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/25 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                >
                  {quickLoginLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Iniciando sesión...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5" />
                      <span>Acceder a Mi Portal</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Resultado: Cuenta NO encontrada */}
            {quickResult?.searched && !quickResult.exists && (
              <div className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-xs space-y-2 text-center animate-in fade-in">
                <p className="text-gray-300">
                  No encontramos ninguna cuenta con el correo{' '}
                  <strong className="text-white">{quickEmail}</strong>.
                </p>
                <div className="pt-1 flex flex-col gap-2">
                  <Link
                    href="/register"
                    className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs rounded-xl text-center shadow transition-all"
                  >
                    Crear una cuenta nueva
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickResult(null);
                      setQuickEmail('');
                    }}
                    className="text-gray-400 hover:text-white text-xs py-1"
                  >
                    Intentar con otro correo
                  </button>
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUIERO VENDER / PROGRAMA DE AFILIADOS Y REVENDEDORES */}
      {showSellerModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Glow superior */}
            <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/20 rounded-full blur-3xl" />

            <div className="flex items-start justify-between p-5 border-b border-gray-800 relative z-10 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-600/30 text-white">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">¡Quiero Vender Streaming!</h3>
                  <p className="text-xs text-emerald-400 font-semibold">Programa de Revendedores & Afiliados</p>
                </div>
              </div>
              <button
                onClick={() => setShowSellerModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">

            <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
              Monetiza tu red de contactos y clientes ofreciendo las plataformas más demandadas: <strong>Netflix, Disney+, Max, Spotify, Prime Video y YouTube</strong> con precios de mayorista y despacho instantáneo.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <DollarSign className="w-4 h-4" />
                  <span>Hasta 40% Ganancia</span>
                </div>
                <p className="text-[11px] text-gray-400">Precios especiales para que vendas con el mejor margen.</p>
              </div>

              <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <Zap className="w-4 h-4" />
                  <span>Entrega Automática</span>
                </div>
                <p className="text-[11px] text-gray-400">Tus clientes reciben sus credenciales por WhatsApp en segundos.</p>
              </div>

              <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Garantía Respaldada</span>
                </div>
                <p className="text-[11px] text-gray-400">Soporte y reemplazo inmediato sin que pierdas clientes.</p>
              </div>

              <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <CreditCard className="w-4 h-4" />
                  <span>Retiros a Nequi</span>
                </div>
                <p className="text-[11px] text-gray-400">Transfiere tus comisiones acumuladas cuando quieras.</p>
              </div>
            </div>

            </div>

            {/* Acciones Fijas abajo */}
            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end text-xs">
              <a
                href={`https://wa.me/${(settings?.whatsappSoporte || settings?.whatsappNumber || '573001234567').replace(/[^0-9]/g, '')}?text=${encodeURIComponent('Hola, quiero información para vender cuentas de streaming como revendedor / asesor mayorista')}`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Phone className="w-4 h-4 text-white" />
                <span>Hablar con Asesor Mayorista</span>
                <ExternalLink className="w-3.5 h-3.5 text-emerald-100/80" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}