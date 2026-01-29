import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from './Navbar';
import { FaArrowLeft, FaCheckCircle, FaLock, FaCreditCard, FaPaypal } from 'react-icons/fa';
import './PaymentPage.css'; // We will create this next

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
        'starter': { name: 'Plan Starter', price: { ARS: 29000, USD: 29 } },
        'pro': { name: 'Plan Pro Agency', price: { ARS: 79000, USD: 79 } }
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

    const handleMercadoPagoPayment = () => {
        setLoading(true);
        // Simulate backend call
        setTimeout(() => {
            setLoading(false);
            alert('Simulación: Redirigiendo a MercadoPago...');
            // Here we would redirect to the preference URL
        }, 1500);
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
