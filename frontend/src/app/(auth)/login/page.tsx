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
  HelpCircle,
  Phone,
  CheckCircle2,
  X,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      const { access_token, user } = response.data;

      // Verificar modo mantenimiento: solo ADMIN puede entrar
      try {
        const settingsRes = await api.get('/settings');
        const enMantenimiento = settingsRes.data?.mantenimiento;
        if (enMantenimiento && user.rol !== 'ADMIN') {
          setError('⚠️ El sistema está en mantenimiento. El acceso está temporalmente restringido. Por favor intenta más tarde o contacta al administrador.');
          setLoading(false);
          return;
        }
      } catch (_) {
        // Si no se puede verificar mantenimiento, se permite acceso
      }

      // Reiniciar intentos en caso de éxito
      setFailedAttempts(0);

      // Guardar token y perfil en cookies y localStorage
      Cookies.set('token', access_token, { expires: 7 });
      Cookies.set('user', JSON.stringify(user), { expires: 7 });
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
      }

      // Redirigir según el rol
      const isStaff = user.rol === 'ADMIN' || user.rol === 'SOPORTE' || user.rol === 'VENDEDOR' || user.rol === 'ASESOR_COMERCIAL';
      if (isStaff) {
        // Redirigir al primer módulo permitido o dashboard según configuración
        const target = Array.isArray(user.modulosPermitidos) && user.modulosPermitidos.length > 0 && !user.modulosPermitidos.includes('/admin/dashboard')
          ? user.modulosPermitidos[0]
          : (user.rol === 'ASESOR_COMERCIAL' ? '/admin/seller' : '/admin/dashboard');
        router.push(target);
      } else {
        router.push('/client/dashboard');
      }
    } catch (err: any) {
      // Incrementar contador de intentos fallidos
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

  const handleSendRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryLoading(true);
    // Simular o enviar solicitud de recuperación
    setTimeout(() => {
      setRecoveryLoading(false);
      setRecoverySent(true);
    }, 800);
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-gray-900/80 border border-gray-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 transition-all">
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

        {/* Opción de Enviar Mensaje a Soporte para Restablecer Contraseña (Visible al 3er intento fallido) */}
        {failedAttempts >= 3 && (
          <div className="mt-5 p-4 bg-gradient-to-br from-amber-950/70 via-red-950/50 to-gray-950/80 border border-amber-600/70 rounded-2xl space-y-3 animate-in fade-in slide-in-from-top-2 shadow-xl shadow-amber-950/30">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  ¿Problemas con tus credenciales? ({failedAttempts} intentos fallidos)
                </h4>
                <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                  Has ingresado tus datos de acceso incorrectamente 3 veces. Para evitar perder el acceso a tu cuenta, puedes enviar un mensaje directo a soporte para restablecer tu contraseña de acceso a tu perfil personal.
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

        {/* Link a Registro */}
        <div className="mt-6 text-center pt-4 border-t border-gray-850">
          <p className="text-xs text-gray-400">
            ¿Aún no tienes una cuenta?{' '}
            <Link href="/register" className="text-red-500 hover:text-red-400 font-semibold transition-colors">
              Crear cuenta de cliente
            </Link>
          </p>
        </div>
      </div>

      {/* MODAL: RECUPERAR MI CUENTA */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                <span>Recuperación de Cuenta</span>
              </h3>
              <button
                onClick={() => setShowRecoveryModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {recoverySent ? (
              <>
                <div className="p-6 space-y-4 flex-1 overflow-y-auto text-xs">
                  <div className="space-y-4 text-center py-6 max-w-md mx-auto">
                    <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-800/60 flex items-center justify-center mx-auto text-emerald-400">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">Instrucciones enviadas</h4>
                      <p className="text-xs text-gray-300 mt-1">
                        Hemos registrado tu solicitud para el correo <strong className="text-white">{recoveryEmail}</strong>.
                      </p>
                    </div>

                    <div className="p-4 bg-gray-950 border border-gray-800 rounded-xl text-left text-xs space-y-2.5 text-gray-300">
                      <p className="font-semibold text-white">¿Necesitas ayuda inmediata?</p>
                      <p className="text-gray-400 leading-relaxed">
                        Comunícate directamente con la línea de soporte en WhatsApp para restablecer la contraseña de acceso a tu perfil personal en minutos:
                      </p>
                      <a
                        href={`https://wa.me/${(settings?.whatsappNumber || '573000000000').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                          `Hola Soporte, he ingresado mis datos de acceso incorrectos 3 veces en el sistema y solicito asistencia para restablecer mi contraseña de acceso a mi perfil personal. Mi correo es: ${recoveryEmail}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Phone className="w-4 h-4" />
                        <span>Contactar Soporte por WhatsApp</span>
                      </a>
                    </div>
                  </div>
                </div>

                <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => setShowRecoveryModal(false)}
                    className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Entendido y Volver
                  </button>
                </div>
              </>
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