'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import Cookies from 'js-cookie';
import TablePagination from '@/components/TablePagination';
import {
  Database,
  Search,
  Filter,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  FileText,
  Upload,
  RefreshCw,
  X,
  Pencil,
  Trash2,
  Printer,
  Download,
  Ban,
  CheckCircle,
  Layers,
  ShieldAlert,
  KeyRound,
  Building2,
  Sparkles,
  AlertTriangle,
  ArrowLeftRight,
} from 'lucide-react';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import { useDialog } from '@/components/Dialog';

export default function InventoryPage() {
  const { alert, confirm } = useDialog();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  useEffect(() => {
    const raw = Cookies.get('user') || (typeof window !== 'undefined' ? localStorage.getItem('user') : null);
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch (e) {}
    }
  }, []);

  const isAdmin = currentUser?.rol === 'ADMIN';

  // Pestañas: 'accounts' | 'root_accounts' | 'providers'
  const [activeTab, setActiveTab] = useState<'accounts' | 'root_accounts' | 'providers'>('accounts');
  const [rootAccounts, setRootAccounts] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<any | null>(null);

  // Modales Cuentas Raíz & Proveedores
  const [showAddRootModal, setShowAddRootModal] = useState(false);
  const [newRootAccount, setNewRootAccount] = useState({
    email: '',
    password: '',
    serviceId: '',
    providerId: '',
    planId: '',
    tipoVenta: 'POR_PANTALLA' as 'POR_PANTALLA' | 'COMPLETA',
    generateProfiles: true,
    fechaVencimientoRaiz: '',
    costoCompra: '',
    maxPantallas: 5,
  });

  // Modal Conversión Dinámica de Inventario (Por Pantallas <-> Cuenta Completa)
  const [convertingAccount, setConvertingAccount] = useState<any | null>(null);
  const [convertTargetType, setConvertTargetType] = useState<'POR_PANTALLA' | 'COMPLETA'>('COMPLETA');
  const [convertTargetPlanId, setConvertTargetPlanId] = useState('');

  const [showAddProviderModal, setShowAddProviderModal] = useState(false);
  const [newProvider, setNewProvider] = useState({
    name: '',
    contactPhone: '',
    contactEmail: '',
    notes: '',
  });

  const [rotatingAccount, setRotatingAccount] = useState<any | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [optimizingInventory, setOptimizingInventory] = useState(false);

  // Estados de formularios
  const [newAccount, setNewAccount] = useState({
    planId: '',
    emailCuenta: '',
    passwordCuenta: '',
    perfilAsignado: '',
    pinPerfil: '',
  });

  const [editAccountForm, setEditAccountForm] = useState({
    planId: '',
    emailCuenta: '',
    passwordCuenta: '',
    perfilAsignado: '',
    pinPerfil: '',
    estado: 'DISPONIBLE',
  });

  const [importData, setImportData] = useState({
    planId: '',
    rawText: '',
  });

  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Copiado y mostrar claves
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<{ [key: string]: boolean }>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [accRes, planRes, rootRes, provRes, srvRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/plans'),
        api.get('/accounts/root-accounts').catch(() => ({ data: [] })),
        api.get('/providers').catch(() => ({ data: [] })),
        api.get('/services').catch(() => ({ data: [] })),
      ]);
      setAccounts(accRes.data || []);
      setPlans(planRes.data || []);
      setRootAccounts(rootRes.data || []);
      setProviders(provRes.data || []);
      setServices(srvRes.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers Cuentas Raíz (Escenarios 2, 3, 5, 10, 11)
  const handleMarkRootDown = async (rootAcc: any) => {
    const ok = await confirm(
      `¿Marcar cuenta raíz ${rootAcc.email} como CAÍDA? Se congelarán los días pendientes de los clientes asociados y se activará la cascada de garantía / cola de reemplazo prioritario (Escenario 2).`,
      { type: 'danger', title: 'Marcar Cuenta Raíz Caída', confirmText: 'Sí, marcar caída' }
    );
    if (!ok) return;
    try {
      setLoading(true);
      await api.patch(`/accounts/root-accounts/${rootAcc.id}/mark-down`, { motivo: 'Fallo general / bloqueo por proveedor' });
      setSuccessMsg(`Cuenta raíz ${rootAcc.email} marcada como CAÍDA y días de clientes congelados.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al marcar cuenta caída', { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRotatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rotatingAccount || !newPasswordValue.trim()) return;
    try {
      setFormLoading(true);
      await api.patch(`/accounts/root-accounts/${rotatingAccount.id}/password`, {
        newPassword: newPasswordValue.trim(),
      });
      setSuccessMsg(`Contraseña rotada para ${rotatingAccount.email}. Notificación enviada por WhatsApp exclusivamente a clientes activos legítimos (Escenarios 3 y 5).`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setRotatingAccount(null);
      setNewPasswordValue('');
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al rotar contraseña', { type: 'error', title: 'Error' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleConfirmRotation = async (rootAcc: any) => {
    try {
      setLoading(true);
      await api.patch(`/accounts/root-accounts/${rootAcc.id}/confirm-rotation`);
      setSuccessMsg(`Rotación confirmada para ${rootAcc.email}. Los perfiles en cuarentena han sido liberados (Escenario 11).`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al confirmar rotación', { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOptimizeInventory = async () => {
    const ok = await confirm(
      '¿Ejecutar algoritmo de Bin Packing para consolidar clientes en cuentas de alta ocupación y marcar cuentas vacías como NO_RENOVAR? (Escenario 10)',
      { type: 'confirm', title: 'Optimizar Inventario (Bin Packing)', confirmText: 'Ejecutar Optimización' }
    );
    if (!ok) return;
    try {
      setOptimizingInventory(true);
      const res = await api.post('/accounts/optimize-inventory');
      setSuccessMsg(res.data?.message || 'Optimización de inventario completada exitosamente.');
      setTimeout(() => setSuccessMsg(''), 5000);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al optimizar inventario', { type: 'error', title: 'Error' });
    } finally {
      setOptimizingInventory(false);
    }
  };

  const handleCreateRootAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await api.post('/accounts/root-accounts', {
        ...newRootAccount,
        costoCompra: newRootAccount.costoCompra ? Number(newRootAccount.costoCompra) : 0,
        planId: newRootAccount.planId || undefined,
        tipoVenta: newRootAccount.tipoVenta,
        generateProfiles: newRootAccount.generateProfiles,
      });
      setShowAddRootModal(false);
      setNewRootAccount({
        email: '',
        password: '',
        serviceId: '',
        providerId: '',
        planId: '',
        tipoVenta: 'POR_PANTALLA',
        generateProfiles: true,
        fechaVencimientoRaiz: '',
        costoCompra: '',
        maxPantallas: 5,
      });
      setSuccessMsg('Cuenta Raíz agregada exitosamente y stock de ventas generado.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al crear cuenta raíz');
    } finally {
      setFormLoading(false);
    }
  };

  const handleConvertInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingAccount) return;
    if (!convertTargetPlanId) {
      await alert('Por favor selecciona el plan de catálogo destino.', { type: 'error', title: 'Plan Requerido' });
      return;
    }

    try {
      setFormLoading(true);
      const res = await api.post(`/accounts/root-accounts/${convertingAccount.id}/convert-inventory`, {
        targetType: convertTargetType,
        targetPlanId: convertTargetPlanId,
      });
      setConvertingAccount(null);
      setConvertTargetPlanId('');
      setSuccessMsg(res.data?.message || 'Modalidad de inventario convertida exitosamente.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al convertir modalidad de inventario', {
        type: 'error',
        title: 'Error de Conversión',
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Handlers Proveedores (Escenario 9)
  const handleMarkProviderDown = async (prov: any) => {
    const ok = await confirm(
      `¿Marcar al proveedor "${prov.nombre || prov.name}" como CAÍDO? Todas sus cuentas raíz asociadas se marcarán como CAÍDAS, se congelarán los días de los clientes y se creará un ticket maestro de incidencia (Escenario 9).`,
      { type: 'danger', title: 'Caída Masiva de Proveedor', confirmText: 'Confirmar Caída Masiva' }
    );
    if (!ok) return;
    try {
      setLoading(true);
      await api.post(`/providers/${prov.id}/mark-down`, { reason: 'Caída masiva reportada por el proveedor' });
      setSuccessMsg(`Proveedor ${prov.nombre || prov.name} marcado como CAÍDO. Cuentas y clientes asociados congelados.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al marcar proveedor caído', { type: 'error', title: 'Error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormLoading(true);
      await api.post('/providers', {
        nombre: newProvider.name.trim(),
        telefono: newProvider.contactPhone?.trim() || undefined,
        email: newProvider.contactEmail?.trim() || undefined,
        notas: newProvider.notes?.trim() || undefined,
      });
      setShowAddProviderModal(false);
      setNewProvider({ name: '', contactPhone: '', contactEmail: '', notes: '' });
      setSuccessMsg('Proveedor registrado exitosamente.');
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al crear proveedor');
    } finally {
      setFormLoading(false);
    }
  };

  const openEditModal = (acc: any) => {
    setEditingAccount(acc);
    setEditAccountForm({
      planId: acc.planId || '',
      emailCuenta: acc.emailCuenta || '',
      passwordCuenta: acc.passwordCuenta || '',
      perfilAsignado: acc.perfilAsignado || '',
      pinPerfil: acc.pinPerfil || '',
      estado: acc.estado || 'DISPONIBLE',
    });
    setFormError('');
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;
    setFormLoading(true);
    setFormError('');

    try {
      await api.patch(`/accounts/${editingAccount.id}`, {
        ...editAccountForm,
        perfilAsignado: editAccountForm.perfilAsignado || null,
        pinPerfil: editAccountForm.pinPerfil || null,
      });
      const accCode = `#ACC-${editingAccount.id.substring(0, 8).toUpperCase()}`;
      setEditingAccount(null);
      setSuccessMsg(`¡Cuenta ${accCode} (ID: ${editingAccount.id}) actualizada exitosamente!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al actualizar la cuenta');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!accountToDelete) return;
    setFormLoading(true);
    const deletedId = accountToDelete.id;
    const deletedCode = `#ACC-${deletedId.substring(0, 8).toUpperCase()}`;
    try {
      await api.delete(`/accounts/${accountToDelete.id}`);
      setAccountToDelete(null);
      setSuccessMsg(`¡Cuenta ${deletedCode} (ID: ${deletedId}) eliminada exitosamente!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al eliminar la cuenta', { type: 'error', title: 'Error al Eliminar' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const togglePassword = (id: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      const createdRes = await api.post('/accounts', {
        ...newAccount,
        perfilAsignado: newAccount.perfilAsignado || undefined,
        pinPerfil: newAccount.pinPerfil || undefined,
      });
      setShowAddModal(false);
      const accId = createdRes.data?.id;
      const accCode = accId ? `#ACC-${accId.substring(0, 8).toUpperCase()}` : '';
      setNewAccount({ planId: '', emailCuenta: '', passwordCuenta: '', perfilAsignado: '', pinPerfil: '' });
      setSuccessMsg(`¡Cuenta ${accCode} (ID: ${accId}) agregada exitosamente al inventario!`);
      setTimeout(() => setSuccessMsg(''), 4000);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Error al crear la cuenta');
    } finally {
      setFormLoading(false);
    }
  };

  const handleImportBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      // Parsear líneas: formato email:password:perfil:pin
      const lines = importData.rawText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const parsedAccounts = lines.map((line) => {
        const parts = line.split(':');
        return {
          email: parts[0]?.trim() || '',
          password: parts[1]?.trim() || '',
          perfil: parts[2]?.trim() || undefined,
          pin: parts[3]?.trim() || undefined,
        };
      });

      if (parsedAccounts.length === 0) {
        throw new Error('No se encontraron líneas válidas para importar');
      }

      await api.post('/accounts/import', {
        planId: importData.planId,
        cuentas: parsedAccounts,
      });

      setShowImportModal(false);
      setImportData({ planId: '', rawText: '' });
      setSuccessMsg(`¡${parsedAccounts.length} cuentas importadas exitosamente!`);
      setTimeout(() => setSuccessMsg(''), 3000);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || err.message || 'Error al importar cuentas');
    } finally {
      setFormLoading(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    const cleanSearch = searchTerm.trim().toLowerCase();
    const accCode = `#ACC-${(acc.id || '').substring(0, 8).toUpperCase()}`;

    const matchesSearch =
      acc.emailCuenta?.toLowerCase().includes(cleanSearch) ||
      acc.perfilAsignado?.toLowerCase().includes(cleanSearch) ||
      acc.plan?.service?.nombre?.toLowerCase().includes(cleanSearch) ||
      acc.id?.toLowerCase().includes(cleanSearch) ||
      accCode.toLowerCase().includes(cleanSearch);

    const matchesStatus = !statusFilter || acc.estado === statusFilter;
    const matchesPlan = !planFilter || acc.planId === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  // Paginación de 10 filas por vista
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, planFilter]);

  const paginatedAccounts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredAccounts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAccounts, currentPage]);

  const handleExportCSV = () => {
    const exportColumns: ColumnDef[] = [
      { key: 'plataforma', label: 'Plataforma', format: (_, r) => r.plan?.service?.nombre || 'N/A' },
      { key: 'plan', label: 'Plan', format: (_, r) => r.plan?.nombrePlan || 'N/A' },
      { key: 'emailCuenta', label: 'Email Cuenta' },
      { key: 'passwordCuenta', label: 'Contraseña' },
      { key: 'perfilAsignado', label: 'Perfil', format: (v) => v || 'Completa' },
      { key: 'pinPerfil', label: 'PIN', format: (v) => v || 'Sin PIN' },
      { key: 'estado', label: 'Estado' },
      { key: 'createdAt', label: 'Fecha Carga', format: (v) => new Date(v).toLocaleString('es-CO') },
    ];
    exportToCSV('reporte_inventario_cuentas', exportColumns, filteredAccounts);
  };

  const handlePrintInventory = () => {
    const countsByStatus = filteredAccounts.reduce((acc: any, curr: any) => {
      acc[curr.estado] = (acc[curr.estado] || 0) + 1;
      return acc;
    }, {});

    triggerPrintReport({
      title: 'Reporte de Inventario de Cuentas y Stock',
      subtitle: `STREAMCONTROL - Filtro de estado: ${statusFilter || 'Todos'} | Total cuentas: ${filteredAccounts.length}`,
      summaryCards: [
        { label: 'Total Cuentas', value: filteredAccounts.length },
        { label: 'Disponibles', value: countsByStatus['DISPONIBLE'] || 0 },
        { label: 'Ocupadas', value: countsByStatus['OCUPADA'] || 0 },
        { label: 'Bloqueadas / Suspendidas', value: countsByStatus['BLOQUEADA'] || 0 },
        { label: 'Defectuosas', value: countsByStatus['DEFECTUOSA'] || 0 },
      ],
      columns: [
        { key: 'plataforma', label: 'Plataforma / Plan', format: (_, r) => `${r.plan?.service?.nombre || ''} - ${r.plan?.nombrePlan || ''}` },
        { key: 'emailCuenta', label: 'Email Cuenta' },
        { key: 'passwordCuenta', label: 'Contraseña' },
        { key: 'perfilPin', label: 'Perfil & PIN', format: (_, r) => `${r.perfilAsignado || 'Completa'} / PIN: ${r.pinPerfil || 'N/A'}` },
        { key: 'estado', label: 'Estado' },
      ],
      rows: filteredAccounts,
    });
  };

  const handleToggleBlockAccount = async (acc: any) => {
    const isBlocked = acc.estado === 'BLOQUEADA';
    const nextStatus = isBlocked ? 'DISPONIBLE' : 'BLOQUEADA';
    const accCode = `#ACC-${acc.id.substring(0, 8).toUpperCase()}`;
    const confirmMsg = isBlocked
      ? `¿Reactivar la cuenta ${accCode} (ID: ${acc.id}) y dejarla DISPONIBLE en inventario?`
      : `¿BLOQUEAR / SUSPENDER la cuenta ${accCode} (ID: ${acc.id}) para evitar que sea entregada o usada?`;

    const ok = await confirm(confirmMsg, {
      type: isBlocked ? 'confirm' : 'danger',
      title: isBlocked ? `Reactivar Cuenta ${accCode}` : `Bloquear Cuenta ${accCode}`,
      confirmText: isBlocked ? 'Sí, reactivar' : 'Sí, bloquear',
    });
    if (!ok) return;

    try {
      await api.patch(`/accounts/${acc.id}`, { estado: nextStatus });
      setAccounts((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, estado: nextStatus } : a))
      );
      setSuccessMsg(`Cuenta ${accCode} (ID: ${acc.id}) ${isBlocked ? 'reactivada' : 'bloqueada'} exitosamente`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al cambiar estado de la cuenta', { type: 'error', title: 'Error de Estado' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-red-500" />
            <span>Inventario de Cuentas</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gestión de stock, credenciales por perfil y carga masiva FIFO
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintInventory}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Imprimir</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white rounded-xl shadow-md shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exportar CSV</span>
          </button>

          {isAdmin ? (
            <>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-gray-400" />
                <span>Importar</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-red-600 hover:bg-red-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-red-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Cuenta</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/40 border border-blue-800/50 text-blue-300 rounded-xl text-xs font-semibold">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>Modo Consulta de Stock</span>
            </div>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl text-xs font-medium animate-in fade-in">
          {successMsg}
        </div>
      )}

      {/* Selector de Pestañas */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'accounts'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Perfiles de Entrega ({accounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('root_accounts')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'root_accounts'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
              : 'bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Cuentas Raíz ({rootAccounts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('providers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'providers'
              ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20'
              : 'bg-gray-900/60 text-gray-400 hover:text-white border border-gray-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Proveedores ({providers.length})</span>
        </button>
      </div>

      {/* PESTAÑA 1: PERFILES DE ENTREGA */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          {/* Filtros y Buscador */}
          <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 backdrop-blur-md flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Buscar por correo o servicio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-950/80 border border-gray-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Filtro por estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-950/80 border border-gray-800 text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">Todos los Estados</option>
            <option value="DISPONIBLE">Disponibles</option>
            <option value="OCUPADA">Ocupadas</option>
            <option value="DEFECTUOSA">Defectuosas</option>
            <option value="VENCIDA">Vencidas</option>
            <option value="BLOQUEADA">Bloqueadas / Suspendidas</option>
          </select>

          {/* Filtro por plan */}
          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="bg-gray-950/80 border border-gray-800 text-xs text-gray-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value="">Todos los Planes</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.service?.nombre} - {p.nombrePlan}
              </option>
            ))}
          </select>

          <button
            onClick={fetchData}
            data-tooltip="Recargar"
            className="p-2 text-gray-400 hover:text-white bg-gray-950/80 border border-gray-800 rounded-xl transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabla de Cuentas */}
      <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Plataforma / Plan</th>
                <th className="px-5 py-3.5">Credenciales</th>
                <th className="px-5 py-3.5">Perfil & PIN</th>
                <th className="px-5 py-3.5">Estado</th>
                <th className="px-5 py-3.5 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-850/60">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-500">
                    No se encontraron cuentas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                paginatedAccounts.map((acc) => {
                  const isRevealed = revealedPasswords[acc.id];
                  const statusColors: any = {
                    DISPONIBLE: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50',
                    OCUPADA: 'bg-blue-950/60 text-blue-400 border-blue-800/50',
                    DEFECTUOSA: 'bg-red-950/60 text-red-400 border-red-800/50',
                    VENCIDA: 'bg-amber-950/60 text-amber-400 border-amber-800/50',
                    BLOQUEADA: 'bg-rose-950/80 text-rose-400 border-rose-800/80',
                  };

                  return (
                    <tr key={acc.id} className="hover:bg-gray-850/40 transition-colors">
                      {/* Plataforma */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          {acc.plan?.service?.logoUrl ? (
                            <img
                              src={acc.plan.service.logoUrl}
                              alt=""
                              className="w-7 h-7 object-contain rounded shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded bg-gray-800 flex items-center justify-center font-bold text-gray-400 shrink-0">
                              {acc.plan?.service?.nombre?.substring(0, 2) || 'ST'}
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-white">{acc.plan?.service?.nombre}</p>
                            <p className="text-[11px] text-gray-400">{acc.plan?.nombrePlan}</p>
                          </div>
                        </div>
                      </td>

                      {/* Credenciales */}
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {/* Código Único de la Cuenta */}
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60 font-mono text-[10px] font-bold">
                              #ACC-{acc.id.substring(0, 8).toUpperCase()}
                            </span>
                            <button
                              onClick={() => handleCopy(`#ACC-${acc.id.substring(0, 8).toUpperCase()}`, `${acc.id}-code`)}
                              className="text-gray-500 hover:text-white p-0.5"
                              data-tooltip="Copiar código de cuenta"
                            >
                              {copiedId === `${acc.id}-code` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-mono text-gray-200">{acc.emailCuenta}</span>
                            <button
                              onClick={() => handleCopy(acc.emailCuenta, `${acc.id}-email`)}
                              className="text-gray-500 hover:text-gray-300"
                              data-tooltip="Copiar correo"
                            >
                              {copiedId === `${acc.id}-email` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <span className="font-mono text-[11px]">
                              {isRevealed ? acc.passwordCuenta : '••••••••••••'}
                            </span>
                            <button
                              onClick={() => togglePassword(acc.id)}
                              className="text-gray-500 hover:text-gray-300"
                            >
                              {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleCopy(acc.passwordCuenta, `${acc.id}-pass`)}
                              className="text-gray-500 hover:text-gray-300"
                              data-tooltip="Copiar contraseña"
                            >
                              {copiedId === `${acc.id}-pass` ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Perfil & PIN */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5">
                          <p className="text-gray-200">{acc.perfilAsignado || 'Cuenta Completa'}</p>
                          {acc.pinPerfil ? (
                            <span className="inline-block font-mono text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded">
                              PIN: {acc.pinPerfil}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-500">Sin PIN</span>
                          )}
                        </div>
                      </td>

                      {/* Estado */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${
                            statusColors[acc.estado] || 'bg-gray-800 text-gray-300'
                          }`}
                        >
                          {acc.estado}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <>
                              <button
                                onClick={() => handleToggleBlockAccount(acc)}
                                title={acc.estado === 'BLOQUEADA' ? 'Reactivar cuenta' : 'Bloquear / Suspender cuenta'}
                                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                  acc.estado === 'BLOQUEADA'
                                    ? 'border-emerald-800 text-emerald-400 hover:bg-emerald-950/40'
                                    : 'border-gray-800 text-gray-400 hover:text-rose-400 hover:bg-rose-950/30'
                                }`}
                              >
                                {acc.estado === 'BLOQUEADA' ? (
                                  <CheckCircle className="w-3.5 h-3.5" />
                                ) : (
                                  <Ban className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => openEditModal(acc)}
                                data-tooltip="Editar cuenta"
                                className="p-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 text-blue-400 hover:text-blue-300 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setAccountToDelete(acc)}
                                data-tooltip="Eliminar cuenta"
                                className="p-1.5 rounded-lg border border-gray-800 hover:bg-red-950/40 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() =>
                              handleCopy(
                                `Servicio: ${acc.plan?.service?.nombre}\nCorreo: ${acc.emailCuenta}\nClave: ${acc.passwordCuenta}\nPerfil: ${acc.perfilAsignado || 'Principal'}\nPIN: ${acc.pinPerfil || 'N/A'}`,
                                acc.id
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg border border-gray-800 hover:bg-gray-800 text-gray-300 transition-colors inline-flex items-center gap-1 text-[11px] cursor-pointer"
                          >
                            {copiedId === acc.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copiar</span>
                              </>
                            )}
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
          currentPage={currentPage}
          totalItems={filteredAccounts.length}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
      </div>
      )}

      {/* PESTAÑA 2: CUENTAS RAÍZ (MASTER ACCOUNTS) */}
      {activeTab === 'root_accounts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 backdrop-blur-md">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Gestión de Cuentas Maestras (Cuentas Raíz)</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Cuentas contratadas a proveedores que alimentan perfiles individuales (Escenarios 2, 3, 5, 10, 11).
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleOptimizeInventory}
                disabled={optimizingInventory}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-950/60 border border-indigo-700 hover:bg-indigo-900/60 text-indigo-200 text-xs font-semibold rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3.5 h-3.5 text-indigo-400 ${optimizingInventory ? 'animate-spin' : ''}`} />
                <span>{optimizingInventory ? 'Optimizando...' : 'Optimizar (Bin Packing)'}</span>
              </button>
              {isAdmin && (
                <button
                  onClick={() => setShowAddRootModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Cuenta Raíz</span>
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Correo Maestro</th>
                    <th className="py-3 px-4">Servicio</th>
                    <th className="py-3 px-4">Proveedor</th>
                    <th className="py-3 px-4 text-center">Perfiles Activos / Max</th>
                    <th className="py-3 px-4">Vencimiento Raíz</th>
                    <th className="py-3 px-4 text-center">Estado</th>
                    <th className="py-3 px-4 text-center">Seguridad</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {rootAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-500">
                        No hay cuentas raíz registradas aún.
                      </td>
                    </tr>
                  ) : (
                    rootAccounts.map((ra) => {
                      const activeProfiles = (ra.accounts || []).filter((a: any) => a.estado === 'OCUPADA').length;
                      return (
                        <tr key={ra.id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="py-3.5 px-4 font-mono font-medium text-white">{ra.email}</td>
                          <td className="py-3.5 px-4">{ra.service?.nombre || 'General'}</td>
                          <td className="py-3.5 px-4 font-semibold text-indigo-300">{ra.provider?.name || 'Interno / Sin Asignar'}</td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="font-bold text-white">{activeProfiles}</span> / <span className="text-gray-400">{ra.maxPantallas}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            {ra.fechaVencimientoRaiz ? new Date(ra.fechaVencimientoRaiz).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ra.status === 'ACTIVA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                              ra.status === 'CAIDA' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                              ra.status === 'NO_RENOVAR' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            }`}>
                              {ra.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {ra.requiresPasswordChange ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                                Rotación Requerida
                              </span>
                            ) : (
                              <span className="text-emerald-400 text-[11px] font-medium flex items-center justify-center gap-1">
                                <Check className="w-3.5 h-3.5" /> OK
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {ra.requiresPasswordChange && (
                                <button
                                  onClick={() => handleConfirmRotation(ra)}
                                  className="px-2.5 py-1 bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-600/40 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                                  title="Confirmar rotación realizada para liberar perfiles en cuarentena"
                                >
                                  Confirmar Rotación
                                </button>
                              )}
                              {activeProfiles === 0 && (
                                <button
                                  onClick={() => {
                                    setConvertingAccount(ra);
                                    const currentUnits = ra.accounts?.length || 0;
                                    setConvertTargetType(currentUnits > 1 ? 'COMPLETA' : 'POR_PANTALLA');
                                    setConvertTargetPlanId('');
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-emerald-300 hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="Conversión Dinámica de Inventario (Por Pantallas <-> Cuenta Completa)"
                                >
                                  <ArrowLeftRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => { setRotatingAccount(ra); setNewPasswordValue(''); }}
                                className="p-1.5 text-gray-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Rotar Contraseña y Notificar a Clientes Legítimos (Escenarios 3 y 5)"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
                              </button>
                              {ra.status !== 'CAIDA' && (
                                <button
                                  onClick={() => handleMarkRootDown(ra)}
                                  className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                  title="Marcar como Caída (Escenario 2 - Congelar clientes y cascada garantía)"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
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
          </div>
        </div>
      )}

      {/* PESTAÑA 3: PROVEEDORES */}
      {activeTab === 'providers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 backdrop-blur-md">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Directorio de Proveedores Mayoristas</span>
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Control de proveedores y gestión de caídas masivas en cascada (Escenario 9).
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => setShowAddProviderModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-amber-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Proveedor</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.length === 0 ? (
              <div className="col-span-full py-8 text-center text-gray-500 bg-gray-900/40 rounded-2xl border border-gray-800/80">
                No hay proveedores registrados aún.
              </div>
            ) : (
              providers.map((p) => (
                <div key={p.id} className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white text-sm">{p.nombre || p.name}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      (p.estado || p.status) === 'ACTIVO' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}>
                      {p.estado || p.status}
                    </span>
                  </div>

                  <div className="text-xs text-gray-300 space-y-1">
                    {(p.telefono || p.contactPhone) && <div><span className="text-gray-500">Tel / WA:</span> {p.telefono || p.contactPhone}</div>}
                    {(p.email || p.contactEmail) && <div><span className="text-gray-500">Email:</span> {p.email || p.contactEmail}</div>}
                    {(p.notas || p.notes) && <div className="text-[11px] text-gray-400 italic mt-1">{p.notas || p.notes}</div>}
                  </div>

                  <div className="pt-2 border-t border-gray-800/80 flex items-center justify-between text-xs">
                    <span className="text-gray-500">Cuentas vinculadas: <strong className="text-white">{p.rootAccounts?.length || p._count?.rootAccounts || 0}</strong></span>
                    {(p.estado || p.status) === 'ACTIVO' && (
                      <button
                        onClick={() => handleMarkProviderDown(p)}
                        className="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-600/40 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        <span>Caída Masiva</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* MODAL: ROTAR CONTRASEÑA RAÍZ (Escenarios 3 y 5) */}
      {rotatingAccount && (
        <div className="fixed inset-0 z-[10010] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-400" />
                <span>Rotar Contraseña de Cuenta Raíz</span>
              </h3>
              <button onClick={() => setRotatingAccount(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRotatePasswordSubmit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-indigo-200">
                Cuenta: <strong className="text-white font-mono">{rotatingAccount.email}</strong>
                <p className="text-[11px] text-gray-400 mt-1">
                  Al guardar, se actualizará la contraseña maestra y se enviará la nueva clave por WhatsApp <strong>exclusivamente</strong> a los clientes activos y legítimos asociados.
                </p>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Nueva Contraseña Maestra</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Netflix2026*Secure!"
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRotatingAccount(null)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Actualizar y Notificar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA CUENTA RAÍZ */}
      {showAddRootModal && (
        <div className="fixed inset-0 z-[10010] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <span>Registrar Nueva Cuenta Raíz</span>
              </h3>
              <button onClick={() => setShowAddRootModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRootAccount} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Correo Maestro</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@proveedor.com"
                  value={newRootAccount.email}
                  onChange={(e) => setNewRootAccount({ ...newRootAccount, email: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Contraseña Maestra</label>
                <input
                  type="text"
                  required
                  placeholder="Contraseña del correo/cuenta"
                  value={newRootAccount.password}
                  onChange={(e) => setNewRootAccount({ ...newRootAccount, password: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Servicio</label>
                  <select
                    value={newRootAccount.serviceId}
                    onChange={(e) => setNewRootAccount({ ...newRootAccount, serviceId: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Selecciona servicio</option>
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Proveedor Mayorista</label>
                  <select
                    value={newRootAccount.providerId}
                    onChange={(e) => setNewRootAccount({ ...newRootAccount, providerId: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    <option value="">Sin proveedor / Interno</option>
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre || p.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Vencimiento Raíz</label>
                  <input
                    type="date"
                    required
                    value={newRootAccount.fechaVencimientoRaiz}
                    onChange={(e) => setNewRootAccount({ ...newRootAccount, fechaVencimientoRaiz: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Pantallas Máximas</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={newRootAccount.maxPantallas}
                    onChange={(e) => setNewRootAccount({ ...newRootAccount, maxPantallas: parseInt(e.target.value) || 5 })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Costo de Compra al Proveedor ($)</label>
                <input
                  type="number"
                  step="any"
                  placeholder="Ej. 25000"
                  value={newRootAccount.costoCompra}
                  onChange={(e) => setNewRootAccount({ ...newRootAccount, costoCompra: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {/* MODALIDAD DE VENTA (HÍBRIDO: MINORISTA VS MAYORISTA) */}
              <div className="p-3 bg-gray-950/60 border border-gray-800 rounded-xl space-y-2">
                <label className="block text-gray-300 font-semibold text-xs">
                  ¿Cómo se comercializará esta cuenta?
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewRootAccount({ ...newRootAccount, tipoVenta: 'POR_PANTALLA' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      newRootAccount.tipoVenta === 'POR_PANTALLA'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-sm shadow-indigo-500/20'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Por Pantallas</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 uppercase">Minorista</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Genera {newRootAccount.maxPantallas} perfiles separados para clientes independientes.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewRootAccount({ ...newRootAccount, tipoVenta: 'COMPLETA' })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      newRootAccount.tipoVenta === 'COMPLETA'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center gap-1.5">
                      <span>Cuenta Completa</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 uppercase">Mayorista</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      1 sola unidad de venta comercial. El cliente gestiona todos los perfiles.
                    </p>
                  </button>
                </div>
              </div>

              {/* GENERACIÓN ATÓMICA DE PANTALLAS (INVENTARIO DISPONIBLE) */}
              <div className="p-3 bg-indigo-950/20 border border-indigo-800/40 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 font-bold flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRootAccount.generateProfiles}
                      onChange={(e) => setNewRootAccount({ ...newRootAccount, generateProfiles: e.target.checked })}
                      className="rounded bg-gray-900 border-gray-700 text-indigo-600 focus:ring-indigo-600"
                    />
                    <span>Generar unidades de stock automáticamente</span>
                  </label>
                  <span className="text-[10px] text-indigo-400 font-mono">
                    {newRootAccount.tipoVenta === 'COMPLETA' ? '1 cuenta completa' : `${newRootAccount.maxPantallas} perfiles`}
                  </span>
                </div>

                {newRootAccount.generateProfiles && (
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-1">
                      Asignar al Plan de Catálogo <span className="text-indigo-400">*</span>
                    </label>
                    <select
                      value={newRootAccount.planId}
                      onChange={(e) => setNewRootAccount({ ...newRootAccount, planId: e.target.value })}
                      className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-600 text-xs"
                    >
                      <option value="">Selecciona el plan para las unidades</option>
                      {plans
                        .filter((pl) => !newRootAccount.serviceId || pl.serviceId === newRootAccount.serviceId)
                        .map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.service?.nombre || 'Streaming'} - {pl.nombrePlan} ({pl.pantallasSimultaneas || 1} {pl.pantallasSimultaneas === 1 ? 'pantalla' : 'pantallas'}) - ${Number(pl.precio).toLocaleString()}
                          </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {newRootAccount.tipoVenta === 'COMPLETA'
                        ? 'Se creará 1 unidad de venta única ("Cuenta Completa") en estado DISPONIBLE vinculada a esta cuenta raíz.'
                        : `Se crearán atómicamente ${newRootAccount.maxPantallas} perfiles individuales ("Pantalla 1", "Pantalla 2"...) en estado DISPONIBLE.`}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRootModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cuenta Raíz</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONVERSIÓN DINÁMICA DE INVENTARIO (POR PANTALLAS <-> COMPLETA) */}
      {convertingAccount && (
        <div className="fixed inset-0 z-[10010] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-emerald-400" />
                <span>Conversión Dinámica de Inventario (Liquidez 100%)</span>
              </h3>
              <button
                onClick={() => setConvertingAccount(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConvertInventory} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-indigo-950/30 border border-indigo-800/40 rounded-xl space-y-1">
                <div className="text-indigo-200">
                  Cuenta Raíz: <strong className="text-white font-mono">{convertingAccount.email}</strong>
                </div>
                <div className="text-gray-400 text-[11px]">
                  Servicio: <strong className="text-gray-200">{convertingAccount.service?.nombre || 'Streaming'}</strong> | Unidades de venta actuales: <strong className="text-gray-200">{convertingAccount.accounts?.length || 0}</strong>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1.5">
                  Modalidad Objetivo de Venta
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConvertTargetType('POR_PANTALLA')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      convertTargetType === 'POR_PANTALLA'
                        ? 'bg-indigo-600/20 border-indigo-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="font-bold text-xs">A Pantallas Individuales</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Divide la cuenta en {convertingAccount.maxPantallas || 5} perfiles independientes.
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setConvertTargetType('COMPLETA')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      convertTargetType === 'COMPLETA'
                        ? 'bg-emerald-600/20 border-emerald-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="font-bold text-xs">A Cuenta Completa</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Agrupa el inventario en 1 sola unidad mayorista para un único comprador.
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">
                  Plan de Catálogo Destino <span className="text-emerald-400">*</span>
                </label>
                <select
                  required
                  value={convertTargetPlanId}
                  onChange={(e) => setConvertTargetPlanId(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-600 text-xs"
                >
                  <option value="">Selecciona el plan correspondiente en el catálogo</option>
                  {plans
                    .filter((pl) => !convertingAccount.serviceId || pl.serviceId === convertingAccount.serviceId)
                    .map((pl) => (
                      <option key={pl.id} value={pl.id}>
                        {pl.service?.nombre || 'Streaming'} - {pl.nombrePlan} ({pl.pantallasSimultaneas || 1} {pl.pantallasSimultaneas === 1 ? 'pantalla' : 'pantallas'}) - ${Number(pl.precio).toLocaleString()}
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  * Solo se permite la conversión si ninguno de los perfiles actuales tiene clientes con suscripción activa.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setConvertingAccount(null)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Ejecutar Conversión</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO PROVEEDOR (Escenario 9) */}
      {showAddProviderModal && (
        <div className="fixed inset-0 z-[10010] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-400" />
                <span>Registrar Nuevo Proveedor</span>
              </h3>
              <button onClick={() => setShowAddProviderModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProvider} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Nombre Comercial</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: StreamingGlobal S.A."
                  value={newProvider.name}
                  onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">WhatsApp / Teléfono de Contacto</label>
                <input
                  type="text"
                  placeholder="+57 300 000 0000"
                  value={newProvider.contactPhone}
                  onChange={(e) => setNewProvider({ ...newProvider, contactPhone: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="soporte@proveedor.com"
                  value={newProvider.contactEmail}
                  onChange={(e) => setNewProvider({ ...newProvider, contactEmail: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Notas / Políticas de Garantía</label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionales..."
                  value={newProvider.notes}
                  onChange={(e) => setNewProvider({ ...newProvider, notes: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-600 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProviderModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Proveedor</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR CUENTA */}
      {showAddModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white">Agregar Cuenta Individual</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Plan de Streaming</label>
                <select
                  required
                  value={newAccount.planId}
                  onChange={(e) => setNewAccount({ ...newAccount, planId: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Selecciona un plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.service?.nombre} - {p.nombrePlan} (${Number(p.precio).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Correo de la Cuenta</label>
                <input
                  type="email"
                  required
                  value={newAccount.emailCuenta}
                  onChange={(e) => setNewAccount({ ...newAccount, emailCuenta: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="ejemplo@proveedor.com"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Contraseña</label>
                <input
                  type="text"
                  required
                  value={newAccount.passwordCuenta}
                  onChange={(e) => setNewAccount({ ...newAccount, passwordCuenta: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder="Contraseña de acceso"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Perfil Asignado (opcional)</label>
                  <input
                    type="text"
                    value={newAccount.perfilAsignado}
                    onChange={(e) => setNewAccount({ ...newAccount, perfilAsignado: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                    placeholder="Ej. Perfil 2"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">PIN del Perfil (opcional)</label>
                  <input
                    type="text"
                    value={newAccount.pinPerfil}
                    onChange={(e) => setNewAccount({ ...newAccount, pinPerfil: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-600"
                    placeholder="Ej. 1234"
                  />
                </div>
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cuenta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: IMPORTACIÓN MASIVA */}
      {showImportModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white">Importación Masiva de Cuentas</h3>
              <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleImportBatch} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Plan Destino</label>
                <select
                  required
                  value={importData.planId}
                  onChange={(e) => setImportData({ ...importData, planId: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="">Selecciona el plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.service?.nombre} - {p.nombrePlan}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-gray-400 font-semibold">
                    Cuentas (Formato: correo:clave:perfil:pin)
                  </label>
                  <span className="text-[10px] text-gray-500">1 cuenta por línea</span>
                </div>
                <textarea
                  required
                  rows={7}
                  value={importData.rawText}
                  onChange={(e) => setImportData({ ...importData, rawText: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 font-mono text-[11px] text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-600"
                  placeholder={`correo1@stream.com:clave123:Perfil 1:1234\ncorreo2@stream.com:clave456:Perfil 2:5678`}
                />
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Procesar Importación</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CUENTA */}
      {editingAccount && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pencil className="w-4 h-4 text-blue-400" />
                <span>Editar Propiedades de la Cuenta</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800/60">
                  #ACC-{editingAccount.id.substring(0, 8).toUpperCase()}
                </span>
                <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
                  (ID: {editingAccount.id})
                </span>
              </h3>
              <button onClick={() => setEditingAccount(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAccount} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-3.5 flex-1 overflow-y-auto text-xs">
                {formError && (
                  <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded-xl text-xs">
                    {formError}
                  </div>
                )}
              <div>
                <label className="block text-gray-400 font-semibold mb-1">Plan de Streaming</label>
                <select
                  required
                  value={editAccountForm.planId}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, planId: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Selecciona un plan</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.service?.nombre} - {p.nombrePlan} (${Number(p.precio).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Correo de la Cuenta</label>
                <input
                  type="email"
                  required
                  value={editAccountForm.emailCuenta}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, emailCuenta: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="ejemplo@proveedor.com"
                />
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Contraseña</label>
                <input
                  type="text"
                  required
                  value={editAccountForm.passwordCuenta}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, passwordCuenta: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                  placeholder="Contraseña de acceso"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">Perfil Asignado (opcional)</label>
                  <input
                    type="text"
                    value={editAccountForm.perfilAsignado}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, perfilAsignado: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Ej. Perfil 2"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 font-semibold mb-1">PIN del Perfil (opcional)</label>
                  <input
                    type="text"
                    value={editAccountForm.pinPerfil}
                    onChange={(e) => setEditAccountForm({ ...editAccountForm, pinPerfil: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                    placeholder="Ej. 1234"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 font-semibold mb-1">Estado de la Cuenta</label>
                <select
                  value={editAccountForm.estado}
                  onChange={(e) => setEditAccountForm({ ...editAccountForm, estado: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="DISPONIBLE">DISPONIBLE (Listo para entrega automática)</option>
                  <option value="OCUPADA">OCUPADA (Entregada a cliente)</option>
                  <option value="DEFECTUOSA">DEFECTUOSA (En revisión / Caída)</option>
                  <option value="VENCIDA">VENCIDA (Suscripción expirada)</option>
                  <option value="BLOQUEADA">BLOQUEADA / SUSPENDIDA (Fuera de servicio)</option>
                </select>
              </div>

              </div>

              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingAccount(null)}
                  className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {accountToDelete && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>Confirmar Eliminación</span>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-800/60">
                  #ACC-{accountToDelete.id.substring(0, 8).toUpperCase()}
                </span>
              </h3>
              <button onClick={() => setAccountToDelete(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs text-gray-300">
                ¿Estás seguro de que deseas eliminar permanentemente la cuenta <span className="font-mono text-amber-300 font-bold">#ACC-{accountToDelete.id.substring(0, 8).toUpperCase()}</span> (ID: <span className="font-mono text-gray-400">{accountToDelete.id}</span>) — <span className="font-semibold text-white">{accountToDelete.emailCuenta}</span> ({accountToDelete.plan?.service?.nombre} - {accountToDelete.plan?.nombrePlan})? Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={formLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                {formLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Eliminar Cuenta</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
