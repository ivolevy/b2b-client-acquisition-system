/**
 * Mock Financial Service
 * Simulates data that will eventually come from Supabase + Stripe/MercadoPago Webhooks
 */

export const financialService = {
    // Get Monthly Recurring Revenue (MRR) History (Last 6 Months)
    // Logic: Revenue is "Bruto". We also need to track API costs.
    getMRRHistory: async () => {
        // Mock Data: Revenue (Bruto), API Calls Count
        const history = [
            { month: 'Ago', revenue: 120000, apiCalls: 2500 },
            { month: 'Sep', revenue: 155000, apiCalls: 3800 },
            { month: 'Oct', revenue: 198000, apiCalls: 5200 },
            { month: 'Nov', revenue: 245000, apiCalls: 8900 },
            { month: 'Dic', revenue: 290000, apiCalls: 12500 },
            { month: 'Ene', revenue: 350000, apiCalls: 18000 },
        ];

        // Calculate Net Profit logic:
        // Google Maps Place Details (Contact) ~ $0.017 USD per call
        // $200 USD Free Tier
        const COST_PER_CALL_USD = 0.017;
        const FREE_TIER_USD = 200;
        const USD_TO_ARS = 1200; // Estimated exchange rate

        return history.map(item => {
            const grossCostUSD = item.apiCalls * COST_PER_CALL_USD;
            const discountUSD = Math.min(grossCostUSD, FREE_TIER_USD);
            const netCostUSD = Math.max(0, grossCostUSD - FREE_TIER_USD);

            const netCostARS = netCostUSD * USD_TO_ARS;
            const netProfit = item.revenue - netCostARS;

            return {
                ...item,
                grossCostUSD,
                netCostUSD,
                netCostARS,
                netProfit,
                freeTierUsedUSD: discountUSD
            };
        });
    },

    // Get Current Month Overview
    getCurrentOverview: async () => {
        // Re-using logic for current month (Jan/Ene)
        // Revenue: $350,000 ARS
        // API Calls: 18,000
        // Cost: 18000 * 0.017 = $306 USD
        // Free Tier: -$200 USD
        // Net Cost USD: $106 USD
        // Net Cost ARS: 106 * 1200 = $127,200 ARS

        return {
            mrr: 350000, // Bruto
            activeSubscribers: 142,
            newSubscribers: 27, // New this month
            churnRate: 2.4, // %

            // Cost Logic
            totalApiCalls: 18000,
            grossApiCostUSD: 306,
            freeTierCreditUSD: 200,
            netApiCostUSD: 106,
            netApiCostARS: 127200,

            // Profit logic
            netProfit: 350000 - 127200,
        };
    },
    // Get User Growth (Active vs Free vs Churned)
    getUserGrowth: async () => {
        return [
            { month: 'Ago', active: 40, free: 120 },
            { month: 'Sep', active: 55, free: 180 },
            { month: 'Oct', active: 78, free: 250 },
            { month: 'Nov', active: 95, free: 310 },
            { month: 'Dic', active: 115, free: 400 },
            { month: 'Ene', active: 142, free: 520 },
        ];
    },

    // Recent Transactions (Mock)
    // extended to support filters
    getRecentTransactions: async (currency = 'ALL') => {
        const allTxs = [
            { id: 101, user: 'juan@empresa.com', plan: 'Starter', amount: 20000, currency: 'ARS', date: '2024-01-30', status: 'approved' },
            { id: 102, user: 'marketing@agencia.com', plan: 'Growth', amount: 49, currency: 'USD', date: '2024-01-30', status: 'approved' },
            { id: 103, user: 'info@startup.com', plan: 'Starter', amount: 20000, currency: 'ARS', date: '2024-01-29', status: 'approved' },
            { id: 104, user: 'admin@consultora.com', plan: 'Scale', amount: 149, currency: 'USD', date: '2024-01-29', status: 'approved' },
            { id: 105, user: 'ventas@local.com', plan: 'Starter', amount: 20000, currency: 'ARS', date: '2024-01-28', status: 'approved' },
            { id: 106, user: 'soporte@tech.com', plan: 'Growth', amount: 49, currency: 'USD', date: '2024-01-28', status: 'approved' },
            { id: 107, user: 'contacto@bio.com', plan: 'Growth', amount: 49000, currency: 'ARS', date: '2024-01-27', status: 'approved' },
            { id: 108, user: 'ceo@fintech.com', plan: 'Scale', amount: 149, currency: 'USD', date: '2024-01-27', status: 'approved' },
        ];

        if (currency === 'ALL') return allTxs;
        return allTxs.filter(tx => tx.currency === currency);
    },

    getExchangeRates: async () => {
        try {
            const [officialRes, blueRes] = await Promise.all([
                fetch('https://dolarapi.com/v1/dolares/oficial'),
                fetch('https://dolarapi.com/v1/dolares/blue')
            ]);

            const official = await officialRes.json();
            const blue = await blueRes.json();

            return {
                official: official.venta,
                blue: blue.venta,
                lastUpdated: new Date()
            };
        } catch (error) {
            console.error("Error fetching exchange rates:", error);
            return { official: 850, blue: 1200, isFallback: true };
        }
    }
};
