import React, { useEffect, useState } from 'react';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import { financialService } from '../../lib/financialService';

const AdminFinancials = () => {
    const [activeTab, setActiveTab] = useState('overview'); // overview, revenue, costs, transactions
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

    const { overview, mrr, growth, txsARS, txsUSD, exchangeRates } = data;
    const formatCurrency = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(val);
    const formatCurrencyExact = (val) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
    const formatUSD = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>Panel Financiero</h1>
                <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '8px', display: 'flex', gap: '4px' }}>
                    {['overview', 'transactions', 'revenue', 'costs'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '6px',
                                border: 'none',
                                background: activeTab === tab ? 'white' : 'transparent',
                                color: activeTab === tab ? '#0f172a' : '#64748b',
                                fontWeight: activeTab === tab ? '600' : '500',
                                boxShadow: activeTab === tab ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                transition: 'all 0.2s'
                            }}
                        >
                            {tab === 'overview' ? 'Resumen' : tab === 'revenue' ? 'Ingresos' : tab === 'costs' ? 'Costos' : 'Transacciones'}
                        </button>
                    ))}
                </div>
            </div>

            {/* VIEWS */}
            {activeTab === 'overview' && (
                <OverviewView overview={overview} mrrData={mrr} formatCurrency={formatCurrency} formatUSD={formatUSD} />
            )}

            {activeTab === 'revenue' && (
                <RevenueView overview={overview} mrrData={mrr} growthData={growth} formatCurrency={formatCurrency} />
            )}

            {activeTab === 'costs' && (
                <CostsView overview={overview} formatUSD={formatUSD} formatCurrency={formatCurrency} />
            )}

            {activeTab === 'transactions' && (
                <TransactionsView 
                    txsARS={txsARS} 
                    txsUSD={txsUSD} 
                    exchangeRates={exchangeRates}
                    formatCurrency={formatCurrency} 
                    formatCurrencyExact={formatCurrencyExact}
                    formatUSD={formatUSD} 
                />
            )}
        </div>
    );
};

// --- SUB-VIEWS ---

const OverviewView = ({ overview, mrrData, formatCurrency, formatUSD }) => (
    <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '30px' }}>
            <KpiCard title="Ingreso Recurrente (MRR)" value={formatCurrency(overview.mrr)} trend="+15%" positive />
            <KpiCard title="Ganancia Neta" value={formatCurrency(overview.netProfit)} trend="+12%" positive />
            <KpiCard title="Usuarios Activos" value={overview.activeSubscribers} subtitle={`+${overview.newSubscribers} mes actual`} />
        </div>
        <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '400px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '20px', color: '#334155' }}>Profit vs Revenue</h3>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mrrData}>
                    <defs>
                        <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                    <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                    <Legend />
                    <Area type="monotone" dataKey="revenue" name="Ingreso Total" stroke="#94a3b8" strokeWidth={2} fill="none" />
                    <Area type="monotone" dataKey="netProfit" name="Ganancia Neta" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorNet)" />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    </>
);

const RevenueView = ({ overview, mrrData, growthData, formatCurrency }) => (
    <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', marginBottom: '30px' }}>
            <KpiCard title="Nuevas Suscripciones" value={overview.newSubscribers} subtitle="Este mes" trend="+5%" positive />
            <KpiCard title="Churn Rate (Cancelaciones)" value={`${overview.churnRate}%`} subtitle="Promedio mensual" trend="-0.5%" positive />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0', height: '350px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', color: '#334155' }}>Evolución de Ingresos</h3>
                <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={mrrData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                        <Tooltip formatter={(value) => formatCurrency(value)} cursor={{fill: '#f8fafc'}} />
                        <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </>
);

const CostsView = ({ overview, formatUSD }) => {
    // Volume Simulator State
    const [targetLeadsVolume, setTargetLeadsVolume] = useState(10000); // Monthly Leads Goal
    
    // Constants from Billing Plan & API
    const COST_PER_LEAD = 0.03; // Avg risk adjusted (Nearby + Details)
    const REVENUE_PER_LEAD = 0.13; // Revenue from 5 credits (Starter Plan base)
    const MARGIN_PER_LEAD = REVENUE_PER_LEAD - COST_PER_LEAD;
    const FREE_TIER = 200;

    // Projected Calculations
    const projectedGrossCost = targetLeadsVolume * COST_PER_LEAD;
    const projectedNetCost = Math.max(0, projectedGrossCost - FREE_TIER);
    const projectedGrossRevenue = targetLeadsVolume * REVENUE_PER_LEAD;
    const projectedProfit = projectedGrossRevenue - projectedNetCost;
    const projectedMargin = (projectedProfit / projectedGrossRevenue) * 100;
    
    // Current Period Analysis
    const freeTierRemaining = Math.max(0, FREE_TIER - overview.grossApiCostUSD);
    const currentMargin = ((overview.mrr - overview.netApiCostUSD) / overview.mrr) * 100;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
            
            {/* 1. ACTUAL PERFORMANCE (ECONOMIST SUMMARY) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>STATUS FREE TIER (GOOGLE)</span>
                    <div style={{ fontSize: '24px', fontWeight: '800', margin: '10px 0', color: freeTierRemaining > 0 ? '#10b981' : '#ef4444' }}>
                        {formatUSD(freeTierRemaining)} <span style={{ fontSize: '14px', fontWeight: '400', color: '#94a3b8' }}>disp.</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, (overview.grossApiCostUSD / FREE_TIER) * 100)}%`, height: '100%', background: 'var(--primary)' }}></div>
                    </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>COSTO REAL API (MES ACTUAL)</span>
                    <div style={{ fontSize: '24px', fontWeight: '800', margin: '10px 0', color: '#0f172a' }}>
                        {formatUSD(overview.netApiCostUSD)}
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Post-descuento de $200 USD</span>
                </div>

                <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: '600' }}>MARGEN OPERATIVO LTM</span>
                    <div style={{ fontSize: '24px', fontWeight: '800', margin: '10px 0', color: '#16a34a' }}>
                        {currentMargin.toFixed(1)}%
                    </div>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Profit neto sobre facturación</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '30px' }}>
                
                {/* 2. UNIT ECONOMICS (THE "CORE") */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: '#eff6ff', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px' }}>📊</span> 
                        Unit Economics (Por Lead)
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '600', color: '#334155' }}>Ingreso Bruto / Lead</span>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Consumo 5 créditos</span>
                            </div>
                            <span style={{ color: '#16a34a', fontWeight: '700' }}>+ {formatUSD(REVENUE_PER_LEAD)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: '600', color: '#334155' }}>Costo API Google</span>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Search + Details (Avg)</span>
                            </div>
                            <span style={{ color: '#ef4444', fontWeight: '700' }}>- {formatUSD(COST_PER_LEAD)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '20px 0', marginTop: '10px' }}>
                            <span style={{ fontWeight: '800', color: '#0f172a', fontSize: '18px' }}>MARGEN NETO / LEAD</span>
                            <span style={{ color: '#16a34a', fontWeight: '900', fontSize: '20px' }}>{formatUSD(MARGIN_PER_LEAD)}</span>
                        </div>
                        <div style={{ background: '#f0fdf4', padding: '15px', borderRadius: '12px', marginTop: '10px' }}>
                            <span style={{ fontSize: '13px', color: '#166534', fontWeight: '600' }}>ROI por Unidad: 333%</span>
                            <p style={{ fontSize: '12px', color: '#166534', margin: '5px 0 0 0' }}>Cada $1 invertido en Google API retorna $4.33 en facturación bruta.</p>
                        </div>
                    </div>
                </div>

                {/* 3. SCALABILITY PREDICTOR */}
                <div style={{ background: 'white', padding: '25px', borderRadius: '16px', border: '2px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a' }}>Simulador de Escala (Predicción)</h3>
                        <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' }}>PROYECCIÓN LTM</span>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <label style={{ fontSize: '14px', color: '#475569', fontWeight: '600' }}>Volumen de Extracciones Mensuales (Leads)</label>
                            <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '18px' }}>{targetLeadsVolume.toLocaleString()}</span>
                        </div>
                        <input 
                            type="range" min="1000" max="100000" step="1000" value={targetLeadsVolume} 
                            onChange={(e) => setTargetLeadsVolume(Number(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--primary)', height: '6px' }} 
                        />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>Low Volume (1k)</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8' }}>High Growth (100k)</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                        <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700' }}>FACTURA GOOGLE (EST.)</span>
                            <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '5px', color: projectedNetCost > 0 ? '#ef4444' : '#10b981' }}>
                                {formatUSD(projectedNetCost)}
                            </div>
                            {projectedNetCost === 0 && <span style={{ fontSize: '10px', color: '#16a34a' }}>✓ Cubierto por Free Tier</span>}
                        </div>
                        <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                            <span style={{ fontSize: '11px', color: '#0369a1', fontWeight: '700' }}>UTILIDAD PROYECTADA</span>
                            <div style={{ fontSize: '20px', fontWeight: '800', marginTop: '5px', color: '#0369a1' }}>
                                {formatUSD(projectedProfit)}
                            </div>
                            <span style={{ fontSize: '10px', color: '#0369a1' }}>Margen {projectedMargin.toFixed(1)}%</span>
                        </div>
                    </div>

                    <div style={{ marginTop: '25px', padding: '15px', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#475569' }}>
                            <span style={{ fontSize: '18px' }}>💡</span>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>
                                Punto de Equilibrio Google API: **{Math.round(FREE_TIER / COST_PER_LEAD).toLocaleString()} leads**. 
                                <br/><span style={{ fontSize: '11px', color: '#94a3b8' }}>A partir de allí comienzas a pagar consumo real (usualmente {'>'}40 clientes Starter).</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
                        <td style={{ padding: '12px 0', color: '#334155' }}>{tx.user.split('@')[0]}</td>
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
