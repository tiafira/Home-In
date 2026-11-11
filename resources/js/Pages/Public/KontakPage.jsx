import React, { useState, useEffect } from 'react';
import PublicLayout from '../../Layouts/PublicLayout';
import FourSquareLoader from '../../Components/UI/FourSquareLoader';
import api from '../../services/api';

export default function KontakPage() {
    const [kontakData, setKontakData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchKontak = async () => {
            try {
                const res = await api.get('/public/kontak');
                if (res.data?.status === 'success') {
                    setKontakData(res.data.data);
                }
            } catch (err) {
                // ignore
            } finally {
                setLoading(false);
            }
        };

        fetchKontak();
    }, []);

    return (
        <PublicLayout title="Hubungi Kami">
            <div className="bg-[#1F2A44] text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">Layanan Pelanggan</span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold">Hubungi Pengelola Home-In</h1>
                    <p className="text-xs sm:text-sm text-[#8A94A6]">
                        Tim kami siap membantu Anda dengan informasi kamar, jadwal survey langsung, atau pertanyaan seputar pemesanan.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <FourSquareLoader size={80} label="Memuat informasi kontak..." />
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Pusat Layanan Card */}
                        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-2xl bg-slate-50 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl shrink-0">
                                    💬
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-[#1F2A44]">WhatsApp Hotline</h4>
                                    <p className="text-xs text-[#8A94A6] mt-0.5">{kontakData?.pusat?.whatsapp || '0812-3456-7890'}</p>
                                    <span className="text-[10px] text-emerald-600 font-semibold block mt-1">Respon Cepat 24 Jam</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1E5FC9] flex items-center justify-center text-xl shrink-0">
                                    ✉️
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-[#1F2A44]">Email Resmi</h4>
                                    <p className="text-xs text-[#8A94A6] mt-0.5">{kontakData?.pusat?.email || 'halo@home-in.com'}</p>
                                    <span className="text-[10px] text-[#1E5FC9] font-semibold block mt-1">Pertanyaan & Kerjasama</span>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-50 flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl shrink-0">
                                    ⏰
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm text-[#1F2A44]">Jam Kerja CS</h4>
                                    <p className="text-xs text-[#8A94A6] mt-0.5">{kontakData?.pusat?.jam_operasional || '08:00 - 21:00 WIB'}</p>
                                    <span className="text-[10px] text-amber-600 font-semibold block mt-1">Setiap Hari</span>
                                </div>
                            </div>
                        </div>

                        {/* Cabang-Cabang */}
                        <div>
                            <h3 className="text-xl font-extrabold text-[#1F2A44] mb-6">Kontak Masing-Masing Cabang</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {kontakData?.cabangs?.map((cabang) => (
                                    <div key={cabang.id} className="p-6 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-start justify-between">
                                            <h4 className="font-extrabold text-base text-[#1F2A44]">{cabang.nama_cabang}</h4>
                                            <span className="px-2.5 py-1 bg-[#EAF1FC] text-[#1E5FC9] text-[10px] font-bold rounded-lg uppercase">
                                                Cabang
                                            </span>
                                        </div>

                                        <p className="text-xs text-[#8A94A6] leading-relaxed">
                                            📍 {cabang.alamat}
                                        </p>

                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                                            <span className="text-slate-600 font-semibold">
                                                WA: {cabang.no_wa || '0812-3456-7890'}
                                            </span>
                                            <a
                                                href={`https://wa.me/${cabang.no_wa ? cabang.no_wa.replace(/\D/g, '') : '6281234567890'}?text=${encodeURIComponent(`Halo, saya ingin bertanya tentang kost di cabang ${cabang.nama_cabang}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition text-xs flex items-center gap-1.5"
                                            >
                                                <span>Chat WhatsApp</span>
                                            </a>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}

