import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PublicLayout from '../../Layouts/PublicLayout';
import RoomCard from '../../Components/Public/RoomCard';
import FourSquareLoader from '../../Components/UI/FourSquareLoader';
import LeafletMapViewer from '../../Components/UI/LeafletMapViewer';
import api from '../../services/api';

export default function CabangDetail() {
    const { id } = useParams();
    const [cabangData, setCabangData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/public/cabang/${id}`);
                if (res.data?.status === 'success') {
                    setCabangData(res.data.data);
                }
            } catch (err) {
                // handle error
            } finally {
                setLoading(false);
            }
        };

        fetchDetail();
    }, [id]);

    if (loading) {
        return (
            <PublicLayout title="Memuat Cabang...">
                <div className="min-h-[70vh] flex items-center justify-center py-20">
                    <FourSquareLoader size={90} label="Memuat detail cabang..." />
                </div>
            </PublicLayout>
        );
    }

    if (!cabangData || !cabangData.cabang) {
        return (
            <PublicLayout title="Cabang Tidak Ditemukan">
                <div className="max-w-md mx-auto py-20 px-4 text-center">
                    <h2 className="text-xl font-bold text-[#1F2A44] mb-2">Cabang Tidak Ditemukan</h2>
                    <Link to="/cabang" className="px-5 py-2.5 bg-[#1E5FC9] text-white rounded-xl text-xs font-bold">
                        Kembali ke Daftar Cabang
                    </Link>
                </div>
            </PublicLayout>
        );
    }

    const { cabang, gedung } = cabangData;

    // Google Maps Search URL
    const googleMapsUrl =
        cabang.latitude && cabang.longitude
            ? `https://www.google.com/maps?q=${cabang.latitude},${cabang.longitude}`
            : `https://www.google.com/maps?q=${encodeURIComponent(cabang.nama_cabang + ' ' + (cabang.alamat || ''))}`;

    return (
        <PublicLayout title={cabang.nama_cabang}>
            {/* Header */}
            <div className="bg-[#1F2A44] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">Detail Cabang</span>
                            <span className="text-slate-500">•</span>
                            <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
                            >
                                <span>📍 Buka di Google Maps ↗</span>
                            </a>
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-extrabold mt-1">{cabang.nama_cabang}</h1>
                        <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs sm:text-sm text-slate-300 hover:text-white mt-2 flex items-center gap-1.5 group transition"
                        >
                            <span className="text-emerald-400">📍</span>
                            <span className="group-hover:underline">{cabang.alamat}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-white/10 text-slate-300 group-hover:bg-white/20">
                                Buka Peta ↗
                            </span>
                        </a>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span>Google Maps ↗</span>
                        </a>

                        <div className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                            <span className="text-[10px] text-blue-200 uppercase block font-semibold">Kamar Kosong</span>
                            <span className="text-xl font-bold text-emerald-400">{cabang.kamar_kosong} Unit</span>
                        </div>
                        <div className="bg-white/10 px-4 py-2.5 rounded-2xl border border-white/10 text-center">
                            <span className="text-[10px] text-blue-200 uppercase block font-semibold">Total Gedung</span>
                            <span className="text-xl font-bold text-white">{gedung?.length || 1} Gedung</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
                {/* Info Card & Gedung Breakdown */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
                        <span className="text-xs font-bold text-[#1E5FC9] uppercase tracking-wider">Jam Operasional</span>
                        <h4 className="text-base font-bold text-[#1F2A44]">
                            {cabang.jam_operasional_mulai || '06:00'} - {cabang.jam_operasional_selesai || '22:00'} WIB
                        </h4>
                        <p className="text-xs text-[#8A94A6]">
                            Pintu gerbang utama dibuka dan dijaga sesuai jam operasional di atas.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Aturan Jam Malam</span>
                        <h4 className="text-base font-bold text-[#1F2A44]">
                            Pukul {cabang.jam_malam || '23:00'} WIB
                        </h4>
                        <p className="text-xs text-[#8A94A6]">
                            Penghuni wajib mengajukan izin keluar lewat aplikasi jika kembali lewat jam malam.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-3">
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Kontak Langsung</span>
                        <h4 className="text-base font-bold text-[#1F2A44]">
                            {cabang.no_wa || '0812-3456-7890'}
                        </h4>
                        <p className="text-xs text-[#8A94A6]">
                            Hubungi penjaga kost cabang ini via WhatsApp jika ingin survey lokasi.
                        </p>
                    </div>
                </div>

                {/* Interactive Map */}
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 className="text-base font-bold text-[#1F2A44]">Peta Lokasi Cabang</h3>
                            <p className="text-xs text-[#8A94A6]">Klik tombol navigasi untuk membuka rute di aplikasi Google Maps</p>
                        </div>
                        <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition self-start sm:self-auto"
                        >
                            <span>📍 Petunjuk Arah di Google Maps ↗</span>
                        </a>
                    </div>

                    {cabang.latitude && cabang.longitude ? (
                        <LeafletMapViewer
                            latitude={cabang.latitude}
                            longitude={cabang.longitude}
                            title={cabang.nama_cabang}
                            address={cabang.alamat}
                            height="340px"
                        />
                    ) : (
                        <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-xs font-bold text-[#1F2A44] mb-2">{cabang.alamat}</p>
                            <a
                                href={googleMapsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1E5FC9] text-white text-xs font-bold"
                            >
                                <span>Cari di Google Maps ↗</span>
                            </a>
                        </div>
                    )}
                </div>

                {/* Gedung & Kamar List */}
                <div className="space-y-10">
                    {gedung && gedung.map((g) => (
                        <div key={g.id} className="space-y-6">
                            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                                <div>
                                    <h3 className="text-xl font-extrabold text-[#1F2A44]">{g.nama_gedung}</h3>
                                    <p className="text-xs text-[#8A94A6]">Bangunan {g.jumlah_lantai} Lantai • {g.kamar?.length || 0} Kamar</p>
                                </div>
                                <span className="px-3 py-1 bg-[#EAF1FC] text-[#1E5FC9] text-xs font-bold rounded-full">
                                    {g.kamar?.filter((k) => k.status === 'kosong').length || 0} Kosong
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {g.kamar && g.kamar.map((room) => (
                                    <RoomCard key={room.id} kamar={{ ...room, gedung: { ...g, cabang } }} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PublicLayout>
    );
}
