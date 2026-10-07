import React from 'react';

export default function ComplaintTable({ complaints = [], loading }) {
    const getStatusBadge = (status) => {
        switch (status) {
            case 'baru':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-rose-50 text-rose-600">
                        Baru
                    </span>
                );
            case 'diproses':
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-amber-50 text-amber-600">
                        Diproses
                    </span>
                );
            case 'selesai':
            default:
                return (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-semibold bg-emerald-50 text-emerald-600">
                        Selesai
                    </span>
                );
        }
    };

    return (
        <section className="pt-2 border-t border-slate-100" data-purpose="recent-complaints-section">
            <h2 className="text-[18px] font-semibold text-brand-dark mb-3">Komplain Terbaru</h2>
            <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                    <thead>
                        <tr className="text-[13px] font-medium tracking-wider text-brand-muted uppercase border-b border-slate-100 pb-2">
                            <th className="py-2.5 px-3">PENGHUNI</th>
                            <th className="py-2.5 px-3">KATEGORI</th>
                            <th className="py-2.5 px-3">ISI KOMPLAIN</th>
                            <th className="py-2.5 px-3 text-right">STATUS</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[15px] text-brand-dark">
                        {loading ? (
                            [1, 2, 3].map((i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="py-3 px-3">
                                        <div className="h-4 w-28 bg-slate-200 rounded mb-1"></div>
                                        <div className="h-3 w-16 bg-slate-100 rounded"></div>
                                    </td>
                                    <td className="py-3 px-3"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                                    <td className="py-3 px-3"><div className="h-4 w-52 bg-slate-200 rounded"></div></td>
                                    <td className="py-3 px-3 text-right"><div className="h-6 w-16 bg-slate-200 rounded-full ml-auto"></div></td>
                                </tr>
                            ))
                        ) : complaints.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-brand-muted text-[14px]">
                                    Belum ada data komplain
                                </td>
                            </tr>
                        ) : (
                            complaints.map((c, index) => (
                                <tr key={c.id || index} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-2.5 px-3">
                                        <span className="font-medium text-brand-dark block">{c.penghuni_nama}</span>
                                        <span className="text-[13px] text-brand-muted block">{c.kamar_info}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-[14px] font-medium text-brand-muted">
                                        {c.kategori}
                                    </td>
                                    <td className="py-2.5 px-3 text-[15px] text-brand-dark">
                                        "{c.isi}"
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                        {getStatusBadge(c.status)}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
