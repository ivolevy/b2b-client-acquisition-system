import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { financialService } from '../../lib/financialService';
import './AdminFinancials.css';
import './AdminLayout.css';

const AdminFinancials = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        mrr: [],
        overview: null,
        growth: [],
        txsARS: [],
        txsUSD: [],
        exchangeRates: { official: 850, blue: 1200 }
    });

    useEffect(() => {
        const loadData = async () => {
            try {
                const [mrr, over, growth, txsARS, txsUSD, rates] = await Promise.all([
                    financialService.getMRRHistory(),
                    financialService.getCurrentOverview(),
                    financialService.getUserGrowth(),
                    financialService.getRecentTransactions('ARS'),
                    financialService.getRecentTransactions('USD'),
                    financialService.getExchangeRates()
                ]);
                
                setData({ mrr, overview: over, growth, txsARS, txsUSD, exchangeRates: rates });
            } catch (err) {
                console.error("Error loading financial data", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, []);

    if (loading) return <div style={{ padding: '40px', color: '#64748b', textAlign: 'center' }}>Cargando métricas financieras...</div>;

    const { txsARS, txsUSD, exchangeRates } = data;
    const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
    const formatCurrencyExact = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div className="admin-financials-container">
            <div className="financials-header">
                <h1>Panel Financiero</h1>
            </div>

            <TransactionsView 
                txsARS={txsARS} 
                txsUSD={txsUSD} 
                exchangeRates={exchangeRates}
                formatCurrency={formatCurrency} 
                formatCurrencyExact={formatCurrencyExact}
                formatUSD={formatUSD} 
            />
        </div>
    );
};

// --- SUB-VIEWS ---

const TransactionsView = ({ txsARS, txsUSD, exchangeRates, formatCurrency, formatCurrencyExact, formatUSD }) => {
    // State for currency conversion
    // Default to Blue rate fetched from API, or fallback 1200
    const [conversionRate, setConversionRate] = useState(exchangeRates?.blue || 1200); 
    const [rateType, setRateType] = useState('blue'); // 'official', 'blue', 'custom'

    // Update effect if rates change (e.g. after loading)
    useEffect(() => {
        if (rateType === 'blue' && exchangeRates?.blue) setConversionRate(exchangeRates.blue);
        if (rateType === 'official' && exchangeRates?.official) setConversionRate(exchangeRates.official);
    }, [exchangeRates, rateType]);

    // Calculate Totals per Currency
    // Use net_amount if available, otherwise amount.
    const totalNetARS = txsARS.reduce((acc, tx) => acc + (tx.net_amount || tx.amount), 0);
    const totalUSD = txsUSD.reduce((acc, tx) => acc + tx.amount, 0);

    // Calculate Grand Total (All in USD - The "Final Instance")
    // NOTE: Using Net ARS for this calculation to be conservative/real
    const grandTotalUSD = totalUSD + (totalNetARS / conversionRate);

    const handleRateChange = (type) => {
        setRateType(type);
        if (type === 'official') setConversionRate(exchangeRates?.official || 850);
        if (type === 'blue') setConversionRate(exchangeRates?.blue || 1200);
        // custom keeps current value but allows editing
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* Currency Converter / Grand Total Card */}
            <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#0f172a' }}>Total Bruto Consolidado</h3>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
                        Suma de USD + (ARS Neto / Cotización {rateType === 'custom' ? 'Manual' : rateType === 'blue' ? 'Blue' : 'Oficial'})
                    </p>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center', background: '#f8fafc', padding: '15px', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#475569' }}>TIPO DE CAMBIO (PARA REPORTE)</span>
                            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                                {exchangeRates?.lastUpdated && (
                                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                        Act. {new Date(exchangeRates.lastUpdated).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                )}
                                <span style={{ fontSize: '10px', color: '#64748b', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                    Fuente: DolarHoy
                                </span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '5px' }}>
                            <button 
                                onClick={() => handleRateChange('official')}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: rateType === 'official' ? '1px solid var(--primary)' : '1px solid #cbd5e1', background: rateType === 'official' ? '#eff6ff' : 'white', color: rateType === 'official' ? 'var(--primary-dark)' : '#64748b', cursor: 'pointer', fontSize: '13px' }}>
                                Oficial (${exchangeRates?.official || 850})
                            </button>
                            <button 
                                onClick={() => handleRateChange('blue')}
                                style={{ padding: '6px 12px', borderRadius: '6px', border: rateType === 'blue' ? '1px solid var(--primary)' : '1px solid #cbd5e1', background: rateType === 'blue' ? '#eff6ff' : 'white', color: rateType === 'blue' ? 'var(--primary-dark)' : '#64748b', cursor: 'pointer', fontSize: '13px' }}>
                                Blue (${exchangeRates?.blue || 1200})
                            </button>
                            <input 
                                type="number" 
                                value={conversionRate} 
                                onChange={(e) => { setConversionRate(Number(e.target.value)); setRateType('custom'); }}
                                placeholder="Manual"
                                style={{ width: '80px', padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px' }}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                    <span style={{ display: 'block', fontSize: '14px', color: '#64748b', marginBottom: '4px' }}>Total Estimado (USD)</span>
                    <span style={{ fontSize: '32px', fontWeight: '800', color: '#16a34a' }}>
                        {formatUSD(grandTotalUSD)}
                    </span>
                 </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
                {/* ARS Table */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src="https://logotipoz.com/wp-content/uploads/2021/10/version-horizontal-large-logo-mercado-pago.webp" alt="MP" style={{ height: '20px' }} />
                            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Pesos (ARS)</h3>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                            <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '14px' }}>
                                Total Neto: {formatCurrencyExact(totalNetARS)}
                            </span>
                            <span style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>Post-comisiones MP</span>
                        </div>
                    </div>
                    <TransactionsTable transactions={txsARS} currencySymbol="$" />
                </div>

                {/* USD Table */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>💳</span>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Dólares (USD) - Stripe</h3>
                        </div>
                        <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '4px 12px', borderRadius: '20px', fontWeight: '700', fontSize: '14px' }}>
                            Total: {formatUSD(totalUSD)}
                        </span>
                    </div>
                    <TransactionsTable transactions={txsUSD} currencySymbol="US$" />
                </div>
            </div>
        </div>
    );
};

const TransactionsTable = ({ transactions, currencySymbol }) => (
    <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '12px' }}>
                    <th style={{ padding: '10px 0' }}>Fecha</th>
                    <th style={{ padding: '10px 0' }}>Usuario</th>
                    <th style={{ padding: '10px 0' }}>Monto</th>
                    <th style={{ padding: '10px 0' }}>Plan</th>
                </tr>
            </thead>
            <tbody>
                {transactions.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid #f8fafc', fontSize: '13px' }}>
                        <td style={{ padding: '12px 0', color: '#64748b' }}>{tx.date}</td>
                        <td style={{ padding: '12px 0', color: '#334155' }}>
                            {tx.user && typeof tx.user === 'string' && tx.user.includes('@') ? tx.user.split('@')[0] : (tx.user || 'Anon')}
                        </td>
                        <td style={{ padding: '12px 0', fontWeight: '600' }}>
                            {currencySymbol} {(tx.net_amount || tx.amount).toLocaleString()}
                        </td>
                        <td style={{ padding: '12px 0' }}>
                            <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', color: '#475569' }}>
                                {tx.plan}
                            </span>
                        </td>
                    </tr>
                ))}
                {transactions.length === 0 && (
                    <tr>
                        <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Sin transacciones</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

const KpiCard = ({ title, value, subtitle, trend, positive }) => (
    <div style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <span style={{ color: '#64748b', fontSize: '13px', fontWeight: '500' }}>{title}</span>
        <span style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a' }}>{value}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
            {trend && (
                <span style={{ 
                    color: positive || positive === undefined ? '#16a34a' : '#ef4444',
                    background: positive || positive === undefined ? '#dcfce7' : '#fee2e2',
                    padding: '2px 8px', borderRadius: '10px', fontWeight: '600'
                }}>
                    {trend}
                </span>
            )}
            {subtitle && <span style={{ color: '#94a3b8' }}>{subtitle}</span>}
        </div>
    </div>
);

export default AdminFinancials;
