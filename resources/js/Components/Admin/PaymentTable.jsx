import React from 'react';

export default function PaymentTable({ payments = [], loading }) {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'lunas':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-emerald-50 text-emerald-600">
                        Lunas
                    </span>
                );
            case 'menunggu_konfirmasi':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-amber-50 text-amber-600">
                        Menunggu Konfirmasi
                    </span>
                );
            case 'telat':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-rose-50 text-rose-600">
                        Telat
                    </span>
                );
            case 'belum_bayar':
            default:
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-slate-100 text-slate-600">
                        Belum Bayar
                    </span>
                );
        }
    };

    const getAvatarBg = (initial) => {
        const charCode = (initial || 'A').charCodeAt(0);
        const colors = [
            'bg-blue-100 text-brand-blue',
            'bg-emerald-100 text-emerald-600',
            'bg-rose-100 text-rose-600',
            'bg-indigo-100 text-indigo-600',
            'bg-slate-200 text-slate-700',
        ];
        return colors[charCode % colors.length];
    };

    return (
        <section className="mb-7" data-purpose="recent-payments-table">
            <h2 className="text-[18px] font-semibold text-brand-dark mb-3">Pembayaran Terbaru</h2>
            <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="text-[13px] font-medium tracking-wider text-brand-muted uppercase border-b border-slate-100 pb-2">
                            <th className="py-2.5 px-3">PENGHUNI</th>
                            <th className="py-2.5 px-3">KAMAR</th>
                            <th className="py-2.5 px-3">PERIODE</th>
                            <th className="py-2.5 px-3">JUMLAH TAGIHAN</th>
                            <th className="py-2.5 px-3">JATUH TEMPO</th>
                            <th className="py-2.5 px-3 text-center">STATUS</th>
                            <th className="py-2.5 px-3 text-right">AKSI</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/70 text-[15px] text-brand-dark">
                        {loading ? (
                            [1, 2, 3, 4, 5, 6].map((i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="py-3.5 px-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-7 h-7 rounded-full bg-slate-200"></div>
                                            <div className="h-4 w-28 bg-slate-200 rounded"></div>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-3"><div className="h-4 w-32 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-3"><div className="h-4 w-16 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-3"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-3"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-3 text-center"><div className="h-6 w-24 bg-slate-200 rounded-full mx-auto"></div></td>
                                    <td className="py-3.5 px-3 text-right"><div className="h-4 w-4 bg-slate-200 rounded ml-auto"></div></td>
                                </tr>
                            ))
                        ) : payments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-10 text-center text-brand-muted text-[14px]">
                                    Belum ada data pembayaran
                                </td>
                            </tr>
                        ) : (
                            payments.map((p, index) => {
                                const isHighlighted = p.status === 'menunggu_konfirmasi';

                                return (
                                    <tr
                                        key={p.id || index}
                                        className={'transition-colors ' + (isHighlighted ? 'bg-brand-lightBlue rounded-xl cursor-pointer' : 'hover:bg-slate-50')}
                                    >
                                        <td className="py-3 px-3">
                                            <div className="flex items-center gap-3">
                                                <span
                                                    className={'w-7 h-7 rounded-full font-bold text-[13px] flex items-center justify-center flex-shrink-0 ' +
                                                        (isHighlighted ? 'bg-brand-blue text-white' : getAvatarBg(p.penghuni_initial))}
                                                >
                                                    {p.penghuni_initial}
                                                </span>
                                                <span className={'font-semibold text-[15px] ' + (isHighlighted ? 'text-brand-dark' : '')}>
                                                    {p.penghuni_nama}
                                                </span>
                                            </div>
                                        </td>
                                        <td className={'py-3 px-3 text-[15px] ' + (isHighlighted ? 'text-brand-dark font-medium' : 'text-brand-muted font-medium')}>
                                            {p.kamar_info}
                                        </td>
                                        <td className={'py-3 px-3 text-[15px] ' + (isHighlighted ? 'text-brand-dark' : 'text-brand-muted')}>
                                            {p.periode}
                                        </td>
                                        <td className={'py-3 px-3 text-[15px] ' + (isHighlighted ? 'font-bold text-brand-blue' : 'font-semibold text-brand-dark')}>
                                            {p.jumlah_tagihan_format}
                                        </td>
                                        <td className={'py-3 px-3 text-[15px] ' + (p.status === 'telat' ? 'text-rose-500 font-medium' : (isHighlighted ? 'text-brand-dark' : 'text-brand-muted'))}>
                                            {p.tanggal_jatuh_tempo}
                                        </td>
                                        <td className="py-3 px-3 text-center">
                                            {getStatusBadge(p.status)}
                                        </td>
                                        <td className="py-3 px-3 text-right">
                                            {isHighlighted ? (
                                                <div className="flex items-center justify-end gap-2 text-brand-blue font-bold">
                                                    <svg className="w-3.5 h-3.5 fill-brand-blue" viewBox="0 0 24 24">
                                                        <path d="M4 0l16 12.279-6.951 1.17 4.325 8.817-3.596 1.734-4.35-8.879-5.428 5.428z"></path>
                                                    </svg>
                                                    <button aria-label={'Aksi baris ' + p.penghuni_nama} className="p-1 text-brand-dark hover:text-brand-blue text-lg" type="button">
                                                        ⋯
                                                    </button>
                                                </div>
                                            ) : (
                                                <button aria-label={'Aksi baris ' + p.penghuni_nama} className="p-1 text-brand-muted hover:text-brand-dark text-lg" type="button">
                                                    ⋯
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
