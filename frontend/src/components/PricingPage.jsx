import React, { useState } from 'react';
import Navbar from './Navbar';
import './PricingPage.css';
import { FaCheck, FaTimes, FaBuilding, FaRocket, FaCrown } from 'react-icons/fa';

const PricingPage = () => {
    const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' | 'yearly'
    const [currency, setCurrency] = useState('ARS'); // 'ARS' | 'USD'

    const isYearly = billingCycle === 'yearly';

    // Tasas de cambio y precios base (Ejemplo)
    const EXCHANGE_RATE = 1000; // 1 USD = 1000 ARS (Simplificado para vista)

    const plans = [
        {
            id: 'trial',
            name: 'Plan Gratuito',
            description: 'Para probar la plataforma sin riesgos.',
            price: { USD: 0, ARS: 0 },
            credits: 50,
            features: [
                { text: '50 Créditos de prueba (única vez)', included: true },
                { text: 'Búsqueda básica (Scraper)', included: true },
                { text: 'Acceso a Google Places', included: false },
                { text: 'Exportación de datos', included: false },
                { text: 'Soporte', included: false },
            ],
            icon: <FaBuilding className="plan-icon" />,
            buttonText: 'Comenzar Gratis',
            buttonClass: 'secondary',
            popular: false
        },
        {
            id: 'starter',
            name: 'Starter',
            description: 'Ideal para emprendedores y freelancers.',
            price: { USD: 29, ARS: 29000 },
            credits: 1000,
            features: [
                { text: '1,000 Créditos mensuales', included: true },
                { text: 'Acceso a Google Maps API', included: true },
                { text: 'Exportación CSV', included: true },
                { text: 'Soporte por email', included: true },
                { text: 'Enriquecimiento de datos', included: false },
            ],
            icon: <FaRocket className="plan-icon" />,
            buttonText: 'Suscribirse',
            buttonClass: 'primary',
            popular: true
        },
        {
            id: 'pro',
            name: 'Pro Agency',
            description: 'Para agencias que buscan escalar.',
            price: { USD: 79, ARS: 79000 },
            credits: 5000,
            features: [
                { text: '5,000 Créditos mensuales', included: true },
                { text: 'Prioridad en búsquedas', included: true },
                { text: 'Exportación CSV y PDF', included: true },
                { text: 'Enriquecimiento (Redes sociales)', included: true },
                { text: 'Soporte prioritario 24/7', included: true },
            ],
            icon: <FaCrown className="plan-icon" />,
            buttonText: 'Mejorar a Pro',
            buttonClass: 'secondary', // O primary si se quiere destacar
            popular: false
        }
    ];

    const getPrice = (plan) => {
        let basePrice = plan.price[currency];
        if (isYearly) {
            basePrice = basePrice * 0.8; // 20% descuento
        }
        // Formatear precio (sin decimales para ARS si es grande, con 2 para USD si no es entero)
        return isYearly ? Math.floor(basePrice) : basePrice;
    };

    return (
        <div className="pricing-page-container">
            <div className="pricing-bg-glow"></div>

            <Navbar />

            <div className="pricing-content">
                <header className="pricing-header">
                    <span className="pricing-badge">PLANES Y PRECIOS</span>
                    <h1 className="pricing-title">Invierte en Datos, Cierra más Ventas</h1>
                    <p className="pricing-subtitle">
                        Elige el plan que mejor se adapte a tu etapa de crecimiento.
                        Cancela o cambia de plan cuando quieras.
                    </p>
                </header>

                <div className="pricing-controls">
                    {/* Currency Toggle */}
                    <div className="toggle-group">
                        <button
                            className={`toggle-btn ${currency === 'ARS' ? 'active' : ''}`}
                            onClick={() => setCurrency('ARS')}
                        >
                            🇦🇷 ARS
                        </button>
                        <button
                            className={`toggle-btn ${currency === 'USD' ? 'active' : ''}`}
                            onClick={() => setCurrency('USD')}
                        >
                            🌎 USD
                        </button>
                    </div>

                    {/* Check users preference on taxes display for ARS later */}

                    {/* Cycle Toggle */}
                    <div className="toggle-group">
                        <button
                            className={`toggle-btn ${!isYearly ? 'active' : ''}`}
                            onClick={() => setBillingCycle('monthly')}
                        >
                            Mensual
                        </button>
                        <button
                            className={`toggle-btn ${isYearly ? 'active' : ''}`}
                            onClick={() => setBillingCycle('yearly')}
                        >
                            Anual <span className="save-badge">-20%</span>
                        </button>
                    </div>
                </div>

                <div className="pricing-grid">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`plan-card ${plan.popular ? 'popular' : ''}`}>
                            {plan.popular && <div className="popular-badge">Más Elegido</div>}

                            <div className="plan-header">
                                <h3 className="plan-name">{plan.name}</h3>
                                <p className="plan-desc">{plan.description}</p>
                            </div>

                            <div className="plan-price">
                                <span className="currency-symbol">
                                    {currency === 'USD' ? '$' : '$'}
                                </span>
                                <span className="price-amount">{getPrice(plan)}</span>
                                <span className="price-period">
                                    /{isYearly ? 'mes (facturado anual)' : 'mes'}
                                </span>
                            </div>

                            <button className={`plan-btn ${plan.buttonClass}`}>
                                {plan.buttonText}
                            </button>

                            {currency === 'ARS' && plan.price.ARS > 0 && (
                                <p className="iva-message">* Precio + IVA (21%)</p>
                            )}

                            <div className="plan-features">
                                <span className="features-label">Qué incluye:</span>
                                <ul className="features-list">
                                    {plan.features.map((feature, idx) => (
                                        <li key={idx} className={!feature.included ? 'disabled' : ''}>
                                            {feature.included ? <FaCheck /> : <FaTimes style={{ opacity: 0.5 }} />}
                                            {feature.text}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PricingPage;
