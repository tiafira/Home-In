import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Fasilitas() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    const [activeSection, setActiveSection] = useState('master'); // 'master' | 'permintaan'
    const [fasilitas, setFasilitas] = useState([]);
    const [permintaan, setPermintaan] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state for facility master
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({
        nama_fasilitas: '',
        tipe: 'default',
        biaya_tambahan: 0,
        deskripsi: '',
    });
    const [submitting, setSubmitting] = useState(false);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/fasilitas');
            if (res.data.status === 'success') {
                setFasilitas(res.data.fasilitas);
                setPermintaan(res.data.permintaan);
            }
        } catch (err) {
            toast.error('Gagal memuat data fasilitas.');
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenAdd = () => {
        setEditingItem(null);
        setForm({
            nama_fasilitas: '',
            tipe: 'default',
            biaya_tambahan: 0,
            deskripsi: '',
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (f) => {
        setEditingItem(f);
        setForm({
            nama_fasilitas: f.nama_fasilitas,
            tipe: f.tipe,
            biaya_tambahan: f.biaya_tambahan,
            deskripsi: f.deskripsi || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingItem) {
                await api.put(`/admin/fasilitas/${editingItem.id}`, form);
                toast.success('Fasilitas berhasil diperbarui!');
            } else {
                await api.post('/admin/fasilitas', form);
                toast.success('Fasilitas baru berhasil ditambahkan!');
            }
            setModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan fasilitas.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setSubmittingDelete(true);
        try {
            await api.delete(`/admin/fasilitas/${deleteTarget.id}`);
            toast.success('Fasilitas berhasil dihapus.');
            setDeleteDialogOpen(false);
            fetchData();
        } catch (err) {
            toast.error('Gagal menghapus fasilitas.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    const handleUpdatePermintaan = async (id, status) => {
        try {
            const res = await api.post(`/admin/fasilitas/permintaan/${id}`, { status_request: status });
            toast.success(res.data.message || `Permintaan fasilitas telah di-${status}!`);
            fetchData();
        } catch (err) {
            toast.error('Gagal memproses permintaan fasilitas.');
        }
    };

    const masterColumns = [
        {
            key: 'nama_fasilitas',
            label: 'Nama Fasilitas',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.nama_fasilitas}</div>
                    <div className="text-xs text-slate-500">{row.deskripsi || '-'}</div>
                </div>
            ),
        },
        {
            key: 'tipe',
            label: 'Kategori Fasilitas',
            className: 'whitespace-nowrap',
            render: (row) => (
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        row.tipe === 'tambahan'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-emerald-100 text-emerald-800'
                    }`}
                >
                    {row.tipe === 'tambahan' ? 'Tambahan Berbayar' : 'Fasilitas Default'}
                </span>
            ),
        },
        {
            key: 'biaya_tambahan',
            label: 'Tarif Tambahan',
            className: 'whitespace-nowrap',
            render: (row) => (
                <span className="font-semibold text-slate-800 text-xs">
                    {row.biaya_tambahan > 0 ? `+Rp ${Number(row.biaya_tambahan).toLocaleString('id-ID')}/bln` : 'Gratis / Termasuk'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => handleOpenEdit(row)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                        Edit
                    </button>
                    <button
                        onClick={() => {
                            setDeleteTarget(row);
                            setDeleteDialogOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    >
                        Hapus
                    </button>
                </div>
            ),
        },
    ];

    const permintaanColumns = [
        {
            key: 'kamar',
            label: 'Kamar & Penghuni',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">
                        Kamar {row.kamar?.nomor_kamar} ({row.kamar?.gedung?.cabang?.nama_cabang})
                    </div>
                    <div className="text-xs text-slate-500">
                        {row.kamar?.penghuni?.user?.name || 'Tanpa Penghuni'}
                    </div>
                </div>
            ),
        },
        {
            key: 'fasilitas',
            label: 'Fasilitas Diminta',
            render: (row) => (
                <div>
                    <div className="font-semibold text-purple-700">{row.fasilitas?.nama_fasilitas}</div>
                    <div className="text-xs text-slate-500">
                        Biaya: +Rp {Number(row.fasilitas?.biaya_tambahan || 0).toLocaleString('id-ID')}/bln
                    </div>
                </div>
            ),
        },
        {
            key: 'created_at',
            label: 'Tgl Permintaan',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => new Date(row.created_at).toLocaleDateString('id-ID'),
        },
        {
            key: 'status_request',
            label: 'Status',
            className: 'whitespace-nowrap',
            render: (row) => <StatusBadge status={row.status_request} />,
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    {row.status_request === 'menunggu_konfirmasi' && (
                        <>
                            <button
                                onClick={() => handleUpdatePermintaan(row.id, 'ditolak')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                            >
                                Tolak
                            </button>
                            <button
                                onClick={() => handleUpdatePermintaan(row.id, 'aktif')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            >
                                Pasang / Setujui
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Fasilitas Kost"
            subtitle="Daftar inventaris fasilitas standar dan tambahan berbayar, serta permohonan pasang fasilitas dari penghuni."
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl self-start">
                    <button
                        onClick={() => setActiveSection('master')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            activeSection === 'master'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Katalog Fasilitas ({fasilitas.length})
                    </button>
                    <button
                        onClick={() => setActiveSection('permintaan')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                            activeSection === 'permintaan'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>Permintaan Tambahan</span>
                        {permintaan.filter((p) => p.status_request === 'menunggu_konfirmasi').length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                                {permintaan.filter((p) => p.status_request === 'menunggu_konfirmasi').length}
                            </span>
                        )}
                    </button>
                </div>

                {activeSection === 'master' && (
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition whitespace-nowrap self-start sm:self-auto"
                    >
                        + Tambah Fasilitas Baru
                    </button>
                )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                {activeSection === 'master' ? (
                    <DataTable
                        columns={masterColumns}
                        data={fasilitas}
                        loading={loading}
                        searchPlaceholder="Cari fasilitas..."
                        emptyTitle="Tidak ada fasilitas"
                        emptyDescription="Belum ada fasilitas yang didaftarkan."
                    />
                ) : (
                    <DataTable
                        columns={permintaanColumns}
                        data={permintaan}
                        loading={loading}
                        searchPlaceholder="Cari kamar atau fasilitas..."
                        emptyTitle="Tidak ada permintaan fasilitas"
                        emptyDescription="Belum ada penghuni yang meminta fasilitas tambahan."
                    />
                )}
            </div>

            {/* MODAL TAMBAH/EDIT FASILITAS */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingItem ? 'Edit Fasilitas' : 'Tambah Fasilitas Baru'}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Fasilitas *</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: AC 1 PK, Kulkas Mini, WiFi 100Mbps"
                            value={form.nama_fasilitas}
                            onChange={(e) => setForm({ ...form, nama_fasilitas: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tipe Fasilitas *</label>
                            <select
                                value={form.tipe}
                                onChange={(e) => setForm({ ...form, tipe: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="default">Default (Standar Kamar)</option>
                                <option value="tambahan">Tambahan (Berbayar)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Biaya Tambahan (Rp/bln)</label>
                            <input
                                type="number"
                                min="0"
                                step="5000"
                                value={form.biaya_tambahan}
                                onChange={(e) => setForm({ ...form, biaya_tambahan: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi & Spesifikasi</label>
                        <textarea
                            rows={3}
                            placeholder="Rincian merek, kapasitas, atau daya listrik..."
                            value={form.deskripsi}
                            onChange={(e) => setForm({ ...form, deskripsi: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Fasilitas'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* DELETE DIALOG */}
            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Hapus Fasilitas"
                message={`Apakah Anda yakin ingin menghapus fasilitas "${deleteTarget?.nama_fasilitas}"?`}
                confirmText="Hapus Fasilitas"
                cancelText="Batal"
                type="danger"
                loading={submittingDelete}
            />
        </AdminLayout>
    );
}
