import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Phone, 
  Mail, 
  Globe, 
  LogOut, 
  Save, 
  Calendar,
  UserCheck,
  RefreshCw
} from 'lucide-react';

const NORMAS_USO_TEXT = [
  {
    tipo: 'PERMITIDO',
    icono: '✅',
    color: '#34d399',
    titulo: 'PERMITIDO:',
    items: [
      'Usar el servicio de forma personal en el perfil/pantalla asignada.',
      'Disfrutar el contenido dentro de los límites del plan adquirido.',
    ],
  },
  {
    tipo: 'PROHIBIDO',
    icono: '❌',
    color: '#f87171',
    titulo: 'PROHIBIDO (puede causar CANCELACIÓN inmediata sin reembolso):',
    items: [
      'Compartir las credenciales con terceros no autorizados.',
      'Cambiar la contraseña, nombre del perfil o PIN sin autorización.',
      'Agregar o eliminar perfiles de la cuenta.',
      'Acceder desde más dispositivos de los permitidos simultáneamente.',
      'Intentar hacer descargas masivas o uso comercial del servicio.',
      'Ceder, vender o transferir el acceso a otra persona.',
    ],
  },
  {
    tipo: 'IMPORTANTE',
    icono: '⚠️',
    color: '#fbbf24',
    titulo: 'IMPORTANTE:',
    items: [
      'El incumplimiento de estas normas resultará en la SUSPENSIÓN o CANCELACIÓN inmediata de su cuenta SIN derecho a reembolso.',
      'Si detecta problemas técnicos, comuníquese con soporte ANTES de hacer cualquier cambio en la cuenta.',
      'Su acceso es personal e intransferible.',
    ],
  },
];

export const ClientProfile: React.FC = () => {
  const { user, logout, showToast, refreshProfile } = useAuth();
  const [summary, setSummary] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Editable fields
  const [nombre, setNombre] = useState(user?.nombre || '');
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp || '');
  const [pais, setPais] = useState(user?.pais || 'Colombia');
  const [saving, setSaving] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const data = await api.portal.getSummary();
      setSummary(data);
      if (data) {
        setNombre(data.nombre || user?.nombre || '');
        setWhatsapp(data.whatsapp || user?.whatsapp || '');
        setPais(data.pais || 'Colombia');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al cargar resumen del perfil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !whatsapp.trim()) {
      showToast('Nombre y WhatsApp son obligatorios');
      return;
    }

    setSaving(true);
    try {
      await api.portal.updateProfile({
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        pais: pais.trim(),
      });
      showToast('¡Datos actualizados exitosamente!');
      await refreshProfile();
      fetchSummary();
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const walletBalance = summary?.walletBalance ?? user?.saldoBilletera ?? 0;
  const strikes = summary?.strikes ?? user?.strikes ?? 0;
  const activasCount = summary?.suscripcionesActivas ?? 0;
  const porVencerCount = summary?.porVencer ?? 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
            Mi Perfil de Cliente
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Datos sincronizados en tiempo real con la plataforma
          </p>
        </div>
        <button
          className="icon-btn"
          onClick={fetchSummary}
          disabled={loading}
          title="Actualizar datos"
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
      </div>

      {/* Avatar & Summary Card */}
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
          {(nombre || user?.nombre || 'C').slice(0, 1).toUpperCase()}
        </div>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 700 }}>
          {nombre || user?.nombre || 'Cliente'}
        </h3>
        <span className="role-pill cliente" style={{ display: 'inline-block', marginTop: 4 }}>
          CLIENTE REGISTRADO
        </span>

        {/* Real Stats Grid from DB */}
        <div className="stats-grid" style={{ marginTop: 20 }}>
          <div className="stat-box">
            <div className="stat-number" style={{ color: '#34d399' }}>
              ${Number(walletBalance).toLocaleString()}
            </div>
            <div className="stat-label">Saldo Billetera</div>
          </div>

          <div className="stat-box">
            <div className="stat-number" style={{ color: strikes > 0 ? '#f87171' : 'var(--text-main)' }}>
              {strikes} / 3
            </div>
            <div className="stat-label">Strikes</div>
          </div>

          <div className="stat-box">
            <div className="stat-number" style={{ color: '#38bdf8' }}>
              {activasCount}
            </div>
            <div className="stat-label">Pantallas Activas</div>
          </div>

          <div className="stat-box">
            <div className="stat-number" style={{ color: porVencerCount > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
              {porVencerCount}
            </div>
            <div className="stat-label">Por Vencer</div>
          </div>
        </div>

        {summary?.miembroDesde && (
          <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Calendar size={12} />
            Miembro desde: {new Date(summary.miembroDesde).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        )}
      </div>

      {/* Profile Form (Actualizar Datos en DB) */}
      <div className="card">
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>
          Mis Datos en Plataforma
        </h4>

        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <UserCheck size={13} /> Nombre Completo
            </label>
            <input
              type="text"
              className="form-input"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={13} /> WhatsApp (Clave Principal)
            </label>
            <input
              type="tel"
              className="form-input"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe size={13} /> País
            </label>
            <input
              type="text"
              className="form-input"
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              placeholder="Colombia"
            />
          </div>

          {(summary?.email || user?.email) && (
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Mail size={13} /> Correo Electrónico
              </label>
              <div className="form-input" style={{ background: 'rgba(255,255,255,0.02)', color: 'var(--text-muted)' }}>
                {summary?.email || user?.email}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={saving}
            style={{ width: '100%', marginTop: 8 }}
          >
            <Save size={15} />
            {saving ? 'Guardando cambios...' : 'Guardar Cambios en Plataforma'}
          </button>
        </form>
      </div>

      {/* Normas de Uso Oficiales de la Plataforma */}
      <div className="card">
        <h4 style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>
          📋 Normas de Uso y Condiciones del Servicio
        </h4>

        <div style={{ display: 'grid', gap: 10 }}>
          {NORMAS_USO_TEXT.map((norma, idx) => (
            <div
              key={idx}
              style={{
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${norma.color}33`,
              }}
            >
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: norma.color, marginBottom: 4 }}>
                {norma.titulo}
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                {norma.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Logout button */}
      <button
        className="btn-secondary"
        onClick={logout}
        style={{ marginTop: 8, borderColor: 'rgba(239, 68, 68, 0.4)', color: '#f87171' }}
      >
        <LogOut size={16} />
        Cerrar Sesión
      </button>
    </div>
  );
};
