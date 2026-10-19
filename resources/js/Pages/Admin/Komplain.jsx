import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import Modal from '../../Components/UI/Modal';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Komplain() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    const [statusFilter, setStatusFilter] = useState('all');
    const [komplains, setKomplains] = useState([]);
    const [counts, setCounts] = useState({ all: 0, baru: 0, diproses: 0, selesai: 0 });
    const [loading, setLoading] = useState(true);

    // Detail & Response Modal
    const [selectedKomplain, setSelectedKomplain] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [responseStatus, setResponseStatus] = useState('diproses');
    const [responseText, setResponseText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const fetchKomplains = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/komplain', {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                },
            });
            if (res.data.status === 'success') {
                setKomplains(res.data.data);
                setCounts(res.data.counts);
            }
        } catch (err) {
            toast.error('Gagal memuat data komplain.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, activeBranchId, toast]);

    useEffect(() => {
        fetchKomplains();
    }, [fetchKomplains]);

    const handleOpenDetail = (k) => {
        setSelectedKomplain(k);
        setResponseStatus(k.status === 'baru' ? 'diproses' : k.status);
        setResponseText(k.balasan || '');
        setModalOpen(true);
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        if (!selectedKomplain) return;
        setSubmitting(true);
        try {
            const res = await api.put(`/admin/komplain/${selectedKomplain.id}/status`, {
                status: responseStatus,
                balasan: responseText,
            });
            toast.success(res.data.message || 'Status dan tanggapan komplain berhasil diperbarui!');
            setModalOpen(false);
            fetchKomplains();
        } catch (err) {
            toast.error('Gagal memperbarui status komplain.');
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        {
            key: 'created_at',
            label: 'Tanggal',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => new Date(row.created_at).toLocaleDateString('id-ID', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            }),
        },
        {
            key: 'penghuni',
            label: 'Pelapor & Kamar',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.penghuni?.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">
                        Kamar {row.penghuni?.kamar?.nomor_kamar} ({row.penghuni?.kamar?.gedung?.cabang?.nama_cabang})
                    </div>
                </div>
            ),
        },
        {
            key: 'kategori',
            label: 'Kategori',
            className: 'whitespace-nowrap',
            render: (row) => (
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                    {row.kategori || 'Umum'}
                </span>
            ),
        },
        {
            key: 'isi',
            label: 'Isi Keluhan',
            render: (row) => (
                <div className="max-w-md">
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">{row.isi}</p>
                    {row.balasan && (
                        <div className="text-[11px] text-blue-600 mt-1 font-medium">
                            ↳ Tanggapan: {row.balasan}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            className: 'whitespace-nowrap',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <button
                    onClick={() => handleOpenDetail(row)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-[#263b53] hover:bg-blue-100 transition"
                >
                    Tanggapi
                </button>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Layanan Komplain"
            subtitle="Tanggapi laporan kerusakan fasilitas, keluhan ketertiban, dan pemeliharaan kamar dari penghuni."
        >
            {/* Status Filter Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
                {[
                    { key: 'all', label: 'Semua Komplain', count: counts.all },
                    { key: 'baru', label: 'Belum Ditanggapi', count: counts.baru, color: 'bg-rose-500' },
                    { key: 'diproses', label: 'Sedang Diproses', count: counts.diproses, color: 'bg-amber-500' },
                    { key: 'selesai', label: 'Selesai Ditangani', count: counts.selesai, color: 'bg-emerald-500' },
                ].map((chip) => {
                    const isSelected = statusFilter === chip.key;
                    return (
                        <button
                            key={chip.key}
                            onClick={() => setStatusFilter(chip.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                                isSelected
                                    ? 'bg-[#263b53] text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span>{chip.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                {chip.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <DataTable
                    columns={columns}
                    data={komplains}
                    loading={loading}
                    searchPlaceholder="Cari isi keluhan, kategori, pelapor..."
                    emptyTitle="Tidak ada data komplain"
                    emptyDescription="Belum ada keluhan yang masuk pada kategori ini."
                />
            </div>

            {/* RESPONSE / DETAIL MODAL */}
            {selectedKomplain && (
                <Modal
                    isOpen={modalOpen}
                    onClose={() => setModalOpen(false)}
                    title={`Detail Komplain #${selectedKomplain.id} - ${selectedKomplain.kategori || 'Umum'}`}
                    maxWidth="max-w-xl"
                >
                    <form onSubmit={handleUpdateStatus} className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <strong className="text-slate-800 text-sm">{selectedKomplain.penghuni?.user?.name}</strong>
                                    <div className="text-slate-500">
                                        Kamar {selectedKomplain.penghuni?.kamar?.nomor_kamar} - {selectedKomplain.penghuni?.kamar?.gedung?.cabang?.nama_cabang}
                                    </div>
                                </div>
                                <StatusBadge status={selectedKomplain.status} />
                            </div>
                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <span className="font-semibold text-slate-500 block mb-1">Isi Keluhan:</span>
                                <p className="text-slate-800 text-sm leading-relaxed bg-white p-3 rounded-lg border border-slate-200/80">
                                    "{selectedKomplain.isi}"
                                </p>
                            </div>

                            {selectedKomplain.foto_lampiran && (
                                <div className="mt-3">
                                    <span className="font-semibold text-slate-500 block mb-1">Foto Lampiran:</span>
                                    <img
                                        src={selectedKomplain.foto_lampiran}
                                        alt="Foto Bukti Kerusakan"
                                        className="max-h-48 rounded-lg border border-slate-200 object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Ubah Status Komplain</label>
                            <select
                                value={responseStatus}
                                onChange={(e) => setResponseStatus(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="baru">Belum Ditanggapi</option>
                                <option value="diproses">Sedang Diproses (Petugas Menangani)</option>
                                <option value="selesai">Selesai (Sudah Diperbaiki)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Berikan Tanggapan / Solusi ke Penghuni
                            </label>
                            <textarea
                                rows={3}
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Contoh: Petugas teknisi sudah kami jadwalkan untuk datang hari ini pukul 14:00..."
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Tutup
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm"
                            >
                                {submitting ? 'Menyimpan...' : 'Simpan Tanggapan'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}
        </AdminLayout>
    );
}
