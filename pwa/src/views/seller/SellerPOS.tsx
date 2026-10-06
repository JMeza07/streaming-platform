import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  Zap, 
  UserCheck, 
  UserPlus, 
  Check, 
  CheckCircle2, 
  Phone
} from 'lucide-react';

export const SellerPOS: React.FC = () => {
  const { showToast } = useAuth();

  // Mode: existing customer vs new customer
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // New customer fields
  const [newNombre, setNewNombre] = useState('');
  const [newWhatsapp, setNewWhatsapp] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Sale fields
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [cantidad, setCantidad] = useState<number>(1);
  const [metodoPago, setMetodoPago] = useState<string>('Nequi');
  const [referencia, setReferencia] = useState<string>('');
  const [despachoInmediato, setDespachoInmediato] = useState<boolean>(true);
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Delivered result modal
  const [saleResult, setSaleResult] = useState<any | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [plansData, customersData] = await Promise.all([
        api.catalog.getPlans(),
        api.seller.getCustomers(),
      ]);
      setPlans(Array.isArray(plansData) ? plansData.filter((p: any) => p.activo) : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      if (plansData?.length > 0) {
        setSelectedPlanId(plansData[0].id);
      }
    } catch (err: any) {
      showToast(err.message || 'Error al cargar datos del POS');
    }
  };

  const handleSearchCustomer = async (term: string) => {
    setCustomerSearch(term);
    try {
      const data = await api.seller.getCustomers(term);
      setCustomers(Array.isArray(data) ? data : []);
    } catch {}
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
        showToast('Comprobante adjuntado');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanId) {
      showToast('Selecciona un plan');
      return;
    }

    if (customerMode === 'existing' && !selectedCustomerId) {
      showToast('Selecciona un cliente de la lista');
      return;
    }

    if (customerMode === 'new') {
      if (!newNombre.trim() || !newWhatsapp.trim()) {
        showToast('Nombre y WhatsApp son obligatorios para el nuevo cliente');
        return;
      }
    }

    setLoading(true);
    try {
      const payload: any = {
        planId: selectedPlanId,
        cantidad: Number(cantidad),
        metodoPago,
        referenciaExterna: referencia || undefined,
        despachoInmediato,
        comprobanteUrl: receiptBase64 || undefined,
      };

      if (customerMode === 'existing') {
        payload.customerId = selectedCustomerId;
      } else {
        payload.clienteNombre = newNombre.trim();
        payload.clienteWhatsapp = newWhatsapp.trim();
        payload.clienteEmail = newEmail.trim() || undefined;
      }

      const res = await api.seller.createSale(payload);
      setSaleResult(res);
      showToast('¡Venta realizada con éxito!');

      // Reset fields
      setReceiptBase64('');
      setReferencia('');
      if (customerMode === 'new') {
        setNewNombre('');
        setNewWhatsapp('');
        setNewEmail('');
      }
    } catch (err: any) {
      showToast(err.message || 'Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);
  const totalPrice = selectedPlan ? Number(selectedPlan.precio) * cantidad : 0;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
          POS Móvil Express
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Venta directa y asignación automática de pantallas al instante
        </p>
      </div>

      <form onSubmit={handleProcessSale}>
        {/* Customer Selector Mode */}
        <div className="card elevated" style={{ padding: 16 }}>
          <div style={{
            display: 'flex',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: 'var(--radius-md)',
            padding: 4,
            marginBottom: 14,
            border: '1px solid var(--border-subtle)',
          }}>
            <button
              type="button"
              onClick={() => setCustomerMode('existing')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: customerMode === 'existing' ? 'var(--accent-gradient)' : 'transparent',
                color: customerMode === 'existing' ? 'white' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <UserCheck size={14} />
              Cliente Existente
            </button>

            <button
              type="button"
              onClick={() => setCustomerMode('new')}
              style={{
                flex: 1,
                padding: '8px',
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                background: customerMode === 'new' ? 'var(--accent-gradient)' : 'transparent',
                color: customerMode === 'new' ? 'white' : 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <UserPlus size={14} />
              Nuevo Cliente
            </button>
          </div>

          {customerMode === 'existing' ? (
            <div>
              <div className="form-group" style={{ marginBottom: 10 }}>
                <label className="form-label">Buscar por WhatsApp o Nombre</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Escribe número o nombre..."
                    value={customerSearch}
                    onChange={(e) => handleSearchCustomer(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ maxHeight: 150, overflowY: 'auto', display: 'grid', gap: 6 }}>
                {customers.slice(0, 10).map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    style={{
                      padding: '8px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: selectedCustomerId === c.id ? 'rgba(225, 29, 72, 0.2)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid',
                      borderColor: selectedCustomerId === c.id ? 'var(--accent-red)' : 'var(--border-subtle)',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{c.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Phone size={11} /> {c.whatsapp}
                      </div>
                    </div>
                    {selectedCustomerId === c.id && <Check size={16} color="var(--accent-red-hover)" />}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="form-group">
                <label className="form-label">Nombre del Cliente *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nombre y Apellidos"
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  required={customerMode === 'new'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp (Identificador Obligatorio) *</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="+573001234567"
                  value={newWhatsapp}
                  onChange={(e) => setNewWhatsapp(e.target.value)}
                  required={customerMode === 'new'}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Correo (Opcional)</label>
                <input
                  type="email"
                  className="form-input"
                  placeholder="cliente@correo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Product / Plan details */}
        <div className="card" style={{ padding: 16 }}>
          <div className="form-group">
            <label className="form-label">Plan / Plataforma</label>
            <select
              className="form-input"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              style={{ background: 'var(--bg-glass-input)', color: 'var(--text-main)' }}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.service?.nombre} - {p.nombrePlan} (${Number(p.precio).toLocaleString()} COP)
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Cantidad</label>
              <input
                type="number"
                min="1"
                max="10"
                className="form-input"
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Método de Pago</label>
              <select
                className="form-input"
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                style={{ background: 'var(--bg-glass-input)', color: 'var(--text-main)' }}
              >
                <option value="Nequi">Nequi</option>
                <option value="Bancolombia">Bancolombia</option>
                <option value="Daviplata">Daviplata</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Saldo">Saldo de Billetera</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Referencia / Comprobante (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Número de aprobación o recibo"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Adjuntar Soporte de Pago (Opcional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="form-input"
              style={{ padding: '8px 12px', fontSize: '0.8rem' }}
            />
            {receiptBase64 && (
              <div style={{ fontSize: '0.72rem', color: '#34d399', marginTop: 4 }}>
                ✓ Comprobante listo para adjuntar
              </div>
            )}
          </div>

          {/* Despacho Inmediato Toggle */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 14px',
            borderRadius: 'var(--radius-md)',
            background: 'rgba(255,255,255,0.03)',
            marginBottom: 14,
          }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Despacho Inmediato</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                Asignar credenciales de inventario al instante
              </div>
            </div>
            <input
              type="checkbox"
              checked={despachoInmediato}
              onChange={(e) => setDespachoInmediato(e.target.checked)}
              style={{ width: 20, height: 20, accentColor: 'var(--accent-red)' }}
            />
          </div>

          {/* Total Bar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 0 6px',
            borderTop: '1px solid var(--border-subtle)',
          }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Total a Cobrar:</span>
            <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>
              ${totalPrice.toLocaleString()} COP
            </span>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          <Zap size={18} />
          {loading ? 'Generando venta...' : 'Registrar Venta & Entregar'}
        </button>
      </form>

      {/* Sale Result Delivery Modal */}
      {saleResult && (
        <div className="modal-backdrop" onClick={() => setSaleResult(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 10px',
              }}>
                <CheckCircle2 size={30} />
              </div>

              <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
                ¡Venta Registrada Exitosamente!
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 16 }}>
                Orden #{saleResult.order?.id?.slice(0, 8) || 'Generada'}
              </p>

              {saleResult.deliveredSubscriptions && saleResult.deliveredSubscriptions.length > 0 && (
                <div style={{ textAlign: 'left', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: 8 }}>
                    Credenciales Entregadas:
                  </div>

                  {saleResult.deliveredSubscriptions.map((sub: any, i: number) => (
                    <div key={i} className="cred-box" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--accent-red-hover)', fontWeight: 700 }}>
                        {sub.account?.emailCuenta}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontFamily: 'monospace' }}>
                        Clave: {sub.account?.passwordCuenta} | Perfil: {sub.account?.perfilAsignado} | PIN: {sub.profilePin || sub.account?.pinPerfil || 'N/A'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button className="btn-primary" onClick={() => setSaleResult(null)}>
                Listo para otra venta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
