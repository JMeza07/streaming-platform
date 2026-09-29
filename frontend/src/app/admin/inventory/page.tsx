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

  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<any | null>(null);

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
      const [accRes, planRes] = await Promise.all([
        api.get('/accounts'),
        api.get('/plans'),
      ]);
      setAccounts(accRes.data);
      setPlans(planRes.data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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
      setEditingAccount(null);
      setSuccessMsg('¡Cuenta actualizada exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
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
    try {
      await api.delete(`/accounts/${accountToDelete.id}`);
      setAccountToDelete(null);
      setSuccessMsg('¡Cuenta eliminada exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
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
      await api.post('/accounts', {
        ...newAccount,
        perfilAsignado: newAccount.perfilAsignado || undefined,
        pinPerfil: newAccount.pinPerfil || undefined,
      });
      setShowAddModal(false);
      setNewAccount({ planId: '', emailCuenta: '', passwordCuenta: '', perfilAsignado: '', pinPerfil: '' });
      setSuccessMsg('¡Cuenta agregada exitosamente!');
      setTimeout(() => setSuccessMsg(''), 3000);
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
    const confirmMsg = isBlocked
      ? '¿Reactivar esta cuenta y dejarla DISPONIBLE en inventario?'
      : '¿BLOQUEAR / SUSPENDER esta cuenta para evitar que sea entregada o usada?';

    const ok = await confirm(confirmMsg, {
      type: isBlocked ? 'confirm' : 'danger',
      title: isBlocked ? 'Reactivar Cuenta' : 'Bloquear Cuenta',
      confirmText: isBlocked ? 'Sí, reactivar' : 'Sí, bloquear',
    });
    if (!ok) return;

    try {
      await api.patch(`/accounts/${acc.id}`, { estado: nextStatus });
      setAccounts((prev) =>
        prev.map((a) => (a.id === acc.id ? { ...a, estado: nextStatus } : a))
      );
      setSuccessMsg(`Cuenta ${isBlocked ? 'reactivada' : 'bloqueada'} exitosamente`);
      setTimeout(() => setSuccessMsg(''), 3000);
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
              </h3>
              <button onClick={() => setAccountToDelete(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs text-gray-300">
                ¿Estás seguro de que deseas eliminar permanentemente la cuenta de <span className="font-semibold text-white">{accountToDelete.emailCuenta}</span> ({accountToDelete.plan?.service?.nombre} - {accountToDelete.plan?.nombrePlan})? Esta acción no se puede deshacer.
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
