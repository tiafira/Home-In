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
    const isLaporanActive =
        location.pathname.startsWith('/admin/laporan') ||
        location.pathname.startsWith('/admin/laporan-bulanan');

    const [laporanOpen, setLaporanOpen] = useState(isLaporanActive);

    useEffect(() => {
        if (isLaporanActive) {
            setLaporanOpen(true);
        }
    }, [isLaporanActive]);

    const kamarOccupancy = occupancy?.kamar || {
        terisi: 38,
        total: 50,
        percent: 76,
        label: '38 / 50 kamar terisi',
    };

    const bayarOccupancy = occupancy?.pembayaran || {
        lunas: 38,
        total: 38,
        percent: 100,
        label: '38 / 38 sudah lunas',
    };

    const menuItems = [
        {
            name: 'Dashboard',
            path: '/admin/dashboard',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
            ),
        },
        {
            name: 'Kamar & Gedung',
            path: '/admin/kamar',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5V21" />
                </svg>
            ),
        },
        {
            name: 'Penghuni',
            path: '/admin/penghuni',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
            ),
        },
        {
            name: 'Booking',
            path: '/admin/booking',
            badge: bookingCount > 0 ? bookingCount : null,
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
            ),
        },
        {
            name: 'Pembayaran',
            path: '/admin/pembayaran',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
                </svg>
            ),
        },
        {
            name: 'Komplain',
            path: '/admin/komplain',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
            ),
        },
        {
            name: 'Izin Keluar',
            path: '/admin/izin-keluar',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
            ),
        },
        {
            name: 'Pengumuman',
            path: '/admin/pengumuman',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.111-1.528-.453a18.067 18.067 0 01-1.32-3.821m2.983-.4zM14.25 15.75c0 .621-.504 1.125-1.125 1.125s-1.125-.504-1.125-1.125" />
                </svg>
            ),
        },
        {
            name: 'Peringatan',
            path: '/admin/peringatan',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            ),
        },
        {
            name: 'Laporan',
            isSubmenu: true,
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
            ),
            children: [
                {
                    name: 'Laporan Tamu & Pulang',
                    path: '/admin/laporan',
                },
                {
                    name: 'Laporan Bulanan',
                    path: '/admin/laporan-bulanan',
                },
            ],
        },
        {
            name: 'Pegawai',
            path: '/admin/pegawai',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
            ),
        },
        {
            name: 'Fasilitas',
            path: '/admin/fasilitas',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.948c0-.621-.504-1.125-1.125-1.125H5.625c-.621 0-1.125.504-1.125 1.125v1.729m12 0h-12" />
                </svg>
            ),
        },
    ];

    const sidebarContent = (
        <aside
            style={{ backgroundColor: '#263b53' }}
            className="w-[260px] h-full flex flex-col justify-between text-white overflow-hidden py-5 px-4 sm:px-5 shrink-0 select-none shadow-xl border-r border-white/5"
        >
            <div className="flex flex-col h-full overflow-hidden">
                {/* Tambah Penghuni Button */}
                <button
                    onClick={onAddPenghuniClick}
                    className="w-full py-2.5 rounded-xl bg-white text-[#263b53] font-bold text-sm shadow-md flex items-center justify-center gap-2 hover:bg-slate-100 transition-all shrink-0 mb-5 cursor-pointer"
                    type="button"
                >
                    <svg className="w-4 h-4 stroke-[2.5] text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    <span>Tambah Penghuni</span>
                </button>

                {/* Menus list with nested Laporan submenu */}
                <nav className="flex-1 overflow-y-auto sidebar-scroll space-y-1 pr-1 text-sm font-medium">
                    {menuItems.map((item) => {
                        if (item.isSubmenu) {
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        type="button"
                                        onClick={() => setLaporanOpen(!laporanOpen)}
                                        className={
                                            'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer ' +
                                            (isLaporanActive
                                                ? 'bg-white/15 text-white font-bold shadow-xs'
                                                : 'text-slate-300 hover:text-white hover:bg-white/10')
                                        }
                                    >
                                        <div className="flex items-center gap-3">
                                            {item.icon}
                                            <span>{item.name}</span>
                                        </div>
                                        <svg
                                            className={'w-4 h-4 transition-transform duration-200 ' + (laporanOpen ? 'rotate-180' : '')}
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2.5"
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                        </svg>
                                    </button>

                                    {laporanOpen && (
                                        <div className="pl-9 pr-1 space-y-1">
                                            {item.children.map((child) => (
                                                <NavLink
                                                    key={child.path}
                                                    to={child.path}
                                                    end
                                                    onClick={onCloseMobile}
                                                    className={({ isActive }) =>
                                                        'block px-3 py-2 rounded-lg text-xs transition-all ' +
                                                        (isActive
                                                            ? 'bg-white text-[#263b53] font-bold shadow-sm'
                                                            : 'text-slate-300 hover:text-white hover:bg-white/10')
                                                    }
                                                >
                                                    {child.name}
                                                </NavLink>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <NavLink
                                key={item.name}
                                to={item.path}
                                onClick={onCloseMobile}
                                className={({ isActive }) =>
                                    'flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all ' +
                                    (isActive
                                        ? 'bg-white text-[#263b53] font-bold shadow-sm'
                                        : 'text-slate-300 hover:text-white hover:bg-white/10')
                                }
                            >
                                <div className="flex items-center gap-3">
                                    {item.icon}
                                    <span>{item.name}</span>
                                </div>
                                {item.badge && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-xs font-extrabold shadow-xs">
                                        {item.badge}
                                    </span>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>
            </div>

            {/* Divider */}
            <div className="border-t border-white/15 my-3 shrink-0"></div>

            {/* Compact Occupancy Widget */}
            <div className="shrink-0 text-xs bg-white/5 rounded-2xl p-3.5 border border-white/10">
                <div className="flex items-center justify-between text-slate-300 uppercase font-bold text-[10px] tracking-wider mb-2.5">
                    <span>Okupansi Kost</span>
                    <span className="text-[#60a5fa]">Live</span>
                </div>

                <div className="mb-2.5">
                    <div className="flex items-center justify-between text-white font-semibold mb-1 text-xs">
                        <span>Kamar Terisi</span>
                        <span>{kamarOccupancy.percent}%</span>
                    </div>
                    <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-[#3b82f6] h-full rounded-full transition-all duration-500"
                            style={{ width: Math.min(100, Math.max(0, kamarOccupancy.percent)) + '%' }}
                        ></div>
                    </div>
                    <span className="text-[11px] text-slate-300 block mt-0.5">{kamarOccupancy.label}</span>
                </div>

                <div>
                    <div className="flex items-center justify-between text-white font-semibold mb-1 text-xs">
                        <span>Tagihan Lunas</span>
                        <span>{bayarOccupancy.percent}%</span>
                    </div>
                    <div className="w-full bg-white/15 h-1.5 rounded-full overflow-hidden">
                        <div
                            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                            style={{ width: Math.min(100, Math.max(0, bayarOccupancy.percent)) + '%' }}
                        ></div>
                    </div>
                    <span className="text-[11px] text-slate-300 block mt-0.5">{bayarOccupancy.label}</span>
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
