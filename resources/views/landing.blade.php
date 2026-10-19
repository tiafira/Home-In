<!DOCTYPE html>
<html lang="id">

<head>

    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Home-in - Kelola Penyewaan Kamar Kost Dengan Mudah</title>

    <!-- Font -->

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>

    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">

    <link rel="stylesheet" href="{{ asset('css/style.css') }}">

</head>

<body>

    <!-- Dekorasi salju -->

    <canvas id="globalSnowCanvas"></canvas>

    <!-- Navbar -->

    <nav class="navbar">

        <div class="nav-brand">

            <div class="brand-icon">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                </svg>
            </div>

            <span class="brand-text">
                Home<span>-in</span>
            </span>

        </div>

        <div class="nav-links">

            <a href="#hero" class="nav-link">
                Beranda
            </a>

            <a href="#tentang" class="nav-link">
                Tentang
            </a>

            <a href="#populer" class="nav-link">
                Populer
            </a>

            <a href="#kontak" class="nav-link">
                Kontak
            </a>

        </div>

        <div>

            <a href="{{ url('/login') }}" class="btn-hero-masuk">

                <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
                    />
                </svg>

                <span>Masuk</span>

            </a>

        </div>

    </nav>

    <!-- Section Hero -->

    <header id="hero" class="hero">

        <div class="hero-bg">

            <img src="{{ asset('img/bg.jpeg') }}" alt="Background Kost">

            <div class="hero-overlay"></div>

        </div>

        <div class="hero-container">

            <div class="hero-text">

                <h1 class="hero-title">

                    Kelola Penyewaan
                    <br>

                    <span class="text-highlight">
                        Kamar Kost
                    </span>

                    <br>

                    Dengan Mudah

                </h1>

                <p class="hero-description">
                    Temukan kamar kost terbaik dengan fasilitas lengkap,
                    lingkungan nyaman, dan proses sewa yang praktis hanya di
                    Home-in.
                </p>

                <a href="#populer" class="btn-hero-pill">

                    Ayo mulai sekarang

                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor"
                        stroke-width="2.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>

                </a>

            </div>

            <div class="hero-media">

                <div class="hero-card-img">

                    <img src="{{ asset('img/bg.jpeg') }}" alt="Foto Kost Preview">

                </div>

            </div>

        </div>

        <!-- Card keungggulan -->

        <div class="features-bar">

            <div class="features-grid">

                <!-- Keunggulan 1 -->

                <div class="feature-item">

                    <div class="feature-icon icon-blue">

                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <polyline points="9 11 12 14 22 4"/>
                        </svg>

                    </div>

                    <div class="feature-info">

                        <h3>Aman & Terpercaya</h3>

                        <p>
                            Data dan transaksi kamu selalu aman.
                        </p>

                    </div>

                </div>

                <!-- Keunggulan 2 -->

                <div class="feature-item">

                    <div class="feature-icon icon-blue">

                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                            <polyline points="9 22 9 12 15 12 15 22"/>
                        </svg>

                    </div>

                    <div class="feature-info">

                        <h3>Pilihan Kost Lengkap</h3>

                        <p>
                            Berbagai tipe kamar tersedia.
                        </p>

                    </div>

                </div>

                <!-- Keunggulan 3 -->

                <div class="feature-item">

                    <div class="feature-icon icon-blue">

                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                        </svg>

                    </div>

                    <div class="feature-info">

                        <h3>Proses Mudah & Cepat</h3>

                        <p>
                            Cari dan booking dengan cepat.
                        </p>

                    </div>

                </div>

                <!-- Keunggulan 4 -->

                <div class="feature-item">

                    <div class="feature-icon icon-blue">

                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
                            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
                            <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
                        </svg>

                    </div>

                    <div class="feature-info">

                        <h3>Customer Service 24/7</h3>

                        <p>
                            Kami siap membantu kapan saja.
                        </p>

                    </div>

                </div>

            </div>

        </div>

    </header>

    <!-- Section Tentang -->

    <section id="tentang" class="section">

        <div class="container">

            <div class="about-grid">

                <div>

                    <h2 class="section-title">

                        Solusi Pemesanan Kamar Kost yang

                        <span class="text-blue">
                            Mudah
                        </span>

                        dan

                        <span class="text-blue">
                            Efisien
                        </span>

                    </h2>

                    <p class="section-description">
                        Home-in hadir untuk memberikan solusi tempat tinggal
                        yang aman, nyaman, dan terjangkau, khususnya bagi
                        pelajar dan mahasiswa.
                    </p>

                </div>

                <div>

                    <div class="img-card-wrapper">

                        <img src="{{ asset('img/gambar1.jpeg') }}" alt="Kunci Rumah" class="about-img">

                    </div>

                </div>

            </div>

            <div class="about-grid">

                <div>

                    <div class="img-card-wrapper">

                        <img
                            src="https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=500&q=80"
                            alt="Kamar Tidur"
                            class="about-img"
                        >

                    </div>

                </div>

                <div>

                    <h3 class="about-subtitle">

                        Cari kost jadi lebih mudah dengan

                        Home-<span class="text-blue">in</span>

                    </h3>

                    <div class="about-list">

                        <div class="about-item">

                            <div class="about-icon">

                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <circle cx="11" cy="11" r="8"/>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                                </svg>

                            </div>

                            <div>

                                <h5>Mudah</h5>

                                <p>
                                    Cari kamar dengan cepat dan praktis.
                                </p>

                            </div>

                        </div>

                        <div class="about-item">

                            <div class="about-icon">

                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                                    <circle cx="12" cy="10" r="3"/>
                                </svg>

                            </div>

                            <div>

                                <h5>Strategis</h5>

                                <p>
                                    Banyak pilihan lokasi di area kampus
                                    & perkantoran.
                                </p>

                            </div>

                        </div>

                        <div class="about-item">

                            <div class="about-icon">

                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                >
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                    <polyline points="9 11 12 14 22 4"/>
                                </svg>

                            </div>

                            <div>

                                <h5>Terpercaya</h5>

                                <p>
                                    Verifikasi akurat dan garansi aman.
                                </p>

                            </div>

                        </div>

                    </div>

                </div>

            </div>

            <!-- Card button cari kamar -->

            <div class="cta-banner">

                <p>
                    Temukan kamar impianmu sekarang bersama kami
                    dengan mudah dan cepat.
                </p>

                <a href="#populer" class="btn-cari">

                    <span>Cari kamar</span>

                    <svg xmlns="http://www.w3.org/2000/svg" class="icon-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>

                </a>

            </div>

        </div>

    </section>

    <!-- Section Populer -->

    <section id="populer" class="section section-alt">

        <div class="container">

            <div class="popular-header">

                <div>

                    <h2 class="section-title">
                        Kost
                        <span class="text-blue">
                            Populer
                        </span>
                    </h2>

                    <p class="section-subtitle">
                        Pilihan kost terbaik dan paling banyak
                        dipesan oleh pengguna Home-in.
                    </p>

                </div>

                <div class="carousel-nav">

                    <button class="nav-btn">
                        ‹
                    </button>

                    <button class="nav-btn active">
                        ›
                    </button>

                </div>

            </div>

            <div class="cards-grid">

                <!-- Card kost 1 -->

                <div class="kost-card">

                    <img
                        src="https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=400&q=80"
                        alt="Kost"
                        class="kost-img"
                    >

                    <div class="kost-body">

                        <h4 class="kost-title">
                            Kost Putri Regalor
                        </h4>

                        <p class="kost-location">
                            📍 Unjani
                        </p>

                        <div class="kost-tags">
                            <span>🛏️ WiFi</span>
                            <span>🚿 KM Dalam</span>
                        </div>

                    </div>

                    <div class="kost-footer">

                        <span class="price-value">
                            Rp 600.000
                            <sub>/bln</sub>
                        </span>

                        <a href="#" class="btn-detail">
                            Lihat Detail →
                        </a>

                    </div>

                </div>

                <!-- Card kost 2 -->

                <div class="kost-card">

                    <img
                        src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=400&q=80"
                        alt="Kost"
                        class="kost-img"
                    >

                    <div class="kost-body">

                        <h4 class="kost-title">
                            Kost Putri Eksklusif
                        </h4>

                        <p class="kost-location">
                            📍 Unjani
                        </p>

                        <div class="kost-tags">
                            <span>🛏️ WiFi</span>
                            <span>🚿 KM Dalam</span>
                        </div>

                    </div>

                    <div class="kost-footer">

                        <span class="price-value">
                            Rp 600.000
                            <sub>/bln</sub>
                        </span>

                        <a href="#" class="btn-detail">
                            Lihat Detail →
                        </a>

                    </div>

                </div>

                <!-- Card kost 3 -->

                <div class="kost-card">

                    <img
                        src="https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?auto=format&fit=crop&w=400&q=80"
                        alt="Kost"
                        class="kost-img"
                    >

                    <div class="kost-body">

                        <h4 class="kost-title">
                            Kost Putra Eksklusif
                        </h4>

                        <p class="kost-location">
                            📍 Unjani
                        </p>

                        <div class="kost-tags">
                            <span>🛏️ WiFi</span>
                            <span>🚿 KM Dalam</span>
                        </div>

                    </div>

                    <div class="kost-footer">

                        <span class="price-value">
                            Rp 600.000
                            <sub>/bln</sub>
                        </span>

                        <a href="#" class="btn-detail">
                            Lihat Detail →
                        </a>

                    </div>

                </div>

                <!-- Card kost 4 -->

                <div class="kost-card">

                    <img
                        src="{{ asset('img/kost1.jpeg') }}"
                        alt="Kost"
                        class="kost-img"
                    >

                    <div class="kost-body">

                        <h4 class="kost-title">
                            Kost Putra VIP
                        </h4>

                        <p class="kost-location">
                            📍 Unjani
                        </p>

                        <div class="kost-tags">
                            <span>🛏️ WiFi</span>
                            <span>🚿 KM Dalam</span>
                        </div>

                    </div>

                    <div class="kost-footer">

                        <span class="price-value">
                            Rp 600.000
                            <sub>/bln</sub>
                        </span>

                        <a href="#" class="btn-detail">
                            Lihat Detail →
                        </a>

                    </div>

                </div>

            </div>

        </div>

    </section>

    <!-- Footer -->

    <footer id="kontak" class="footer">

        <div class="footer-grid">

            <!-- Logo -->

            <div class="footer-col">

                <div class="footer-brand">

                    <div class="brand-icon">

                        <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5"
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>

                    </div>

                    <span class="footer-brand-text">
                        Home<span>-in</span>
                    </span>

                </div>

                <p class="footer-desc">
                    Aplikasi pemesanan kamar kost yang memudahkan kamu
                    menemukan kost terbaik sesuai kebutuhan. Pesan kamar
                    dengan cepat, aman, praktis, kapanpun & di mana saja.
                </p>

            </div>

            <!-- Navigasi footer -->

            <div class="footer-col">

                <h5 class="footer-title">
                    Navigasi
                </h5>

                <ul class="footer-links">

                    <li>
                        <a href="#hero">
                            Beranda
                        </a>
                    </li>

                    <li>
                        <a href="#tentang">
                            Tentang
                        </a>
                    </li>

                    <li>
                        <a href="#populer">
                            Populer
                        </a>
                    </li>

                    <li>
                        <a href="#kontak">
                            Kontak
                        </a>
                    </li>

                </ul>

            </div>

            <!-- Section Kontak -->

            <div class="footer-col">

                <h5 class="footer-title">
                    Hubungi Kami
                </h5>

                <ul class="footer-contact">

                    <li>

                        <span class="brand-footer">

                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/>
                                <circle cx="12" cy="10" r="3"/>
                            </svg>

                        </span>

                        <span>
                            Jl. Mawar No. 12, Unjani
                        </span>

                    </li>

                    <li>

                        <span class="brand-footer">

                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.11 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                            </svg>

                        </span>

                        <span>
                            +62 800-2330-4564
                        </span>

                    </li>

                    <li>

                        <span class="brand-footer">

                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <rect width="20" height="16" x="2" y="4" rx="2"/>
                                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                            </svg>

                        </span>

                        <span>
                            homein@gmail.com
                        </span>

                    </li>

                    <li>

                        <span class="brand-footer">

                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                            </svg>

                        </span>

                        <span>
                            Setiap hari
                            <br>
                            08.00 - 21.00
                        </span>

                    </li>

                </ul>

            </div>

            <!-- Button cari kamar footer -->

            <div class="footer-col">

                <h5 class="footer-title">
                    Temukan kamar yang cocok
                </h5>

                <p class="footer-desc">
                    Temukan kamar kost yang sesuai kebutuhanmu
                    dengan mudah dan cepat.
                </p>

                <br>

                <a href="#populer" class="btn-lihat">

                    <span>
                        Lihat kamar
                    </span>

                    <span>
                        →
                    </span>

                </a>

            </div>

        </div>

        <div class="footer-bottom">

            © 2026 Home-in, All rights reserved.

        </div>

    </footer>

    <script>

        document.addEventListener("DOMContentLoaded", function () {

            const canvas =
                document.getElementById("globalSnowCanvas");

            if (!canvas) return;

            const ctx = canvas.getContext("2d");

            function resizeCanvas() {

                canvas.width = window.innerWidth;

                canvas.height = window.innerHeight;

            }

            resizeCanvas();

            window.addEventListener(
                "resize",
                resizeCanvas
            );

            const particleCount = 120;

            const particles = [];

            for (let i = 0; i < particleCount; i++) {

                particles.push({

                    x: Math.random() * canvas.width,

                    y: Math.random() * canvas.height,

                    size: Math.random() * 3 + 1.5,

                    speedY:
                        Math.random() * 0.4 + 0.1,

                    speedX:
                        (Math.random() - 0.5) * 0.2,

                    opacity:
                        Math.random() * 0.7 + 0.2,

                    rotation:
                        Math.random() * Math.PI,

                    rotSpeed:
                        (Math.random() - 0.5) * 0.02

                });

            }

            function drawStar(
                cx,
                cy,
                spikes,
                outerRadius,
                innerRadius
            ) {

                let rot = (Math.PI / 2) * 3;

                let x = cx;

                let y = cy;

                let step = Math.PI / spikes;

                ctx.beginPath();

                ctx.moveTo(
                    cx,
                    cy - outerRadius
                );

                for (
                    let i = 0;
                    i < spikes;
                    i++
                ) {

                    x =
                        cx +
                        Math.cos(rot) *
                        outerRadius;

                    y =
                        cy +
                        Math.sin(rot) *
                        outerRadius;

                    ctx.lineTo(x, y);

                    rot += step;

                    x =
                        cx +
                        Math.cos(rot) *
                        innerRadius;

                    y =
                        cy +
                        Math.sin(rot) *
                        innerRadius;

                    ctx.lineTo(x, y);

                    rot += step;

                }

                ctx.lineTo(
                    cx,
                    cy - outerRadius
                );

                ctx.closePath();

            }

            function draw() {

                ctx.clearRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                particles.forEach(p => {

                    ctx.save();

                    ctx.translate(
                        p.x,
                        p.y
                    );

                    ctx.rotate(
                        p.rotation
                    );

                    ctx.fillStyle =
                        `rgba(255,255,255,${p.opacity})`;

                    ctx.shadowBlur = 6;

                    ctx.shadowColor =
                        "#ffffff";


                    drawStar(
                        0,
                        0,
                        4,
                        p.size,
                        p.size / 2.5
                    );

                    ctx.fill();

                    ctx.restore();

                    p.y -= p.speedY;

                    p.x += p.speedX;

                    p.rotation +=
                        p.rotSpeed;

                    if (p.y < -10) {

                        p.y =
                            canvas.height + 10;

                        p.x =
                            Math.random() *
                            canvas.width;

                    }

                });

                requestAnimationFrame(draw);

            }

            draw();

        });

    </script>

    <script>

        document.addEventListener(
            "DOMContentLoaded",
            function () {

                const navLinks =
                    document.querySelectorAll(
                        ".nav-link"
                    );

                const sections =
                    document.querySelectorAll(
                        "#hero, #tentang, #populer, #kontak"
                    );

                function setActive(id) {

                    navLinks.forEach(link => {

                        link.classList.toggle(
                            "active",
                            link.getAttribute("href")
                                === "#" + id
                        );

                    });

                }

                navLinks.forEach(link => {

                    link.addEventListener(
                        "click",
                        function (e) {

                            e.preventDefault();

                            const target =
                                document.querySelector(
                                    this.getAttribute("href")
                                );

                            if (!target) return;

                            setActive(
                                target.id
                            );

                            target.scrollIntoView({
                                behavior: "smooth",
                                block: "start"
                            });

                        }
                    );

                });

                const observer =
                    new IntersectionObserver(
                        entries => {

                            entries.forEach(
                                entry => {

                                    if (
                                        entry.isIntersecting
                                    ) {

                                        setActive(
                                            entry.target.id
                                        );

                                    }

                                }
                            );

                        },
                        {
                            threshold: 0.35
                        }
                    );

                sections.forEach(
                    section =>
                        observer.observe(section)
                );

                setActive("hero");

            }
        );

    </script>

</body>

</html>
