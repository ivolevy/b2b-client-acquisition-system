import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { FaArrowLeft, FaCheckCircle, FaLock, FaCreditCard, FaPaypal } from 'react-icons/fa';


const PaymentPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const planId = searchParams.get('plan') || 'starter';
    const cycle = searchParams.get('cycle') || 'monthly';
    const currency = searchParams.get('currency') || 'ARS';

    const [loading, setLoading] = useState(false);

    // MOCK DATA - In real app, fetch from backend or efficient lookup
    const PLANS = {
        'trial': { name: 'Plan Gratuito', price: { ARS: 0, USD: 0 } },
        'starter': { name: 'Plan Starter', price: { ARS: 100000, USD: 100 } },
        'pro': { name: 'Plan Pro Agency', price: { ARS: 100000, USD: 100 } }
    };

    const selectedPlan = PLANS[planId] || PLANS['starter'];

    // Calculates total
    let basePrice = selectedPlan.price[currency];
    if (cycle === 'yearly') {
        basePrice = basePrice * 0.8;
    }
    const price = cycle === 'yearly' ? Math.floor(basePrice) : basePrice;

    // Tax calculation for ARS
    const taxRate = currency === 'ARS' ? 0.21 : 0;
    const taxAmount = price * taxRate;
    const total = price + taxAmount;

    const handleMercadoPagoPayment = async () => {
        setLoading(true);
        try {
            // Obtener user info desde localStorage o contexto (simulado si no hay auth real en este componente aun)
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : { id: 'anonymous', email: 'guest@example.com' };

            // Llamada al backend real
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://b2b-client-acquisition-system-hlll.vercel.app'}/api/payments/mercadopago/create_preference`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    plan_id: planId, // 'starter', 'pro' (mapped to growth), 'agency' (mapped to scale)
                    user_id: user.id || 'anonymous',
                    email: user.email || 'guest@example.com', 
                    name: user.name || 'Cliente',
                    phone: user.phone || '',
                    amount: total, // El total calculado con impuestos
                    description: `Suscripción ${selectedPlan.name} (${cycle === 'yearly' ? 'Anual' : 'Mensual'})`
                })
            });

            if (!response.ok) throw new Error('Error al crear preferencia');

            const data = await response.json();
            
            if (data.init_point) {
                // Redirigir a MercadoPago
                window.location.href = data.init_point;
            } else {
                alert('Error: No se recibió link de pago');
                setLoading(false);
            }
        } catch (error) {
            console.error('Payment Error:', error);
            alert('Hubo un error al iniciar el pago. Por favor intenta nuevamente.');
            setLoading(false);
        }
    };

    const handlePayPalPayment = () => {
        setLoading(true);
        // Simulate PayPal script load
        setTimeout(() => {
            setLoading(false);
            alert('Simulación: Iniciando PayPal Checkout...');
        }, 1500);
    };

    return (
        <div className="payment-page-container">
            <Navbar />

            <div className="payment-content">
                <button className="back-link" onClick={() => navigate('/landing')}>
                    <FaArrowLeft /> Volver a precios
                </button>

                <div className="checkout-grid">
                    {/* Left Column: Summary */}
                    <div className="order-summary-card">
                        <h2>Resumen de tu Orden</h2>

                        <div className="summary-row plan-row">
                            <div>
                                <h3>{selectedPlan.name}</h3>
                                <span className="cycle-badge">{cycle === 'yearly' ? 'Anual' : 'Mensual'}</span>
                            </div>
                            <div className="price-display">
                                <small>{currency}</small>
                                <strong>{price.toLocaleString()}</strong>
                            </div>
                        </div>

                        {currency === 'ARS' && (
                            <div className="summary-row tax-row">
                                <span>IVA (21%)</span>
                                <span>{currency} {taxAmount.toLocaleString()}</span>
                            </div>
                        )}

                        <div className="summary-divider"></div>

                        <div className="summary-row total-row">
                            <span>Total a Pagar</span>
                            <span className="total-amount">
                                {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>

                        <div className="security-note">
                            <FaLock />
                            <span>Pago 100% Seguro y Encriptado.</span>
                        </div>

                        <ul className="guarantee-list">
                            <li><FaCheckCircle /> Activación Inmediata</li>
                            <li><FaCheckCircle /> Cancelación en cualquier momento</li>
                            <li><FaCheckCircle /> Garantía de satisfacción 7 días</li>
                        </ul>
                    </div>

                    {/* Right Column: Payment Method */}
                    <div className="payment-method-card">
                        <h2>Método de Pago</h2>
                        <p className="method-desc">Selecciona cómo deseas abonar tu suscripción.</p>

                        {currency === 'ARS' ? (
                            /* MERCADOPAGO */
                            <div className="payment-option mp-option">
                                <div className="mp-header">
                                    <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/Logotipo_Mercado_Pago.png" alt="Mercado Pago" className="mp-logo" style={{ height: '30px' }} />
                                    <span className="recommended-badge">Recomendado</span>
                                </div>
                                <p>Paga con Tarjeta de Crédito, Débito o Dinero en Cuenta.</p>
                                <button
                                    className="pay-btn mp-btn"
                                    onClick={handleMercadoPagoPayment}
                                    disabled={loading}
                                >
                                    {loading ? 'Procesando...' : `Pagar con MercadoPago`}
                                </button>
                            </div>
                        ) : (
                            /* PAYPAL */
                            <div className="payment-option paypal-option">
                                <div className="paypal-header">
                                    <FaPaypal className="paypal-icon" />
                                    <span>PayPal Checkout</span>
                                </div>
                                <p>Paga internacionalmente de forma segura.</p>
                                <button
                                    className="pay-btn paypal-btn"
                                    onClick={handlePayPalPayment}
                                    disabled={loading}
                                >
                                    {loading ? 'Cargando...' : `Pagar con PayPal`}
                                </button>
                                <div className="cards-row">
                                    <FaCreditCard />
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>Tarjetas aceptadas vía PayPal</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentPage;
