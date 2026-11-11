import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

export default function Sidebar({
    occupancy,
    bookingCount = 0,
    onAddPenghuniClick,
    mobileOpen = false,
    onCloseMobile,
}) {
    const location = useLocation();

    // Determine active group based on path
    const isBangunanActive = ['/admin/kamar', '/admin/fasilitas'].some((p) => location.pathname.startsWith(p));
    const isPenggunaActive = ['/admin/kelola-akun', '/admin/penghuni', '/admin/booking', '/admin/pegawai'].some((p) => location.pathname.startsWith(p));
    const isOperasionalActive = ['/admin/komplain', '/admin/reservasi-fasilitas', '/admin/izin-keluar', '/admin/buku-tamu', '/admin/paket'].some((p) => location.pathname.startsWith(p));
    const isInformasiActive = ['/admin/pengumuman', '/admin/peringatan'].some((p) => location.pathname.startsWith(p));
    const isTransaksiActive = ['/admin/pembayaran', '/admin/laporan', '/admin/laporan-bulanan'].some((p) => location.pathname.startsWith(p));
    const isSistemActive = ['/admin/faq', '/admin/trash', '/admin/activity-logs', '/admin/aktivitas'].some((p) => location.pathname.startsWith(p));

    // Accordion open/close state
    const [openGroups, setOpenGroups] = useState({
        bangunan: isBangunanActive,
        pengguna: isPenggunaActive,
        operasional: isOperasionalActive,
        informasi: isInformasiActive,
        transaksi: isTransaksiActive,
        sistem: isSistemActive,
    });

    useEffect(() => {
        if (isBangunanActive) setOpenGroups((prev) => ({ ...prev, bangunan: true }));
        if (isPenggunaActive) setOpenGroups((prev) => ({ ...prev, pengguna: true }));
        if (isOperasionalActive) setOpenGroups((prev) => ({ ...prev, operasional: true }));
        if (isInformasiActive) setOpenGroups((prev) => ({ ...prev, informasi: true }));
        if (isTransaksiActive) setOpenGroups((prev) => ({ ...prev, transaksi: true }));
        if (isSistemActive) setOpenGroups((prev) => ({ ...prev, sistem: true }));
    }, [location.pathname]);

    const toggleGroup = (key) => {
        setOpenGroups((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const kamarOccupancy = occupancy?.kamar || {
        terisi: 0,
        total: 0,
        percent: 0,
        label: '0 / 0 kamar terisi',
    };

    const bayarOccupancy = occupancy?.pembayaran || {
        lunas: 0,
        total: 0,
        percent: 0,
        label: '0 / 0 sudah lunas',
    };

    const groups = [
        {
            key: 'bangunan',
            title: 'Kelola Bangunan',
            isActive: isBangunanActive,
            icon: (
                <svg className="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5V21" />
                </svg>
            ),
            children: [
                { name: 'Gedung & Kamar', path: '/admin/kamar' },
                { name: 'Fasilitas', path: '/admin/fasilitas' },
            ],
        },
        {
            key: 'pengguna',
            title: 'Manajemen Pengguna',
            isActive: isPenggunaActive,
            icon: (
                <svg className="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            ),
            children: [
                { name: 'Kelola Akun', path: '/admin/kelola-akun' },
                { name: 'Penghuni', path: '/admin/penghuni' },
                { name: 'Calon Penghuni', path: '/admin/booking', badge: bookingCount > 0 ? bookingCount : null },
                { name: 'Karyawan', path: '/admin/pegawai' },
            ],
        },
        {
            key: 'operasional',
            title: 'Operasional & Keamanan',
            isActive: isOperasionalActive,
            icon: (
                <svg className="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
            ),
            children: [
                { name: 'Komplain', path: '/admin/komplain' },
                { name: 'Reservasi Fasilitas', path: '/admin/reservasi-fasilitas' },
                { name: 'Izin Keluar', path: '/admin/izin-keluar' },
                { name: 'Buku Tamu', path: '/admin/buku-tamu' },
                { name: 'Penerimaan Paket', path: '/admin/paket' },
            ],
        },
        {
            key: 'informasi',
            title: 'Informasi',
            isActive: isInformasiActive,
            icon: (
                <svg className="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.111-1.528-.453a18.067 18.067 0 01-1.32-3.821m2.983-.4zM14.25 15.75c0 .621-.504 1.125-1.125 1.125s-1.125-.504-1.125-1.125" />
                </svg>
            ),
            children: [
                { name: 'Pengumuman', path: '/admin/pengumuman' },
                { name: 'Peringatan', path: '/admin/peringatan' },
            ],
        },
        {
            key: 'transaksi',
            title: 'Transaksi & Laporan',
            isActive: isTransaksiActive,
            icon: (
                <svg className="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
            ),
            children: [
                { name: 'Pembayaran', path: '/admin/pembayaran' },
                { name: 'Laporan', path: '/admin/laporan' },
            ],
        },
        {
            key: 'sistem',
            title: 'Sistem',
            isActive: isSistemActive,
            icon: (
                <svg className="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            ),
            children: [
                { name: 'FAQ', path: '/admin/faq' },
                { name: 'Aktivitas Terbaru', path: '/admin/activity-logs' },
                { name: 'Baru Saja Dihapus', path: '/admin/trash' },
            ],
        },
    ];

    const sidebarContent = (
        <aside
            style={{ backgroundColor: '#263b53' }}
            className="w-[260px] h-full flex flex-col justify-between text-white overflow-hidden py-4 px-3 sm:px-4 shrink-0 select-none shadow-xl border-r border-white/5"
        >
            <div className="flex flex-col h-full overflow-hidden">
                {/* Tambah Penghuni Quick Action Button */}
                <button
                    onClick={onAddPenghuniClick}
                    className="w-full py-2.5 rounded-xl bg-white text-[#263b53] font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shrink-0 mb-4 cursor-pointer"
                    type="button"
                >
                    <svg className="w-4 h-4 stroke-[2.5] text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Tambah Penghuni</span>
                </button>

                {/* Navigation Menu with Sub-Menus / Accordions */}
                <nav className="flex-1 overflow-y-auto sidebar-scroll space-y-1 pr-1 text-xs sm:text-sm font-medium">
                    {/* Dashboard direct link */}
                    <NavLink
                        to="/admin/dashboard"
                        onClick={onCloseMobile}
                        className={({ isActive }) =>
                            'flex items-center justify-between px-3 py-2 rounded-xl transition-all ' +
                            (isActive
                                ? 'bg-white text-[#263b53] font-bold shadow-sm'
                                : 'text-slate-300 hover:text-white hover:bg-white/10')
                        }
                    >
                        <div className="flex items-center gap-2.5">
                            <svg className="w-4 h-4 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                            </svg>
                            <span>Dashboard</span>
                        </div>
                    </NavLink>

                    {/* Group Accordions */}
                    {groups.map((group) => {
                        const isOpen = openGroups[group.key];
                        return (
                            <div key={group.key} className="space-y-0.5 pt-0.5">
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(group.key)}
                                    className={
                                        'w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all cursor-pointer text-xs ' +
                                        (group.isActive
                                            ? 'bg-white/15 text-white font-bold'
                                            : 'text-slate-300 hover:text-white hover:bg-white/10')
                                    }
                                >
                                    <div className="flex items-center gap-2.5">
                                        {group.icon}
                                        <span className="font-semibold text-xs">{group.title}</span>
                                    </div>
                                    <svg
                                        className={'w-3.5 h-3.5 transition-transform duration-200 ' + (isOpen ? 'rotate-180' : '')}
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2.5"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                </button>

                                {isOpen && (
                                    <div className="pl-7 pr-1 space-y-0.5 animate-in slide-in-from-top-1 duration-150">
                                        {group.children.map((child) => (
                                            <NavLink
                                                key={child.name}
                                                to={child.path}
                                                onClick={onCloseMobile}
                                                className={({ isActive }) => {
                                                    const currentActive = child.path.includes('?')
                                                        ? location.pathname + location.search === child.path
                                                        : location.pathname === child.path;
                                                    return (
                                                        'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ' +
                                                        (currentActive
                                                            ? 'bg-white text-[#263b53] font-bold shadow-xs'
                                                            : 'text-slate-300 hover:text-white hover:bg-white/10')
                                                    );
                                                }}
                                            >
                                                <span>{child.name}</span>
                                                {child.badge && (
                                                    <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold shadow-xs">
                                                        {child.badge}
                                                    </span>
                                                )}
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* Divider */}
            <div className="border-t border-white/15 my-3 shrink-0"></div>

            {/* Compact Occupancy Widget */}
            <div className="shrink-0 text-xs bg-white/5 rounded-2xl p-3 border border-white/10">
                <div className="flex items-center justify-between text-slate-300 uppercase font-bold text-[10px] tracking-wider mb-2">
                    <span>Okupansi Kost</span>
                    <span className="text-[#60a5fa]">Live</span>
                </div>

                <div className="mb-2">
                    <div className="flex items-center justify-between text-white font-semibold mb-1 text-[11px]">
                        <span>Kamar Terisi</span>
                        <span>{kamarOccupancy.percent}%</span>
                    </div>
                    <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-[#3b82f6] h-full rounded-full transition-all duration-500"
                            style={{ width: Math.min(100, Math.max(0, kamarOccupancy.percent)) + '%' }}
                        ></div>
                    </div>
                    <span className="text-[10px] text-slate-300 block mt-0.5">{kamarOccupancy.label}</span>
                </div>

                <div>
                    <div className="flex items-center justify-between text-white font-semibold mb-1 text-[11px]">
                        <span>Tagihan Lunas</span>
                        <span>{bayarOccupancy.percent}%</span>
                    </div>
                    <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                            style={{ width: Math.min(100, Math.max(0, bayarOccupancy.percent)) + '%' }}
                        ></div>
                    </div>
                    <span className="text-[10px] text-slate-300 block mt-0.5">{bayarOccupancy.label}</span>
                </div>
            </div>
        </aside>
    );

    return (
        <>
            {/* Desktop Fixed Sidebar */}
            <div className="hidden lg:block h-[calc(100vh-72px)] sticky top-[72px] shrink-0 z-20">
                {sidebarContent}
            </div>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-50 lg:hidden flex">
                    <div
                        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in"
                        onClick={onCloseMobile}
                    ></div>
                    <div className="relative w-[270px] h-full z-10 animate-in slide-in-from-left duration-200">
                        {sidebarContent}
                    </div>
                </div>
            )}
        </>
    );
}
