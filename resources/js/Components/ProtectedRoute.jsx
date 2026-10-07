import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = ['pemilik', 'admin'] }) {
    const { user, token, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1E5FC9] flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl p-8 flex flex-col items-center shadow-2xl">
                    <div className="w-10 h-10 border-4 border-[#1E5FC9] border-t-transparent rounded-full animate-spin"></div>
                    <p className="mt-4 text-[#1F2A44] font-medium text-sm tracking-wide">Memverifikasi sesi...</p>
                </div>
            </div>
        );
    }

    if (!token || !user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
}
