import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Header() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const getInitials = (name) => {
        if (!name) return 'A';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    };

    const displayName = user?.nama || 'Admin Kost';
    const initial = getInitials(displayName);

    return (
        <header className="w-full h-[76px] bg-white border-b border-slate-100 flex items-center justify-between px-8 flex-shrink-0 z-20" data-purpose="top-navigation">
            <div className="w-[260px] flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1E5FC9] flex items-center justify-center text-white shadow-md">
                    <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                        <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"></path>
                    </svg>
                </div>
                <span className="font-bold text-[22px] tracking-tight text-[#1F2A44]">
                    home<span className="text-[#1E5FC9]">_in</span>
                </span>
            </div>

            <div className="flex-1 max-w-[460px] mx-6">
                <div className="relative w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[#8A94A6]">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" strokeLinecap="round" strokeLinejoin="round"></path>
                        </svg>
                    </div>
                    <input
                        className="w-full bg-[#F4F6FA] border-none rounded-full pl-11 pr-5 py-2.5 text-[15px] placeholder-[#8A94A6] text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9] focus:bg-white transition-all outline-none"
                        placeholder="Search..."
                        type="text"
                    />
                </div>
            </div>

            <div className="flex items-center gap-5">
                <button aria-label="Notifikasi" className="text-[#8A94A6] hover:text-[#1E5FC9] transition-colors relative p-1 cursor-pointer" type="button">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" strokeLinecap="round" strokeLinejoin="round"></path>
                    </svg>
                    <span className="w-2 h-2 rounded-full bg-[#1E5FC9] absolute top-0.5 right-0.5 border-2 border-white"></span>
                </button>
                <button aria-label="Bantuan" className="text-[#8A94A6] hover:text-[#1E5FC9] transition-colors p-1 cursor-pointer" type="button">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="9"></circle>
                        <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" strokeLinecap="round" strokeLinejoin="round"></path>
                        <line strokeLinecap="round" strokeWidth="2.5" x1="12" x2="12.01" y1="17" y2="17"></line>
                    </svg>
                </button>
                <button aria-label="Pengaturan" className="text-[#8A94A6] hover:text-[#1E5FC9] transition-colors p-1 cursor-pointer" type="button">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path>
                    </svg>
                </button>

                <div className="relative" ref={dropdownRef}>
                    <div
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-3 pl-4 border-l border-slate-200 cursor-pointer select-none"
                    >
                        <span className="text-[15px] font-semibold text-[#1F2A44]">{displayName}</span>
                        <div className="w-9 h-9 rounded-full bg-[#1E5FC9] text-white font-bold flex items-center justify-center text-[15px] shadow-sm">
                            {initial}
                        </div>
                        <button aria-label="Menu" className="text-[#8A94A6] hover:text-[#1F2A44] ml-1 cursor-pointer" type="button">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                                <path d="M19.5 8.25l-7.5 7.5-7.5-7.5" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>
                        </button>
                    </div>

                    {dropdownOpen && (
                        <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                            <div className="px-4 py-2 border-b border-slate-100">
                                <p className="text-sm font-semibold text-[#1F2A44]">{user?.nama}</p>
                                <p className="text-xs text-[#8A94A6] truncate">{user?.email}</p>
                                <span className="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 bg-blue-50 text-[#1E5FC9] rounded-full uppercase tracking-wider">
                                    {user?.role}
                                </span>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer font-medium"
                            >
                                <svg className="w-4 h-4 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" strokeLinecap="round" strokeLinejoin="round"></path>
                                </svg>
                                <span>Keluar (Logout)</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
