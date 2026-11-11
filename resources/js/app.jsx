import '../css/app.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { BranchProvider } from './context/BranchContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './Components/ProtectedRoute';

// Auth & Access Control Pages
import Login from './Pages/Auth/Login';
import Register from './Pages/Auth/Register';
import Unauthorized from './Pages/Unauthorized';
import NotFound from './Pages/NotFound';

// Public Prospective Tenant Pages
import Home from './Pages/Public/Home';
import KamarList from './Pages/Public/KamarList';
import KamarDetail from './Pages/Public/KamarDetail';
import CabangList from './Pages/Public/CabangList';
import CabangDetail from './Pages/Public/CabangDetail';
import FaqPage from './Pages/Public/FaqPage';
import KontakPage from './Pages/Public/KontakPage';
import MobileRedirect from './Pages/Public/MobileRedirect';
import BookingSaya from './Pages/Public/BookingSaya';
import BookingWizard from './Pages/Public/BookingWizard';
import AkunProfil from './Pages/Public/AkunProfil';

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
import ProfilAdmin from './Pages/Admin/ProfilAdmin';
import ActivityLogs from './Pages/Admin/ActivityLogs';
import KelolaAkun from './Pages/Admin/KelolaAkun';
import Paket from './Pages/Admin/Paket';
import BukuTamu from './Pages/Admin/BukuTamu';
import ReservasiFasilitas from './Pages/Admin/ReservasiFasilitas';
import AdminFaq from './Pages/Admin/Faq';
import Trash from './Pages/Admin/Trash';

function App() {
    return (
        <AuthProvider>
            <BranchProvider>
                <ToastProvider>
                    <BrowserRouter>
                        <Routes>
                            {/* Public Website Routes (Calon Penghuni & Tamu Umum) */}
                            <Route path="/" element={<Home />} />
                            <Route path="/kamar" element={<KamarList />} />
                            <Route path="/kamar/:id" element={<KamarDetail />} />
                            <Route path="/cabang" element={<CabangList />} />
                            <Route path="/cabang/:id" element={<CabangDetail />} />
                            <Route path="/faq" element={<FaqPage />} />
                            <Route path="/kontak" element={<KontakPage />} />

                            {/* Public Auth Routes */}
                            <Route path="/login" element={<Login />} />
                            <Route path="/register" element={<Register />} />
                            <Route path="/unauthorized" element={<Unauthorized />} />

                            {/* Mobile App Redirect Info Page (Khusus role penghuni & penjaga) */}
                            <Route path="/mobile-app" element={<MobileRedirect />} />

                            {/* Calon Penghuni & User Protected Routes */}
                            <Route
                                path="/booking/:kamarId"
                                element={
                                    <ProtectedRoute allowedRoles={['calon_penghuni', 'admin', 'pemilik', 'user']}>
                                        <BookingWizard />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/booking-saya"
                                element={
                                    <ProtectedRoute allowedRoles={['calon_penghuni', 'admin', 'pemilik', 'user', 'penghuni']}>
                                        <BookingSaya />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/pesanan-saya"
                                element={
                                    <ProtectedRoute allowedRoles={['calon_penghuni', 'admin', 'pemilik', 'user', 'penghuni']}>
                                        <BookingSaya />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/akun"
                                element={
                                    <ProtectedRoute allowedRoles={['calon_penghuni', 'admin', 'pemilik', 'user', 'penghuni']}>
                                        <AkunProfil />
                                    </ProtectedRoute>
                                }
                            />

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
                            <Route
                                path="/admin/kelola-akun"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <KelolaAkun />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/paket"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <Paket />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/buku-tamu"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <BukuTamu />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/reservasi-fasilitas"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <ReservasiFasilitas />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/faq"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <AdminFaq />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/trash"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <Trash />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/profil"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <ProfilAdmin />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/activity-logs"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <ActivityLogs />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/aktivitas-terbaru"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <ActivityLogs />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/aktivitas"
                                element={
                                    <ProtectedRoute allowedRoles={['pemilik', 'admin']}>
                                        <ActivityLogs />
                                    </ProtectedRoute>
                                }
                            />

                            {/* 404 Catch All */}
                            <Route path="*" element={<NotFound />} />
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
