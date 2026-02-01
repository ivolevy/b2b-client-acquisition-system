import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiLock, FiCheck } from 'react-icons/fi';
import { supabase } from '../lib/supabase';

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const planId = searchParams.get('plan') || 'starter';
  const cycle = searchParams.get('cycle') || 'monthly';
  const currency = searchParams.get('currency') || 'ARS'; // 'ARS' or 'USD'

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+54');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user?.email) setEmail(user.email);
      
      if (user) {
        // Fetch profile data for name and phone
        const { data: profile } = await supabase
          .from('users')
          .select('name, phone')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          if (profile.name) setName(profile.name);
          if (profile.phone) setPhone(profile.phone);
        }
      }
    };
    fetchUser();
  }, []);

  // Mock Plan Data
  const plans = {
    starter: { 
      name: 'Plan Starter', 
      priceUSD: 26, 
      priceARS: 20000, 
      creditAmount: '1,000',
      features: ['Búsqueda Local', 'Verificación Básica'] 
    },
    growth: { 
      name: 'Plan Growth', 
      priceUSD: 49, 
      priceARS: 49000, 
      creditAmount: '3,000',
      features: ['Prioridad de Soporte', 'Verificación Avanzada']
    },
    scale: { 
      name: 'Plan Scale', 
      priceUSD: 149, 
      priceARS: 149000, 
      creditAmount: '10,000',
      features: ['API Access', 'Soporte Dedicado']
    }
  };

  const selectedPlan = plans[planId] || plans.starter;
  
  // Calculate final price based on currency decision made in Landing
  const isARS = currency === 'ARS';
  const finalPrice = isARS ? selectedPlan.priceARS : selectedPlan.priceUSD;
  const currencySymbol = isARS ? '$' : 'USD';
  const cycleLabel = cycle === 'yearly' ? 'anual' : 'mensual';

  const handlePayment = async () => {
    if (!email || !name || !phone) {
      alert("Por favor completá todos los campos para continuar.");
      return;
    }
    
    setLoading(true);
    
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_URL}/api/payments/mercadopago/create_preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          user_id: user?.id || 'anonymous',
          email: email,
          name: name,
          phone: `${countryCode} ${phone}`,
          amount: finalPrice,
          description: `Suscripción B2B - ${selectedPlan.name}`
        })
      });

      if (!response.ok) throw new Error('Error al crear la preferencia de pago');

      const { init_point } = await response.json();
      
      // Redirigir a MercadoPago
      window.location.href = init_point;
    } catch (err) {
      console.error(err);
      alert("Hubo un error al procesar el pago. Por favor intentá de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="checkout-page-minimal" style={{ minHeight: '100vh', background: '#ffffff', color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>

      
      {/* Absolute Back Button */}
      <div style={{ position: 'absolute', top: '40px', left: '40px' }}>
        <button 
          onClick={() => navigate('/landing')}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '14px', color: '#64748b', fontWeight: '500',
            padding: '8px 16px', borderRadius: '8px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#f1f5f9'}
          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
        >
          <FiArrowLeft /> Volver
        </button>
      </div>

      <div className="checkout-layout" style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '100px', paddingBottom: '60px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', paddingLeft: '20px', paddingRight: '20px' }}>
        
        {/* Left Column: Form */}
        <div className="checkout-form">
          <div style={{ marginBottom: '40px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '10px' }}>Finalizar Compra</h1>
            <p style={{ color: '#64748b' }}>Completá tus datos para activar tu cuenta.</p>
          </div>

          {/* Email and Name Inputs in one row */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                Email Profesional
              </label>
              <input 
                type="email" 
                placeholder="nombre@empresa.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '16px',
                  background: '#f8fafc',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
              <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FiLock size={12} /> Tus datos están encriptados y seguros.
              </p>
            </div>

            <div style={{ flex: 1, minWidth: '300px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
                Nombre Completo
              </label>
              <input 
                type="text" 
                placeholder="Ej: Juan Pérez" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '16px',
                  background: '#f8fafc',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          {/* Phone Input */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>
              Teléfono de Contacto
            </label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <select 
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                style={{
                  width: '100px',
                  padding: '16px 10px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '15px',
                  background: '#f8fafc',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="+54">🇦🇷 +54</option>
                <option value="+55">🇧🇷 +55</option>
                <option value="+56">🇨🇱 +56</option>
                <option value="+57">🇨🇴 +57</option>
                <option value="+598">🇺🇾 +598</option>
                <option value="+52">🇲🇽 +52</option>
                <option value="+1">🇺🇸 +1</option>
                <option value="+34">🇪🇸 +34</option>
              </select>
              <input 
                type="tel" 
                placeholder="Ej: 11 1234-5678" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  flex: 1,
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '16px',
                  background: '#f8fafc',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>
          </div>

          {/* Payment Method Display (Locked based on logic) */}
          <div style={{ marginBottom: '40px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '15px', color: '#334155' }}>Método de Pago Seleccionado</h3>
            
            <div style={{ 
              padding: '20px', 
              borderRadius: '12px', 
              border: isARS ? '1px solid #009ee3' : '1px solid #635bff',
              background: isARS ? 'rgba(0, 158, 227, 0.05)' : 'rgba(99, 91, 255, 0.05)',
              display: 'flex', alignItems: 'center', gap: '15px'
            }}>
                <div style={{ 
                    width: '40px', height: '40px', borderRadius: '50%', 
                    background: isARS ? '#009ee3' : '#635bff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontSize: '20px'
                }}>
                    {isARS ? '🇦🇷' : '💳'}
                </div>
                <div>
                    <strong style={{ display: 'block', color: '#0f172a' }}>
                        {isARS ? 'Mercado Pago' : 'Stripe (Tarjeta Internacional)'}
                    </strong>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>Procesador seguro oficial</span>
                </div>
            </div>
          </div>

          <button 
            onClick={handlePayment}
            disabled={loading}
            style={{
              width: '100%',
              padding: '20px',
              borderRadius: '12px',
              background: '#0f172a',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)'
            }}
          >
            {loading ? 'Procesando...' : `Pagar ${currencySymbol} ${finalPrice.toLocaleString()}`}
          </button>
          
          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#94a3b8' }}>
            Al pagar, aceptas nuestros Términos y Condiciones.
          </p>
        </div>

        {/* Right Column: Summary Card */}
        <div className="checkout-summary">
          <div style={{ 
            background: '#f8fafc', 
            padding: '40px', 
            borderRadius: '24px',
            position: 'sticky', top: '40px'
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '20px' }}>Resumen del Pedido</h3>
            
            <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
                <div style={{ 
                    width: '60px', height: '60px', borderRadius: '12px', 
                    background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px'
                }}>📦</div>
                <div>
                    <h4 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>{selectedPlan.name}</h4>
                    <span style={{ fontSize: '14px', color: '#64748b', textTransform: 'capitalize' }}>Facturación {cycleLabel}</span>
                </div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0' }}>
                <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                    <span style={{ color: '#64748b' }}>Créditos Incluidos</span>
                    <span style={{ fontWeight: '600' }}>{selectedPlan.creditAmount}</span>
                </li>
                {selectedPlan.features.map((feat, i) => (
                    <li key={i} style={{ display: 'flex', gap: '10px', fontSize: '14px', marginBottom: '10px', color: '#475569' }}>
                        <FiCheck color="#10b981" /> {feat}
                    </li>
                ))}
            </ul>

            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '16px', fontWeight: '500' }}>Total a pagar</span>
                <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '24px', fontWeight: '800', color: '#0f172a' }}>
                        {currencySymbol} {finalPrice.toLocaleString()}
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Impuestos incluidos</span>
                </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CheckoutPage;
