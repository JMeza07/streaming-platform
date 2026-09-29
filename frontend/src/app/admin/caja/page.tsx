'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Cookies from 'js-cookie';
import api from '@/lib/api';
import { exportToCSV, triggerPrintReport, ColumnDef } from '@/lib/exportUtils';
import {
  Wallet,
  Plus,
  Minus,
  Lock,
  Unlock,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  FileText,
  X,
  ShieldCheck,
  Archive,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Building2,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Calendar,
  CalendarDays,
  Printer,
  Download,
  RotateCcw,
  Tv,
  UserCheck,
  ChevronRight,
  Layers,
} from 'lucide-react';
import TablePagination from '@/components/TablePagination';

interface CajaMovimiento {
  id: string;
  tipo: 'ENTRADA' | 'SALIDA' | 'ANULACION' | 'DEVOLUCION';
  concepto: string;
  monto: number;
  operador: string;
  timestamp: string;
  requiereSupervision: boolean;
  observaciones?: string;
  esVentaSistema?: boolean;
  orderId?: string;
  metodoPago?: string;
  cliente?: string;
  plataformas?: string[];
  plataforma?: string;
  vendedor?: string;
}

interface EstadoCaja {
  abierta: boolean;
  montoBase: number;
  apertura?: string;
  operador?: string;
  cierre?: string;
  movimientos: CajaMovimiento[];
}

const formatCOP = (val: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(val || 0);

const STORAGE_KEY = 'caja_estado_v1';

const cargarEstado = (): EstadoCaja => {
  if (typeof window === 'undefined') return { abierta: false, montoBase: 0, movimientos: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (_) {}
  return { abierta: false, montoBase: 0, movimientos: [] };
};

const guardarEstado = (estado: EstadoCaja) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
};

export default function CajaPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [caja, setCaja] = useState<EstadoCaja>({ abierta: false, montoBase: 0, movimientos: [] });
  const [orders, setOrders] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Pestaña de visualización: Transacciones detalladas vs Arqueo consolidado por días
  const [activeTab, setActiveTab] = useState<'transacciones' | 'arqueo_diario'>('transacciones');

  // Filtros
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'VENTAS' | 'MANUALES' | 'ENTRADAS' | 'SALIDAS'>('TODOS');
  const [filtroTurno, setFiltroTurno] = useState<'todos' | 'turno'>('todos');
  const [filtroFechaPreset, setFiltroFechaPreset] = useState<'todos' | 'hoy' | 'ayer' | 'ultimos7' | 'ultimos30' | 'esteMes' | 'personalizado'>('todos');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroPlataforma, setFiltroPlataforma] = useState('');
  const [filtroMetodoPago, setFiltroMetodoPago] = useState('');
  const [filtroVendedor, setFiltroVendedor] = useState('');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentArqueoPage, setCurrentArqueoPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Modales
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [showCierreModal, setShowCierreModal] = useState(false);
  const [showMovimientoModal, setShowMovimientoModal] = useState(false);
  const [showSupervisionModal, setShowSupervisionModal] = useState<{ tipo: 'ANULACION' | 'DEVOLUCION' } | null>(null);

  const [montoBase, setMontoBase] = useState('');
  const [movForm, setMovForm] = useState({
    tipo: 'ENTRADA' as 'ENTRADA' | 'SALIDA',
    concepto: '',
    monto: '',
    observaciones: '',
    metodoPago: 'Efectivo',
    plataforma: '',
  });
  const [supervForm, setSupervForm] = useState({
    pin: '',
    concepto: '',
    monto: '',
    observaciones: '',
    tipo: 'ANULACION' as 'ANULACION' | 'DEVOLUCION',
  });

  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const SUPERVISOR_PIN = '1234';

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await api.get('/orders');
      setOrders(res.data || []);
    } catch (err) {
      console.error('Error cargando órdenes de venta en caja:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    const raw = Cookies.get('user') || (typeof window !== 'undefined' ? localStorage.getItem('user') : null);
    if (raw) {
      try {
        setCurrentUser(JSON.parse(raw));
      } catch (_) {}
    }
    setCaja(cargarEstado());
    fetchOrders();
    setLoaded(true);
  }, []);

  const isSupervisor = currentUser?.rol === 'ADMIN' || currentUser?.rol === 'SOPORTE';

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Convertir órdenes de la base de datos y combinarlas con movimientos manuales
  const allMovimientos = useMemo(() => {
    // 1. Movimientos derivados de las ventas del sistema
    const ventasMovs: CajaMovimiento[] = orders
      .filter((o) => o.estado === 'PAGADO' || o.estado === 'REEMBOLSADO')
      .map((o) => {
        const isRefund = o.estado === 'REEMBOLSADO';
        const itemsResumen =
          o.items?.map((it: any) => `${it.plan?.service?.nombre || it.servicio || 'Servicio'} (${it.cantidad}x)`).join(', ') ||
          'Suscripción Streaming';

        // Extraer plataformas del pedido
        const plataformas = Array.from(
          new Set(
            o.items
              ?.map((it: any) => it.plan?.service?.nombre || it.servicio)
              .filter(Boolean) as string[]
          )
        );
        const plataformaPrincipal = plataformas[0] || 'Varios / Streaming';

        // Identificar vendedor u origen
        const vendedorNombre = o.vendedor?.nombre || o.vendedorNombre || 'Venta Web / En Línea';

        return {
          id: isRefund ? `refund-${o.id}` : `order-${o.id}`,
          tipo: isRefund ? ('DEVOLUCION' as const) : ('ENTRADA' as const),
          concepto: isRefund
            ? `Reembolso Venta #${o.id.substring(0, 8).toUpperCase()}`
            : `Venta #${o.id.substring(0, 8).toUpperCase()} - ${itemsResumen}`,
          monto: Number(o.total) || 0,
          operador: vendedorNombre,
          vendedor: vendedorNombre,
          timestamp: o.createdAt,
          requiereSupervision: isRefund,
          observaciones: `Cliente: ${o.customer?.user?.nombre || 'Cliente'}${
            o.referenciaExterna ? ` | Ref: ${o.referenciaExterna}` : ''
          }${o.metodoPago ? ` | Método: ${o.metodoPago}` : ''}`,
          esVentaSistema: true,
          orderId: o.id,
          metodoPago: o.metodoPago || 'Efectivo',
          cliente: o.customer?.user?.nombre || 'Cliente',
          plataformas,
          plataforma: plataformaPrincipal,
        };
      });

    // 2. Movimientos manuales guardados en la sesión de caja
    const manuales = caja.movimientos || [];

    // 3. Fusionar evitando duplicados
    const manualIds = new Set(manuales.map((m) => m.id));
    const fusion: CajaMovimiento[] = [...manuales];
    for (const vm of ventasMovs) {
      if (!manualIds.has(vm.id)) {
        fusion.push(vm);
      }
    }

    // Ordenar de más reciente a más antiguo
    return fusion.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [caja.movimientos, orders]);

  // Listas de opciones dinámicas para filtros
  const availablePlatforms = useMemo(() => {
    const set = new Set<string>();
    allMovimientos.forEach((m) => {
      if (m.plataforma && m.plataforma !== 'General / Caja') set.add(m.plataforma);
      m.plataformas?.forEach((p) => {
        if (p) set.add(p);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allMovimientos]);

  const availablePaymentMethods = useMemo(() => {
    const set = new Set<string>();
    allMovimientos.forEach((m) => {
      if (m.metodoPago) set.add(m.metodoPago.trim());
    });
    ['Efectivo', 'Nequi', 'Bancolombia', 'Daviplata', 'Transferencia', 'PSE'].forEach((mp) => {
      if (!Array.from(set).some((s) => s.toLowerCase().includes(mp.toLowerCase()))) {
        set.add(mp);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allMovimientos]);

  const availableSellers = useMemo(() => {
    const set = new Set<string>();
    allMovimientos.forEach((m) => {
      if (m.vendedor) set.add(m.vendedor.trim());
      else if (m.operador) set.add(m.operador.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allMovimientos]);

  // Función para aplicar presets rápidos de fecha
  const aplicarPresetFecha = (preset: 'todos' | 'hoy' | 'ayer' | 'ultimos7' | 'ultimos30' | 'esteMes' | 'personalizado') => {
    setFiltroFechaPreset(preset);
    const hoy = new Date();
    const toYMD = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    if (preset === 'todos') {
      setFechaDesde('');
      setFechaHasta('');
    } else if (preset === 'hoy') {
      const str = toYMD(hoy);
      setFechaDesde(str);
      setFechaHasta(str);
    } else if (preset === 'ayer') {
      const ayer = new Date(hoy);
      ayer.setDate(ayer.getDate() - 1);
      const str = toYMD(ayer);
      setFechaDesde(str);
      setFechaHasta(str);
    } else if (preset === 'ultimos7') {
      const d7 = new Date(hoy);
      d7.setDate(d7.getDate() - 6);
      setFechaDesde(toYMD(d7));
      setFechaHasta(toYMD(hoy));
    } else if (preset === 'ultimos30') {
      const d30 = new Date(hoy);
      d30.setDate(d30.getDate() - 29);
      setFechaDesde(toYMD(d30));
      setFechaHasta(toYMD(hoy));
    } else if (preset === 'esteMes') {
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      setFechaDesde(toYMD(inicioMes));
      setFechaHasta(toYMD(hoy));
    }
  };

  // Limpiar todos los filtros
  const limpiarFiltros = () => {
    setFiltroTipo('TODOS');
    setFiltroTurno('todos');
    setFiltroFechaPreset('todos');
    setFechaDesde('');
    setFechaHasta('');
    setFiltroPlataforma('');
    setFiltroMetodoPago('');
    setFiltroVendedor('');
  };

  const hasActiveFilters = Boolean(
    filtroTipo !== 'TODOS' ||
      filtroTurno !== 'todos' ||
      fechaDesde ||
      fechaHasta ||
      filtroPlataforma ||
      filtroMetodoPago ||
      filtroVendedor
  );

  // Lista de movimientos filtrada según pestaña, turno, fechas, plataforma, método de pago y vendedor
  const movimientosFiltrados = useMemo(() => {
    let lista = allMovimientos;

    // 1. Filtro por turno de caja si está activa la vista de turno
    if (filtroTurno === 'turno' && caja.abierta && caja.apertura) {
      const aperturaTime = new Date(caja.apertura).getTime();
      lista = lista.filter((m) => new Date(m.timestamp).getTime() >= aperturaTime);
    }

    // 2. Filtro por tipo de movimiento
    if (filtroTipo === 'VENTAS') {
      lista = lista.filter((m) => m.esVentaSistema && m.tipo === 'ENTRADA');
    } else if (filtroTipo === 'MANUALES') {
      lista = lista.filter((m) => !m.esVentaSistema);
    } else if (filtroTipo === 'ENTRADAS') {
      lista = lista.filter((m) => m.tipo === 'ENTRADA');
    } else if (filtroTipo === 'SALIDAS') {
      lista = lista.filter((m) => m.tipo === 'SALIDA' || m.tipo === 'DEVOLUCION' || m.tipo === 'ANULACION');
    }

    // 3. Filtro por Plataforma
    if (filtroPlataforma) {
      const pSearch = filtroPlataforma.toLowerCase();
      lista = lista.filter((m) => {
        const plat = (m.plataforma || '').toLowerCase();
        const matchesArray = m.plataformas?.some((p) => p.toLowerCase() === pSearch);
        const matchesConcept = m.concepto.toLowerCase().includes(pSearch);
        return plat === pSearch || matchesArray || matchesConcept;
      });
    }

    // 4. Filtro por Método de Pago
    if (filtroMetodoPago) {
      const mpSearch = filtroMetodoPago.toLowerCase();
      lista = lista.filter((m) => {
        const itemMp = (m.metodoPago || 'efectivo').toLowerCase();
        return itemMp === mpSearch || itemMp.includes(mpSearch) || (m.observaciones || '').toLowerCase().includes(mpSearch);
      });
    }

    // 5. Filtro por Vendedor / Operador
    if (filtroVendedor) {
      const vSearch = filtroVendedor.toLowerCase();
      lista = lista.filter((m) => {
        const itemVend = (m.vendedor || m.operador || '').toLowerCase();
        if (vSearch.includes('online') || vSearch.includes('web')) {
          return itemVend.includes('web') || itemVend.includes('online') || itemVend.includes('directa');
        }
        return itemVend === vSearch || itemVend.includes(vSearch);
      });
    }

    // 6. Filtro por Días (Fecha Desde / Fecha Hasta)
    if (fechaDesde || fechaHasta) {
      lista = lista.filter((m) => {
        if (!m.timestamp) return false;
        const itemDate = new Date(m.timestamp);
        if (fechaDesde) {
          const [sY, sM, sD] = fechaDesde.split('-').map(Number);
          const startLimit = new Date(sY, sM - 1, sD, 0, 0, 0, 0);
          if (itemDate < startLimit) return false;
        }
        if (fechaHasta) {
          const [eY, eM, eD] = fechaHasta.split('-').map(Number);
          const endLimit = new Date(eY, eM - 1, eD, 23, 59, 59, 999);
          if (itemDate > endLimit) return false;
        }
        return true;
      });
    }

    return lista;
  }, [allMovimientos, filtroTipo, filtroTurno, filtroPlataforma, filtroMetodoPago, filtroVendedor, fechaDesde, fechaHasta, caja.abierta, caja.apertura]);

  useEffect(() => {
    setCurrentPage(1);
    setCurrentArqueoPage(1);
  }, [filtroTipo, filtroTurno, filtroPlataforma, filtroMetodoPago, filtroVendedor, fechaDesde, fechaHasta]);

  // Arqueo Diario Consolidado (Agrupado Día a Día)
  const arqueoPorDias = useMemo(() => {
    const map = new Map<
      string,
      {
        fechaKey: string;
        dateObj: Date;
        transacciones: number;
        ventasCount: number;
        entradas: number;
        salidas: number;
        devoluciones: number;
        metodosPago: Record<string, number>;
        plataformas: Set<string>;
        vendedores: Set<string>;
        movimientos: CajaMovimiento[];
      }
    >();

    movimientosFiltrados.forEach((m) => {
      const d = new Date(m.timestamp);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const fechaKey = `${year}-${month}-${day}`;

      let diaData = map.get(fechaKey);
      if (!diaData) {
        diaData = {
          fechaKey,
          dateObj: new Date(year, d.getMonth(), d.getDate()),
          transacciones: 0,
          ventasCount: 0,
          entradas: 0,
          salidas: 0,
          devoluciones: 0,
          metodosPago: {},
          plataformas: new Set(),
          vendedores: new Set(),
          movimientos: [],
        };
        map.set(fechaKey, diaData);
      }

      diaData.transacciones += 1;
      diaData.movimientos.push(m);

      if (m.tipo === 'ENTRADA') {
        diaData.entradas += m.monto;
        if (m.esVentaSistema) diaData.ventasCount += 1;
        const mp = m.metodoPago || 'Efectivo';
        diaData.metodosPago[mp] = (diaData.metodosPago[mp] || 0) + m.monto;
      } else if (m.tipo === 'SALIDA') {
        diaData.salidas += m.monto;
      } else if (m.tipo === 'DEVOLUCION' || m.tipo === 'ANULACION') {
        diaData.devoluciones += m.monto;
      }

      if (m.plataforma && m.plataforma !== 'General / Caja') diaData.plataformas.add(m.plataforma);
      m.plataformas?.forEach((p) => {
        if (p) diaData!.plataformas.add(p);
      });
      if (m.vendedor) diaData.vendedores.add(m.vendedor);
      else if (m.operador) diaData.vendedores.add(m.operador);
    });

    const result = Array.from(map.values()).map((d) => {
      const balanceNeto = d.entradas - d.salidas - d.devoluciones;
      const diaSemana = d.dateObj.toLocaleDateString('es-CO', { weekday: 'long' });
      const fechaLabel = d.dateObj.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
      return {
        ...d,
        balanceNeto,
        diaSemana: diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1),
        fechaLabel,
        plataformas: Array.from(d.plataformas),
        vendedores: Array.from(d.vendedores),
      };
    });

    return result.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [movimientosFiltrados]);

  const paginatedMovimientos = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return movimientosFiltrados.slice(start, start + ITEMS_PER_PAGE);
  }, [movimientosFiltrados, currentPage]);

  const paginatedArqueo = useMemo(() => {
    const start = (currentArqueoPage - 1) * ITEMS_PER_PAGE;
    return arqueoPorDias.slice(start, start + ITEMS_PER_PAGE);
  }, [arqueoPorDias, currentArqueoPage]);

  // Cálculo de métricas financieras reactivas a todos los filtros aplicados
  const metricas = useMemo(() => {
    const listaMetricas = movimientosFiltrados;

    const ventasSistema = listaMetricas.filter((m) => m.esVentaSistema && m.tipo === 'ENTRADA');
    const entradas = listaMetricas.filter((m) => m.tipo === 'ENTRADA').reduce((a, m) => a + m.monto, 0);
    const salidas = listaMetricas.filter((m) => m.tipo === 'SALIDA').reduce((a, m) => a + m.monto, 0);
    const anulaciones = listaMetricas.filter((m) => m.tipo === 'ANULACION').reduce((a, m) => a + m.monto, 0);
    const devoluciones = listaMetricas.filter((m) => m.tipo === 'DEVOLUCION').reduce((a, m) => a + m.monto, 0);
    const balanceNetoPeriodo = entradas - salidas - anulaciones - devoluciones;

    // Solo sumamos base inicial si no hay filtros específicos de entidad/fecha o si es el turno actual
    const baseAplicable = !hasActiveFilters || filtroTurno === 'turno' ? caja.montoBase : 0;
    const saldoTotal = baseAplicable + balanceNetoPeriodo;

    // Desglose por método de pago para ventas e ingresos
    const totalEfectivo = listaMetricas
      .filter((m) => m.tipo === 'ENTRADA' && (!m.metodoPago || m.metodoPago.toLowerCase().includes('efectivo')))
      .reduce((a, m) => a + m.monto, 0);

    const totalBancos = listaMetricas
      .filter(
        (m) =>
          m.tipo === 'ENTRADA' &&
          m.metodoPago &&
          (m.metodoPago.toLowerCase().includes('nequi') ||
            m.metodoPago.toLowerCase().includes('bancolombia') ||
            m.metodoPago.toLowerCase().includes('daviplata') ||
            m.metodoPago.toLowerCase().includes('transferencia') ||
            m.metodoPago.toLowerCase().includes('pse'))
      )
      .reduce((a, m) => a + m.monto, 0);

    const totalOtros = entradas - totalEfectivo - totalBancos;

    return {
      entradas,
      salidas,
      anulaciones,
      devoluciones,
      balanceNetoPeriodo,
      baseAplicable,
      saldoTotal,
      totalVentasSistema: ventasSistema.reduce((a, m) => a + m.monto, 0),
      countVentasSistema: ventasSistema.length,
      totalEfectivo,
      totalBancos,
      totalOtros,
    };
  }, [movimientosFiltrados, caja.montoBase, hasActiveFilters, filtroTurno]);

  const handleFiltrarDia = (fechaKey: string) => {
    setFechaDesde(fechaKey);
    setFechaHasta(fechaKey);
    setFiltroFechaPreset('personalizado');
    setActiveTab('transacciones');
  };

  const handleAbrirCaja = () => {
    const base = parseFloat(montoBase.replace(/[^0-9.]/g, ''));
    if (!base || base < 0) {
      setErrorMsg('El monto base debe ser mayor a 0.');
      return;
    }
    const nuevoEstado: EstadoCaja = {
      abierta: true,
      montoBase: base,
      apertura: new Date().toISOString(),
      operador: currentUser?.nombre || 'Administrador',
      movimientos: [],
    };
    setCaja(nuevoEstado);
    guardarEstado(nuevoEstado);
    setShowAperturaModal(false);
    setMontoBase('');
    setErrorMsg('');
    setFeedbackMsg(`Caja abierta con base de ${formatCOP(base)}.`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleCerrarCaja = () => {
    const nuevoEstado: EstadoCaja = {
      ...caja,
      abierta: false,
      cierre: new Date().toISOString(),
    };
    setCaja(nuevoEstado);
    guardarEstado(nuevoEstado);
    setShowCierreModal(false);
    setFeedbackMsg(`Caja cerrada. Saldo final arqueado: ${formatCOP(metricas.saldoTotal)}.`);
    setTimeout(() => setFeedbackMsg(''), 5000);
  };

  const handleRegistrarMovimiento = () => {
    const monto = parseFloat(movForm.monto.replace(/[^0-9.]/g, ''));
    if (!monto || monto <= 0) {
      setErrorMsg('El monto debe ser mayor a 0.');
      return;
    }
    if (!movForm.concepto.trim()) {
      setErrorMsg('El concepto es obligatorio.');
      return;
    }
    const mov: CajaMovimiento = {
      id: `mov-${Date.now()}`,
      tipo: movForm.tipo,
      concepto: movForm.concepto.trim(),
      monto,
      operador: currentUser?.nombre || 'Operador',
      vendedor: currentUser?.nombre || 'Operador',
      timestamp: new Date().toISOString(),
      requiereSupervision: false,
      metodoPago: movForm.metodoPago,
      plataforma: movForm.plataforma || 'General / Caja',
      observaciones: movForm.observaciones.trim() || undefined,
      esVentaSistema: false,
    };
    const nuevoEstado = { ...caja, movimientos: [...caja.movimientos, mov] };
    setCaja(nuevoEstado);
    guardarEstado(nuevoEstado);
    setShowMovimientoModal(false);
    setMovForm({
      tipo: 'ENTRADA',
      concepto: '',
      monto: '',
      observaciones: '',
      metodoPago: 'Efectivo',
      plataforma: '',
    });
    setErrorMsg('');
    setFeedbackMsg(`Movimiento manual registrado: ${mov.tipo === 'ENTRADA' ? '+' : '-'}${formatCOP(monto)}.`);
    setTimeout(() => setFeedbackMsg(''), 3000);
  };

  const handleRegistrarSupervision = () => {
    if (supervForm.pin !== SUPERVISOR_PIN) {
      setErrorMsg('PIN de supervisor incorrecto.');
      return;
    }
    const monto = parseFloat(supervForm.monto.replace(/[^0-9.]/g, ''));
    if (!monto || monto <= 0 || !supervForm.concepto.trim()) {
      setErrorMsg('Complete todos los campos requeridos.');
      return;
    }
    const mov: CajaMovimiento = {
      id: `sup-${Date.now()}`,
      tipo: supervForm.tipo,
      concepto: supervForm.concepto.trim(),
      monto,
      operador: currentUser?.nombre || 'Supervisor',
      vendedor: currentUser?.nombre || 'Supervisor',
      timestamp: new Date().toISOString(),
      requiereSupervision: true,
      observaciones: supervForm.observaciones.trim() || undefined,
      esVentaSistema: false,
    };
    const nuevoEstado = { ...caja, movimientos: [...caja.movimientos, mov] };
    setCaja(nuevoEstado);
    guardarEstado(nuevoEstado);
    setShowSupervisionModal(null);
    setSupervForm({
      pin: '',
      concepto: '',
      monto: '',
      observaciones: '',
      tipo: 'ANULACION',
    });
    setErrorMsg('');
    setFeedbackMsg(`${mov.tipo} registrada por Supervisor: -${formatCOP(monto)}.`);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  // Exportar arqueo financiero a CSV
  const handleExportCSV = () => {
    if (activeTab === 'arqueo_diario') {
      const columns: ColumnDef[] = [
        { key: 'fechaLabel', label: 'Fecha' },
        { key: 'diaSemana', label: 'Día' },
        { key: 'transacciones', label: 'Transacciones' },
        { key: 'ventasCount', label: 'N° Ventas' },
        { key: 'entradas', label: 'Entradas (+)', format: (v) => formatCOP(v) },
        { key: 'salidas', label: 'Salidas (-)', format: (v) => formatCOP(v) },
        { key: 'devoluciones', label: 'Devoluciones (-)', format: (v) => formatCOP(v) },
        { key: 'balanceNeto', label: 'Balance Neto (=)', format: (v) => formatCOP(v) },
        {
          key: 'plataformas',
          label: 'Plataformas',
          format: (v: string[]) => (v?.length ? v.join(' | ') : 'General'),
        },
      ];
      exportToCSV(`arqueo_diario_caja`, columns, arqueoPorDias);
    } else {
      const columns: ColumnDef[] = [
        {
          key: 'timestamp',
          label: 'Fecha y Hora',
          format: (v) => new Date(v).toLocaleString('es-CO'),
        },
        { key: 'tipo', label: 'Tipo' },
        { key: 'concepto', label: 'Concepto' },
        { key: 'plataforma', label: 'Plataforma', format: (v) => v || 'General' },
        { key: 'metodoPago', label: 'Método de Pago', format: (v) => v || 'Efectivo' },
        { key: 'monto', label: 'Monto', format: (v, row) => `${row.tipo === 'ENTRADA' ? '+' : '-'}${formatCOP(v)}` },
        { key: 'operador', label: 'Operador / Vendedor' },
        { key: 'observaciones', label: 'Observaciones', format: (v) => v || '' },
      ];
      exportToCSV(`movimientos_caja`, columns, movimientosFiltrados);
    }
  };

  // Imprimir reporte contable
  const handlePrint = () => {
    const subtitle = `Filtros: ${
      fechaDesde || fechaHasta
        ? `Desde ${fechaDesde || 'Inicio'} hasta ${fechaHasta || 'Hoy'}`
        : filtroFechaPreset.toUpperCase()
    } | Plataforma: ${filtroPlataforma || 'Todas'} | Método: ${filtroMetodoPago || 'Todos'} | Vendedor: ${filtroVendedor || 'Todos'}`;

    if (activeTab === 'arqueo_diario') {
      triggerPrintReport({
        title: 'Reporte de Arqueo Financiero Diario',
        subtitle,
        summaryCards: [
          { label: 'Días Arqueados', value: arqueoPorDias.length },
          { label: 'Entradas Totales', value: formatCOP(metricas.entradas) },
          { label: 'Gastos / Salidas', value: formatCOP(metricas.salidas) },
          { label: 'Devoluciones', value: formatCOP(metricas.devoluciones + metricas.anulaciones) },
          { label: 'Balance Neto Período', value: formatCOP(metricas.balanceNetoPeriodo) },
        ],
        columns: [
          { key: 'fechaLabel', label: 'Fecha' },
          { key: 'diaSemana', label: 'Día' },
          { key: 'transacciones', label: 'Operaciones' },
          { key: 'entradas', label: 'Entradas (+)', format: (v) => formatCOP(v) },
          { key: 'salidas', label: 'Salidas (-)', format: (v) => formatCOP(v) },
          { key: 'devoluciones', label: 'Devoluciones (-)', format: (v) => formatCOP(v) },
          { key: 'balanceNeto', label: 'Balance Neto', format: (v) => formatCOP(v) },
        ],
        rows: arqueoPorDias,
        footerNotes: 'Reporte generado automáticamente desde el Sistema de Control Financiero y Caja.',
      });
    } else {
      triggerPrintReport({
        title: 'Reporte Detallado de Movimientos de Caja',
        subtitle,
        summaryCards: [
          { label: 'Total Transacciones', value: movimientosFiltrados.length },
          { label: 'Entradas Totales', value: formatCOP(metricas.entradas) },
          { label: 'Salidas / Gastos', value: formatCOP(metricas.salidas) },
          { label: 'Balance Neto', value: formatCOP(metricas.balanceNetoPeriodo) },
        ],
        columns: [
          {
            key: 'timestamp',
            label: 'Fecha',
            format: (v) => new Date(v).toLocaleString('es-CO'),
          },
          { key: 'tipo', label: 'Tipo' },
          { key: 'concepto', label: 'Concepto' },
          { key: 'plataforma', label: 'Plataforma', format: (v) => v || 'General' },
          { key: 'metodoPago', label: 'Método Pago', format: (v) => v || 'Efectivo' },
          { key: 'monto', label: 'Monto', format: (v, r) => `${r.tipo === 'ENTRADA' ? '+' : '-'}${formatCOP(v)}` },
          { key: 'operador', label: 'Vendedor / Operador' },
        ],
        rows: movimientosFiltrados,
      });
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabecera Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-emerald-400" />
            <span>Módulo de Caja y Arqueo Financiero</span>
            {caja.abierta ? (
              <span className="text-xs bg-emerald-950/70 text-emerald-400 font-semibold px-2.5 py-0.5 rounded-full border border-emerald-900/50 flex items-center gap-1.5 shadow-sm shadow-emerald-950/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Caja Abierta
              </span>
            ) : (
              <span className="text-xs bg-red-950/70 text-red-400 font-semibold px-2.5 py-0.5 rounded-full border border-red-900/50 shadow-sm shadow-red-950/40">
                Caja Cerrada
              </span>
            )}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Control de apertura, cierre, arqueo por días, movimientos y registro financiero por plataforma, método de pago y vendedor.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botones de Exportar e Imprimir */}
          <button
            onClick={fetchOrders}
            disabled={loadingOrders}
            data-tooltip="Sincronizar Ventas"
            className="p-2 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-purple-400 ${loadingOrders ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold text-gray-200 rounded-xl transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-sky-400" />
            <span>Imprimir</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-xs font-semibold text-white rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          {!caja.abierta ? (
            <button
              onClick={() => setShowAperturaModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Abrir Caja</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowMovimientoModal(true)}
                className="flex items-center gap-2 px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-gray-200 text-xs font-semibold rounded-xl border border-gray-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Movimiento</span>
              </button>

              {isSupervisor && (
                <button
                  onClick={() => setShowSupervisionModal({ tipo: 'ANULACION' })}
                  className="flex items-center gap-2 px-3.5 py-2 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 text-xs font-semibold rounded-xl border border-amber-800/50 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Anulación</span>
                </button>
              )}

              <button
                onClick={() => setShowCierreModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-red-900/30 transition-all cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Cerrar y Arquear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-auto cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Info Turno Abierto Actual */}
      {caja.abierta && caja.apertura && (
        <div className="p-3.5 bg-emerald-950/20 border border-emerald-800/40 rounded-2xl text-xs text-emerald-300 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Unlock className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Abierta: <strong>{new Date(caja.apertura).toLocaleString('es-CO')}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Base inicial: <strong>{formatCOP(caja.montoBase)}</strong>
              </span>
            </div>
            {caja.operador && (
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Operador: <strong>{caja.operador}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-gray-800">
            <button
              onClick={() => setFiltroTurno('turno')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtroTurno === 'turno' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Turno Actual
            </button>
            <button
              onClick={() => setFiltroTurno('todos')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filtroTurno === 'todos' ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Histórico Total
            </button>
          </div>
        </div>
      )}

      {/* Tarjetas Principales de Métricas Financieras (Reactivas a los filtros aplicados) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Saldo / Balance Neto */}
        <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl relative overflow-hidden">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
            {hasActiveFilters ? 'Balance Filtrado' : 'Saldo Total Caja'}
          </div>
          <div
            className={`text-2xl font-black mt-1 ${
              metricas.balanceNetoPeriodo >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {formatCOP(hasActiveFilters ? metricas.balanceNetoPeriodo : metricas.saldoTotal)}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5 truncate">
            {hasActiveFilters ? 'Entradas - Egresos del período' : 'Base + Ventas - Egresos'}
          </div>
        </div>

        {/* Ventas del Sistema */}
        <div className="p-4 bg-purple-950/30 border border-purple-800/40 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider flex items-center justify-between">
            <span>Ventas Sistema</span>
            <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-purple-300 mt-1">
            {formatCOP(metricas.totalVentasSistema)}
          </div>
          <div className="text-[10px] text-purple-400/80 mt-0.5 font-medium">
            {metricas.countVentasSistema} órdenes facturadas
          </div>
        </div>

        {/* Entradas Totales */}
        <div className="p-4 bg-gray-950/60 border border-emerald-900/40 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-between">
            <span>Entradas Totales</span>
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{formatCOP(metricas.entradas)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Ventas + Aportes</div>
        </div>

        {/* Salidas / Gastos */}
        <div className="p-4 bg-gray-950/60 border border-rose-900/40 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-rose-400 tracking-wider flex items-center justify-between">
            <span>Salidas / Gastos</span>
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
          </div>
          <div className="text-xl font-bold text-rose-400 mt-1">{formatCOP(metricas.salidas)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Egresos registrados</div>
        </div>

        {/* Devoluciones y Anulaciones */}
        <div className="p-4 bg-gray-950/60 border border-amber-900/40 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center justify-between">
            <span>Devoluciones</span>
            <Archive className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1">
            {formatCOP(metricas.anulaciones + metricas.devoluciones)}
          </div>
          <div className="text-[10px] text-gray-500 mt-0.5">Reembolsos aplicados</div>
        </div>

        {/* Monto Base Inicial */}
        <div className="p-4 bg-gray-950/60 border border-gray-850 rounded-2xl">
          <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Monto Base</div>
          <div className="text-xl font-bold text-white mt-1">{formatCOP(caja.montoBase)}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Efectivo en caja</div>
        </div>
      </div>

      {/* Desglose por Medio de Pago */}
      <div className="bg-gray-950/60 border border-gray-850 rounded-2xl p-4">
        <div className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-emerald-400" />
          <span>Desglose de Ingresos por Medio de Pago ({hasActiveFilters ? 'Filtrado' : 'General'})</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-gray-900/70 border border-gray-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="text-gray-400 block text-[11px]">Efectivo Físico</span>
                <span className="font-bold text-white text-sm">{formatCOP(metricas.totalEfectivo)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-900/70 border border-gray-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-purple-400" />
              <div>
                <span className="text-gray-400 block text-[11px]">Bancos / Nequi / Transferencias</span>
                <span className="font-bold text-white text-sm">{formatCOP(metricas.totalBancos)}</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-900/70 border border-gray-800 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <CreditCard className="w-4 h-4 text-blue-400" />
              <div>
                <span className="text-gray-400 block text-[11px]">Otros / En Línea</span>
                <span className="font-bold text-white text-sm">{formatCOP(metricas.totalOtros)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS: ARQUEO POR DÍAS, PLATAFORMA, MÉTODO DE PAGO Y VENDEDOR */}
      <div className="p-4 bg-gray-950/70 border border-gray-850 rounded-2xl space-y-3.5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>Filtros Financieros y Arqueo por Días</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-800 text-[10px] text-emerald-300 font-semibold lowercase">
                activos
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={limpiarFiltros}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 hover:bg-rose-950/70 border border-rose-900/50 rounded-lg transition-all cursor-pointer w-fit"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Limpiar Filtros</span>
            </button>
          )}
        </div>

        {/* Presets rápidos de Días */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-500 flex items-center gap-1 mr-1">
            <Calendar className="w-3 h-3" />
            Días:
          </span>
          {[
            { id: 'todos', label: 'Todos los Días' },
            { id: 'hoy', label: 'Hoy' },
            { id: 'ayer', label: 'Ayer' },
            { id: 'ultimos7', label: 'Últimos 7 días' },
            { id: 'ultimos30', label: 'Últimos 30 días' },
            { id: 'esteMes', label: 'Este Mes' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => aplicarPresetFecha(preset.id as any)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filtroFechaPreset === preset.id && !fechaDesde && !fechaHasta && preset.id === 'todos'
                  ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30'
                  : filtroFechaPreset === preset.id
                  ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30'
                  : 'bg-gray-900/90 text-gray-400 hover:text-white hover:bg-gray-800 border border-gray-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Selectores de Filtro: Rango de Fecha, Plataforma, Método de Pago, Vendedor */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* Selector Fecha Específica / Rango */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-gray-400 flex items-center gap-1">
              <CalendarDays className="w-3 h-3 text-emerald-400" />
              <span>Fecha Desde / Hasta</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => {
                  setFechaDesde(e.target.value);
                  setFiltroFechaPreset('personalizado');
                }}
                className="w-full px-2.5 py-1.5 bg-gray-900/90 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-emerald-500"
                title="Fecha Desde"
              />
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => {
                  setFechaHasta(e.target.value);
                  setFiltroFechaPreset('personalizado');
                }}
                className="w-full px-2.5 py-1.5 bg-gray-900/90 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-emerald-500"
                title="Fecha Hasta"
              />
            </div>
          </div>

          {/* Filtro Plataforma */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-gray-400 flex items-center gap-1">
              <Tv className="w-3 h-3 text-purple-400" />
              <span>Plataforma</span>
            </label>
            <select
              value={filtroPlataforma}
              onChange={(e) => setFiltroPlataforma(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-900/90 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value="">Todas las plataformas</option>
              {availablePlatforms.map((plat) => (
                <option key={plat} value={plat}>
                  {plat}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Método de Pago */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-gray-400 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-emerald-400" />
              <span>Método de Pago</span>
            </label>
            <select
              value={filtroMetodoPago}
              onChange={(e) => setFiltroMetodoPago(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-900/90 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="">Todos los métodos de pago</option>
              {availablePaymentMethods.map((mp) => (
                <option key={mp} value={mp}>
                  {mp}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro Vendedor / Origen */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-gray-400 flex items-center gap-1">
              <UserCheck className="w-3 h-3 text-blue-400" />
              <span>Vendedor / Origen</span>
            </label>
            <select
              value={filtroVendedor}
              onChange={(e) => setFiltroVendedor(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-900/90 border border-gray-800 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="">Todos los vendedores y orígenes</option>
              <option value="Venta Online">Venta Web / En Línea</option>
              {availableSellers
                .filter((s) => !s.toLowerCase().includes('web') && !s.toLowerCase().includes('online'))
                .map((vend) => (
                  <option key={vend} value={vend}>
                    {vend}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* PESTAÑAS: ARQUEO DIARIO VS MOVIMIENTOS DETALLADOS */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('arqueo_diario')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'arqueo_diario'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950/60'
                : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-850 border border-gray-800'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Arqueo por Días ({arqueoPorDias.length} días)</span>
          </button>

          <button
            onClick={() => setActiveTab('transacciones')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'transacciones'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-950/60'
                : 'bg-gray-900/80 text-gray-400 hover:text-white hover:bg-gray-850 border border-gray-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Transacciones Detalladas ({movimientosFiltrados.length})</span>
          </button>
        </div>

        {activeTab === 'transacciones' && (
          <div className="hidden sm:flex items-center gap-1">
            {(['TODOS', 'VENTAS', 'MANUALES', 'ENTRADAS', 'SALIDAS'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setFiltroTipo(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                  filtroTipo === cat
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-900 text-gray-400 hover:text-white hover:bg-gray-850'
                }`}
              >
                {cat === 'TODOS'
                  ? 'Todos'
                  : cat === 'VENTAS'
                  ? 'Ventas Sistema'
                  : cat === 'MANUALES'
                  ? 'Manuales'
                  : cat === 'ENTRADAS'
                  ? 'Entradas'
                  : 'Salidas'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* VISTA 1: TABLA DE ARQUEO CONSOLIDADO POR DÍAS */}
      {activeTab === 'arqueo_diario' && (
        <div className="bg-gray-950/60 border border-gray-850 rounded-2xl overflow-hidden shadow-xl space-y-3">
          <div className="p-4 border-b border-gray-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-emerald-400" />
                <span>Registro Financiero Diario y Cierres Arqueados</span>
              </h2>
              <span className="text-xs text-gray-400">
                Auditoría financiera consolidada día a día con balance neto, entradas, salidas y métodos de pago
              </span>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-900/40">
              Total {arqueoPorDias.length} días registrados
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-850 bg-gray-900/50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4">Fecha y Día</th>
                  <th className="py-3 px-4 text-center">N° Operaciones</th>
                  <th className="py-3 px-4">Ingresos / Ventas (+)</th>
                  <th className="py-3 px-4">Gastos / Salidas (-)</th>
                  <th className="py-3 px-4">Devoluciones (-)</th>
                  <th className="py-3 px-4">Balance Neto Día</th>
                  <th className="py-3 px-4">Métodos Utilizados</th>
                  <th className="py-3 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60">
                {arqueoPorDias.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      No hay registros de arqueo que coincidan con los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  paginatedArqueo.map((dia) => (
                    <tr key={dia.fechaKey} className="hover:bg-gray-900/40 transition-colors">
                      {/* Fecha y Día */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-white text-xs">{dia.fechaLabel}</div>
                        <div className="text-[11px] text-gray-400 capitalize">{dia.diaSemana}</div>
                      </td>

                      {/* Transacciones */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-900 border border-gray-800 text-[11px] text-gray-300 font-semibold">
                          {dia.transacciones} ops
                          {dia.ventasCount > 0 && (
                            <span className="text-purple-400">({dia.ventasCount} ventas)</span>
                          )}
                        </span>
                      </td>

                      {/* Ingresos / Ventas (+) */}
                      <td className="py-3.5 px-4 font-bold text-emerald-400 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          <span>+{formatCOP(dia.entradas)}</span>
                        </div>
                      </td>

                      {/* Gastos / Salidas (-) */}
                      <td className="py-3.5 px-4 font-bold text-rose-400 whitespace-nowrap">
                        {dia.salidas > 0 ? (
                          <div className="flex items-center gap-1">
                            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
                            <span>-{formatCOP(dia.salidas)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 font-normal">$0</span>
                        )}
                      </td>

                      {/* Devoluciones (-) */}
                      <td className="py-3.5 px-4 font-bold text-amber-400 whitespace-nowrap">
                        {dia.devoluciones > 0 ? (
                          <div className="flex items-center gap-1">
                            <Archive className="w-3.5 h-3.5 text-amber-400" />
                            <span>-{formatCOP(dia.devoluciones)}</span>
                          </div>
                        ) : (
                          <span className="text-gray-500 font-normal">$0</span>
                        )}
                      </td>

                      {/* Balance Neto del Día */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                            dia.balanceNeto >= 0
                              ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                              : 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                          }`}
                        >
                          {dia.balanceNeto >= 0 ? '+' : ''}
                          {formatCOP(dia.balanceNeto)}
                        </span>
                      </td>

                      {/* Métodos de Pago */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {Object.entries(dia.metodosPago).map(([mp, monto]) => (
                            <span
                              key={mp}
                              className="text-[10px] bg-gray-900 border border-gray-800 text-gray-300 px-1.5 py-0.5 rounded"
                              title={`${mp}: ${formatCOP(monto)}`}
                            >
                              {mp}: <strong className="text-white">{formatCOP(monto)}</strong>
                            </span>
                          ))}
                          {Object.keys(dia.metodosPago).length === 0 && (
                            <span className="text-[11px] text-gray-500">-</span>
                          )}
                        </div>
                      </td>

                      {/* Acción: Filtrar este día */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleFiltrarDia(dia.fechaKey)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 text-xs font-semibold text-emerald-400 rounded-lg transition-all cursor-pointer"
                          title={`Ver transacciones de ${dia.fechaLabel}`}
                        >
                          <span>Ver Día</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentArqueoPage}
            totalItems={arqueoPorDias.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentArqueoPage}
          />
        </div>
      )}

      {/* VISTA 2: TABLA DETALLADA DE MOVIMIENTOS Y VENTAS */}
      {activeTab === 'transacciones' && (
        <div className="bg-gray-950/60 border border-gray-850 rounded-2xl overflow-hidden shadow-xl space-y-3">
          <div className="p-4 border-b border-gray-850 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Registro Detallado de Movimientos y Ventas</span>
              </h2>
              <span className="text-xs text-gray-400">
                {movimientosFiltrados.length} transacciones registradas con los filtros actuales
              </span>
            </div>

            {/* Subfiltro de Tipo para móviles */}
            <div className="flex sm:hidden items-center gap-1 flex-wrap">
              {(['TODOS', 'VENTAS', 'MANUALES', 'ENTRADAS', 'SALIDAS'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFiltroTipo(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    filtroTipo === cat ? 'bg-purple-600 text-white' : 'bg-gray-900 text-gray-400'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-850 bg-gray-900/50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3 px-4">Fecha y Hora</th>
                  <th className="py-3 px-4">Origen / Tipo</th>
                  <th className="py-3 px-4">Concepto / Venta</th>
                  <th className="py-3 px-4">Plataforma</th>
                  <th className="py-3 px-4">Método de Pago</th>
                  <th className="py-3 px-4">Monto</th>
                  <th className="py-3 px-4">Vendedor / Operador</th>
                  <th className="py-3 px-4">Observaciones / Cliente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60">
                {movimientosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      No hay movimientos que coincidan con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  paginatedMovimientos.map((mov) => (
                    <tr key={mov.id} className="hover:bg-gray-900/40 transition-colors">
                      {/* FECHA */}
                      <td className="py-3 px-4 text-gray-400 whitespace-nowrap font-mono text-[11px]">
                        {new Date(mov.timestamp).toLocaleString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* ORIGEN / TIPO */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              mov.tipo === 'ENTRADA'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/40'
                                : mov.tipo === 'SALIDA'
                                ? 'bg-rose-950/60 text-rose-400 border-rose-800/40'
                                : mov.tipo === 'ANULACION'
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/40'
                                : 'bg-purple-950/60 text-purple-400 border-purple-800/40'
                            }`}
                          >
                            {mov.requiereSupervision && <ShieldCheck className="w-2.5 h-2.5" />}
                            {mov.tipo}
                          </span>

                          {mov.esVentaSistema && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-950/80 border border-purple-800/50 text-purple-300 text-[10px] font-semibold">
                              <ShoppingBag className="w-2.5 h-2.5" />
                              Venta
                            </span>
                          )}
                        </div>
                      </td>

                      {/* CONCEPTO / VENTA */}
                      <td className="py-3 px-4 text-white font-medium">
                        <div className="space-y-0.5">
                          <p className="text-white">{mov.concepto}</p>
                          {mov.orderId && (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-purple-300 text-[10px] bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-900/40">
                                #ORD-{mov.orderId.substring(0, 8).toUpperCase()}
                              </span>
                              <button
                                onClick={() => handleCopy(mov.orderId!, `copy-${mov.id}`)}
                                data-tooltip="Copiar ID"
                                className="text-gray-400 hover:text-white p-0.5 cursor-pointer"
                              >
                                {copiedKey === `copy-${mov.id}` ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* PLATAFORMA */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {mov.plataforma ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-900 border border-gray-800 text-[11px] text-gray-300">
                            <Tv className="w-3 h-3 text-purple-400" />
                            <span>{mov.plataforma}</span>
                          </span>
                        ) : (
                          <span className="text-gray-500 text-[11px]">-</span>
                        )}
                      </td>

                      {/* MÉTODO DE PAGO */}
                      <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                        <span className="bg-gray-900 border border-gray-800 px-2 py-0.5 rounded text-[11px]">
                          {mov.metodoPago || 'Efectivo'}
                        </span>
                      </td>

                      {/* MONTO */}
                      <td
                        className={`py-3 px-4 font-bold whitespace-nowrap text-sm ${
                          mov.tipo === 'ENTRADA' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {mov.tipo === 'ENTRADA' ? '+' : '-'}
                        {formatCOP(mov.monto)}
                      </td>

                      {/* OPERADOR / VENDEDOR */}
                      <td className="py-3 px-4 text-gray-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <UserCheck className="w-3 h-3 text-blue-400" />
                          <span>{mov.vendedor || mov.operador}</span>
                        </div>
                      </td>

                      {/* OBSERVACIONES */}
                      <td className="py-3 px-4 text-gray-400 text-[11px] max-w-xs truncate">
                        {mov.observaciones || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={movimientosFiltrados.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* MODAL: APERTURA */}
      {showAperturaModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-emerald-900/60 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 shrink-0 bg-gray-950/95">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Unlock className="w-4 h-4 text-emerald-400" />
                Apertura de Caja
              </h2>
              <button
                onClick={() => setShowAperturaModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <p className="text-xs text-gray-400">
                Ingresa el monto base en efectivo con el que inicia la jornada. Las ventas del sistema se sumarán
                automáticamente a este saldo.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">Monto Base Inicial (COP)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={montoBase}
                    onChange={(e) => setMontoBase(e.target.value)}
                    placeholder="Ej. 50000"
                    className="w-full pl-9 pr-3 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-850 shrink-0 bg-gray-950/95">
              <button
                onClick={() => {
                  setShowAperturaModal(false);
                  setErrorMsg('');
                }}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleAbrirCaja}
                className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                Abrir Caja
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CIERRE Y ARQUEO */}
      {showCierreModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-rose-900/60 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 shrink-0 bg-gray-950/95">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Archive className="w-4 h-4 text-rose-400" />
                Cierre y Arqueo de Caja
              </h2>
              <button
                onClick={() => setShowCierreModal(false)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-2 p-4 bg-gray-900/60 border border-gray-800 rounded-xl text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">Monto Base Inicial:</span>
                  <span className="text-white font-bold">{formatCOP(caja.montoBase)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Ventas Sistema ({metricas.countVentasSistema}):</span>
                  <span className="text-purple-300 font-bold">+{formatCOP(metricas.totalVentasSistema)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-400">+ Total Entradas:</span>
                  <span className="text-emerald-400 font-bold">+{formatCOP(metricas.entradas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-400">- Total Salidas:</span>
                  <span className="text-rose-400 font-bold">-{formatCOP(metricas.salidas)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-amber-400">- Devoluciones / Anulaciones:</span>
                  <span className="text-amber-400 font-bold">
                    -{formatCOP(metricas.anulaciones + metricas.devoluciones)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-800">
                  <span className="text-white font-bold">SALDO FINAL ESPERADO:</span>
                  <span
                    className={`text-xl font-black ${
                      metricas.saldoTotal >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {formatCOP(metricas.saldoTotal)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 p-3 rounded-xl">
                Al cerrar la caja se registra el arqueo final. Las ventas del sistema continuarán guardadas en la base de datos.
              </p>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-850 shrink-0 bg-gray-950/95">
              <button
                onClick={() => setShowCierreModal(false)}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCerrarCaja}
                className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                Confirmar Cierre
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MOVIMIENTO MANUAL */}
      {showMovimientoModal && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 shrink-0 bg-gray-950/95">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-sky-400" />
                Registrar Movimiento de Caja
              </h2>
              <button
                onClick={() => {
                  setShowMovimientoModal(false);
                  setErrorMsg('');
                }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Tipo de Movimiento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setMovForm({ ...movForm, tipo: 'ENTRADA' })}
                      className={`py-2 rounded-xl font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        movForm.tipo === 'ENTRADA'
                          ? 'bg-emerald-600 text-white border-emerald-500'
                          : 'bg-gray-900 text-gray-400 border-gray-800'
                      }`}
                    >
                      <TrendingUp className="w-3.5 h-3.5" />
                      Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => setMovForm({ ...movForm, tipo: 'SALIDA' })}
                      className={`py-2 rounded-xl font-semibold border flex items-center justify-center gap-1.5 cursor-pointer ${
                        movForm.tipo === 'SALIDA'
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-gray-900 text-gray-400 border-gray-800'
                      }`}
                    >
                      <TrendingDown className="w-3.5 h-3.5" />
                      Salida / Gasto
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Concepto *</label>
                  <input
                    type="text"
                    value={movForm.concepto}
                    onChange={(e) => setMovForm({ ...movForm, concepto: e.target.value })}
                    placeholder={
                      movForm.tipo === 'ENTRADA'
                        ? 'Ej. Ingreso extra, aporte de caja...'
                        : 'Ej. Pago proveedor, insumos, retiro...'
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-sky-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Monto (COP) *</label>
                    <div className="relative">
                      <DollarSign className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={movForm.monto}
                        onChange={(e) => setMovForm({ ...movForm, monto: e.target.value })}
                        placeholder="Ej. 20000"
                        className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-sky-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-gray-300 font-semibold mb-1">Plataforma (opcional)</label>
                    <select
                      value={movForm.plataforma}
                      onChange={(e) => setMovForm({ ...movForm, plataforma: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-sky-600 cursor-pointer"
                    >
                      <option value="">General / Caja</option>
                      {availablePlatforms.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Método de Pago</label>
                  <select
                    value={movForm.metodoPago}
                    onChange={(e) => setMovForm({ ...movForm, metodoPago: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-sky-600 cursor-pointer"
                  >
                    <option value="Efectivo">Efectivo Físico</option>
                    <option value="Nequi">Nequi</option>
                    <option value="Bancolombia">Bancolombia</option>
                    <option value="Daviplata">Daviplata</option>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Observaciones (opcional)</label>
                  <textarea
                    rows={2}
                    value={movForm.observaciones}
                    onChange={(e) => setMovForm({ ...movForm, observaciones: e.target.value })}
                    placeholder="Detalles adicionales..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-sky-600 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-850 shrink-0 bg-gray-950/95">
              <button
                onClick={() => {
                  setShowMovimientoModal(false);
                  setErrorMsg('');
                }}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarMovimiento}
                className={`flex items-center gap-2 px-5 py-2 font-bold text-xs text-white rounded-xl cursor-pointer ${
                  movForm.tipo === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                }`}
              >
                {movForm.tipo === 'ENTRADA' ? <Plus className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                Registrar {movForm.tipo === 'ENTRADA' ? 'Ingreso' : 'Salida'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SUPERVISIÓN (ANULACIÓN / DEVOLUCIÓN) */}
      {showSupervisionModal && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-950 border border-amber-900/60 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-850 shrink-0 bg-gray-950/95">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Operación Supervisada
              </h2>
              <button
                onClick={() => {
                  setShowSupervisionModal(null);
                  setErrorMsg('');
                }}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Esta operación requiere PIN de supervisor. Solo administradores y supervisores pueden realizarla.
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Tipo de Operación</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['ANULACION', 'DEVOLUCION'] as const).map((tipo) => (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => setSupervForm({ ...supervForm, tipo })}
                        className={`py-2 rounded-xl font-semibold border cursor-pointer ${
                          supervForm.tipo === tipo
                            ? 'bg-amber-600 text-white border-amber-500'
                            : 'bg-gray-900 text-gray-400 border-gray-800'
                        }`}
                      >
                        {tipo === 'ANULACION' ? 'Anulación' : 'Devolución'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">PIN de Supervisor *</label>
                  <input
                    type="password"
                    value={supervForm.pin}
                    onChange={(e) => setSupervForm({ ...supervForm, pin: e.target.value })}
                    placeholder="PIN de supervisor"
                    maxLength={8}
                    className="w-full px-3 py-2 bg-gray-900 border border-amber-800/60 rounded-xl text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Motivo / Concepto *</label>
                  <input
                    type="text"
                    value={supervForm.concepto}
                    onChange={(e) => setSupervForm({ ...supervForm, concepto: e.target.value })}
                    placeholder="Ej. Error en cobro, pago duplicado..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Monto (COP) *</label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={supervForm.monto}
                      onChange={(e) => setSupervForm({ ...supervForm, monto: e.target.value })}
                      placeholder="Ej. 15000"
                      className="w-full pl-8 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 font-semibold mb-1">Observaciones</label>
                  <textarea
                    rows={2}
                    value={supervForm.observaciones}
                    onChange={(e) => setSupervForm({ ...supervForm, observaciones: e.target.value })}
                    placeholder="Detalles adicionales..."
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-white focus:outline-none focus:border-amber-600 resize-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-gray-850 shrink-0 bg-gray-950/95">
              <button
                onClick={() => {
                  setShowSupervisionModal(null);
                  setErrorMsg('');
                }}
                className="px-4 py-2 rounded-xl border border-gray-800 text-gray-400 hover:text-white text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleRegistrarSupervision}
                className="flex items-center gap-2 px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                Autorizar y Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}