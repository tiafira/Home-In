import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function Trash() {
    const { toast } = useToast();

    const [items, setItems] = useState([]);
    const [counts, setCounts] = useState({ all: 0 });
    const [loading, setLoading] = useState(true);
    const [selectedType, setSelectedType] = useState('all');
    const [search, setSearch] = useState('');

    // Actions Confirmation
    const [restoreTarget, setRestoreTarget] = useState(null);
    const [submittingRestore, setSubmittingRestore] = useState(false);

    const [forceDeleteTarget, setForceDeleteTarget] = useState(null);
    const [submittingForceDelete, setSubmittingForceDelete] = useState(false);

    const [confirmRestoreAll, setConfirmRestoreAll] = useState(false);
    const [submittingRestoreAll, setSubmittingRestoreAll] = useState(false);

    const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
    const [submittingEmptyTrash, setSubmittingEmptyTrash] = useState(false);

    const typeTabs = [
        { key: 'all', label: 'Semua Data' },
        { key: 'gedung', label: 'Gedung' },
        { key: 'kamar', label: 'Kamar' },
        { key: 'fasilitas', label: 'Fasilitas' },
        { key: 'user', label: 'Akun Pengguna' },
        { key: 'penghuni', label: 'Penghuni' },
        { key: 'pegawai', label: 'Karyawan' },
        { key: 'komplain', label: 'Komplain' },
        { key: 'paket', label: 'Paket' },
        { key: 'tamu', label: 'Buku Tamu' },
        { key: 'peringatan', label: 'Peringatan' },
        { key: 'pengumuman', label: 'Pengumuman' },
        { key: 'faq', label: 'FAQ' },
    ];

    const fetchTrash = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/trash', {
                params: {
                    type: selectedType,
                    search: search || undefined,
                },
            });
            if (res.data?.status === 'success') {
                setItems(res.data.data || []);
                if (res.data.counts) {
                    setCounts(res.data.counts);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat data tempat sampah.');
        } finally {
            setLoading(false);
        }
    }, [selectedType, search, toast]);

    useEffect(() => {
        fetchTrash();
    }, [fetchTrash]);

    const handleRestore = async (target) => {
        setSubmittingRestore(true);
        try {
            const res = await api.post(`/admin/trash/${target.type}/${target.id}/restore`);
            if (res.data?.status === 'success') {
                toast.success(res.data.message || 'Data berhasil dipulihkan.');
                setRestoreTarget(null);
                fetchTrash();
            }
        } catch (err) {
            toast.error('Gagal memulihkan data.');
        } finally {
            setSubmittingRestore(false);
        }
    };

    const handleForceDelete = async (target) => {
        setSubmittingForceDelete(true);
        try {
            const res = await api.delete(`/admin/trash/${target.type}/${target.id}/force-delete`);
            if (res.data?.status === 'success') {
                toast.success(res.data.message || 'Data telah dihapus secara permanen.');
                setForceDeleteTarget(null);
                fetchTrash();
            }
        } catch (err) {
            toast.error('Gagal menghapus data permanen.');
        } finally {
            setSubmittingForceDelete(false);
        }
    };

    const handleRestoreAll = async () => {
        setSubmittingRestoreAll(true);
        try {
            const res = await api.post('/admin/trash/restore-all');
            if (res.data?.status === 'success') {
                toast.success(res.data.message || 'Semua data berhasil dipulihkan.');
                setConfirmRestoreAll(false);
                fetchTrash();
            }
        } catch (err) {
            toast.error('Gagal memulihkan semua data.');
        } finally {
            setSubmittingRestoreAll(false);
        }
    };

    const handleEmptyTrash = async () => {
        setSubmittingEmptyTrash(true);
        try {
            const res = await api.delete('/admin/trash/empty');
            if (res.data?.status === 'success') {
                toast.success(res.data.message || 'Tempat sampah berhasil dikosongkan.');
                setConfirmEmptyTrash(false);
                fetchTrash();
            }
        } catch (err) {
            toast.error('Gagal mengosongkan tempat sampah.');
        } finally {
            setSubmittingEmptyTrash(false);
        }
    };

    const getTypeBadgeColor = (type) => {
        switch (type) {
            case 'gedung':
                return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'kamar':
                return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'fasilitas':
                return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'user':
                return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'penghuni':
                return 'bg-cyan-50 text-cyan-700 border-cyan-200';
            case 'pegawai':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'komplain':
                return 'bg-rose-50 text-rose-700 border-rose-200';
            case 'paket':
                return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'tamu':
                return 'bg-teal-50 text-teal-700 border-teal-200';
            case 'peringatan':
                return 'bg-yellow-50 text-yellow-800 border-yellow-200';
            case 'pengumuman':
                return 'bg-sky-50 text-sky-700 border-sky-200';
            case 'faq':
                return 'bg-slate-100 text-slate-700 border-slate-200';
            default:
                return 'bg-slate-50 text-slate-700 border-slate-200';
        }
    };

    const columns = [
        {
            key: 'type',
            label: 'Jenis Modul',
            render: (row) => (
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${getTypeBadgeColor(row.type)}`}>
                    {row.type_label}
                </span>
            ),
        },
        {
            key: 'title',
            label: 'Nama / Informasi Data',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 text-xs sm:text-sm">
                        {row.title}
                    </div>
                    {row.detail && (
                        <div className="text-[11px] text-slate-500 font-normal">
                            {row.detail}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'deleted_at',
            label: 'Waktu Dihapus',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 text-xs">
                        {row.deleted_at ? new Date(row.deleted_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                        }) : '-'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                        {row.deleted_at_human || ''}
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setRestoreTarget(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition shadow-sm"
                        title="Pulihkan data ini kembali ke sistem"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Pulihkan
                    </button>
                    <button
                        type="button"
                        onClick={() => setForceDeleteTarget(row)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition shadow-sm"
                        title="Hapus permanen dari database"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Hapus Permanen
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout title="Baru Saja Dihapus">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Baru Saja Dihapus</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Semua data yang dihapus (Soft Delete) disimpan di sini. Anda dapat memulihkan data sewaktu-waktu atau menghapusnya secara permanen.
                        </p>
                    </div>

                    {counts.all > 0 && (
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                type="button"
                                onClick={() => setConfirmRestoreAll(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Pulihkan Semua
                            </button>
                            <button
                                type="button"
                                onClick={() => setConfirmEmptyTrash(true)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Kosongkan Trash
                            </button>
                        </div>
                    )}
                </div>

                {/* Filter Tabs by Module */}
                <div className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
                    <div className="flex items-center gap-1.5 min-w-max">
                        {typeTabs.map((tab) => {
                            const count = counts[tab.key] ?? 0;
                            const isActive = selectedType === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    type="button"
                                    onClick={() => setSelectedType(tab.key)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                                        isActive
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                                >
                                    <span>{tab.label}</span>
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-200 text-slate-700'
                                        }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Data Table */}
                <DataTable
                    columns={columns}
                    data={items}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder="Cari judul, keterangan, atau jenis data..."
                    emptyMessage="Tempat sampah kosong. Tidak ada data yang baru saja dihapus."
                />
            </div>

            {/* Confirm Single Restore */}
            <ConfirmDialog
                isOpen={!!restoreTarget}
                title="Pulihkan Data"
                message={`Apakah Anda yakin ingin memulihkan "${restoreTarget?.title}" (${restoreTarget?.type_label}) kembali ke sistem?`}
                confirmText={submittingRestore ? 'Memulihkan...' : 'Pulihkan Data'}
                cancelText="Batal"
                variant="primary"
                onConfirm={() => restoreTarget && handleRestore(restoreTarget)}
                onCancel={() => setRestoreTarget(null)}
            />

            {/* Confirm Single Force Delete */}
            <ConfirmDialog
                isOpen={!!forceDeleteTarget}
                title="Hapus Data Secara Permanen"
                message={`PERINGATAN: Menghapus "${forceDeleteTarget?.title}" (${forceDeleteTarget?.type_label}) secara permanen tidak dapat dibatalkan. Data akan hilang selamanya dari database.`}
                confirmText={submittingForceDelete ? 'Menghapus...' : 'Ya, Hapus Permanen'}
                cancelText="Batal"
                variant="danger"
                onConfirm={() => forceDeleteTarget && handleForceDelete(forceDeleteTarget)}
                onCancel={() => setForceDeleteTarget(null)}
            />

            {/* Confirm Restore All */}
            <ConfirmDialog
                isOpen={confirmRestoreAll}
                title="Pulihkan Semua Data"
                message={`Apakah Anda yakin ingin memulihkan seluruh (${counts.all}) data di tempat sampah kembali ke modulnya masing-masing?`}
                confirmText={submittingRestoreAll ? 'Memproses...' : 'Pulihkan Semua'}
                cancelText="Batal"
                variant="primary"
                onConfirm={handleRestoreAll}
                onCancel={() => setConfirmRestoreAll(false)}
            />

            {/* Confirm Empty Trash */}
            <ConfirmDialog
                isOpen={confirmEmptyTrash}
                title="Kosongkan Seluruh Tempat Sampah"
                message={`PERINGATAN FATAL: Anda akan menghapus permanen seluruh (${counts.all}) data yang ada di tempat sampah. Tindakan ini tidak dapat dikembalikan! Lanjutkan?`}
                confirmText={submittingEmptyTrash ? 'Mengosongkan...' : 'Ya, Kosongkan Permanen'}
                cancelText="Batal"
                variant="danger"
                onConfirm={handleEmptyTrash}
                onCancel={() => setConfirmEmptyTrash(false)}
            />
        </AdminLayout>
    );
}

