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

    // Section switcher: 'pengumuman' | 'faq'
    const [activeSection, setActiveSection] = useState('pengumuman');

    // Pengumuman State
    const [pengumumans, setPengumumans] = useState([]);
    const [loadingPengumuman, setLoadingPengumuman] = useState(true);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({
        judul: '',
        isi: '',
        target: 'semua',
        cabang_id: '',
    });
    const [submitting, setSubmitting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    // FAQ State
    const [faqs, setFaqs] = useState([]);
    const [loadingFaq, setLoadingFaq] = useState(false);

    const [faqModalOpen, setFaqModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState(null);
    const [faqForm, setFaqForm] = useState({
        pertanyaan: '',
        jawaban: '',
        cabang_id: '',
        urutan: 1,
    });
    const [submittingFaq, setSubmittingFaq] = useState(false);

    const [deleteFaqTarget, setDeleteFaqTarget] = useState(null);
    const [deleteFaqDialogOpen, setDeleteFaqDialogOpen] = useState(false);
    const [submittingDeleteFaq, setSubmittingDeleteFaq] = useState(false);

    // Fetch Pengumuman
    const fetchPengumuman = useCallback(async () => {
        setLoadingPengumuman(true);
        try {
            const res = await api.get('/admin/pengumuman');
            if (res.data.status === 'success') {
                setPengumumans(res.data.data || []);
            }
        } catch (err) {
            toast.error('Gagal memuat daftar pengumuman.');
        } finally {
            setLoadingPengumuman(false);
        }
    }, [activeBranchId, toast]);

    // Fetch FAQ
    const fetchFaqs = useCallback(async () => {
        setLoadingFaq(true);
        try {
            const res = await api.get('/admin/faq');
            if (res.data.status === 'success') {
                setFaqs(res.data.data || []);
            }
        } catch (err) {
            toast.error('Gagal memuat data FAQ publik.');
        } finally {
            setLoadingFaq(false);
        }
    }, [activeBranchId, toast]);

    useEffect(() => {
        if (activeSection === 'pengumuman') {
            fetchPengumuman();
        } else {
            fetchFaqs();
        }
    }, [activeSection, fetchPengumuman, fetchFaqs]);

    // Handlers for Pengumuman
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
                toast.success('Pengumuman baru berhasil diterbitkan dan notifikasi telah dikirimkan!');
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

    // Handlers for FAQ
    const handleOpenAddFaq = () => {
        setEditingFaq(null);
        setFaqForm({
            pertanyaan: '',
            jawaban: '',
            cabang_id: activeBranchId || '',
            urutan: faqs.length + 1,
        });
        setFaqModalOpen(true);
    };

    const handleOpenEditFaq = (faq) => {
        setEditingFaq(faq);
        setFaqForm({
            pertanyaan: faq.pertanyaan,
            jawaban: faq.jawaban,
            cabang_id: faq.cabang_id || '',
            urutan: faq.urutan || 1,
        });
        setFaqModalOpen(true);
    };

    const handleFaqSubmit = async (e) => {
        e.preventDefault();
        setSubmittingFaq(true);
        try {
            if (editingFaq) {
                await api.put(`/admin/faq/${editingFaq.id}`, faqForm);
                toast.success('FAQ berhasil diperbarui!');
            } else {
                await api.post('/admin/faq', faqForm);
                toast.success('FAQ baru berhasil ditambahkan untuk tampilan website publik!');
            }
            setFaqModalOpen(false);
            fetchFaqs();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan data FAQ.');
        } finally {
            setSubmittingFaq(false);
        }
    };

    const handleConfirmDeleteFaq = async () => {
        if (!deleteFaqTarget) return;
        setSubmittingDeleteFaq(true);
        try {
            await api.delete(`/admin/faq/${deleteFaqTarget.id}`);
            toast.success('FAQ telah berhasil dihapus.');
            setDeleteFaqDialogOpen(false);
            fetchFaqs();
        } catch (err) {
            toast.error('Gagal menghapus FAQ.');
        } finally {
            setSubmittingDeleteFaq(false);
        }
    };

    return (
        <AdminLayout
            title="Pengumuman & Kelola FAQ"
            subtitle="Publikasikan pengumuman internal kost untuk penghuni & staf, serta kelola konten Pertanyaan Populer (FAQ) website publik."
        >
            {/* Top Switcher: Pengumuman vs FAQ */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl mb-6 self-start w-fit">
                <button
                    onClick={() => setActiveSection('pengumuman')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                        activeSection === 'pengumuman'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    📢 Pengumuman Kost ({pengumumans.length})
                </button>
                <button
                    onClick={() => setActiveSection('faq')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                        activeSection === 'faq'
                            ? 'bg-white text-[#1E5FC9] shadow-sm'
                            : 'text-slate-500 hover:text-[#1E5FC9]'
                    }`}
                >
                    <span>❓ Kelola FAQ Publik ({faqs.length})</span>
                </button>
            </div>

            {/* SECTION 1: PENGUMUMAN KOST */}
            {activeSection === 'pengumuman' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-sm font-semibold text-slate-700">
                            Total: {pengumumans.length} pengumuman terdaftar
                        </span>
                        <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-4 py-2.5 text-sm font-semibold text-white bg-[#1E5FC9] hover:bg-blue-700 rounded-xl shadow-sm transition"
                        >
                            + Buat Pengumuman Baru
                        </button>
                    </div>

                    {loadingPengumuman ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                            <div className="w-8 h-8 border-4 border-[#1E5FC9] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
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
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-blue-50 text-[#1E5FC9]">
                                                Target: {item.target}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {new Date(item.created_at).toLocaleDateString('id-ID')}
                                            </span>
                                        </div>
                                        <h3 className="text-base font-bold text-slate-800 mb-2">{item.judul}</h3>
                                        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3 mb-4 whitespace-pre-line">
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
                                                className="text-[#1E5FC9] hover:underline font-medium px-2 py-1"
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
                </>
            )}

            {/* SECTION 2: KELOLA FAQ PUBLIK */}
            {activeSection === 'faq' && (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <span className="text-sm font-semibold text-slate-700 block">
                                Kelola Pertanyaan Populer (FAQ) Website Publik
                            </span>
                            <span className="text-xs text-slate-500">
                                FAQ yang Anda tambahkan di sini akan langsung tampil pada Beranda dan Halaman FAQ calon penghuni.
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={handleOpenAddFaq}
                            className="px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition whitespace-nowrap"
                        >
                            + Tambah FAQ Baru
                        </button>
                    </div>

                    {loadingFaq ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            Memuat daftar FAQ publik...
                        </div>
                    ) : faqs.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                            Belum ada entri FAQ publik. Klik tombol di atas untuk menambahkan FAQ pertama.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {faqs.map((faq) => (
                                <div
                                    key={faq.id}
                                    className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:border-emerald-200 transition"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                                                    {faq.urutan || 1}
                                                </span>
                                                <h4 className="text-sm font-bold text-slate-800">{faq.pertanyaan}</h4>
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600">
                                                    {faq.cabang ? faq.cabang.nama_cabang : '🌐 Seluruh Cabang'}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-600 pl-8 leading-relaxed whitespace-pre-line">
                                                {faq.jawaban}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                onClick={() => handleOpenEditFaq(faq)}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setDeleteFaqTarget(faq);
                                                    setDeleteFaqDialogOpen(true);
                                                }}
                                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                                            >
                                                Hapus
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* MODAL ADD/EDIT PENGUMUMAN */}
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
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#1E5FC9] hover:bg-blue-700 rounded-xl shadow-sm"
                        >
                            {submitting ? 'Menyimpan...' : 'Terbitkan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL ADD/EDIT FAQ */}
            <Modal
                isOpen={faqModalOpen}
                onClose={() => setFaqModalOpen(false)}
                title={editingFaq ? 'Edit Pertanyaan Populer (FAQ)' : 'Tambah FAQ Baru'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleFaqSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Pertanyaan *</label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Apakah ada biaya deposit saat pertama kali masuk?"
                            value={faqForm.pertanyaan}
                            onChange={(e) => setFaqForm({ ...faqForm, pertanyaan: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Berlaku di Cabang</label>
                            <select
                                value={faqForm.cabang_id}
                                onChange={(e) => setFaqForm({ ...faqForm, cabang_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="">Semua Cabang (Umum)</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.nama_cabang}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Urutan</label>
                            <input
                                type="number"
                                min="1"
                                value={faqForm.urutan}
                                onChange={(e) => setFaqForm({ ...faqForm, urutan: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Jawaban Lengkap *</label>
                        <textarea
                            rows={4}
                            required
                            placeholder="Tuliskan jawaban yang informatif dan ramah bagi calon penghuni..."
                            value={faqForm.jawaban}
                            onChange={(e) => setFaqForm({ ...faqForm, jawaban: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setFaqModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingFaq}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                        >
                            {submittingFaq ? 'Menyimpan...' : 'Simpan FAQ'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* DELETE PENGUMUMAN DIALOG */}
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

            {/* DELETE FAQ DIALOG */}
            <ConfirmDialog
                isOpen={deleteFaqDialogOpen}
                onClose={() => setDeleteFaqDialogOpen(false)}
                onConfirm={handleConfirmDeleteFaq}
                title="Hapus FAQ Publik"
                message={`Apakah Anda yakin ingin menghapus FAQ "${deleteFaqTarget?.pertanyaan}"? FAQ ini tidak akan tampil lagi di website publik.`}
                confirmText="Hapus FAQ"
                cancelText="Batal"
                type="danger"
                loading={submittingDeleteFaq}
            />
        </AdminLayout>
    );
}
