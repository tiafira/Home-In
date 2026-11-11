import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function Paket() {
    const { toast } = useToast();

    const [pakets, setPakets] = useState([]);
    const [counts, setCounts] = useState({ all: 0, belum_diambil: 0, sudah_diambil: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all'); // all | belum_diambil | sudah_diambil
    const [tenants, setTenants] = useState([]);

    // Modal Add / Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingPaket, setEditingPaket] = useState(null);
    const [form, setForm] = useState({
        nama_penerima: '',
        nomor_kamar: '',
        penghuni_id: '',
        ekspedisi: 'J&T Express',
        no_resi: '',
        catatan: '',
        status: 'belum_diambil',
    });
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Modal Preview Foto
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [activeFotoUrl, setActiveFotoUrl] = useState('');

    // Delete dialog
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [targetDelete, setTargetDelete] = useState(null);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const fetchPakets = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/paket', {
                params: { status: statusFilter },
            });
            if (res.data?.status === 'success') {
                setPakets(res.data.data || []);
                if (res.data.counts) {
                    setCounts(res.data.counts);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat data penerimaan paket.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, toast]);

    const fetchTenants = useCallback(async () => {
        try {
            const res = await api.get('/admin/penghuni');
            if (res.data?.status === 'success') {
                setTenants(res.data.data || []);
            }
        } catch (e) {
            // ignore
        }
    }, []);

    useEffect(() => {
        fetchPakets();
        fetchTenants();
    }, [fetchPakets, fetchTenants]);

    const handleOpenAdd = () => {
        setEditingPaket(null);
        setForm({
            nama_penerima: '',
            nomor_kamar: '',
            penghuni_id: '',
            ekspedisi: 'J&T Express',
            no_resi: '',
            catatan: '',
            status: 'belum_diambil',
        });
        setFotoFile(null);
        setFotoPreview(null);
        setModalOpen(true);
    };

    const handleSelectTenant = (tenantId) => {
        if (!tenantId) {
            setForm((prev) => ({ ...prev, penghuni_id: '', nama_penerima: '', nomor_kamar: '' }));
            return;
        }
        const found = tenants.find((t) => String(t.id) === String(tenantId));
        if (found) {
            setForm((prev) => ({
                ...prev,
                penghuni_id: found.id,
                nama_penerima: found.user?.name || found.user?.nama || '',
                nomor_kamar: found.kamar?.nomor_kamar || '',
            }));
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('File harus berupa gambar (JPG, PNG, WebP).');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ukuran foto maksimal 5 MB.');
            return;
        }

        setFotoFile(file);
        setFotoPreview(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.nama_penerima.trim()) {
            toast.error('Nama penerima wajib diisi.');
            return;
        }

        setSubmitting(true);
        try {
            const data = new FormData();
            data.append('nama_penerima', form.nama_penerima);
            data.append('nomor_kamar', form.nomor_kamar || '');
            if (form.penghuni_id) data.append('penghuni_id', form.penghuni_id);
            data.append('ekspedisi', form.ekspedisi);
            if (form.no_resi) data.append('no_resi', form.no_resi);
            if (form.catatan) data.append('catatan', form.catatan);
            data.append('status', form.status);

            if (fotoFile) {
                data.append('foto_paket', fotoFile);
            }

            if (editingPaket) {
                data.append('_method', 'PUT');
                await api.post(`/admin/paket/${editingPaket.id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Data paket berhasil diperbarui!');
            } else {
                await api.post('/admin/paket', data, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Penerimaan paket berhasil dicatat!');
            }

            setModalOpen(false);
            fetchPakets();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan data paket.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkDiambil = async (item) => {
        try {
            await api.post(`/admin/paket/${item.id}/diambil`);
            toast.success(`Paket untuk ${item.nama_penerima} berhasil ditandai telah diambil.`);
            fetchPakets();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menandai paket diambil.');
        }
    };

    const handleConfirmDelete = async () => {
        if (!targetDelete) return;
        setSubmittingDelete(true);
        try {
            await api.delete(`/admin/paket/${targetDelete.id}`);
            toast.success('Paket berhasil dipindahkan ke menu Baru Saja Dihapus.');
            setDeleteModalOpen(false);
            fetchPakets();
        } catch (err) {
            toast.error('Gagal menghapus data paket.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    const handleExportPdf = () => {
        exportToPdf({
            title: 'Laporan Penerimaan Paket Penghuni',
            subtitle: `Filter Status: ${statusFilter.replace('_', ' ').toUpperCase()} | Total: ${pakets.length} Paket`,
            branchName: 'Home-In Kost',
            columns: [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Nama Penerima', accessor: 'nama_penerima' },
                { header: 'Kamar', render: (r) => (r.nomor_kamar ? `Kamar ${r.nomor_kamar}` : (r.kamar?.nomor_kamar ? `Kamar ${r.kamar.nomor_kamar}` : '-')) },
                { header: 'Ekspedisi', accessor: 'ekspedisi' },
                { header: 'No Resi', render: (r) => r.no_resi || '-' },
                { header: 'Waktu Tiba', accessor: 'waktu_tiba' },
                { header: 'Waktu Diambil', render: (r) => r.waktu_diambil || 'Belum Diambil' },
                { header: 'Status', render: (r) => (r.status === 'sudah_diambil' ? 'Sudah Diambil' : 'Belum Diambil') },
            ],
            data: pakets,
            summary: `Total Paket: ${pakets.length} | Belum Diambil: ${counts.belum_diambil} | Sudah Diambil: ${counts.sudah_diambil}`,
        });
        toast.success('Laporan penerimaan paket siap dicetak / disimpan ke PDF.');
    };

    const handleExportExcel = () => {
        const headers = ['No', 'Nama Penerima', 'Nomor Kamar', 'Ekspedisi', 'No Resi', 'Waktu Tiba', 'Waktu Diambil', 'Status', 'Catatan'];
        const rows = pakets.map((r, i) => [
            i + 1,
            r.nama_penerima || '-',
            r.nomor_kamar || r.kamar?.nomor_kamar || '-',
            r.ekspedisi || '-',
            r.no_resi || '-',
            r.waktu_tiba || '-',
            r.waktu_diambil || '-',
            r.status === 'sudah_diambil' ? 'Sudah Diambil' : 'Belum Diambil',
            r.catatan || '-',
        ]);
        exportToExcel({
            filename: `laporan-penerimaan-paket-${new Date().toISOString().split('T')[0]}.xls`,
            title: 'Laporan Penerimaan Paket Home-In',
            headers,
            rows,
        });
        toast.success('Data paket berhasil diekspor ke Excel!');
    };

    const ekspedisiOptions = [
        'J&T Express', 'JNE Express', 'SiCepat', 'Shopee Xpress',
        'Pos Indonesia', 'Anteraja', 'GoSend', 'GrabExpress', 'Ninja Xpress', 'Lainnya'
    ];

    const columns = [
        {
            key: 'penerima',
            label: 'Penerima & Kamar',
            render: (r) => (
                <div>
                    <div className="font-bold text-slate-800 text-sm">{r.nama_penerima}</div>
                    <div className="text-xs text-slate-500 font-medium">
                        {r.nomor_kamar ? `Kamar ${r.nomor_kamar}` : (r.kamar?.nomor_kamar ? `Kamar ${r.kamar.nomor_kamar}` : 'Kamar belum diatur')}
                    </div>
                </div>
            ),
        },
        {
            key: 'ekspedisi',
            label: 'Ekspedisi & Resi',
            render: (r) => (
                <div>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#1E5FC9] border border-blue-100">
                        📦 {r.ekspedisi}
                    </span>
                    {r.no_resi && (
                        <div className="text-[11px] font-mono text-slate-600 mt-1">
                            Resi: {r.no_resi}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'foto',
            label: 'Foto Paket',
            render: (r) => (
                r.foto_paket ? (
                    <button
                        type="button"
                        onClick={() => {
                            setActiveFotoUrl(r.foto_paket);
                            setPreviewModalOpen(true);
                        }}
                        className="group relative block w-14 h-14 rounded-xl overflow-hidden border border-slate-200 hover:border-blue-400 transition"
                    >
                        <img src={r.foto_paket} alt="Paket" className="w-full h-full object-cover group-hover:scale-110 transition duration-200" />
                        <span className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition">
                            Lihat
                        </span>
                    </button>
                ) : (
                    <span className="text-xs text-slate-400 italic">Tanpa foto</span>
                )
            ),
        },
        {
            key: 'waktu',
            label: 'Waktu Tiba & Diambil',
            render: (r) => (
                <div className="text-xs text-slate-600 space-y-0.5">
                    <div>
                        <span className="text-slate-400 font-medium">Tiba:</span> {r.waktu_tiba ? new Date(r.waktu_tiba).toLocaleString('id-ID') : '-'}
                    </div>
                    {r.waktu_diambil && (
                        <div className="text-emerald-700 font-semibold">
                            <span className="text-slate-400 font-medium">Diambil:</span> {new Date(r.waktu_diambil).toLocaleString('id-ID')}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => (
                r.status === 'belum_diambil' ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        <span>Belum Diambil</span>
                    </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                        <span>✓ Sudah Diambil</span>
                    </span>
                )
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (r) => (
                <div className="flex items-center justify-end gap-1.5">
                    {r.status === 'belum_diambil' && (
                        <button
                            type="button"
                            onClick={() => handleMarkDiambil(r)}
                            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                        >
                            ✓ Diambil
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setTargetDelete(r);
                            setDeleteModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    >
                        Hapus
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Penerimaan Paket"
            subtitle="Pencatatan paket kurir di pos keamanan/lobi kost dan pemantauan pengambilan oleh penghuni."
        >
            {/* Header Tabs & Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            statusFilter === 'all' ? 'bg-white text-[#263b53] shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>Semua Paket</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700">
                            {counts.all}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('belum_diambil')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            statusFilter === 'belum_diambil' ? 'bg-white text-amber-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>Belum Diambil</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">
                            {counts.belum_diambil}
                        </span>
                    </button>
                    <button
                        type="button"
                        onClick={() => setStatusFilter('sudah_diambil')}
                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                            statusFilter === 'sudah_diambil' ? 'bg-white text-emerald-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>Sudah Diambil</span>
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800">
                            {counts.sudah_diambil}
                        </span>
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleExportPdf}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                        <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export PDF
                    </button>
                    <button
                        type="button"
                        onClick={handleExportExcel}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                    >
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export Excel
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenAdd}
                        className="px-4 py-2.5 bg-[#263b53] hover:bg-[#1b2c3f] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
                    >
                        <span>+ Catat Paket Tiba</span>
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <DataTable
                    columns={columns}
                    data={pakets}
                    loading={loading}
                    searchPlaceholder="Cari penerima, kamar, ekspedisi, nomor resi..."
                    emptyTitle="Belum ada data paket"
                    emptyDescription="Tidak ada catatan paket pada filter status ini."
                />
            </div>

            {/* MODAL CATAT PAKET */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Pencatatan Paket Kurir Masuk"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Pilih Penghuni Kost (Opsional)
                        </label>
                        <select
                            value={form.penghuni_id}
                            onChange={(e) => handleSelectTenant(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        >
                            <option value="">-- Ketik manual atau pilih penghuni --</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.user?.name || t.user?.nama} — Kamar {t.kamar?.nomor_kamar || '-'}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nama Penerima di Paket <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                required
                                value={form.nama_penerima}
                                onChange={(e) => setForm({ ...form, nama_penerima: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                                placeholder="Contoh: Dika Pratama"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nomor Kamar
                            </label>
                            <input
                                type="text"
                                value={form.nomor_kamar}
                                onChange={(e) => setForm({ ...form, nomor_kamar: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                                placeholder="Contoh: 102"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Ekspedisi / Kurir <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={form.ekspedisi}
                                onChange={(e) => setForm({ ...form, ekspedisi: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                {ekspedisiOptions.map((opt) => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nomor Resi (Opsional)
                            </label>
                            <input
                                type="text"
                                value={form.no_resi}
                                onChange={(e) => setForm({ ...form, no_resi: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono"
                                placeholder="Contoh: JP1234567890"
                            />
                        </div>
                    </div>

                    {/* Foto Paket */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Foto Dokumentasi Paket (Maks. 5MB)
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                        />
                        {fotoPreview && (
                            <div className="mt-2 relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200">
                                <img src={fotoPreview} alt="Preview" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Catatan Tambahan
                        </label>
                        <textarea
                            rows={2}
                            value={form.catatan}
                            onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            placeholder="Contoh: Diletakkan di rak paket baris 2"
                        />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl transition shadow-sm"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Penerimaan Paket'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL PREVIEW FOTO */}
            <Modal
                isOpen={previewModalOpen}
                onClose={() => setPreviewModalOpen(false)}
                title="Foto Dokumentasi Paket"
                maxWidth="max-w-md"
            >
                <div className="p-2 flex justify-center">
                    <img src={activeFotoUrl} alt="Foto Paket Penuh" className="max-h-[70vh] rounded-xl object-contain shadow-sm" />
                </div>
            </Modal>

            {/* CONFIRM DELETE DIALOG */}
            <ConfirmDialog
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                loading={submittingDelete}
                title="Hapus Catatan Paket"
                message={`Apakah Anda yakin ingin menghapus catatan paket untuk "${targetDelete?.nama_penerima}"? Data dapat dipulihkan kapan saja dari menu Baru Saja Dihapus.`}
                confirmText="Hapus Paket"
                confirmVariant="danger"
            />
        </AdminLayout>
    );
}

