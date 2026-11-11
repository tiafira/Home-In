import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function Komplain() {
    const { toast } = useToast();

    const [statusFilter, setStatusFilter] = useState('all');
    const [komplains, setKomplains] = useState([]);
    const [counts, setCounts] = useState({ all: 0, menunggu: 0, sedang_dikerjakan: 0, selesai: 0 });
    const [staffList, setStaffList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Detail & Tanggapan Modal
    const [selectedKomplain, setSelectedKomplain] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [responseStatus, setResponseStatus] = useState('sedang_dikerjakan');
    const [responseText, setResponseText] = useState('');
    const [submittingStatus, setSubmittingStatus] = useState(false);

    // Modal Penugasan Karyawan
    const [assignModalOpen, setAssignModalOpen] = useState(false);
    const [assignForm, setAssignForm] = useState({
        karyawan_id: '',
        catatan_progres: '',
        estimasi_selesai: '',
    });
    const [submittingAssign, setSubmittingAssign] = useState(false);

    // Confirm Delete
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [targetDelete, setTargetDelete] = useState(null);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const fetchKomplains = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/komplain', {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                },
            });
            if (res.data?.status === 'success') {
                setKomplains(res.data.data || []);
                if (res.data.counts) {
                    setCounts(res.data.counts);
                }
                if (res.data.staff_list) {
                    setStaffList(res.data.staff_list);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat data komplain.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, toast]);

    useEffect(() => {
        fetchKomplains();
    }, [fetchKomplains]);

    const handleOpenDetail = (k) => {
        setSelectedKomplain(k);
        setResponseStatus(k.status === 'menunggu' ? 'sedang_dikerjakan' : k.status);
        setResponseText(k.balasan || '');
        setDetailModalOpen(true);
    };

    const handleOpenAssign = (k) => {
        setSelectedKomplain(k);
        setAssignForm({
            karyawan_id: k.karyawan_id ? String(k.karyawan_id) : (staffList.length > 0 ? String(staffList[0].id) : ''),
            catatan_progres: k.catatan_progres || '',
            estimasi_selesai: k.estimasi_selesai ? k.estimasi_selesai.slice(0, 10) : '',
        });
        setAssignModalOpen(true);
    };

    const handleSubmitAssign = async (e) => {
        e.preventDefault();
        if (!selectedKomplain || !assignForm.karyawan_id) {
            toast.error('Pilih karyawan/petugas yang ditugaskan.');
            return;
        }

        setSubmittingAssign(true);
        try {
            const res = await api.post(`/admin/komplain/${selectedKomplain.id}/assign`, assignForm);
            if (res.data?.status === 'success') {
                toast.success('Karyawan berhasil ditugaskan untuk menangani komplain ini.');
                setAssignModalOpen(false);
                fetchKomplains();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menugaskan karyawan.');
        } finally {
            setSubmittingAssign(false);
        }
    };

    const handleUpdateStatus = async (e) => {
        e.preventDefault();
        if (!selectedKomplain) return;
        setSubmittingStatus(true);
        try {
            const res = await api.put(`/admin/komplain/${selectedKomplain.id}/status`, {
                status: responseStatus,
                balasan: responseText,
            });
            toast.success(res.data?.message || 'Status dan tanggapan berhasil disimpan!');
            setDetailModalOpen(false);
            fetchKomplains();
        } catch (err) {
            toast.error('Gagal memperbarui status komplain.');
        } finally {
            setSubmittingStatus(false);
        }
    };

    const handleDelete = async () => {
        if (!targetDelete) return;
        setSubmittingDelete(true);
        try {
            const res = await api.delete(`/admin/komplain/${targetDelete.id}`);
            if (res.data?.status === 'success') {
                toast.success('Komplain dipindahkan ke Baru Saja Dihapus.');
                setDeleteModalOpen(false);
                setTargetDelete(null);
                fetchKomplains();
            }
        } catch (err) {
            toast.error('Gagal menghapus komplain.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'menunggu':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Menunggu
                    </span>
                );
            case 'sedang_dikerjakan':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                        Sedang Dikerjakan
                    </span>
                );
            case 'selesai':
                return (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Selesai
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
                        {status}
                    </span>
                );
        }
    };

    const columns = [
        {
            key: 'tanggal',
            label: 'Tanggal & Pelapor',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 text-xs">
                        {row.penghuni?.user?.name || row.penghuni?.user?.nama || 'Penghuni'}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-semibold text-blue-600">
                            Kamar {row.penghuni?.kamar?.nomor_kamar || '-'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>
                            {new Date(row.created_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                            })}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'kategori',
            label: 'Kategori & Isi Keluhan',
            render: (row) => (
                <div className="max-w-md space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-wider">
                            {row.kategori || 'Umum'}
                        </span>
                    </div>
                    <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed">
                        {row.isi}
                    </p>
                    {row.balasan && (
                        <div className="text-[11px] text-blue-600 bg-blue-50/70 p-1.5 rounded-lg border border-blue-100">
                            <strong>Respon:</strong> {row.balasan}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'penugasan',
            label: 'Petugas / Teknisi',
            render: (row) => {
                if (row.karyawan) {
                    return (
                        <div className="space-y-0.5">
                            <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                                {row.karyawan.user?.name || 'Petugas'}
                            </div>
                            <div className="text-[11px] text-slate-500 capitalize">
                                {row.karyawan.jabatan || 'Teknisi'}
                            </div>
                            {row.estimasi_selesai && (
                                <div className="text-[10px] text-emerald-700 font-medium bg-emerald-50 px-1.5 py-0.5 rounded w-fit">
                                    Target: {new Date(row.estimasi_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                </div>
                            )}
                        </div>
                    );
                }
                return (
                    <span className="text-xs text-slate-400 italic">
                        Belum ada petugas
                    </span>
                );
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => getStatusBadge(row.status),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => handleOpenAssign(row)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-sm border border-blue-200"
                        title="Tugaskan teknisi atau staf"
                    >
                        {row.karyawan ? 'Ubah Petugas' : 'Tugaskan Petugas'}
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenDetail(row)}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                        title="Tanggapi atau ubah status"
                    >
                        Tanggapi
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setTargetDelete(row);
                            setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus komplain"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout title="Layanan Komplain">
            <div className="space-y-6">
                {/* Header Title */}
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Layanan Komplain</h1>
                    <p className="text-xs sm:text-sm text-slate-500 mt-1">
                        Tangani laporan keluhan fasilitas dan ketertiban. Tugaskan staf/teknisi dan pantau progres perbaikan (Menunggu → Sedang Dikerjakan → Selesai).
                    </p>
                </div>

                {/* Filter Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {[
                        { key: 'all', label: 'Semua Komplain', count: counts.all },
                        { key: 'menunggu', label: 'Menunggu', count: counts.menunggu },
                        { key: 'sedang_dikerjakan', label: 'Sedang Dikerjakan', count: counts.sedang_dikerjakan },
                        { key: 'selesai', label: 'Selesai', count: counts.selesai },
                    ].map((tab) => {
                        const isSelected = statusFilter === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                                    isSelected
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span>{tab.label}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    {tab.count}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* Data Table */}
                <DataTable
                    columns={columns}
                    data={komplains}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder="Cari isi keluhan, kategori, pelapor, kamar, atau petugas..."
                    emptyMessage="Tidak ada keluhan yang masuk pada kategori ini."
                />
            </div>

            {/* Modal Penugasan Karyawan */}
            <Modal
                isOpen={assignModalOpen}
                onClose={() => setAssignModalOpen(false)}
                title={`Penugasan Petugas - Komplain #${selectedKomplain?.id}`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmitAssign} className="space-y-4">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="font-semibold text-slate-700">Pelapor: {selectedKomplain?.penghuni?.user?.name} (Kamar {selectedKomplain?.penghuni?.kamar?.nomor_kamar})</div>
                        <div className="text-slate-500 mt-1 line-clamp-2">"{selectedKomplain?.isi}"</div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Pilih Karyawan / Teknisi <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={assignForm.karyawan_id}
                            onChange={(e) => setAssignForm({ ...assignForm, karyawan_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">-- Pilih Staf / Teknisi --</option>
                            {staffList.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.user?.name || 'Petugas'} ({s.jabatan ? s.jabatan.toUpperCase() : 'STAF'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Estimasi Selesai
                        </label>
                        <input
                            type="date"
                            value={assignForm.estimasi_selesai}
                            onChange={(e) => setAssignForm({ ...assignForm, estimasi_selesai: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Instruksi / Catatan Progres
                        </label>
                        <textarea
                            rows="3"
                            placeholder="Contoh: Periksa pipa saluran air di kamar mandi lantai 2..."
                            value={assignForm.catatan_progres}
                            onChange={(e) => setAssignForm({ ...assignForm, catatan_progres: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setAssignModalOpen(false)}
                            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingAssign}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                            {submittingAssign ? 'Menugaskan...' : 'Tugaskan Sekarang'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Tanggapan / Update Status */}
            {selectedKomplain && (
                <Modal
                    isOpen={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    title={`Detail Komplain #${selectedKomplain.id}`}
                    maxWidth="max-w-lg"
                >
                    <form onSubmit={handleUpdateStatus} className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <strong className="text-slate-800 text-sm">{selectedKomplain.penghuni?.user?.name}</strong>
                                    <div className="text-slate-500">
                                        Kamar {selectedKomplain.penghuni?.kamar?.nomor_kamar}
                                    </div>
                                </div>
                                {getStatusBadge(selectedKomplain.status)}
                            </div>
                            <div className="pt-2 border-t border-slate-200">
                                <span className="font-semibold text-slate-500 block mb-1">Isi Keluhan:</span>
                                <p className="text-slate-800 text-xs sm:text-sm bg-white p-3 rounded-lg border border-slate-200">
                                    "{selectedKomplain.isi}"
                                </p>
                            </div>
                            {selectedKomplain.foto_lampiran && (
                                <div className="pt-2">
                                    <span className="font-semibold text-slate-500 block mb-1">Foto Bukti Kerusakan:</span>
                                    <img
                                        src={selectedKomplain.foto_lampiran}
                                        alt="Bukti"
                                        className="max-h-48 rounded-lg border border-slate-200 object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Status Penanganan
                            </label>
                            <select
                                value={responseStatus}
                                onChange={(e) => setResponseStatus(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="menunggu">Menunggu</option>
                                <option value="sedang_dikerjakan">Sedang Dikerjakan</option>
                                <option value="selesai">Selesai (Sudah Diperbaiki)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tanggapan / Solusi ke Penghuni
                            </label>
                            <textarea
                                rows="3"
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Contoh: Petugas teknisi telah selesai memperbaiki keran air..."
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            ></textarea>
                        </div>

                        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDetailModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                            >
                                Batal
                            </button>
                            <button
                                type="submit"
                                disabled={submittingStatus}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                            >
                                {submittingStatus ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={deleteModalOpen}
                title="Hapus Data Komplain"
                message="Pindahkan data komplain ini ke Baru Saja Dihapus (Trash)? Data dapat dipulihkan kapan saja."
                confirmText={submittingDelete ? 'Menghapus...' : 'Pindahkan ke Trash'}
                cancelText="Batal"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => {
                    setDeleteModalOpen(false);
                    setTargetDelete(null);
                }}
            />
        </AdminLayout>
    );
}
