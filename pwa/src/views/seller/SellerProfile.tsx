import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  LogOut, 
  RefreshCw, 
  Copy, 
  Check, 
  DollarSign, 
  Share2 
} from 'lucide-react';

export const SellerProfile: React.FC = () => {
  const { user, role, network, logout, checkNetwork, showToast } = useAuth();
  const [testing, setTesting] = useState(false);
  const [affiliateData, setAffiliateData] = useState<any | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Withdraw modal
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('Nequi');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [submittingWithdraw, setSubmittingWithdraw] = useState(false);

  const fetchAffiliate = async () => {
    setLoadingAffiliate(true);
    try {
      const data = await api.seller.getAffiliateProfile();
      setAffiliateData(data);
    } catch {
      // Admin without affiliate profile or non-affiliate staff
    } finally {
      setLoadingAffiliate(false);
    }
  };

  useEffect(() => {
    fetchAffiliate();
  }, []);

  const handleTestLatency = async () => {
    setTesting(true);
    try {
      const ms = await checkNetwork();
      showToast(`Latencia actual: ${ms}ms`);
    } catch {
      showToast('Error al probar latencia');
    } finally {
      setTesting(false);
    }
  };

  const handleCopyLink = () => {
    if (!affiliateData?.linkAfiliado && !affiliateData?.codigo) return;
    const link = affiliateData.linkAfiliado || `${window.location.origin}/?ref=${affiliateData.codigo}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    showToast('Enlace de afiliado copiado');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    if (!affiliateData?.codigo) return;
    navigator.clipboard.writeText(affiliateData.codigo);
    setCopiedCode(true);
    showToast('Código de afiliado copiado');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = Number(withdrawAmount);
    if (!monto || monto <= 0) {
      showToast('Ingresa un monto válido');
      return;
    }
    const maxSaldo = affiliateData?.walletBalance || 0;
    if (monto > maxSaldo) {
      showToast('El monto supera tu saldo disponible');
      return;
    }

    setSubmittingWithdraw(true);
    try {
      await api.seller.requestWithdrawal({
        monto,
        metodoPago: withdrawMethod,
        datosPago: withdrawAccount,
      });
      showToast('¡Solicitud de retiro enviada para aprobación!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      fetchAffiliate();
    } catch (err: any) {
      showToast(err.message || 'Error al procesar retiro');
    } finally {
      setSubmittingWithdraw(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
          Panel de Vendedor & Staff
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Datos de usuario administrativo, comisiones y conectividad
        </p>
      </div>

      {/* Staff Card */}
      <div className="card elevated" style={{ textAlign: 'center', padding: '24px 16px' }}>
        <div style={{
          width: 64,
          height: 64,
          borderRadius: 'var(--radius-full)',
          background: 'var(--accent-gradient)',
          color: 'white',
          fontSize: '1.5rem',
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px',
          boxShadow: '0 6px 20px var(--accent-red-glow)',
        }}>
          {user?.nombre?.slice(0, 1).toUpperCase() || 'S'}
        </div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>
          {user?.nombre || 'Staff'}
        </h3>
        <span className={`role-pill ${role.toLowerCase()}`} style={{ display: 'inline-block', marginTop: 4 }}>
          {role === 'ADMIN' ? 'ADMINISTRADOR PLATAFORMA' : 'VENDEDOR OFICIAL'}
        </span>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 8 }}>
          {user?.email}
        </div>
      </div>

      {/* Real Affiliate & Commission Stats (from DB) */}
      {affiliateData && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h4 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
              Balance de Comisiones
            </h4>
            <button className="icon-btn" onClick={fetchAffiliate} disabled={loadingAffiliate}>
              <RefreshCw size={14} className={loadingAffiliate ? 'spin' : ''} />
            </button>
          </div>

          <div className="stats-grid">
            <div className="stat-box">
              <div className="stat-number" style={{ color: '#34d399' }}>
                ${Number(affiliateData.walletBalance || 0).toLocaleString()}
              </div>
              <div className="stat-label">Saldo Disponible</div>
            </div>

            <div className="stat-box">
              <div className="stat-number" style={{ color: 'white' }}>
                {affiliateData.comisionPorcentaje || 10}%
              </div>
              <div className="stat-label">% Comisión</div>
            </div>

            <div className="stat-box">
              <div className="stat-number" style={{ color: '#38bdf8' }}>
                {affiliateData.totalVentas || 0}
              </div>
              <div className="stat-label">Ventas Hechas</div>
            </div>

            <div className="stat-box">
              <div className="stat-number" style={{ color: '#c084fc' }}>
                ${Number(affiliateData.totalGanado || 0).toLocaleString()}
              </div>
              <div className="stat-label">Total Ganado</div>
            </div>
          </div>

          {/* Referral Code & Link */}
          {affiliateData.codigo && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Código de Afiliado:</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--border-subtle)',
                    padding: '3px 8px',
                    borderRadius: 'var(--radius-sm)',
                    color: 'white',
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {affiliateData.codigo}
                  {copiedCode ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                </button>
              </div>

              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleCopyLink}
                style={{ width: '100%', fontSize: '0.76rem', marginBottom: 8 }}
              >
                <Share2 size={13} />
                {copiedLink ? '¡Enlace copiado!' : 'Copiar Enlace de Referido'}
              </button>

              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => setShowWithdrawModal(true)}
                disabled={(affiliateData.walletBalance || 0) <= 0}
                style={{ width: '100%', fontSize: '0.76rem' }}
              >
                <DollarSign size={13} />
                Solicitar Retiro de Fondos
              </button>
            </div>
          )}
        </div>
      )}

      {/* Network & Connectivity Information */}
      <div className="card">
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>
          Estado de Red de la PWA
        </h4>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Tipo de Conexión:</span>
          <span style={{ fontWeight: 700, color: network.isLan ? '#34d399' : '#38bdf8' }}>
            {network.isLan ? '📶 Red Local (Wi-Fi/LAN)' : '🌐 Internet Web (Público)'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Latencia Servidor:</span>
          <span style={{ fontWeight: 700, color: network.online ? '#34d399' : '#f87171' }}>
            {network.online ? `${network.latencyMs}ms` : 'Sin conexión'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>URL de Servidor:</span>
          <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {network.serverUrl}
          </span>
        </div>

        <button
          className="btn-secondary btn-sm"
          style={{ width: '100%' }}
          onClick={handleTestLatency}
          disabled={testing}
        >
          <RefreshCw size={13} className={testing ? 'spin' : ''} />
          {testing ? 'Midiendo latencia...' : 'Medir Latencia en Tiempo Real'}
        </button>
      </div>

      {/* Security notice */}
      <div style={{
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        marginBottom: 16,
      }}>
        🛡️ <strong>Seguridad Estricta:</strong> Esta PWA cumple los mismos parámetros de seguridad JWT y RBAC de la plataforma principal.
      </div>

      {/* Logout */}
      <button
        className="btn-secondary"
        onClick={logout}
        style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
      >
        <LogOut size={16} />
        Cerrar Sesión Staff
      </button>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="modal-backdrop" onClick={() => setShowWithdrawModal(false)}>
          <div className="card" style={{ maxWidth: 420, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 10 }}>
              Solicitar Retiro de Comisiones
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Saldo disponible para retiro: <strong style={{ color: '#34d399' }}>${Number(affiliateData?.walletBalance || 0).toLocaleString()} COP</strong>
            </p>

            <form onSubmit={handleWithdrawSubmit}>
              <div className="form-group">
                <label className="form-label">Monto a Retirar (COP) *</label>
                <input
                  type="number"
                  className="form-input"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Ej: 50000"
                  max={affiliateData?.walletBalance || 0}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Método de Cobro</label>
                <select
                  className="form-input"
                  value={withdrawMethod}
                  onChange={(e) => setWithdrawMethod(e.target.value)}
                >
                  <option value="Nequi">Nequi</option>
                  <option value="Bancolombia">Bancolombia</option>
                  <option value="Daviplata">Daviplata</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Número de Cuenta o Celular *</label>
                <input
                  type="text"
                  className="form-input"
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  placeholder="Número de celular o cuenta para consignar"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={submittingWithdraw}
                >
                  {submittingWithdraw ? 'Enviando...' : 'Confirmar Retiro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
