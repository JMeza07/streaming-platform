import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { FileText, RefreshCw, CheckCircle2, Clock, XCircle, Phone } from 'lucide-react';

export const SellerSales: React.FC = () => {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const data = await api.seller.getAllOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleApprove = async (orderId: string) => {
    setApprovingId(orderId);
    try {
      await api.seller.approveOrder(orderId);
      showToast('¡Orden aprobada y entregada con éxito!');
      fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Error al aprobar orden');
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
            Historial de Ventas
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Órdenes recientes y confirmación de pagos
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={fetchOrders}
          disabled={loading}
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
          <p>Cargando órdenes de venta...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
          <FileText size={36} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay ventas registradas aún</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {orders.map((o) => {
            const isCompleted = o.estado === 'COMPLETADA';
            const isPending = o.estado === 'PENDIENTE';
            return (
              <div key={o.id} className="card elevated">
                <div className="card-header">
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      Orden #{o.id.slice(0, 8)}
                    </span>
                    <h3 className="card-title" style={{ fontSize: '0.95rem' }}>
                      {o.customer?.nombre || 'Cliente Express'}
                    </h3>
                  </div>
                  <span className={`badge-status ${isCompleted ? 'active' : isPending ? 'pending' : 'danger'}`}>
                    {isCompleted ? <CheckCircle2 size={12} /> : isPending ? <Clock size={12} /> : <XCircle size={12} />}
                    {o.estado}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Phone size={12} /> {o.customer?.whatsapp || 'N/A'}
                  </span>
                  <span style={{ fontWeight: 800, color: '#34d399', fontSize: '0.95rem' }}>
                    ${Number(o.total).toLocaleString()} COP
                  </span>
                </div>

                <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginBottom: 10 }}>
                  Método: <strong>{o.metodoPago || 'N/A'}</strong> | {new Date(o.createdAt).toLocaleDateString()} {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>

                {isPending && (
                  <button
                    className="btn-primary btn-sm"
                    style={{ width: '100%', marginTop: 6 }}
                    onClick={() => handleApprove(o.id)}
                    disabled={approvingId === o.id}
                  >
                    <CheckCircle2 size={14} />
                    {approvingId === o.id ? 'Aprobando y despachando...' : 'Aprobar Pago y Entregar'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
