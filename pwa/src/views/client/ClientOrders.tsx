import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  FileText, 
  Copy, 
  Check, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Upload, 
  RefreshCw, 
  Phone, 
  Image as ImageIcon, 
  X 
} from 'lucide-react';

export const ClientOrders: React.FC = () => {
  const { showToast } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [uploadingReceiptOrderId, setUploadingReceiptOrderId] = useState<string | null>(null);
  const [viewingReceiptUrl, setViewingReceiptUrl] = useState<string | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [ordersData, settingsData] = await Promise.all([
        api.portal.getOrders(),
        api.settings.get().catch(() => null),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      if (settingsData) setSettings(settingsData);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar historial de compras');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleCopy = (text: string, keyId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    showToast('Copiado al portapapeles');
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleReceiptUpload = async (orderId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      showToast('El archivo no debe superar los 8MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setUploadingReceiptOrderId(orderId);
      try {
        await api.portal.uploadOrderReceipt(orderId, base64);
        showToast('¡Comprobante adjuntado con éxito!');
        fetchOrders();
      } catch (err: any) {
        showToast(err.message || 'Error al subir comprobante');
      } finally {
        setUploadingReceiptOrderId(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const whatsappSoporte = (settings?.whatsappSoporte || settings?.whatsappNumber || '573001234567').replace(/[^0-9]/g, '');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
            Mis Compras & Pedidos
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Historial de órdenes registradas en la plataforma
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={fetchOrders}
          disabled={loading}
          title="Actualizar órdenes"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {loading && orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
          <p>Cargando tus órdenes...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <FileText size={40} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>
            No tienes órdenes de compra
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Cuando realices una compra de pantallas o combos aparecerán aquí con sus comprobantes y estados de activación.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {orders.map((o) => {
            const isCompleted = o.estado === 'COMPLETADA' || o.estado === 'PAGADO';
            const isPending = o.estado === 'PENDIENTE';
            const isCancelled = o.estado === 'CANCELADO';
            const orderCode = `#ORD-${o.id.substring(0, 8).toUpperCase()}`;

            return (
              <div key={o.id} className="card elevated">
                {/* Order Header */}
                <div className="card-header" style={{ alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: '#c084fc',
                        background: 'rgba(192, 132, 252, 0.1)',
                        padding: '2px 6px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid rgba(192, 132, 252, 0.25)',
                      }}>
                        {orderCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(o.id, `copy-ord-${o.id}`)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: 2,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                        title="Copiar ID"
                      >
                        {copiedKey === `copy-ord-${o.id}` ? <Check size={13} color="#34d399" /> : <Copy size={13} />}
                      </button>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      {new Date(o.fecha || o.createdAt).toLocaleDateString('es-CO', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>

                  <span className={`badge-status ${isCompleted ? 'active' : isPending ? 'pending' : 'danger'}`}>
                    {isCompleted ? <CheckCircle2 size={12} /> : isPending ? <Clock size={12} /> : <XCircle size={12} />}
                    {o.estado}
                  </span>
                </div>

                {/* Items Purchased */}
                <div style={{ margin: '10px 0', borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)', padding: '8px 0' }}>
                  {o.items && o.items.length > 0 ? (
                    o.items.map((item: any, idx: number) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontWeight: 700, color: 'white' }}>
                            {item.servicio}
                          </span>
                          <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: '0.75rem' }}>
                            {item.plan} (x{item.cantidad})
                          </span>
                        </div>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.8rem' }}>
                          ${Number(item.subtotal || item.precioUnitario * item.cantidad).toLocaleString()}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {o.descripcionVenta || 'Suscripción de Streaming'}
                    </div>
                  )}
                </div>

                {/* Summary Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Método: <strong style={{ color: 'var(--text-main)' }}>{o.metodoPago || 'Transferencia'}</strong>
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#34d399' }}>
                    ${Number(o.total).toLocaleString()} COP
                  </div>
                </div>

                {/* Motivo Cancelación if cancelled */}
                {isCancelled && o.motivoCancelacion && (
                  <div style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    fontSize: '0.75rem',
                    marginBottom: 10,
                  }}>
                    <strong>Motivo de Cancelación:</strong> {o.motivoCancelacion}
                  </div>
                )}

                {/* Comprobante Actions */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {o.comprobanteUrl ? (
                    <button
                      type="button"
                      className="btn-secondary btn-sm"
                      onClick={() => setViewingReceiptUrl(o.comprobanteUrl)}
                      style={{ fontSize: '0.75rem', padding: '6px 10px' }}
                    >
                      <ImageIcon size={13} />
                      Ver Comprobante
                    </button>
                  ) : isPending ? (
                    <label style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(225, 29, 72, 0.15)',
                      border: '1px solid var(--accent-red)',
                      color: 'white',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}>
                      <Upload size={13} />
                      {uploadingReceiptOrderId === o.id ? 'Subiendo...' : 'Adjuntar Comprobante'}
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        disabled={uploadingReceiptOrderId === o.id}
                        onChange={(e) => handleReceiptUpload(o.id, e)}
                      />
                    </label>
                  ) : null}

                  {/* Direct Support WhatsApp Link with Order UUID */}
                  <a
                    href={`https://wa.me/${whatsappSoporte}?text=${encodeURIComponent(
                      `Hola, requiero soporte para mi compra con ID: ${orderCode} (UUID: ${o.id}). Servicio: ${o.items?.[0]?.servicio || 'Plataforma'}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary btn-sm"
                    style={{
                      fontSize: '0.75rem',
                      padding: '6px 10px',
                      color: '#34d399',
                      borderColor: 'rgba(52, 211, 153, 0.4)',
                    }}
                  >
                    <Phone size={13} />
                    Soporte WhatsApp
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: View Receipt Lightbox */}
      {viewingReceiptUrl && (
        <div className="modal-backdrop" onClick={() => setViewingReceiptUrl(null)}>
          <div className="card" style={{ maxWidth: 440, width: '90%', padding: 14 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Comprobante de Pago</h3>
              <button className="icon-btn" onClick={() => setViewingReceiptUrl(null)}>
                <X size={16} />
              </button>
            </div>
            <div style={{ textAlign: 'center', maxHeight: '70vh', overflowY: 'auto' }}>
              <img
                src={viewingReceiptUrl}
                alt="Comprobante de Pago"
                style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)', objectFit: 'contain' }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
