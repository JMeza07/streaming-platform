import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { 
  ShoppingBag, 
  Check, 
  Zap, 
  Upload, 
  Copy, 
  CheckCircle2, 
  X, 
  ArrowRight
} from 'lucide-react';

export const ClientCatalog: React.FC = () => {
  const { user, showToast } = useAuth();
  const [plans, setPlans] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [settings, setSettings] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedServiceId, setSelectedServiceId] = useState<string>('all');

  // Checkout modal
  const [checkoutPlan, setCheckoutPlan] = useState<any | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Nequi');
  const [buyerName, setBuyerName] = useState(user?.nombre || '');
  const [buyerWhatsapp, setBuyerWhatsapp] = useState(user?.whatsapp || '');
  const [receiptBase64, setReceiptBase64] = useState<string>('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [plansData, servicesData, settingsData] = await Promise.all([
        api.catalog.getPlans(),
        api.catalog.getServices(),
        api.settings.get(),
      ]);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setServices(Array.isArray(servicesData) ? servicesData : []);
      setSettings(settingsData);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar catálogo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPlans = plans.filter(p => {
    if (!p.activo) return false;
    if (selectedServiceId === 'all') return true;
    return p.serviceId === selectedServiceId;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 8 * 1024 * 1024) {
        showToast('El comprobante no debe superar los 8MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setReceiptBase64(reader.result as string);
        showToast('Comprobante cargado');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutPlan) return;
    if (!buyerName.trim() || !buyerWhatsapp.trim()) {
      showToast('Por favor indica tu nombre y WhatsApp');
      return;
    }

    setSubmittingOrder(true);
    try {
      await api.catalog.createOrder({
        customerId: user?.customerId,
        clienteNombre: buyerName.trim(),
        clienteWhatsapp: buyerWhatsapp.trim(),
        planId: checkoutPlan.id,
        metodoPago: selectedPaymentMethod,
        comprobanteUrl: receiptBase64 || undefined,
      });

      showToast('¡Orden registrada exitosamente! En breve recibirás tu pantalla.');
      setCheckoutPlan(null);
      setReceiptBase64('');
    } catch (err: any) {
      showToast(err.message || 'Error al procesar la compra');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // Derive payment methods strictly from database settings
  const paymentMethodsList: any[] = (settings?.mediosPago && Array.isArray(settings.mediosPago))
    ? settings.mediosPago.filter((m: any) => m.activo !== false)
    : [];

  const activeBank = paymentMethodsList.find(
    (m: any) => (m.banco || m.nombre || '').toLowerCase() === selectedPaymentMethod?.toLowerCase()
  ) || (paymentMethodsList.length > 0 ? paymentMethodsList[0] : null);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 800 }}>
          Catálogo de Pantallas & Cuentas
        </h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Entrega rápida y garantía durante toda la duración
        </p>
      </div>

      {/* Services Horizontal Filter */}
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 8,
        marginBottom: 16,
        scrollbarWidth: 'none',
      }}>
        <button
          type="button"
          onClick={() => setSelectedServiceId('all')}
          style={{
            padding: '7px 14px',
            borderRadius: 'var(--radius-full)',
            border: '1px solid',
            borderColor: selectedServiceId === 'all' ? 'var(--accent-red)' : 'var(--border-subtle)',
            background: selectedServiceId === 'all' ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.04)',
            color: selectedServiceId === 'all' ? 'white' : 'var(--text-muted)',
            fontSize: '0.78rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            cursor: 'pointer',
          }}
        >
          Todas
        </button>

        {services.map((svc) => (
          <button
            key={svc.id}
            type="button"
            onClick={() => setSelectedServiceId(svc.id)}
            style={{
              padding: '7px 14px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid',
              borderColor: selectedServiceId === svc.id ? 'var(--accent-red)' : 'var(--border-subtle)',
              background: selectedServiceId === svc.id ? 'var(--accent-gradient)' : 'rgba(255,255,255,0.04)',
              color: selectedServiceId === svc.id ? 'white' : 'var(--text-muted)',
              fontSize: '0.78rem',
              fontWeight: 700,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            {svc.nombre}
          </button>
        ))}
      </div>

      {/* Plans List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
          <p>Cargando planes disponibles...</p>
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '30px' }}>
          <ShoppingBag size={36} color="var(--text-dim)" style={{ margin: '0 auto 10px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay planes activos en esta categoría</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          {filteredPlans.map((plan) => (
            <div key={plan.id} className="card elevated" style={{ padding: 18 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <span style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    color: 'var(--accent-red-hover)',
                    fontWeight: 800,
                    letterSpacing: '0.5px'
                  }}>
                    {plan.service?.nombre || 'Streaming'}
                  </span>
                  <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
                    {plan.nombrePlan}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.35rem', fontWeight: 800, color: 'white' }}>
                    ${Number(plan.precio).toLocaleString()} {settings?.moneda || 'COP'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    por {plan.duracionDias || 30} días
                  </div>
                </div>
              </div>

              {/* Badges Features */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                <span className="badge-status active" style={{ fontSize: '0.65rem' }}>
                  ✓ {plan.resolucion || '4K Ultra HD'}
                </span>
                <span className="badge-status" style={{ fontSize: '0.65rem', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                  📺 {plan.pantallasSimultaneas || 1} Pantalla(s)
                </span>
                <span className="badge-status" style={{ fontSize: '0.65rem', background: 'rgba(6,182,212,0.15)', color: 'var(--accent-cyan)' }}>
                  🛡️ {plan.garantiaDias || 30} Días de Garantía
                </span>
              </div>

              <button
                className="btn-primary"
                onClick={() => {
                  setCheckoutPlan(plan);
                  setBuyerName(user?.nombre || '');
                  setBuyerWhatsapp(user?.whatsapp || '');
                }}
              >
                <Zap size={16} />
                Comprar Ahora
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Checkout Bottom Sheet Modal */}
      {checkoutPlan && (
        <div className="modal-backdrop" onClick={() => setCheckoutPlan(null)}>
          <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.2rem', fontWeight: 800 }}>
                  Confirmar Compra
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--accent-red-hover)' }}>
                  {checkoutPlan.service?.nombre} - {checkoutPlan.nombrePlan}
                </span>
              </div>
              <button className="icon-btn" onClick={() => setCheckoutPlan(null)}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCheckoutSubmit}>
              {/* Customer WhatsApp PK */}
              <div className="form-group">
                <label className="form-label">Tu Nombre *</label>
                <input
                  type="text"
                  className="form-input"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Tu WhatsApp (Recepción de Cuenta) *</label>
                <input
                  type="tel"
                  className="form-input"
                  value={buyerWhatsapp}
                  onChange={(e) => setBuyerWhatsapp(e.target.value)}
                  placeholder="+573001234567"
                  required
                />
              </div>

              {/* Payment Method Selector */}
              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                {paymentMethodsList.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '8px 0' }}>
                    Coordinar pago directo por WhatsApp con administración.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(paymentMethodsList.length, 3)}, 1fr)`, gap: 8 }}>
                    {paymentMethodsList.map((m: any) => {
                      const nombreMetodo = m.banco || m.nombre || 'Transferencia';
                      const isSelected = (selectedPaymentMethod || '').toLowerCase() === nombreMetodo.toLowerCase();
                      return (
                        <button
                          key={nombreMetodo}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(nombreMetodo)}
                          style={{
                            padding: '10px 6px',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid',
                            borderColor: isSelected ? 'var(--accent-red)' : 'var(--border-subtle)',
                            background: isSelected ? 'rgba(225, 29, 72, 0.15)' : 'rgba(255,255,255,0.02)',
                            color: isSelected ? 'white' : 'var(--text-muted)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            textAlign: 'center',
                          }}
                        >
                          {nombreMetodo}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Account Details */}
              {activeBank ? (
                <div className="card" style={{ padding: 12, marginBottom: 14, background: 'rgba(0,0,0,0.4)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                      Datos para transferir a {activeBank.banco || activeBank.nombre}:
                    </span>
                    {activeBank.numeroCuenta && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(activeBank.numeroCuenta);
                          setCopiedBank(true);
                          showToast('Número de cuenta copiado');
                          setTimeout(() => setCopiedBank(false), 2000);
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent-red-hover)', cursor: 'pointer', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        {copiedBank ? <Check size={12} /> : <Copy size={12} />}
                        {copiedBank ? 'Copiado' : 'Copiar Número'}
                      </button>
                    )}
                  </div>
                  {activeBank.numeroCuenta && (
                    <div style={{ fontFamily: 'monospace', fontSize: '1.05rem', fontWeight: 800, color: 'white' }}>
                      {activeBank.numeroCuenta}
                    </div>
                  )}
                  {activeBank.tipoCuenta && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 1 }}>
                      Tipo: {activeBank.tipoCuenta}
                    </div>
                  )}
                  {activeBank.titular && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Titular: {activeBank.titular}
                    </div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-amber)', marginTop: 6, fontWeight: 700 }}>
                    Total a pagar: ${Number(checkoutPlan.precio).toLocaleString()} {settings?.moneda || 'COP'}
                  </div>
                </div>
              ) : null}

              {/* Upload Receipt */}
              <div className="form-group">
                <label className="form-label">Comprobante de Pago (Captura)</label>
                <div style={{
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  position: 'relative',
                  cursor: 'pointer'
                }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                  />
                  {receiptBase64 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#34d399' }}>
                      <CheckCircle2 size={18} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Comprobante adjuntado con éxito</span>
                    </div>
                  ) : (
                    <div>
                      <Upload size={22} color="var(--text-dim)" style={{ margin: '0 auto 6px' }} />
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        Toca para subir captura de pago
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                        Nequi, Daviplata, Bancolombia
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={submittingOrder}
                style={{ marginTop: 12 }}
              >
                {submittingOrder ? 'Procesando orden...' : 'Confirmar y Enviar Pedido'}
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
