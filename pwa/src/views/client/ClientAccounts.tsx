import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Tv, 
  Copy, 
  Check, 
  Calendar, 
  ShieldAlert, 
  KeyRound, 
  RefreshCw, 
  AlertCircle, 
  Eye,
  EyeOff
} from 'lucide-react';

export const ClientAccounts: React.FC = () => {
  const { showToast } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Warranty report modal
  const [reportingSub, setReportingSub] = useState<any | null>(null);
  const [warrantyReason, setWarrantyReason] = useState('CUENTA_CAIDA');
  const [warrantyDesc, setWarrantyDesc] = useState('');
  const [submittingWarranty, setSubmittingWarranty] = useState(false);

  // Household code modal / state
  const [requestingCodeSubId, setRequestingCodeSubId] = useState<string | null>(null);
  const [householdResult, setHouseholdResult] = useState<{ code?: string; message?: string } | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const data = await api.portal.getSubscriptions();
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar tus cuentas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const copyToClipboard = (text: string, label: string, keyId: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    showToast(`¡${label} copiado!`);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const togglePasswordVisibility = (subId: string) => {
    setVisiblePasswords(prev => ({ ...prev, [subId]: !prev[subId] }));
  };

  const handleRequestHouseholdCode = async (subId: string) => {
    setRequestingCodeSubId(subId);
    try {
      const res = await api.portal.requestHouseholdCode(subId);
      setHouseholdResult(res);
      showToast('Código de hogar solicitado');
    } catch (err: any) {
      showToast(err.message || 'No se pudo obtener el código temporal');
    } finally {
      setRequestingCodeSubId(null);
    }
  };

  const handleReportOccupied = async (subId: string) => {
    try {
      await api.portal.reportOccupiedScreen(subId, 'Reportado desde PWA');
      showToast('¡Reporte de pantalla ocupada enviado al soporte!');
    } catch (err: any) {
      showToast(err.message || 'Error al reportar');
    }
  };

  const handleSubmitWarranty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingSub) return;
    setSubmittingWarranty(true);
    try {
      await api.portal.requestWarranty({
        subscriptionId: reportingSub.id,
        motivo: warrantyReason,
        descripcion: warrantyDesc || 'Reporte de garantía generado desde la PWA Móvil',
      });
      showToast('¡Ticket de garantía registrado exitosamente!');
      setReportingSub(null);
      setWarrantyDesc('');
      fetchSubscriptions();
    } catch (err: any) {
      showToast(err.message || 'Error al enviar garantía');
    } finally {
      setSubmittingWarranty(false);
    }
  };

  const calculateDaysLeft = (expirationDate: string) => {
    if (!expirationDate) return 0;
    const diff = new Date(expirationDate).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
            Mis Pantallas Activas
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Tus accesos directos, credenciales y estado en vivo
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={fetchSubscriptions}
          disabled={loading}
          title="Actualizar"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {loading && subscriptions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
          <RefreshCw size={28} className="spin" style={{ margin: '0 auto 12px' }} />
          <p>Cargando tus suscripciones...</p>
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '36px 20px' }}>
          <Tv size={42} color="var(--text-dim)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 6 }}>
            Aún no tienes suscripciones activas
          </h3>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 18 }}>
            Explora nuestro catálogo de plataformas premium y adquiere tu primer servicio en segundos.
          </p>
        </div>
      ) : (
        subscriptions.map((sub) => {
          const daysLeft = sub.diasRestantes !== undefined ? sub.diasRestantes : calculateDaysLeft(sub.fechaVencimiento);
          const serviceName = sub.servicio || sub.plan?.service?.nombre || (typeof sub.plan === 'string' ? sub.plan : 'Streaming');
          const planName = typeof sub.plan === 'string' ? sub.plan : (sub.plan?.nombrePlan || 'Plan Premium');
          const emailAccount = sub.emailCuenta || sub.credenciales?.email || sub.account?.emailCuenta || 'N/A';
          const passwordAccount = sub.passwordCuenta || sub.credenciales?.password || sub.account?.passwordCuenta || '••••••••';
          const profileAssigned = sub.perfilAsignado || sub.credenciales?.perfil || sub.account?.perfilAsignado || 'Perfil Principal';
          const profilePin = sub.pinPerfil || sub.assignedPin || sub.credenciales?.pin || sub.profilePin || 'Sin PIN';
          const isShowPass = visiblePasswords[sub.id];

          return (
            <div key={sub.id} className="card elevated">
              {/* Header */}
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--accent-gradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 800,
                    overflow: 'hidden',
                  }}>
                    {sub.logoUrl ? (
                      <img src={sub.logoUrl} alt={serviceName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                      serviceName.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="card-title">{serviceName}</h3>
                    <div style={{ fontSize: '0.74rem', color: 'var(--accent-red-hover)', fontWeight: 600 }}>
                      {planName}
                    </div>
                  </div>
                </div>

                <span className={`badge-status ${sub.estado === 'ACTIVA' ? 'active' : 'pending'}`}>
                  {sub.estado || 'ACTIVA'}
                </span>
              </div>

              {/* Progress & Expiration */}
              <div style={{ margin: '10px 0 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={13} /> Vence en {daysLeft} días
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                    {sub.fechaVencimiento ? new Date(sub.fechaVencimiento).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="progress-bar-wrap">
                  <div
                    className={`progress-bar-fill ${daysLeft <= 3 ? 'warning' : ''}`}
                    style={{ width: `${Math.min(100, Math.max(10, (daysLeft / 30) * 100))}%` }}
                  />
                </div>
              </div>

              {/* Credentials Copy Boxes */}
              <div
                className="cred-box"
                onClick={() => copyToClipboard(emailAccount, 'Correo', `email-${sub.id}`)}
              >
                <div>
                  <div className="cred-label">Usuario / Correo:</div>
                  <div className="cred-value">{emailAccount}</div>
                </div>
                <div className="copy-badge">
                  {copiedKey === `email-${sub.id}` ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  <span>{copiedKey === `email-${sub.id}` ? '¡Copiado!' : 'Copiar'}</span>
                </div>
              </div>

              <div
                className="cred-box"
                onClick={() => copyToClipboard(passwordAccount, 'Contraseña', `pass-${sub.id}`)}
              >
                <div style={{ flex: 1 }}>
                  <div className="cred-label">Contraseña:</div>
                  <div className="cred-value">
                    {isShowPass ? passwordAccount : '••••••••••••'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); togglePasswordVisibility(sub.id); }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}
                  >
                    {isShowPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <div className="copy-badge">
                    {copiedKey === `pass-${sub.id}` ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                    <span>{copiedKey === `pass-${sub.id}` ? '¡Copiado!' : 'Copiar'}</span>
                  </div>
                </div>
              </div>

              {/* Profile & PIN */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div
                  className="cred-box"
                  style={{ marginBottom: 0 }}
                  onClick={() => copyToClipboard(profileAssigned, 'Perfil', `prof-${sub.id}`)}
                >
                  <div>
                    <div className="cred-label">Perfil:</div>
                    <div className="cred-value" style={{ fontSize: '0.82rem' }}>{profileAssigned}</div>
                  </div>
                  <Copy size={13} color="var(--text-dim)" />
                </div>

                <div
                  className="cred-box"
                  style={{ marginBottom: 0 }}
                  onClick={() => copyToClipboard(profilePin, 'PIN', `pin-${sub.id}`)}
                >
                  <div>
                    <div className="cred-label">PIN:</div>
                    <div className="cred-value" style={{ fontSize: '0.82rem' }}>{profilePin}</div>
                  </div>
                  <Copy size={13} color="var(--text-dim)" />
                </div>
              </div>

              {/* Quick Actions (Household code, Warranty, Screen occupied) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => handleRequestHouseholdCode(sub.id)}
                  disabled={requestingCodeSubId === sub.id}
                >
                  <KeyRound size={13} />
                  {requestingCodeSubId === sub.id ? 'Consultando...' : 'Código Hogar'}
                </button>

                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#f87171' }}
                  onClick={() => setReportingSub(sub)}
                >
                  <ShieldAlert size={13} />
                  Garantía
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleReportOccupied(sub.id)}
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  fontSize: '0.72rem',
                  marginTop: 8,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textAlign: 'center',
                }}
              >
                ¿Alguien más está usando tu pantalla? Reportar intrusión aquí
              </button>
            </div>
          );
        })
      )}

      {/* Household code result modal */}
      {householdResult && (
        <div className="modal-backdrop" onClick={() => setHouseholdResult(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: 50,
                height: 50,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}>
                <KeyRound size={26} />
              </div>
              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', marginBottom: 6 }}>
                Código Temporal de Hogar
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                {householdResult.message || 'Introduce este código en tu televisor o dispositivo:'}
              </p>

              {householdResult.code ? (
                <div style={{
                  fontSize: '1.8rem',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  letterSpacing: '4px',
                  background: 'rgba(0,0,0,0.5)',
                  padding: '14px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--accent-red)',
                  marginBottom: 18,
                }}>
                  {householdResult.code}
                </div>
              ) : (
                <div style={{ padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                  <AlertCircle size={20} color="var(--accent-amber)" style={{ margin: '0 auto 6px' }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    El código está siendo generado o fue enviado a tu WhatsApp. Si tarda más de 2 minutos, genera un ticket de soporte.
                  </p>
                </div>
              )}

              <button className="btn-primary" onClick={() => setHouseholdResult(null)}>
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warranty Request Modal */}
      {reportingSub && (
        <div className="modal-backdrop" onClick={() => setReportingSub(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', marginBottom: 6 }}>
              Solicitar Garantía para {reportingSub.plan?.nombrePlan}
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Nuestro sistema automatizado atenderá tu solicitud de inmediato.
            </p>

            <form onSubmit={handleSubmitWarranty}>
              <div className="form-group">
                <label className="form-label">Motivo del Problema</label>
                <select
                  className="form-input"
                  value={warrantyReason}
                  onChange={(e) => setWarrantyReason(e.target.value)}
                  style={{ background: 'var(--bg-glass-input)', color: 'var(--text-main)' }}
                >
                  <option value="CUENTA_CAIDA">Contraseña incorrecta o cuenta caída</option>
                  <option value="PANTALLA_OCUPADA">Pantalla ocupada por otro usuario</option>
                  <option value="PIN_CAMBIADO">El PIN de mi perfil fue alterado</option>
                  <option value="ERROR_HOGAR">Problemas con código de hogar</option>
                  <option value="OTRO">Otro inconveniente</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Detalles Adicionales (Opcional)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Describe brevemente qué mensaje te aparece en la pantalla..."
                  value={warrantyDesc}
                  onChange={(e) => setWarrantyDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setReportingSub(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submittingWarranty}
                >
                  {submittingWarranty ? 'Enviando...' : 'Enviar Reporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
