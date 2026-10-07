import React from 'react';

export default function StatCards({ data, loading }) {
    if (loading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-[130px] bg-slate-100 rounded-2xl p-4"></div>
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
        'bg-amber-400',
        'bg-rose-400',
        'bg-emerald-400',
        'bg-indigo-500',
    ];

    return (
        <section className="mb-7" data-purpose="quick-access">
            <div className="flex items-center justify-between mb-3.5">
                <div className="flex items-center gap-1.5">
                    <h2 className="text-[14px] font-bold text-[#8A94A6] tracking-wider uppercase">QUICK ACCESS</h2>
                    <span className="text-[#8A94A6] text-sm font-semibold">&gt;</span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Kamar Kosong (Blue Folder Notch) */}
                <div
                    style={{ backgroundColor: '#1E5FC9' }}
                    className="relative bg-[#1E5FC9] rounded-2xl rounded-tl-none p-4 text-white shadow-md hover:shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer min-h-[130px] flex flex-col justify-between"
                >
                    <div style={{ backgroundColor: '#1E5FC9' }} className="folder-tab-notch bg-[#1E5FC9]"></div>
                    <div>
                        <span className="text-[13px] font-medium tracking-wide uppercase text-white/80 block">KAMAR KOSONG</span>
                        <p className="text-[22px] font-bold mt-1 tracking-tight">{kamar_kosong.label}</p>
                    </div>
                    <div className="flex items-center justify-between text-[13px] text-white/90">
                        <span>{kamar_kosong.subtext}</span>
                        <svg className="w-4 h-4 fill-white opacity-95" viewBox="0 0 24 24">
                            <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.428z"></path>
                        </svg>
                    </div>
                </div>

                {/* 2. Penghuni Aktif */}
                <div className="relative bg-[#F4F6FA] border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer min-h-[130px] flex flex-col justify-between">
                    <div className="folder-tab-notch bg-[#F4F6FA] border-t border-l border-r border-slate-100"></div>
                    <div>
                        <span className="text-[13px] font-medium tracking-wide uppercase text-[#8A94A6] block">PENGHUNI AKTIF</span>
                        <p className="text-[22px] font-bold text-[#1F2A44] mt-1 tracking-tight">{penghuni_aktif.label}</p>
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
                        <span className="text-[13px] font-medium text-[#1E5FC9]">{penghuni_aktif.subtext}</span>
                    </div>
                </div>

                {/* 3. Pemasukan */}
                <div className="relative bg-[#F4F6FA] border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer min-h-[130px] flex flex-col justify-between">
                    <div className="folder-tab-notch bg-[#F4F6FA] border-t border-l border-r border-slate-100"></div>
                    <div>
                        <span className="text-[13px] font-medium tracking-wide uppercase text-[#8A94A6] block">PEMASUKAN BULAN INI</span>
                        <p className="text-[22px] font-bold text-[#1F2A44] mt-1 tracking-tight">{pemasukan.total_format}</p>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#8A94A6]">{pemasukan.periode_label}</span>
                        <span className="text-emerald-600 font-semibold">{pemasukan.persen_perubahan}</span>
                    </div>
                </div>

                {/* 4. Komplain Baru */}
                <div className="relative bg-[#F4F6FA] border border-slate-100 rounded-2xl rounded-tl-none p-4 shadow-sm hover:shadow-md transition-transform hover:-translate-y-0.5 cursor-pointer min-h-[130px] flex flex-col justify-between">
                    <div className="folder-tab-notch bg-[#F4F6FA] border-t border-l border-r border-slate-100"></div>
                    <div>
                        <span className="text-[13px] font-medium tracking-wide uppercase text-[#8A94A6] block">KOMPLAIN BARU</span>
                        <p className="text-[22px] font-bold text-[#1F2A44] mt-1 tracking-tight">{komplain_baru.label}</p>
                    </div>
                    <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[#8A94A6]">{komplain_baru.subtext}</span>
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                    </div>
                </div>
            </div>
        </section>
    );
}
