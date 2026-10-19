import React, { useState } from 'react';
import StatusBadge from '../UI/StatusBadge';
import Modal from '../UI/Modal';

export default function PaymentTable({ payments = [], loading }) {
    const [selectedPayment, setSelectedPayment] = useState(null);

    return (
        <section data-purpose="recent-payments-table">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-bold text-[#263b53]">Pembayaran Terbaru</h2>
                    <p className="text-xs text-[#64748b] mt-0.5">Daftar transaksi pembayaran sewa kost terkini.</p>
                </div>
                <a
                    href="/admin/pembayaran"
                    className="text-xs font-bold text-[#263b53] hover:underline flex items-center gap-1 cursor-pointer"
                >
                    <span>Lihat Semua</span>
                    <span>→</span>
                </a>
            </div>

            <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[760px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-[#f8fafc]/60 text-xs font-bold tracking-wider text-[#64748b] uppercase select-none">
                            <th className="py-3 px-4 w-[240px]">Penghuni</th>
                            <th className="py-3 px-4 w-[180px] whitespace-nowrap">Kamar</th>
                            <th className="py-3 px-4 w-[130px] whitespace-nowrap">Periode</th>
                            <th className="py-3 px-4 w-[160px] whitespace-nowrap text-right">Jumlah Tagihan</th>
                            <th className="py-3 px-4 w-[140px] whitespace-nowrap">Jatuh Tempo</th>
                            <th className="py-3 px-4 w-[130px] whitespace-nowrap text-center">Status</th>
                            <th className="py-3 px-4 w-[80px] text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-[#263b53]">
                        {loading ? (
                            [1, 2, 3, 4, 5].map((i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="py-3.5 px-4"><div className="h-4 w-36 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-4 w-28 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-4 w-20 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-200 rounded ml-auto"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-4 w-24 bg-slate-200 rounded"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-6 w-16 bg-slate-200 rounded-full mx-auto"></div></td>
                                    <td className="py-3.5 px-4"><div className="h-4 w-8 bg-slate-200 rounded ml-auto"></div></td>
                                </tr>
                            ))
                        ) : payments.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="py-8 text-center text-sm text-[#64748b]">
                                    Belum ada transaksi pembayaran.
                                </td>
                            </tr>
                        ) : (
                            payments.map((p) => (
                                <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="py-3.5 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-[#263b53] font-bold text-xs flex items-center justify-center shrink-0">
                                                {p.penghuni_initial}
                                            </div>
                                            <span className="font-bold text-[#263b53] truncate">{p.penghuni_nama}</span>
                                        </div>
                                    </td>
                                    <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                                        {p.kamar_info}
                                    </td>
                                    <td className="py-3.5 px-4 text-slate-600 font-medium whitespace-nowrap">
                                        {p.periode}
                                    </td>
                                    <td className="py-3.5 px-4 font-bold text-[#263b53] whitespace-nowrap text-right">
                                        {p.jumlah_tagihan_format}
                                    </td>
                                    <td className="py-3.5 px-4 text-[#64748b] text-xs font-semibold whitespace-nowrap">
                                        {p.tanggal_jatuh_tempo}
                                    </td>
                                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                        <StatusBadge status={p.status} />
                                    </td>
                                    <td className="py-3.5 px-4 text-right">
                                        <button
                                            onClick={() => setSelectedPayment(p)}
                                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#263b53] hover:bg-blue-50 transition cursor-pointer"
                                            title="Detail Pembayaran"
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

            {/* Modal Detail Pembayaran */}
            {selectedPayment && (
                <Modal
                    isOpen={!!selectedPayment}
                    onClose={() => setSelectedPayment(null)}
                    title="Rincian Pembayaran"
                    maxWidth="max-w-lg"
                    footer={
                        <button
                            onClick={() => setSelectedPayment(null)}
                            className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                        >
                            Tutup
                        </button>
                    }
                >
                    <div className="space-y-4 text-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-[#64748b]">Nama Penghuni:</span>
                            <span className="font-bold text-[#263b53]">{selectedPayment.penghuni_nama}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-[#64748b]">Kamar:</span>
                            <span className="font-semibold text-slate-800">{selectedPayment.kamar_info}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-[#64748b]">Periode Tagihan:</span>
                            <span className="font-semibold text-slate-800">{selectedPayment.periode}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-[#64748b]">Jumlah Tagihan:</span>
                            <span className="text-lg font-bold text-[#263b53]">{selectedPayment.jumlah_tagihan_format}</span>
                        </div>
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <span className="text-[#64748b]">Jatuh Tempo:</span>
                            <span className="font-semibold text-slate-700">{selectedPayment.tanggal_jatuh_tempo}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#64748b]">Status Pembayaran:</span>
                            <StatusBadge status={selectedPayment.status} />
                        </div>
                    </div>
                </Modal>
            )}
        </section>
    );
}
