import { API_URL } from '../config';
import { supabase } from './supabase';

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
        try {
            // Get session for auth
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) throw new Error('No session');

            // Parallel fetch: Payments and Usage
            const [paymentsRes, usageRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/payments`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
                fetch(`${API_URL}/api/admin/usage`, { headers: { 'Authorization': `Bearer ${session.access_token}` } })
            ]);

            const payments = paymentsRes.ok ? await paymentsRes.json() : [];
            const usage = usageRes.ok ? await usageRes.json() : { current_month_cost_usd: 0 };

            // Calculate MRR (Gross Revenue from Active Subscriptions)
            // For simplicity, we sum up all 'approved' payments from the last 30 days
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            const recentRevenueARS = payments
                .filter(p => new Date(p.created_at) > thirtyDaysAgo && p.status === 'approved' && p.currency === 'ARS')
                .reduce((acc, p) => acc + p.amount, 0);

            const recentRevenueUSD = payments
                .filter(p => new Date(p.created_at) > thirtyDaysAgo && p.status === 'approved' && p.currency === 'USD')
                .reduce((acc, p) => acc + p.amount, 0);

            // Estimated Exchange Rate (Mocked or fetched elsewhere, hardcoded fallback for stability)
            const USD_TO_ARS = 1200;

            const mrrUSD = recentRevenueUSD + (recentRevenueARS / USD_TO_ARS);
            const mrrARS = recentRevenueARS + (recentRevenueUSD * USD_TO_ARS); // Gross MRR in ARS

            // Cost Logic
            const grossApiCostUSD = usage.current_month_cost_usd || 0;
            const FREE_TIER_USD = 200;
            const netApiCostUSD = Math.max(0, grossApiCostUSD - FREE_TIER_USD);
            const netApiCostARS = netApiCostUSD * USD_TO_ARS;

            return {
                mrr: Math.round(mrrARS), // Displaying in ARS mostly
                activeSubscribers: new Set(payments.map(p => p.user_id)).size,
                newSubscribers: payments.filter(p => new Date(p.created_at) > thirtyDaysAgo).length, // Proxy
                churnRate: 0, // Hardcoded to 0 as per user request (no cancellations yet)

                // Real Cost Data
                totalApiCalls: 0, // Not actively returned by usage endpoint yet, relying on cost
                grossApiCostUSD,
                freeTierCreditUSD: FREE_TIER_USD,
                netApiCostUSD,
                netApiCostARS,

                // Net Profit (Gross Revenue - Net API Cost)
                netProfit: Math.round(mrrARS - netApiCostARS),
            };

        } catch (error) {
            console.error("Error fetching overview:", error);
            // Fallback to 0
            return {
                mrr: 0,
                activeSubscribers: 0,
                newSubscribers: 0,
                churnRate: 0,
                grossApiCostUSD: 0,
                freeTierCreditUSD: 200,
                netApiCostUSD: 0,
                netApiCostARS: 0,
                netProfit: 0,
            };
        }
    },
    // Get User Growth (Active vs Free vs Churned)
    getUserGrowth: async () => {
        return [
            { month: 'Ago', active: 0, free: 0 },
            { month: 'Sep', active: 0, free: 0 },
            { month: 'Oct', active: 0, free: 0 },
            { month: 'Nov', active: 0, free: 0 },
            { month: 'Dic', active: 0, free: 0 },
            { month: 'Ene', active: 1, free: 0 }, // 1 Active user (current reality)
        ];
    },

    // Recent Transactions (Mock)
    // extended to support filters
    // Recent Transactions (Real from API)
    getRecentTransactions: async (currency = 'ALL') => {
        try {
            // Get session for auth
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) return [];

            const response = await fetch(`${API_URL}/api/admin/payments`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch payments');

            const payments = await response.json();

            // Map backend format to frontend format
            const mappedTxs = payments.map(p => ({
                id: p.id,
                user: p.user_email || p.email || p.user_id || 'Usuario Anonimo',
                plan: p.plan_id ? p.plan_id.charAt(0).toUpperCase() + p.plan_id.slice(1) : 'Unknown',
                amount: p.amount,
                net_amount: p.net_amount, // Critical for user request
                currency: p.currency || 'ARS',
                date: new Date(p.created_at).toISOString().split('T')[0],
                status: p.status
            }));

            if (currency === 'ALL') return mappedTxs;
            return mappedTxs.filter(tx => tx.currency === currency);
        } catch (error) {
            console.error("Error fetching transactions:", error);
            return [];
        }
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
