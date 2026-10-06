import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Tv, Wifi, Globe, Settings2, X, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  systemName?: string;
}

export const Header: React.FC<HeaderProps> = ({ systemName = 'MezaStreaming' }) => {
  const { user, role, network, setCustomServerUrl, checkNetwork, showToast } = useAuth();
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [inputUrl, setInputUrl] = useState(network.serverUrl);
  const [testingPing, setTestingPing] = useState(false);
  const [pingResult, setPingResult] = useState<{ ms: number; ok: boolean } | null>(null);

  const handleTestPing = async () => {
    setTestingPing(true);
    try {
      const ms = await checkNetwork(inputUrl);
      setPingResult({ ms, ok: ms >= 0 });
    } catch {
      setPingResult({ ms: -1, ok: false });
    } finally {
      setTestingPing(false);
    }
  };

  const handleSaveUrl = async () => {
    await setCustomServerUrl(inputUrl);
    setShowNetworkModal(false);
  };

  const handleResetDefault = async () => {
    const defaultUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:3001/api' 
      : `http://${window.location.hostname}:3001/api`;
    setInputUrl(defaultUrl);
    await setCustomServerUrl(defaultUrl);
    showToast('Restablecido a automático');
  };

  return (
    <>
      <header className="pwa-header">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Tv size={20} />
          </div>
          <div>
            <div className="brand-title">
              {systemName.replace(/Streaming/i, '')}<span className="highlight">Streaming</span>
            </div>
            {user && (
              <span className={`role-pill ${role.toLowerCase()}`}>
                {role === 'ADMIN' ? '👑 Admin' : role === 'VENDEDOR' ? '💼 Vendedor' : '👤 Cliente'}
              </span>
            )}
          </div>
        </div>

        <div className="header-actions">
          {/* Network Pill */}
          <button
            className={`network-badge ${network.online ? 'online' : 'offline'}`}
            onClick={() => setShowNetworkModal(true)}
            title="Estado de conexión del servidor"
          >
            <span className={`network-dot ${network.online ? 'pulse' : ''}`} />
            {network.isLan ? <Wifi size={12} /> : <Globe size={12} />}
            <span>{network.online ? `${network.latencyMs}ms` : 'Offline'}</span>
          </button>

          {/* Quick Settings Icon */}
          <button
            className="icon-btn"
            onClick={() => setShowNetworkModal(true)}
            aria-label="Configuración de red"
          >
            <Settings2 size={16} />
          </button>
        </div>
      </header>

      {/* Network Configuration Modal */}
      {showNetworkModal && (
        <div className="modal-backdrop" onClick={() => setShowNetworkModal(false)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wifi size={20} color="var(--accent-red)" />
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem' }}>Conexión de Red & Servidor</h3>
              </div>
              <button className="icon-btn" onClick={() => setShowNetworkModal(false)}>
                <X size={16} />
              </button>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.4 }}>
              Esta PWA híbrida puede funcionar tanto conectada a la misma <strong>Red Local (Wi-Fi/LAN)</strong> del servidor como a través de <strong>Internet público</strong>.
            </p>

            <div className="card" style={{ padding: 12, marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Modo actual:</span>
                <span style={{ fontWeight: 700, color: network.isLan ? '#34d399' : '#38bdf8' }}>
                  {network.isLan ? '📶 Red Local LAN' : '🌐 Internet Web'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', marginTop: 6 }}>
                <span style={{ color: 'var(--text-dim)' }}>Estado API:</span>
                <span style={{ fontWeight: 700, color: network.online ? '#34d399' : '#f87171' }}>
                  {network.online ? `Activo (${network.latencyMs}ms)` : 'Inalcanzable'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dirección del Servidor API:</label>
              <input
                type="text"
                className="form-input"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="http://192.168.1.50:3001/api"
              />
            </div>

            {pingResult && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 14,
                fontSize: '0.82rem',
                background: pingResult.ok ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: pingResult.ok ? '#34d399' : '#f87171'
              }}>
                {pingResult.ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>
                  {pingResult.ok ? `¡Conexión exitosa! Latencia: ${pingResult.ms}ms` : 'No se pudo conectar al servidor'}
                </span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <button
                className="btn-secondary"
                onClick={handleTestPing}
                disabled={testingPing}
              >
                <RefreshCw size={14} className={testingPing ? 'spin' : ''} />
                {testingPing ? 'Probando...' : 'Probar Ping'}
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveUrl}
              >
                Guardar
              </button>
            </div>

            <button
              className="btn-secondary"
              onClick={handleResetDefault}
              style={{ fontSize: '0.78rem', color: 'var(--text-dim)', padding: 8 }}
            >
              Autodetectar automáticamente
            </button>
          </div>
        </div>
      )}
    </>
  );
};
