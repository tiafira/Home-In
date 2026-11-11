import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Header({ onToggleMobileSidebar, bookingRequestCount = 0 }) {
    const { user, logout } = useAuth();
    const { branches, selectedBranchId, changeBranch, isPemilik } = useBranch();
    const navigate = useNavigate();

    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Global Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState({ penghuni: [], kamar: [], booking: [], total: 0 });
    const [searchOpen, setSearchOpen] = useState(false);
    const [searching, setSearching] = useState(false);

    const userDropdownRef = useRef(null);
    const notifDropdownRef = useRef(null);
    const searchRef = useRef(null);
    const searchInputRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const res = await api.get('/admin/notifications');
            if (res.data?.status === 'success') {
                setNotifications(res.data.data || []);
                setUnreadCount(res.data.unread_count || 0);
            }
        } catch (err) {
            // ignore network error
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // Global Search Debounced API Call
    useEffect(() => {
        if (searchQuery.trim().length < 2) {
            setSearchResults({ penghuni: [], kamar: [], booking: [], total: 0 });
            setSearchOpen(false);
            return;
        }

        const timer = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await api.get('/admin/global-search', {
                    params: { q: searchQuery.trim() },
                });
                if (res.data?.status === 'success') {
                    setSearchResults(res.data.data);
                    setSearchOpen(true);
                }
            } catch (err) {
                // ignore
            } finally {
                setSearching(false);
            }
        }, 250);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Keyboard shortcut (Ctrl+K or Cmd+K) to focus search
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
                setUserDropdownOpen(false);
            }
            if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
                setNotifDropdownOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleNotificationClick = async (n) => {
        if (!n.sudah_dibaca) {
            try {
                await api.post('/admin/notifications/' + n.id + '/read');
                fetchNotifications();
            } catch (err) {}
        }
        setNotifDropdownOpen(false);

        // Smart redirect based on notifikasi redirect column or keywords
        if (n.redirect) {
            navigate(n.redirect);
        } else if (n.judul?.toLowerCase().includes('booking')) {
            navigate('/admin/booking');
        } else if (n.judul?.toLowerCase().includes('bayar') || n.judul?.toLowerCase().includes('tagihan')) {
            navigate('/admin/pembayaran');
        } else if (n.judul?.toLowerCase().includes('komplain')) {
            navigate('/admin/komplain');
        } else if (n.judul?.toLowerCase().includes('izin')) {
            navigate('/admin/izin-keluar');
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await api.post('/admin/notifications/read-all');
            fetchNotifications();
        } catch (err) {}
    };

    const handleSelectSearchResult = (url) => {
        setSearchOpen(false);
        setSearchQuery('');
        navigate(url);
    };

    const getInitials = (name) => {
        if (!name) return 'HI';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[1][0]).toUpperCase();
        }
        return parts[0].substring(0, 2).toUpperCase();
    };

    const displayName = user?.nama || user?.name || 'Admin Kost';
    const initial = getInitials(displayName);
    const assignedBranch = branches.find((b) => String(b.id) === String(selectedBranchId));

    return (
        <header className="sticky top-0 z-30 w-full h-[72px] bg-white/95 backdrop-blur-md border-b border-[#263b53]/10 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 shadow-xs">
            {/* Left: Mobile Toggle & Brand Logo */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                <button
                    onClick={onToggleMobileSidebar}
                    className="lg:hidden p-2 rounded-xl text-[#64748b] hover:text-[#263b53] hover:bg-slate-100 transition cursor-pointer"
                    aria-label="Buka Menu"
                    type="button"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                    </svg>
                </button>

                <a href="/" className="flex items-center gap-2.5 hover:opacity-90 transition" title="Ke Halaman Website Publik">
                    <div className="w-9 h-9 rounded-[11px] bg-[#263b53] flex items-center justify-center p-1.5 shadow-sm">
                        <img
                            src="/Group 2.svg"
                            alt="Home-In Logo"
                            className="w-full h-full object-contain"
                        />
                    </div>
                    <span className="font-extrabold text-xl sm:text-[21px] tracking-tight text-[#1F2A44]">
                        Home<span className="text-[#3b82f6]">-in</span>
                    </span>
                </a>
            </div>

            {/* Center: Global Search Bar */}
            <div className="relative flex-1 max-w-md mx-4 hidden md:block" ref={searchRef}>
                <div className="relative flex items-center">
                    <svg
                        className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                    </svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                            if (searchQuery.trim().length >= 2) setSearchOpen(true);
                        }}
                        placeholder="Cari penghuni, nomor kamar, atau pemesan booking... (Ctrl+K)"
                        className="w-full pl-10 pr-12 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9] transition text-slate-800 placeholder-slate-400"
                    />
                    {searching ? (
                        <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin absolute right-3" />
                    ) : (
                        <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-200/60 rounded border border-slate-300 absolute right-3 pointer-events-none">
                            Ctrl K
                        </kbd>
                    )}
                </div>

                {/* Instant Search Results Dropdown */}
                {searchOpen && (
                    <div className="absolute left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 py-2.5 z-50 max-h-96 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
                        {searchResults.total === 0 ? (
                            <div className="py-6 text-center text-xs text-slate-400">
                                Tidak ditemukan data yang cocok dengan "{searchQuery}"
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 text-xs">
                                {/* Penghuni Results */}
                                {searchResults.penghuni.length > 0 && (
                                    <div className="py-1">
                                        <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                            👥 Penghuni ({searchResults.penghuni.length})
                                        </div>
                                        {searchResults.penghuni.map((p) => (
                                            <div
                                                key={p.id}
                                                onClick={() => handleSelectSearchResult(p.url)}
                                                className="px-3.5 py-2 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition"
                                            >
                                                <div>
                                                    <span className="font-bold text-[#1F2A44] block">{p.name}</span>
                                                    <span className="text-[11px] text-slate-500">
                                                        Kamar {p.nomor_kamar} • {p.cabang}
                                                    </span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 capitalize">
                                                    {p.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Kamar Results */}
                                {searchResults.kamar.length > 0 && (
                                    <div className="py-1">
                                        <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                            🚪 Kamar ({searchResults.kamar.length})
                                        </div>
                                        {searchResults.kamar.map((k) => (
                                            <div
                                                key={k.id}
                                                onClick={() => handleSelectSearchResult(k.url)}
                                                className="px-3.5 py-2 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition"
                                            >
                                                <div>
                                                    <span className="font-bold text-[#1F2A44] block">Kamar {k.nomor_kamar}</span>
                                                    <span className="text-[11px] text-slate-500">
                                                        {k.gedung} • {k.cabang}
                                                    </span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#1E5FC9] capitalize">
                                                    {k.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Booking Results */}
                                {searchResults.booking.length > 0 && (
                                    <div className="py-1">
                                        <div className="px-3.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                                            📋 Permohonan Booking ({searchResults.booking.length})
                                        </div>
                                        {searchResults.booking.map((b) => (
                                            <div
                                                key={b.id}
                                                onClick={() => handleSelectSearchResult(b.url)}
                                                className="px-3.5 py-2 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition"
                                            >
                                                <div>
                                                    <span className="font-bold text-[#1F2A44] block">
                                                        {b.kode_booking} — {b.pemesan}
                                                    </span>
                                                    <span className="text-[11px] text-slate-500">
                                                        Kamar {b.nomor_kamar} ({b.cabang})
                                                    </span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 capitalize">
                                                    {b.status.replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right: Branch Filter/Info, Notifications & User Profile */}
            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                {/* Branch Selector for Pemilik OR Branch Location Badge for Admin */}
                {branches && branches.length > 0 && (
                    isPemilik ? (
                        <div className="hidden md:flex items-center gap-2 bg-[#f8fafc] px-3.5 py-2 rounded-xl border border-[#263b53]/15">
                            <svg className="w-4 h-4 text-[#1E5FC9] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21" />
                            </svg>
                            <select
                                value={selectedBranchId || ''}
                                onChange={(e) => changeBranch(e.target.value)}
                                aria-label="Filter Cabang Kost"
                                className="bg-transparent border-none p-0 pr-6 text-xs font-bold text-[#1F2A44] focus:ring-0 cursor-pointer outline-none"
                            >
                                <option value="">Semua Cabang (Global)</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama_cabang}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : (
                        assignedBranch && (
                            <div
                                title={`Anda ditugaskan mengelola ${assignedBranch.nama_cabang} (${assignedBranch.alamat})`}
                                className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-[#f8fafc] border border-[#263b53]/15 rounded-xl text-xs font-semibold text-[#1F2A44]"
                            >
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-[#8A94A6]">Lokasi:</span>
                                <span className="font-bold text-[#1F2A44]">{assignedBranch.nama_cabang}</span>
                            </div>
                        )
                    )
                )}

                {/* Notification Dropdown */}
                <div className="relative" ref={notifDropdownRef}>
                    <button
                        onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                        aria-label="Notifikasi"
                        className="text-[#64748b] hover:text-[#1E5FC9] p-2 rounded-xl hover:bg-slate-100 transition relative cursor-pointer"
                        type="button"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                        </svg>
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {notifDropdownOpen && (
                        <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <div className="flex items-center justify-between px-5 py-2 border-b border-slate-100">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-sm font-bold text-[#1F2A44]">Notifikasi Aktivitas</h4>
                                    {unreadCount > 0 && (
                                        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-bold">
                                            {unreadCount} baru
                                        </span>
                                    )}
                                </div>
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="text-xs text-[#1E5FC9] font-semibold hover:underline cursor-pointer"
                                    >
                                        Tandai semua dibaca
                                    </button>
                                )}
                            </div>

                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
                                {notifications.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-[#8A94A6]">
                                        Tidak ada notifikasi saat ini
                                    </div>
                                ) : (
                                    notifications.map((n) => (
                                        <div
                                            key={n.id}
                                            onClick={() => handleNotificationClick(n)}
                                            className={
                                                'p-4 hover:bg-slate-50 transition cursor-pointer flex items-start gap-3 ' +
                                                (!n.sudah_dibaca ? 'bg-blue-50/40' : '')
                                            }
                                        >
                                            <div
                                                className="w-2 h-2 rounded-full mt-1.5 shrink-0 bg-[#1E5FC9]"
                                                style={{ opacity: n.sudah_dibaca ? 0 : 1 }}
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1">
                                                    <p className="text-xs sm:text-sm font-bold text-[#1F2A44] truncate">{n.judul}</p>
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                        {new Date(n.created_at).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[#8A94A6] line-clamp-2 mt-0.5 leading-relaxed">{n.isi}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* User Dropdown */}
                <div className="relative" ref={userDropdownRef}>
                    <div
                        onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                        className="flex items-center gap-2.5 sm:gap-3 pl-3 sm:pl-4 border-l border-slate-200 cursor-pointer select-none"
                    >
                        <div className="hidden sm:block text-right">
                            <span className="text-sm font-bold text-[#1F2A44] block leading-tight">{displayName}</span>
                            <span className="text-[11px] font-semibold text-[#8A94A6] uppercase tracking-wider block">
                                {user?.role}
                            </span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-[#1E5FC9] text-white font-bold flex items-center justify-center text-sm shadow-sm">
                            {initial}
                        </div>
                        <svg className="w-4 h-4 text-[#8A94A6]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                        </svg>
                    </div>

                    {userDropdownOpen && (
                        <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 py-2.5 z-50 animate-in fade-in zoom-in-95 duration-150 divide-y divide-slate-100">
                            <div className="px-5 py-3">
                                <p className="text-sm font-bold text-[#1F2A44]">{displayName}</p>
                                <p className="text-xs text-[#8A94A6] truncate mt-0.5">{user?.email}</p>
                                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 bg-blue-50 text-[#1E5FC9] rounded-full uppercase tracking-wider">
                                        Role: {user?.role}
                                    </span>
                                    {assignedBranch && (
                                        <span className="text-[10px] font-bold px-2.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                                            {assignedBranch.nama_cabang}
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="py-1">
                                <button
                                    onClick={() => {
                                        setUserDropdownOpen(false);
                                        navigate('/admin/profil');
                                    }}
                                    className="w-full text-left px-5 py-2.5 text-xs text-[#1F2A44] hover:bg-slate-50 flex items-center gap-2.5 transition font-semibold cursor-pointer"
                                    type="button"
                                >
                                    <span>👤</span>
                                    <span>Profil & Ubah Password</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setUserDropdownOpen(false);
                                        navigate('/admin/activity-logs');
                                    }}
                                    className="w-full text-left px-5 py-2.5 text-xs text-[#1F2A44] hover:bg-slate-50 flex items-center gap-2.5 transition font-semibold cursor-pointer"
                                    type="button"
                                >
                                    <span>📜</span>
                                    <span>Log Aktivitas Admin</span>
                                </button>
                            </div>

                            <div className="pt-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-5 py-2.5 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2.5 transition font-semibold cursor-pointer"
                                    type="button"
                                >
                                    <svg className="w-4 h-4 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                                    </svg>
                                    <span>Keluar (Logout)</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
