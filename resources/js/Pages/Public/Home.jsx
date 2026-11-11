import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import PublicNavbar from '../../Components/Public/PublicNavbar';
import FaqBubble from '../../Components/Public/FaqBubble';
import RoomCard from '../../Components/Public/RoomCard';
import api from '../../services/api';

export default function Home() {
    const location = useLocation();
    const navigate = useNavigate();
    const canvasRef = useRef(null);

    const [searchHero, setSearchHero] = useState('');
    const [searchGedung, setSearchGedung] = useState('');
    const [activeTab, setActiveTab] = useState('all');

    const [data, setData] = useState({
        stats: { harga_mulai: 600000, total_cabang: 4, total_kamar_kosong: 0 },
        cabang: [],
        gedung: [],
        kamar_pilihan: [],
        faqs: [],
    });
    const [loading, setLoading] = useState(true);

    // Fetch dynamic data
    useEffect(() => {
        let isMounted = true;
        const fetchHomeData = async () => {
            try {
                const res = await api.get('/public/beranda');
                if (isMounted && res.data?.status === 'success') {
                    setData(res.data.data);
                }
            } catch (err) {
                // ignore
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchHomeData();
        return () => {
            isMounted = false;
        };
    }, []);

    // Smooth scroll for hash URLs
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            const target = document.getElementById(id);
            if (target) {
                setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
            }
        }
    }, [location.hash, loading]);

    // Original Global Snow / Star Particle Canvas Effect
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        let animationFrameId;

        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        const particleCount = 28;
        const particles = [];

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                size: Math.random() * 3 + 1.5,
                speedY: Math.random() * 0.4 + 0.15,
                speedX: (Math.random() - 0.5) * 0.25,
                opacity: Math.random() * 0.5 + 0.25,
                rotation: Math.random() * Math.PI * 2,
                rotSpeed: (Math.random() - 0.5) * 0.02,
            });
        }

        function drawStar(cx, cy, spikes, outerRadius, innerRadius) {
            let rot = (Math.PI / 2) * 3;
            let x = cx;
            let y = cy;
            const step = Math.PI / spikes;

            ctx.beginPath();
            ctx.moveTo(cx, cy - outerRadius);

            for (let i = 0; i < spikes; i++) {
                x = cx + Math.cos(rot) * outerRadius;
                y = cy + Math.sin(rot) * outerRadius;
                ctx.lineTo(x, y);
                rot += step;

                x = cx + Math.cos(rot) * innerRadius;
                y = cy + Math.sin(rot) * innerRadius;
                ctx.lineTo(x, y);
                rot += step;
            }

            ctx.lineTo(cx, cy - outerRadius);
            ctx.closePath();
        }

        function draw() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            particles.forEach((p) => {
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.fillStyle = `rgba(255,255,255,${p.opacity})`;
                ctx.shadowBlur = 6;
                ctx.shadowColor = '#ffffff';

                drawStar(0, 0, 4, p.size, p.size / 2.5);
                ctx.fill();
                ctx.restore();

                p.y -= p.speedY;
                p.x += p.speedX;
                p.rotation += p.rotSpeed;

                if (p.y < -10) {
                    p.y = canvas.height + 10;
                    p.x = Math.random() * canvas.width;
                }
            });

            animationFrameId = requestAnimationFrame(draw);
        }

        draw();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const popularRooms = Array.isArray(data.kamar_pilihan) ? data.kamar_pilihan : [];

    const cleanPhotoUrl = (url, fallback) => {
        if (!url || typeof url !== 'string') return fallback;
        return url.replace('/storage/storage/', '/storage/');
    };

    // Group rooms by gedung & lantai so we don't display 8 identical room cards
    const groupedKamarList = React.useMemo(() => {
        const groups = {};
        (popularRooms || []).forEach((k) => {
            const gedungId = k.gedung_id || k.gedung?.id || 0;
            const lantai = k.lantai || 1;
            const key = `${gedungId}-${lantai}`;

            if (!groups[key]) {
                const mainPhoto =
                    k.kamar_foto && k.kamar_foto.length > 0
                        ? k.kamar_foto[0].url_foto
                        : (k.gedung?.foto || null);

                groups[key] = {
                    key,
                    id: k.id,
                    sample_kamar_id: k.id,
                    first_available_id: k.status === 'kosong' ? k.id : null,
                    gedung_id: gedungId,
                    gedung: k.gedung,
                    gedung_foto: k.gedung?.foto || null,
                    nama_gedung: k.gedung?.nama_gedung || 'Gedung Kost',
                    cabang: k.gedung?.cabang,
                    nama_cabang: k.gedung?.cabang?.nama_cabang || 'Home-In Cabang Cimahi',
                    cabang_nama: k.gedung?.cabang?.nama_cabang || 'Home-In Cabang Cimahi',
                    alamat: k.gedung?.alamat || k.gedung?.cabang?.alamat || 'Home-In Kost',
                    lantai: lantai,
                    harga_bulanan: k.harga_bulanan,
                    foto: mainPhoto,
                    kamar_foto: k.kamar_foto || (mainPhoto ? [{ url_foto: mainPhoto }] : []),
                    deskripsi: k.deskripsi,
                    kamar_fasilitas: k.kamar_fasilitas || [],
                    kamar_kosong_count: 0,
                    total_kamar_count: 0,
                    kamar_list: [],
                    status: 'terisi',
                };
            }

            groups[key].total_kamar_count += 1;
            if (k.status === 'kosong') {
                groups[key].kamar_kosong_count += 1;
                groups[key].status = 'kosong';
                if (!groups[key].first_available_id) {
                    groups[key].first_available_id = k.id;
                }
            }
            groups[key].kamar_list.push(k);
            if (Number(k.harga_bulanan) < Number(groups[key].harga_bulanan)) {
                groups[key].harga_bulanan = k.harga_bulanan;
            }
        });

        return Object.values(groups);
    }, [popularRooms]);

    const filteredGedungList = (data.gedung || []).filter((g) => {
        if (!searchGedung.trim()) return true;
        const raw = searchGedung.toLowerCase().trim();
        const stopWords = ['kost', 'kos', 'sewa'];
        const words = raw.split(/\s+/).filter(Boolean);
        const meaningful = words.filter((w) => !stopWords.includes(w));
        const tokens = meaningful.length > 0 ? meaningful : words;

        const haystack = `${g.nama_gedung || ''} ${g.alamat || ''} ${g.cabang_nama || ''}`.toLowerCase();

        if (haystack.includes(raw)) return true;
        return tokens.every((token) => haystack.includes(token));
    });

    const filteredKamarGroups = (groupedKamarList || []).filter((group) => {
        if (!searchGedung.trim()) return true;
        const raw = searchGedung.toLowerCase().trim();
        const stopWords = ['kost', 'kos', 'sewa'];
        const words = raw.split(/\s+/).filter(Boolean);
        const meaningful = words.filter((w) => !stopWords.includes(w));
        const tokens = meaningful.length > 0 ? meaningful : words;

        const nomorKamarJoined = group.kamar_list.map((k) => k.nomor_kamar).join(' ');
        const haystack = `${group.nama_gedung || ''} ${group.alamat || ''} ${group.cabang_nama || ''} lantai ${group.lantai} ${nomorKamarJoined} ${group.deskripsi || ''}`.toLowerCase();

        if (haystack.includes(raw)) return true;
        return tokens.every((token) => haystack.includes(token));
    }).slice(0, 5);

    return (
        <div>
            {/* Dekorasi Salju / Bintang Canvas */}
            <canvas id="globalSnowCanvas" ref={canvasRef} />

            {/* Navbar */}
            <PublicNavbar />

            {/* SECTION HERO */}
            <header id="hero" className="hero">
                <div className="hero-bg">
                    <img
                        src="https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1920&q=80"
                        alt="Background Kost"
                    />
                    <div className="hero-overlay" />
                </div>

                <div className="hero-container">
                    <div className="hero-text">
                        <h1 className="hero-title">
                            Kelola Penyewaan
                            <br />
                            <span className="text-highlight">Kamar Kost</span>
                            <br />
                            Dengan Mudah
                        </h1>

                        <p className="hero-description">
                            Temukan kamar kost terbaik dengan fasilitas lengkap, lingkungan nyaman, dan proses sewa yang praktis hanya di Home-in.
                        </p>

                        {/* Quick Search Form Hero */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (searchHero.trim()) {
                                    navigate(`/kamar?q=${encodeURIComponent(searchHero.trim())}`);
                                } else {
                                    navigate('/kamar');
                                }
                            }}
                            className="hero-search-wrapper"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: '#ffffff',
                                borderRadius: '16px',
                                padding: '6px 8px',
                                boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
                                marginTop: '20px',
                                marginBottom: '24px',
                                maxWidth: '480px',
                            }}
                        >
                            <span style={{ fontSize: '18px', paddingLeft: '8px', paddingRight: '8px' }}>📍</span>
                            <input
                                type="text"
                                placeholder="Cari daerah (Cimahi, Babakan...) atau nama gedung..."
                                value={searchHero}
                                onChange={(e) => setSearchHero(e.target.value)}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#1e293b',
                                    flex: 1,
                                    background: 'transparent',
                                }}
                            />
                            <button
                                type="submit"
                                style={{
                                    background: '#1E5FC9',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '10px 18px',
                                    fontSize: '13px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <span>Cari Kost</span>
                            </button>
                        </form>
                    </div>

                    <div className="hero-media">
                        <div className="hero-card-img">
                            <img
                                src="https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"
                                alt="Foto Kost Preview"
                            />
                        </div>
                    </div>
                </div>

                {/* Card Keunggulan (Features Bar) */}
                <div className="features-bar">
                    <div className="features-grid">
                        {/* Keunggulan 1 */}
                        <div className="feature-item">
                            <div className="feature-icon icon-blue">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <polyline points="9 11 12 14 22 4" />
                                </svg>
                            </div>
                            <div className="feature-info">
                                <h3>Aman & Terpercaya</h3>
                                <p>Data dan transaksi kamu selalu aman.</p>
                            </div>
                        </div>

                        {/* Keunggulan 2 */}
                        <div className="feature-item">
                            <div className="feature-icon icon-blue">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </div>
                            <div className="feature-info">
                                <h3>Pilihan Kost Lengkap</h3>
                                <p>Berbagai tipe kamar tersedia.</p>
                            </div>
                        </div>

                        {/* Keunggulan 3 */}
                        <div className="feature-item">
                            <div className="feature-icon icon-blue">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                </svg>
                            </div>
                            <div className="feature-info">
                                <h3>Proses Mudah & Cepat</h3>
                                <p>Cari dan booking dengan cepat.</p>
                            </div>
                        </div>

                        {/* Keunggulan 4 */}
                        <div className="feature-item">
                            <div className="feature-icon icon-blue">
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                                    <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z" />
                                    <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                                </svg>
                            </div>
                            <div className="feature-info">
                                <h3>Customer Service 24/7</h3>
                                <p>Kami siap membantu kapan saja.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* SECTION TENTANG */}
            <section id="tentang" className="section">
                <div className="container">
                    <div className="about-grid">
                        <div>
                            <h2 className="section-title">
                                Solusi Pemesanan Kamar Kost yang{' '}
                                <span className="text-blue">Mudah</span> dan{' '}
                                <span className="text-blue">Efisien</span>
                            </h2>
                            <p className="section-description">
                                Home-in hadir untuk memberikan solusi tempat tinggal yang aman, nyaman, dan terjangkau, khususnya bagi pelajar dan mahasiswa.
                            </p>
                        </div>
                        <div>
                            <div className="img-card-wrapper">
                                <img
                                    src="https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=600&q=80"
                                    alt="Kunci Rumah & Interior Kost"
                                    className="about-img"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="about-grid">
                        <div>
                            <div className="img-card-wrapper">
                                <img
                                    src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80"
                                    alt="Kamar Tidur Bersih"
                                    className="about-img"
                                />
                            </div>
                        </div>
                        <div>
                            <h3 className="about-subtitle">
                                Cari kost jadi lebih mudah dengan Home-<span className="text-blue">in</span>
                            </h3>

                            <div className="about-list">
                                <div className="about-item">
                                    <div className="about-icon">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <circle cx="11" cy="11" r="8" />
                                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h5>Mudah</h5>
                                        <p>Cari kamar dengan cepat dan praktis.</p>
                                    </div>
                                </div>

                                <div className="about-item">
                                    <div className="about-icon">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                                            <circle cx="12" cy="10" r="3" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h5>Strategis</h5>
                                        <p>Banyak pilihan lokasi di area kampus & perkantoran.</p>
                                    </div>
                                </div>

                                <div className="about-item">
                                    <div className="about-icon">
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                            <polyline points="9 11 12 14 22 4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h5>Terpercaya</h5>
                                        <p>Verifikasi akurat dan garansi aman.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card Button Cari Kamar */}
                    <div className="cta-banner">
                        <p>Temukan kamar impianmu sekarang bersama kami dengan mudah dan cepat.</p>
                        <Link to="/kamar" className="btn-cari">
                            <span>Cari kamar</span>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="icon-sm"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </section>

            {/* SECTION GEDUNG & KAMAR KOST */}
            <section id="gedung" className="section section-alt">
                <div className="container">
                    <div className="popular-header">
                        <div>
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                background: '#eff6ff',
                                color: '#1E5FC9',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '11px',
                                fontWeight: 800,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                marginBottom: '8px',
                            }}>
                                <span>🏢 &amp; 🚪 Showcase Home-In</span>
                            </div>
                            <h2 className="section-title">
                                Gedung &amp; <span className="text-blue">Kamar Kost</span>
                            </h2>
                            <p className="section-subtitle">
                                Pilihan seluruh gedung kost Home-In serta unit kamar siap huni dengan fasilitas lengkap dan harga terjangkau.
                            </p>
                        </div>

                        <Link to="/kamar" className="btn-detail" style={{ padding: '9px 18px', borderRadius: '12px' }}>
                            Lihat Semua Kamar &rarr;
                        </Link>
                    </div>

                    {/* Search & Mode Switcher Toolbar */}
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        marginBottom: '28px',
                        background: '#ffffff',
                        padding: '12px 18px',
                        borderRadius: '18px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
                    }}>
                        {/* Search Input */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                            <span style={{ fontSize: '16px' }}>🔍</span>
                            <input
                                type="text"
                                placeholder="Cari nama gedung, daerah / lokasi, atau nomor kamar..."
                                value={searchGedung}
                                onChange={(e) => setSearchGedung(e.target.value)}
                                style={{
                                    border: 'none',
                                    outline: 'none',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    color: '#1e293b',
                                    width: '100%',
                                }}
                            />
                            {searchGedung && (
                                <button
                                    type="button"
                                    onClick={() => setSearchGedung('')}
                                    style={{
                                        border: 'none',
                                        background: '#f1f5f9',
                                        borderRadius: '8px',
                                        padding: '4px 8px',
                                        fontSize: '11px',
                                        cursor: 'pointer',
                                        color: '#64748b',
                                    }}
                                >
                                    ✕ Reset
                                </button>
                            )}
                        </div>

                        {/* Segmented Filter Pills */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                                type="button"
                                onClick={() => setActiveTab('all')}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'all' ? '#1E5FC9' : '#f1f5f9',
                                    color: activeTab === 'all' ? '#ffffff' : '#64748b',
                                    transition: 'all 0.2s',
                                    boxShadow: activeTab === 'all' ? '0 2px 8px rgba(30, 95, 201, 0.25)' : 'none',
                                }}
                            >
                                ✨ Semua ({filteredGedungList.length + filteredKamarGroups.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('gedung')}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'gedung' ? '#1E5FC9' : '#f1f5f9',
                                    color: activeTab === 'gedung' ? '#ffffff' : '#64748b',
                                    transition: 'all 0.2s',
                                    boxShadow: activeTab === 'gedung' ? '0 2px 8px rgba(30, 95, 201, 0.25)' : 'none',
                                }}
                            >
                                🏢 Gedung ({filteredGedungList.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('kamar')}
                                style={{
                                    padding: '7px 14px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: activeTab === 'kamar' ? '#1E5FC9' : '#f1f5f9',
                                    color: activeTab === 'kamar' ? '#ffffff' : '#64748b',
                                    transition: 'all 0.2s',
                                    boxShadow: activeTab === 'kamar' ? '0 2px 8px rgba(30, 95, 201, 0.25)' : 'none',
                                }}
                            >
                                🚪 Tipe Kamar ({filteredKamarGroups.length})
                            </button>
                        </div>
                    </div>

                    {/* Empty State When Neither Gedung Nor Kamar Found */}
                    {filteredGedungList.length === 0 && filteredKamarGroups.length === 0 ? (
                        <div
                            style={{
                                padding: '56px 24px',
                                textAlign: 'center',
                                background: '#ffffff',
                                borderRadius: '24px',
                                border: '1px solid #e2e8f0',
                                color: '#64748b',
                            }}
                        >
                            <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
                            <h4 style={{ fontWeight: 800, color: '#1e293b', fontSize: '16px', marginBottom: '6px' }}>
                                {searchGedung ? `Tidak ada gedung atau kamar yang cocok dengan "${searchGedung}"` : 'Belum ada data gedung & kamar'}
                            </h4>
                            <p style={{ fontSize: '13px', color: '#94a3b8', maxWidth: '420px', margin: '0 auto 16px' }}>
                                Coba cari dengan kata kunci lain seperti nama gedung, nama kota, daerah, atau nomor lantai.
                            </p>
                            {searchGedung && (
                                <button
                                    type="button"
                                    onClick={() => setSearchGedung('')}
                                    style={{
                                        background: '#1E5FC9',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        padding: '8px 18px',
                                        fontSize: '12px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                    }}
                                >
                                    Reset Pencarian
                                </button>
                            )}
                        </div>
                    ) : null}

                    {/* SUBSECTION 1: GEDUNG KOST */}
                    {(activeTab === 'all' || activeTab === 'gedung') && filteredGedungList.length > 0 && (
                        <div style={{ marginBottom: (activeTab === 'all' && (filteredKamarGroups?.length || 0) > 0) ? '48px' : '0px' }}>
                            {activeTab === 'all' && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>🏢</span>
                                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                            Pilihan Gedung Kost
                                        </h3>
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: '8px' }}>
                                            {filteredGedungList.length} Gedung
                                        </span>
                                    </div>
                                </div>
                            )}

                            <div className="cards-grid">
                                {filteredGedungList.map((g, idx) => {
                                    const fallbackPhoto = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';
                                    const fotoUrl = cleanPhotoUrl(g.foto, fallbackPhoto);

                                    return (
                                        <div
                                            key={g.id || idx}
                                            style={{
                                                background: '#ffffff',
                                                borderRadius: '20px',
                                                overflow: 'hidden',
                                                border: '1px solid #e2e8f0',
                                                boxShadow: '0 4px 20px rgba(38, 59, 83, 0.07)',
                                                transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                justifyContent: 'space-between',
                                                minHeight: '430px',
                                                height: '100%',
                                            }}
                                            className="group hover:-translate-y-1 hover:shadow-xl"
                                        >
                                            <div>
                                                {/* Photo Container */}
                                                <div style={{ height: '190px', width: '100%', overflow: 'hidden', position: 'relative', background: '#f1f5f9' }}>
                                                    <img
                                                        src={fotoUrl}
                                                        alt={g.nama_gedung}
                                                        onError={(e) => {
                                                            e.target.onerror = null;
                                                            e.target.src = fallbackPhoto;
                                                        }}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                        className="group-hover:scale-105 transition-transform duration-500"
                                                    />
                                                    <span
                                                        style={{
                                                            position: 'absolute',
                                                            top: '12px',
                                                            right: '12px',
                                                            background: g.kamar_kosong_count > 0 ? '#10b981' : '#f43f5e',
                                                            color: '#ffffff',
                                                            fontSize: '11px',
                                                            fontWeight: '800',
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                                        }}
                                                    >
                                                        {g.kamar_kosong_count > 0 ? `${g.kamar_kosong_count} Kamar Kosong` : 'Penuh'}
                                                    </span>
                                                </div>

                                                {/* Card Body */}
                                                <div style={{ padding: '18px 20px 14px' }}>
                                                    {/* 1. Judul: Nama Gedung */}
                                                    <h4
                                                        style={{
                                                            fontSize: '17px',
                                                            fontWeight: 800,
                                                            color: '#1e293b',
                                                            lineHeight: 1.35,
                                                            marginBottom: '8px',
                                                        }}
                                                    >
                                                        {g.nama_gedung || 'Nama Gedung Kost'}
                                                    </h4>

                                                    {/* 2. Deskripsi Kecil: Alamat Lengkap */}
                                                    <p
                                                        style={{
                                                            fontSize: '12px',
                                                            color: '#64748b',
                                                            lineHeight: 1.5,
                                                            marginBottom: '14px',
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: '4px',
                                                        }}
                                                    >
                                                        <span style={{ flexShrink: 0, marginTop: '1px' }}>📍</span>
                                                        <span>{g.alamat || g.cabang_nama || 'Alamat belum diatur'}</span>
                                                    </p>

                                                    {/* 3. Tags Informasi Gedung */}
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                        <span
                                                            style={{
                                                                padding: '5px 10px',
                                                                background: '#f8fafc',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '8px',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                color: '#475569',
                                                            }}
                                                        >
                                                            🏢 {g.jumlah_lantai} Lantai
                                                        </span>
                                                        <span
                                                            style={{
                                                                padding: '5px 10px',
                                                                background: '#f8fafc',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '8px',
                                                                fontSize: '11px',
                                                                fontWeight: 600,
                                                                color: '#475569',
                                                            }}
                                                        >
                                                            🚪 Total {g.jumlah_kamar} Kamar
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Card Footer */}
                                            <div
                                                style={{
                                                    padding: '14px 20px',
                                                    borderTop: '1px solid #f1f5f9',
                                                    background: '#ffffff',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'space-between',
                                                    gap: '12px',
                                                    marginTop: 'auto',
                                                }}
                                            >
                                                <div>
                                                    <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                        Harga Mulai
                                                    </span>
                                                    <span style={{ fontSize: '15px', fontWeight: 800, color: '#1E5FC9' }}>
                                                        {formatRupiah(g.harga_mulai || 600000)}
                                                        <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>/bln</span>
                                                    </span>
                                                </div>
                                                <Link
                                                    to={`/kamar?gedung_id=${g.id}`}
                                                    style={{
                                                        background: '#1E5FC9',
                                                        color: '#ffffff',
                                                        padding: '9px 16px',
                                                        borderRadius: '12px',
                                                        fontSize: '12px',
                                                        fontWeight: 700,
                                                        textDecoration: 'none',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px',
                                                        boxShadow: '0 2px 8px rgba(30, 95, 201, 0.25)',
                                                        transition: 'background 0.2s',
                                                    }}
                                                    className="hover:bg-[#184ea8]"
                                                >
                                                    <span>Lihat Kamar</span>
                                                    <span>&rarr;</span>
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* SUBSECTION 2: KAMAR KOST SIAP HUNI (Dikelompokkan per Lantai & Gedung) */}
                    {(activeTab === 'all' || activeTab === 'kamar') && filteredKamarGroups.length > 0 && (
                        <div>
                            {activeTab === 'all' && (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px' }}>🚪</span>
                                        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                                            Pilihan Kamar Siap Huni
                                        </h3>
                                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, background: '#f1f5f9', padding: '2px 8px', borderRadius: '8px' }}>
                                            {filteredKamarGroups.length} Tipe / Lantai
                                        </span>
                                    </div>
                                    <Link
                                        to="/kamar"
                                        style={{ fontSize: '13px', fontWeight: 700, color: '#1E5FC9', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        className="hover:underline"
                                    >
                                        <span>Lihat Semua Kamar</span>
                                        <span>&rarr;</span>
                                    </Link>
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                {filteredKamarGroups.map((group) => (
                                    <RoomCard key={group.key} kamar={group} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* FOOTER (#kontak) */}
            <footer id="kontak" className="footer">
                <div className="footer-grid">
                    {/* Logo & Deskripsi */}
                    <div className="footer-col">
                        <div className="footer-brand">
                            <div className="brand-icon" style={{ background: '#263b53', padding: '5px' }}>
                                <img
                                    src="/Group 2.svg"
                                    alt="Home-In Logo"
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </div>
                            <span className="footer-brand-text">
                                Home<span>-in</span>
                            </span>
                        </div>
                        <p className="footer-desc">
                            Aplikasi pemesanan kamar kost yang memudahkan kamu menemukan kost terbaik sesuai kebutuhan. Pesan kamar dengan cepat, aman, praktis, kapanpun &amp; di mana saja.
                        </p>
                    </div>

                    {/* Navigasi Footer */}
                    <div className="footer-col">
                        <h5 className="footer-title">Navigasi</h5>
                        <ul className="footer-links">
                            <li>
                                <a href="#hero">Beranda</a>
                            </li>
                            <li>
                                <a href="#tentang">Tentang</a>
                            </li>
                            <li>
                                <a href="#gedung">Gedung &amp; Kamar</a>
                            </li>
                            <li>
                                <a href="#kontak">Kontak</a>
                            </li>
                        </ul>
                    </div>

                    {/* Kontak */}
                    <div className="footer-col">
                        <h5 className="footer-title">Hubungi Kami</h5>
                        <ul className="footer-contact">
                            <li>
                                <span className="brand-footer">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
                                        <circle cx="12" cy="10" r="3" />
                                    </svg>
                                </span>
                                <span>Jl. Terusan Jend. Sudirman, Cimahi</span>
                            </li>
                            <li>
                                <span className="brand-footer">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                                    </svg>
                                </span>
                                <span>0812-3456-7890</span>
                            </li>
                            <li>
                                <span className="brand-footer">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                        <polyline points="22,6 12,13 2,6" />
                                    </svg>
                                </span>
                                <span>halo@home-in.com</span>
                            </li>
                        </ul>
                    </div>

                    {/* Layanan */}
                    <div className="footer-col">
                        <h5 className="footer-title">Jelajahi Kost</h5>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.58)', marginBottom: '12px', lineHeight: '1.6' }}>
                            Ingin lihat daftar seluruh kamar kost siap huni beserta fasilitas dan biayanya?
                        </p>
                        <Link to="/kamar" className="btn-lihat">
                            <span>Lihat Semua Kamar</span>
                            <span>&rarr;</span>
                        </Link>
                    </div>
                </div>

                <div className="footer-bottom">
                    &copy; {new Date().getFullYear()} Home-in. Seluruh hak cipta dilindungi.
                </div>
            </footer>

            {/* Floating FAQ Bubble */}
            <FaqBubble />
        </div>
    );
}
