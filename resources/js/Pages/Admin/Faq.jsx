import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function Faq() {
    const { toast } = useToast();

    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Modal Add / Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState(null);
    const [form, setForm] = useState({
        pertanyaan: '',
        jawaban: '',
        urutan: 1,
    });
    const [submitting, setSubmitting] = useState(false);

    // Delete Modal
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [targetDelete, setTargetDelete] = useState(null);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    // Expanded accordion preview in list
    const [expandedIds, setExpandedIds] = useState(new Set());

    const toggleExpand = (id) => {
        setExpandedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const fetchFaqs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/faq', {
                params: { search: search || undefined },
            });
            if (res.data?.status === 'success') {
                setFaqs(res.data.data || []);
            }
        } catch (err) {
            toast.error('Gagal memuat daftar FAQ.');
        } finally {
            setLoading(false);
        }
    }, [search, toast]);

    useEffect(() => {
        fetchFaqs();
    }, [fetchFaqs]);

    const handleOpenAdd = () => {
        setEditingFaq(null);
        setForm({
            pertanyaan: '',
            jawaban: '',
            urutan: faqs.length + 1,
        });
        setModalOpen(true);
    };

    const handleOpenEdit = (faq) => {
        setEditingFaq(faq);
        setForm({
            pertanyaan: faq.pertanyaan || '',
            jawaban: faq.jawaban || '',
            urutan: faq.urutan || 1,
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.pertanyaan.trim() || !form.jawaban.trim()) {
            toast.error('Pertanyaan dan jawaban wajib diisi.');
            return;
        }

        setSubmitting(true);
        try {
            if (editingFaq) {
                const res = await api.put(`/admin/faq/${editingFaq.id}`, form);
                if (res.data?.status === 'success') {
                    toast.success('FAQ berhasil diperbarui.');
                    setModalOpen(false);
                    fetchFaqs();
                }
            } else {
                const res = await api.post('/admin/faq', form);
                if (res.data?.status === 'success') {
                    toast.success('FAQ baru berhasil ditambahkan.');
                    setModalOpen(false);
                    fetchFaqs();
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan FAQ.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!targetDelete) return;
        setSubmittingDelete(true);
        try {
            const res = await api.delete(`/admin/faq/${targetDelete.id}`);
            if (res.data?.status === 'success') {
                toast.success('FAQ berhasil dipindahkan ke tempat sampah.');
                setDeleteModalOpen(false);
                setTargetDelete(null);
                fetchFaqs();
            }
        } catch (err) {
            toast.error('Gagal menghapus FAQ.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    return (
        <AdminLayout title="Kelola FAQ">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Kelola FAQ</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Atur daftar pertanyaan dan jawaban seputar sistem, pembayaran, aturan jam malam, dan fasilitas untuk penghuni dan calon penghuni.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition shrink-0"
                    >
                        <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Tambah FAQ Baru
                    </button>
                </div>

                {/* Search Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="relative flex-1 max-w-md">
                        <svg
                            className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="Cari pertanyaan atau kata kunci dalam jawaban..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="text-xs text-slate-500 font-semibold">
                        Total: <span className="text-slate-900 font-bold">{faqs.length}</span> Pertanyaan
                    </div>
                </div>

                {/* FAQ List */}
                {loading ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-100">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                        <p className="text-xs text-slate-500 mt-2 font-medium">Memuat data FAQ...</p>
                    </div>
                ) : faqs.length === 0 ? (
                    <div className="p-12 text-center bg-white rounded-2xl border border-slate-100">
                        <p className="text-sm font-bold text-slate-800">Belum ada FAQ yang tersimpan.</p>
                        <p className="text-xs text-slate-500 mt-1">Gunakan tombol "Tambah FAQ Baru" untuk membuat pertanyaan umum.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {faqs.map((faq, index) => {
                            const isExpanded = expandedIds.has(faq.id);
                            return (
                                <div
                                    key={faq.id}
                                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition hover:border-slate-200"
                                >
                                    <div className="p-4 sm:p-5 flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-3 flex-1 cursor-pointer" onClick={() => toggleExpand(faq.id)}>
                                            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                                                {faq.urutan || index + 1}
                                            </span>
                                            <div className="flex-1">
                                                <h3 className="font-bold text-slate-800 text-sm sm:text-base leading-snug">
                                                    {faq.pertanyaan}
                                                </h3>
                                                {!isExpanded && (
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                                        {faq.jawaban}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => toggleExpand(faq.id)}
                                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                                                title={isExpanded ? 'Tutup Jawaban' : 'Buka Jawaban'}
                                            >
                                                <svg
                                                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenEdit(faq)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition"
                                                title="Edit FAQ"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                </svg>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTargetDelete(faq);
                                                    setDeleteModalOpen(true);
                                                }}
                                                className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition"
                                                title="Hapus FAQ (Pindah ke Trash)"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && (
                                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 border-t border-slate-50 bg-slate-50/50 leading-relaxed whitespace-pre-line pl-14">
                                            {faq.jawaban}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal Add/Edit FAQ */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingFaq ? 'Edit Pertanyaan FAQ' : 'Tambah Pertanyaan FAQ'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Urutan Tampil
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={form.urutan}
                            onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 1 })}
                            className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Pertanyaan <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Bagaimana aturan jam malam dan tamu menginap?"
                            value={form.pertanyaan}
                            onChange={(e) => setForm({ ...form, pertanyaan: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Jawaban Lengkap <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows="5"
                            required
                            placeholder="Jelaskan detail prosedur, aturan, atau langkah-langkah yang jelas..."
                            value={form.jawaban}
                            onChange={(e) => setForm({ ...form, jawaban: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan...' : (editingFaq ? 'Simpan Perubahan' : 'Tambahkan FAQ')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={deleteModalOpen}
                title="Hapus FAQ"
                message={`Pindahkan pertanyaan "${targetDelete?.pertanyaan}" ke tempat sampah? Pertanyaan dapat dipulihkan kapan saja.`}
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

