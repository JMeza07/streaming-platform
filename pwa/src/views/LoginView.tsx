import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ArrowRight, ShieldCheck, UserPlus, LogIn, Sparkles } from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { login, register, showToast } = useAuth();

  const [activeTab, setActiveTab] = useState<'cliente' | 'staff'>('cliente');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // Form states
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [nombre, setNombre] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      showToast('Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      await login(identifier.trim(), password);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !whatsapp.trim() || !password) {
      showToast('Nombre, WhatsApp y contraseña son obligatorios');
      return;
    }

    setLoading(true);
    try {
      await register({
        nombre: nombre.trim(),
        whatsapp: whatsapp.trim(),
        email: email.trim() || undefined,
        password,
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast(err.message || 'Error al registrar la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '8px 0' }}>
      {/* Role Segmented Controller */}
      <div style={{
        display: 'flex',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 'var(--radius-md)',
        padding: 4,
        marginBottom: 20,
        border: '1px solid var(--border-subtle)',
      }}>
        <button
          type="button"
          onClick={() => { setActiveTab('cliente'); setIsRegisterMode(false); }}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'cliente' ? 'var(--accent-gradient)' : 'transparent',
            color: activeTab === 'cliente' ? 'white' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.2s ease',
          }}
        >
          <User size={15} />
          Soy Cliente
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('staff'); setIsRegisterMode(false); }}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: activeTab === 'staff' ? 'var(--accent-gradient)' : 'transparent',
            color: activeTab === 'staff' ? 'white' : 'var(--text-muted)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 0.2s ease',
          }}
        >
          <ShieldCheck size={15} />
          Vendedor / Staff
        </button>
      </div>

      <div className="card elevated" style={{ padding: 22 }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48,
            height: 48,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(225, 29, 72, 0.15)',
            color: 'var(--accent-red)',
            marginBottom: 10,
          }}>
            {isRegisterMode ? <UserPlus size={24} /> : <LogIn size={24} />}
          </div>
          <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
            {activeTab === 'cliente' 
              ? (isRegisterMode ? 'Crear Cuenta de Cliente' : 'Acceso al Portal de Cliente') 
              : 'Acceso de Vendedores y Staff'}
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {activeTab === 'cliente'
              ? (isRegisterMode ? 'Regístrate con tu WhatsApp para gestionar tus pantallas' : 'Ingresa con tu WhatsApp o Correo')
              : 'Panel de ventas móviles, despachos rápidos e inventario'}
          </p>
        </div>

        {/* Form */}
        {isRegisterMode ? (
          <form onSubmit={handleRegisterSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre Completo *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Tu nombre y apellido"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">WhatsApp (Identificador Único) *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+573001234567"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Correo Electrónico (Opcional)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  className="form-input"
                  placeholder="ejemplo@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña de Acceso *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 16 }}
            >
              {loading ? 'Creando cuenta...' : 'Completar Registro'}
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit}>
            <div className="form-group">
              <label className="form-label">
                {activeTab === 'cliente' ? 'WhatsApp o Correo' : 'Correo de Usuario'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={activeTab === 'cliente' ? 'text' : 'email'}
                  className="form-input"
                  placeholder={activeTab === 'cliente' ? 'Tu número de WhatsApp o email' : 'admin@mezastreaming.com'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  className="form-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ marginTop: 16 }}
            >
              {loading ? 'Ingresando...' : 'Iniciar Sesión'}
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {/* Switch Register/Login for Client */}
        {activeTab === 'cliente' && (
          <div style={{ textAlign: 'center', marginTop: 18 }}>
            <button
              type="button"
              onClick={() => setIsRegisterMode(!isRegisterMode)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              {isRegisterMode ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿Nuevo cliente? Regístrate aquí'}
            </button>
          </div>
        )}
      </div>

      {/* Info notice */}
      <div style={{
        marginTop: 18,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
      }}>
        <Sparkles size={16} color="var(--accent-red)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Detección Inteligente:</strong> La aplicación configurará su menú y herramientas instantáneamente dependiendo de si ingresas como cliente o como staff.
        </span>
      </div>
    </div>
  );
};
