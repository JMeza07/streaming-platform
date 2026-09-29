'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import {
  MessageSquare,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Loader2,
  Clock,
  Shield,
  Sliders,
  Check,
  LogOut,
  Phone,
  User,
  Smartphone,
} from 'lucide-react';
import { useDialog } from '@/components/Dialog';

export default function WhatsAppPage() {
  const { alert, confirm } = useDialog();
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'open' | 'disconnected'>('checking');
  const [connectionProfile, setConnectionProfile] = useState<{ name?: string; number?: string; ownerJid?: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Mensaje de prueba manual
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState('Hola, este es un mensaje de prueba de StreamControl.');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const res = await api.get('/whatsapp/config');
      setConfig(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnectionStatus = async () => {
    try {
      const res = await api.get('/whatsapp/instance/status');
      if (res.data?.state === 'open' || res.data?.connected) {
        setConnectionStatus('open');
        setConnectionProfile(res.data?.profile || null);
        setQrCode(null);
      } else {
        setConnectionStatus('disconnected');
        setConnectionProfile(null);
      }
    } catch (err) {
      setConnectionStatus('disconnected');
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchConnectionStatus();
  }, []);

  const handleToggleNotifications = async (activar: boolean) => {
    try {
      await api.post('/whatsapp/toggle-notifications', { activar });
      setConfig({ ...config, notificacionesActivas: activar });
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al cambiar estado de notificaciones', { type: 'error', title: 'Error de Configuración' });
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      await api.patch('/whatsapp/config', config);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al guardar la configuración', { type: 'error', title: 'Error al Guardar' });
    } finally {
      setSaving(false);
    }
  };

  const handleGetQr = async () => {
    try {
      setQrLoading(true);
      const res = await api.get('/whatsapp/instance/qr');
      if (res.data?.state === 'open' || res.data?.connected) {
        setConnectionStatus('open');
        setConnectionProfile(res.data?.profile || null);
        setQrCode(null);
        await alert('WhatsApp ya se encuentra conectado y activo en el sistema.', {
          type: 'success',
          title: 'Línea Conectada',
        });
        return;
      }
      setConnectionStatus('disconnected');
      setQrCode(res.data?.qrcode?.base64 || res.data?.base64 || null);
      setPairingCode(res.data?.pairingCode || null);
    } catch (err: any) {
      await alert(
        err.response?.data?.message || 'No se pudo generar el QR (Verifica si Evolution API está encendida en puerto 8080)',
        { type: 'warning', title: 'Error al Generar QR' }
      );
    } finally {
      setQrLoading(false);
    }
  };

  const handleDisconnect = async () => {
    const ok = await confirm(
      '¿Estás seguro de que deseas desconectar la línea actual de WhatsApp? Deberás escanear el código QR con otro número para volver a enviar notificaciones.',
      {
        title: 'Desconectar WhatsApp',
        confirmText: 'Sí, Desconectar',
        cancelText: 'Cancelar',
        type: 'danger',
      }
    );
    if (!ok) return;

    try {
      setLoggingOut(true);
      await api.post('/whatsapp/instance/logout');
      setConnectionStatus('disconnected');
      setConnectionProfile(null);
      setQrCode(null);
      setPairingCode(null);
      await alert('Sesión desconectada. Ahora puedes generar un nuevo código QR.', {
        type: 'info',
        title: 'Línea Desconectada',
      });
      handleGetQr();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al desconectar la línea', {
        type: 'error',
        title: 'Error de Desconexión',
      });
    } finally {
      setLoggingOut(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingTest(true);
    setTestResult(null);

    try {
      await api.post('/whatsapp/send', {
        numero: testNumber.trim(),
        mensaje: testMessage.trim(),
      });
      setTestResult('¡Mensaje enviado con éxito!');
    } catch (err: any) {
      setTestResult(`Error: ${err.response?.data?.message || err.message}`);
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-red-500" />
            <span>WhatsApp CRM & Automatizaciones</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Conexión con Evolution API, recordatorios de expiración y plantillas de entrega
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleToggleNotifications(!config?.notificacionesActivas)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              config?.notificacionesActivas
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                config?.notificacionesActivas ? 'bg-white animate-pulse' : 'bg-gray-500'
              }`}
            />
            <span>
              {config?.notificacionesActivas ? 'Notificaciones ACTIVAS' : 'Notificaciones EN PAUSA'}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda: QR & Prueba Manual */}
        <div className="space-y-6">
          {/* Conexión QR & Estado */}
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <QrCode className="w-5 h-5 text-red-500" />
                <span>Vincular WhatsApp</span>
              </h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                  connectionStatus === 'open'
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                    : 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    connectionStatus === 'open' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>{connectionStatus === 'open' ? 'EN LÍNEA' : 'DESCONECTADO'}</span>
              </span>
            </div>

            <p className="text-xs text-gray-400">
              {connectionStatus === 'open'
                ? 'Línea de WhatsApp conectada y lista para el despacho de cuentas y notificaciones.'
                : 'Escanea el código QR desde tu app de WhatsApp para conectar la línea de despacho.'}
            </p>

            <div className="flex flex-col items-center justify-center p-6 bg-gray-950/60 border border-gray-800 rounded-xl min-h-[220px]">
              {connectionStatus === 'checking' || qrLoading ? (
                <div className="flex flex-col items-center gap-2 text-gray-400 text-xs">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <span>{qrLoading ? 'Generando código QR...' : 'Comprobando estado de WhatsApp...'}</span>
                </div>
              ) : connectionStatus === 'open' ? (
                <div className="flex flex-col items-center text-center space-y-3 py-2">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-9 h-9" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Línea Conectada y Operativa</h3>
                    {connectionProfile?.number ? (
                      <p className="font-mono text-xs text-emerald-400 mt-1 font-semibold">
                        +{connectionProfile.number} {connectionProfile.name ? `(${connectionProfile.name})` : ''}
                      </p>
                    ) : (
                      <p className="text-xs text-emerald-400 mt-1 font-medium">Instancia activa y vinculada</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-gray-800/80 text-[11px] text-gray-400 space-y-0.5 text-left">
                      <p>Remitente: <span className="text-white font-medium">{config?.nombreRemitente || 'StreamControl'}</span></p>
                      <p>Oficial: <span className="text-white font-mono">{config?.numeroWhatsapp || 'No configurado'}</span></p>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2 max-w-[220px]">
                      Las órdenes pagadas y alertas de renovación se despachan automáticamente desde este número.
                    </p>
                  </div>
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrCode} alt="Código QR" className="w-48 h-48 rounded-lg bg-white p-2 shadow-lg" />
                  {pairingCode && (
                    <div className="text-center mt-2">
                      <span className="text-[11px] text-gray-400">O ingresa este código en WhatsApp:</span>
                      <div className="font-mono text-sm font-bold text-amber-400 bg-gray-900 px-3 py-1 rounded-md mt-1 border border-gray-800 tracking-wider">
                        {pairingCode}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 text-xs">
                  <QrCode className="w-12 h-12 mx-auto mb-2 text-gray-600" />
                  <span>Haz clic abajo para generar el código QR</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleGetQr}
                disabled={qrLoading}
                className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${qrLoading ? 'animate-spin' : ''}`} />
                <span>{connectionStatus === 'open' ? 'Verificar Estado' : 'Generar / Refrescar QR'}</span>
              </button>

              {connectionStatus === 'open' && (
                <button
                  onClick={handleDisconnect}
                  disabled={loggingOut}
                  className="py-2.5 px-4 bg-red-950/70 hover:bg-red-900/90 text-red-300 border border-red-800/80 text-xs font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  title="Desconectar línea actual para vincular otro número"
                >
                  <LogOut className={`w-3.5 h-3.5 ${loggingOut ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Desconectar</span>
                </button>
              )}
            </div>
          </div>

          {/* Enviar Mensaje de Prueba */}
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Prueba de Mensaje Directo</span>
            </h3>

            <form onSubmit={handleSendTestMessage} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Número Destino</label>
                <input
                  type="tel"
                  required
                  value={testNumber}
                  onChange={(e) => setTestNumber(e.target.value)}
                  placeholder="+573101234567"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Mensaje</label>
                <textarea
                  rows={2}
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-[11px] ${
                    testResult.startsWith('Error')
                      ? 'bg-red-950/50 text-red-300 border border-red-800'
                      : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {testResult}
                </div>
              )}

              <button
                type="submit"
                disabled={sendingTest}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {sendingTest && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Enviar Prueba</span>
              </button>
            </form>
          </div>
        </div>

        {/* Columna Derecha: Configuración y Plantillas */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveConfig}
            className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-red-500" />
                  <span>Configuración Horaria & Plantillas</span>
                </h2>
                <p className="text-xs text-gray-400">
                  Define las ventanas de entrega y los textos dinámicos
                </p>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-600/20 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saveSuccess ? (
                  <Check className="w-3.5 h-3.5" />
                ) : null}
                <span>{saveSuccess ? '¡Guardado!' : 'Guardar Cambios'}</span>
              </button>
            </div>

            {/* Identidad de la Línea y Número WhatsApp */}
            <div className="p-4 bg-gray-950/70 border border-gray-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-red-400">
                  <Smartphone className="w-4 h-4 text-red-400" />
                  <span>Identidad de la Línea & Número Oficial</span>
                </span>
                <span className="text-[10px] text-gray-500">
                  Visible en soporte, notificaciones y CRM
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span>Nombre del Remitente / Línea</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={config?.nombreRemitente || ''}
                    onChange={(e) => setConfig({ ...config, nombreRemitente: e.target.value })}
                    placeholder="Ej. StreamControl Soporte"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-red-600 placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Nombre comercial mostrado en plantillas y notificaciones automáticas.
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-gray-400" />
                    <span>Número Oficial de WhatsApp</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={config?.numeroWhatsapp || ''}
                    onChange={(e) => setConfig({ ...config, numeroWhatsapp: e.target.value })}
                    placeholder="Ej. +573001234567"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-red-600 placeholder:text-gray-600"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Número al que los clientes escribirán para soporte y renovaciones.
                  </p>
                </div>
              </div>

              {/* Guía interactiva para cambiar el número vinculado */}
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-lg text-[11px] text-gray-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-white">¿Cómo cambiar el número de WhatsApp vinculado?</span>
                  <p className="text-gray-400 text-[10px] leading-relaxed">
                    1. Escribe el nuevo teléfono en <strong className="text-white">Número Oficial</strong> y haz clic en <strong>Guardar Cambios</strong>.<br />
                    2. En el panel lateral izquierdo, haz clic en <strong className="text-red-300">Desconectar</strong> para cerrar la sesión actual.<br />
                    3. Pulsa <strong className="text-white">Generar / Refrescar QR</strong> y escanea el nuevo código con la aplicación de WhatsApp del nuevo número.
                  </p>
                </div>
              </div>
            </div>

            {/* Horarios */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Zona Horaria</label>
                <input
                  type="text"
                  value={config?.zonaHoraria || 'America/Bogota'}
                  onChange={(e) => setConfig({ ...config, zonaHoraria: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Hora Inicio (Envío)</label>
                <input
                  type="time"
                  value={config?.horaInicio?.substring(0, 5) || '08:00'}
                  onChange={(e) => setConfig({ ...config, horaInicio: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Hora Fin (Envío)</label>
                <input
                  type="time"
                  value={config?.horaFin?.substring(0, 5) || '21:00'}
                  onChange={(e) => setConfig({ ...config, horaFin: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                />
              </div>
            </div>

            {/* Plantillas */}
            <div className="space-y-4 text-xs pt-2">
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-gray-300 font-semibold">1. Plantilla de Entrega de Cuentas</label>
                  <span className="text-[10px] text-gray-500">{`{nombre_cliente}, {lista_cuentas}`}</span>
                </div>
                <textarea
                  rows={4}
                  value={config?.plantillaEntrega || ''}
                  onChange={(e) => setConfig({ ...config, plantillaEntrega: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 font-mono text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-gray-300 font-semibold">2. Recordatorio a 7 Días de Vencer</label>
                  <span className="text-[10px] text-gray-500">{`{servicio}, {fecha_vencimiento}`}</span>
                </div>
                <textarea
                  rows={3}
                  value={config?.plantillaRecordatorio7d || ''}
                  onChange={(e) => setConfig({ ...config, plantillaRecordatorio7d: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 font-mono text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-gray-300 font-semibold">3. Recordatorio Crítico (1 Día / Mismo Día)</label>
                  <span className="text-[10px] text-gray-500">{`{link_renovacion}`}</span>
                </div>
                <textarea
                  rows={3}
                  value={config?.plantillaRecordatorio1d || ''}
                  onChange={(e) => setConfig({ ...config, plantillaRecordatorio1d: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 font-mono text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-gray-300 font-semibold">4. Recuperación de Cliente (3 Días Post-Vencimiento)</label>
                </div>
                <textarea
                  rows={3}
                  value={config?.plantillaRecuperacion3d || ''}
                  onChange={(e) => setConfig({ ...config, plantillaRecuperacion3d: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 font-mono text-[11px] text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
