import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import PublicLayout from '../../Layouts/PublicLayout';
import RoomCard from '../../Components/Public/RoomCard';
import FourSquareLoader from '../../Components/UI/FourSquareLoader';
import LeafletMapViewer from '../../Components/UI/LeafletMapViewer';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

export default function KamarDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [loading, setLoading] = useState(true);
    const [detail, setDetail] = useState(null);
    const [activePhotoIndex, setActivePhotoIndex] = useState(0);

    useEffect(() => {
        let isMounted = true;
        const fetchKamarDetail = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/public/kamar/${id}`);
                if (isMounted && res.data?.status === 'success') {
                    setDetail(res.data.data);
                    setActivePhotoIndex(0);
                }
            } catch (err) {
                // handle 404 or error
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchKamarDetail();
        return () => { isMounted = false; };
    }, [id]);

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    if (loading) {
        return (
            <PublicLayout title="Memuat Detail Kamar...">
                <div className="min-h-[70vh] flex items-center justify-center py-20">
                    <FourSquareLoader size={90} label="Memuat informasi kamar..." />
                </div>
            </PublicLayout>
        );
    }

    if (!detail || !detail.kamar) {
        return (
            <PublicLayout title="Kamar Tidak Ditemukan">
                <div className="max-w-md mx-auto py-20 px-4 text-center">
                    <h2 className="text-xl font-bold text-[#1F2A44] mb-2">Kamar Tidak Ditemukan</h2>
                    <p className="text-xs text-[#8A94A6] mb-6">Unit kamar yang Anda cari mungkin sudah tidak tersedia.</p>
                    <Link to="/kamar" className="px-5 py-2.5 bg-[#1E5FC9] text-white rounded-xl text-xs font-bold">
                        Kembali ke Daftar Kamar
                    </Link>
                </div>
            </PublicLayout>
        );
    }

    const { kamar, fasilitas_default, fasilitas_tambahan_tersedia, rekomendasi } = detail;
    const gedung = kamar.gedung;
    const cabang = gedung?.cabang;

    const photos = kamar.kamar_foto && kamar.kamar_foto.length > 0
        ? kamar.kamar_foto.map((f) => f.url_foto)
        : [];

    const isAvailable = kamar.status === 'kosong';

    const handleBookingClick = () => {
        if (!user) {
            navigate(`/login?redirect=${encodeURIComponent(`/booking/${kamar.id}`)}`);
        } else if (user.role === 'calon_penghuni') {
            navigate(`/booking/${kamar.id}`);
        } else if (['pemilik', 'admin'].includes(user.role)) {
            alert('Anda login sebagai admin/pemilik. Calon penghuni harus menggunakan akun calon penghuni untuk memesan.');
        } else {
            navigate('/mobile-app');
        }
    };

    return (
        <PublicLayout title={`Kamar ${kamar.nomor_kamar} - ${cabang?.nama_cabang || ''}`}>
            {/* Breadcrumb Bar */}
            <div className="bg-white border-b border-slate-100 py-3 px-4 sm:px-6 lg:px-8">
                <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-[#8A94A6]">
                    <Link to="/" className="hover:text-[#1E5FC9]">Beranda</Link>
                    <span>/</span>
                    <Link to="/kamar" className="hover:text-[#1E5FC9]">Kamar</Link>
                    <span>/</span>
                    <span className="text-[#1F2A44] font-semibold">Kamar {kamar.nomor_kamar}</span>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* LEFT COLUMN: Photos & Room Details */}
                    <div className="lg:col-span-8 space-y-8">
                        {/* Gallery Section */}
                        <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-sm space-y-4">
                            {/* Main Active Picture */}
                            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-100 relative shadow-inner">
                                {photos.length > 0 ? (
                                    <img
                                        src={photos[activePhotoIndex]}
                                        alt={`Kamar ${kamar.nomor_kamar}`}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-100 to-blue-50 text-slate-400">
                                        <svg className="w-16 h-16 text-[#1E5FC9]/25 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs font-semibold">Belum ada foto yang diupload</span>
                                    </div>
                                )}

                                {/* Status Pill */}
                                <div className="absolute top-4 left-4">
                                    <span
                                        className={`px-3.5 py-1.5 rounded-full text-xs font-bold border backdrop-blur-md shadow ${
                                            isAvailable
                                                ? 'bg-emerald-500/90 text-white border-emerald-400'
                                                : 'bg-rose-500/90 text-white border-rose-400'
                                        }`}
                                    >
                                        {isAvailable ? 'Tersedia untuk Booking' : 'Status: ' + kamar.status}
                                    </span>
                                </div>
                            </div>

                            {/* Thumbnails Carousel */}
                            {photos.length > 1 && (
                                <div className="flex gap-3 overflow-x-auto pb-2">
                                    {photos.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActivePhotoIndex(idx)}
                                            className={`relative w-20 h-16 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                                                activePhotoIndex === idx
                                                    ? 'border-[#1E5FC9] ring-2 ring-blue-200'
                                                    : 'border-transparent opacity-70 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={url} alt="thumb" className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Title & Metadata */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                                <div>
                                    <div className="flex items-center gap-2 text-xs font-semibold text-[#8A94A6] mb-1">
                                        <span>{cabang?.nama_cabang}</span>
                                        <span>•</span>
                                        <span>{gedung?.nama_gedung}</span>
                                        <span>•</span>
                                        <span>Lantai {kamar.lantai}</span>
                                    </div>
                                    <h1 className="text-2xl sm:text-3xl font-black text-[#1F2A44]">
                                        Kamar {kamar.nomor_kamar}
                                    </h1>
                                </div>

                                <div className="text-left sm:text-right">
                                    <span className="text-[11px] text-[#8A94A6] block uppercase tracking-wider font-semibold">Harga Sewa</span>
                                    <p className="text-2xl sm:text-3xl font-black text-[#1E5FC9]">
                                        {formatRupiah(kamar.harga_bulanan)}
                                        <span className="text-xs font-normal text-[#8A94A6]">/bulan</span>
                                    </p>
                                </div>
                            </div>

                            {/* Quick Specs Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-50 text-xs">
                                <div>
                                    <span className="text-[#8A94A6] block">Lantai</span>
                                    <strong className="text-[#1F2A44] text-sm">Lantai {kamar.lantai}</strong>
                                </div>
                                <div>
                                    <span className="text-[#8A94A6] block">Luas Kamar</span>
                                    <strong className="text-[#1F2A44] text-sm">{kamar.luas_m2 || '3 x 4'} m²</strong>
                                </div>
                                <div>
                                    <span className="text-[#8A94A6] block">Kapasitas</span>
                                    <strong className="text-[#1F2A44] text-sm">{kamar.kapasitas || 1} Orang</strong>
                                </div>
                                <div>
                                    <span className="text-[#8A94A6] block">Kamar Mandi</span>
                                    <strong className="text-emerald-600 text-sm font-bold">Dalam</strong>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <h3 className="text-base font-bold text-[#1F2A44] mb-2">Deskripsi Kamar</h3>
                                <p className="text-xs sm:text-sm text-[#8A94A6] leading-relaxed whitespace-pre-line">
                                    {kamar.deskripsi || 'Kamar kost nyaman, bersih, dan siap huni dengan ventilasi yang baik serta pencahayaan alami optimal.'}
                                </p>
                            </div>

                            {/* Fasilitas Default Termasuk */}
                            <div>
                                <h3 className="text-base font-bold text-[#1F2A44] mb-3">Fasilitas Termasuk (Gratis)</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="p-3 bg-blue-50/60 rounded-xl flex items-center gap-3 text-xs font-semibold text-[#1F2A44]">
                                        <span className="text-lg">🚿</span>
                                        <span>Kamar Mandi Dalam</span>
                                    </div>
                                    <div className="p-3 bg-blue-50/60 rounded-xl flex items-center gap-3 text-xs font-semibold text-[#1F2A44]">
                                        <span className="text-lg">📶</span>
                                        <span>Free WiFi Kecepatan Tinggi</span>
                                    </div>
                                    <div className="p-3 bg-blue-50/60 rounded-xl flex items-center gap-3 text-xs font-semibold text-[#1F2A44]">
                                        <span className="text-lg">🛡️</span>
                                        <span>Penjaga Standby 24 Jam</span>
                                    </div>
                                    <div className="p-3 bg-blue-50/60 rounded-xl flex items-center gap-3 text-xs font-semibold text-[#1F2A44]">
                                        <span className="text-lg">🏍️</span>
                                        <span>Area Parkir Kendaraan</span>
                                    </div>
                                    {fasilitas_default.map((f) => (
                                        <div key={f.id} className="p-3 bg-slate-50 rounded-xl flex items-center gap-3 text-xs font-semibold text-[#1F2A44]">
                                            <span className="text-lg">✨</span>
                                            <span>{f.nama_fasilitas}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Fasilitas Tambahan yang Bisa Direquest */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-base font-bold text-[#1F2A44]">Fasilitas Tambahan (Opsional)</h3>
                                    <span className="text-xs text-[#8A94A6]">Dapat dipilih saat booking</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {fasilitas_tambahan_tersedia.map((f) => (
                                        <div key={f.id} className="p-4 rounded-2xl border border-slate-200 bg-white flex items-center justify-between">
                                            <div>
                                                <p className="text-xs font-bold text-[#1F2A44]">{f.nama_fasilitas}</p>
                                                <p className="text-[11px] text-[#8A94A6]">{f.deskripsi || 'Fasilitas tambahan request'}</p>
                                            </div>
                                            <span className="text-xs font-extrabold text-[#1E5FC9]">
                                                +{formatRupiah(f.biaya_tambahan)}/bln
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Lokasi & Aturan Cabang */}
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h3 className="text-base font-bold text-[#1F2A44]">Lokasi & Ketentuan Kost</h3>
                                {cabang && (
                                    <a
                                        href={
                                            cabang.latitude && cabang.longitude
                                                ? `https://www.google.com/maps?q=${cabang.latitude},${cabang.longitude}`
                                                : `https://www.google.com/maps?q=${encodeURIComponent(cabang.nama_cabang + ' ' + (cabang.alamat || ''))}`
                                        }
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                                    >
                                        <span>📍 Buka Petunjuk Arah di Google Maps ↗</span>
                                    </a>
                                )}
                            </div>

                            {/* Leaflet Map Viewer */}
                            {cabang?.latitude && cabang?.longitude && (
                                <div>
                                    <LeafletMapViewer
                                        latitude={cabang.latitude}
                                        longitude={cabang.longitude}
                                        title={cabang.nama_cabang}
                                        address={cabang.alamat}
                                        height="280px"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                <a
                                    href={
                                        cabang?.latitude && cabang?.longitude
                                            ? `https://www.google.com/maps?q=${cabang.latitude},${cabang.longitude}`
                                            : `https://www.google.com/maps?q=${encodeURIComponent((cabang?.nama_cabang || '') + ' ' + (cabang?.alamat || ''))}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-4 rounded-2xl bg-slate-50 hover:bg-blue-50 transition group block"
                                >
                                    <span className="text-[#8A94A6] block mb-1">Alamat Cabang:</span>
                                    <p className="font-semibold text-[#1F2A44] group-hover:text-[#1E5FC9] leading-relaxed">
                                        📍 {cabang?.alamat || 'Alamat lengkap cabang'} ↗
                                    </p>
                                </a>

                                <div className="p-4 rounded-2xl bg-slate-50 space-y-2">
                                    <div>
                                        <span className="text-[#8A94A6] block">Jam Operasional Gerbang:</span>
                                        <strong className="text-[#1F2A44]">
                                            {cabang?.jam_operasional_mulai || '06:00'} - {cabang?.jam_operasional_selesai || '22:00'} WIB
                                        </strong>
                                    </div>
                                    <div>
                                        <span className="text-[#8A94A6] block">Aturan Jam Malam:</span>
                                        <strong className="text-amber-600">
                                            {cabang?.jam_malam ? `Maksimal Pukul ${cabang.jam_malam} WIB` : 'Diberlakukan Jam Malam'}
                                        </strong>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Sticky Booking Card */}
                    <div className="lg:col-span-4 sticky top-28 space-y-6">
                        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-xl space-y-6">
                            <div>
                                <span className="text-xs text-[#8A94A6] block uppercase tracking-wider font-semibold">Harga Sewa Kamar</span>
                                <div className="flex items-baseline gap-1 mt-1">
                                    <span className="text-3xl font-black text-[#1E5FC9]">
                                        {formatRupiah(kamar.harga_bulanan)}
                                    </span>
                                    <span className="text-xs text-[#8A94A6]">/ bulan</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Status Kamar</span>
                                    <strong className={isAvailable ? 'text-emerald-600' : 'text-rose-600'}>
                                        {isAvailable ? 'Tersedia' : 'Penuh / Dibooking'}
                                    </strong>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Biaya Tambahan</span>
                                    <span>Tergantung request kasur/lemari</span>
                                </div>
                                <div className="flex justify-between text-slate-600">
                                    <span>Minimal Sewa</span>
                                    <span>1 Bulan</span>
                                </div>
                            </div>

                            <div>
                                <button
                                    onClick={handleBookingClick}
                                    disabled={!isAvailable}
                                    className={`w-full py-4 rounded-2xl font-extrabold text-sm transition shadow-lg flex items-center justify-center gap-2 ${
                                        isAvailable
                                            ? 'bg-[#1E5FC9] hover:bg-[#184ea8] text-white shadow-blue-500/25 active:scale-95 cursor-pointer'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                                    }`}
                                >
                                    <span>{isAvailable ? 'Pesan (Booking) Sekarang' : 'Kamar Sedang Penuh'}</span>
                                    {isAvailable && (
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                        </svg>
                                    )}
                                </button>
                                {!user && isAvailable && (
                                    <p className="text-[11px] text-[#8A94A6] text-center mt-2">
                                        Anda akan diarahkan untuk login terlebih dahulu sebelum booking.
                                    </p>
                                )}
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-lg shrink-0">
                                    💬
                                </div>
                                <div className="text-xs">
                                    <p className="font-bold text-[#1F2A44]">Punya Pertanyaan?</p>
                                    <a
                                        href={`https://wa.me/${cabang?.no_wa ? cabang.no_wa.replace(/\D/g, '') : '6281234567890'}?text=${encodeURIComponent(`Halo Home-In, saya ingin bertanya tentang Kamar ${kamar.nomor_kamar} di ${cabang?.nama_cabang}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[#1E5FC9] hover:underline font-semibold"
                                    >
                                        Chat WhatsApp Pengelola &rarr;
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recommendations */}
                {rekomendasi && rekomendasi.length > 0 && (
                    <div className="mt-20 pt-10 border-t border-slate-200">
                        <h3 className="text-xl font-extrabold text-[#1F2A44] mb-6">
                            Kamar Lain di Cabang yang Sama
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {rekomendasi.map((rec) => (
                                <RoomCard key={rec.id} kamar={rec} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}

