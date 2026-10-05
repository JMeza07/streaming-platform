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
  Bot,
  Cpu,
  Zap,
  Radio,
  Sparkles,
  Plus,
  Trash2,
  HelpCircle,
  Terminal,
  Play,
  ShieldAlert,
  ShieldCheck,
  Flame,
  X,
  Lock,
  ShoppingCart,
  Award,
  Edit3,
  FileText,
  BookOpen,
  Save,
  Database,
} from 'lucide-react';
import { useDialog } from '@/components/Dialog';
import { useSettings } from '@/context/SettingsContext';

interface CustomPromptItem {
  id: string;
  titulo: string;
  contenido: string;
  activo: boolean;
  categoria?: 'general' | 'ventas' | 'cuentas' | 'garantias' | 'anti_alucinacion';
}

interface FaqItem {
  id: string;
  pregunta: string;
  respuesta: string;
  activo: boolean;
}

interface ChatbotConfigState {
  activo: boolean;
  nombreBot: string;
  modoOperacion: 'hybrid' | 'menu_only' | 'ai_only';
  palabrasClaveMenu: string[];
  takeoverHumanoActivo: boolean;
  tiempoExpiracionSesionMin: number;
  moduloCatalogoActivo: boolean;
  moduloCuentasActivo: boolean;
  moduloGarantiaActivo: boolean;
  moduloRegistroActivo: boolean;
  moduloVentasActivo: boolean;
  antiBanActivo: boolean;
  delayMinMs: number;
  delayMaxMs: number;
  simularTipeo: boolean;
  maxMensajesPorMinutoPorUsuario: number;
  modoListaBlanca: boolean;
  numerosAutorizados: string[];
  numerosBloqueados: string[];
  reglaStock10Min: boolean;
  reglaPrivacidadEstricta: boolean;
  reglaRegistroPromociones: boolean;
  reglaVentasSimplificada: boolean;
  ollamaUrl: string;
  ollamaModel: string;
  temperatura: number;
  maxTokens: number;
  systemPromptPersonalizado: string;
  contextoAdicional: string;
  faqs: FaqItem[];
  promptsPersonalizados: CustomPromptItem[];
}

const defaultRecommendedPrompts: CustomPromptItem[] = [
  {
    id: 'prompt-1',
    titulo: '1. Veracidad Estricta & Cero Alucinación',
    categoria: 'anti_alucinacion',
    contenido:
      'NUNCA inventes plataformas, precios, enlaces de pago ficticios ni cuentas que no figuren explícitamente en el catálogo suministrado. Si el cliente solicita información que no posees, responde honestamente: "En este momento no tengo esa información exacta en catálogo, pero con gusto te comunico con un asesor humano para ayudarte."',
    activo: true,
  },
  {
    id: 'prompt-2',
    titulo: '2. Identificación Única por Número de WhatsApp',
    categoria: 'cuentas',
    contenido:
      'Los clientes en el sistema se identifican y consultan ÚNICAMENTE por su número telefónico de WhatsApp emisor, NUNCA por su nombre. Solo puedes consultar y revelar cuentas, contraseñas o pedidos asociados estrictamente al número de WhatsApp desde el cual te escriben. Jamás muestres datos de terceros.',
    activo: true,
  },
  {
    id: 'prompt-3',
    titulo: '3. Regla de Stock & Compromiso de 10 Minutos',
    categoria: 'ventas',
    contenido:
      'Si el cliente pregunta por un servicio o pantalla que tiene stock disponible, confirma entrega inmediata tras el pago. Si el servicio NO tiene stock inmediato o está agotado, DEBES indicar con total amabilidad y seguridad: "Actualmente no contamos con entrega inmediata para este servicio, pero no te preocupes: te la gestionamos y activamos en un plazo máximo de no más de 10 minutos garantizado tras confirmar tu compra." NUNCA digas que no vendemos una cuenta si está en el catálogo.',
    activo: true,
  },
  {
    id: 'prompt-4',
    titulo: '4. Captación y Registro de Clientes Nuevos',
    categoria: 'ventas',
    contenido:
      'Si el cliente no está registrado en el sistema, invítalo con entusiasmo a registrarse para acceder a descuentos exclusivos en renovaciones, promociones y respaldo de garantía. Para registrarlo, solicita únicamente su Nombre completo y Correo electrónico (su teléfono ya es su WhatsApp actual). Si es cliente antiguo, salúdalo por su nombre y continúa con su compra sin pedirle datos redundantes.',
    activo: true,
  },
  {
    id: 'prompt-5',
    titulo: '5. Flujo de Ventas y Medios de Pago Oficiales',
    categoria: 'ventas',
    contenido:
      'Para cobros y ventas, menciona ÚNICAMENTE los métodos oficiales: Nequi, Daviplata o Bancolombia. Indica el valor total exacto en pesos colombianos ($ COP) y solicita siempre la captura o comprobante de la transferencia para procesar la entrega. No inventes otros bancos, PayPal ni tarjetas directas.',
    activo: true,
  },
  {
    id: 'prompt-6',
    titulo: '6. Términos de Garantía y Soporte Técnico',
    categoria: 'garantias',
    contenido:
      'Todas las cuentas y pantallas cuentan con garantía total durante el periodo contratado (30 días). La única condición indispensable para mantener la garantía es que el cliente no debe modificar el correo electrónico de la cuenta ni la contraseña maestra. Para soporte o caídas, pide el correo de la cuenta y foto del error.',
    activo: true,
  },
];

const defaultChatbotConfig: ChatbotConfigState = {
  activo: true,
  nombreBot: 'StreamBot (Asistente IA)',
  modoOperacion: 'hybrid',
  palabrasClaveMenu: ['menu', 'hola', 'inicio', 'bot', 'ayuda'],
  takeoverHumanoActivo: true,
  tiempoExpiracionSesionMin: 30,
  moduloCatalogoActivo: true,
  moduloCuentasActivo: true,
  moduloGarantiaActivo: true,
  moduloRegistroActivo: true,
  moduloVentasActivo: true,
  antiBanActivo: true,
  delayMinMs: 1500,
  delayMaxMs: 3500,
  simularTipeo: true,
  maxMensajesPorMinutoPorUsuario: 8,
  modoListaBlanca: false,
  numerosAutorizados: [],
  numerosBloqueados: [],
  reglaStock10Min: true,
  reglaPrivacidadEstricta: true,
  reglaRegistroPromociones: true,
  reglaVentasSimplificada: true,
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'qwen2.5:7b',
  temperatura: 0.5,
  maxTokens: 350,
  systemPromptPersonalizado:
    'Saluda siempre con calidez y profesionalismo.\n' +
    '1. VERACIDAD TOTAL: Jamás inventes plataformas ni precios fuera del catálogo suministrado.\n' +
    '2. STOCK Y 10 MINUTOS: Si un servicio no tiene stock inmediato, indica que se lo gestionamos y activamos en un plazo máximo de no más de 10 minutos tras confirmar su pago.\n' +
    '3. CLIENTES NUEVOS: Invítalos a registrarse para obtener promociones y descuentos. Solicita únicamente nombre completo y correo electrónico.\n' +
    '4. VENTAS Y PAGOS: Menciona únicamente Nequi, Daviplata o Bancolombia, y pide captura del comprobante de transferencia.\n' +
    '5. GARANTÍA: Recuerda que todas las cuentas tienen garantía total siempre que no alteren correo ni contraseña.\n' +
    '6. Responde en máximo 2 a 3 párrafos cortos, con negritas y emojis estratégicos.',
  contextoAdicional:
    '- Pagos oficiales: Nequi, Daviplata y Bancolombia (solicitar comprobante para despacho).\n' +
    '- Horario de atención humana: 8:00 AM a 10:00 PM. El bot opera 24/7.\n' +
    '- Garantía: 100% durante el tiempo contratado. No cambiar correo ni clave maestra.\n' +
    '- Compromiso de entrega: Cuentas sin stock inmediato se activan en un máximo de 10 minutos.',
  faqs: [
    {
      id: 'faq-1',
      pregunta: '¿Cuáles son los métodos de pago aceptados?',
      respuesta: 'Aceptamos transferencias bancarias por Nequi, Daviplata y Bancolombia. Una vez realizada la transferencia, nos envías el comprobante para entrega inmediata.',
      activo: true,
    },
    {
      id: 'faq-2',
      pregunta: '¿Qué garantía tienen las cuentas?',
      respuesta: 'Todas nuestras pantallas cuentan con garantía total durante el periodo contratado, siempre y cuando no se modifiquen correos ni contraseñas.',
      activo: true,
    },
    {
      id: 'faq-3',
      pregunta: '¿Qué pasa si una cuenta no tiene entrega inmediata?',
      respuesta: 'Te la gestionamos y activamos en un plazo máximo de no más de 10 minutos tras confirmar tu pedido.',
      activo: true,
    },
    {
      id: 'faq-4',
      pregunta: '¿Puedo comprar siendo cliente nuevo?',
      respuesta: '¡Por supuesto! Te registramos en solo 30 segundos con tu nombre y correo para que aproveches descuentos especiales y garantía oficial.',
      activo: true,
    },
  ],
  promptsPersonalizados: defaultRecommendedPrompts,
};

export default function WhatsAppPage() {
  const { alert, confirm } = useDialog();
  const { systemName } = useSettings();

  // Tab actual: 'crm' | 'chatbot'
  const [activeTab, setActiveTab] = useState<'crm' | 'chatbot'>('crm');

  // Configuración WhatsApp CRM
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Conexión Evolution API
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'open' | 'disconnected'>('checking');
  const [connectionProfile, setConnectionProfile] = useState<{ name?: string; number?: string; ownerJid?: string } | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Mensaje de prueba manual CRM
  const [testNumber, setTestNumber] = useState('');
  const [testMessage, setTestMessage] = useState(`Hola, este es un mensaje de prueba de ${systemName || 'MezaStreaming'}.`);
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  // Estado del Chatbot & IA Local
  const [chatbotConfig, setChatbotConfig] = useState<ChatbotConfigState>(defaultChatbotConfig);
  const [savingBotConfig, setSavingBotConfig] = useState(false);
  const [saveBotSuccess, setSaveBotSuccess] = useState(false);
  const [chatbotStatus, setChatbotStatus] = useState<{
    available: boolean;
    model: string;
    hasModel?: boolean;
    availableModels?: string[];
    error?: string;
  } | null>(null);
  const [checkingChatbot, setCheckingChatbot] = useState(false);
  const [pullingModel, setPullingModel] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [webhookResult, setWebhookResult] = useState<string | null>(null);

  // Entradas para listas y FAQs
  const [newAuthNumber, setNewAuthNumber] = useState('');
  const [newBlockedNumber, setNewBlockedNumber] = useState('');
  const [newKeyword, setNewKeyword] = useState('');
  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');

  // Gestor de Prompts Personalizados
  const [promptModalOpen, setPromptModalOpen] = useState(false);
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptContent, setPromptContent] = useState('');
  const [promptCategory, setPromptCategory] = useState<'general' | 'ventas' | 'cuentas' | 'garantias' | 'anti_alucinacion'>('general');
  const [promptActive, setPromptActive] = useState(true);
  const [savingPromptModal, setSavingPromptModal] = useState(false);
  const [savingPromptsOnly, setSavingPromptsOnly] = useState(false);
  const [savedPromptsSuccess, setSavedPromptsSuccess] = useState(false);

  // Simulador IA
  const [simQuery, setSimQuery] = useState('Hola, ¿tienen cuenta de Netflix disponible?');
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{ reply: string; usedModel: string; latencyMs: number } | null>(null);

  // Carga inicial
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

  const fetchChatbotStatus = async () => {
    try {
      setCheckingChatbot(true);
      const res = await api.get('/whatsapp/chatbot/status');
      setChatbotStatus(res.data);
    } catch (err: any) {
      setChatbotStatus({
        available: false,
        model: chatbotConfig.ollamaModel || 'qwen2.5:7b',
        hasModel: false,
        availableModels: [],
        error: err.response?.data?.message || err.message,
      });
    } finally {
      setCheckingChatbot(false);
    }
  };

  const fetchChatbotConfig = async () => {
    try {
      const res = await api.get('/whatsapp/chatbot/config');
      if (res.data) {
        setChatbotConfig({ ...defaultChatbotConfig, ...res.data });
      }
    } catch (err) {
      console.error('Error cargando configuración del chatbot:', err);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchConnectionStatus();
    fetchChatbotStatus();
    fetchChatbotConfig();
  }, []);

  // Guardar configuración CRM
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
      const { id, updatedAt, createdAt, ...payload } = config || {};
      const res = await api.patch('/whatsapp/config', payload);
      if (res.data) {
        setConfig(res.data);
      }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      const errorMsg = Array.isArray(err.response?.data?.message)
        ? err.response?.data?.message.join(', ')
        : err.response?.data?.message || 'Error al guardar la configuración';
      await alert(errorMsg, { type: 'error', title: 'Error al Guardar' });
    } finally {
      setSaving(false);
    }
  };

  // Guardar configuración del Chatbot IA
  const handleSaveChatbotConfig = async () => {
    try {
      setSavingBotConfig(true);
      setSaveBotSuccess(false);
      const res = await api.patch('/whatsapp/chatbot/config', chatbotConfig);
      setChatbotConfig({ ...defaultChatbotConfig, ...res.data });
      setSaveBotSuccess(true);
      setTimeout(() => setSaveBotSuccess(false), 3000);
      await alert('¡Configuración, reglas anti-baneo y directrices de IA guardadas exitosamente!', {
        type: 'success',
        title: 'Chatbot IA Actualizado',
      });
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al guardar configuración del chatbot', {
        type: 'error',
        title: 'Error al Guardar',
      });
    } finally {
      setSavingBotConfig(false);
    }
  };

  // Webhook
  const handleConfigureWebhook = async () => {
    try {
      setConfiguringWebhook(true);
      setWebhookResult(null);
      const res = await api.post('/whatsapp/webhook/configure', {});
      if (res.data?.success) {
        setWebhookResult(`¡Webhook sincronizado correctamente! (${res.data.webhookUrl})`);
        await alert(
          `Webhook configurado hacia:\n${res.data.webhookUrl}\n\nEvolution API reenviará los mensajes entrantes al chatbot automáticamente.`,
          { type: 'success', title: 'Webhook Vinculado' }
        );
      } else {
        setWebhookResult(`Error: ${res.data?.error || 'No se pudo configurar'}`);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message;
      setWebhookResult(`Error: ${msg}`);
      await alert(`No se pudo sincronizar el webhook: ${msg}`, {
        type: 'error',
        title: 'Error de Webhook',
      });
    } finally {
      setConfiguringWebhook(false);
    }
  };

  // QR
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

  // Simular chat IA
  const handleRunSimulation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!simQuery.trim()) return;

    try {
      setSimulating(true);
      setSimResult(null);
      const res = await api.post('/whatsapp/chatbot/simulate', {
        mensaje: simQuery.trim(),
        config: chatbotConfig,
      });
      setSimResult(res.data);
    } catch (err: any) {
      setSimResult({
        reply: `Error: ${err.response?.data?.message || err.message}`,
        usedModel: chatbotConfig.ollamaModel,
        latencyMs: 0,
      });
    } finally {
      setSimulating(false);
    }
  };

  // Descargar modelo en Ollama local
  const handlePullModel = async (modelToPull?: string) => {
    const model = (modelToPull || chatbotConfig.ollamaModel || '').trim();
    if (!model) return;
    try {
      setPullingModel(true);
      const res = await api.post('/whatsapp/chatbot/pull-model', { model });
      await alert(res.data?.message || 'Descarga iniciada en segundo plano.', {
        type: 'info',
        title: 'Descarga en Proceso (Ollama)',
      });
      setTimeout(fetchChatbotStatus, 3000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al iniciar la descarga.', {
        type: 'error',
        title: 'Error de Descarga',
      });
    } finally {
      setPullingModel(false);
    }
  };

  // Gestión de listas
  const handleAddAuthorizedNumber = () => {
    const clean = newAuthNumber.trim();
    if (!clean) return;
    if (chatbotConfig.numerosAutorizados.includes(clean)) return;
    setChatbotConfig({
      ...chatbotConfig,
      numerosAutorizados: [...chatbotConfig.numerosAutorizados, clean],
    });
    setNewAuthNumber('');
  };

  const handleRemoveAuthorizedNumber = (num: string) => {
    setChatbotConfig({
      ...chatbotConfig,
      numerosAutorizados: chatbotConfig.numerosAutorizados.filter((n) => n !== num),
    });
  };

  const handleAddBlockedNumber = () => {
    const clean = newBlockedNumber.trim();
    if (!clean) return;
    if (chatbotConfig.numerosBloqueados.includes(clean)) return;
    setChatbotConfig({
      ...chatbotConfig,
      numerosBloqueados: [...chatbotConfig.numerosBloqueados, clean],
    });
    setNewBlockedNumber('');
  };

  const handleRemoveBlockedNumber = (num: string) => {
    setChatbotConfig({
      ...chatbotConfig,
      numerosBloqueados: chatbotConfig.numerosBloqueados.filter((n) => n !== num),
    });
  };

  const handleAddKeyword = () => {
    const clean = newKeyword.trim().toLowerCase();
    if (!clean) return;
    if (chatbotConfig.palabrasClaveMenu.includes(clean)) return;
    setChatbotConfig({
      ...chatbotConfig,
      palabrasClaveMenu: [...chatbotConfig.palabrasClaveMenu, clean],
    });
    setNewKeyword('');
  };

  const handleRemoveKeyword = (kw: string) => {
    setChatbotConfig({
      ...chatbotConfig,
      palabrasClaveMenu: chatbotConfig.palabrasClaveMenu.filter((k) => k !== kw),
    });
  };

  const handleAddFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    const newItem: FaqItem = {
      id: `faq-${Date.now()}`,
      pregunta: newFaqQ.trim(),
      respuesta: newFaqA.trim(),
      activo: true,
    };
    setChatbotConfig({
      ...chatbotConfig,
      faqs: [...chatbotConfig.faqs, newItem],
    });
    setNewFaqQ('');
    setNewFaqA('');
  };

  const handleRemoveFaq = (id: string) => {
    setChatbotConfig({
      ...chatbotConfig,
      faqs: chatbotConfig.faqs.filter((f) => f.id !== id),
    });
  };

  const handleToggleFaq = (id: string) => {
    setChatbotConfig({
      ...chatbotConfig,
      faqs: chatbotConfig.faqs.map((f) => (f.id === id ? { ...f, activo: !f.activo } : f)),
    });
  };

  // Gestión de Prompts Personalizados
  const handleOpenAddPrompt = () => {
    setEditingPromptId(null);
    setPromptTitle('');
    setPromptContent('');
    setPromptCategory('general');
    setPromptActive(true);
    setPromptModalOpen(true);
  };

  const handleOpenEditPrompt = (prompt: CustomPromptItem) => {
    setEditingPromptId(prompt.id);
    setPromptTitle(prompt.titulo);
    setPromptContent(prompt.contenido);
    setPromptCategory(prompt.categoria || 'general');
    setPromptActive(prompt.activo);
    setPromptModalOpen(true);
  };

  const persistPromptsToDatabase = async (prompts: CustomPromptItem[]) => {
    const res = await api.patch('/whatsapp/chatbot/config', { promptsPersonalizados: prompts });
    if (res.data) {
      setChatbotConfig((prev) => ({ ...defaultChatbotConfig, ...prev, ...res.data }));
    }
    return res.data;
  };

  const handleSavePromptModal = async () => {
    if (!promptTitle.trim() || !promptContent.trim()) {
      await alert('Por favor escribe un título y el contenido del prompt.', { type: 'warning', title: 'Campos Requeridos' });
      return;
    }

    const currentPrompts = chatbotConfig.promptsPersonalizados || [];

    let updated: CustomPromptItem[];
    if (editingPromptId) {
      updated = currentPrompts.map((p) =>
        p.id === editingPromptId
          ? {
              ...p,
              titulo: promptTitle.trim(),
              contenido: promptContent.trim(),
              categoria: promptCategory,
              activo: promptActive,
            }
          : p
      );
    } else {
      const newPrompt: CustomPromptItem = {
        id: `prompt-${Date.now()}`,
        titulo: promptTitle.trim(),
        contenido: promptContent.trim(),
        categoria: promptCategory,
        activo: promptActive,
      };
      updated = [...currentPrompts, newPrompt];
    }

    try {
      setSavingPromptModal(true);
      await persistPromptsToDatabase(updated);
      setPromptModalOpen(false);
      await alert('¡Prompt y directriz guardados exitosamente en la base de datos para la IA!', {
        type: 'success',
        title: 'Guardado en Base de Datos',
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Error al persistir en base de datos';
      await alert(`No se pudo guardar la regla en la base de datos: ${msg}`, {
        type: 'error',
        title: 'Error al Guardar',
      });
    } finally {
      setSavingPromptModal(false);
    }
  };

  const handleTogglePrompt = async (id: string) => {
    const updated = (chatbotConfig.promptsPersonalizados || []).map((p) =>
      p.id === id ? { ...p, activo: !p.activo } : p
    );
    setChatbotConfig((prev) => ({ ...prev, promptsPersonalizados: updated }));
    try {
      await persistPromptsToDatabase(updated);
    } catch (err) {
      console.error('Error al persistir toggle de prompt en BD:', err);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    const ok = await confirm('¿Estás seguro de que deseas eliminar este prompt de la IA?', {
      title: 'Eliminar Prompt',
      confirmText: 'Sí, Eliminar',
      type: 'danger',
    });
    if (!ok) return;

    const updated = (chatbotConfig.promptsPersonalizados || []).filter((p) => p.id !== id);
    setChatbotConfig((prev) => ({ ...prev, promptsPersonalizados: updated }));
    try {
      await persistPromptsToDatabase(updated);
      await alert('Prompt eliminado de la base de datos.', { type: 'success', title: 'Prompt Eliminado' });
    } catch (err: any) {
      await alert('Error al eliminar el prompt de la base de datos.', { type: 'error', title: 'Error' });
    }
  };

  const handleResetRecommendedPrompts = async () => {
    const ok = await confirm(
      '¿Deseas restablecer y guardar los 6 prompts recomendados del negocio (Cero Alucinación, Regla 10 min, WhatsApp unívoco, etc.)? Se reemplazarán y guardarán en la base de datos.',
      {
        title: 'Cargar Prompts Recomendados',
        confirmText: 'Sí, Cargar y Guardar',
        type: 'info',
      }
    );
    if (!ok) return;

    try {
      setSavingPromptsOnly(true);
      await persistPromptsToDatabase(defaultRecommendedPrompts);
      await alert('¡Prompts recomendados restablecidos y guardados en la base de datos!', {
        type: 'success',
        title: 'Prompts Restablecidos',
      });
    } catch (err: any) {
      await alert('Error al restablecer los prompts en la base de datos.', { type: 'error', title: 'Error' });
    } finally {
      setSavingPromptsOnly(false);
    }
  };

  const handleSavePromptsOnly = async () => {
    try {
      setSavingPromptsOnly(true);
      setSavedPromptsSuccess(false);
      await persistPromptsToDatabase(chatbotConfig.promptsPersonalizados || []);
      setSavedPromptsSuccess(true);
      setTimeout(() => setSavedPromptsSuccess(false), 3000);
      await alert('¡Todas las reglas y prompts fueron sincronizados y guardados en la base de datos!', {
        type: 'success',
        title: 'Reglas Guardadas en BD',
      });
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al guardar reglas en la base de datos', {
        type: 'error',
        title: 'Error de Guardado',
      });
    } finally {
      setSavingPromptsOnly(false);
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
            Conexión con Evolution API, recordatorios de expiración, plantillas y Chatbot IA Local
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

      {/* Pestañas Principales de Navegación */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <button
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'crm'
              ? 'bg-red-600/20 text-red-400 border border-red-500/40 shadow-lg shadow-red-600/10'
              : 'bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Línea & Notificaciones CRM</span>
        </button>

        <button
          onClick={() => setActiveTab('chatbot')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'chatbot'
              ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-600/10'
              : 'bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Bot className="w-4 h-4 text-purple-400" />
          <span>Chatbot IA Local</span>
          <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded-full border border-purple-500/30 font-bold ml-1">
            Nuevo
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA 1: LÍNEA & NOTIFICACIONES CRM */}
      {/* ========================================================================= */}
      {activeTab === 'crm' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
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
                        <p>Remitente: <span className="text-white font-medium">{config?.nombreRemitente || systemName || 'MezaStreaming'}</span></p>
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
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
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
                      placeholder={`Ej. ${systemName || 'MezaStreaming'} Soporte`}
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

                {/* Guía para cambiar el número vinculado */}
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
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: CHATBOT IA LOCAL (GESTIÓN, ANTI-BANEO, ENTRENAMIENTO & REGLAS) */}
      {/* ========================================================================= */}
      {activeTab === 'chatbot' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Barra de Control y Estado Superior */}
          <div className="bg-gradient-to-r from-purple-950/40 via-gray-900/60 to-gray-900/60 border border-purple-800/40 rounded-2xl p-5 backdrop-blur-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-600/10 shrink-0">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Gestión del Chatbot IA Local (Ollama)
                  </h2>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                      chatbotConfig.activo
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                        : 'bg-gray-800 text-gray-400 border-gray-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${chatbotConfig.activo ? 'bg-emerald-400 animate-pulse' : 'bg-gray-500'}`} />
                    <span>{chatbotConfig.activo ? 'BOT ACTIVO' : 'BOT EN PAUSA'}</span>
                  </span>

                  {chatbotStatus && (
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                        chatbotStatus.available && chatbotStatus.hasModel
                          ? 'bg-purple-950/80 text-purple-300 border-purple-800/80'
                          : chatbotStatus.available
                          ? 'bg-amber-950/80 text-amber-300 border-amber-800/80'
                          : 'bg-red-950/80 text-red-300 border-red-800/80'
                      }`}
                    >
                      <Cpu className="w-3 h-3" />
                      <span>
                        {chatbotStatus.available && chatbotStatus.hasModel
                          ? `Ollama: ${chatbotConfig.ollamaModel} Listo`
                          : chatbotStatus.available
                          ? `Ollama Activo (Falta: ${chatbotConfig.ollamaModel})`
                          : 'Ollama Offline'}
                      </span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Controla la personalidad, reglas de negocio, protección anti-baneo y entrena tu asistente virtual con Ollama.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleConfigureWebhook}
                disabled={configuringWebhook}
                className="py-2.5 px-4 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Sincronizar webhook con Evolution API"
              >
                {configuringWebhook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
                <span>Vincular Webhook</span>
              </button>

              <button
                onClick={handleSaveChatbotConfig}
                disabled={savingBotConfig}
                className="py-2.5 px-5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingBotConfig ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : saveBotSuccess ? (
                  <Check className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>{saveBotSuccess ? '¡Guardado!' : 'Guardar Configuración del Bot'}</span>
              </button>
            </div>
          </div>

          {/* Grid de Configuración del Chatbot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna Izquierda: Opciones Generales & Seguridad Anti-Baneo */}
            <div className="space-y-6">
              {/* Opciones Generales del Bot */}
              <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-purple-400" />
                    <span>Opciones del Asistente</span>
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={chatbotConfig.activo}
                      onChange={(e) => setChatbotConfig({ ...chatbotConfig, activo: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Nombre / Identidad del Bot</label>
                    <input
                      type="text"
                      value={chatbotConfig.nombreBot}
                      onChange={(e) => setChatbotConfig({ ...chatbotConfig, nombreBot: e.target.value })}
                      placeholder="Ej: StreamBot (Asistente IA)"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Modo de Operación</label>
                    <select
                      value={chatbotConfig.modoOperacion}
                      onChange={(e) => setChatbotConfig({ ...chatbotConfig, modoOperacion: e.target.value as any })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                    >
                      <option value="hybrid">Híbrido (Menú Interactivo + IA Local Ollama)</option>
                      <option value="menu_only">Solo Menú Numérico (Sin IA generativa)</option>
                      <option value="ai_only">Solo IA Conversacional Libre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Palabras Clave para Desplegar el Menú
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        placeholder="Ej: menu, hola, bot..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddKeyword();
                          }
                        }}
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {chatbotConfig.palabrasClaveMenu.map((kw) => (
                        <span
                          key={kw}
                          className="bg-purple-950/50 border border-purple-800/60 text-purple-300 text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1"
                        >
                          <span>{kw}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(kw)}
                            className="text-purple-400 hover:text-red-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Módulos Habilitados en el Menú */}
                  <div className="pt-2 border-t border-gray-800 space-y-2">
                    <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                      Módulos Habilitados para el Bot
                    </span>
                    <label className="flex items-center justify-between p-2 bg-gray-950/60 rounded-xl border border-gray-800/80 cursor-pointer">
                      <span className="text-gray-300 flex items-center gap-2">
                        <ShoppingCart className="w-3.5 h-3.5 text-red-400" />
                        <span>1. Catálogo & Stock</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.moduloCatalogoActivo}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, moduloCatalogoActivo: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-gray-950/60 rounded-xl border border-gray-800/80 cursor-pointer">
                      <span className="text-gray-300 flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-cyan-400" />
                        <span>2. Mis Cuentas Activas</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.moduloCuentasActivo}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, moduloCuentasActivo: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-gray-950/60 rounded-xl border border-gray-800/80 cursor-pointer">
                      <span className="text-gray-300 flex items-center gap-2">
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        <span>3. Garantías & Reportes</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.moduloGarantiaActivo}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, moduloGarantiaActivo: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-gray-950/60 rounded-xl border border-gray-800/80 cursor-pointer">
                      <span className="text-gray-300 flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-emerald-400" />
                        <span>5. Registro de Clientes</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.moduloRegistroActivo}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, moduloRegistroActivo: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 bg-gray-950/60 rounded-xl border border-gray-800/80 cursor-pointer">
                      <span className="text-gray-300 flex items-center gap-2">
                        <Zap className="w-3.5 h-3.5 text-purple-400" />
                        <span>Venta Directa de Cuentas</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.moduloVentasActivo}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, moduloVentasActivo: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>
                  </div>

                  <div className="pt-2 border-t border-gray-800">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <span className="text-gray-300 font-semibold block">Takeover Humano</span>
                        <span className="text-[10px] text-gray-500">Pausar bot si un asesor humano responde</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.takeoverHumanoActivo}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, takeoverHumanoActivo: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* SEGURIDAD ANTI-BANEO & CONTROL DE NÚMEROS */}
              <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span>Protección Anti-Baneo WhatsApp</span>
                  </h3>
                  <span className="text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 px-2 py-0.5 rounded-full font-bold">
                    Escudo Activo
                  </span>
                </div>

                <div className="p-3 bg-amber-950/20 border border-amber-900/40 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                  <Flame className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <p className="leading-relaxed">
                    <strong>Evita baneos de Meta:</strong> Utiliza intervalos de delay aleatorios, simulación de tipeo humano y calienta tu número con la lista blanca antes de abrirlo masivamente.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Simulación de Tipeo Humano & Delays */}
                  <div className="space-y-3">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-gray-300 font-semibold">Simular presencia &quot;Escribiendo...&quot;</span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.simularTipeo}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, simularTipeo: e.target.checked })}
                        className="rounded accent-emerald-500"
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-gray-400 text-[11px] mb-1 font-medium">Delay Mínimo (ms)</label>
                        <input
                          type="number"
                          min={500}
                          max={10000}
                          step={250}
                          value={chatbotConfig.delayMinMs}
                          onChange={(e) => setChatbotConfig({ ...chatbotConfig, delayMinMs: Number(e.target.value) })}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-white"
                        />
                        <span className="text-[10px] text-gray-500 mt-0.5 block">Ej: 1500 ms</span>
                      </div>

                      <div>
                        <label className="block text-gray-400 text-[11px] mb-1 font-medium">Delay Máximo (ms)</label>
                        <input
                          type="number"
                          min={1000}
                          max={15000}
                          step={250}
                          value={chatbotConfig.delayMaxMs}
                          onChange={(e) => setChatbotConfig({ ...chatbotConfig, delayMaxMs: Number(e.target.value) })}
                          className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-white"
                        />
                        <span className="text-[10px] text-gray-500 mt-0.5 block">Ej: 3500 ms</span>
                      </div>
                    </div>
                  </div>

                  {/* MODO LISTA BLANCA (NÚMEROS AUTORIZADOS / WARMUP) */}
                  <div className="pt-3 border-t border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-gray-300 font-semibold block flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Modo Exclusivo (Lista Blanca)</span>
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Solo responder a los números ingresados abajo
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.modoListaBlanca}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, modoListaBlanca: e.target.checked })}
                        className="rounded accent-emerald-500"
                      />
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={newAuthNumber}
                        onChange={(e) => setNewAuthNumber(e.target.value)}
                        placeholder="+573001234567"
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddAuthorizedNumber}
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Autorizar
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                      {chatbotConfig.numerosAutorizados.map((num) => (
                        <span
                          key={num}
                          className="bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono"
                        >
                          <span>{num}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAuthorizedNumber(num)}
                            className="hover:text-red-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {chatbotConfig.numerosAutorizados.length === 0 && (
                        <span className="text-[11px] text-gray-500 italic">No hay números restringidos.</span>
                      )}
                    </div>
                  </div>

                  {/* LISTA NEGRA (NÚMEROS BLOQUEADOS / SPAMMERS) */}
                  <div className="pt-3 border-t border-gray-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-300 font-semibold flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        <span>Lista Negra (Números a Ignorar)</span>
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={newBlockedNumber}
                        onChange={(e) => setNewBlockedNumber(e.target.value)}
                        placeholder="+573200000000"
                        className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-1.5 text-white text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={handleAddBlockedNumber}
                        className="px-3 py-1.5 bg-red-800 hover:bg-red-700 text-white rounded-xl text-xs font-semibold cursor-pointer"
                      >
                        Bloquear
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pt-1">
                      {chatbotConfig.numerosBloqueados.map((num) => (
                        <span
                          key={num}
                          className="bg-red-950/60 border border-red-800 text-red-300 text-[11px] px-2 py-0.5 rounded-lg flex items-center gap-1 font-mono"
                        >
                          <span>{num}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBlockedNumber(num)}
                            className="hover:text-white cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      {chatbotConfig.numerosBloqueados.length === 0 && (
                        <span className="text-[11px] text-gray-500 italic">Ningún número bloqueado.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Centro y Derecha: Reglas de Negocio, Entrenamiento & Simulador */}
            <div className="lg:col-span-2 space-y-6">
              {/* Reglas de Negocio & Parámetros LLM */}
              <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-purple-400" />
                    <span>Reglas de Negocio & Motor Ollama</span>
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchChatbotStatus}
                      disabled={checkingChatbot}
                      className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className={`w-3 h-3 ${checkingChatbot ? 'animate-spin' : ''}`} />
                      <span>{checkingChatbot ? 'Verificando...' : 'Comprobar Ollama'}</span>
                    </button>
                  </div>
                </div>

                {/* Toggles de Reglas Estrictas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl space-y-1">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-semibold text-white">Regla de Stock: 10 Minutos</span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.reglaStock10Min}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, reglaStock10Min: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400">
                      Si la cuenta no tiene stock inmediato, prometer gestión y activación en no más de 10 minutos.
                    </p>
                  </div>

                  <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl space-y-1">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-semibold text-white">Privacidad Estricta de Cuentas</span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.reglaPrivacidadEstricta}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, reglaPrivacidadEstricta: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400">
                      Solo mostrar suscripciones asociadas al número de WhatsApp del que se hace la consulta.
                    </p>
                  </div>

                  <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl space-y-1">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-semibold text-white">Invitación a Registro</span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.reglaRegistroPromociones}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, reglaRegistroPromociones: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400">
                      Invitar a clientes no registrados a registrarse para acceder a promociones y descuentos.
                    </p>
                  </div>

                  <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl space-y-1">
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="font-semibold text-white">Venta Simplificada</span>
                      <input
                        type="checkbox"
                        checked={chatbotConfig.reglaVentasSimplificada}
                        onChange={(e) => setChatbotConfig({ ...chatbotConfig, reglaVentasSimplificada: e.target.checked })}
                        className="rounded accent-purple-600"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400">
                      Cliente antiguo directo a pago; cliente nuevo pasa por registro rápido antes de la orden.
                    </p>
                  </div>
                </div>

                {/* Banner de Aviso si el modelo configurado no está descargado */}
                {chatbotStatus?.available && !chatbotStatus?.hasModel && (
                  <div className="p-3.5 bg-amber-950/40 border border-amber-800/80 rounded-xl text-xs space-y-2">
                    <div className="flex items-center gap-2 text-amber-300 font-semibold">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                      <span>El modelo &quot;{chatbotConfig.ollamaModel}&quot; aún no está descargado en tu Ollama local.</span>
                    </div>
                    <p className="text-gray-300 text-[11px] leading-relaxed">
                      El servidor de Ollama está encendido y listo en el puerto 11434, pero antes de usar este modelo debes descargarlo o seleccionar uno ya instalado.
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-800/50">
                      {chatbotStatus.availableModels && chatbotStatus.availableModels.length > 0 ? (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-gray-400 text-[10px]">Modelos ya instalados:</span>
                          {chatbotStatus.availableModels.map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setChatbotConfig({ ...chatbotConfig, ollamaModel: m })}
                              className="px-2 py-0.5 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 rounded-md text-[10px] font-mono cursor-pointer flex items-center gap-1"
                            >
                              <Check className="w-2.5 h-2.5 text-emerald-400" />
                              <span>Usar {m}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-gray-400">No hay modelos descargados actualmente.</span>
                      )}

                      <button
                        type="button"
                        onClick={() => handlePullModel(chatbotConfig.ollamaModel)}
                        disabled={pullingModel}
                        className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {pullingModel ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        <span>Descargar &quot;{chatbotConfig.ollamaModel}&quot; Ahora</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Parámetros Técnicos de Ollama */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <label className="block text-gray-400 font-semibold mb-1">URL de Ollama</label>
                    <input
                      type="text"
                      value={chatbotConfig.ollamaUrl}
                      onChange={(e) => setChatbotConfig({ ...chatbotConfig, ollamaUrl: e.target.value })}
                      placeholder="http://localhost:11434"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-gray-400 font-semibold">Modelo LLM</label>
                      <button
                        type="button"
                        onClick={() => handlePullModel(chatbotConfig.ollamaModel)}
                        disabled={pullingModel || !chatbotConfig.ollamaModel}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {pullingModel ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Play className="w-2.5 h-2.5" />}
                        <span>Descargar</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={chatbotConfig.ollamaModel}
                      onChange={(e) => setChatbotConfig({ ...chatbotConfig, ollamaModel: e.target.value })}
                      placeholder="qwen2.5:7b"
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono text-[11px]"
                    />
                    {/* Chips de modelos sugeridos */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {[
                        { name: 'qwen2.5:7b', label: '7B (Recomendado)' },
                        { name: 'qwen2.5:3b', label: '3B' },
                        { name: 'qwen2.5:0.5b', label: '0.5B (Ligero)' },
                      ].map((sug) => {
                        const isInstalled = chatbotStatus?.availableModels?.some((am) => am.includes(sug.name));
                        const isSelected = chatbotConfig.ollamaModel === sug.name;
                        return (
                          <button
                            key={sug.name}
                            type="button"
                            onClick={() => setChatbotConfig({ ...chatbotConfig, ollamaModel: sug.name })}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono cursor-pointer flex items-center gap-1 border ${
                              isSelected
                                ? 'bg-purple-600 text-white border-purple-500'
                                : isInstalled
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                : 'bg-gray-800/80 text-gray-400 border-gray-700 hover:bg-gray-700'
                            }`}
                          >
                            <span>{sug.name}</span>
                            {isInstalled && <Check className="w-2 h-2 text-emerald-400" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-gray-400 font-semibold">Temperatura: {chatbotConfig.temperatura}</label>
                      <span className="text-[10px] text-gray-500">Creatividad</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.0}
                      step={0.05}
                      value={chatbotConfig.temperatura}
                      onChange={(e) => setChatbotConfig({ ...chatbotConfig, temperatura: parseFloat(e.target.value) })}
                      className="w-full accent-purple-500 cursor-pointer mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Directrices del Sistema & Contexto de Entrenamiento */}
              <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Entrenamiento & Prompt del Sistema</span>
                  </h3>
                  <span className="text-[10px] text-gray-500">Inyectado en cada consulta de IA</span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Instrucciones Personalizadas (Personalidad, Saludo y Tono)
                    </label>
                    <textarea
                      rows={3}
                      value={chatbotConfig.systemPromptPersonalizado}
                      onChange={(e) => setChatbotConfig({ ...chatbotConfig, systemPromptPersonalizado: e.target.value })}
                      placeholder="Ej: Saluda siempre con mucha calidez. Si el cliente tiene dudas sobre cómo pagar, explícale que aceptamos Nequi y Daviplata. Sé muy educado y usa emojis modernos con moderación."
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-600 placeholder:text-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">
                      Información Adicional de la Empresa (Políticas y Notas del Negocio)
                    </label>
                    <textarea
                      rows={2}
                      value={chatbotConfig.contextoAdicional}
                      onChange={(e) => setChatbotConfig({ ...chatbotConfig, contextoAdicional: e.target.value })}
                      placeholder="Ej: El horario de atención humana es de 8:00 AM a 10:00 PM. No hacemos reembolsos en efectivo pero sí reposición inmediata en garantía."
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-600 placeholder:text-gray-600"
                    />
                  </div>

                  {/* Base de Conocimiento (FAQ) */}
                  <div className="pt-2 border-t border-gray-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 text-purple-300">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-400" />
                        <span>Preguntas Frecuentes Entrenadas (FAQ)</span>
                      </span>
                      <span className="text-[10px] text-gray-500">{chatbotConfig.faqs.length} preguntas configuradas</span>
                    </div>

                    {/* Agregar FAQ */}
                    <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-xl space-y-2">
                      <input
                        type="text"
                        value={newFaqQ}
                        onChange={(e) => setNewFaqQ(e.target.value)}
                        placeholder="Pregunta frecuente (ej: ¿Cómo actualizo el código de hogar?)"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs"
                      />
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newFaqA}
                          onChange={(e) => setNewFaqA(e.target.value)}
                          placeholder="Respuesta oficial de la IA..."
                          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddFaq}
                          className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold cursor-pointer shrink-0"
                        >
                          Agregar FAQ
                        </button>
                      </div>
                    </div>

                    {/* Lista de FAQs */}
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {chatbotConfig.faqs.map((faq) => (
                        <div
                          key={faq.id}
                          className={`p-3 rounded-xl border transition-colors ${
                            faq.activo
                              ? 'bg-gray-950/60 border-gray-800'
                              : 'bg-gray-950/30 border-gray-900 opacity-60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-semibold text-white text-xs">{faq.pregunta}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleToggleFaq(faq.id)}
                                className={`text-[10px] px-2 py-0.5 rounded font-bold cursor-pointer ${
                                  faq.activo ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-gray-800 text-gray-500'
                                }`}
                              >
                                {faq.activo ? 'Activo' : 'Pausado'}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveFaq(faq.id)}
                                className="p-1 text-gray-500 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{faq.respuesta}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* GESTOR DE PROMPTS Y REGLAS MODULARES DE LA IA */}
              <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-800 gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <span>Reglas & Prompts Personalizados de la IA</span>
                    </h3>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Directrices modulares que la IA obedece en cada conversación. Puedes agregar tus propios prompts para entrenarla al 100%.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleResetRecommendedPrompts}
                      disabled={savingPromptsOnly}
                      className="px-2.5 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer font-medium border border-gray-700 transition-colors disabled:opacity-50"
                      title="Cargar las 6 reglas estándar del negocio (10 minutos, cero alucinación, WhatsApp único)"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      <span>Cargar Recomendados</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSavePromptsOnly}
                      disabled={savingPromptsOnly}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50"
                      title="Guardar y sincronizar todas las reglas en la base de datos"
                    >
                      {savingPromptsOnly ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : savedPromptsSuccess ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Save className="w-3.5 h-3.5" />
                      )}
                      <span>{savedPromptsSuccess ? '¡Guardado en BD!' : 'Guardar Reglas en BD'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenAddPrompt}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar Nuevo Prompt</span>
                    </button>
                  </div>
                </div>

                {/* Contador de estado */}
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>
                    Total de reglas:{' '}
                    <strong className="text-white font-mono">{chatbotConfig.promptsPersonalizados?.length || 0}</strong>{' '}
                    ({chatbotConfig.promptsPersonalizados?.filter((p) => p.activo).length || 0} activas)
                  </span>
                  <span className="text-[10px] text-purple-300 font-mono">
                    Inyectadas en {chatbotConfig.ollamaModel}
                  </span>
                </div>

                {/* Lista de Prompts en Tarjetas */}
                <div className="space-y-3">
                  {chatbotConfig.promptsPersonalizados && chatbotConfig.promptsPersonalizados.length > 0 ? (
                    chatbotConfig.promptsPersonalizados.map((prompt, index) => {
                      const getCategoryBadge = (cat?: string) => {
                        switch (cat) {
                          case 'anti_alucinacion':
                            return { label: 'Anti-Alucinación', color: 'bg-red-950/60 text-red-300 border-red-800' };
                          case 'cuentas':
                            return { label: 'Cuentas & WhatsApp', color: 'bg-cyan-950/60 text-cyan-300 border-cyan-800' };
                          case 'ventas':
                            return { label: 'Ventas & Stock', color: 'bg-emerald-950/60 text-emerald-300 border-emerald-800' };
                          case 'garantias':
                            return { label: 'Garantías & Soporte', color: 'bg-amber-950/60 text-amber-300 border-amber-800' };
                          default:
                            return { label: 'General', color: 'bg-purple-950/60 text-purple-300 border-purple-800' };
                        }
                      };
                      const badge = getCategoryBadge(prompt.categoria);

                      return (
                        <div
                          key={prompt.id}
                          className={`p-4 rounded-xl border transition-all ${
                            prompt.activo
                              ? 'bg-gray-950/70 border-gray-800/90 shadow-sm'
                              : 'bg-gray-950/30 border-gray-900/60 opacity-60'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-800/60">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-md bg-purple-950 border border-purple-800 text-purple-300 text-[10px] font-mono flex items-center justify-center font-bold">
                                {index + 1}
                              </span>
                              <h4 className="text-xs font-bold text-white">{prompt.titulo}</h4>
                              <span className={`text-[9px] px-2 py-0.5 rounded-full border font-semibold ${badge.color}`}>
                                {badge.label}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              <button
                                type="button"
                                onClick={() => handleTogglePrompt(prompt.id)}
                                className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition-colors border ${
                                  prompt.activo
                                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                                    : 'bg-gray-800 text-gray-500 border-gray-700'
                                }`}
                              >
                                {prompt.activo ? 'ACTIVA' : 'PAUSADA'}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenEditPrompt(prompt)}
                                className="p-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs cursor-pointer transition-colors"
                                title="Editar prompt"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeletePrompt(prompt.id)}
                                className="p-1.5 bg-gray-800 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded-lg text-xs cursor-pointer transition-colors"
                                title="Eliminar prompt"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <p className="text-[11px] text-gray-300 mt-2.5 leading-relaxed whitespace-pre-line bg-gray-900/40 p-2.5 rounded-lg border border-gray-800/40 font-sans">
                            {prompt.contenido}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center border border-dashed border-gray-800 rounded-xl space-y-2">
                      <BookOpen className="w-8 h-8 text-gray-600 mx-auto" />
                      <p className="text-xs text-gray-400">No hay prompts personalizados configurados aún.</p>
                      <button
                        type="button"
                        onClick={handleResetRecommendedPrompts}
                        className="px-3 py-1.5 bg-purple-900/50 hover:bg-purple-800 text-purple-200 text-xs rounded-lg font-semibold cursor-pointer border border-purple-700/50"
                      >
                        Cargar Prompts Recomendados del Negocio
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* SIMULADOR / SANDBOX EN VIVO */}
              <div className="bg-gray-900/60 border border-purple-800/40 rounded-2xl p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-800">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-purple-400" />
                    <span>Simulador de Respuestas IA (Sandbox de Prueba)</span>
                  </h3>
                  <span className="text-[10px] text-purple-300 font-mono">
                    {chatbotConfig.ollamaModel}
                  </span>
                </div>

                <p className="text-xs text-gray-400">
                  Prueba en tiempo real cómo responderá el asistente virtual con las directrices, catálogo y reglas que acabas de configurar.
                </p>

                <form onSubmit={handleRunSimulation} className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={simQuery}
                      onChange={(e) => setSimQuery(e.target.value)}
                      placeholder="Escribe una pregunta como cliente..."
                      className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                    />
                    <button
                      type="submit"
                      disabled={simulating}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {simulating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                      <span>Simular</span>
                    </button>
                  </div>
                </form>

                {simResult && (
                  <div className="p-4 bg-gray-950/80 border border-purple-900/50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-gray-400 pb-2 border-b border-gray-800/80">
                      <span className="flex items-center gap-1 text-purple-300 font-semibold">
                        <Bot className="w-3.5 h-3.5" />
                        <span>Respuesta de {chatbotConfig.nombreBot}:</span>
                      </span>
                      <span className="text-[10px] font-mono text-gray-500">
                        Latencia: {simResult.latencyMs}ms | Modelo: {simResult.usedModel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 whitespace-pre-wrap leading-relaxed">
                      {simResult.reply}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL / EDITOR DE PROMPTS PERSONALIZADOS */}
      {promptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {editingPromptId ? 'Editar Prompt / Regla de la IA' : 'Agregar Nuevo Prompt a la IA'}
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    Define la directriz exacta que la IA debe obedecer sin inventar información
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPromptModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-semibold mb-1">Título de la Regla o Prompt</label>
                <input
                  type="text"
                  value={promptTitle}
                  onChange={(e) => setPromptTitle(e.target.value)}
                  placeholder="Ej: 7. Política de Cuentas Compartidas, 8. Regla de Reembolsos, etc."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-semibold mb-1">Categoría</label>
                <select
                  value={promptCategory}
                  onChange={(e) => setPromptCategory(e.target.value as any)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="general">⚙️ General / Comportamiento</option>
                  <option value="ventas">🛍️ Ventas, Precios & Stock</option>
                  <option value="cuentas">🔐 Cuentas, Privacidad & WhatsApp</option>
                  <option value="garantias">🛡️ Garantías & Soporte Técnico</option>
                  <option value="anti_alucinacion">🛡️ Anti-Alucinación & Veracidad Estricta</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-gray-300 font-semibold">Instrucción / Contenido del Prompt</label>
                  <span className="text-[10px] text-gray-500 font-mono">{promptContent.length} caracteres</span>
                </div>
                <textarea
                  rows={6}
                  value={promptContent}
                  onChange={(e) => setPromptContent(e.target.value)}
                  placeholder="Escribe la instrucción detallada. Ejemplo: Si el cliente pregunta por métodos de pago, menciona únicamente Nequi, Daviplata o Bancolombia y solicita el comprobante..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-white text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-purple-600 placeholder:text-gray-600 font-sans"
                />
              </div>

              <label className="flex items-center gap-2 p-2.5 bg-gray-950/60 rounded-xl border border-gray-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={promptActive}
                  onChange={(e) => setPromptActive(e.target.checked)}
                  className="rounded accent-purple-600"
                />
                <span className="text-gray-300 text-xs font-medium">Activar esta regla de inmediato en la IA</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-800">
              <button
                type="button"
                onClick={() => setPromptModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSavePromptModal}
                disabled={savingPromptModal}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-purple-600/20 disabled:opacity-50"
              >
                {savingPromptModal ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Guardando en BD...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Guardar Prompt en BD</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
