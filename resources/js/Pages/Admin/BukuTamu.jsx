import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function BukuTamu() {
    const { toast } = useToast();

    const [tamuList, setTamuList] = useState([]);
    const [counts, setCounts] = useState({ all: 0, sedang_berkunjung: 0, sudah_pulang: 0 });
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all'); // all | sedang_berkunjung | sudah_pulang
    const [tanggalFilter, setTanggalFilter] = useState('');
    const [tenants, setTenants] = useState([]);

    // Modal Catat Tamu / Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTamu, setEditingTamu] = useState(null);
    const [form, setForm] = useState({
        nama_tamu: '',
        no_hp_tamu: '',
        jumlah_tamu: 1,
        penghuni_id: '',
        keperluan: '',
        tanggal: new Date().toISOString().split('T')[0],
        jam_masuk: new Date().toTimeString().slice(0, 5),
        jam_keluar: '',
        status: 'sedang_berkunjung',
    });
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoPreview, setFotoPreview] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Modal Preview KTP
    const [previewModalOpen, setPreviewModalOpen] = useState(false);
    const [activeKtpUrl, setActiveKtpUrl] = useState('');
    const [activeKtpName, setActiveKtpName] = useState('');

    // Delete dialog
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [targetDelete, setTargetDelete] = useState(null);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    // Checkout quick confirmation
    const [checkoutTarget, setCheckoutTarget] = useState(null);
    const [submittingCheckout, setSubmittingCheckout] = useState(false);

    const fetchTamu = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/buku-tamu', {
                params: {
                    status: statusFilter,
                    tanggal: tanggalFilter || undefined,
                },
            });
            if (res.data?.status === 'success') {
                setTamuList(res.data.data || []);
                if (res.data.counts) {
                    setCounts(res.data.counts);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat data buku tamu.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, tanggalFilter, toast]);

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
        fetchTamu();
        fetchTenants();
    }, [fetchTamu, fetchTenants]);

    const handleOpenAdd = () => {
        const now = new Date();
        setEditingTamu(null);
        setForm({
            nama_tamu: '',
            no_hp_tamu: '',
            jumlah_tamu: 1,
            penghuni_id: tenants.length > 0 ? String(tenants[0].id) : '',
            keperluan: '',
            tanggal: now.toISOString().split('T')[0],
            jam_masuk: now.toTimeString().slice(0, 5),
            jam_keluar: '',
            status: 'sedang_berkunjung',
        });
        setFotoFile(null);
        setFotoPreview(null);
        setModalOpen(true);
    };

    const handleOpenEdit = (item) => {
        setEditingTamu(item);
        setForm({
            nama_tamu: item.nama_tamu || '',
            no_hp_tamu: item.no_hp_tamu || '',
            jumlah_tamu: item.jumlah_tamu || 1,
            penghuni_id: item.penghuni_id ? String(item.penghuni_id) : '',
            keperluan: item.keperluan || '',
            tanggal: item.tanggal ? item.tanggal.slice(0, 10) : '',
            jam_masuk: item.jam_masuk ? item.jam_masuk.slice(0, 5) : '',
            jam_keluar: item.jam_keluar ? item.jam_keluar.slice(0, 5) : '',
            status: item.status || 'sedang_berkunjung',
        });
        setFotoFile(null);
        setFotoPreview(item.foto_identitas || null);
        setModalOpen(true);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('Ukuran foto identitas/KTP maksimal 5MB.');
            return;
        }

        const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            toast.error('Format foto harus JPG, PNG, atau WebP.');
            return;
        }

        setFotoFile(file);
        setFotoPreview(URL.createObjectURL(file));
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();

        if (!form.nama_tamu.trim()) {
            toast.error('Nama tamu wajib diisi.');
            return;
        }
        if (!form.penghuni_id) {
            toast.error('Pilih penghuni yang dikunjungi.');
            return;
        }
        if (!form.keperluan.trim()) {
            toast.error('Keperluan kunjungan wajib diisi.');
            return;
        }
        if (!form.tanggal || !form.jam_masuk) {
            toast.error('Tanggal dan jam masuk wajib diisi.');
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('nama_tamu', form.nama_tamu);
            formData.append('no_hp_tamu', form.no_hp_tamu || '');
            formData.append('jumlah_tamu', form.jumlah_tamu);
            formData.append('penghuni_id', form.penghuni_id);
            formData.append('keperluan', form.keperluan);
            formData.append('tanggal', form.tanggal);
            formData.append('jam_masuk', form.jam_masuk);
            formData.append('status', form.status);
            if (form.jam_keluar) {
                formData.append('jam_keluar', form.jam_keluar);
            }
            if (fotoFile) {
                formData.append('foto_identitas', fotoFile);
            }

            if (editingTamu) {
                formData.append('_method', 'PUT');
                const res = await api.post(`/admin/buku-tamu/${editingTamu.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (res.data?.status === 'success') {
                    toast.success('Data buku tamu berhasil diperbarui.');
                    setModalOpen(false);
                    fetchTamu();
                }
            } else {
                const res = await api.post('/admin/buku-tamu', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                if (res.data?.status === 'success') {
                    toast.success('Kunjungan tamu berhasil dicatat.');
                    setModalOpen(false);
                    fetchTamu();
                }
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal menyimpan data tamu.';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleExportPdf = () => {
        exportToPdf({
            title: 'Laporan Buku Tamu & Kunjungan',
            subtitle: `Filter: ${statusFilter.replace('_', ' ').toUpperCase()} | Total: ${tamuList.length} Tamu`,
            branchName: 'Home-In Kost',
            columns: [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Nama Tamu', accessor: 'nama_tamu' },
                { header: 'No HP', render: (r) => r.no_hp_tamu || '-' },
                { header: 'Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Keperluan', accessor: 'keperluan' },
                { header: 'Tanggal', accessor: 'tanggal' },
                { header: 'Masuk', accessor: 'jam_masuk' },
                { header: 'Keluar', render: (r) => r.jam_keluar || 'Masih Berkunjung' },
                { header: 'Status', render: (r) => (r.status === 'sedang_berkunjung' ? 'Sedang Berkunjung' : 'Sudah Pulang') },
            ],
            data: tamuList,
            summary: `Total Kunjungan: ${tamuList.length} | Sedang Berkunjung: ${counts.sedang_berkunjung} | Sudah Pulang: ${counts.sudah_pulang}`,
        });
        toast.success('Laporan buku tamu siap dicetak / disimpan ke PDF.');
    };

    const handleExportExcel = () => {
        const headers = ['No', 'Nama Tamu', 'No HP', 'Penghuni Dikunjungi', 'Nomor Kamar', 'Jumlah Orang', 'Keperluan', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status'];
        const rows = tamuList.map((r, i) => [
            i + 1,
            r.nama_tamu || '-',
            r.no_hp_tamu || '-',
            r.penghuni?.user?.nama || r.penghuni?.user?.name || '-',
            r.penghuni?.kamar?.nomor_kamar || '-',
            r.jumlah_tamu || 1,
            r.keperluan || '-',
            r.tanggal || '-',
            r.jam_masuk || '-',
            r.jam_keluar || '-',
            r.status === 'sedang_berkunjung' ? 'Sedang Berkunjung' : 'Sudah Pulang',
        ]);
        exportToExcel({
            filename: `laporan-buku-tamu-${new Date().toISOString().split('T')[0]}.xls`,
            title: 'Laporan Buku Tamu & Kunjungan Home-In',
            headers,
            rows,
        });
        toast.success('Data buku tamu berhasil diekspor ke Excel!');
    };

    const handleCheckout = async (item) => {
        setSubmittingCheckout(true);
        try {
            const res = await api.post(`/admin/buku-tamu/${item.id}/checkout`);
            if (res.data?.status === 'success') {
                toast.success(`Kepulangan tamu ${item.nama_tamu} berhasil dicatat.`);
                setCheckoutTarget(null);
                fetchTamu();
            }
        } catch (err) {
            toast.error('Gagal mencatat kepulangan tamu.');
        } finally {
            setSubmittingCheckout(false);
        }
    };

    const handleDelete = async () => {
        if (!targetDelete) return;
        setSubmittingDelete(true);
        try {
            const res = await api.delete(`/admin/buku-tamu/${targetDelete.id}`);
            if (res.data?.status === 'success') {
                toast.success('Data tamu berhasil dipindahkan ke menu Baru Saja Dihapus.');
                setDeleteModalOpen(false);
                setTargetDelete(null);
                fetchTamu();
            }
        } catch (err) {
            toast.error('Gagal menghapus data tamu.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    const columns = [
        {
            key: 'tanggal',
            label: 'Waktu Kunjungan',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 text-xs">
                        {row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        }) : '-'}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
                        Masuk: <span className="font-mono font-medium text-slate-700">{row.jam_masuk?.slice(0, 5) || '-'}</span>
                        {row.jam_keluar && (
                            <>
                                <span className="text-slate-300">|</span>
                                Pulang: <span className="font-mono font-medium text-emerald-700">{row.jam_keluar?.slice(0, 5)}</span>
                            </>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'tamu',
            label: 'Identitas Tamu',
            render: (row) => (
                <div className="flex items-center gap-3">
                    {row.foto_identitas ? (
                        <button
                            type="button"
                            onClick={() => {
                                setActiveKtpUrl(row.foto_identitas);
                                setActiveKtpName(row.nama_tamu);
                                setPreviewModalOpen(true);
                            }}
                            className="relative group shrink-0 w-11 h-11 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:ring-2 hover:ring-blue-500 transition"
                            title="Klik untuk melihat foto identitas"
                        >
                            <img
                                src={row.foto_identitas}
                                alt="KTP Tamu"
                                className="w-full h-full object-cover group-hover:scale-105 transition"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition text-white">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                </svg>
                            </div>
                        </button>
                    ) : (
                        <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-400 border border-dashed border-slate-300 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.169.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.337 0z" />
                            </svg>
                        </div>
                    )}
                    <div>
                        <div className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                            {row.nama_tamu}
                            {row.jumlah_tamu > 1 && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                    +{row.jumlah_tamu - 1} orang
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                            {row.no_hp_tamu || 'Tanpa no. telepon'}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            key: 'tujuan',
            label: 'Tujuan Kunjungan',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                        <span>{row.penghuni?.user?.name || row.penghuni?.user?.nama || 'Penghuni Kos'}</span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Kamar {row.penghuni?.kamar?.nomor_kamar || row.kamar?.nomor_kamar || '-'}
                        </span>
                    </div>
                    <div className="text-[11px] text-slate-600 italic">
                        "{row.keperluan || '-'}"
                    </div>
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => {
                const isVisiting = row.status === 'sedang_berkunjung';
                return (
                    <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isVisiting
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                    >
                        <span className={`w-1.5 h-1.5 rounded-full ${isVisiting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                        {isVisiting ? 'Sedang Berkunjung' : 'Sudah Pulang'}
                    </span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    {row.status === 'sedang_berkunjung' && (
                        <button
                            type="button"
                            onClick={() => setCheckoutTarget(row)}
                            className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center gap-1 shadow-sm"
                            title="Catat kepulangan tamu sekarang"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Kepulangan
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(row)}
                        className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit data kunjungan"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setTargetDelete(row);
                            setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus data kunjungan (Pindah ke Trash)"
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
        <AdminLayout title="Buku Tamu">
            <div className="space-y-6">
                {/* Header Title & CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Buku Tamu</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Pencatatan tamu yang berkunjung ke asrama/kost, integrasi foto identitas, dan pemantauan jam kepulangan.
                        </p>
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
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition shrink-0 cursor-pointer"
                        >
                            <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Catat Tamu Masuk
                        </button>
                    </div>
                </div>

                {/* Quick Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-slate-900">{counts.all}</div>
                            <div className="text-xs font-medium text-slate-500">Total Kunjungan</div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-amber-700">{counts.sedang_berkunjung}</div>
                            <div className="text-xs font-medium text-slate-500">Sedang Berkunjung di Lokasi</div>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-700">{counts.sudah_pulang}</div>
                            <div className="text-xs font-medium text-slate-500">Sudah Pulang / Selesai</div>
                        </div>
                    </div>
                </div>

                {/* Filter Controls & Tabs */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                        <button
                            type="button"
                            onClick={() => setStatusFilter('all')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                statusFilter === 'all'
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                            Semua Tamu ({counts.all})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('sedang_berkunjung')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                statusFilter === 'sedang_berkunjung'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                            }`}
                        >
                            Sedang Berkunjung ({counts.sedang_berkunjung})
                        </button>
                        <button
                            type="button"
                            onClick={() => setStatusFilter('sudah_pulang')}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                                statusFilter === 'sudah_pulang'
                                    ? 'bg-emerald-600 text-white shadow-sm'
                                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                        >
                            Sudah Pulang ({counts.sudah_pulang})
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-500 shrink-0">Tanggal:</span>
                        <input
                            type="date"
                            value={tanggalFilter}
                            onChange={(e) => setTanggalFilter(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {tanggalFilter && (
                            <button
                                type="button"
                                onClick={() => setTanggalFilter('')}
                                className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
                                title="Reset filter tanggal"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Main Data Table */}
                <DataTable
                    columns={columns}
                    data={tamuList}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder="Cari nama tamu, penghuni, kamar, keperluan..."
                    emptyMessage="Belum ada data kunjungan tamu."
                />
            </div>

            {/* Modal Tambah / Edit Tamu */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingTamu ? 'Edit Kunjungan Tamu' : 'Catat Tamu Masuk'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmitForm} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Nama Tamu <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Budi Santoso"
                            value={form.nama_tamu}
                            onChange={(e) => setForm({ ...form, nama_tamu: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                No. WhatsApp / HP <span className="text-slate-400 font-normal">(Opsional)</span>
                            </label>
                            <input
                                type="text"
                                placeholder="08xxxxxxxxxx (Opsional)"
                                value={form.no_hp_tamu}
                                onChange={(e) => setForm({ ...form, no_hp_tamu: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Jumlah Tamu (Orang) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="20"
                                required
                                value={form.jumlah_tamu}
                                onChange={(e) => setForm({ ...form, jumlah_tamu: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Penghuni & Kamar yang Dituju <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={form.penghuni_id}
                            onChange={(e) => setForm({ ...form, penghuni_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">-- Pilih Penghuni --</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.user?.name || t.user?.nama || 'Penghuni'} (Kamar {t.kamar?.nomor_kamar || '-'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Keperluan Kunjungan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows="2"
                            required
                            placeholder="Contoh: Mengantar barang keperluan kuliah / Kunjungan keluarga"
                            value={form.keperluan}
                            onChange={(e) => setForm({ ...form, keperluan: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tanggal Kunjungan <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                required
                                value={form.tanggal}
                                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Jam Masuk <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                required
                                value={form.jam_masuk}
                                onChange={(e) => setForm({ ...form, jam_masuk: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {editingTamu && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Jam Keluar
                                </label>
                                <input
                                    type="time"
                                    value={form.jam_keluar}
                                    onChange={(e) => setForm({ ...form, jam_keluar: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 mb-1">
                                    Status Kunjungan
                                </label>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    <option value="sedang_berkunjung">Sedang Berkunjung</option>
                                    <option value="sudah_pulang">Sudah Pulang</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Foto Identitas / KTP */}
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Foto Identitas / KTP Tamu
                        </label>
                        <div className="flex items-center gap-3">
                            {fotoPreview && (
                                <div className="w-16 h-12 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                                    <img src={fotoPreview} alt="Preview KTP" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/jpg,image/webp"
                                onChange={handleFileChange}
                                className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition"
                            />
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                            Format JPG, PNG, atau WebP. Maksimal 5MB.
                        </p>
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
                            {submitting ? 'Menyimpan...' : (editingTamu ? 'Simpan Perubahan' : 'Catat Tamu')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Preview KTP */}
            <Modal
                isOpen={previewModalOpen}
                onClose={() => setPreviewModalOpen(false)}
                title={`Foto Identitas: ${activeKtpName}`}
                maxWidth="max-w-xl"
            >
                <div className="space-y-4">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center p-2">
                        <img
                            src={activeKtpUrl}
                            alt="Foto Identitas KTP"
                            className="max-h-[70vh] w-auto rounded-lg object-contain"
                        />
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={() => setPreviewModalOpen(false)}
                            className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
                        >
                            Tutup
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Checkout Tamu */}
            <ConfirmDialog
                isOpen={!!checkoutTarget}
                title="Catat Kepulangan Tamu"
                message={`Apakah Anda yakin ingin mencatat kepulangan untuk tamu "${checkoutTarget?.nama_tamu}" pada jam sekarang?`}
                confirmText={submittingCheckout ? 'Memproses...' : 'Catat Kepulangan'}
                cancelText="Batal"
                variant="primary"
                onConfirm={() => checkoutTarget && handleCheckout(checkoutTarget)}
                onCancel={() => setCheckoutTarget(null)}
            />

            {/* Confirm Delete Tamu */}
            <ConfirmDialog
                isOpen={deleteModalOpen}
                title="Hapus Data Tamu"
                message={`Pindahkan data kunjungan tamu "${targetDelete?.nama_tamu}" ke menu "Baru Saja Dihapus"? Data dapat dipulihkan kapan saja.`}
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

