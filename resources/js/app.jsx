import '../css/app.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './Components/ProtectedRoute';

import Login from './Pages/Auth/Login';
import Register from './Pages/Auth/Register';
import Unauthorized from './Pages/Unauthorized';

// Admin Functional Pages
import AdminDashboard from './Pages/Admin/Dashboard';
import KamarGedung from './Pages/Admin/KamarGedung';
import Penghuni from './Pages/Admin/Penghuni';
import Booking from './Pages/Admin/Booking';
import Pembayaran from './Pages/Admin/Pembayaran';
import Komplain from './Pages/Admin/Komplain';
import IzinKeluar from './Pages/Admin/IzinKeluar';
import Pengumuman from './Pages/Admin/Pengumuman';
import Peringatan from './Pages/Admin/Peringatan';
import Laporan from './Pages/Admin/Laporan';
import LaporanBulanan from './Pages/Admin/LaporanBulanan';
import Pegawai from './Pages/Admin/Pegawai';
import Fasilitas from './Pages/Admin/Fasilitas';

function App() {
    return (
        <AuthProvider>
            <BranchProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <Routes>
                            {/* Public Guest Routes */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/unauthorized" element={<Unauthorized />} />

                    {/* Admin Protected Routes */}
                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <AdminDashboard />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/kamar"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <KamarGedung />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/penghuni"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Penghuni />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/booking"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Booking />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/pembayaran"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Pembayaran />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/komplain"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Komplain />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/izin-keluar"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <IzinKeluar />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/pengumuman"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Pengumuman />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/peringatan"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Peringatan />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/laporan"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Laporan />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/laporan-bulanan"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <LaporanBulanan />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/pegawai"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Pegawai />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/fasilitas"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <Fasilitas />
                            </ProtectedRoute>
                        }
                    />

                    {/* Default Route */}
                    <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
                </ToastProvider>
            </BranchProvider>
        </AuthProvider>
    );
}

const el = document.getElementById('app');
if (el) {
    if (!window.__app_react_root) {
        window.__app_react_root = createRoot(el);
    }
    window.__app_react_root.render(<App />);
}

export default App;
