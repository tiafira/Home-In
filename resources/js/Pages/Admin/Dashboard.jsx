import React, { useState, useEffect } from 'react';
import Header from '../../Components/Admin/Header';
import Sidebar from '../../Components/Admin/Sidebar';
import StatCards from '../../Components/Admin/StatCard';
import PaymentTable from '../../Components/Admin/PaymentTable';
import ComplaintTable from '../../Components/Admin/ComplaintTable';
import api from '../../services/api';

export default function Dashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showPlaceholderModal, setShowPlaceholderModal] = useState(false);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/admin/dashboard');
            if (res.data && res.data.data) {
                setDashboardData(res.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat data dashboard.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, []);

    return (
        <div style={{ backgroundColor: '#1E5FC9' }} className="min-h-screen p-3 md:p-7 flex items-center justify-center antialiased text-[#1F2A44] bg-[#1E5FC9]">
            <div className="w-full max-w-[1440px] h-[930px] max-h-[96vh] bg-white rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative" data-purpose="main-container">
                <Header />

                <div className="flex-1 flex flex-row overflow-hidden relative">
                    <Sidebar
                        occupancy={dashboardData?.occupancy}
                        onAddPenghuniClick={() => setShowPlaceholderModal(true)}
                    />

                    <main className="flex-1 h-full overflow-y-auto main-scroll px-6 md:px-10 py-6 bg-white" data-purpose="content-area">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <h1 className="text-[28px] font-bold text-[#1E5FC9] tracking-tight">Dashboard</h1>
                                <button
                                    onClick={fetchDashboard}
                                    title="Segarkan Data"
                                    aria-label="Refresh context"
                                    className="w-8 h-8 rounded-lg bg-[#1E5FC9] text-white flex items-center justify-center shadow-sm hover:opacity-90 transition cursor-pointer"
                                    type="button"
                                >
                                    <svg className={'w-4 h-4 ' + (loading ? 'animate-spin' : '')} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex items-center gap-2 text-[#8A94A6]">
                                <button aria-label="Tampilan grid" className="p-2 rounded-lg hover:bg-[#F4F6FA] hover:text-[#1F2A44] transition-colors cursor-pointer" type="button">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </svg>
                                </button>
                                <button aria-label="Tampilan list" className="p-2 rounded-lg hover:bg-[#F4F6FA] hover:text-[#1F2A44] transition-colors cursor-pointer" type="button">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </svg>
                                </button>
                                <button aria-label="Informasi" className="p-2 rounded-lg hover:bg-[#F4F6FA] hover:text-[#1F2A44] transition-colors cursor-pointer" type="button">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <circle cx="12" cy="12" r="9"></circle>
                                        <line strokeLinecap="round" strokeWidth="2.5" x1="12" x2="12.01" y1="8" y2="8"></line>
                                        <path d="M11 12h1v4h1" strokeLinecap="round" strokeLinejoin="round"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    <span>{error}</span>
                                </div>
                                <button
                                    onClick={fetchDashboard}
                                    className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                                >
                                    Coba Lagi
                                </button>
                            </div>
                        )}

                        <StatCards data={dashboardData?.quick_access} loading={loading} />

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
                            <div className="lg:col-span-8">
                                <PaymentTable payments={dashboardData?.pembayaran_terbaru} loading={loading} />
                            </div>
                            <div className="lg:col-span-4">
                                <ComplaintTable complaints={dashboardData?.komplain_terbaru} loading={loading} />
                            </div>
                        </div>
                    </main>
                </div>
            </div>

            {/* Placeholder Modal for Tambah Penghuni */}
            {showPlaceholderModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#1E5FC9] flex items-center justify-center mb-4">
                            <svg className="w-6 h-6 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.765z" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-[#1F2A44] mb-2">Tambah Penghuni</h3>
                        <p className="text-sm text-[#8A94A6] mb-6">
                            Fitur penambahan penghuni kost sedang dalam persiapan. Data kamar dan penghuni aktif saat ini sudah dapat dipantau langsung pada metrik dashboard.
                        </p>
                        <button
                            onClick={() => setShowPlaceholderModal(false)}
                            className="w-full py-3 bg-[#1E5FC9] text-white rounded-xl font-semibold hover:bg-blue-700 transition cursor-pointer"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
