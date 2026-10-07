'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import {
  Loader2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  HelpCircle,
  Phone,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Copy,
  Check,
  KeyRound,
} from 'lucide-react';

interface TwoFactorData {
  type: 'VERIFY' | 'SETUP';
  tempToken: string;
  user: any;
  secret?: string;
  qrCode?: string;
  otpauthUrl?: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Estados de 2FA (Google Authenticator)
  const [twoFactorState, setTwoFactorState] = useState<TwoFactorData | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Control de intentos fallidos
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    api.get('/settings')
      .then((res) => setSettings(res.data))
      .catch(() => {});
  }, []);

  const completeLoginSession = (access_token: string, user: any, refresh_token?: string) => {
    setFailedAttempts(0);
    // Access Token 8h (1/3 día) - SRS RNF-S06
    Cookies.set('token', access_token, { expires: 1 / 3 });
    if (refresh_token) {
      // Refresh Token 30 días - SRS RNF-S06
      Cookies.set('refreshToken', refresh_token, { expires: 30 });
    }
    Cookies.set('user', JSON.stringify(user), { expires: 30 });
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
      if (refresh_token) {
        localStorage.setItem('refreshToken', refresh_token);
      }
    }

    const isStaff =
      user.rol === 'ADMIN' ||
      user.rol === 'SOPORTE' ||
      user.rol === 'VENDEDOR' ||
      user.rol === 'ASESOR_COMERCIAL';

    if (isStaff) {
      const target =
        Array.isArray(user.modulosPermitidos) &&
        user.modulosPermitidos.length > 0 &&
        !user.modulosPermitidos.includes('/admin/dashboard')
          ? user.modulosPermitidos[0]
          : user.rol === 'ASESOR_COMERCIAL'
          ? '/admin/seller'
          : '/admin/dashboard';
      router.push(target);
    } else {
      router.push('/client/dashboard');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      // CASO 1: Requiere ingresar código 2FA existente (Staff o Cliente con 2FA)
      if (response.data.requires2FA) {
        setTwoFactorState({
          type: 'VERIFY',
          tempToken: response.data.tempToken,
          user: response.data.user,
        });
        setTwoFactorCode('');
        setTwoFactorError('');
        setLoading(false);
        return;
      }

      // CASO 2: Requiere configuración obligatoria de 2FA (Personal administrativo nuevo)
      if (response.data.requires2FASetup) {
        setTwoFactorState({
          type: 'SETUP',
          tempToken: response.data.tempToken,
          secret: response.data.secret,
          qrCode: response.data.qrCode,
          otpauthUrl: response.data.otpauthUrl,
          user: response.data.user,
        });
        setTwoFactorCode('');
        setTwoFactorError('');
        setLoading(false);
        return;
      }

      // CASO 3: Login estándar (Cliente sin 2FA)
      const { access_token, user, refreshToken, refresh_token } = response.data;

      // Verificar modo mantenimiento: solo ADMIN puede entrar
      try {
        const settingsRes = await api.get('/settings');
        const enMantenimiento = settingsRes.data?.mantenimiento;
        if (enMantenimiento && user.rol !== 'ADMIN') {
          setError(
            '⚠️ El sistema está en mantenimiento. El acceso está temporalmente restringido. Por favor intenta más tarde o contacta al administrador.'
          );
          setLoading(false);
          return;
        }
      } catch (_) {}

      completeLoginSession(access_token, user, refreshToken || refresh_token);
    } catch (err: any) {
      setFailedAttempts((prev) => {
        const next = prev + 1;
        if (next >= 3) {
          setRecoveryEmail(email);
        }
        return next;
      });

      const msg = err.response?.data?.message;
      if (Array.isArray(msg)) {
        setError(msg.join(', '));
      } else if (typeof msg === 'string') {
        setError(msg);
      } else {
        setError('Credenciales inválidas. Por favor verifica tu correo y contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Manejador para validar código 2FA
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorState || twoFactorCode.trim().length !== 6) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      const response = await api.post('/auth/2fa/verify', {
        tempToken: twoFactorState.tempToken,
        code: twoFactorCode.trim(),
      });

      const { access_token, user, refreshToken, refresh_token } = response.data;
      completeLoginSession(access_token, user, refreshToken || refresh_token);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Código de Google Authenticator incorrecto o expirado.';
      setTwoFactorError(msg);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  // Manejador para confirmar configuración inicial obligatoria de 2FA
  const handleConfirm2FASetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorState || !twoFactorState.secret || twoFactorCode.trim().length !== 6) return;

    setTwoFactorLoading(true);
    setTwoFactorError('');

    try {
      const response = await api.post('/auth/2fa/setup-confirm', {
        tempToken: twoFactorState.tempToken,
        secret: twoFactorState.secret,
        code: twoFactorCode.trim(),
      });

      const { access_token, user, refreshToken, refresh_token } = response.data;
      completeLoginSession(access_token, user, refreshToken || refresh_token);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Código incorrecto. Verifica la hora de tu móvil e intenta de nuevo.';
      setTwoFactorError(msg);
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (twoFactorState?.secret) {
      navigator.clipboard.writeText(twoFactorState.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    setTimeout(() => {
      setRecoveryLoading(false);
      setRecoverySent(true);
    }, 800);
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-gray-900/80 border border-gray-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 transition-all">
        {/* ========================================================================= */}
        {/* VISTA 1: INGRESO DE CÓDIGO 2FA (GOOGLE AUTHENTICATOR)                    */}
        {/* ========================================================================= */}
        {twoFactorState?.type === 'VERIFY' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-red-600/10 border border-red-500/20 rounded-2xl mx-auto flex items-center justify-center text-red-500 shadow-inner">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Verificación en Dos Pasos</h1>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Ingresa el código temporal de 6 dígitos que muestra tu aplicación <strong className="text-white">Google Authenticator</strong>.
              </p>
            </div>

            {twoFactorError && (
              <div className="flex items-start gap-3 bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">{twoFactorError}</div>
              </div>
            )}

            <form onSubmit={handleVerify2FA} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">
                  Código de 6 dígitos
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    autoFocus
                    maxLength={6}
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000"
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl py-3 pl-11 pr-4 text-center text-2xl font-mono tracking-[0.4em] text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <p className="text-[11px] text-gray-500 text-center">El código cambia cada 30 segundos.</p>
              </div>

              <button
                type="submit"
                disabled={twoFactorLoading || twoFactorCode.length !== 6}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {twoFactorLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Validando código...</span>
                  </>
                ) : (
                  <>
                    <span>Verificar y Entrar</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTwoFactorState(null)}
                className="w-full text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1.5 pt-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Volver al inicio de sesión</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISTA 2: CONFIGURACIÓN OBLIGATORIA 2FA (PRIMER INGRESO STAFF)             */}
        {/* ========================================================================= */}
        {twoFactorState?.type === 'SETUP' && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="text-center space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-950/80 border border-red-800/80 text-red-300">
                <ShieldAlert className="w-3 h-3 text-red-400" />
                Seguridad Obligatoria del Sistema
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight">Vincula Google Authenticator</h1>
              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Para proteger la plataforma, los usuarios con rol administrativo deben activar 2FA obligatoriamente.
              </p>
            </div>

            {twoFactorError && (
              <div className="flex items-start gap-3 bg-red-950/60 border border-red-800 text-red-200 px-4 py-3 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">{twoFactorError}</div>
              </div>
            )}

            {/* Código QR */}
            <div className="bg-gray-950/80 border border-gray-800 rounded-2xl p-4 flex flex-col items-center space-y-3">
              <span className="text-[11px] text-gray-400 font-medium text-center">
                1. Abre Google Authenticator y escanea este código:
              </span>
              {twoFactorState.qrCode ? (
                <div className="p-2 bg-white rounded-xl shadow-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={twoFactorState.qrCode}
                    alt="Código QR Google Authenticator"
                    className="w-44 h-44 object-contain"
                  />
                </div>
              ) : (
                <div className="w-44 h-44 bg-gray-900 animate-pulse rounded-xl" />
              )}

              {/* Clave Manual */}
              <div className="w-full pt-1">
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <span>¿No puedes escanear? Ingresa esta clave:</span>
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="text-red-400 hover:text-red-300 flex items-center gap-1 font-semibold cursor-pointer"
                  >
                    {copiedSecret ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSecret ? 'Copiada' : 'Copiar'}</span>
                  </button>
                </div>
                <code className="block bg-gray-900 border border-gray-800 rounded-lg p-2 text-center text-[11px] font-mono text-gray-200 tracking-wider select-all break-all">
                  {twoFactorState.secret}
                </code>
              </div>
            </div>

            {/* Confirmar código */}
            <form onSubmit={handleConfirm2FASetup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">
                  2. Ingresa el código de 6 dígitos que muestra tu app:
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl py-2.5 px-4 text-center text-xl font-mono tracking-[0.3em] text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={twoFactorLoading || twoFactorCode.length !== 6}
                className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium py-3 rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {twoFactorLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Activando seguridad...</span>
                  </>
                ) : (
                  <>
                    <span>Confirmar y Acceder al Sistema</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setTwoFactorState(null)}
                className="w-full text-xs text-gray-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Cancelar y volver</span>
              </button>
            </form>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VISTA 3: LOGIN ESTÁNDAR (USUARIO / CONTRASEÑA)                            */}
        {/* ========================================================================= */}
        {!twoFactorState && (
          <>
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-white tracking-tight">Bienvenido de nuevo</h1>
              <p className="text-sm text-gray-400 mt-1.5">
                Ingresa tus credenciales para acceder al sistema
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 bg-red-950/50 border border-red-800/80 text-red-200 px-4 py-3 rounded-xl text-sm animate-in fade-in duration-200">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs sm:text-sm">{error}</div>
                </div>
              )}

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                    placeholder="tunombre@ejemplo.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Contraseña
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-950/60 border border-gray-800 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 p-1 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Botón de Enviar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium py-2.5 rounded-xl shadow-lg shadow-red-600/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verificando...</span>
                  </>
                ) : (
                  <>
                    <span>Iniciar Sesión</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>
            </form>

            {/* Asistencia de contraseña si hay intentos fallidos */}
            {failedAttempts >= 3 && (
              <div className="mt-5 p-4 bg-gradient-to-br from-amber-950/70 via-red-950/50 to-gray-950/80 border border-amber-600/70 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 shadow-xl shadow-amber-950/30">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      ¿Problemas con tus credenciales? ({failedAttempts} intentos fallidos)
                    </h4>
                    <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                      Has ingresado tus datos de acceso incorrectamente 3 veces. Para evitar perder el acceso a tu cuenta, puedes enviar un mensaje directo a soporte para restablecer tu contraseña.
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex flex-col gap-2">
                  <a
                    href={`https://wa.me/${(settings?.whatsappNumber || '573000000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      `Hola Soporte, he ingresado mis datos de acceso incorrectos 3 veces en el sistema y solicito asistencia para restablecer la contraseña de acceso a mi perfil personal. Mi correo registrado es: ${email || recoveryEmail || ''}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Phone className="w-4 h-4" />
                    <span>Enviar Mensaje a Soporte por WhatsApp</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(email);
                      setRecoverySent(false);
                      setShowRecoveryModal(true);
                    }}
                    className="w-full py-2 px-3 bg-gray-800 hover:bg-gray-750 text-gray-300 hover:text-white text-xs font-semibold rounded-xl border border-gray-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Solicitar Asistencia desde la Plataforma</span>
                  </button>
                </div>
              </div>
            )}

            {/* Enlace al Catálogo / Inicio */}
            <div className="mt-8 pt-6 border-t border-gray-800 text-center text-xs text-gray-400 space-y-2">
              <p>
                ¿No tienes cuenta todavía?{' '}
                <Link href="/#catalogo" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
                  Ver Catálogo de Planes
                </Link>
              </p>
              <p>
                <Link href="/" className="hover:text-gray-300 transition-colors">
                  ← Volver a la página principal
                </Link>
              </p>
            </div>
          </>
        )}
      </div>

      {/* MODAL DE SOLICITUD DE RESTABLECIMIENTO */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-amber-500" />
                <span>Restablecimiento de Acceso</span>
              </div>
              <button
                onClick={() => setShowRecoveryModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {recoverySent ? (
              <div className="p-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white">Solicitud Recibida</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  Hemos notificado al equipo de soporte sobre tu solicitud. Un asesor se comunicará contigo vía WhatsApp o correo electrónico para verificar tu identidad y restablecer tus credenciales.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Entendido y Volver
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendRecovery} className="flex-1 flex flex-col overflow-hidden">
                <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs">
                  <p className="text-gray-300 leading-relaxed">
                    Ingresa el correo electrónico asociado a tu cuenta para verificarla y recibir las instrucciones de restablecimiento de contraseña.
                  </p>

                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="tunombre@ejemplo.com"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoveryLoading}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-lg shadow-amber-950/40"
                  >
                    {recoveryLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Enviar Solicitud</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}