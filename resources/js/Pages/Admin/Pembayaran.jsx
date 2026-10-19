import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
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
    });
    const [submittingManual, setSubmittingManual] = useState(false);

    // Detail / Verify Modal
    const [selectedPayment, setSelectedPayment] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // Confirm Mark Lunas
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
            toast.error('Gagal memuat data pembayaran.');
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

    const fetchTenants = async () => {
        try {
            const res = await api.get('/admin/penghuni', { params: { status: 'aktif' } });
            if (res.data.status === 'success') {
                setTenants(res.data.data);
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
    }, [activeSection, fetchMonthlyPayments, fetchBookingPayments]);

    const handleOpenManualModal = () => {
        fetchTenants();
        setManualForm({
            penghuni_id: tenants[0]?.id || '',
            periode_bulan: new Date().getMonth() + 1,
            periode_tahun: new Date().getFullYear(),
            jumlah_tagihan: 600000,
            metode_pembayaran: 'Tunai',
            status: 'lunas',
            tanggal_jatuh_tempo: new Date().toISOString().split('T')[0],
            tanggal_bayar: new Date().toISOString().split('T')[0],
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

    const handleConfirmLunas = async () => {
        if (!lunasTarget) return;
        setSubmittingLunas(true);
        try {
            await api.put(`/admin/pembayaran/${lunasTarget.id}/status`, { status: 'lunas' });
            toast.success('Tagihan berhasil ditandai sebagai LUNAS!');
            setLunasDialogOpen(false);
            fetchMonthlyPayments();
        } catch (err) {
            toast.error('Gagal memperbarui status pembayaran.');
        } finally {
            setSubmittingLunas(false);
        }
    };

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
                    <div className="font-semibold text-slate-800">{row.penghuni?.user?.name || '-'}</div>
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
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => row.metode_pembayaran || '-',
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
                <div className="flex items-center justify-end gap-2">
                    {row.status !== 'lunas' && (
                        <button
                            onClick={() => {
                                setLunasTarget(row);
                                setLunasDialogOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        >
                            Tandai Lunas
                        </button>
                    )}
                    <button
                        onClick={() => {
                            setSelectedPayment(row);
                            setDetailModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
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
                    <div className="font-semibold text-slate-800">{row.booking?.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">
                        Kamar {row.booking?.kamar?.nomor_kamar} ({row.booking?.kamar?.gedung?.cabang?.nama_cabang})
                    </div>
                </div>
            ),
        },
        {
            key: 'jumlah',
            label: 'Nominal DP / Lunas',
            className: 'whitespace-nowrap font-bold text-[#263b53]',
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
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-[#263b53] hover:bg-blue-100 transition"
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
            subtitle="Pencatatan tagihan sewa bulanan, verifikasi uang muka booking, serta pelunasan manual."
        >
            {/* Top section switcher */}
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
                    <button
                        type="button"
                        onClick={handleOpenManualModal}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition whitespace-nowrap self-start sm:self-auto"
                    >
                        + Catat Bayar Manual
                    </button>
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
                                        ? 'bg-slate-800 text-white'
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
                        searchPlaceholder="Cari nama penghuni, kamar..."
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
                                    {t.user?.name} (Kamar {t.kamar?.nomor_kamar} - {t.kamar?.gedung?.cabang?.nama_cabang})
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
                                    <option key={idx + 1} value={idx + 1}>
                                        {m}
                                    </option>
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
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm"
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
                    title={activeSection === 'booking' ? 'Verifikasi Pembayaran Booking' : 'Detail Pembayaran Tagihan'}
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
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-slate-500">Nominal Transaksi:</span>
                                <strong className="text-lg text-[#263b53]">
                                    Rp {Number(selectedPayment.jumlah || selectedPayment.jumlah_tagihan).toLocaleString('id-ID')}
                                </strong>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-slate-500">Metode:</span>
                                <span className="font-semibold text-slate-700">{selectedPayment.metode_pembayaran || '-'}</span>
                            </div>
                        </div>

                        {selectedPayment.bukti_pembayaran ? (
                            <div>
                                <span className="text-xs font-semibold text-slate-600 block mb-1">Bukti Transfer:</span>
                                <div className="p-2 border border-slate-200 rounded-xl bg-slate-50 text-center">
                                    <img
                                        src={selectedPayment.bukti_pembayaran}
                                        alt="Bukti Transfer"
                                        className="max-h-56 mx-auto rounded-lg object-contain"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 bg-amber-50 text-amber-800 text-xs rounded-xl border border-amber-200">
                                Transaksi ini dibayarkan secara tunai / tidak menyertakan foto struk transfer.
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* CONFIRM MARK LUNAS DIALOG */}
            <ConfirmDialog
                isOpen={lunasDialogOpen}
                onClose={() => setLunasDialogOpen(false)}
                onConfirm={handleConfirmLunas}
                title="Konfirmasi Pelunasan Tagihan"
                message={`Tandai tagihan bulan ${monthNames[lunasTarget?.periode_bulan]} ${lunasTarget?.periode_tahun} untuk ${lunasTarget?.penghuni?.user?.name} sejumlah Rp ${Number(lunasTarget?.jumlah_tagihan).toLocaleString('id-ID')} sebagai LUNAS?`}
                confirmText="Ya, Tandai Lunas"
                cancelText="Batal"
                type="primary"
                loading={submittingLunas}
            />
        </AdminLayout>
    );
}
