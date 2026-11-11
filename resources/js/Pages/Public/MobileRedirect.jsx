import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PublicLayout from '../../Layouts/PublicLayout';

export default function MobileRedirect() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const roleName = user?.role === 'penjaga' ? 'Penjaga Kost' : 'Penghuni Kost';

    return (
        <PublicLayout title="Aplikasi Mobile Home-In">
            <div className="min-h-[75vh] flex items-center justify-center px-4 py-16">
                <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-slate-100 p-8 sm:p-12 text-center relative overflow-hidden">
                    {/* Background Glow */}
                    <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-100 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-100 rounded-full blur-3xl pointer-events-none" />

                    {/* App Logo */}
                    <div className="w-20 h-20 rounded-3xl bg-[#263b53] p-3 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/25 ring-8 ring-blue-50">
                        <img src="/Group 2.svg" alt="Home-In Logo" className="w-full h-full object-contain" />
                    </div>

                    {/* Role Badge */}
                    <span className="inline-block px-3.5 py-1 rounded-full bg-[#EAF1FC] text-[#1E5FC9] text-xs font-bold uppercase tracking-wider mb-3">
                        Role: {roleName}
                    </span>

                    <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1F2A44] mb-3">
                        Silakan Gunakan Aplikasi Mobile Home-In
                    </h1>

                    <p className="text-sm text-[#8A94A6] leading-relaxed mb-8 max-w-md mx-auto">
                        Halo, <strong className="text-[#1F2A44]">{user?.nama || 'Pengguna'}</strong>! Dashboard web hanya diperuntukkan bagi Admin & Pemilik Kost. Untuk aktivitas harian Anda seperti {user?.role === 'penjaga' ? 'absensi kehadiran, buka gerbang, dan laporan masalah' : 'tagihan bulanan, izin keluar, komplain, dan perpanjangan sewa'}, silakan buka melalui aplikasi mobile.
                    </p>

                    {/* Download Buttons Section */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8">
                        {/* Google Play Store Mock Button */}
                        <a
                            href="#download-playstore"
                            onClick={(e) => { e.preventDefault(); alert('Aplikasi Home-In Android akan segera hadir di Google Play Store!'); }}
                            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#1F2A44] hover:bg-slate-800 text-white flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-95 group"
                        >
                            <svg className="w-6 h-6 fill-current text-emerald-400 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path d="M3.609 1.814L13.792 12 3.61 22.186a1.996 1.996 0 01-.61-1.42V3.234c0-.543.224-1.036.609-1.42zM15.207 13.414l2.424 2.424-11.84 6.786 9.416-9.21zm2.424-5.242l-2.424 2.424-9.416-9.21 11.84 6.786zm1.484 3.013l3.327 1.905c.895.513.895 1.345 0 1.858l-3.327 1.905-2.09-2.09 2.09-2.09z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[10px] uppercase tracking-wider text-slate-300 font-medium">Download di</p>
                                <p className="text-sm font-bold leading-none">Google Play</p>
                            </div>
                        </a>

                        {/* App Store Mock Button */}
                        <a
                            href="#download-appstore"
                            onClick={(e) => { e.preventDefault(); alert('Aplikasi Home-In iOS akan segera hadir di App Store!'); }}
                            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#1F2A44] hover:bg-slate-800 text-white flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all active:scale-95 group"
                        >
                            <svg className="w-6 h-6 fill-current text-white group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-2 .6-2.65 1.35-.58.65-1.09 1.73-.95 2.76.99.08 2.06-.51 2.68-1.26z" />
                            </svg>
                            <div className="text-left">
                                <p className="text-[10px] uppercase tracking-wider text-slate-300 font-medium">Download di</p>
                                <p className="text-sm font-bold leading-none">App Store</p>
                            </div>
                        </a>
                    </div>

                    {/* QR Code Simulation */}
                    <div className="inline-flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200/80 rounded-2xl mb-8">
                        <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl p-1 flex items-center justify-center">
                            <svg className="w-10 h-10 text-[#1F2A44]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm8-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-2h2v2h-2v-2zm-6 0h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm4 0h2v4h-2v-4zm2-2h2v2h-2v-2zm0 4h2v2h-2v-2z" />
                            </svg>
                        </div>
                        <div className="text-left">
                            <p className="text-xs font-bold text-[#1F2A44]">Pindai untuk Unduh Cepat</p>
                            <p className="text-[11px] text-[#8A94A6]">Gunakan kamera ponsel Anda untuk langsung membuka link</p>
                        </div>
                    </div>

                    {/* Logout Option */}
                    <div>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            <span>Keluar atau Masuk dengan Akun Lain</span>
                        </button>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}

