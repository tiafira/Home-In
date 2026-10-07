import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar({ occupancy, onAddPenghuniClick }) {
    const { logout } = useAuth();
    const navigate = useNavigate();

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
                <svg className="w-5 h-5 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Kamar & Gedung',
            path: '/admin/kamar',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.75a1.5 1.5 0 011.5-1.5h1.5a1.5 1.5 0 011.5 1.5V21" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Penghuni',
            path: '/admin/penghuni',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Booking',
            path: '/admin/booking',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Pembayaran',
            path: '/admin/pembayaran',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Komplain',
            path: '/admin/komplain',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Izin Keluar',
            path: '/admin/izin-keluar',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Pengumuman',
            path: '/admin/pengumuman',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.111-1.528-.453a18.067 18.067 0 01-1.32-3.821m2.983-.4zM14.25 15.75c0 .621-.504 1.125-1.125 1.125s-1.125-.504-1.125-1.125" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Peringatan',
            path: '/admin/peringatan',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Laporan Bulanan',
            path: '/admin/laporan',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Pegawai',
            path: '/admin/pegawai',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'Fasilitas',
            path: '/admin/fasilitas',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.948c0-.621-.504-1.125-1.125-1.125H5.625c-.621 0-1.125.504-1.125 1.125v1.729m12 0h-12" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
        {
            name: 'FAQ',
            path: '/admin/faq',
            icon: (
                <svg className="w-5 h-5 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
            ),
        },
    ];

    return (
        <aside
            style={{ backgroundColor: '#1E5FC9' }}
            className="w-[260px] bg-[#1E5FC9] flex-shrink-0 flex flex-col justify-between text-white z-10 rounded-tr-[40px] rounded-bl-[36px] rounded-tl-none rounded-br-none overflow-hidden py-6 px-6"
            data-purpose="primary-sidebar"
        >
            <div className="flex flex-col h-full overflow-hidden">
                {/* White Pill Action Button */}
                <button
                    onClick={onAddPenghuniClick}
                    className="w-full max-w-[210px] mx-auto py-3 rounded-full bg-white text-[#1E5FC9] font-semibold text-[15px] shadow-md flex items-center justify-center gap-2 hover:bg-opacity-95 transition-all flex-shrink-0 mb-6 cursor-pointer"
                    type="button"
                >
                    <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4.5v15m7.5-7.5h-15" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                    <span>Tambah Penghuni</span>
                </button>

                {/* Vertical Menu Items */}
                <nav className="flex-1 overflow-y-auto sidebar-scroll space-y-[24px] pr-2 text-[15px] font-normal" data-purpose="sidebar-menu">
                    {menuItems.map((item) => (
                        <NavLink
                            key={item.name}
                            to={item.path}
                            className={({ isActive }) =>
                                'flex items-center gap-3.5 transition-colors ' +
                                (isActive
                                    ? 'text-white font-semibold opacity-100'
                                    : 'text-white/80 hover:text-white')
                            }
                        >
                            {item.icon}
                            <span>{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
            </div>

            <div className="border-t border-white/20 my-4"></div>

            {/* Occupancy Block */}
            <div className="flex-shrink-0" data-purpose="occupancy-widget">
                <h3 className="text-[13px] font-medium tracking-wider text-white/70 uppercase mb-2.5">Occupancy</h3>

                <div className="mb-3">
                    <div className="flex items-center gap-2 text-[14px] text-white/95 mb-1 font-medium">
                        <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <span>Kamar Terisi</span>
                    </div>
                    <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                            className="bg-white h-full rounded-full transition-all duration-500"
                            style={{ width: Math.min(100, Math.max(0, kamarOccupancy.percent)) + '%' }}
                        ></div>
                    </div>
                    <span className="text-[14px] text-white/90 font-medium">
                        {kamarOccupancy.label}
                    </span>
                </div>

                <div className="mb-2">
                    <div className="flex items-center gap-2 text-[14px] text-white/95 mb-1 font-medium">
                        <svg className="w-4 h-4 text-white/90" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                        <span>Pembayaran Lunas</span>
                    </div>
                    <div className="w-full bg-white/30 h-1.5 rounded-full overflow-hidden mb-1">
                        <div
                            className="bg-white h-full rounded-full transition-all duration-500"
                            style={{ width: Math.min(100, Math.max(0, bayarOccupancy.percent)) + '%' }}
                        ></div>
                    </div>
                    <span className="text-[14px] text-white/90 font-medium">
                        {bayarOccupancy.label}
                    </span>
                </div>

                <a className="text-[14px] font-semibold text-white hover:underline mt-2 inline-flex items-center gap-1" href="#!">
                    Kelola Okupansi <span>↗</span>
                </a>
            </div>
        </aside>
    );
}
