'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import TablePagination from '@/components/TablePagination';
import {
  Headset,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  RefreshCw,
  Loader2,
  Phone,
  User,
  ShieldCheck,
  Package,
  Layers,
  Eye,
  ExternalLink,
  X,
  Sparkles,
  Copy,
  Check,
  Search,
} from 'lucide-react';
import { useDialog } from '@/components/Dialog';

export default function WarrantyPage() {
  const { alert } = useDialog();
  const [tickets, setTickets] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'tickets' | 'batches'>('tickets');
  const [searchTicket, setSearchTicket] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [accStatusLoading, setAccStatusLoading] = useState<string | null>(null);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleUpdateAccountStatus = async (accountId: string, newStatus: string) => {
    try {
      setAccStatusLoading(accountId);
      await api.patch(`/accounts/${accountId}`, { estado: newStatus });
      setTickets((prev) =>
        prev.map((t) => {
          if (t.subscription?.account?.id === accountId) {
            return {
              ...t,
              subscription: {
                ...t.subscription,
                account: {
                  ...t.subscription.account,
                  estado: newStatus,
                },
              },
            };
          }
          return t;
        })
      );
      if (viewingTicket?.subscription?.account?.id === accountId) {
        setViewingTicket((prev: any) => ({
          ...prev,
          subscription: {
            ...prev.subscription,
            account: {
              ...prev.subscription.account,
              estado: newStatus,
            },
          },
        }));
      }
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al actualizar el estado de la cuenta', { type: 'error', title: 'Error de Actualización' });
    } finally {
      setAccStatusLoading(null);
    }
  };

  // Modales
  const [viewingTicket, setViewingTicket] = useState<any | null>(null);
  const [resolveModal, setResolveModal] = useState<{
    ticket: any;
    decision: 'aprobado_reemplazo' | 'rechazado';
    notas: string;
  } | null>(null);
  const [quarantineModal, setQuarantineModal] = useState<{
    batch: any;
    razon: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tRes, bRes, sRes] = await Promise.all([
        api.get('/warranty/tickets'),
        api.get('/warranty/batches'),
        api.get('/warranty/tickets/stats'),
      ]);
      setTickets(tRes.data);
      setBatches(bRes.data);
      setStats(sRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const confirmResolveTicket = async () => {
    if (!resolveModal) return;
    const { ticket, decision, notas } = resolveModal;

    if (decision === 'rechazado' && !notas.trim()) {
      await alert('Debes indicar un motivo para rechazar la garantía.', { type: 'warning', title: 'Motivo requerido' });
      return;
    }

    try {
      setResolvingId(ticket.id);
      const res = await api.post('/warranty/tickets/resolve', {
        ticketId: ticket.id,
        decision,
        motivoRechazo: notas.trim() || undefined,
      });
      await alert(res.data?.message || 'Ticket resuelto con éxito', { type: 'success', title: 'Ticket Resuelto' });
      setResolveModal(null);
      if (viewingTicket?.id === ticket.id) {
        setViewingTicket(null);
      }
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al resolver el ticket', { type: 'error', title: 'Error al Resolver' });
    } finally {
      setResolvingId(null);
    }
  };

  const handleAssignAccount = async (ticketId: string) => {
    try {
      setAssigningId(ticketId);
      const res = await api.post(`/warranty/tickets/${ticketId}/assign-account`);
      if (res.data?.exito) {
        await alert(res.data.mensaje || '¡Cuenta asignada y enviada al cliente por WhatsApp con éxito!', { type: 'success', title: 'Cuenta Asignada' });
        if (viewingTicket?.id === ticketId) {
          setViewingTicket(null);
        }
        await fetchData();
      } else {
        await alert(res.data?.mensaje || 'Aún no hay cuentas disponibles en inventario para este plan. Permanece en cola prioritaria.', { type: 'warning', title: 'Sin Stock Disponible' });
        await fetchData();
      }
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al intentar asignar la nueva cuenta', { type: 'error', title: 'Error de Asignación' });
    } finally {
      setAssigningId(null);
    }
  };

  const confirmQuarantine = async () => {
    if (!quarantineModal) return;
    const { batch, razon } = quarantineModal;
    if (!razon.trim()) {
      await alert('Indica la razón de cuarentena', { type: 'warning', title: 'Razón requerida' });
      return;
    }

    try {
      await api.post('/warranty/batches/quarantine', { batchId: batch.id, razon });
      await alert('Lote puesto en cuarentena con éxito', { type: 'success', title: 'Cuarentena Activada' });
      setQuarantineModal(null);
      fetchData();
    } catch (err: any) {
      await alert(err.response?.data?.message || 'Error al poner en cuarentena', { type: 'error', title: 'Error de Cuarentena' });
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (!searchTicket.trim()) return true;
    const q = searchTicket.toLowerCase().trim();
    const cleanQ = q.replace(/^#acc-?/i, '');
    const accId = t.subscription?.account?.id?.toLowerCase() || '';
    const accEmail = t.subscription?.account?.emailCuenta?.toLowerCase() || '';
    const clientName = (t.cliente?.nombre || t.customer?.user?.nombre || '').toLowerCase();
    const clientEmail = (t.cliente?.email || t.customer?.user?.email || '').toLowerCase();
    const service = (t.servicio || t.subscription?.plan?.service?.nombre || '').toLowerCase();
    const plan = (t.plan || t.subscription?.plan?.nombrePlan || '').toLowerCase();
    const motivo = (t.motivoReporte || t.motivo || '').toLowerCase();

    return (
      accId.includes(cleanQ) ||
      accEmail.includes(q) ||
      clientName.includes(q) ||
      clientEmail.includes(q) ||
      service.includes(q) ||
      plan.includes(q) ||
      motivo.includes(q) ||
      t.id.toLowerCase().includes(q)
    );
  });

  // Paginación de 10 filas por vista
  const [currentPage, setCurrentPage] = useState(1);
  const [currentBatchPage, setCurrentBatchPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTicket]);

  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTickets.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTickets, currentPage]);

  const paginatedBatches = useMemo(() => {
    const start = (currentBatchPage - 1) * ITEMS_PER_PAGE;
    return batches.slice(start, start + ITEMS_PER_PAGE);
  }, [batches, currentBatchPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Headset className="w-6 h-6 text-red-500" />
            <span>Mesa de Soporte y Garantías</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Gestión de incidencias de clientes, reemplazo automático de cuentas y control de calidad
          </p>
        </div>

        <button
          onClick={fetchData}
          className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-gray-900 hover:bg-gray-850 text-xs font-semibold text-gray-300 rounded-xl border border-gray-800 transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'tickets'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          Tickets de Clientes ({tickets.filter((t) => t.estado === 'pendiente_revision' || t.estado === 'pendiente_stock').length} pendientes)
        </button>
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'batches'
              ? 'bg-red-600 text-white shadow-lg shadow-red-600/20'
              : 'text-gray-400 hover:text-white hover:bg-gray-900'
          }`}
        >
          Control de Calidad de Lotes ({batches.length})
        </button>
      </div>

      {/* TAB: TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchTicket}
                onChange={(e) => setSearchTicket(e.target.value)}
                placeholder="Buscar por código #ACC-, cliente, email o servicio..."
                className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <p className="text-[11px] text-gray-500 font-mono">
              Mostrando {filteredTickets.length} de {tickets.length} tickets
            </p>
          </div>

          <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="px-5 py-3.5">Cliente</th>
                    <th className="px-5 py-3.5">Servicio Reportado</th>
                    <th className="px-5 py-3.5">Cuenta con Problema</th>
                    <th className="px-5 py-3.5">Motivo de Falla</th>
                    <th className="px-5 py-3.5">Estado</th>
                    <th className="px-5 py-3.5 text-right">Resolución</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-850/60">
                  {filteredTickets.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-gray-500">
                        {tickets.length === 0
                          ? '¡Excelente! No hay tickets de soporte o garantía pendientes.'
                          : 'No se encontraron tickets con los criterios de búsqueda especificados.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedTickets.map((ticket) => {
                      const isPending = ticket.estado === 'pendiente_revision';
                      const isWaitingStock = ticket.estado === 'pendiente_stock';
                      const acc = ticket.subscription?.account;

                      return (
                        <tr
                          key={ticket.id}
                          className="hover:bg-gray-800/40 transition group cursor-pointer"
                          onClick={() => setViewingTicket(ticket)}
                        >
                          <td className="px-5 py-4">
                            <p className="font-bold text-white text-xs">
                              {ticket.cliente?.nombre || ticket.customer?.user?.nombre || 'Cliente'}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {ticket.cliente?.email || ticket.customer?.user?.email}
                            </p>
                            {(ticket.cliente?.telefono || ticket.customer?.whatsapp || ticket.cliente?.whatsapp) && (
                              <a
                                href={`https://wa.me/${(ticket.cliente?.telefono || ticket.customer?.whatsapp || ticket.cliente?.whatsapp || '').replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-mono mt-0.5"
                              >
                                <Phone className="w-3 h-3 text-emerald-400" />
                                <span>{ticket.cliente?.telefono || ticket.customer?.whatsapp || ticket.cliente?.whatsapp}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-semibold text-white">
                              {ticket.servicio || ticket.subscription?.plan?.service?.nombre}
                            </p>
                            <p className="text-[11px] text-gray-400">
                              {ticket.plan || ticket.subscription?.plan?.nombrePlan}
                            </p>
                          </td>

                          {/* Cuenta con Problema */}
                          <td className="px-5 py-4">
                            {acc ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/60 inline-flex items-center gap-1">
                                    #ACC-{acc.id.substring(0, 8).toUpperCase()}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(`#ACC-${acc.id.substring(0, 8).toUpperCase()}`, `acc-table-${ticket.id}`);
                                    }}
                                    className="text-gray-400 hover:text-white p-0.5 transition-colors cursor-pointer"
                                    title="Copiar código de cuenta"
                                  >
                                    {copiedKey === `acc-table-${ticket.id}` ? (
                                      <Check className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                                <p className="text-gray-300 font-mono text-[11px] truncate max-w-[170px]" title={acc.emailCuenta}>
                                  {acc.emailCuenta}
                                </p>
                                <div className="flex items-center gap-1 pt-0.5">
                                  <select
                                    value={acc.estado}
                                    disabled={accStatusLoading === acc.id}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => handleUpdateAccountStatus(acc.id, e.target.value)}
                                    className={`text-[10px] font-bold rounded px-1.5 py-0.5 border cursor-pointer transition-colors ${
                                      acc.estado === 'DEFECTUOSA'
                                        ? 'bg-red-950/80 text-red-300 border-red-800/60'
                                        : acc.estado === 'BLOQUEADA'
                                        ? 'bg-amber-950/80 text-amber-300 border-amber-800/60'
                                        : acc.estado === 'OCUPADA'
                                        ? 'bg-blue-950/80 text-blue-300 border-blue-800/60'
                                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60'
                                    }`}
                                    title="Cambiar estado de la cuenta afectada"
                                  >
                                    <option value="DEFECTUOSA">DEFECTUOSA</option>
                                    <option value="BLOQUEADA">BLOQUEADA</option>
                                    <option value="OCUPADA">OCUPADA</option>
                                    <option value="DISPONIBLE">DISPONIBLE</option>
                                    <option value="VENCIDA">VENCIDA</option>
                                  </select>
                                  {accStatusLoading === acc.id && (
                                    <Loader2 className="w-3 h-3 animate-spin text-gray-400" />
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-500 italic text-[11px]">Sin cuenta asignada</span>
                            )}
                          </td>

                        <td className="px-5 py-4">
                          <div className="max-w-xs">
                            <p className="text-gray-200">{ticket.motivoReporte}</p>
                            <p className="text-[10px] text-gray-500 mt-0.5">
                              {new Date(ticket.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase ${
                              isPending
                                ? 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                                : isWaitingStock
                                ? 'bg-purple-950/80 text-purple-300 border-purple-800/60'
                                : ticket.estado === 'aprobado_reemplazo'
                                ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                                : 'bg-gray-800 text-gray-400 border-gray-700'
                            }`}
                          >
                            {isWaitingStock && (
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                            )}
                            <span>
                              {isPending
                                ? 'Pendiente Revisión'
                                : isWaitingStock
                                ? 'En Espera de Stock (Auto-Asignar)'
                                : ticket.estado === 'aprobado_reemplazo'
                                ? 'Aprobado y Reemplazado'
                                : ticket.estado === 'rechazado'
                                ? 'Rechazado'
                                : ticket.estado}
                            </span>
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingTicket(ticket)}
                              data-tooltip="Detalle"
                              className="px-2.5 py-1.5 bg-gray-950/80 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-400" />
                              <span>Detalle</span>
                            </button>

                            {isWaitingStock && (
                              <button
                                onClick={() => handleAssignAccount(ticket.id)}
                                disabled={assigningId === ticket.id}
                                data-tooltip="Asignar"
                                className={`px-3 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50 ${
                                  ticket.stockDisponible && ticket.stockDisponible > 0
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 ring-1 ring-emerald-400/50'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20'
                                }`}
                              >
                                {assigningId === ticket.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                )}
                                <span>Asignar Nueva Cuenta</span>
                                {typeof ticket.stockDisponible === 'number' && (
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                                      ticket.stockDisponible > 0
                                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                                        : 'bg-black/30 text-purple-200'
                                    }`}
                                  >
                                    {ticket.stockDisponible > 0 ? `Stock: ${ticket.stockDisponible}` : 'Stock: 0'}
                                  </span>
                                )}
                              </button>
                            )}

                            {isPending && (
                              <>
                                <button
                                  onClick={() =>
                                    setResolveModal({
                                      ticket,
                                      decision: 'aprobado_reemplazo',
                                      notas: '',
                                    })
                                  }
                                  disabled={resolvingId === ticket.id}
                                  data-tooltip="Reemplazar"
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                  Reemplazar
                                </button>
                                <button
                                  onClick={() =>
                                    setResolveModal({
                                      ticket,
                                      decision: 'rechazado',
                                      notas: '',
                                    })
                                  }
                                  disabled={resolvingId === ticket.id}
                                  data-tooltip="Rechazar"
                                  className="px-2.5 py-1.5 bg-gray-800 hover:bg-red-950/50 hover:text-red-300 text-gray-300 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
                                >
                                  Rechazar
                                </button>
                              </>
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

          {/* Paginador de tickets (10 filas) */}
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredTickets.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>
    )}

      {/* TAB: LOTES */}
      {activeTab === 'batches' && (
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl overflow-hidden backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950/80 border-b border-gray-800 text-gray-400 uppercase tracking-wider font-semibold text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Proveedor</th>
                  <th className="px-5 py-3.5">Cuentas Compradas</th>
                  <th className="px-5 py-3.5">Costo Total</th>
                  <th className="px-5 py-3.5">Tasa de Fallo</th>
                  <th className="px-5 py-3.5">Estado</th>
                  <th className="px-5 py-3.5 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-850/60">
                {paginatedBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-850/40 transition-colors">
                    <td className="px-5 py-4 font-semibold text-white">{b.proveedorNombre}</td>
                    <td className="px-5 py-4">{b.cantidadCuentas} cuentas</td>
                    <td className="px-5 py-4 font-mono">${Number(b.costoTotalLote).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <span className="font-bold text-emerald-400">{Number(b.tasaFalloActual)}%</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-gray-800 text-gray-300 uppercase">
                        {b.estadoLote}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {b.estadoLote !== 'cuarentena' && (
                        <button
                          onClick={() => setQuarantineModal({ batch: b, razon: '' })}
                          className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-900/50 rounded-xl text-xs cursor-pointer transition-colors"
                        >
                          Poner en Cuarentena
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginador de lotes (10 filas) */}
          <TablePagination
            currentPage={currentBatchPage}
            totalItems={batches.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentBatchPage}
          />
        </div>
      )}

      {/* MODAL: DETALLE COMPLETO DEL TICKET */}
      {viewingTicket && (
        <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-950/60 border border-blue-800/40 flex items-center justify-center text-blue-400">
                  <Headset className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Detalle de Garantía y Soporte</h3>
                  <p className="text-[11px] text-gray-400 font-mono">Ticket #{viewingTicket.id.substring(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setViewingTicket(null)}
                className="text-gray-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {/* Cliente */}
              <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5 space-y-2">
                <p className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">
                  Información del Cliente
                </p>
                <div>
                  <p className="text-white font-bold text-sm">
                    {viewingTicket.cliente?.nombre || viewingTicket.customer?.user?.nombre || 'Cliente'}
                  </p>
                  <p className="text-gray-400 text-[11px]">
                    {viewingTicket.cliente?.email || viewingTicket.customer?.user?.email}
                  </p>
                </div>
                {(viewingTicket.cliente?.telefono || viewingTicket.customer?.whatsapp || viewingTicket.cliente?.whatsapp) && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-gray-300 text-[11px] font-mono flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                      <span>Teléfono: <strong className="text-white">{viewingTicket.cliente?.telefono || viewingTicket.customer?.whatsapp || viewingTicket.cliente?.whatsapp}</strong></span>
                    </p>
                    <a
                      href={`https://wa.me/${(viewingTicket.cliente?.telefono || viewingTicket.customer?.whatsapp || viewingTicket.cliente?.whatsapp || '').replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-800/50 text-emerald-300 rounded-lg font-mono text-[11px] font-semibold transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Abrir Chat de WhatsApp</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </div>

              {/* Servicio Reportado */}
              <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5 space-y-2">
                <p className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">
                  Servicio Reportado
                </p>
                <div>
                  <p className="text-white font-medium">
                    {viewingTicket.servicio || viewingTicket.subscription?.plan?.service?.nombre}
                  </p>
                  <p className="text-gray-400 text-[11px]">
                    {viewingTicket.plan || viewingTicket.subscription?.plan?.nombrePlan}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Estado:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] border uppercase ${
                      viewingTicket.estado === 'pendiente_revision'
                        ? 'bg-amber-950/60 text-amber-400 border-amber-800/50'
                        : 'bg-emerald-950/60 text-emerald-400 border-emerald-800/50'
                    }`}
                  >
                    {viewingTicket.estado}
                  </span>
                </div>
              </div>
            </div>

            {/* Cuenta asignada afectada */}
            {(viewingTicket.subscription?.account || viewingTicket.cuentaActual) && (
              <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">
                    Cuenta con Problema en Suscripción
                  </p>
                  {(viewingTicket.subscription?.account?.id || viewingTicket.cuentaActual?.id) && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-950/90 text-blue-300 border border-blue-800/60">
                        #ACC-{(viewingTicket.subscription?.account?.id || viewingTicket.cuentaActual?.id).substring(0, 8).toUpperCase()}
                      </span>
                      <button
                        onClick={() =>
                          handleCopy(
                            `#ACC-${(viewingTicket.subscription?.account?.id || viewingTicket.cuentaActual?.id).substring(0, 8).toUpperCase()}`,
                            'acc-modal'
                          )
                        }
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors cursor-pointer"
                        title="Copiar Código de Cuenta"
                      >
                        {copiedKey === 'acc-modal' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px] bg-gray-900/80 p-2.5 rounded-lg border border-gray-800">
                  <div>
                    <span className="text-gray-400">Email: </span>
                    <strong className="text-white select-all">
                      {viewingTicket.cuentaActual?.email || viewingTicket.subscription?.account?.emailCuenta}
                    </strong>
                  </div>
                  {viewingTicket.subscription?.account?.passwordCuenta && (
                    <div>
                      <span className="text-gray-400">Contraseña: </span>
                      <strong className="text-white select-all">
                        {viewingTicket.subscription.account.passwordCuenta}
                      </strong>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Perfil: </span>
                    <strong className="text-emerald-400">
                      {viewingTicket.cuentaActual?.perfil || viewingTicket.subscription?.account?.perfilAsignado || 'Principal'}
                    </strong>
                  </div>
                  {(viewingTicket.cuentaActual?.pin || viewingTicket.subscription?.account?.pinPerfil) && (
                    <div>
                      <span className="text-gray-400">PIN: </span>
                      <strong className="text-amber-400">
                        {viewingTicket.cuentaActual?.pin || viewingTicket.subscription?.account?.pinPerfil}
                      </strong>
                    </div>
                  )}
                </div>

                {viewingTicket.subscription?.account?.id && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-gray-850">
                    <span className="text-gray-400 text-[11px]">Acción directa sobre la cuenta en inventario:</span>
                    <div className="flex items-center gap-2">
                      <select
                        value={viewingTicket.subscription.account.estado}
                        disabled={accStatusLoading === viewingTicket.subscription.account.id}
                        onChange={(e) =>
                          handleUpdateAccountStatus(viewingTicket.subscription.account.id, e.target.value)
                        }
                        className="bg-gray-900 border border-gray-700 text-white rounded-lg px-2.5 py-1 text-xs font-semibold cursor-pointer focus:outline-none focus:border-red-500"
                      >
                        <option value="DEFECTUOSA">DEFECTUOSA (Marcar con falla)</option>
                        <option value="BLOQUEADA">BLOQUEADA (Suspender / Bloquear)</option>
                        <option value="OCUPADA">OCUPADA (Activa con cliente)</option>
                        <option value="DISPONIBLE">DISPONIBLE (Liberar a stock)</option>
                        <option value="VENCIDA">VENCIDA</option>
                      </select>
                      {accStatusLoading === viewingTicket.subscription.account.id && (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Motivo de Falla */}
            <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5 space-y-1.5 text-xs">
              <p className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">
                Motivo de Falla Reportado
              </p>
              <p className="text-gray-200 bg-gray-900 p-2.5 rounded-lg border border-gray-800">
                {viewingTicket.motivo || viewingTicket.motivoReporte}
              </p>
              <p className="text-[10px] text-gray-500">
                Reportado el: {new Date(viewingTicket.createdAt || viewingTicket.fechaCreacion).toLocaleString('es-CO')}
              </p>
            </div>

            {/* Resolución */}
            <div className="bg-gray-950/60 border border-gray-800/80 rounded-xl p-3.5 space-y-1.5 text-xs">
              <p className="font-semibold text-gray-400 text-[11px] uppercase tracking-wider">
                Resolución
              </p>
              {viewingTicket.estado === 'pendiente_revision' ? (
                <p className="text-amber-400 italic">
                  Ticket pendiente de revisión por el equipo de soporte. Puedes aprobar el reemplazo automático o rechazarlo.
                </p>
              ) : viewingTicket.estado === 'pendiente_stock' ? (
                <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-3 space-y-1.5">
                  <p className="text-purple-300 font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Garantía Aprobada — En Cola Prioritaria de Auto-Asignación</span>
                  </p>
                  <p className="text-gray-300 text-[11px]">
                    El reemplazo de la garantía ha sido aprobado. Puedes pulsar el botón <strong className="text-white">Asignar Nueva Cuenta</strong> para asignarla de inmediato desde el inventario, o el sistema la auto-asignará al ingresar stock.
                  </p>
                  {typeof viewingTicket.stockDisponible === 'number' && (
                    <p className="text-[11px] font-mono">
                      Stock disponible actual en inventario:{' '}
                      <strong
                        className={
                          viewingTicket.stockDisponible > 0
                            ? 'text-emerald-400 font-bold'
                            : 'text-amber-400 font-bold'
                        }
                      >
                        {viewingTicket.stockDisponible} cuenta(s)
                      </strong>
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1 text-gray-300">
                  <p>Estado final: <strong className="text-white">{viewingTicket.estado}</strong></p>
                  {viewingTicket.motivoRechazo && (
                    <p>Motivo: <span className="text-red-300">{viewingTicket.motivoRechazo}</span></p>
                  )}
                  {viewingTicket.resolvedAt && (
                    <p className="text-[10px] text-gray-500">
                      Resuelto el: {new Date(viewingTicket.resolvedAt).toLocaleString('es-CO')}
                    </p>
                  )}
                </div>
              )}
            </div>

            </div>

            {/* Acciones del pie de modal Fijo */}
            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs flex-wrap">
              <button
                onClick={() => setViewingTicket(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white font-semibold rounded-xl cursor-pointer"
              >
                Cerrar
              </button>

              {viewingTicket.estado === 'pendiente_stock' && (
                <button
                  onClick={() => handleAssignAccount(viewingTicket.id)}
                  disabled={assigningId === viewingTicket.id}
                  data-tooltip="Asignar"
                  className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-2 cursor-pointer transition-all shadow-md disabled:opacity-50 ${
                    viewingTicket.stockDisponible && viewingTicket.stockDisponible > 0
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/25 ring-1 ring-emerald-400/50'
                      : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-600/20'
                  }`}
                >
                  {assigningId === viewingTicket.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300" />
                  )}
                  <span>Asignar Nueva Cuenta</span>
                  {typeof viewingTicket.stockDisponible === 'number' && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        viewingTicket.stockDisponible > 0
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : 'bg-black/30 text-purple-200'
                      }`}
                    >
                      {viewingTicket.stockDisponible > 0 ? `Stock: ${viewingTicket.stockDisponible}` : 'Stock: 0'}
                    </span>
                  )}
                </button>
              )}

              {viewingTicket.estado === 'pendiente_revision' && (
                <>
                  <button
                    onClick={() =>
                      setResolveModal({
                        ticket: viewingTicket,
                        decision: 'aprobado_reemplazo',
                        notas: '',
                      })
                    }
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl cursor-pointer"
                  >
                    Aprobar Reemplazo
                  </button>
                  <button
                    onClick={() =>
                      setResolveModal({
                        ticket: viewingTicket,
                        decision: 'rechazado',
                        notas: '',
                      })
                    }
                    className="px-4 py-2 bg-red-900/60 hover:bg-red-800/80 text-red-200 font-semibold rounded-xl cursor-pointer"
                  >
                    Rechazar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVER TICKET (APROBAR / RECHAZAR) */}
      {resolveModal && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white">
                {resolveModal.decision === 'aprobado_reemplazo'
                  ? 'Aprobar Reemplazo de Garantía'
                  : 'Rechazar Solicitud de Garantía'}
              </h3>
              <button onClick={() => setResolveModal(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">

            <p className="text-xs text-gray-300">
              {resolveModal.decision === 'aprobado_reemplazo'
                ? 'Se asignará automáticamente una nueva cuenta disponible de stock al cliente y se le enviarán las nuevas credenciales por WhatsApp.'
                : 'Indica el motivo por el cual no aplica la garantía para este reporte:'}
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">
                {resolveModal.decision === 'aprobado_reemplazo' ? 'Notas de Aprobación (opcional)' : 'Motivo del Rechazo (requerido)'}
              </label>
              <textarea
                rows={3}
                value={resolveModal.notas}
                onChange={(e) => setResolveModal({ ...resolveModal, notas: e.target.value })}
                placeholder={
                  resolveModal.decision === 'aprobado_reemplazo'
                    ? 'Notas internas...'
                    : 'Ej. No se detectaron fallas en las credenciales o el periodo de garantía ha finalizado.'
                }
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                onClick={() => setResolveModal(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmResolveTicket}
                disabled={resolvingId === resolveModal.ticket.id}
                className={`px-4 py-2 font-semibold text-white rounded-xl cursor-pointer flex items-center gap-1.5 ${
                  resolveModal.decision === 'aprobado_reemplazo'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {resolvingId === resolveModal.ticket.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>
                  {resolveModal.decision === 'aprobado_reemplazo' ? 'Confirmar Reemplazo' : 'Confirmar Rechazo'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PONER EN CUARENTENA LOTE */}
      {quarantineModal && (
        <div className="fixed inset-0 z-[10010] bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl h-[80vh] max-h-[80vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-5 border-b border-gray-800 shrink-0 bg-gray-900/95">
              <h3 className="text-base font-bold text-white">Poner Lote en Cuarentena</h3>
              <button onClick={() => setQuarantineModal(null)} className="text-gray-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 flex-1 overflow-y-auto">

            <p className="text-xs text-gray-300">
              Al poner en cuarentena el lote de <strong className="text-white">{quarantineModal.batch.proveedorNombre}</strong>, sus cuentas no serán despachadas a nuevos pedidos.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Razón de la Cuarentena</label>
              <textarea
                rows={3}
                value={quarantineModal.razon}
                onChange={(e) => setQuarantineModal({ ...quarantineModal, razon: e.target.value })}
                placeholder="Ej. Tasa de fallo anormal, caídas masivas en menos de 48h."
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>

            </div>

            <div className="p-4 sm:p-5 border-t border-gray-800 shrink-0 bg-gray-950 flex items-center justify-end gap-3 text-xs">
              <button
                onClick={() => setQuarantineModal(null)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmQuarantine}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 font-semibold text-white rounded-xl cursor-pointer"
              >
                Confirmar Cuarentena
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
