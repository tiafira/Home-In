import React from 'react';
import { Link } from 'react-router-dom';

export default function BranchCard({ cabang, className = '' }) {
    if (!cabang) return null;

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const kamarKosong = cabang.kamar_kosong_count ?? cabang.kamar_kosong ?? 0;
    const totalGedung = cabang.jumlah_gedung ?? cabang.gedung?.length ?? 1;

    // Google Maps URL builder
    const gmapsUrl =
        cabang.latitude && cabang.longitude
            ? `https://www.google.com/maps?q=${cabang.latitude},${cabang.longitude}`
            : `https://www.google.com/maps?q=${encodeURIComponent(
                  (cabang.nama_cabang ? `Home-In ${cabang.nama_cabang} ` : '') + (cabang.alamat || '')
              )}`;

    return (
        <div
            className={`bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between p-6 ${className}`}
        >
            <div>
                {/* Header with Icon and Available badge */}
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#EAF1FC] text-[#1E5FC9] flex items-center justify-center font-bold shadow-sm">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>

                    <span
                        className={`px-3 py-1 rounded-full text-xs font-bold border ${
                            kamarKosong > 0
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                    >
                        {kamarKosong > 0 ? `${kamarKosong} Kamar Kosong` : 'Kamar Penuh'}
                    </span>
                </div>

                {/* Branch Name */}
                <Link to={`/cabang/${cabang.id}`} className="block group">
                    <h3 className="text-xl font-extrabold text-[#1F2A44] group-hover:text-[#1E5FC9] transition mb-1">
                        {cabang.nama_cabang}
                    </h3>
                </Link>

                {/* Address with Clickable Google Maps Action */}
                <a
                    href={gmapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Klik untuk membuka titik lokasi di Google Maps"
                    className="text-xs text-[#8A94A6] hover:text-[#1E5FC9] line-clamp-2 leading-relaxed mb-4 flex items-start gap-1.5 transition group/map"
                >
                    <svg className="w-4 h-4 text-rose-500 shrink-0 mt-0.5 group-hover/map:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>{cabang.alamat || 'Buka lokasi di Google Maps'}</span>
                </a>

                {/* Metadata Pills */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100 flex items-center gap-1">
                        🏢 {totalGedung} Gedung
                    </span>
                    {cabang.jam_malam && (
                        <span className="px-2.5 py-1 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium border border-slate-100 flex items-center gap-1">
                            🌙 Jam Malam: {cabang.jam_malam}
                        </span>
                    )}
                </div>
            </div>

            {/* Bottom Section */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                {cabang.harga_mulai && (
                    <div>
                        <span className="text-[10px] text-[#8A94A6] uppercase tracking-wider block font-semibold">
                            Mulai Dari
                        </span>
                        <p className="text-sm font-black text-[#1E5FC9]">
                            {formatRupiah(cabang.harga_mulai)}
                            <span className="text-[11px] font-normal text-[#8A94A6]">/bln</span>
                        </p>
                    </div>
                )}

                <div className="flex items-center gap-2">
                    <a
                        href={gmapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1"
                        title="Buka rute di Google Maps"
                    >
                        <span>📍 Maps</span>
                    </a>
                    <Link
                        to={`/kamar?cabang_id=${cabang.id}`}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-[#1E5FC9] hover:bg-[#184ea8] shadow-md shadow-blue-500/20 transition active:scale-95"
                    >
                        Lihat Kamar
                    </Link>
                </div>
            </div>
        </div>
    );
}
