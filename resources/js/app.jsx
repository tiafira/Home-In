import '../css/app.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './Components/ProtectedRoute';

import Login from './Pages/Auth/Login';
import Register from './Pages/Auth/Register';
import Unauthorized from './Pages/Unauthorized';
import AdminDashboard from './Pages/Admin/Dashboard';
import PlaceholderPage from './Pages/Admin/PlaceholderPage';

function App() {
    return (
        <AuthProvider>
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

                    {/* Placeholder pages for sidebar menus */}
                    <Route
                        path="/admin/cabang"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Kelola Cabang" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/gedung"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Gedung & Lantai" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/kamar"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Manajemen Kamar" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/fasilitas"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Fasilitas Kost" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/penghuni"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Data Penghuni" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/pegawai"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Data Pegawai" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/tamu"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Buku Tamu" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/izin-keluar"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Izin Keluar" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/pembayaran"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Pembayaran & Tagihan" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/komplain"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Layanan Komplain" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/laporan"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Laporan Bulanan" />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin/pengaturan"
                        element={
                            <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                <PlaceholderPage title="Pengaturan Sistem" />
                            </ProtectedRoute>
                        }
                    />

                    {/* Default Route */}
                    <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
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
