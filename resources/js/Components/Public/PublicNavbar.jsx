import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function PublicNavbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    const [activeSection, setActiveSection] = useState('hero');
    const [bookingDropdownOpen, setBookingDropdownOpen] = useState(false);
    const [userDropdownOpen, setUserDropdownOpen] = useState(false);
    const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [mobileBookingOpen, setMobileBookingOpen] = useState(false);

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const bookingRef = useRef(null);
    const bookingTimerRef = useRef(null);
    const userRef = useRef(null);
    const notifRef = useRef(null);
    const mobileNavRef = useRef(null);

    // Close all menus on route change
    useEffect(() => {
        setMobileOpen(false);
        setUserDropdownOpen(false);
        setBookingDropdownOpen(false);
        setNotifDropdownOpen(false);
    }, [location.pathname]);

    // Active link observer on home page
    useEffect(() => {
        if (location.pathname !== '/') return;

        const sections = document.querySelectorAll('#hero, #tentang, #gedung, #kontak');
        if (!sections.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.35 }
        );

        sections.forEach((s) => observer.observe(s));
        return () => observer.disconnect();
    }, [location.pathname]);

    // Fetch notifications if logged in
    useEffect(() => {
        if (!user) return;
        let isMounted = true;
        const fetchNotifs = async () => {
            try {
                const res = await api.get('/user/notifications');
                if (isMounted && res.data?.status === 'success') {
                    setNotifications(res.data.data || []);
                    setUnreadCount(res.data.unread_count || 0);
                }
            } catch (e) {
                // ignore
            }
        };
        fetchNotifs();
        const interval = setInterval(fetchNotifs, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [user]);

    // Click outside handler
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (bookingRef.current && !bookingRef.current.contains(e.target)) {
                setBookingDropdownOpen(false);
            }
            if (userRef.current && !userRef.current.contains(e.target)) {
                setUserDropdownOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setNotifDropdownOpen(false);
            }
            if (
                mobileNavRef.current &&
                !mobileNavRef.current.contains(e.target) &&
                !e.target.closest('.mobile-toggle-btn')
            ) {
                setMobileOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavClick = (e, targetId) => {
        e.preventDefault();
        setMobileOpen(false);
        setActiveSection(targetId);

        if (location.pathname === '/') {
            const el = document.getElementById(targetId);
            if (el) {
                el.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } else if (targetId === 'hero') {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            navigate(`/#${targetId}`);
        }
    };

    const isBookingActive =
        location.pathname.startsWith('/kamar') ||
        location.pathname.startsWith('/booking');

    const handleBookingMouseEnter = () => {
        if (bookingTimerRef.current) {
            clearTimeout(bookingTimerRef.current);
            bookingTimerRef.current = null;
        }
        setBookingDropdownOpen(true);
    };

    const handleBookingMouseLeave = () => {
        if (bookingTimerRef.current) {
            clearTimeout(bookingTimerRef.current);
        }
        bookingTimerRef.current = setTimeout(() => {
            setBookingDropdownOpen(false);
        }, 220);
    };

    const handleBookingToggle = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (bookingTimerRef.current) {
            clearTimeout(bookingTimerRef.current);
            bookingTimerRef.current = null;
        }
        setBookingDropdownOpen((prev) => !prev);
    };

    const handleLogout = async () => {
        await logout();
        setMobileOpen(false);
        setUserDropdownOpen(false);
        navigate('/');
    };

    return (
        <>
            <nav className="navbar">
                {/* Brand Logo */}
                <Link to="/" className="nav-brand" onClick={() => setMobileOpen(false)}>
                    <div className="brand-icon" style={{ background: '#263b53', padding: '5px' }}>
                        <img
                            src="/Group 2.svg"
                            alt="Home-In Logo"
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    </div>
                    <span className="brand-text">
                        Home<span>-in</span>
                    </span>
                </Link>

                {/* Desktop Nav Links */}
                <div className="nav-links">
                    <a
                        href="#hero"
                        onClick={(e) => handleNavClick(e, 'hero')}
                        className={`nav-link ${location.pathname === '/' && activeSection === 'hero' ? 'active' : ''}`}
                    >
                        Beranda
                    </a>

                    <a
                        href="#tentang"
                        onClick={(e) => handleNavClick(e, 'tentang')}
                        className={`nav-link ${location.pathname === '/' && activeSection === 'tentang' ? 'active' : ''}`}
                    >
                        Tentang
                    </a>

                    <a
                        href="#gedung"
                        onClick={(e) => handleNavClick(e, 'gedung')}
                        className={`nav-link ${location.pathname === '/' && activeSection === 'gedung' ? 'active' : ''}`}
                    >
                        Gedung &amp; Kamar
                    </a>

                    {/* Booking Sub-Menu Dropdown Desktop */}
                    <div
                        className={`nav-dropdown ${bookingDropdownOpen ? 'open' : ''}`}
                        ref={bookingRef}
                        onMouseEnter={handleBookingMouseEnter}
                        onMouseLeave={handleBookingMouseLeave}
                    >
                        <button
                            type="button"
                            onClick={handleBookingToggle}
                            className={`nav-link nav-dropdown-btn ${isBookingActive ? 'active' : ''}`}
                        >
                            <span>Booking</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {bookingDropdownOpen && (
                            <div
                                className="nav-dropdown-menu"
                                onMouseEnter={handleBookingMouseEnter}
                                onMouseLeave={handleBookingMouseLeave}
                            >
                                <Link
                                    to="/kamar"
                                    onClick={() => setBookingDropdownOpen(false)}
                                    className="dropdown-item"
                                >
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                    <span>Cari Kamar</span>
                                </Link>
                                <Link
                                    to="/booking-saya"
                                    onClick={() => setBookingDropdownOpen(false)}
                                    className="dropdown-item"
                                >
                                    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    <span>Booking Saya</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    <a
                        href="#kontak"
                        onClick={(e) => handleNavClick(e, 'kontak')}
                        className={`nav-link ${location.pathname === '/' && activeSection === 'kontak' ? 'active' : ''}`}
                    >
                        Kontak
                    </a>
                </div>

                {/* Right Action (Notification, Profile & Mobile Hamburger) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {/* Notification Icon */}
                    {user && (
                        <div style={{ position: 'relative' }} ref={notifRef}>
                            <button
                                type="button"
                                onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                                style={{
                                    background: '#eff6ff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    width: '38px',
                                    height: '38px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#3b82f6',
                                    cursor: 'pointer',
                                    position: 'relative',
                                }}
                                aria-label="Notifikasi"
                            >
                                <svg width="19" height="19" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                                {unreadCount > 0 && (
                                    <span
                                        style={{
                                            position: 'absolute',
                                            top: '-4px',
                                            right: '-4px',
                                            background: '#ef4444',
                                            color: 'white',
                                            borderRadius: '9999px',
                                            fontSize: '9px',
                                            fontWeight: '800',
                                            padding: '1px 5px',
                                        }}
                                    >
                                        {unreadCount}
                                    </span>
                                )}
                            </button>

                            {notifDropdownOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        marginTop: '8px',
                                        width: '320px',
                                        background: 'white',
                                        borderRadius: '14px',
                                        boxShadow: '0 12px 30px rgba(0,0,0,0.15)',
                                        border: '1px solid #e2e8f0',
                                        padding: '12px',
                                        zIndex: 10001,
                                    }}
                                >
                                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#263b53', marginBottom: '8px' }}>
                                        Notifikasi
                                    </div>
                                    <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <p style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center', padding: '16px 0' }}>
                                                Belum ada notifikasi
                                            </p>
                                        ) : (
                                            notifications.map((n) => (
                                                <div
                                                    key={n.id}
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        background: n.sudah_dibaca ? '#f8fafc' : '#eff6ff',
                                                        marginBottom: '6px',
                                                        fontSize: '11px',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => {
                                                        if (n.referensi_tabel === 'booking') navigate('/booking-saya');
                                                        setNotifDropdownOpen(false);
                                                    }}
                                                >
                                                    <div style={{ fontWeight: '700', color: '#263b53' }}>{n.judul}</div>
                                                    <div style={{ color: '#64748b' }}>{n.isi || n.pesan}</div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Desktop User Button / Login */}
                    {!user ? (
                        <Link to="/login" className="btn-hero-masuk">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="icon-sm"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                                />
                            </svg>
                            <span>Masuk</span>
                        </Link>
                    ) : (
                        <div style={{ position: 'relative' }} ref={userRef}>
                            <button
                                type="button"
                                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                                style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '7px 14px',
                                    background: '#263b53',
                                    color: 'white',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: '700',
                                }}
                            >
                                <span>{user.nama?.split(' ')[0] || user.name?.split(' ')[0] || 'Akun'}</span>
                                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {userDropdownOpen && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        marginTop: '8px',
                                        width: '200px',
                                        background: 'white',
                                        borderRadius: '14px',
                                        boxShadow: '0 12px 30px rgba(38, 59, 83, 0.15)',
                                        border: '1px solid #e2e8f0',
                                        padding: '8px',
                                        zIndex: 10001,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px',
                                    }}
                                >
                                    <div style={{ padding: '6px 10px 8px', borderBottom: '1px solid #f1f5f9' }}>
                                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#1e293b' }}>
                                            {user.nama || user.name || 'Pengguna'}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8', truncate: true }}>
                                            {user.email}
                                        </div>
                                    </div>

                                    {['pemilik', 'admin'].includes(user.role) && (
                                        <Link
                                            to="/admin/dashboard"
                                            style={{
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                color: '#263b53',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                textDecoration: 'none',
                                            }}
                                            onClick={() => setUserDropdownOpen(false)}
                                        >
                                            <span>📊</span>
                                            <span>Dashboard Admin</span>
                                        </Link>
                                    )}

                                    <Link
                                        to="/akun"
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#263b53',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            textDecoration: 'none',
                                        }}
                                        onClick={() => setUserDropdownOpen(false)}
                                    >
                                        <span>👤</span>
                                        <span>Profil & Akun</span>
                                    </Link>

                                    <Link
                                        to="/booking-saya"
                                        style={{
                                            padding: '8px 10px',
                                            borderRadius: '8px',
                                            fontSize: '12px',
                                            fontWeight: '600',
                                            color: '#263b53',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            textDecoration: 'none',
                                        }}
                                        onClick={() => setUserDropdownOpen(false)}
                                    >
                                        <span>📋</span>
                                        <span>Booking Saya</span>
                                    </Link>

                                    <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '2px', paddingTop: '4px' }}>
                                        <button
                                            type="button"
                                            onClick={handleLogout}
                                            style={{
                                                width: '100%',
                                                padding: '8px 10px',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                fontWeight: '700',
                                                color: '#ef4444',
                                                background: 'none',
                                                border: 'none',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                            }}
                                        >
                                            <span>🚪</span>
                                            <span>Keluar</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Responsive Mobile Hamburger Button */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="mobile-toggle-btn"
                        aria-label="Buka Menu Navigasi"
                    >
                        {mobileOpen ? (
                            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        ) : (
                            <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        )}
                    </button>
                </div>
            </nav>

            {/* Mobile Navigation Drawer / Dropdown Panel */}
            {mobileOpen && (
                <div className="mobile-nav-drawer" ref={mobileNavRef}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <a
                            href="#hero"
                            onClick={(e) => handleNavClick(e, 'hero')}
                            className={`mobile-nav-link ${location.pathname === '/' && activeSection === 'hero' ? 'active' : ''}`}
                        >
                            <span>Beranda</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>&rarr;</span>
                        </a>

                        <a
                            href="#tentang"
                            onClick={(e) => handleNavClick(e, 'tentang')}
                            className={`mobile-nav-link ${location.pathname === '/' && activeSection === 'tentang' ? 'active' : ''}`}
                        >
                            <span>Tentang Home-In</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>&rarr;</span>
                        </a>

                        <a
                            href="#gedung"
                            onClick={(e) => handleNavClick(e, 'gedung')}
                            className={`mobile-nav-link ${location.pathname === '/' && activeSection === 'gedung' ? 'active' : ''}`}
                        >
                            <span>Gedung &amp; Kamar</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>&rarr;</span>
                        </a>

                        {/* Mobile Booking Accordion */}
                        <div>
                            <div
                                onClick={() => setMobileBookingOpen(!mobileBookingOpen)}
                                className={`mobile-nav-link ${isBookingActive ? 'active' : ''}`}
                            >
                                <span>Booking Kamar</span>
                                <svg
                                    width="14"
                                    height="14"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    style={{
                                        transform: mobileBookingOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                                        transition: 'transform 0.2s ease',
                                    }}
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {mobileBookingOpen && (
                                <div style={{ paddingLeft: '14px', paddingTop: '4px', paddingBottom: '4px' }}>
                                    <Link
                                        to="/kamar"
                                        onClick={() => setMobileOpen(false)}
                                        className="mobile-sub-link"
                                    >
                                        <span>🔍</span>
                                        <span>Cari & Pilih Kamar</span>
                                    </Link>
                                    <Link
                                        to="/booking-saya"
                                        onClick={() => setMobileOpen(false)}
                                        className="mobile-sub-link"
                                    >
                                        <span>📋</span>
                                        <span>Riwayat Booking Saya</span>
                                    </Link>
                                </div>
                            )}
                        </div>

                        <a
                            href="#kontak"
                            onClick={(e) => handleNavClick(e, 'kontak')}
                            className={`mobile-nav-link ${location.pathname === '/' && activeSection === 'kontak' ? 'active' : ''}`}
                        >
                            <span>Kontak Kami</span>
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>&rarr;</span>
                        </a>

                        {/* Mobile User Section */}
                        <div style={{ borderTop: '1px solid #f1f5f9', marginTop: '12px', paddingTop: '12px' }}>
                            {user ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ padding: '4px 14px 8px' }}>
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#1e293b' }}>
                                            {user.nama || user.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{user.email}</div>
                                    </div>

                                    {['pemilik', 'admin'].includes(user.role) && (
                                        <Link
                                            to="/admin/dashboard"
                                            onClick={() => setMobileOpen(false)}
                                            className="mobile-sub-link"
                                        >
                                            <span>📊</span>
                                            <span>Dashboard Admin</span>
                                        </Link>
                                    )}

                                    <Link
                                        to="/akun"
                                        onClick={() => setMobileOpen(false)}
                                        className="mobile-sub-link"
                                    >
                                        <span>👤</span>
                                        <span>Profil & Akun</span>
                                    </Link>

                                    <Link
                                        to="/booking-saya"
                                        onClick={() => setMobileOpen(false)}
                                        className="mobile-sub-link"
                                    >
                                        <span>📋</span>
                                        <span>Booking Saya</span>
                                    </Link>

                                    <button
                                        type="button"
                                        onClick={handleLogout}
                                        className="mobile-sub-link"
                                        style={{
                                            border: 'none',
                                            background: 'none',
                                            color: '#ef4444',
                                            cursor: 'pointer',
                                            width: '100%',
                                            textAlign: 'left',
                                            fontWeight: '700',
                                        }}
                                    >
                                        <span>🚪</span>
                                        <span>Keluar (Logout)</span>
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                                    <Link
                                        to="/login"
                                        onClick={() => setMobileOpen(false)}
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            padding: '10px 0',
                                            background: '#263b53',
                                            color: '#ffffff',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        Masuk
                                    </Link>
                                    <Link
                                        to="/register"
                                        onClick={() => setMobileOpen(false)}
                                        style={{
                                            flex: 1,
                                            textAlign: 'center',
                                            padding: '10px 0',
                                            background: '#eff6ff',
                                            color: '#1E5FC9',
                                            borderRadius: '12px',
                                            fontSize: '13px',
                                            fontWeight: '700',
                                            textDecoration: 'none',
                                        }}
                                    >
                                        Daftar
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
