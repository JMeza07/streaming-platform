import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { ShieldCheck, RefreshCw, AlertCircle, CheckCircle, Clock } from 'lucide-react';

export const ClientTickets: React.FC = () => {
  const { showToast } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.portal.getTickets();
      setTickets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
            Garantías & Soporte
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Seguimiento en tiempo real de tus solicitudes
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={fetchTickets}
          disabled={loading}
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {loading && tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
          <p>Cargando tickets de garantía...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <ShieldCheck size={42} color="var(--accent-emerald)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>
            No tienes garantías abiertas
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
            Todas tus pantallas están operando con normalidad. Si presentas algún inconveniente, puedes reportarlo desde la pestaña <strong>Mis Pantallas</strong>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {tickets.map((t) => {
            const isResolved = t.estado === 'RESUELTO';
            const isPending = t.estado === 'PENDIENTE';
            return (
              <div key={t.id} className="card elevated">
                <div className="card-header">
                  <div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                      Ticket #{t.id.slice(0, 8)}
                    </span>
                    <h3 className="card-title" style={{ fontSize: '0.95rem' }}>
                      {t.motivo || 'Problema de acceso'}
                    </h3>
                  </div>
                  <span className={`badge-status ${isResolved ? 'active' : isPending ? 'pending' : 'danger'}`}>
                    {isResolved ? <CheckCircle size={12} /> : isPending ? <Clock size={12} /> : <AlertCircle size={12} />}
                    {t.estado}
                  </span>
                </div>

                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: 10,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  marginBottom: 10,
                  lineHeight: 1.4,
                }}>
                  {t.descripcion || 'Sin descripción adicional'}
                </div>

                {t.solucion && (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    padding: 10,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8rem',
                    color: '#34d399',
                    marginBottom: 8,
                  }}>
                    <strong>Respuesta de soporte:</strong> {t.solucion}
                  </div>
                )}

                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'right' }}>
                  Creado el {new Date(t.createdAt).toLocaleDateString()} a las {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
