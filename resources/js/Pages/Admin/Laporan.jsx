import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Laporan() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    // Active Category
    const [activeCategory, setActiveCategory] = useState('keuangan');
    const [reportData, setReportData] = useState([]);
    const [summary, setSummary] = useState({});
    const [loading, setLoading] = useState(true);

    // Filters
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [search, setSearch] = useState('');

    const categories = [
        { id: 'keuangan', label: 'Keuangan & Pembayaran', icon: '💰' },
        { id: 'pengguna', label: 'Penghuni & Akun', icon: '👥' },
        { id: 'komplain', label: 'Komplain & Layanan', icon: '🛠️' },
        { id: 'reservasi', label: 'Reservasi Fasilitas', icon: '🏢' },
        { id: 'paket', label: 'Penerimaan Paket', icon: '📦' },
        { id: 'tamu', label: 'Buku Tamu', icon: '📖' },
        { id: 'izin', label: 'Izin Keluar Malam', icon: '🌙' },
        { id: 'peringatan', label: 'Pelanggaran Kost', icon: '⚠️' },
    ];

    // Quick Date Range Helpers
    const setQuickDate = (type) => {
        const today = new Date();
        const formatDate = (d) => d.toISOString().split('T')[0];

        if (type === 'today') {
            const d = formatDate(today);
            setStartDate(d);
            setEndDate(d);
        } else if (type === '7days') {
            const past = new Date(Date.now() - 7 * 86400000);
            setStartDate(formatDate(past));
            setEndDate(formatDate(today));
        } else if (type === 'month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            setStartDate(formatDate(firstDay));
            setEndDate(formatDate(today));
        } else if (type === 'year') {
            const firstDay = new Date(today.getFullYear(), 0, 1);
            setStartDate(formatDate(firstDay));
            setEndDate(formatDate(today));
        } else if (type === 'all') {
            setStartDate('');
            setEndDate('');
        }
    };

    const fetchReport = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/laporan/general', {
                params: {
                    kategori: activeCategory,
                    tanggal_mulai: startDate || undefined,
                    tanggal_selesai: endDate || undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                    search: search || undefined,
                },
            });

            if (res.data?.status === 'success') {
                setReportData(res.data.data || []);
                setSummary(res.data.summary || {});
            }
        } catch (err) {
            toast.error(`Gagal memuat laporan ${activeCategory}.`);
        } finally {
            setLoading(false);
        }
    }, [activeCategory, startDate, endDate, statusFilter, search, activeBranchId, toast]);

    useEffect(() => {
        fetchReport();
    }, [fetchReport]);

    // Reset status filter when category changes
    const handleCategoryChange = (catId) => {
        setActiveCategory(catId);
        setStatusFilter('all');
        setSearch('');
    };

    // Export PDF
    const handleExportPdf = () => {
        const currentCat = categories.find((c) => c.id === activeCategory);
        let columns = [];
        let summaryText = `Total Data: ${reportData.length}`;

        if (activeCategory === 'keuangan') {
            columns = [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'No Invoice', render: (r) => `INV-${r.id}` },
                { header: 'Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Periode', render: (r) => `${r.periode_bulan}/${r.periode_tahun}` },
                { header: 'Nominal', render: (r) => `Rp ${Number(r.jumlah_tagihan || 0).toLocaleString('id-ID')}` },
                { header: 'Metode', accessor: 'metode_pembayaran' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ];
            summaryText = `Total Data: ${reportData.length} | Total Tagihan: ${summary.total_nominal_rp || 'Rp 0'} | Lunas: ${summary.lunas_nominal_rp || 'Rp 0'} | Belum Bayar: ${summary.pending_nominal_rp || 'Rp 0'}`;
        } else if (activeCategory === 'pengguna') {
            columns = [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Nama Lengkap', accessor: 'nama' },
                { header: 'Email', accessor: 'email' },
                { header: 'No HP', render: (r) => r.no_hp || '-' },
                { header: 'Peran / Role', render: (r) => (r.role || '').toUpperCase() },
                { header: 'Kamar Terdaftar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Bergabung', render: (r) => r.created_at?.slice(0, 10) || '-' },
            ];
            summaryText = `Total Akun: ${reportData.length} | Penghuni: ${summary.penghuni || 0} | Calon Penghuni: ${summary.calon_penghuni || 0} | Karyawan: ${summary.karyawan || 0}`;
        } else if (activeCategory === 'komplain') {
            columns = [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Tanggal', render: (r) => r.created_at?.slice(0, 10) || '-' },
                { header: 'Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Kategori', accessor: 'kategori' },
                { header: 'Keluhan', accessor: 'isi' },
                { header: 'Petugas Bertugas', render: (r) => r.karyawan?.user?.nama || r.karyawan?.user?.name || '-' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ];
            summaryText = `Total Komplain: ${reportData.length} | Menunggu: ${summary.menunggu || 0} | Proses: ${summary.proses || 0} | Selesai: ${summary.selesai || 0}`;
        } else if (activeCategory === 'reservasi') {
            columns = [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Fasilitas', render: (r) => r.fasilitas?.nama_fasilitas || '-' },
                { header: 'Pemohon', render: (r) => r.penghuni?.user?.nama || r.user?.nama || '-' },
                { header: 'Tanggal Pakai', accessor: 'tanggal' },
                { header: 'Waktu', render: (r) => `${r.jam_mulai?.slice(0, 5)} - ${r.jam_selesai?.slice(0, 5)}` },
                { header: 'Jumlah Orang', render: (r) => `${r.jumlah_orang || 1} Orang` },
                { header: 'Keperluan', accessor: 'keperluan' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ];
            summaryText = `Total Reservasi: ${reportData.length} | Disetujui: ${summary.disetujui || 0} | Menunggu: ${summary.menunggu || 0}`;
        } else if (activeCategory === 'paket') {
            columns = [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Nama Penerima', accessor: 'nama_penerima' },
                { header: 'Kamar', render: (r) => r.nomor_kamar || r.kamar?.nomor_kamar || '-' },
                { header: 'Ekspedisi', accessor: 'ekspedisi' },
                { header: 'No Resi', render: (r) => r.no_resi || '-' },
                { header: 'Waktu Tiba', accessor: 'waktu_tiba' },
                { header: 'Waktu Diambil', render: (r) => r.waktu_diambil || 'Belum Diambil' },
                { header: 'Status', render: (r) => (r.status === 'sudah_diambil' ? 'Sudah Diambil' : 'Belum Diambil') },
            ];
            summaryText = `Total Paket: ${reportData.length} | Belum Diambil: ${summary.belum_diambil || 0} | Sudah Diambil: ${summary.sudah_diambil || 0}`;
        } else if (activeCategory === 'tamu') {
            columns = [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Nama Tamu', accessor: 'nama_tamu' },
                { header: 'No HP', render: (r) => r.no_hp_tamu || '-' },
                { header: 'Penghuni Dikunjungi', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Keperluan', accessor: 'keperluan' },
                { header: 'Tanggal', accessor: 'tanggal' },
                { header: 'Masuk', accessor: 'jam_masuk' },
                { header: 'Keluar', render: (r) => r.jam_keluar || 'Masih Berkunjung' },
                { header: 'Status', render: (r) => (r.status === 'sedang_berkunjung' ? 'Sedang Berkunjung' : 'Sudah Pulang') },
            ];
            summaryText = `Total Kunjungan: ${reportData.length} | Sedang Berkunjung: ${summary.sedang_berkunjung || 0} | Sudah Pulang: ${summary.sudah_pulang || 0}`;
        } else if (activeCategory === 'izin') {
            columns = [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Tanggal', accessor: 'tanggal' },
                { header: 'Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Jam Keluar', render: (r) => r.jam_keluar?.slice(0, 5) || '-' },
                { header: 'Rencana Kembali', render: (r) => r.jam_kembali?.slice(0, 5) || '-' },
                { header: 'Alasan Izin', accessor: 'alasan' },
                { header: 'Status', render: (r) => (r.status || 'menunggu').toUpperCase() },
            ];
            summaryText = `Total Izin: ${reportData.length} | Disetujui: ${summary.disetujui || 0} | Menunggu: ${summary.menunggu || 0} | Ditolak: ${summary.ditolak || 0}`;
        } else if (activeCategory === 'peringatan') {
            columns = [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Tanggal', accessor: 'tanggal_kejadian' },
                { header: 'Tingkat', render: (r) => (r.tingkat_pelanggaran || 'ringan').toUpperCase() },
                { header: 'Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Pelanggaran', accessor: 'kategori_pelanggaran' },
                { header: 'Poin', render: (r) => `+${r.poin_pelanggaran || 0}` },
                { header: 'Tindakan / Sanksi', accessor: 'tindakan' },
            ];
            summaryText = `Total Pelanggaran: ${reportData.length} | Ringan: ${summary.ringan || 0} | Sedang: ${summary.sedang || 0} | Berat: ${summary.berat || 0} (3x Berat = Dikeluarkan)`;
        }

        exportToPdf({
            title: `Laporan ${currentCat?.label || 'General'}`,
            subtitle: `Rentang Tanggal: ${startDate || 'Awal'} s/d ${endDate || 'Sekarang'} | Filter Status: ${statusFilter.toUpperCase()}`,
            branchName: 'Home-In Kost',
            columns,
            data: reportData,
            summary: summaryText,
        });
        toast.success(`Laporan ${currentCat?.label} siap dicetak / disimpan ke PDF.`);
    };

    // Export Excel
    const handleExportExcel = () => {
        const currentCat = categories.find((c) => c.id === activeCategory);
        let headers = [];
        let rows = [];

        if (activeCategory === 'keuangan') {
            headers = ['No', 'No Invoice', 'Penghuni', 'Nomor Kamar', 'Bulan', 'Tahun', 'Nominal', 'Metode Bayar', 'Status', 'Tanggal Konfirmasi'];
            rows = reportData.map((r, i) => [
                i + 1,
                `INV-${r.id}`,
                r.penghuni?.user?.nama || r.penghuni?.user?.name || '-',
                r.penghuni?.kamar?.nomor_kamar || '-',
                r.periode_bulan || '-',
                r.periode_tahun || '-',
                r.jumlah_tagihan || 0,
                r.metode_pembayaran || '-',
                (r.status || '').toUpperCase(),
                r.tanggal_konfirmasi || '-',
            ]);
        } else if (activeCategory === 'pengguna') {
            headers = ['No', 'Nama Lengkap', 'Email', 'No HP', 'Peran / Role', 'Nomor Kamar', 'Tanggal Registrasi'];
            rows = reportData.map((r, i) => [
                i + 1,
                r.nama || '-',
                r.email || '-',
                r.no_hp || '-',
                (r.role || '').toUpperCase(),
                r.penghuni?.kamar?.nomor_kamar || '-',
                r.created_at?.slice(0, 10) || '-',
            ]);
        } else if (activeCategory === 'komplain') {
            headers = ['No', 'Tanggal', 'Penghuni', 'Nomor Kamar', 'Kategori', 'Isi Keluhan', 'Petugas Bertugas', 'Status', 'Catatan Progres'];
            rows = reportData.map((r, i) => [
                i + 1,
                r.created_at?.slice(0, 10) || '-',
                r.penghuni?.user?.nama || r.penghuni?.user?.name || '-',
                r.penghuni?.kamar?.nomor_kamar || '-',
                r.kategori || '-',
                r.isi || '-',
                r.karyawan?.user?.nama || r.karyawan?.user?.name || '-',
                (r.status || '').toUpperCase(),
                r.catatan_progres || '-',
            ]);
        } else if (activeCategory === 'reservasi') {
            headers = ['No', 'Fasilitas', 'Pemohon', 'Nomor Kamar', 'Tanggal', 'Jam Mulai', 'Jam Selesai', 'Jumlah Orang', 'Keperluan', 'Status'];
            rows = reportData.map((r, i) => [
                i + 1,
                r.fasilitas?.nama_fasilitas || '-',
                r.penghuni?.user?.nama || r.user?.nama || '-',
                r.penghuni?.kamar?.nomor_kamar || '-',
                r.tanggal || '-',
                r.jam_mulai || '-',
                r.jam_selesai || '-',
                r.jumlah_orang || 1,
                r.keperluan || '-',
                (r.status || '').toUpperCase(),
            ]);
        } else if (activeCategory === 'paket') {
            headers = ['No', 'Nama Penerima', 'Nomor Kamar', 'Ekspedisi', 'No Resi', 'Waktu Tiba', 'Waktu Diambil', 'Status', 'Catatan'];
            rows = reportData.map((r, i) => [
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
        } else if (activeCategory === 'tamu') {
            headers = ['No', 'Nama Tamu', 'No HP', 'Penghuni Dikunjungi', 'Nomor Kamar', 'Jumlah Tamu', 'Keperluan', 'Tanggal', 'Jam Masuk', 'Jam Keluar', 'Status'];
            rows = reportData.map((r, i) => [
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
        } else if (activeCategory === 'izin') {
            headers = ['No', 'Tanggal', 'Penghuni', 'Nomor Kamar', 'Jam Keluar', 'Rencana Kembali', 'Alasan Izin', 'Status'];
            rows = reportData.map((r, i) => [
                i + 1,
                r.tanggal || '-',
                r.penghuni?.user?.nama || r.penghuni?.user?.name || '-',
                r.penghuni?.kamar?.nomor_kamar || '-',
                r.jam_keluar?.slice(0, 5) || '-',
                r.jam_kembali?.slice(0, 5) || '-',
                r.alasan || '-',
                (r.status || 'menunggu').toUpperCase(),
            ]);
        } else if (activeCategory === 'peringatan') {
            headers = ['No', 'Tanggal', 'Tingkat Pelanggaran', 'Penghuni', 'Nomor Kamar', 'Kategori Pelanggaran', 'Poin Pelanggaran', 'Tindakan Sanksi', 'Status'];
            rows = reportData.map((r, i) => [
                i + 1,
                r.tanggal_kejadian || '-',
                (r.tingkat_pelanggaran || 'ringan').toUpperCase(),
                r.penghuni?.user?.nama || r.penghuni?.user?.name || '-',
                r.penghuni?.kamar?.nomor_kamar || '-',
                r.kategori_pelanggaran || '-',
                r.poin_pelanggaran || 0,
                r.tindakan || '-',
                (r.status || 'aktif').toUpperCase(),
            ]);
        }

        exportToExcel({
            filename: `laporan-${activeCategory}-${new Date().toISOString().split('T')[0]}.xls`,
            title: `Laporan ${currentCat?.label || 'Home-In'}`,
            headers,
            rows,
        });
        toast.success(`Data laporan ${currentCat?.label} berhasil diekspor ke Excel!`);
    };

    // Table Column Definitions
    const getColumnsForCategory = () => {
        switch (activeCategory) {
            case 'keuangan':
                return [
                    {
                        key: 'invoice',
                        label: 'No. Invoice & Periode',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">INV-{r.id}</div>
                                <div className="text-[11px] text-slate-500">
                                    Periode {r.periode_bulan}/{r.periode_tahun}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'penghuni',
                        label: 'Penghuni & Kamar',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">
                                    {r.penghuni?.user?.nama || r.penghuni?.user?.name || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-'}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'jumlah_tagihan',
                        label: 'Nominal Tagihan',
                        render: (r) => (
                            <span className="font-bold text-slate-900 text-xs">
                                Rp {Number(r.jumlah_tagihan || 0).toLocaleString('id-ID')}
                            </span>
                        ),
                    },
                    {
                        key: 'metode',
                        label: 'Metode Bayar',
                        render: (r) => (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700">
                                {r.metode_pembayaran || 'Transfer'}
                            </span>
                        ),
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (r) => {
                            const isLunas = r.status === 'lunas';
                            return (
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                    isLunas ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                                }`}>
                                    {(r.status || '').toUpperCase()}
                                </span>
                            );
                        },
                    },
                ];

            case 'pengguna':
                return [
                    {
                        key: 'user',
                        label: 'Nama & Email',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">{r.nama}</div>
                                <div className="text-[11px] text-slate-500">{r.email}</div>
                            </div>
                        ),
                    },
                    {
                        key: 'no_hp',
                        label: 'No. WhatsApp',
                        render: (r) => <span className="text-xs text-slate-700 font-mono">{r.no_hp || '-'}</span>,
                    },
                    {
                        key: 'role',
                        label: 'Peran',
                        render: (r) => (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase">
                                {r.role || 'user'}
                            </span>
                        ),
                    },
                    {
                        key: 'kamar',
                        label: 'Kamar Dihuni',
                        render: (r) => (
                            <span className="text-xs font-semibold text-slate-700">
                                {r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-'}
                            </span>
                        ),
                    },
                    {
                        key: 'created_at',
                        label: 'Tanggal Terdaftar',
                        render: (r) => <span className="text-xs text-slate-500">{r.created_at?.slice(0, 10) || '-'}</span>,
                    },
                ];

            case 'komplain':
                return [
                    {
                        key: 'penghuni',
                        label: 'Penghuni & Kamar',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">
                                    {r.penghuni?.user?.nama || r.penghuni?.user?.name || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-'}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'isi',
                        label: 'Kategori & Keluhan',
                        render: (r) => (
                            <div className="max-w-xs">
                                <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 mb-1">
                                    {r.kategori || 'Umum'}
                                </span>
                                <p className="text-xs text-slate-700 line-clamp-2">{r.isi}</p>
                            </div>
                        ),
                    },
                    {
                        key: 'petugas',
                        label: 'Ditugaskan Ke',
                        render: (r) => (
                            <span className="text-xs font-semibold text-slate-700">
                                {r.karyawan?.user?.nama || r.karyawan?.user?.name || 'Belum Ditugaskan'}
                            </span>
                        ),
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (r) => {
                            const map = {
                                menunggu: 'bg-amber-50 text-amber-700 border-amber-200',
                                proses: 'bg-blue-50 text-blue-700 border-blue-200',
                                selesai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                            };
                            return (
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${map[r.status] || map.menunggu}`}>
                                    {(r.status || '').toUpperCase()}
                                </span>
                            );
                        },
                    },
                ];

            case 'reservasi':
                return [
                    {
                        key: 'fasilitas',
                        label: 'Fasilitas & Jadwal',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">
                                    {r.fasilitas?.nama_fasilitas || 'Fasilitas'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {r.tanggal} ({r.jam_mulai?.slice(0, 5)} - {r.jam_selesai?.slice(0, 5)})
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'pemohon',
                        label: 'Pemohon',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">
                                    {r.penghuni?.user?.nama || r.user?.nama || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    Kapasitas: {r.jumlah_orang || 1} Orang
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'keperluan',
                        label: 'Keperluan',
                        render: (r) => <span className="text-xs text-slate-700">{r.keperluan || '-'}</span>,
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (r) => (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                                {r.status || 'menunggu'}
                            </span>
                        ),
                    },
                ];

            case 'paket':
                return [
                    {
                        key: 'penerima',
                        label: 'Penerima & Kamar',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">{r.nama_penerima}</div>
                                <div className="text-[11px] text-slate-500">
                                    {r.nomor_kamar ? `Kamar ${r.nomor_kamar}` : (r.kamar?.nomor_kamar ? `Kamar ${r.kamar.nomor_kamar}` : '-')}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'ekspedisi',
                        label: 'Ekspedisi & Resi',
                        render: (r) => (
                            <div>
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700">
                                    {r.ekspedisi}
                                </span>
                                {r.no_resi && <div className="text-[11px] text-slate-400 font-mono mt-0.5">{r.no_resi}</div>}
                            </div>
                        ),
                    },
                    {
                        key: 'waktu',
                        label: 'Waktu Tiba / Diambil',
                        render: (r) => (
                            <div className="text-xs text-slate-600">
                                <div>Tiba: {r.waktu_tiba || '-'}</div>
                                {r.waktu_diambil && <div className="text-emerald-600 font-medium">Diambil: {r.waktu_diambil}</div>}
                            </div>
                        ),
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (r) => (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                r.status === 'sudah_diambil' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                                {r.status === 'sudah_diambil' ? 'SUDAH DIAMBIL' : 'BELUM DIAMBIL'}
                            </span>
                        ),
                    },
                ];

            case 'tamu':
                return [
                    {
                        key: 'tamu',
                        label: 'Nama Tamu & HP',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">{r.nama_tamu}</div>
                                <div className="text-[11px] text-slate-500 font-mono">{r.no_hp_tamu || 'Tanpa no. telepon'}</div>
                            </div>
                        ),
                    },
                    {
                        key: 'tujuan',
                        label: 'Penghuni & Kamar',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">
                                    {r.penghuni?.user?.nama || r.penghuni?.user?.name || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-'}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'keperluan',
                        label: 'Keperluan & Jumlah',
                        render: (r) => (
                            <div>
                                <div className="text-xs text-slate-800 font-medium">{r.keperluan}</div>
                                <div className="text-[11px] text-slate-400">{r.jumlah_tamu || 1} Orang</div>
                            </div>
                        ),
                    },
                    {
                        key: 'waktu',
                        label: 'Waktu Kunjungan',
                        render: (r) => (
                            <div className="text-xs text-slate-600">
                                <div>{r.tanggal}</div>
                                <div className="font-mono text-[11px] text-blue-700">
                                    {r.jam_masuk?.slice(0, 5)} - {r.jam_keluar ? r.jam_keluar.slice(0, 5) : 'Masih Berkunjung'}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (r) => (
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                r.status === 'sudah_pulang' ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                                {r.status === 'sudah_pulang' ? 'SUDAH PULANG' : 'SEDANG BERKUNJUNG'}
                            </span>
                        ),
                    },
                ];

            case 'izin':
                return [
                    {
                        key: 'penghuni',
                        label: 'Penghuni & Kamar',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">
                                    {r.penghuni?.user?.nama || r.penghuni?.user?.name || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-'}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'waktu',
                        label: 'Tanggal & Jam',
                        render: (r) => (
                            <div className="text-xs text-slate-700">
                                <div className="font-semibold">{r.tanggal}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                    {r.jam_keluar?.slice(0, 5)} - {r.jam_kembali?.slice(0, 5)}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'alasan',
                        label: 'Alasan Izin',
                        render: (r) => <span className="text-xs text-slate-700 max-w-xs block line-clamp-2">{r.alasan || '-'}</span>,
                    },
                    {
                        key: 'status',
                        label: 'Status',
                        render: (r) => {
                            const map = {
                                disetujui: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                                menunggu: 'bg-amber-50 text-amber-700 border-amber-200',
                                ditolak: 'bg-rose-50 text-rose-700 border-rose-200',
                            };
                            return (
                                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${map[r.status] || map.menunggu}`}>
                                    {(r.status || 'menunggu').toUpperCase()}
                                </span>
                            );
                        },
                    },
                ];

            case 'peringatan':
                return [
                    {
                        key: 'tanggal',
                        label: 'Tanggal & Tingkat',
                        render: (r) => (
                            <div>
                                <div className="font-semibold text-slate-800 text-xs">{r.tanggal_kejadian || '-'}</div>
                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                                    r.tingkat_pelanggaran === 'berat'
                                        ? 'bg-rose-100 text-rose-800 border-rose-300'
                                        : r.tingkat_pelanggaran === 'sedang'
                                            ? 'bg-amber-100 text-amber-800 border-amber-300'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                    {r.tingkat_pelanggaran || 'RINGAN'}
                                </span>
                            </div>
                        ),
                    },
                    {
                        key: 'penghuni',
                        label: 'Penghuni & Kamar',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">
                                    {r.penghuni?.user?.nama || r.penghuni?.user?.name || '-'}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                    {r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-'}
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'pelanggaran',
                        label: 'Pelanggaran & Poin',
                        render: (r) => (
                            <div>
                                <div className="font-bold text-slate-800 text-xs">{r.kategori_pelanggaran}</div>
                                <div className="text-rose-600 font-bold text-xs mt-0.5">
                                    +{r.poin_pelanggaran || 0} Poin
                                </div>
                            </div>
                        ),
                    },
                    {
                        key: 'tindakan',
                        label: 'Sanksi / Tindakan',
                        render: (r) => <span className="text-xs text-slate-700">{r.tindakan || '-'}</span>,
                    },
                ];

            default:
                return [];
        }
    };

    return (
        <AdminLayout
            title="Pusat Laporan Eksekutif"
            subtitle="Pusat pembuatan dan ekspor laporan berkala operasional kost (Keuangan, Pengguna, Komplain, Reservasi, Paket, Tamu, Pelanggaran)."
        >
            <div className="space-y-6">
                {/* Header Action Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-[#263b53] tracking-tight">
                            Pusat Laporan Eksekutif
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Filter rentang tanggal kustom, pratinjau data, dan unduh laporan resmi dalam format PDF & Excel.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleExportPdf}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                        >
                            <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export PDF (Resmi)
                        </button>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-xs cursor-pointer"
                        >
                            <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Export Excel (.xls)
                        </button>
                    </div>
                </div>

                {/* Category Navigation Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {categories.map((c) => {
                        const isActive = activeCategory === c.id;
                        return (
                            <button
                                key={c.id}
                                type="button"
                                onClick={() => handleCategoryChange(c.id)}
                                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition flex items-center gap-2 shrink-0 cursor-pointer ${
                                    isActive
                                        ? 'bg-[#263b53] text-white shadow-md'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span>{c.icon}</span>
                                <span>{c.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Filter Box: Rentang Tanggal & Search */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 mr-1">Periode Cepat:</span>
                            <button
                                type="button"
                                onClick={() => setQuickDate('today')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                            >
                                Hari Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('7days')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                            >
                                7 Hari Terakhir
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('month')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                            >
                                Bulan Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('year')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                            >
                                Tahun Ini
                            </button>
                            <button
                                type="button"
                                onClick={() => setQuickDate('all')}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer transition"
                            >
                                Semua Waktu
                            </button>
                        </div>

                        {/* Date Inputs */}
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-600">Dari:</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-slate-600">Sampai:</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            {(startDate || endDate) && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStartDate('');
                                        setEndDate('');
                                    }}
                                    className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                                >
                                    Reset Tanggal
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* KPI Cards per Category */}
                {activeCategory === 'keuangan' && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Total Transaksi</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_data || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-blue-600">Total Nominal Tagihan</div>
                            <div className="text-2xl font-bold text-blue-700 mt-1">{summary.total_nominal_rp || 'Rp 0'}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600">Lunas ({summary.lunas_count || 0})</div>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.lunas_nominal_rp || 'Rp 0'}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-amber-600">Menunggu Bayar ({summary.pending_count || 0})</div>
                            <div className="text-2xl font-bold text-amber-700 mt-1">{summary.pending_nominal_rp || 'Rp 0'}</div>
                        </div>
                    </div>
                )}

                {activeCategory === 'pengguna' && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Total Pengguna</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_data || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600">Penghuni Aktif</div>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.penghuni || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-blue-600">Calon Penghuni (User)</div>
                            <div className="text-2xl font-bold text-blue-700 mt-1">{summary.calon_penghuni || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-purple-600">Karyawan / Staf</div>
                            <div className="text-2xl font-bold text-purple-700 mt-1">{summary.karyawan || 0}</div>
                        </div>
                    </div>
                )}

                {activeCategory === 'komplain' && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Total Komplain</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_data || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-amber-600">Menunggu Penugasan</div>
                            <div className="text-2xl font-bold text-amber-700 mt-1">{summary.menunggu || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-blue-600">Sedang Dikerjakan</div>
                            <div className="text-2xl font-bold text-blue-700 mt-1">{summary.proses || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600">Selesai Ditangani</div>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.selesai || 0}</div>
                        </div>
                    </div>
                )}

                {activeCategory === 'reservasi' && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Total Jadwal Reservasi</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_data || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600">Disetujui</div>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.disetujui || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-amber-600">Menunggu</div>
                            <div className="text-2xl font-bold text-amber-700 mt-1">{summary.menunggu || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Selesai</div>
                            <div className="text-2xl font-bold text-slate-700 mt-1">{summary.selesai || 0}</div>
                        </div>
                    </div>
                )}

                {activeCategory === 'paket' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Total Penerimaan Paket</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_data || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-amber-600">Belum Diambil</div>
                            <div className="text-2xl font-bold text-amber-700 mt-1">{summary.belum_diambil || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600">Sudah Diambil</div>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.sudah_diambil || 0}</div>
                        </div>
                    </div>
                )}

                {activeCategory === 'tamu' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Total Kunjungan Tamu</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_data || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600">Sedang Berkunjung</div>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.sedang_berkunjung || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Sudah Pulang</div>
                            <div className="text-2xl font-bold text-slate-700 mt-1">{summary.sudah_pulang || 0}</div>
                        </div>
                    </div>
                )}

                {activeCategory === 'izin' && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Total Pengajuan Izin</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_data || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600">Disetujui</div>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.disetujui || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-amber-600">Menunggu Konfirmasi</div>
                            <div className="text-2xl font-bold text-amber-700 mt-1">{summary.menunggu || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-rose-600">Ditolak</div>
                            <div className="text-2xl font-bold text-rose-700 mt-1">{summary.ditolak || 0}</div>
                        </div>
                    </div>
                )}

                {activeCategory === 'peringatan' && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-slate-500">Total Pelanggaran</div>
                            <div className="text-2xl font-bold text-slate-900 mt-1">{summary.total_data || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-emerald-600">Pelanggaran Ringan</div>
                            <div className="text-2xl font-bold text-emerald-700 mt-1">{summary.ringan || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-amber-600">Pelanggaran Sedang</div>
                            <div className="text-2xl font-bold text-amber-700 mt-1">{summary.sedang || 0}</div>
                        </div>
                        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                            <div className="text-xs font-semibold text-rose-700">Pelanggaran Berat (3x Dikeluarkan)</div>
                            <div className="text-2xl font-bold text-rose-800 mt-1">{summary.berat || 0}</div>
                        </div>
                    </div>
                )}

                {/* Data Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
                    <DataTable
                        columns={getColumnsForCategory()}
                        data={reportData}
                        loading={loading}
                        searchPlaceholder={`Cari data laporan ${categories.find((c) => c.id === activeCategory)?.label || ''}...`}
                        emptyTitle={`Tidak ada data laporan ${categories.find((c) => c.id === activeCategory)?.label || ''}`}
                        emptyDescription="Coba ubah rentang tanggal atau bersihkan filter pencarian."
                    />
                </div>
            </div>
        </AdminLayout>
    );
}
