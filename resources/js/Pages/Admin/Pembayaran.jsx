import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel, exportToCsv } from '../../utils/exportExcel';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Pembayaran() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    const [activeSection, setActiveSection] = useState('bulanan'); // 'bulanan' | 'booking'
    const [statusFilter, setStatusFilter] = useState('all');
    const [payments, setPayments] = useState([]);
    const [bookingPayments, setBookingPayments] = useState([]);
    const [counts, setCounts] = useState({ all: 0, lunas: 0, belum_bayar: 0, menunggu_konfirmasi: 0, telat: 0 });
    const [loading, setLoading] = useState(true);

    // Active Tenants for manual payment
    const [tenants, setTenants] = useState([]);
    // Guards for cash payment
    const [guards, setGuards] = useState([]);

    // Manual Payment Modal
    const [manualModalOpen, setManualModalOpen] = useState(false);
    const [manualForm, setManualForm] = useState({
        penghuni_id: '',
        periode_bulan: new Date().getMonth() + 1,
        periode_tahun: new Date().getFullYear(),
        jumlah_tagihan: 600000,
        metode_pembayaran: 'Tunai',
        status: 'lunas',
        tanggal_jatuh_tempo: new Date().toISOString().split('T')[0],
        tanggal_bayar: new Date().toISOString().split('T')[0],
        penjaga_perantara_id: '',
    });
    const [submittingManual, setSubmittingManual] = useState(false);

    // Bulk Billing Generation Modal
    const [massalModalOpen, setMassalModalOpen] = useState(false);
    const [massalForm, setMassalForm] = useState({
        periode_bulan: new Date().getMonth() + 1,
        periode_tahun: new Date().getFullYear(),
        tanggal_jatuh_tempo: '',
    });
    const [submittingMassal, setSubmittingMassal] = useState(false);

    // Cash Payment via Guard Modal
    const [cashModalOpen, setCashModalOpen] = useState(false);
    const [cashTarget, setCashTarget] = useState(null);
    const [cashForm, setCashForm] = useState({
        penjaga_perantara_id: '',
        catatan: '',
    });
    const [submittingCash, setSubmittingCash] = useState(false);

    // Detail / Verify Modal
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // Reject Payment Proof Modal
    const [rejectProofModalOpen, setRejectProofModalOpen] = useState(false);
    const [rejectProofReason, setRejectProofReason] = useState('');
    const [submittingRejectProof, setSubmittingRejectProof] = useState(false);

    // Confirm Mark Lunas Dialog
    const [lunasTarget, setLunasTarget] = useState(null);
    const [lunasDialogOpen, setLunasDialogOpen] = useState(false);
    const [submittingLunas, setSubmittingLunas] = useState(false);

    const fetchMonthlyPayments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/pembayaran', {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                },
            });
            if (res.data.status === 'success') {
                setPayments(res.data.data);
                setCounts(res.data.counts);
            }
        } catch (err) {
            toast.error('Gagal memuat data tagihan pembayaran.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, activeBranchId, toast]);

    const fetchBookingPayments = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/pembayaran/booking');
            if (res.data.status === 'success') {
                setBookingPayments(res.data.data);
            }
        } catch (err) {
            toast.error('Gagal memuat pembayaran booking.');
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

    const fetchGuards = async () => {
        try {
            const res = await api.get('/admin/pembayaran/penjaga-list');
            if (res.data.status === 'success') {
                setGuards(res.data.data || []);
            }
        } catch (err) {
            // ignore
        }
    };

    const fetchTenants = async () => {
        try {
            const res = await api.get('/admin/penghuni', { params: { status: 'aktif' } });
            if (res.data.status === 'success') {
                setTenants(res.data.data || []);
            }
        } catch (err) {
            // ignore
        }
    };

    useEffect(() => {
        if (activeSection === 'bulanan') {
            fetchMonthlyPayments();
        } else {
            fetchBookingPayments();
        }
        fetchGuards();
    }, [activeSection, fetchMonthlyPayments, fetchBookingPayments]);

    const handleOpenManualModal = () => {
        fetchTenants();
        fetchGuards();
        setManualForm({
            penghuni_id: tenants[0]?.id || '',
            periode_bulan: new Date().getMonth() + 1,
            periode_tahun: new Date().getFullYear(),
            jumlah_tagihan: 600000,
            metode_pembayaran: 'Tunai',
            status: 'lunas',
            tanggal_jatuh_tempo: new Date().toISOString().split('T')[0],
            tanggal_bayar: new Date().toISOString().split('T')[0],
            penjaga_perantara_id: '',
        });
        setManualModalOpen(true);
    };

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        setSubmittingManual(true);
        try {
            const res = await api.post('/admin/pembayaran/manual', manualForm);
            toast.success(res.data.message || 'Pembayaran berhasil dicatat!');
            setManualModalOpen(false);
            fetchMonthlyPayments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan pembayaran.');
        } finally {
            setSubmittingManual(false);
        }
    };

    // Handle Bulk Billing Generation
    const handleOpenMassalModal = () => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const y = nextMonth.getFullYear();
        const m = nextMonth.getMonth() + 1;
        const defaultDue = `${y}-${String(m).padStart(2, '0')}-10`;

        setMassalForm({
            periode_bulan: m,
            periode_tahun: y,
            tanggal_jatuh_tempo: defaultDue,
        });
        setMassalModalOpen(true);
    };

    const handleMassalSubmit = async (e) => {
        e.preventDefault();
        setSubmittingMassal(true);
        try {
            const res = await api.post('/admin/pembayaran/generate-massal', massalForm);
            toast.success(res.data.message || 'Tagihan massal berhasil diterbitkan!');
            setMassalModalOpen(false);
            fetchMonthlyPayments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal membuat tagihan massal.');
        } finally {
            setSubmittingMassal(false);
        }
    };

    const handleRemindUnpaidMassal = async () => {
        try {
            const res = await api.post('/admin/pembayaran/ingatkan-massal', {
                periode_bulan: massalForm.periode_bulan,
                periode_tahun: massalForm.periode_tahun,
            });
            toast.success(res.data?.message || 'Pengingat tagihan berhasil dikirim ke seluruh penghuni aktif yang belum bayar!');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengirimkan pengingat tagihan massal.');
        }
    };

    // Handle Open Cash Payment via Guard
    const handleOpenCashPayment = (payment) => {
        setCashTarget(payment);
        setCashForm({
            penjaga_perantara_id: guards[0]?.id || '',
            catatan: '',
        });
        setCashModalOpen(true);
    };

    const handleCashSubmit = async (e) => {
        e.preventDefault();
        if (!cashTarget || !cashForm.penjaga_perantara_id) {
            toast.warning('Pilih penjaga perantara penerima pembayaran tunai.');
            return;
        }

        setSubmittingCash(true);
        try {
            const res = await api.post(`/admin/pembayaran/${cashTarget.id}/bayar-tunai`, cashForm);
            toast.success(res.data.message || 'Pembayaran tunai via penjaga berhasil dikonfirmasi!');
            setCashModalOpen(false);
            if (detailModalOpen) setDetailModalOpen(false);
            fetchMonthlyPayments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memproses pembayaran tunai.');
        } finally {
            setSubmittingCash(false);
        }
    };

    // Mark Lunas
    const handleConfirmLunas = async () => {
        if (!lunasTarget) return;
        setSubmittingLunas(true);
        try {
            await api.put(`/admin/pembayaran/${lunasTarget.id}/status`, { status: 'lunas' });
            toast.success('Tagihan berhasil diverifikasi dan ditandai sebagai LUNAS!');
            setLunasDialogOpen(false);
            if (detailModalOpen) setDetailModalOpen(false);
            fetchMonthlyPayments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memperbarui status pembayaran.');
        } finally {
            setSubmittingLunas(false);
        }
    };

    // Reject monthly payment proof
    const handleRejectProof = async () => {
        if (!rejectProofReason.trim() || rejectProofReason.trim().length < 5) {
            toast.warning('Alasan penolakan minimal 5 karakter.');
            return;
        }

        setSubmittingRejectProof(true);
        try {
            await api.post(`/admin/pembayaran/${selectedPayment.id}/tolak-bukti`, {
                alasan_penolakan: rejectProofReason,
            });
            toast.success('Bukti bayar ditolak dan notifikasi telah dikirim ke penghuni.');
            setRejectProofModalOpen(false);
            setRejectProofReason('');
            setDetailModalOpen(false);
            fetchMonthlyPayments();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menolak bukti transfer.');
        } finally {
            setSubmittingRejectProof(false);
        }
    };

    // Booking DP verification
    const handleVerifyBookingPayment = async (id, status) => {
        try {
            await api.post(`/admin/pembayaran/booking/${id}/verify`, { status });
            toast.success(`Pembayaran booking berhasil di-${status}!`);
            setDetailModalOpen(false);
            fetchBookingPayments();
        } catch (err) {
            toast.error('Gagal memverifikasi pembayaran booking.');
        }
    };

    const handleExportExcel = () => {
        const headers = ['No Tagihan', 'Penghuni', 'Kamar', 'Cabang', 'Bulan Tagihan', 'Nominal (Rp)', 'Metode Bayar', 'Status', 'Jatuh Tempo'];
        const rows = payments.map((p) => [
            p.nomor_invoice || `INV-${p.id}`,
            p.penghuni?.user?.nama || p.penghuni?.user?.name || '-',
            p.penghuni?.kamar?.nomor_kamar || '-',
            p.penghuni?.kamar?.gedung?.cabang?.nama_cabang || '-',
            p.bulan_tagihan || '-',
            Number(p.jumlah || 0).toLocaleString('id-ID'),
            p.metode_pembayaran || '-',
            p.status,
            p.tanggal_jatuh_tempo || '-',
        ]);
        exportToExcel({
            filename: `laporan-pembayaran-${new Date().toISOString().split('T')[0]}.xls`,
            title: 'Laporan Tagihan & Pembayaran Sewa Kost',
            headers,
            rows,
        });
        toast.success('Data pembayaran berhasil diekspor ke format Excel!');
    };

    const handleExportCsv = () => {
        const headers = ['No Tagihan', 'Penghuni', 'Kamar', 'Cabang', 'Bulan Tagihan', 'Nominal', 'Metode Bayar', 'Status', 'Jatuh Tempo'];
        const rows = payments.map((p) => [
            p.nomor_invoice || `INV-${p.id}`,
            p.penghuni?.user?.nama || p.penghuni?.user?.name || '-',
            p.penghuni?.kamar?.nomor_kamar || '-',
            p.penghuni?.kamar?.gedung?.cabang?.nama_cabang || '-',
            p.bulan_tagihan || '-',
            p.jumlah || 0,
            p.metode_pembayaran || '-',
            p.status,
            p.tanggal_jatuh_tempo || '-',
        ]);
        exportToCsv({
            filename: `laporan-pembayaran-${new Date().toISOString().split('T')[0]}.csv`,
            headers,
            rows,
        });
        toast.success('Data pembayaran berhasil diekspor ke format CSV!');
    };

    const handleExportPdf = () => {
        exportToPdf({
            title: 'Laporan Tagihan & Pembayaran Sewa Kost',
            subtitle: `Filter Status: ${statusFilter.toUpperCase()}`,
            branchName: 'Home-In Kost',
            columns: [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'No Invoice', render: (r) => r.nomor_invoice || `INV-${r.id}` },
                { header: 'Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar', render: (r) => `Kamar ${r.penghuni?.kamar?.nomor_kamar || '-'}` },
                { header: 'Bulan', accessor: 'bulan_tagihan' },
                { header: 'Nominal', render: (r) => `Rp ${Number(r.jumlah || 0).toLocaleString('id-ID')}` },
                { header: 'Metode', accessor: 'metode_pembayaran' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ],
            data: payments,
            summary: `Total Data: ${payments.length} | Lunas: ${counts.lunas} | Belum Bayar: ${counts.belum_bayar} | Telat: ${counts.telat}`,
        });
    };

    const monthNames = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    const monthlyColumns = [
        {
            key: 'periode',
            label: 'Periode Tagihan',
            className: 'whitespace-nowrap font-medium text-slate-800',
            render: (row) => `${monthNames[row.periode_bulan] || ''} ${row.periode_tahun}`,
        },
        {
            key: 'penghuni',
            label: 'Penghuni & Kamar',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.penghuni?.user?.nama || row.penghuni?.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">
                        Kamar {row.penghuni?.kamar?.nomor_kamar} ({row.penghuni?.kamar?.gedung?.cabang?.nama_cabang})
                    </div>
                </div>
            ),
        },
        {
            key: 'jumlah_tagihan',
            label: 'Jumlah',
            className: 'whitespace-nowrap font-semibold text-slate-800',
            render: (row) => `Rp ${Number(row.jumlah_tagihan).toLocaleString('id-ID')}`,
        },
        {
            key: 'metode_pembayaran',
            label: 'Metode',
            className: 'whitespace-nowrap text-xs text-slate-600',
            render: (row) => (
                <div>
                    <span className="capitalize font-medium">{row.metode_pembayaran || '-'}</span>
                    {row.penjaga && (
                        <div className="text-[11px] text-emerald-700">
                            via {row.penjaga.user?.nama || row.penjaga.user?.name || 'Penjaga'}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'tanggal_jatuh_tempo',
            label: 'Jatuh Tempo',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => row.tanggal_jatuh_tempo,
        },
        {
            key: 'status',
            label: 'Status',
            className: 'whitespace-nowrap',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                    {row.status !== 'lunas' && (
                        <>
                            <button
                                onClick={() => handleOpenCashPayment(row)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                                title="Catat bayar tunai melalui penjaga kost"
                            >
                                Bayar Tunai
                            </button>
                            <button
                                onClick={() => {
                                    setLunasTarget(row);
                                    setLunasDialogOpen(true);
                                }}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#EAF1FC] text-[#1E5FC9] hover:bg-blue-100 transition"
                            >
                                Set Lunas
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => {
                            setSelectedPayment(row);
                            setDetailModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                        Detail
                    </button>
                </div>
            ),
        },
    ];

    const bookingColumns = [
        {
            key: 'created_at',
            label: 'Tgl Bayar',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => new Date(row.tanggal_bayar || row.created_at).toLocaleDateString('id-ID'),
        },
        {
            key: 'booking',
            label: 'Pemohon Booking',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.booking?.user?.nama || row.booking?.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">
                        Kamar {row.booking?.kamar?.nomor_kamar} ({row.booking?.kamar?.gedung?.cabang?.nama_cabang})
                    </div>
                </div>
            ),
        },
        {
            key: 'jumlah',
            label: 'Nominal DP / Lunas',
            className: 'whitespace-nowrap font-bold text-[#1E5FC9]',
            render: (row) => `Rp ${Number(row.jumlah).toLocaleString('id-ID')}`,
        },
        {
            key: 'metode_pembayaran',
            label: 'Metode',
            className: 'whitespace-nowrap text-xs text-slate-600',
            render: (row) => row.metode_pembayaran,
        },
        {
            key: 'status',
            label: 'Status Bukti',
            className: 'whitespace-nowrap',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        onClick={() => {
                            setSelectedPayment(row);
                            setDetailModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EAF1FC] text-[#1E5FC9] hover:bg-blue-100 transition"
                    >
                        Verifikasi Bukti
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Pembayaran & Tagihan"
            subtitle="Pencatatan tagihan sewa bulanan, penerbitan tagihan massal otomatis, penerimaan tunai via penjaga, dan verifikasi transfer."
        >
            {/* Top section switcher & Bulk Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl self-start">
                    <button
                        onClick={() => setActiveSection('bulanan')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            activeSection === 'bulanan'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Tagihan Sewa Bulanan
                    </button>
                    <button
                        onClick={() => setActiveSection('booking')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            activeSection === 'booking'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Pembayaran Booking (DP)
                    </button>
                </div>

                {activeSection === 'bulanan' && (
                    <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                title="Export ke file Excel (.xls)"
                                className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-white rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                                <span>📊 Excel</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleExportCsv}
                                title="Export ke file CSV"
                                className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                                <span>📑 CSV</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleExportPdf}
                                title="Cetak atau Simpan PDF"
                                className="px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-white rounded-lg transition cursor-pointer flex items-center gap-1"
                            >
                                <span>🖨️ PDF</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleOpenMassalModal}
                            className="px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl shadow-xs transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                        >
                            <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            Generate Tagihan Massal
                        </button>
                        <button
                            type="button"
                            onClick={handleOpenManualModal}
                            className="px-4 py-2 text-xs font-bold text-white bg-[#1E5FC9] hover:bg-blue-700 rounded-xl shadow-xs transition whitespace-nowrap cursor-pointer"
                        >
                            + Catat Bayar Manual
                        </button>
                    </div>
                )}
            </div>

            {/* Bulanan Filter Status Chips */}
            {activeSection === 'bulanan' && (
                <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4">
                    {[
                        { key: 'all', label: 'Semua Status', count: counts.all },
                        { key: 'lunas', label: 'Lunas', count: counts.lunas },
                        { key: 'belum_bayar', label: 'Belum Bayar', count: counts.belum_bayar },
                        { key: 'menunggu_konfirmasi', label: 'Menunggu Konfirmasi', count: counts.menunggu_konfirmasi },
                        { key: 'telat', label: 'Telat Bayar', count: counts.telat },
                    ].map((f) => {
                        const isSelected = statusFilter === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => setStatusFilter(f.key)}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap ${
                                    isSelected
                                        ? 'bg-[#1E5FC9] text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span>{f.label}</span>
                                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                    {f.count}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Main Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                {activeSection === 'bulanan' ? (
                    <DataTable
                        columns={monthlyColumns}
                        data={payments}
                        loading={loading}
                        searchPlaceholder="Cari nama penghuni, nomor kamar..."
                        emptyTitle="Tidak ada data tagihan"
                        emptyDescription="Belum ada riwayat tagihan pada filter ini."
                    />
                ) : (
                    <DataTable
                        columns={bookingColumns}
                        data={bookingPayments}
                        loading={loading}
                        searchPlaceholder="Cari pemohon booking..."
                        emptyTitle="Tidak ada pembayaran booking"
                        emptyDescription="Belum ada transaksi pembayaran booking yang tercatat."
                    />
                )}
            </div>

            {/* BULK BILLING GENERATE MODAL */}
            <Modal
                isOpen={massalModalOpen}
                onClose={() => setMassalModalOpen(false)}
                title="Terbitkan Tagihan Bulanan Massal"
                maxWidth="max-w-md"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => setMassalModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleMassalSubmit}
                            disabled={submittingMassal}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition"
                        >
                            {submittingMassal ? 'Menerbitkan...' : 'Terbitkan Semua Tagihan'}
                        </button>
                    </div>
                }
            >
                <form onSubmit={handleMassalSubmit} className="space-y-4">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 leading-relaxed space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                            <span>✓</span>
                            <span>Target Penagihan: Khusus Penghuni Aktif</span>
                        </div>
                        <p>
                            Penagihan massal hanya ditujukan ke <strong>penghuni aktif</strong> (<code>status: aktif</code>). Sistem otomatis menghitung biaya sewa kamar + fasilitas aktif dan menerbitkan tagihan bagi penghuni yang belum memiliki tagihan pada periode ini.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Periode Bulan *</label>
                            <select
                                value={massalForm.periode_bulan}
                                onChange={(e) => setMassalForm({ ...massalForm, periode_bulan: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                {monthNames.slice(1).map((m, idx) => (
                                    <option key={idx + 1} value={idx + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Periode Tahun *</label>
                            <input
                                type="number"
                                required
                                value={massalForm.periode_tahun}
                                onChange={(e) => setMassalForm({ ...massalForm, periode_tahun: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Tanggal Jatuh Tempo Pembayaran *
                        </label>
                        <input
                            type="date"
                            required
                            value={massalForm.tanggal_jatuh_tempo}
                            onChange={(e) => setMassalForm({ ...massalForm, tanggal_jatuh_tempo: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={handleRemindUnpaidMassal}
                            className="w-full py-2 px-3 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>📢</span>
                            <span>Kirim Notifikasi Pengingat ke Penghuni Aktif Yang Belum Bayar</span>
                        </button>
                    </div>
                </form>
            </Modal>

            {/* CASH PAYMENT VIA GUARD MODAL */}
            {cashTarget && (
                <Modal
                    isOpen={cashModalOpen}
                    onClose={() => setCashModalOpen(false)}
                    title={`Penerimaan Tunai via Penjaga (Tagihan #${cashTarget.id})`}
                    maxWidth="max-w-md"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setCashModalOpen(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleCashSubmit}
                                disabled={submittingCash || !cashForm.penjaga_perantara_id}
                                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition"
                            >
                                {submittingCash ? 'Menyimpan...' : 'Konfirmasi Uang Tunai Diterima'}
                            </button>
                        </div>
                    }
                >
                    <form onSubmit={handleCashSubmit} className="space-y-4">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                            <div>Penghuni: <strong>{cashTarget.penghuni?.user?.nama || cashTarget.penghuni?.user?.name}</strong></div>
                            <div>Kamar: <strong>{cashTarget.penghuni?.kamar?.nomor_kamar}</strong></div>
                            <div>Periode: <strong>{monthNames[cashTarget.periode_bulan]} {cashTarget.periode_tahun}</strong></div>
                            <div>Nominal: <strong className="text-[#1E5FC9] text-sm">Rp {Number(cashTarget.jumlah_tagihan).toLocaleString('id-ID')}</strong></div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Pilih Penjaga Perantara Yang Menerima Uang *
                            </label>
                            <select
                                required
                                value={cashForm.penjaga_perantara_id}
                                onChange={(e) => setCashForm({ ...cashForm, penjaga_perantara_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="">-- Pilih Penjaga --</option>
                                {guards.map((g) => (
                                    <option key={g.id} value={g.id}>
                                        {g.user?.nama || g.user?.name} ({g.cabang?.nama_cabang})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                            <textarea
                                rows={2}
                                placeholder="Contoh: Titipan tunai diterima di pos satpam malam hari..."
                                value={cashForm.catatan}
                                onChange={(e) => setCashForm({ ...cashForm, catatan: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </form>
                </Modal>
            )}

            {/* MANUAL PAYMENT MODAL */}
            <Modal
                isOpen={manualModalOpen}
                onClose={() => setManualModalOpen(false)}
                title="Catat Pembayaran Manual"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Penghuni *</label>
                        <select
                            required
                            value={manualForm.penghuni_id}
                            onChange={(e) => setManualForm({ ...manualForm, penghuni_id: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        >
                            <option value="">Pilih Penghuni</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.user?.nama || t.user?.name} (Kamar {t.kamar?.nomor_kamar} - {t.kamar?.gedung?.cabang?.nama_cabang})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Bulan Periode</label>
                            <select
                                value={manualForm.periode_bulan}
                                onChange={(e) => setManualForm({ ...manualForm, periode_bulan: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                {monthNames.slice(1).map((m, idx) => (
                                    <option key={idx + 1} value={idx + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tahun Periode</label>
                            <input
                                type="number"
                                required
                                value={manualForm.periode_tahun}
                                onChange={(e) => setManualForm({ ...manualForm, periode_tahun: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Tagihan (Rp)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                value={manualForm.jumlah_tagihan}
                                onChange={(e) => setManualForm({ ...manualForm, jumlah_tagihan: parseFloat(e.target.value) || 0 })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Metode Pembayaran</label>
                            <select
                                value={manualForm.metode_pembayaran}
                                onChange={(e) => setManualForm({ ...manualForm, metode_pembayaran: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="Tunai">Tunai</option>
                                <option value="Transfer BCA">Transfer BCA</option>
                                <option value="Transfer Mandiri">Transfer Mandiri</option>
                                <option value="QRIS">QRIS</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Jatuh Tempo</label>
                            <input
                                type="date"
                                required
                                value={manualForm.tanggal_jatuh_tempo}
                                onChange={(e) => setManualForm({ ...manualForm, tanggal_jatuh_tempo: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Pembayaran</label>
                            <select
                                value={manualForm.status}
                                onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="lunas">Lunas</option>
                                <option value="belum_bayar">Belum Bayar</option>
                                <option value="menunggu_konfirmasi">Menunggu Konfirmasi</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setManualModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingManual}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#1E5FC9] hover:bg-blue-700 rounded-xl shadow-sm"
                        >
                            {submittingManual ? 'Menyimpan...' : 'Simpan Pembayaran'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* DETAIL / VERIFY MODAL */}
            {selectedPayment && (
                <Modal
                    isOpen={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    title={activeSection === 'booking' ? 'Verifikasi Pembayaran Booking' : `Detail Tagihan #${selectedPayment.id}`}
                    maxWidth="max-w-md"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => setDetailModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Tutup
                            </button>

                            {/* Booking Payment Actions */}
                            {activeSection === 'booking' && selectedPayment.status === 'menunggu_konfirmasi' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleVerifyBookingPayment(selectedPayment.id, 'ditolak')}
                                        className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl"
                                    >
                                        Tolak Bukti
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleVerifyBookingPayment(selectedPayment.id, 'dikonfirmasi')}
                                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                                    >
                                        Konfirmasi Lunas
                                    </button>
                                </div>
                            )}

                            {/* Monthly Payment Actions */}
                            {activeSection === 'bulanan' && selectedPayment.status !== 'lunas' && (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setRejectProofReason('');
                                            setRejectProofModalOpen(true);
                                        }}
                                        className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl"
                                    >
                                        Tolak Bukti
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setLunasTarget(selectedPayment);
                                            setLunasDialogOpen(true);
                                        }}
                                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm"
                                    >
                                        Setujui & Tandai Lunas
                                    </button>
                                </div>
                            )}
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-500">Nominal Tagihan:</span>
                                <strong className="text-lg text-[#1E5FC9]">
                                    Rp {Number(selectedPayment.jumlah || selectedPayment.jumlah_tagihan).toLocaleString('id-ID')}
                                </strong>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Metode Pembayaran:</span>
                                <span className="font-semibold text-slate-700">{selectedPayment.metode_pembayaran || '-'}</span>
                            </div>
                            {selectedPayment.penjaga && (
                                <div className="flex justify-between items-center text-xs mt-1 pt-1 border-t border-slate-200/60">
                                    <span className="text-slate-500">Penjaga Perantara:</span>
                                    <span className="font-semibold text-emerald-700">
                                        {selectedPayment.penjaga.user?.nama || selectedPayment.penjaga.user?.name}
                                    </span>
                                </div>
                            )}
                        </div>

                        {selectedPayment.bukti_pembayaran ? (
                            <div>
                                <span className="text-xs font-semibold text-slate-600 block mb-1">Bukti Transfer:</span>
                                <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-center">
                                    <a href={selectedPayment.bukti_pembayaran} target="_blank" rel="noreferrer">
                                        <img
                                            src={selectedPayment.bukti_pembayaran}
                                            alt="Bukti Transfer"
                                            className="max-h-56 mx-auto rounded-lg object-contain hover:opacity-90 transition"
                                        />
                                    </a>
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                                Transaksi ini dibayarkan secara tunai / belum menyertakan foto bukti transfer.
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* REJECT PROOF MODAL */}
            <Modal
                isOpen={rejectProofModalOpen}
                onClose={() => setRejectProofModalOpen(false)}
                title="Tolak Bukti Pembayaran"
                maxWidth="max-w-md"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => setRejectProofModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleRejectProof}
                            disabled={submittingRejectProof || rejectProofReason.trim().length < 5}
                            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition"
                        >
                            {submittingRejectProof ? 'Menyimpan...' : 'Kirim Penolakan'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <p className="text-xs text-slate-600">
                        Masukkan alasan penolakan bukti transfer ini. Penghuni akan menerima notifikasi dan diminta untuk mengunggah ulang bukti pembayaran yang benar.
                    </p>
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Alasan Penolakan <span className="text-rose-500">* (min. 5 karakter)</span>
                        </label>
                        <textarea
                            rows={3}
                            value={rejectProofReason}
                            onChange={(e) => setRejectProofReason(e.target.value)}
                            placeholder="Contoh: Nominal transfer kurang / bukti struk tidak terbaca / salah rekening..."
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-500"
                        />
                    </div>
                </div>
            </Modal>

            {/* CONFIRM MARK LUNAS DIALOG */}
            <ConfirmDialog
                isOpen={lunasDialogOpen}
                onClose={() => setLunasDialogOpen(false)}
                onConfirm={handleConfirmLunas}
                title="Konfirmasi Pelunasan Tagihan"
                message={`Tandai tagihan bulan ${monthNames[lunasTarget?.periode_bulan]} ${lunasTarget?.periode_tahun} untuk ${lunasTarget?.penghuni?.user?.nama || lunasTarget?.penghuni?.user?.name} sejumlah Rp ${Number(lunasTarget?.jumlah_tagihan).toLocaleString('id-ID')} sebagai LUNAS?`}
                confirmText="Ya, Tandai Lunas"
                cancelText="Batal"
                type="primary"
                loading={submittingLunas}
            />
        </AdminLayout>
    );
}
