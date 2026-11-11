import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { extractKecamatanKota } from '../../utils/geoUtils';

export default function RoomCard({ kamar, className = '' }) {
    if (!kamar) return null;

    const [activeSlide, setActiveSlide] = useState(0); // 0 = Foto Gedung, 1 = Foto Kamar Kosong

    const isGroup = Boolean(kamar.kamar_list && kamar.kamar_list.length > 0) || Boolean(kamar.total_kamar_count);

    const gedung = kamar.gedung;
    const cabang = gedung?.cabang || kamar.cabang;

    // Nama Cabang (Header Utama yang Gede sesuai permintaan)
    const cabangName =
        cabang?.nama_cabang ||
        kamar.nama_cabang ||
        kamar.cabang_nama ||
        'Home-In Cabang Cimahi';

    // Nama Gedung
    const gedungName =
        gedung?.nama_gedung ||
        kamar.nama_gedung ||
        'Gedung Kost';

    // Alamat lengkap untuk ekstraksi Kecamatan & Kota di kiri bawah
    const rawAlamat =
        gedung?.alamat ||
        cabang?.alamat ||
        kamar.alamat ||
        '';

    const kecamatanKota = extractKecamatanKota(rawAlamat, 'Cimahi Tengah, Kota Cimahi');

    const lantai = kamar.lantai || 1;
    const totalCount = isGroup
        ? (kamar.total_kamar_count || kamar.kamar_list?.length || 1)
        : 1;

    const kosongCount = isGroup
        ? (kamar.kamar_kosong_count !== undefined
            ? kamar.kamar_kosong_count
            : (kamar.status === 'kosong' ? 1 : 0))
        : (kamar.status === 'kosong' ? 1 : 0);

    const isAvailable = kosongCount > 0;

    // Foto Gedung (Slide 1)
    const gedungPhoto =
        kamar.gedung_foto ||
        gedung?.foto ||
        gedung?.url_foto ||
        (kamar.gedung && (kamar.gedung.foto || kamar.gedung.url_foto)) ||
        null;

    // Foto Kamar Kosong (Slide 2)
    const availableRoomWithPhoto = kamar.kamar_list?.find(
        (k) => k.status === 'kosong' && k.kamar_foto && k.kamar_foto.length > 0
    );
    const anyRoomWithPhoto = kamar.kamar_list?.find(
        (k) => k.kamar_foto && k.kamar_foto.length > 0
    );

    const roomPhoto =
        availableRoomWithPhoto?.kamar_foto[0]?.url_foto ||
        anyRoomWithPhoto?.kamar_foto[0]?.url_foto ||
        (kamar.kamar_foto && kamar.kamar_foto.length > 0 ? kamar.kamar_foto[0].url_foto : null) ||
        kamar.foto ||
        null;

    const fallbackGedungPhoto = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';
    const fallbackRoomPhoto = 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80';

    const cleanPhoto = (url, fallback) => {
        if (!url || typeof url !== 'string') return fallback;
        return url.replace('/storage/storage/', '/storage/');
    };

    // 2 Slides: Slide 1 = Foto Gedung, Slide 2 = Foto Kamar Kosong
    const slides = [
        {
            key: 'gedung',
            label: 'Foto Gedung',
            shortLabel: 'Gedung',
            src: cleanPhoto(gedungPhoto, fallbackGedungPhoto),
            fallback: fallbackGedungPhoto,
            alt: `${cabangName} - Foto Gedung ${gedungName}`,
        },
        {
            key: 'kamar',
            label: 'Foto Kamar Kosong',
            shortLabel: 'Kamar Kosong',
            src: cleanPhoto(roomPhoto, fallbackRoomPhoto),
            fallback: fallbackRoomPhoto,
            alt: `${cabangName} - Foto Kamar Lantai ${lantai}`,
        },
    ];

    // Target link untuk booking / detail
    const targetId =
        kamar.first_available_id ||
        (kamar.kamar_list
            ? (kamar.kamar_list.find((k) => k.status === 'kosong')?.id || kamar.kamar_list[0]?.id)
            : null) ||
        kamar.sample_kamar_id ||
        kamar.id;

    // Format Rupiah
    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    return (
        <div
            className={`group bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between ${className}`}
        >
            <div>
                {/* Media / Photo Thumbnail Container with 2-Slide Carousel */}
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 select-none">
                    {/* Image Link (Clicking outside buttons navigates to room detail) */}
                    <Link to={`/kamar/${targetId}`} className="block w-full h-full relative cursor-pointer">
                        {slides.map((s, idx) => (
                            <img
                                key={s.key}
                                src={s.src}
                                alt={s.alt}
                                loading="lazy"
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = s.fallback;
                                }}
                                className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
                                    idx === activeSlide
                                        ? 'opacity-100 scale-100 z-0'
                                        : 'opacity-0 scale-105 -z-10 pointer-events-none'
                                }`}
                            />
                        ))}
                    </Link>

                    {/* Status Pill Badge (Top Left) */}
                    <div className="absolute top-3 left-3 pointer-events-none z-10">
                        <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border backdrop-blur-md shadow-sm ${
                                isAvailable
                                    ? 'bg-emerald-500/90 text-white border-emerald-400'
                                    : 'bg-rose-500/90 text-white border-rose-400'
                            }`}
                        >
                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                            {isGroup
                                ? (isAvailable ? `${kosongCount} Kamar Kosong` : 'Penuh')
                                : (isAvailable ? 'Tersedia' : 'Penuh')}
                        </span>
                    </div>

                    {/* Floor Badge (Top Right) */}
                    <div className="absolute top-3 right-3 pointer-events-none z-10">
                        <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold shadow-sm">
                            Lantai {lantai}
                        </span>
                    </div>

                    {/* Slide Navigation Arrow Left */}
                    <button
                        type="button"
                        aria-label="Slide sebelumnya"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveSlide((prev) => (prev === 0 ? 1 : 0));
                        }}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 z-20 cursor-pointer shadow-md"
                        title="Lihat foto gedung / kamar"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    {/* Slide Navigation Arrow Right */}
                    <button
                        type="button"
                        aria-label="Slide berikutnya"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setActiveSlide((prev) => (prev === 0 ? 1 : 0));
                        }}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-md transition-all duration-200 opacity-80 hover:opacity-100 hover:scale-105 active:scale-95 z-20 cursor-pointer shadow-md"
                        title="Lihat foto gedung / kamar"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>

                    {/* Bottom Slide Toggle Pills: Slide 1 = Foto Gedung, Slide 2 = Foto Kamar */}
                    <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center z-20 pointer-events-none">
                        <div className="bg-black/60 backdrop-blur-md rounded-full p-1 flex items-center gap-1 shadow-md pointer-events-auto border border-white/20">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveSlide(0);
                                }}
                                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                                    activeSlide === 0
                                        ? 'bg-white text-[#1F2A44] shadow-sm'
                                        : 'text-white/80 hover:text-white'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${activeSlide === 0 ? 'bg-[#1E5FC9]' : 'bg-white/60'}`} />
                                <span>Foto Gedung</span>
                            </button>

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setActiveSlide(1);
                                }}
                                className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full transition-all cursor-pointer ${
                                    activeSlide === 1
                                        ? 'bg-white text-[#1F2A44] shadow-sm'
                                        : 'text-white/80 hover:text-white'
                                }`}
                            >
                                <span className={`w-1.5 h-1.5 rounded-full ${activeSlide === 1 ? 'bg-[#1E5FC9]' : 'bg-white/60'}`} />
                                <span>Foto Kamar</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-5">
                    {/* Gedung & Lantai Subtitle Tag */}
                    <div className="flex items-center gap-1.5 text-xs text-[#8A94A6] mb-1 font-medium">
                        <span className="text-[#1E5FC9]">🏢</span>
                        <span className="truncate">
                            <strong className="text-slate-700 font-semibold">{gedungName}</strong>
                            <span className="text-slate-400 font-normal"> • Lantai {lantai}</span>
                        </span>
                    </div>

                    {/* Title: Gede Header Nama Cabang (Sesuai Permintaan User) */}
                    <Link to={`/kamar/${targetId}`} className="block group-hover:text-[#1E5FC9] transition">
                        <h3 className="font-extrabold text-lg text-[#1F2A44] leading-snug line-clamp-1">
                            {cabangName}
                        </h3>
                    </Link>

                    {/* Highlight Box Keterangan Kamar Kosong */}
                    <div className="mt-2.5 p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#1E5FC9]">
                            <span>✨</span>
                            <span>Lantai {lantai} ada {kosongCount} kamar kosong</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            Total kapasitas {totalCount} unit kamar siap huni
                        </p>
                    </div>

                    {/* Facilities Chips */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                            🚿 KM Dalam
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                            📶 Free WiFi
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">
                            🚪 {totalCount} Unit Kamar
                        </span>
                        {kamar.kamar_fasilitas?.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#1E5FC9] text-[11px] font-semibold">
                                +{kamar.kamar_fasilitas.length} Fasilitas
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer / Pricing & Action Button */}
            <div className="p-5 pt-3 border-t border-slate-100 flex items-end justify-between gap-3">
                {/* Bagian Bawah Kiri: Tulisan Kecil Kecamatan & Kota */}
                <div className="min-w-0">
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 mb-1 truncate" title={kecamatanKota}>
                        <svg className="w-3.5 h-3.5 text-[#1E5FC9] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{kecamatanKota}</span>
                    </div>

                    <span className="text-[10px] text-[#8A94A6] uppercase tracking-wider font-semibold block leading-none mb-0.5">
                        Mulai Dari
                    </span>
                    <p className="text-base sm:text-lg font-black text-[#1E5FC9] leading-tight">
                        {formatRupiah(kamar.harga_bulanan)}
                        <span className="text-xs font-normal text-[#8A94A6]">/bln</span>
                    </p>
                </div>

                {/* Tombol Action Kanan */}
                <div className="shrink-0">
                    <Link
                        to={`/kamar/${targetId}`}
                        className={`px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap ${
                            isAvailable
                                ? 'bg-[#1E5FC9] hover:bg-[#184ea8] text-white shadow-md shadow-blue-500/20 active:scale-95'
                                : 'bg-slate-100 hover:bg-slate-200 text-[#1F2A44]'
                        }`}
                    >
                        <span>{isGroup ? `Pilih Kamar (${kosongCount})` : (isAvailable ? 'Booking' : 'Detail')}</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
