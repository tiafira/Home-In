import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function Peringatan() {
    const { toast } = useToast();

    const [activeSection, setActiveSection] = useState('surat'); // 'surat' | 'poin' | 'menunggak'
    const [peringatans, setPeringatans] = useState([]);
    const [tenantPoints, setTenantPoints] = useState([]);
    const [standardViolations, setStandardViolations] = useState([]);
    const [menunggakList, setMenunggakList] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal Create / Edit
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        penghuni_id: '',
        kategori_pelanggaran: 'Keterlambatan Jam Malam Ringan (< 30 Menit)',
        poin_pelanggaran: 10,
        tingkat_pelanggaran: 'ringan',
        keterangan: '',
        tindakan: 'Teguran lisan & pencatatan log',
        tanggal_kejadian: new Date().toISOString().split('T')[0],
        status: 'aktif',
    });
    const [submitting, setSubmitting] = useState(false);

    // Delete dialog
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [targetDelete, setTargetDelete] = useState(null);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/peringatan');
            if (res.data?.status === 'success') {
                setPeringatans(res.data.data || []);
                setTenantPoints(res.data.tenant_summary || res.data.tenant_points_summary || []);
                setStandardViolations(res.data.standard_violations || []);
                setMenunggakList(res.data.menunggak || []);
            }
        } catch (err) {
            toast.error('Gagal memuat data catatan pelanggaran kost.');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/admin/penghuni', { params: { status: 'aktif' } });
            if (res.data?.status === 'success') {
                setTenants(res.data.data || []);
            }
        } catch (err) {
            // ignore
        }
    };

    useEffect(() => {
        fetchData();
        fetchTenants();
    }, [fetchData]);

    const handleOpenAdd = (prefilledPenghuniId = null) => {
        fetchTenants();
        const defaultViolation = standardViolations[0] || {
            kategori: 'Keterlambatan Jam Malam Ringan (< 30 Menit)',
            tingkat: 'ringan',
            poin: 10,
            tindakan_default: 'Teguran lisan & pencatatan log',
        };

        setForm({
            penghuni_id: prefilledPenghuniId ? String(prefilledPenghuniId) : (tenants.length > 0 ? String(tenants[0].id) : ''),
            kategori_pelanggaran: defaultViolation.kategori,
            poin_pelanggaran: defaultViolation.poin || defaultViolation.default_poin || 10,
            tingkat_pelanggaran: defaultViolation.tingkat || 'ringan',
            keterangan: '',
            tindakan: defaultViolation.tindakan_default || defaultViolation.rekomendasi_tindakan || 'Teguran lisan',
            tanggal_kejadian: new Date().toISOString().split('T')[0],
            status: 'aktif',
        });
        setModalOpen(true);
    };

    const handleSelectCategory = (kategoriName) => {
        const found = standardViolations.find((v) => v.kategori === kategoriName);
        if (found) {
            setForm((prev) => ({
                ...prev,
                kategori_pelanggaran: found.kategori,
                tingkat_pelanggaran: found.tingkat || 'ringan',
                poin_pelanggaran: found.poin || found.default_poin || (found.tingkat === 'berat' ? 50 : 10),
                tindakan: found.tindakan_default || found.rekomendasi_tindakan || prev.tindakan,
            }));
        } else {
            setForm((prev) => ({ ...prev, kategori_pelanggaran: kategoriName }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.penghuni_id) {
            toast.error('Pilih penghuni yang melakukan pelanggaran.');
            return;
        }
        if (!form.keterangan.trim()) {
            toast.error('Keterangan pelanggaran wajib diisi.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/admin/peringatan', form);
            if (res.data?.status === 'success') {
                toast.success(res.data.message || 'Catatan pelanggaran berhasil disimpan!');
                setModalOpen(false);
                fetchData();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mencatat pelanggaran.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleQuickWarn = async (penghuniId) => {
        try {
            const res = await api.post(`/admin/peringatan/quick/${penghuniId}`);
            if (res.data?.status === 'success') {
                toast.success('Surat Peringatan keterlambatan sewa berhasil diterbitkan!');
                fetchData();
            }
        } catch (err) {
            toast.error('Gagal mengirimkan surat peringatan.');
        }
    };

    const handleDelete = async () => {
        if (!targetDelete) return;
        setSubmittingDelete(true);
        try {
            const res = await api.delete(`/admin/peringatan/${targetDelete.id}`);
            if (res.data?.status === 'success') {
                toast.success('Peringatan dipindahkan ke Baru Saja Dihapus.');
                setDeleteModalOpen(false);
                setTargetDelete(null);
                fetchData();
            }
        } catch (err) {
            toast.error('Gagal menghapus peringatan.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    const getPelanggaranBadge = (tingkat) => {
        switch (tingkat) {
            case 'berat':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                        Pelanggaran Berat (3x Dikeluarkan)
                    </span>
                );
            case 'sedang':
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        Pelanggaran Sedang
                    </span>
                );
            case 'ringan':
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Pelanggaran Ringan
                    </span>
                );
        }
    };

    const handleExportPdf = () => {
        exportToPdf({
            title: 'Laporan Catatan Pelanggaran Tata Tertib Kost',
            subtitle: `Total: ${peringatans.length} Catatan Pelanggaran (Aturan: 3x Pelanggaran Berat Dikeluarkan Dari Kost)`,
            branchName: 'Home-In Kost',
            columns: [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Tanggal', accessor: 'tanggal_kejadian' },
                { header: 'Tingkat Pelanggaran', render: (r) => (r.tingkat_pelanggaran || 'ringan').toUpperCase() },
                { header: 'Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Kategori Pelanggaran', accessor: 'kategori_pelanggaran' },
                { header: 'Poin', render: (r) => `+${r.poin_pelanggaran || 0} Poin` },
                { header: 'Tindakan / Sanksi', accessor: 'tindakan' },
                { header: 'Status', render: (r) => (r.status || 'aktif').toUpperCase() },
            ],
            data: peringatans,
            summary: `Total Pelanggaran: ${peringatans.length} | Ringan: ${peringatans.filter(p => p.tingkat_pelanggaran === 'ringan').length} | Sedang: ${peringatans.filter(p => p.tingkat_pelanggaran === 'sedang').length} | Berat: ${peringatans.filter(p => p.tingkat_pelanggaran === 'berat').length}`,
        });
        toast.success('Laporan pelanggaran siap dicetak / disimpan ke PDF.');
    };

    const handleExportExcel = () => {
        const headers = ['No', 'Tanggal', 'Tingkat Pelanggaran', 'Penghuni', 'Nomor Kamar', 'Kategori Pelanggaran', 'Poin Pelanggaran', 'Keterangan', 'Tindakan', 'Status'];
        const rows = peringatans.map((r, i) => [
            i + 1,
            r.tanggal_kejadian || '-',
            (r.tingkat_pelanggaran || 'ringan').toUpperCase(),
            r.penghuni?.user?.nama || r.penghuni?.user?.name || '-',
            r.penghuni?.kamar?.nomor_kamar || '-',
            r.kategori_pelanggaran || '-',
            r.poin_pelanggaran || 0,
            r.keterangan || '-',
            r.tindakan || '-',
            (r.status || 'aktif').toUpperCase(),
        ]);
        exportToExcel({
            filename: `laporan-pelanggaran-${new Date().toISOString().split('T')[0]}.xls`,
            title: 'Laporan Pelanggaran Tata Tertib Home-In Kost',
            headers,
            rows,
        });
        toast.success('Data pelanggaran berhasil diekspor ke Excel!');
    };

    // Columns: Daftar Catatan Pelanggaran
    const spColumns = [
        {
            key: 'tanggal_kejadian',
            label: 'Tanggal & Tingkat',
            render: (row) => (
                <div className="space-y-1">
                    <div className="font-semibold text-slate-800 text-xs">
                        {row.tanggal_kejadian ? new Date(row.tanggal_kejadian).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        }) : '-'}
                    </div>
                    <div>{getPelanggaranBadge(row.tingkat_pelanggaran || 'ringan')}</div>
                </div>
            ),
        },
        {
            key: 'penghuni',
            label: 'Penghuni & Kamar',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 text-xs sm:text-sm">
                        {row.penghuni?.user?.name || row.penghuni?.user?.nama || 'Penghuni'}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                        Kamar {row.penghuni?.kamar?.nomor_kamar || '-'}
                        {row.penghuni?.kamar?.gedung?.nama_gedung && ` (${row.penghuni.kamar.gedung.nama_gedung})`}
                    </div>
                </div>
            ),
        },
        {
            key: 'pelanggaran',
            label: 'Pelanggaran & Poin',
            render: (row) => (
                <div className="space-y-1 max-w-sm">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-800">
                            {row.kategori_pelanggaran || 'Pelanggaran Aturan'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-200">
                            +{row.poin_pelanggaran || 10} Poin
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                        {row.keterangan}
                    </p>
                    {row.tindakan && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                            Sanksi: {row.tindakan}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={() => {
                            setTargetDelete(row);
                            setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus catatan pelanggaran (Pindah ke Trash)"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>
                </div>
            ),
        },
    ];

    // Columns: Rekap Pelanggaran Penghuni
    const pointColumns = [
        {
            key: 'penghuni',
            label: 'Nama Penghuni & Kamar',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="font-bold text-slate-800 text-xs sm:text-sm">{row.nama}</div>
                    <div className="text-[11px] text-slate-500">
                        Kamar {row.kamar} • {row.gedung}
                    </div>
                </div>
            ),
        },
        {
            key: 'rincian',
            label: 'Rincian Pelanggaran',
            render: (row) => (
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                        🟢 Ringan: {row.ringan_count || 0}x
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-semibold text-[11px]">
                        🟡 Sedang: {row.sedang_count || 0}x
                    </span>
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                        (row.berat_count || 0) >= 3
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : (row.berat_count || 0) > 0
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}>
                        🔴 Berat: {row.berat_count || 0} / 3x
                    </span>
                </div>
            ),
        },
        {
            key: 'status_sanksi',
            label: 'Status Sanksi',
            render: (row) => {
                const berat = row.berat_count || 0;
                if (berat >= 3 || row.status_sanksi === 'dikeluarkan') {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-sm">
                            🚨 RESMI DIKELUARKAN (3x Berat)
                        </span>
                    );
                }
                if (berat === 2) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300">
                            ⚠️ WASPADA (1x Lagi Dikeluarkan)
                        </span>
                    );
                }
                if (berat === 1) {
                    return (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            ⚠️ Peringatan Keras (1x Berat)
                        </span>
                    );
                }
                if ((row.ringan_count || 0) > 0 || (row.sedang_count || 0) > 0) {
                    return (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            Catatan Tertib Aktif
                        </span>
                    );
                }
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ✅ Tertib & Taat Aturan
                    </span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Tindakan',
            render: (row) => (
                <button
                    type="button"
                    onClick={() => handleOpenAdd(row.penghuni_id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition shadow-sm border border-blue-200"
                >
                    + Catat Pelanggaran
                </button>
            ),
        },
    ];

    // Columns: Tunggakan Sewa
    const nunggakColumns = [
        {
            key: 'penghuni',
            label: 'Nama Penghuni',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800 text-xs sm:text-sm">{row.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">{row.user?.no_hp || '-'}</div>
                </div>
            ),
        },
        {
            key: 'kamar',
            label: 'Kamar & Gedung',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800 text-xs">Kamar {row.kamar?.nomor_kamar}</div>
                    <div className="text-[11px] text-slate-500">{row.kamar?.gedung?.nama_gedung || '-'}</div>
                </div>
            ),
        },
        {
            key: 'tagihan',
            label: 'Tagihan Tertunggak',
            render: (row) => {
                const unpaid = row.pembayaran?.[0];
                return unpaid ? (
                    <div>
                        <div className="text-xs font-bold text-rose-600">
                            Rp {Number(unpaid.jumlah_tagihan).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            Jatuh tempo: {unpaid.tanggal_jatuh_tempo}
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-amber-600 font-medium">Status: Menunggak</span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Tindakan Cepat',
            render: (row) => (
                <button
                    onClick={() => handleQuickWarn(row.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition flex items-center gap-1.5 shadow-sm border border-rose-200"
                >
                    ⚠️ Terbitkan SP Tunggakan
                </button>
            ),
        },
    ];

    return (
        <AdminLayout title="Catatan Pelanggaran & Tata Tertib">
            <div className="space-y-6">
                {/* Header Title & CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                            Catatan Pelanggaran & Tata Tertib
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Sistem pengawasan tata tertib kost: Pelanggaran Ringan, Sedang, dan Berat. (Aturan: 3x Pelanggaran Berat otomatis dikeluarkan dari kost).
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
                            onClick={() => handleOpenAdd()}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl shadow-sm transition shrink-0 cursor-pointer"
                        >
                            <svg className="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            + Catat Pelanggaran
                        </button>
                    </div>
                </div>

                {/* Info Card: Tingkat Pelanggaran & Sanksi */}
                <div className="p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-rose-50 rounded-2xl border border-blue-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>
                            <div className="font-bold text-xs sm:text-sm text-slate-900">Aturan Sanksi & Tingkat Pelanggaran Kost:</div>
                            <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span>🟢 <strong>Ringan:</strong> Teguran lisan & pencatatan poin</span>
                                <span>🟡 <strong>Sedang:</strong> Peringatan tertulis & ganti rugi</span>
                                <span className="text-rose-700 font-bold bg-rose-100/80 px-2 py-0.5 rounded-md border border-rose-200">
                                    🔴 <strong>Berat:</strong> Melakukan 3 kali otomatis DIKELUARKAN dari kost
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section Navigation Tabs */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <button
                        type="button"
                        onClick={() => setActiveSection('surat')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                            activeSection === 'surat'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span>Daftar Catatan Pelanggaran</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeSection === 'surat' ? 'bg-white/20' : 'bg-slate-100'}`}>
                            {peringatans.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('poin')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                            activeSection === 'poin'
                                ? 'bg-slate-900 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span>Rekap Pelanggaran Penghuni</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeSection === 'poin' ? 'bg-white/20' : 'bg-slate-100'}`}>
                            {tenantPoints.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setActiveSection('menunggak')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-2 ${
                            activeSection === 'menunggak'
                                ? 'bg-rose-600 text-white shadow-sm'
                                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                        <span>Tunggakan Sewa</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeSection === 'menunggak' ? 'bg-white/20' : 'bg-slate-100'}`}>
                            {menunggakList.length}
                        </span>
                    </button>
                </div>

                {/* Content according to activeSection */}
                {activeSection === 'surat' && (
                    <DataTable
                        columns={spColumns}
                        data={peringatans}
                        loading={loading}
                        searchable={true}
                        searchPlaceholder="Cari nama penghuni, nomor kamar, atau jenis pelanggaran..."
                        emptyMessage="Belum ada catatan pelanggaran yang diterbitkan."
                    />
                )}

                {activeSection === 'poin' && (
                    <DataTable
                        columns={pointColumns}
                        data={tenantPoints}
                        loading={loading}
                        searchable={true}
                        searchPlaceholder="Cari penghuni atau kamar..."
                        emptyMessage="Tidak ada data penghuni."
                    />
                )}

                {activeSection === 'menunggak' && (
                    <DataTable
                        columns={nunggakColumns}
                        data={menunggakList}
                        loading={loading}
                        searchable={true}
                        searchPlaceholder="Cari penghuni nunggak..."
                        emptyMessage="Hebat! Tidak ada penghuni yang menunggak sewa saat ini."
                    />
                )}
            </div>

            {/* Modal Tambah Catatan Pelanggaran */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Catat Pelanggaran Tata Tertib"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Pilih Penghuni <span className="text-red-500">*</span>
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
                            Kategori Pelanggaran <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.kategori_pelanggaran}
                            onChange={(e) => handleSelectCategory(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            {standardViolations.map((v) => (
                                <option key={v.kategori} value={v.kategori}>
                                    [{v.tingkat?.toUpperCase() || 'RINGAN'}] {v.kategori} (+{v.poin || v.default_poin || 10} poin)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tingkat Pelanggaran <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.tingkat_pelanggaran}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setForm({
                                        ...form,
                                        tingkat_pelanggaran: val,
                                        poin_pelanggaran: val === 'berat' ? 50 : val === 'sedang' ? 20 : 10,
                                    });
                                }}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                            >
                                <option value="ringan">🟢 Pelanggaran Ringan</option>
                                <option value="sedang">🟡 Pelanggaran Sedang</option>
                                <option value="berat">🔴 Pelanggaran Berat (3x Dikeluarkan)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Poin Pelanggaran <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={form.poin_pelanggaran}
                                onChange={(e) => setForm({ ...form, poin_pelanggaran: parseInt(e.target.value) || 0 })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    {form.tingkat_pelanggaran === 'berat' && (
                        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed font-medium">
                            ⚠️ <strong>ATURAN SISTEM:</strong> Pelanggaran berat dicatat secara ketat. Jika penghuni ini telah melakukan pelanggaran berat sebanyak <strong>3 kali</strong>, sistem secara otomatis <strong>MENGELUARKAN penghuni</strong> dari kost dan mengosongkan status kamar.
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Tanggal Kejadian <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            required
                            value={form.tanggal_kejadian}
                            onChange={(e) => setForm({ ...form, tanggal_kejadian: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Kronologi / Keterangan Pelanggaran <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows="3"
                            required
                            placeholder="Jelaskan detail waktu kejadian, bukti, saksi, atau kronologi..."
                            value={form.keterangan}
                            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Sanksi / Tindakan yang Diberikan
                        </label>
                        <input
                            type="text"
                            placeholder="Contoh: Teguran lisan, wajib ganti rugi, atau peringatan tertulis"
                            value={form.tindakan}
                            onChange={(e) => setForm({ ...form, tindakan: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
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
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Catatan Pelanggaran'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={deleteModalOpen}
                title="Hapus Catatan Pelanggaran"
                message="Pindahkan catatan pelanggaran ini ke Baru Saja Dihapus (Trash)? Data dapat dipulihkan kapan saja."
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
