import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Pegawai() {
    const { toast } = useToast();
    const { activeBranchId, branches } = useBranch();

    const [pegawais, setPegawais] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({
        name: '',
        email: '',
        no_hp: '',
        cabang_id: '',
        jabatan: 'penjaga',
        no_ktp: '',
        alamat: '',
        tanggal_masuk_kerja: new Date().toISOString().split('T')[0],
        password: '',
    });
    const [submitting, setSubmitting] = useState(false);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const fetchPegawai = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/pegawai');
            if (res.data.status === 'success') {
                setPegawais(res.data.data);
            }
        } catch (err) {
            toast.error('Gagal memuat daftar pegawai.');
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

    useEffect(() => {
        fetchPegawai();
    }, [fetchPegawai]);

    const handleOpenAdd = () => {
        setEditingItem(null);
        setForm({
            name: '',
            email: '',
            no_hp: '',
            cabang_id: activeBranchId || branches[0]?.id || '',
            jabatan: 'penjaga',
            no_ktp: '',
            alamat: '',
            tanggal_masuk_kerja: new Date().toISOString().split('T')[0],
            password: 'password123',
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (p) => {
        setEditingItem(p);
        setForm({
            name: p.user?.name || '',
            email: p.user?.email || '',
            no_hp: p.user?.no_hp || '',
            cabang_id: p.cabang_id,
            jabatan: p.jabatan,
            no_ktp: p.no_ktp || '',
            alamat: p.alamat || '',
            tanggal_masuk_kerja: p.tanggal_masuk_kerja || '',
            password: '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingItem) {
                await api.put(`/admin/pegawai/${editingItem.id}`, form);
                toast.success('Data pegawai berhasil diperbarui!');
            } else {
                await api.post('/admin/pegawai', form);
                toast.success('Pegawai baru berhasil ditambahkan!');
            }
            setModalOpen(false);
            fetchPegawai();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan pegawai.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setSubmittingDelete(true);
        try {
            await api.delete(`/admin/pegawai/${deleteTarget.id}`);
            toast.success('Pegawai berhasil dihapus.');
            setDeleteDialogOpen(false);
            fetchPegawai();
        } catch (err) {
            toast.error('Gagal menghapus pegawai.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    const columns = [
        {
            key: 'user',
            label: 'Nama Pegawai',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">{row.user?.email || '-'} • {row.user?.no_hp || '-'}</div>
                </div>
            ),
        },
        {
            key: 'jabatan',
            label: 'Jabatan',
            className: 'whitespace-nowrap',
            render: (row) => (
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        row.jabatan === 'admin'
                            ? 'bg-blue-100 text-[#263b53]'
                            : 'bg-emerald-100 text-emerald-800'
                    }`}
                >
                    {row.jabatan}
                </span>
            ),
        },
        {
            key: 'cabang',
            label: 'Penempatan Cabang',
            className: 'whitespace-nowrap text-xs font-medium text-slate-700',
            render: (row) => row.cabang?.nama_cabang || 'Semua Cabang',
        },
        {
            key: 'tanggal_masuk_kerja',
            label: 'Tgl Bergabung',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => row.tanggal_masuk_kerja || '-',
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

    return (
        <AdminLayout
            title="Data Pegawai"
            subtitle="Manajemen staf operasional, administrator cabang, dan penjaga kost."
        >
            <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-semibold text-slate-700">
                    Total: {pegawais.length} staf terdaftar
                </span>
                <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition"
                >
                    + Tambah Pegawai Baru
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <DataTable
                    columns={columns}
                    data={pegawais}
                    loading={loading}
                    searchPlaceholder="Cari nama pegawai, email, jabatan..."
                    emptyTitle="Tidak ada data pegawai"
                    emptyDescription="Belum ada pegawai terdaftar di cabang ini."
                />
            </div>

            {/* MODAL TAMBAH/EDIT */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingItem ? 'Edit Data Pegawai' : 'Tambah Pegawai Baru'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor HP / WA *</label>
                            <input
                                type="text"
                                required
                                value={form.no_hp}
                                onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">No KTP</label>
                            <input
                                type="text"
                                value={form.no_ktp}
                                onChange={(e) => setForm({ ...form, no_ktp: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Penempatan Cabang *</label>
                            <select
                                required
                                value={form.cabang_id}
                                onChange={(e) => setForm({ ...form, cabang_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="">Pilih Cabang</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama_cabang}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Jabatan *</label>
                            <select
                                value={form.jabatan}
                                onChange={(e) => setForm({ ...form, jabatan: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="penjaga">Penjaga Kost</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tgl Masuk Kerja</label>
                            <input
                                type="date"
                                required
                                value={form.tanggal_masuk_kerja}
                                onChange={(e) => setForm({ ...form, tanggal_masuk_kerja: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                {editingItem ? 'Password Baru (Opsional)' : 'Password Akun'}
                            </label>
                            <input
                                type="password"
                                placeholder={editingItem ? 'Kosongkan jika tidak diubah' : 'Minimal 6 karakter'}
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Tinggal</label>
                        <textarea
                            rows={2}
                            value={form.alamat}
                            onChange={(e) => setForm({ ...form, alamat: e.target.value })}
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
                            {submitting ? 'Menyimpan...' : 'Simpan Pegawai'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* DELETE DIALOG */}
            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Hapus Pegawai"
                message={`Apakah Anda yakin ingin menghapus data pegawai "${deleteTarget?.user?.name}"? Akun login dan data jabatan akan dihapus.`}
                confirmText="Hapus Pegawai"
                cancelText="Batal"
                type="danger"
                loading={submittingDelete}
            />
        </AdminLayout>
    );
}
