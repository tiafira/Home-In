import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Pengumuman() {
    const { toast } = useToast();
    const { activeBranchId, branches } = useBranch();

    const [pengumumans, setPengumumans] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({
        judul: '',
        isi: '',
        target: 'semua',
        cabang_id: '',
    });
    const [submitting, setSubmitting] = useState(false);

    // Delete dialog
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const fetchPengumuman = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/pengumuman');
            if (res.data.status === 'success') {
                setPengumumans(res.data.data);
            }
        } catch (err) {
            toast.error('Gagal memuat daftar pengumuman.');
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

    useEffect(() => {
        fetchPengumuman();
    }, [fetchPengumuman]);

    const handleOpenAdd = () => {
        setEditingItem(null);
        setForm({
            judul: '',
            isi: '',
            target: 'semua',
            cabang_id: activeBranchId || '',
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingItem(item);
        setForm({
            judul: item.judul,
            isi: item.isi,
            target: item.target,
            cabang_id: item.cabang_id || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (editingItem) {
                await api.put(`/admin/pengumuman/${editingItem.id}`, form);
                toast.success('Pengumuman berhasil diperbarui!');
            } else {
                await api.post('/admin/pengumuman', form);
                toast.success('Pengumuman baru berhasil diterbitkan!');
            }
            setModalOpen(false);
            fetchPengumuman();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan pengumuman.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget) return;
        setSubmittingDelete(true);
        try {
            await api.delete(`/admin/pengumuman/${deleteTarget.id}`);
            toast.success('Pengumuman telah dihapus.');
            setDeleteDialogOpen(false);
            fetchPengumuman();
        } catch (err) {
            toast.error('Gagal menghapus pengumuman.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    return (
        <AdminLayout
            title="Pengumuman"
            subtitle="Buat pengumuman penting bagi seluruh penghuni, staf, atau cabang tertentu."
        >
            <div className="flex justify-between items-center mb-6">
                <span className="text-sm font-semibold text-slate-700">
                    Total: {pengumumans.length} pengumuman aktif
                </span>
                <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition"
                >
                    + Buat Pengumuman Baru
                </button>
            </div>

            {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Memuat daftar pengumuman...
                </div>
            ) : pengumumans.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                    Belum ada pengumuman yang diterbitkan.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {pengumumans.map((item) => (
                        <div
                            key={item.id}
                            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-blue-200 transition flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-50 text-[#263b53]">
                                        Target: {item.target}
                                    </span>
                                    <span className="text-xs text-slate-400">
                                        {new Date(item.created_at).toLocaleDateString('id-ID')}
                                    </span>
                                </div>
                                <h3 className="text-base font-bold text-slate-800 mb-2">{item.judul}</h3>
                                <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4">
                                    {item.isi}
                                </p>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                                <span className="text-slate-400 font-medium">
                                    {item.cabang ? item.cabang.nama_cabang : '🌐 Semua Cabang'}
                                </span>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleOpenEdit(item)}
                                        className="text-slate-600 hover:text-blue-600 font-medium px-2 py-1"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDeleteTarget(item);
                                            setDeleteDialogOpen(true);
                                        }}
                                        className="text-rose-600 hover:text-rose-700 font-medium px-2 py-1"
                                    >
                                        Hapus
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* MODAL ADD/EDIT */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingItem ? 'Edit Pengumuman' : 'Terbitkan Pengumuman Baru'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Judul Pengumuman *</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Pembersihan Tandon Air & Pengecekan Listrik"
                            value={form.judul}
                            onChange={(e) => setForm({ ...form, judul: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Audiens *</label>
                            <select
                                value={form.target}
                                onChange={(e) => setForm({ ...form, target: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="semua">Semua Orang</option>
                                <option value="penghuni">Khusus Penghuni</option>
                                <option value="karyawan">Khusus Karyawan/Penjaga</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Cakupan Cabang</label>
                            <select
                                value={form.cabang_id}
                                onChange={(e) => setForm({ ...form, cabang_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="">Semua Cabang (Global)</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama_cabang}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Pengumuman *</label>
                        <textarea
                            rows={5}
                            required
                            placeholder="Tuliskan isi pengumuman lengkap..."
                            value={form.isi}
                            onChange={(e) => setForm({ ...form, isi: e.target.value })}
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
                            {submitting ? 'Menyimpan...' : 'Terbitkan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* DELETE DIALOG */}
            <ConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Hapus Pengumuman"
                message={`Apakah Anda yakin ingin menghapus pengumuman "${deleteTarget?.judul}"? Tindakan ini tidak dapat dibatalkan.`}
                confirmText="Hapus Pengumuman"
                cancelText="Batal"
                type="danger"
                loading={submittingDelete}
            />
        </AdminLayout>
    );
}
