import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function StatCards({ data, loading }) {
    const navigate = useNavigate();

    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-[130px] bg-slate-200/70 rounded-2xl p-4"></div>
                ))}
            </div>
        );
    }

    const {
        kamar_kosong = { count: 12, label: '12 Kamar', subtext: 'Siap huni' },
        penghuni_aktif = { count: 38, label: '38 Orang', subtext: '76% Kapasitas', avatars: [] },
        pemasukan = { total: 24700000, total_format: 'Rp 24.700.000', periode_label: 'Periode Okt 2026', persen_perubahan: '+5%' },
        komplain_baru = { count: 1, label: '1 Komplain', subtext: '1 belum ditangani' },
    } = data || {};

    const avatarColors = [
        'bg-[#263b53]',
        'bg-[#3b82f6]',
        'bg-emerald-500',
        'bg-amber-500',
    ];

    return (
        <section className="mb-7" data-purpose="quick-access">
            <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                    <h2 className="text-[13px] font-extrabold text-[#263b53] tracking-wider uppercase">QUICK ACCESS</h2>
                    <span className="text-[#3b82f6] text-sm font-bold">&gt;</span>
                </div>
                <span className="text-xs text-[#64748b] hidden sm:inline">Klik kartu untuk membuka modul terkait</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Kamar Kosong -> Dominant #263b53 Card */}
                <div
                    onClick={() => navigate('/admin/kamar')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/kamar')}
                    style={{ backgroundColor: '#263b53' }}
                    className="relative bg-[#263b53] rounded-2xl rounded-tl-none p-4 text-white shadow-md hover:shadow-xl transition-all hover:-translate-y-0.5 cursor-pointer min-h-[130px] flex flex-col justify-between group"
                >
                    <div style={{ backgroundColor: '#263b53' }} className="folder-tab-notch bg-[#263b53]"></div>
                    <div>
                        <span className="text-[12px] font-semibold tracking-wider uppercase text-slate-300 block">KAMAR KOSONG</span>
                        <p className="text-[22px] font-extrabold mt-1 tracking-tight text-white">{kamar_kosong.label}</p>
                    </div>
                    <div className="flex items-center justify-between text-[13px] text-slate-200">
                        <span>{kamar_kosong.subtext}</span>
                        <span className="inline-flex items-center gap-1 font-bold text-xs bg-white text-[#263b53] px-2.5 py-1 rounded-full group-hover:bg-[#3b82f6] group-hover:text-white transition">
                            Kelola &rarr;
                        </span>
                    </div>
                </div>

                {/* 2. Penghuni Aktif -> Crisp White Card with #263b53 Accents */}
                <div
                    onClick={() => navigate('/admin/penghuni')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/penghuni')}
                    className="relative bg-white border border-slate-200/80 rounded-2xl rounded-tl-none p-4 shadow-xs hover:shadow-md hover:border-[#263b53]/30 transition-all hover:-translate-y-0.5 cursor-pointer min-h-[130px] flex flex-col justify-between group"
                >
                    <div className="folder-tab-notch bg-white border-t border-l border-r border-slate-200/80"></div>
                    <div>
                        <span className="text-[12px] font-bold tracking-wider uppercase text-[#64748b] group-hover:text-[#263b53] transition-colors block">PENGHUNI AKTIF</span>
                        <p className="text-[22px] font-extrabold text-[#263b53] mt-1 tracking-tight">{penghuni_aktif.label}</p>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex -space-x-2 overflow-hidden">
                            {penghuni_aktif.avatars && penghuni_aktif.avatars.length > 0 ? (
                                penghuni_aktif.avatars.map((av, idx) => (
                                    <div
                                        key={idx}
                                        className={'inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ring-2 ring-white ' + (avatarColors[idx % avatarColors.length])}
                                    >
                                        {av.initial || 'P'}
                                    </div>
                                ))
                            ) : (
                                ['R', 'D', 'S', '+'].map((initial, idx) => (
                                    <div
                                        key={idx}
                                        className={'inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ring-2 ring-white ' + avatarColors[idx % avatarColors.length]}
                                    >
                                        {initial}
                                    </div>
                                ))
                            )}
                        </div>
                        <span className="text-[12px] font-bold text-[#263b53] group-hover:text-[#3b82f6] transition">{penghuni_aktif.subtext} &rarr;</span>
                    </div>
                </div>

                {/* 3. Pemasukan -> Crisp White Card with #263b53 Accents */}
                <div
                    onClick={() => navigate('/admin/pembayaran')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/pembayaran')}
                    className="relative bg-white border border-slate-200/80 rounded-2xl rounded-tl-none p-4 shadow-xs hover:shadow-md hover:border-[#263b53]/30 transition-all hover:-translate-y-0.5 cursor-pointer min-h-[130px] flex flex-col justify-between group"
                >
                    <div className="folder-tab-notch bg-white border-t border-l border-r border-slate-200/80"></div>
                    <div>
                        <span className="text-[12px] font-bold tracking-wider uppercase text-[#64748b] group-hover:text-[#263b53] transition-colors block">PEMASUKAN BULAN INI</span>
                        <p className="text-[22px] font-extrabold text-[#263b53] mt-1 tracking-tight">{pemasukan.total_format}</p>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#64748b] font-medium">{pemasukan.periode_label}</span>
                        <span className="text-emerald-600 font-bold group-hover:underline">{pemasukan.persen_perubahan} &rarr;</span>
                    </div>
                </div>

                {/* 4. Komplain Baru -> Crisp White Card with #263b53 Accents */}
                <div
                    onClick={() => navigate('/admin/komplain')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate('/admin/komplain')}
                    className="relative bg-white border border-slate-200/80 rounded-2xl rounded-tl-none p-4 shadow-xs hover:shadow-md hover:border-[#263b53]/30 transition-all hover:-translate-y-0.5 cursor-pointer min-h-[130px] flex flex-col justify-between group"
                >
                    <div className="folder-tab-notch bg-white border-t border-l border-r border-slate-200/80"></div>
                    <div>
                        <span className="text-[12px] font-bold tracking-wider uppercase text-[#64748b] group-hover:text-[#263b53] transition-colors block">KOMPLAIN BELUM DITANGGAPI</span>
                        <p className="text-[22px] font-extrabold text-[#263b53] mt-1 tracking-tight">{komplain_baru.label}</p>
                    </div>
                    <div className="flex items-center justify-between text-[12px]">
                        <span className="text-[#64748b] font-medium group-hover:text-[#263b53]">{komplain_baru.subtext} &rarr;</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 ring-4 ring-amber-50"></div>
                    </div>
                </div>
            </div>
        </section>
    );
}
