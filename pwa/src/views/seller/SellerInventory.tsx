import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { RefreshCw, Tv } from 'lucide-react';

export const SellerInventory: React.FC = () => {
  const { showToast } = useAuth();
  const [summary, setSummary] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const [sumData, plansData] = await Promise.all([
        api.seller.getInventorySummary(),
        api.catalog.getPlans(),
      ]);
      setSummary(sumData);
      setPlans(Array.isArray(plansData) ? plansData : []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
            Inventario en Vivo
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Disponibilidad de cuentas y perfiles en tiempo real
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={fetchInventory}
          disabled={loading}
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Global Stock Stats */}
      {(() => {
        const disponiblesCount = summary?.porEstado?.find((e: any) => e.estado === 'DISPONIBLE')?._count || summary?.disponibles || 0;
        const ocupadasCount = summary?.porEstado?.find((e: any) => e.estado === 'OCUPADA' || e.estado === 'EN_USO')?._count || summary?.ocupadas || 0;
        return (
          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-number" style={{ color: '#34d399' }}>
                {disponiblesCount}
              </div>
              <div className="stat-label">Pantallas Libres</div>
            </div>

            <div className="stat-box">
              <div className="stat-number" style={{ color: 'var(--accent-red-hover)' }}>
                {ocupadasCount}
              </div>
              <div className="stat-label">Pantallas Activas</div>
            </div>
          </div>
        );
      })()}

      {/* Stock by Plan Cards */}
      <h3 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>
        Stock por Plan & Plataforma
      </h3>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-dim)' }}>
          <p>Cargando disponibilidad...</p>
        </div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay planes registrados</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {plans.map((p) => {
            const stockDisp = summary?.porPlan?.find(
              (pp: any) => pp.planId === p.id && pp.estado === 'DISPONIBLE'
            )?._count || 0;
            const hasStock = stockDisp > 0;

            return (
              <div key={p.id} className="card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 34,
                      height: 34,
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(255,255,255,0.06)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: hasStock ? '#34d399' : 'var(--text-dim)',
                      fontWeight: 700,
                    }}>
                      <Tv size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                        {p.service?.nombre} - {p.nombrePlan}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                        ${Number(p.precio).toLocaleString()} COP | {p.duracionDias} días
                      </div>
                    </div>
                  </div>

                  <span className={`badge-status ${hasStock ? 'active' : 'danger'}`}>
                    {hasStock ? `${stockDisp} disponibles` : 'Sin stock'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
