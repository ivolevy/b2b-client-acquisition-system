
import React, { useState, useEffect } from 'react';
import './AdminPayments.css';
import { useAuth } from '../../context/AuthContext';
import { API_URL } from '../../config';
import { FaMoneyBillWave, FaCreditCard, FaCalendarAlt, FaSearch, FaFilter, FaDownload } from 'react-icons/fa';

const AdminPayments = () => {
    const { token } = useAuth();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        fetchPayments();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await fetch(`${API_URL}/api/admin/payments`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setPayments(data);
            }
        } catch (error) {
            console.error("Error fetching payments:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(amount);
    };

    const getMethodIcon = (methodId) => {
        if (!methodId) return <FaMoneyBillWave className="text-gray-400" />;
        if (methodId.includes('visa') || methodId.includes('master') || methodId.includes('amex')) return <FaCreditCard className="text-blue-500" />;
        if (methodId.includes('account_money')) return <FaMoneyBillWave className="text-green-500" />;
        return <FaCreditCard className="text-gray-500" />;
    };

    // Calcular totales
    const totalGross = payments.reduce((acc, curr) => acc + (curr.amount || 0), 0);
    const totalNet = payments.reduce((acc, curr) => acc + (curr.net_amount || curr.amount || 0), 0);
    const totalFees = totalGross - totalNet;

    return (
        <div className="admin-content">
            <header className="admin-header">
                <div>
                    <h1>Tablero Financiero</h1>
                    <p className="admin-subtitle">Historial de pagos y comisiones MercadoPago</p>
                </div>
            </header>

            {/* Financial Cards */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon bg-blue-100 text-blue-600">
                        <FaMoneyBillWave />
                    </div>
                    <div className="stat-info">
                        <h3>Ingresos Brutos</h3>
                        <p className="stat-value">{formatCurrency(totalGross)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-green-100 text-green-600">
                        <FaMoneyBillWave />
                    </div>
                    <div className="stat-info">
                        <h3>Ingresos Netos (Ganancia)</h3>
                        <p className="stat-value text-green-600">{formatCurrency(totalNet)}</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon bg-red-100 text-red-600">
                        <FaFilter />
                    </div>
                    <div className="stat-info">
                        <h3>Comisiones MP</h3>
                        <p className="stat-value text-red-500">-{formatCurrency(totalFees)}</p>
                    </div>
                </div>
            </div>

            {/* Payments Table */}
            <div className="admin-card mt-8">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Usuario</th>
                            <th>Plan</th>
                            <th>Método</th>
                            <th>Monto Bruto</th>
                            <th>Monto Neto</th>
                            <th>Comisión</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" className="text-center py-8">Cargando pagos...</td></tr>
                        ) : payments.length === 0 ? (
                            <tr><td colSpan="8" className="text-center py-8 text-gray-400">No hay pagos registrados aún.</td></tr>
                        ) : (
                            payments.map((p) => (
                                <tr key={p.id}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <FaCalendarAlt className="text-gray-400" />
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td>{p.user_id?.substring(0,8)}...</td>
                                    <td>
                                        <span className="px-2 py-1 rounded bg-gray-100 text-xs font-semibold uppercase">
                                            {p.plan_id}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            {getMethodIcon(p.payment_method_id)}
                                            <span className="capitalize">{p.payment_type_id?.replace('_', ' ') || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="font-semibold">{formatCurrency(p.amount)}</td>
                                    <td className="font-bold text-green-600">{formatCurrency(p.net_amount || p.amount)}</td>
                                    <td className="text-red-500 text-sm">
                                        {p.net_amount ? formatCurrency(p.amount - p.net_amount) : '-'}
                                    </td>
                                    <td>
                                        <span className={`status-badge status-${p.status === 'approved' ? 'valid' : 'pending'}`}>
                                            {p.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminPayments;
