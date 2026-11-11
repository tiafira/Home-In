import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import FourSquareLoader from './UI/FourSquareLoader';

export default function ProtectedRoute({ children, allowedRoles = ['pemilik', 'admin'] }) {
    const { user, token, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-10 flex flex-col items-center shadow-2xl">
                    <FourSquareLoader size={100} label="Memverifikasi sesi..." />
                </div>
            </div>
        );
    }

    if (!token || !user) {
        const redirectUrl = location.pathname !== '/'
            ? `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`
            : '/login';
        return <Navigate to={redirectUrl} replace />;
    }

    // Penghuni & Penjaga are directed to the mobile app landing page
    if (['penghuni', 'penjaga'].includes(user.role) && !allowedRoles.includes(user.role)) {
        return <Navigate to="/mobile-app" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
