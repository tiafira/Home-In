import React, { useState } from 'react';
import StatusBadge from '../UI/StatusBadge';
import Modal from '../UI/Modal';

export default function ComplaintTable({ complaints = [], loading }) {
    const [selectedComplaint, setSelectedComplaint] = useState(null);

    return (
        <section data-purpose="recent-complaints-section">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-bold text-[#263b53]">Komplain Terbaru</h2>
                    <p className="text-xs text-[#64748b] mt-0.5">Keluhan fasilitas dan layanan yang diajukan penghuni kost.</p>
                </div>
                <a
                    href="/admin/komplain"
                    className="text-xs font-bold text-[#263b53] hover:underline flex items-center gap-1 cursor-pointer"
                >
                    <span>Kelola Semua</span>
                    <span>→</span>
                </a>
            </div>

            <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-[#f8fafc]/60 text-xs font-bold tracking-wider text-[#64748b] uppercase select-none">
                            <th className="py-3 px-4 w-[220px]">Penghuni & Kamar</th>
                            <th className="py-3 px-4 w-[160px] whitespace-nowrap">Kategori</th>
                            <th className="py-3 px-4 flex-1">Isi Komplain</th>
                            <th className="py-3 px-4 w-[130px] whitespace-nowrap text-center">Status</th>
                            <th className="py-3 px-4 w-[120px] whitespace-nowrap text-right">Waktu</th>
                            <th className="py-3 px-4 w-[80px] text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-[#263b53]">
                        {loading ? (
                            [1, 2, 3].map((i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="py-3.5 px-4"><div className="h-4 w-32 bg-slate-200 rounded mb-1"></div><div className="h-3 w-16 bg-slate-100 rounded"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-4 w-52 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-6 w-16 bg-slate-200 rounded-full mx-auto"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-3 w-16 bg-slate-200 rounded ml-auto"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-4 w-8 bg-slate-200 rounded ml-auto"></div></td>
                                </tr>
                            ))
                        ) : complaints.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-sm text-[#64748b]">
                                    Belum ada keluhan atau komplain baru.
                                </td>
                            </tr>
                        ) : (
                            complaints.map((k) => (
                                <tr key={k.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="py-3.5 px-4">
                                        <div className="font-bold text-[#263b53]">{k.penghuni_nama}</div>
                                        <div className="text-xs text-[#64748b] font-semibold">{k.kamar_info}</div>
                                    </td>
                                    <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                                            {k.kategori}
                                        </span>
                                    </td>
                                    <td className="py-3.5 px-4 max-w-xs md:max-w-md">
                                        <p className="text-slate-600 line-clamp-1" title={k.isi}>
                                            {k.isi}
                                        </p>
                                    </td>
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <StatusBadge status={k.status} />
                                    </td>
                                    <td className="py-3.5 px-4 text-xs font-semibold text-[#64748b] whitespace-nowrap text-right">
                                        {k.created_at}
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <button
                                            onClick={() => setSelectedComplaint(k)}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#263b53] hover:bg-blue-50 transition cursor-pointer"
                                            title="Lihat Komplain"
                                            type="button"
                                        >
                                            Detail
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Detail Komplain */}
            {selectedComplaint && (
                <Modal
                    isOpen={!!selectedComplaint}
                    onClose={() => setSelectedComplaint(null)}
                    title="Rincian Komplain Penghuni"
                    maxWidth="max-w-lg"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <a
                                href="/admin/komplain"
                                className="text-xs font-bold text-[#263b53] hover:underline"
                            >
                                Buka di Halaman Komplain →
                            </a>
                            <button
                                onClick={() => setSelectedComplaint(null)}
                                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4 text-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-[#64748b]">Penghuni:</span>
                            <span className="font-bold text-[#263b53]">{selectedComplaint.penghuni_nama} ({selectedComplaint.kamar_info})</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-[#64748b]">Kategori:</span>
                            <span className="font-semibold text-slate-800">{selectedComplaint.kategori}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-[#64748b]">Status:</span>
                            <StatusBadge status={selectedComplaint.status} />
                        </div>
                        <div>
                            <span className="text-xs font-bold uppercase tracking-wider text-[#64748b] block mb-1.5">Isi Keluhan:</span>
                            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                                {selectedComplaint.isi}
                            </div>
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
}
