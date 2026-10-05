'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import {
  ShieldCheck,
  Shield,
  UserCheck,
  UserX,
  UserPlus,
  Users,
  Search,
  RefreshCw,
  Edit,
  Trash2,
  Copy,
  Check,
  X,
  Phone,
  Mail,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
  CheckCircle2,
  Headset,
  ShoppingBag,
  Sliders,
  KeyRound,
  ExternalLink,
  ChevronRight,
  Database,
  Tv,
  Wallet,
  LayoutDashboard,
  Contact,
  ShoppingCart,
  Film,
  MessageSquare,
  ShieldAlert,
  BarChart3,
  Truck,
  Settings,
  Bot,
} from 'lucide-react';
import TablePagination from '@/components/TablePagination';

interface SystemUser {
  id: string;
  nombre: string;
  email: string;
  phone?: string | null;
  rol: 'ADMIN' | 'VENDEDOR' | 'SOPORTE' | 'ASESOR_COMERCIAL';
  activo: boolean;
  modulosPermitidos?: string[];
  createdAt: string;
  updatedAt?: string;
  _count?: {
    ventasRealizadas: number;
  };
}

const AVAILABLE_MODULES = [
  {
    id: '/admin/dashboard',
    label: 'Dashboard General',
    categoria: 'Control & Métricas',
    description: 'Resumen ejecutivo, ventas del día, métricas clave, suscripciones activas y alertas.',
    icon: LayoutDashboard,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: '/admin/seller',
    label: 'Mi Perfil y Ganancias',
    categoria: 'Comercial',
    description: 'Billetera del vendedor, comisiones generadas, ventas asignadas y retiros de saldo.',
    icon: UserCheck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: '/admin/customers',
    label: 'Directorio de Clientes',
    categoria: 'Comercial & CRM',
    description: 'Visualización y gestión 360° de clientes, restablecimiento de contraseñas y compras.',
    icon: Contact,
    color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  },
  {
    id: '/admin/inventory',
    label: 'Inventario de Cuentas',
    categoria: 'Operaciones',
    description: 'Carga de cuentas streaming, perfiles, PINs, stock disponible y lotes de proveedores.',
    icon: Database,
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  {
    id: '/admin/suppliers',
    label: 'Proveedores & Compras',
    categoria: 'Operaciones',
    description: 'Directorio de proveedores mayoristas, compras de lotes, costos, márgenes y rentabilidad.',
    icon: Truck,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: '/admin/sales-accounts',
    label: 'Cuentas Vendidas y Suscripciones',
    categoria: 'Operaciones & Soporte',
    description: 'Monitoreo de suscripciones activas, días restantes para vencer, fechas y normas de uso.',
    icon: KeyRound,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: '/admin/orders',
    label: 'Órdenes y Ventas (POS)',
    categoria: 'Comercial',
    description: 'Venta directa en caja POS, historial de pedidos, aprobación y comprobantes de pago.',
    icon: ShoppingCart,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
  {
    id: '/admin/renewals',
    label: 'Renovaciones de Cuentas',
    categoria: 'Comercial',
    description: 'Gestión de renovaciones de clientes, verificación de comprobantes y extensión de vigencias.',
    icon: RefreshCw,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: '/admin/caja',
    label: 'Módulo de Caja y Finanzas',
    categoria: 'Finanzas',
    description: 'Arqueo de caja diaria, registro de ingresos, egresos, gastos operativos y balances.',
    icon: Wallet,
    color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
  },
  {
    id: '/admin/catalog',
    label: 'Catálogo de Streaming',
    categoria: 'Configuración',
    description: 'Configuración de plataformas, servicios, planes, precios y condiciones de garantía.',
    icon: Film,
    color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  },
  {
    id: '/admin/warranty',
    label: 'Garantías y Soporte',
    categoria: 'Soporte',
    description: 'Tickets de reporte técnico, reemplazo automático FIFO de cuentas y gestión de lotes.',
    icon: Headset,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  {
    id: '/admin/whatsapp',
    label: 'WhatsApp CRM y Mensajería',
    categoria: 'Comunicaciones',
    description: 'Conexión de instancias QR, despacho automático de credenciales y recordatorios.',
    icon: MessageSquare,
    color: 'text-green-400 bg-green-500/10 border-green-500/20',
  },
  {
    id: '/admin/affiliates',
    label: 'Afiliados y Retiros',
    categoria: 'Comercial',
    description: 'Red de vendedores y afiliados, liquidación de comisiones y aprobación de retiros.',
    icon: Users,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  {
    id: '/admin/audit',
    label: 'Auditoría y Seguridad',
    categoria: 'Seguridad',
    description: 'El testigo fiel del sistema: bitácora forense de operaciones y procedimientos.',
    icon: ShieldAlert,
    color: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
  {
    id: '/admin/users',
    label: 'Usuarios y Roles del Sistema',
    categoria: 'Administración',
    description: 'Control de operadores internos del sistema y activación o desactivación de módulos.',
    icon: ShieldCheck,
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  {
    id: '/admin/reports',
    label: 'Informes e Ingresos',
    categoria: 'Finanzas',
    description: 'Métricas financieras de ventas, rentabilidad global y reportes descargables.',
    icon: BarChart3,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: '/admin/settings',
    label: 'Configuración & Backups',
    categoria: 'Administración',
    description: 'Ajustes globales de tienda, números de soporte, pasarelas y copias de seguridad JSON.',
    icon: Settings,
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
  },
];

const DEFAULT_ROLE_MODULES: Record<string, string[]> = {
  ADMIN: AVAILABLE_MODULES.map((m) => m.id),
  VENDEDOR: AVAILABLE_MODULES.map((m) => m.id),
  SOPORTE: AVAILABLE_MODULES.map((m) => m.id),
  ASESOR_COMERCIAL: ['/admin/seller', '/admin/customers', '/admin/orders'],
};

interface RoleDefinition {
  rol: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  color: string;
  badge: string;
  permisos: string[];
}

export default function UsersAndRolesPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [rolesMatrix, setRolesMatrix] = useState<RoleDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<SystemUser | null>(null);
  const [managingModulesUser, setManagingModulesUser] = useState<SystemUser | null>(null);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState<boolean>(false);

  // Formulario Crear
  const [createForm, setCreateForm] = useState({
    nombre: '',
    email: '',
    phone: '',
    rol: 'SOPORTE' as 'ADMIN' | 'VENDEDOR' | 'SOPORTE' | 'ASESOR_COMERCIAL',
    password: '',
    activo: true,
  });
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [creating, setCreating] = useState(false);

  // Formulario Editar
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    phone: '',
    rol: 'SOPORTE' as 'ADMIN' | 'VENDEDOR' | 'SOPORTE' | 'ASESOR_COMERCIAL',
    password: '',
    activo: true,
  });
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Notificaciones y portapapeles
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Cargar usuario en sesión
  useEffect(() => {
    const userCookie = Cookies.get('user');
    if (userCookie) {
      try {
        setCurrentUser(JSON.parse(userCookie));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // Cargar lista de usuarios y roles
  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles-matrix'),
      ]);

      setUsers(usersRes.data || []);
      setRolesMatrix(rolesRes.data || []);
    } catch (err: any) {
      console.error('Error cargando usuarios y roles:', err);
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error al conectar con el servidor',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-limpiar feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // Copiar al portapapeles
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Generar contraseña aleatoria segura
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%';
    let res = '';
    for (let i = 0; i < 10; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Métricas de usuarios operativos
  const metrics = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.rol === 'ADMIN').length;
    const soporte = users.filter((u) => u.rol === 'SOPORTE').length;
    const vendedores = users.filter((u) => u.rol === 'VENDEDOR').length;
    const asesores = users.filter((u) => u.rol === 'ASESOR_COMERCIAL').length;
    const activos = users.filter((u) => u.activo).length;
    const suspendidos = users.filter((u) => !u.activo).length;

    return { total, admins, soporte, vendedores, asesores, activos, suspendidos };
  }, [users]);

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchesSearch =
        u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.phone && u.phone.includes(searchTerm));

      const matchesRole = roleFilter === 'ALL' || u.rol === roleFilter;

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVO' && u.activo) ||
        (statusFilter === 'SUSPENDIDO' && !u.activo);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  // Manejar creación
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.nombre || !createForm.email || !createForm.password) {
      setFeedback({ type: 'error', message: 'Por favor complete todos los campos obligatorios.' });
      return;
    }
    if (createForm.password.length < 6) {
      setFeedback({ type: 'error', message: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }

    setCreating(true);
    try {
      const initialModules =
        DEFAULT_ROLE_MODULES[createForm.rol] || AVAILABLE_MODULES.map((m) => m.id);
      const res = await api.post('/users', {
        ...createForm,
        modulosPermitidos: initialModules,
      });
      setFeedback({
        type: 'success',
        message: `Usuario ${res.data.nombre} (${res.data.rol}) creado exitosamente con acceso a sus módulos correspondientes.`,
      });
      setShowCreateModal(false);
      setCreateForm({
        nombre: '',
        email: '',
        phone: '',
        rol: 'SOPORTE',
        password: '',
        activo: true,
      });
      loadData(true);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error al crear el usuario en el sistema.',
      });
    } finally {
      setCreating(false);
    }
  };

  // Gestión de activación / desactivación de módulos
  const openManageModules = (user: SystemUser) => {
    setManagingModulesUser(user);
    if (Array.isArray(user.modulosPermitidos) && user.modulosPermitidos.length > 0) {
      setSelectedModules([...user.modulosPermitidos]);
    } else {
      setSelectedModules(DEFAULT_ROLE_MODULES[user.rol] || AVAILABLE_MODULES.map((m) => m.id));
    }
  };

  const toggleModuleSelection = (moduleId: string) => {
    setSelectedModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const handleSaveModules = async () => {
    if (!managingModulesUser) return;
    setSavingModules(true);
    try {
      const res = await api.patch(`/users/${managingModulesUser.id}/modules`, {
        modulosPermitidos: selectedModules,
      });

      const updatedMods = res.data?.modulosPermitidos || selectedModules;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === managingModulesUser.id
            ? { ...u, modulosPermitidos: updatedMods }
            : u
        )
      );

      // Si se actualizaron los permisos del usuario en sesión actual:
      if (currentUser?.id === managingModulesUser.id) {
        const updatedCurrent = {
          ...currentUser,
          modulosPermitidos: updatedMods,
        };
        Cookies.set('user', JSON.stringify(updatedCurrent), { expires: 7 });
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(updatedCurrent));
        }
        setCurrentUser(updatedCurrent);
      }

      // Notificar reactivamente a la barra de navegación del Layout en tiempo real:
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('system-modules-updated', {
            detail: {
              userId: managingModulesUser.id,
              modulosPermitidos: updatedMods,
            },
          })
        );
      }

      setFeedback({
        type: 'success',
        message: `Módulos actualizados exitosamente para ${managingModulesUser.nombre} (${updatedMods.length} módulos habilitados).`,
      });
      setManagingModulesUser(null);
      loadData(true);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error guardando los módulos del usuario.',
      });
    } finally {
      setSavingModules(false);
    }
  };

  // Abrir modal de edición
  const openEditModal = (user: SystemUser) => {
    setEditingUser(user);
    setEditForm({
      nombre: user.nombre,
      email: user.email,
      phone: user.phone || '',
      rol: user.rol,
      password: '',
      activo: user.activo,
    });
    setShowEditPassword(false);
  };

  // Manejar edición
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setUpdating(true);
    try {
      const payload: any = {
        nombre: editForm.nombre,
        email: editForm.email,
        phone: editForm.phone || null,
        rol: editForm.rol,
        activo: editForm.activo,
      };

      if (editForm.password && editForm.password.trim().length >= 6) {
        payload.password = editForm.password.trim();
      }

      const res = await api.patch(`/users/${editingUser.id}`, payload);
      setFeedback({
        type: 'success',
        message: `Usuario ${res.data.nombre} actualizado correctamente.`,
      });
      setEditingUser(null);
      loadData(true);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error al actualizar el usuario.',
      });
    } finally {
      setUpdating(false);
    }
  };

  // Alternar estado activo / suspendido
  const handleToggleActive = async (user: SystemUser) => {
    if (currentUser?.id === user.id) {
      setFeedback({ type: 'error', message: 'No puedes suspender tu propia cuenta activa.' });
      return;
    }

    setProcessingId(user.id);
    try {
      const res = await api.patch(`/users/${user.id}/toggle-active`);
      setFeedback({
        type: 'success',
        message: `Estado de ${res.data.nombre} cambiado a: ${res.data.activo ? 'ACTIVO' : 'SUSPENDIDO'}.`,
      });
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, activo: res.data.activo } : u)),
      );
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error al alternar estado del usuario.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Confirmar eliminación
  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    setProcessingId(deletingUser.id);
    try {
      const res = await api.delete(`/users/${deletingUser.id}`);
      setFeedback({
        type: 'success',
        message: res.data.message || 'Usuario procesado exitosamente.',
      });
      setDeletingUser(null);
      loadData(true);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Error al eliminar el usuario.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  // Función de renderizado de Badge de Rol
  const renderRoleBadge = (rol: string) => {
    switch (rol) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
            <Shield className="w-3.5 h-3.5" />
            Administrador
          </span>
        );
      case 'SOPORTE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Headset className="w-3.5 h-3.5" />
            Soporte Técnico
          </span>
        );
      case 'VENDEDOR':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShoppingBag className="w-3.5 h-3.5" />
            Asesor Ventas
          </span>
        );
      case 'ASESOR_COMERCIAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <UserCheck className="w-3.5 h-3.5" />
            Asesor Comercial
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-800 text-gray-300">
            {rol}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* CABECERA PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-red-600 to-rose-500 flex items-center justify-center shadow-lg shadow-red-600/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Usuarios y Roles del Sistema
              </h1>
              <p className="text-sm text-gray-400">
                Gestión y control de acceso del personal operativo (Administración, Soporte y Ventas)
              </p>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN SUPERIOR */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 rounded-lg text-sm transition font-medium"
            data-tooltip="Actualizar"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-red-500' : ''}`} />
            <span>Actualizar</span>
          </button>

          <button
            onClick={() => {
              setCreateForm({
                nombre: '',
                email: '',
                phone: '',
                rol: 'SOPORTE',
                password: generateRandomPassword(),
                activo: true,
              });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-sm font-semibold shadow-lg shadow-red-600/20 transition transform active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo Usuario</span>
          </button>
        </div>
      </div>

      {/* BANNER INFORMATIVO: LOS CLIENTES NO HACEN PARTE DE ESTOS ROLES */}
      <div className="bg-gradient-to-r from-blue-950/40 via-gray-900/60 to-purple-950/30 border border-blue-800/40 rounded-xl p-4 text-xs md:text-sm text-gray-300 flex items-start gap-3 shadow-md backdrop-blur-sm">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <span className="font-semibold text-blue-300 block">
            Alcance Operativo de Usuarios & Roles:
          </span>
          <p className="text-gray-300 leading-relaxed">
            Este panel gestiona estrictamente los accesos del <strong>personal interno</strong> que opera la plataforma (
            <span className="text-red-400 font-medium"> Administradores</span>,
            <span className="text-blue-400 font-medium"> Agentes de Soporte</span> y
            <span className="text-emerald-400 font-medium"> Asesores de Ventas</span>).
            <span className="block mt-1 text-gray-400">
              💡 <strong>Los Clientes finales no hacen parte de estos roles</strong> porque no tienen facultades para modificar catálogos, configuraciones, arqueos ni parámetros del sistema. Las cuentas de clientes se registran y gestionan de forma independiente a través del{' '}
              <Link href="/admin/customers" className="text-blue-400 hover:underline inline-flex items-center gap-0.5">
                Directorio de Clientes <ExternalLink className="w-3 h-3 inline" />
              </Link>{' '}
              y acceden a su propio Portal de Autoservicio.
            </span>
          </p>
        </div>
      </div>

      {/* NOTIFICACIÓN TOAST / FEEDBACK */}
      {feedback && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-3 text-sm animate-in fade-in slide-in-from-top-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-red-950/40 border-red-500/30 text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* METRIC KPI CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Total Operativo</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{metrics.total}</span>
            <span className="text-xs text-gray-500">usuarios</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{metrics.activos} activos</span>
            {metrics.suspendidos > 0 && (
              <span className="text-rose-400">({metrics.suspendidos} susp.)</span>
            )}
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Administradores</span>
            <Shield className="w-4 h-4 text-red-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-400">{metrics.admins}</span>
            <span className="text-xs text-gray-500">control total</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            Supervisores con acceso a configuración y caja
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Mesa de Soporte</span>
            <Headset className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-400">{metrics.soporte}</span>
            <span className="text-xs text-gray-500">garantías FIFO</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            Reemplazos automáticos y tickets postventa
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Vendedores POS</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-400">{metrics.vendedores}</span>
            <span className="text-xs text-gray-500">ventas y POS</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            Caja directa y despacho de órdenes
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800/80 rounded-xl p-4 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs uppercase tracking-wider font-semibold">Asesores Comerciales</span>
            <UserCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">{metrics.asesores}</span>
            <span className="text-xs text-gray-500">afiliación</span>
          </div>
          <div className="mt-2 text-[11px] text-gray-400">
            Red de enlaces y suscripciones referidas
          </div>
        </div>
      </div>

      {/* PESTAÑAS: USUARIOS VS ROLES Y MATRIZ */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'users'
              ? 'bg-gray-800 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Usuarios del Sistema ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
            activeTab === 'roles'
              ? 'bg-gray-800 text-white shadow-md'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-900/50'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Roles y Matriz de Permisos</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* VISTA 1: TABLA DE USUARIOS Y OPERACIONES CRUD */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* BARRA DE FILTROS */}
          <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl p-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, correo electrónico o teléfono..."
                className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-9 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500/50"
              />
            </div>

            {/* Filtro Rol */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Rol:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500/50"
              >
                <option value="ALL">Todos los Roles</option>
                <option value="ADMIN">Administrador</option>
                <option value="SOPORTE">Soporte Técnico</option>
                <option value="VENDEDOR">Asesor de Ventas</option>
                <option value="ASESOR_COMERCIAL">Asesor Comercial</option>
              </select>
            </div>

            {/* Filtro Estado */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Estado:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-300 focus:outline-none focus:border-red-500/50"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVO">Activos</option>
                <option value="SUSPENDIDO">Suspendidos</option>
              </select>
            </div>
          </div>

          {/* TABLA DE USUARIOS */}
          <div className="bg-gray-900/40 border border-gray-800/80 rounded-xl overflow-hidden backdrop-blur-sm">
            {loading ? (
              <div className="py-20 text-center text-gray-500 flex flex-col items-center justify-center gap-3">
                <div className="w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm">Cargando usuarios del sistema...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-gray-500 flex flex-col items-center justify-center gap-2">
                <Users className="w-12 h-12 text-gray-600 mb-1" />
                <p className="text-base font-semibold text-gray-400">No se encontraron usuarios</p>
                <p className="text-xs text-gray-500 max-w-sm">
                  {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                    ? 'No hay registros que coincidan con los filtros seleccionados.'
                    : 'Aún no hay usuarios operativos creados en el sistema.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wider bg-gray-950/60">
                      <th className="py-3 px-4">Operador / Usuario</th>
                      <th className="py-3 px-4">Contacto</th>
                      <th className="py-3 px-4">Rol del Sistema</th>
                      <th className="py-3 px-4">Módulos Permitidos</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Fecha Alta</th>
                      <th className="py-3 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-sm">
                    {paginatedUsers.map((user) => {
                      const isSelf = currentUser?.id === user.id;
                      const isBot = user.email.includes('bot@') || user.nombre.toLowerCase().includes('bot');
                      const initials = user.nombre
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase();

                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-gray-850/40 transition group"
                        >
                          {/* Operador */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-white shadow-inner ${
                                  isBot
                                    ? 'bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-purple-500/20'
                                    : user.rol === 'ADMIN'
                                    ? 'bg-gradient-to-tr from-red-600 to-rose-500'
                                    : user.rol === 'SOPORTE'
                                    ? 'bg-gradient-to-tr from-blue-600 to-cyan-500'
                                    : 'bg-gradient-to-tr from-emerald-600 to-teal-500'
                                }`}
                              >
                                {isBot ? <Bot className="w-5 h-5 text-white" /> : initials}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-gray-100">{user.nombre}</span>
                                  {isSelf && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded font-semibold border border-red-500/30">
                                      Tú (Sesión)
                                    </span>
                                  )}
                                  {isBot && (
                                    <span className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded font-semibold border border-purple-500/30 flex items-center gap-1">
                                      <Bot className="w-3 h-3 text-purple-400" />
                                      <span>Asistente IA</span>
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                  <Mail className="w-3 h-3 text-gray-500" />
                                  <span>{user.email}</span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contacto */}
                          <td className="py-3.5 px-4 text-xs text-gray-300">
                            {user.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-gray-500" />
                                <span>{user.phone}</span>
                                <a
                                  href={`https://wa.me/${user.phone.replace(/[^0-9]/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-emerald-400 hover:text-emerald-300 transition"
                                  data-tooltip="WhatsApp"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-gray-600 italic">Sin teléfono</span>
                            )}
                          </td>

                          {/* Rol del Sistema */}
                          <td className="py-3.5 px-4">
                            {renderRoleBadge(user.rol)}
                          </td>

                          {/* Módulos Permitidos */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-semibold text-gray-200">
                                  {user.modulosPermitidos && user.modulosPermitidos.length > 0
                                    ? `${user.modulosPermitidos.length} de ${AVAILABLE_MODULES.length}`
                                    : `${(DEFAULT_ROLE_MODULES[user.rol] || []).length} de ${AVAILABLE_MODULES.length}`}
                                </span>
                                {user.modulosPermitidos && user.modulosPermitidos.length > 0 ? (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/40 font-semibold">
                                    Personalizado
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800/80 text-gray-400 font-medium">
                                    Por Rol
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => openManageModules(user)}
                                className="text-[11px] text-left text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 font-medium transition cursor-pointer"
                                title="Activar o desactivar módulos para este usuario"
                              >
                                <Sliders className="w-3 h-3 text-purple-400" />
                                <span>Activar / Desactivar</span>
                              </button>
                            </div>
                          </td>

                          {/* Estado */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                user.activo
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  user.activo ? 'bg-emerald-400' : 'bg-rose-400'
                                }`}
                              />
                              {user.activo ? 'Activo' : 'Suspendido'}
                            </span>
                          </td>

                          {/* Fecha */}
                          <td className="py-3.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-500" />
                              <span>{new Date(user.createdAt).toLocaleDateString('es-CO')}</span>
                            </div>
                          </td>

                          {/* Acciones */}
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Botón Gestionar Módulos */}
                              <button
                                onClick={() => openManageModules(user)}
                                className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-purple-600/20 text-gray-400 hover:text-purple-400 border border-transparent hover:border-purple-500/30 transition cursor-pointer"
                                data-tooltip="Módulos"
                                title="Activar o desactivar módulos para este usuario"
                              >
                                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                              </button>

                              {/* Botón Copiar ID */}
                              <button
                                onClick={() => handleCopy(user.id, user.id)}
                                className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white transition"
                                data-tooltip="Copiar"
                              >
                                {copiedId === user.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Botón Editar */}
                              <button
                                onClick={() => openEditModal(user)}
                                className="p-1.5 rounded-lg bg-gray-800/80 hover:bg-blue-600/20 text-gray-400 hover:text-blue-400 border border-transparent hover:border-blue-500/30 transition"
                                data-tooltip="Editar"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>

                              {/* Botón Alternar Estado (Activar / Suspender) */}
                              <button
                                onClick={() => handleToggleActive(user)}
                                disabled={isSelf || processingId === user.id}
                                className={`p-1.5 rounded-lg transition border ${
                                  isSelf
                                    ? 'opacity-30 cursor-not-allowed bg-gray-900 border-gray-800 text-gray-600'
                                    : user.activo
                                    ? 'bg-gray-800/80 hover:bg-amber-600/20 text-gray-400 hover:text-amber-400 border-transparent hover:border-amber-500/30'
                                    : 'bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                                }`}
                                data-tooltip={user.activo ? 'Suspender' : 'Activar'}
                              >
                                {user.activo ? (
                                  <UserX className="w-3.5 h-3.5" />
                                ) : (
                                  <UserCheck className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Botón Eliminar */}
                              <button
                                onClick={() => setDeletingUser(user)}
                                disabled={isSelf}
                                className={`p-1.5 rounded-lg transition border ${
                                  isSelf
                                    ? 'opacity-30 cursor-not-allowed bg-gray-900 border-gray-800 text-gray-600'
                                    : 'bg-gray-800/80 hover:bg-red-600/20 text-gray-400 hover:text-red-400 border-transparent hover:border-red-500/30'
                                }`}
                                data-tooltip="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                <TablePagination
                  currentPage={currentPage}
                  totalItems={filteredUsers.length}
                  itemsPerPage={ITEMS_PER_PAGE}
                  onPageChange={setCurrentPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VISTA 2: ROLES Y MATRIZ DE PERMISOS */}
      {/* ======================================================== */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* ROL ADMIN */}
            <div className="bg-gradient-to-b from-red-950/20 to-gray-900/60 border border-red-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
              <div className="w-24 h-24 rounded-full bg-red-600/10 absolute -right-6 -top-6 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-red-400">Rol Maestro</span>
                  <h3 className="text-lg font-bold text-white">Administrador</h3>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Control y gobierno integral de toda la infraestructura. Facultades totales para crear y modificar configuraciones, catálogos, finanzas y usuarios del sistema.
              </p>

              <div className="space-y-2 border-t border-gray-800/80 pt-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Permisos y Facultades:
                </span>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>Gestión CRUD total de Usuarios y Asignación de Roles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>Control de Inventario, Lotes y Proveedores de Streaming</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>Módulo de Caja: Arqueo, ingresos, egresos y cierres de turno</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>Aprobación, Anulación y Reembolso de Órdenes de Venta</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>Mesa de Garantías, reemplazos FIFO y cuarentena de cuentas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>Catálogo de Streaming: Crear, editar servicios y planes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                    <span>Configuración Global, WhatsApp CRM y Backups JSON</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ROL SOPORTE */}
            <div className="bg-gradient-to-b from-blue-950/20 to-gray-900/60 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
              <div className="w-24 h-24 rounded-full bg-blue-600/10 absolute -right-6 -top-6 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-sm">
                  <Headset className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-blue-400">Atención Postventa</span>
                  <h3 className="text-lg font-bold text-white">Soporte Técnico</h3>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Enfocado en la atención de garantías de clientes, reemplazo inmediato de credenciales por inventario FIFO y verificación del estado operativo de los servicios.
              </p>

              <div className="space-y-2 border-t border-gray-800/80 pt-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Permisos y Facultades:
                </span>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Acceso a Mesa de Soporte y Tickets de Garantía</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Aprobación y resolución de solicitudes de garantía</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Botón de Asignación Inmediata de Cuentas (FIFO)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Consulta en tiempo real del stock de cuentas disponibles</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                    <span>Consulta de historial de compras para validación de clientes</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500">
                    <X className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
                    <span>Sin acceso a Configuración del Sistema ni Arqueos de Caja</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ROL VENDEDOR */}
            <div className="bg-gradient-to-b from-emerald-950/20 to-gray-900/60 border border-emerald-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
              <div className="w-24 h-24 rounded-full bg-emerald-600/10 absolute -right-6 -top-6 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-emerald-400">Comercial & Afiliados</span>
                  <h3 className="text-lg font-bold text-white">Asesor de Ventas</h3>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Destinado a la comercialización de servicios de streaming, registro directo de ventas, acumulación de comisiones por ventas y cobro de saldo disponible.
              </p>

              <div className="space-y-2 border-t border-gray-800/80 pt-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Permisos y Facultades:
                </span>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Registro y Creación de Órdenes de Venta</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Consulta del Catálogo de Planes y Tarifas vigentes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Verificación de disponibilidad de stock para venta</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Panel personal de comisiones, saldo y solicitud de retiros</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500">
                    <X className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
                    <span>Sin acceso a Configuración Global, Backups ni Catálogos base</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* ROL ASESOR COMERCIAL */}
            <div className="bg-gradient-to-b from-amber-950/20 to-gray-900/60 border border-amber-500/30 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
              <div className="w-24 h-24 rounded-full bg-amber-600/10 absolute -right-6 -top-6 blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-sm">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider font-bold text-amber-400">Captación & Red</span>
                  <h3 className="text-lg font-bold text-white">Asesor Comercial</h3>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">
                Captación de nuevos clientes por enlace de afiliación. Visualiza únicamente los clientes conseguidos con suscripción, sus ganancias y enlace.
              </p>

              <div className="space-y-2 border-t border-gray-800/80 pt-4">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Permisos y Facultades:
                </span>
                <ul className="text-xs text-gray-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Enlace único de afiliación para compartir y captar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Directorio exclusivo de sus clientes con suscripción</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Panel de ganancias personales y comisiones</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>Solicitud de retiros de saldo devengado</span>
                  </li>
                  <li className="flex items-start gap-2 text-gray-500">
                    <X className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-0.5" />
                    <span>Sin acceso a ventas de otros usuarios ni caja operativa</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* TABLA COMPARATIVA CON CLIENTES */}
          <div className="bg-gray-900/40 border border-gray-800/80 rounded-2xl p-6 backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-white">
                Diferenciación Arquitectónica: Personal del Sistema vs Clientes Finales
              </h3>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              En la plataforma existe una estricta separación de responsabilidades. Los miembros internos del sistema (<strong>Administrador</strong>, <strong>Soporte Técnico</strong>, <strong>Asesor de Ventas</strong> y <strong>Asesor Comercial</strong>) gestionan la operativa según los módulos habilitados, mientras que los <strong>clientes</strong> son consumidores que adquieren suscripciones de entretenimiento en el portal y no intervienen en la administración técnica ni financiera de la empresa.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-[11px] text-gray-400 uppercase tracking-wider bg-gray-950/40">
                    <th className="py-3 px-4">Módulo / Capacidad</th>
                    <th className="py-3 px-4 text-center">Administrador</th>
                    <th className="py-3 px-4 text-center">Soporte Técnico</th>
                    <th className="py-3 px-4 text-center">Asesor de Ventas</th>
                    <th className="py-3 px-4 text-center text-amber-400">Asesor Comercial</th>
                    <th className="py-3 px-4 text-center text-blue-400">Cliente Final (Portal)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/40 text-gray-300">
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Gestión de Usuarios & Roles</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">TOTAL</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Módulo de Caja & Finanzas</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">TOTAL</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-purple-400 font-semibold">Asignable</td>
                    <td className="py-3 px-4 text-center text-purple-400 font-semibold">Asignable</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Mesa de Soporte & Garantías FIFO</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">TOTAL</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">OPERATIVO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-blue-400">Solo Solicitar Garantía</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Creación de Órdenes de Venta (POS)</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">TOTAL</td>
                    <td className="py-3 px-4 text-center text-blue-400">Solo Consulta</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">OPERATIVO</td>
                    <td className="py-3 px-4 text-center text-blue-400">Solo Consulta / Propias</td>
                    <td className="py-3 px-4 text-center text-blue-400">Comprar en Portal</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Captación por Enlace de Afiliación</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">TOTAL</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-bold">EXCLUSIVO (Link Propio)</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Directorio de Clientes</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">GLOBAL</td>
                    <td className="py-3 px-4 text-center text-blue-400">Consulta</td>
                    <td className="py-3 px-4 text-center text-blue-400">Consulta</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-semibold">Solo Suscritos Propios</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Comisiones & Solicitud de Retiro</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">Auditoría / Pagos</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">OPERATIVO</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-bold">OPERATIVO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Inventario de Cuentas y Lotes</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">CRUD TOTAL</td>
                    <td className="py-3 px-4 text-center text-blue-400">Solo Stock</td>
                    <td className="py-3 px-4 text-center text-blue-400">Solo Stock</td>
                    <td className="py-3 px-4 text-center text-purple-400 font-semibold">Asignable</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Configuración del Sistema & Backups</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">TOTAL</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">NO</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-medium text-white">Personalización Dinámica de Módulos</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-bold">ADMINISTRA</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-semibold">Personalizable</td>
                    <td className="py-3 px-4 text-center text-emerald-400 font-semibold">Personalizable</td>
                    <td className="py-3 px-4 text-center text-amber-400 font-bold">Personalizable</td>
                    <td className="py-3 px-4 text-center text-rose-500 font-bold">Fijo (Portal)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: REGISTRAR NUEVO USUARIO (CRUD - CREATE) */}
      {/* ======================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Registrar Usuario Operativo</h2>
                  <p className="text-xs text-gray-400">Crear credenciales de acceso para el personal interno</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleCreateUser} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={createForm.nombre}
                  onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                  placeholder="Ej: Carlos Mendoza Gómez"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Correo Electrónico (Login) *
                </label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="operador@streamingcontrol.com"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Teléfono / WhatsApp Móvil
                </label>
                <input
                  type="text"
                  value={createForm.phone}
                  onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                  placeholder="+57 300 123 4567"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Selector de Rol */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Rol Asignado en el Sistema *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, rol: 'ADMIN' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      createForm.rol === 'ADMIN'
                        ? 'bg-red-500/10 border-red-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Shield className="w-4 h-4 mb-2 text-red-400" />
                    <div>
                      <span className="text-xs font-bold block">Administrador</span>
                      <span className="text-[10px] text-gray-400">Control total</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, rol: 'SOPORTE' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      createForm.rol === 'SOPORTE'
                        ? 'bg-blue-500/10 border-blue-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Headset className="w-4 h-4 mb-2 text-blue-400" />
                    <div>
                      <span className="text-xs font-bold block">Soporte Técnico</span>
                      <span className="text-[10px] text-gray-400">Garantías & FIFO</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, rol: 'VENDEDOR' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      createForm.rol === 'VENDEDOR'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 mb-2 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold block">Asesor Ventas</span>
                      <span className="text-[10px] text-gray-400">POS & Ventas</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateForm({ ...createForm, rol: 'ASESOR_COMERCIAL' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      createForm.rol === 'ASESOR_COMERCIAL'
                        ? 'bg-amber-500/10 border-amber-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 mb-2 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold block">Asesor Comercial</span>
                      <span className="text-[10px] text-gray-400">Afiliación & Red</span>
                    </div>
                  </button>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 italic">
                  * Nota: Los clientes no forman parte de estos roles operativos.
                </p>
              </div>

              {/* Contraseña */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Contraseña Inicial *
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setCreateForm({ ...createForm, password: generateRandomPassword() })
                    }
                    className="text-[11px] text-red-400 hover:text-red-300 font-medium"
                  >
                    Generar segura
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-3 pr-10 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showCreatePassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Switch Activo */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs font-semibold text-gray-300">Activo inmediatamente</span>
                <button
                  type="button"
                  onClick={() => setCreateForm({ ...createForm, activo: !createForm.activo })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                    createForm.activo ? 'bg-red-600 justify-end' : 'bg-gray-800 justify-start'
                  }`}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                </button>
              </div>

              </div>

              {/* Botones de acción Fijos */}
              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  {creating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Guardar Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDITAR USUARIO (CRUD - UPDATE) */}
      {/* ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Header */}
            <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-900 to-gray-950 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Editar Usuario del Sistema</h2>
                  <p className="text-xs text-gray-400">Modificar permisos o información del operador</p>
                </div>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-gray-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateUser} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Correo Electrónico (Login) *
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Teléfono / WhatsApp Móvil
                </label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="+57 300 123 4567"
                  className="w-full bg-gray-950 border border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Selector de Rol */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                  Rol Asignado en el Sistema *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, rol: 'ADMIN' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      editForm.rol === 'ADMIN'
                        ? 'bg-red-500/10 border-red-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Shield className="w-4 h-4 mb-2 text-red-400" />
                    <div>
                      <span className="text-xs font-bold block">Administrador</span>
                      <span className="text-[10px] text-gray-400">Control total</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, rol: 'SOPORTE' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      editForm.rol === 'SOPORTE'
                        ? 'bg-blue-500/10 border-blue-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <Headset className="w-4 h-4 mb-2 text-blue-400" />
                    <div>
                      <span className="text-xs font-bold block">Soporte Técnico</span>
                      <span className="text-[10px] text-gray-400">Garantías & FIFO</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, rol: 'VENDEDOR' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      editForm.rol === 'VENDEDOR'
                        ? 'bg-emerald-500/10 border-emerald-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 mb-2 text-emerald-400" />
                    <div>
                      <span className="text-xs font-bold block">Asesor Ventas</span>
                      <span className="text-[10px] text-gray-400">POS & Ventas</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditForm({ ...editForm, rol: 'ASESOR_COMERCIAL' })}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      editForm.rol === 'ASESOR_COMERCIAL'
                        ? 'bg-amber-500/10 border-amber-500 text-white'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 mb-2 text-amber-400" />
                    <div>
                      <span className="text-xs font-bold block">Asesor Comercial</span>
                      <span className="text-[10px] text-gray-400">Afiliación & Red</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Cambiar Contraseña (Opcional) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Cambiar Contraseña (Opcional)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm({ ...editForm, password: generateRandomPassword() })
                    }
                    className="text-[11px] text-blue-400 hover:text-blue-300 font-medium"
                  >
                    Generar segura
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Dejar en blanco para mantener la contraseña actual"
                    className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-3 pr-10 py-2.5 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                  >
                    {showEditPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Switch Activo / Suspendido */}
              <div className="flex items-center justify-between pt-2">
                <div>
                  <span className="text-xs font-semibold text-gray-300 block">Estado de la Cuenta</span>
                  <span className="text-[11px] text-gray-500">
                    {editForm.activo ? 'El usuario puede iniciar sesión' : 'Acceso bloqueado'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={currentUser?.id === editingUser.id}
                  onClick={() => setEditForm({ ...editForm, activo: !editForm.activo })}
                  className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                    currentUser?.id === editingUser.id
                      ? 'opacity-40 cursor-not-allowed bg-emerald-600 justify-end'
                      : editForm.activo
                      ? 'bg-emerald-600 justify-end'
                      : 'bg-gray-800 justify-start'
                  }`}
                >
                  <span className="bg-white w-4 h-4 rounded-full shadow-md transform transition" />
                </button>
              </div>

              </div>

              {/* Botones de acción Fijos */}
              <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20 transition flex items-center gap-2 cursor-pointer"
                >
                  {updating && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  <span>Actualizar Usuario</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ELIMINAR USUARIO (CRUD - DELETE) */}
      {/* ======================================================== */}
      {deletingUser && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-500">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">¿Eliminar Usuario Operativo?</h3>
              </div>
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-white">Confirmar Baja de Usuario</h3>
                <p className="text-xs text-gray-400">
                  Estás a punto de dar de baja la cuenta de{' '}
                  <strong className="text-white">{deletingUser.nombre}</strong> ({deletingUser.email}).
                </p>
              </div>

              <div className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-gray-400 space-y-1">
                <div className="flex items-center gap-2 text-amber-400 font-semibold">
                  <Shield className="w-3.5 h-3.5" />
                  <span>Protección de Integridad:</span>
                </div>
                <p>
                  Si este usuario cuenta con ventas históricas registradas, el sistema suspenderá su cuenta de forma segura para preservar la integridad de la caja y auditoría financiera.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-800 shrink-0 bg-gray-900/95">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processingId === deletingUser.id}
                onClick={handleDeleteUser}
                className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                {processingId === deletingUser.id && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Confirmar Baja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: ACTIVAR O DESACTIVAR MÓDULOS DEL USUARIO */}
      {/* ======================================================== */}
      {managingModulesUser && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col">
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-950 via-gray-900 to-gray-950">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-600/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner shrink-0">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-white">Activar o Desactivar Módulos</h2>
                    <span className="text-[10px] px-2 py-0.5 bg-red-950 text-red-400 border border-red-800/40 rounded uppercase font-semibold">
                      Solo Administrador
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Configurando acceso operativo para:{' '}
                    <strong className="text-white">{managingModulesUser.nombre}</strong> ({managingModulesUser.email}) —{' '}
                    <span className="text-purple-300 font-semibold">{managingModulesUser.rol}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManagingModulesUser(null)}
                className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-barra de acciones rápidas */}
            <div className="px-5 sm:px-6 py-3 border-b border-gray-800/80 bg-gray-900/60 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-gray-400 font-medium">Acciones rápidas:</span>
                <button
                  type="button"
                  onClick={() => setSelectedModules(AVAILABLE_MODULES.map((m) => m.id))}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-md font-medium transition cursor-pointer"
                >
                  Habilitar Todos ({AVAILABLE_MODULES.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModules(DEFAULT_ROLE_MODULES[managingModulesUser.rol] || AVAILABLE_MODULES.map((m) => m.id))}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-purple-300 rounded-md font-medium transition cursor-pointer"
                >
                  Restablecer por Rol ({managingModulesUser.rol})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModules([])}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-rose-300 rounded-md font-medium transition cursor-pointer"
                >
                  Desmarcar Todos
                </button>
              </div>

              <div className="text-gray-400 font-mono text-xs">
                <span className="font-bold text-white text-sm">{selectedModules.length}</span> de {AVAILABLE_MODULES.length} módulos habilitados
              </div>
            </div>

            {/* Grid de Módulos con Scroll */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1 bg-gray-950/40">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_MODULES.map((mod) => {
                  const isEnabled = selectedModules.includes(mod.id);
                  const Icon = mod.icon;

                  return (
                    <div
                      key={mod.id}
                      onClick={() => toggleModuleSelection(mod.id)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${
                        isEnabled
                          ? 'bg-purple-950/20 border-purple-500/40 shadow-sm shadow-purple-500/5'
                          : 'bg-gray-900/40 border-gray-800/80 opacity-70 hover:opacity-100 hover:border-gray-700'
                      }`}
                    >
                      {/* Checkbox */}
                      <div className="pt-0.5 shrink-0">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                            isEnabled
                              ? 'bg-purple-600 border-purple-500 text-white'
                              : 'bg-gray-900 border-gray-700 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                      {/* Icono del Módulo */}
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${mod.color}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>

                      {/* Información del Módulo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-sm font-bold text-white truncate">
                            {mod.label}
                          </h4>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                              isEnabled
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-gray-800 text-gray-500 border border-gray-700'
                            }`}
                          >
                            {isEnabled ? 'Activo' : 'Desactivado'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-gray-500 block">
                          {mod.id}
                        </span>
                        <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                          {mod.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer con Guardar Fijo */}
            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2 text-xs text-gray-400 text-center sm:text-left">
                <Info className="w-4 h-4 text-purple-400 shrink-0 hidden sm:inline-block" />
                <span>
                  Al guardar, la barra de navegación del usuario se ajustará inmediatamente a estos permisos.
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setManagingModulesUser(null)}
                  className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer shrink-0"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveModules}
                  disabled={savingModules}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shrink-0 whitespace-nowrap"
                >
                  {savingModules && (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>Guardar Módulos Habilitados</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
