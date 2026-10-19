import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AdminLayout from '../../Layouts/AdminLayout';
import StatCards from '../../Components/Admin/StatCard';
import PaymentTable from '../../Components/Admin/PaymentTable';
import ComplaintTable from '../../Components/Admin/ComplaintTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../context/ToastContext';
import { exportToPdf } from '../../utils/exportPdf';
import api from '../../services/api';

export default function Dashboard() {
    const navigate = useNavigate();
    const { toast } = useToast();
    const { selectedBranchId, branches } = useBranch();

    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Booking Action States on Dashboard
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
    const [submittingAccept, setSubmittingAccept] = useState(false);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectError, setRejectError] = useState('');
    const [submittingReject, setSubmittingReject] = useState(false);

    const [altModalOpen, setAltModalOpen] = useState(false);
    const [altLoading, setAltLoading] = useState(false);
    const [altData, setAltData] = useState({ current_cabang: null, alternatives: [] });
    const [selectedAltRoom, setSelectedAltRoom] = useState('');
    const [submittingAlt, setSubmittingAlt] = useState(false);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/admin/dashboard', {
                params: selectedBranchId ? { cabang_id: selectedBranchId } : {},
            });
            if (res.data && res.data.data) {
                setDashboardData(res.data.data);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal memuat data dashboard.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
    }, [selectedBranchId]);

    const handleAcceptBooking = async () => {
        if (!selectedBooking) return;
        setSubmittingAccept(true);
        try {
            const res = await api.post(`/admin/booking/${selectedBooking.id}/terima`);
            toast.success(res.data.message || 'Permohonan booking dikonfirmasi.');
            setAcceptDialogOpen(false);
            setSelectedBooking(null);
            fetchDashboard();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menerima booking.');
        } finally {
            setSubmittingAccept(false);
        }
    };

    const handleRejectBooking = async (e) => {
        e.preventDefault();
        if (!selectedBooking) return;
        if (rejectReason.trim().length < 10) {
            setRejectError('Alasan penolakan minimal harus 10 karakter.');
            return;
        }
        setSubmittingReject(true);
        setRejectError('');
        try {
            const res = await api.post(`/admin/booking/${selectedBooking.id}/tolak`, {
                alasan_penolakan: rejectReason.trim(),
            });
            toast.success(res.data.message || 'Booking telah ditolak.');
            setRejectModalOpen(false);
            setRejectReason('');
            setSelectedBooking(null);
            fetchDashboard();
        } catch (err) {
            setRejectError(err.response?.data?.message || 'Gagal menolak booking.');
        } finally {
            setSubmittingReject(false);
        }
    };

    const openAlternativeModal = async (booking) => {
        setSelectedBooking(booking);
        setSelectedAltRoom('');
        setAltModalOpen(true);
        setAltLoading(true);
        try {
            const res = await api.get(`/admin/booking/${booking.id}/alternatives`);
            if (res.data.status === 'success') {
                setAltData(res.data.data);
            }
        } catch (err) {
            toast.error('Gagal mencari cabang alternatif terdekat.');
        } finally {
            setAltLoading(false);
        }
    };

    const handleOfferAlternative = async (e) => {
        e.preventDefault();
        if (!selectedBooking || !selectedAltRoom) {
            toast.warning('Pilih kamar alternatif terlebih dahulu.');
            return;
        }
        setSubmittingAlt(true);
        try {
            const res = await api.post(`/admin/booking/${selectedBooking.id}/tawarkan-alternatif`, {
                kamar_alternatif_id: selectedAltRoom,
            });
            toast.success(res.data.message || 'Tawaran cabang alternatif dikirim ke calon penghuni.');
            setAltModalOpen(false);
            setSelectedBooking(null);
            fetchDashboard();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengirim tawaran alternatif.');
        } finally {
            setSubmittingAlt(false);
        }
    };

    const handleExportDashboardPdf = () => {
        const activeBranchName =
            branches.find((b) => String(b.id) === String(selectedBranchId))?.nama_cabang ||
            'Semua Cabang';

        const payments = dashboardData?.pembayaran_terbaru || [];
        const qa = dashboardData?.quick_access || {};

        exportToPdf({
            title: 'Laporan Ringkasan Dashboard Operasional',
            subtitle: `Kamar Kosong: ${qa.kamar_kosong?.label || '-'} | Penghuni Aktif: ${qa.penghuni_aktif?.label || '-'} | Pemasukan: ${qa.pemasukan?.total_format || '-'}`,
            branchName: activeBranchName,
            columns: [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Nama Penghuni', accessor: 'penghuni_nama' },
                { header: 'Kamar', accessor: 'kamar_info' },
                { header: 'Periode', accessor: 'periode' },
                { header: 'Tagihan', accessor: 'jumlah_tagihan_format', align: 'right' },
                { header: 'Jatuh Tempo', accessor: 'tanggal_jatuh_tempo' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ],
            data: payments,
            summary: `Total Pemasukan Bulan Ini: ${qa.pemasukan?.total_format || 'Rp 0'} (${qa.pemasukan?.persen_perubahan || '0%'}) | Okupansi Kamar: ${dashboardData?.occupancy?.kamar?.label || '-'}`,
        });
    };

    const bookingCount = dashboardData?.quick_access?.booking_baru?.count || 0;
    const bookingList = dashboardData?.booking_terbaru || [];

    return (
        <AdminLayout
            occupancy={dashboardData?.occupancy}
            bookingCount={bookingCount}
            onAddPenghuniClick={() => navigate('/admin/penghuni')}
        >
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header Title & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#263b53] tracking-tight">
                            Dashboard Manajemen
                        </h1>
                        <p className="text-sm text-[#64748b] mt-0.5">
                            Ringkasan operasional, permohonan booking, dan statistik hunian kost secara real-time.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        <button
                            onClick={handleExportDashboardPdf}
                            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-[#263b53] text-xs font-bold hover:bg-blue-50 transition shadow-xs flex items-center gap-2 cursor-pointer"
                            type="button"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            <span>Export PDF</span>
                        </button>

                        <button
                            onClick={fetchDashboard}
                            title="Segarkan Data"
                            className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-[#263b53] text-xs font-bold hover:bg-slate-50 transition shadow-xs flex items-center gap-2 cursor-pointer"
                            type="button"
                        >
                            <svg className={'w-3.5 h-3.5 ' + (loading ? 'animate-spin' : '')} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            <span>Perbarui</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <svg className="w-5 h-5 text-rose-600 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{error}</span>
                        </div>
                        <button
                            onClick={fetchDashboard}
                            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 cursor-pointer"
                        >
                            Coba Lagi
                        </button>
                    </div>
                )}

                {/* 4 Folder Notch Cards Quick Access */}
                <StatCards data={dashboardData?.quick_access} loading={loading} />

                {/* Stacked Full-Width Sections */}
                <div className="space-y-6">
                    {/* Section 0: Permohonan Booking Masuk (Interactive Card/Table) */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#263b53] flex items-center justify-center">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-base sm:text-lg font-bold text-[#263b53]">
                                            Permohonan Booking Masuk
                                        </h2>
                                        {bookingCount > 0 && (
                                            <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 text-xs font-extrabold">
                                                {bookingCount} Perlu Tindakan
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-[#64748b]">
                                        Terima, tolak, atau alihkan ke cabang terdekat (dengan persetujuan calon penghuni).
                                    </p>
                                </div>
                            </div>

                            <Link
                                to="/admin/booking"
                                className="text-xs font-bold text-[#263b53] hover:underline flex items-center gap-1 self-start sm:self-auto"
                            >
                                <span>Kelola Semua Booking</span>
                                <span>&rarr;</span>
                            </Link>
                        </div>

                        {loading ? (
                            <div className="space-y-3 animate-pulse">
                                {[1, 2].map((i) => (
                                    <div key={i} className="h-16 bg-slate-100 rounded-2xl"></div>
                                ))}
                            </div>
                        ) : bookingList.length === 0 ? (
                            <div className="py-8 text-center bg-[#f8fafc] rounded-2xl border border-dashed border-slate-200">
                                <p className="text-sm font-semibold text-[#263b53]">Belum ada permohonan booking baru</p>
                                <p className="text-xs text-[#64748b] mt-0.5">Semua permohonan sewa kamar telah ditangani.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-[#64748b]">
                                            <th className="py-3 px-4">Calon Penghuni</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Kamar & Cabang</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Rencana Check-In</th>
                                            <th className="py-3 px-4 whitespace-nowrap">Status</th>
                                            <th className="py-3 px-4 text-right whitespace-nowrap">Tindakan Cepat</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 text-sm">
                                        {bookingList.map((b) => {
                                            const canProcess = ['menunggu_pembayaran', 'menunggu_persetujuan'].includes(b.status);
                                            const isRoomFull = b.kamar && b.kamar.status !== 'kosong';
                                            return (
                                                <tr key={b.id} className="hover:bg-slate-50/70 transition">
                                                    <td className="py-3.5 px-4">
                                                        <div className="font-bold text-[#263b53]">{b.user?.nama || 'Calon Penghuni'}</div>
                                                        <div className="text-xs text-[#64748b]">{b.user?.no_hp || b.user?.email || '-'}</div>
                                                    </td>
                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <div className="font-semibold text-[#263b53]">
                                                            Kamar {b.kamar?.nomor_kamar || '-'} (Lt. {b.kamar?.lantai || '-'})
                                                        </div>
                                                        <div className="text-xs text-[#64748b]">
                                                            {b.kamar?.gedung?.cabang?.nama_cabang || '-'}
                                                            {isRoomFull && canProcess && (
                                                                <span className="ml-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                                                    Kamar Terisi/Penuh
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-3.5 px-4 whitespace-nowrap text-xs font-medium text-[#263b53]">
                                                        {b.rencana_checkin
                                                            ? new Date(b.rencana_checkin).toLocaleDateString('id-ID', {
                                                                  day: '2-digit',
                                                                  month: 'short',
                                                                  year: 'numeric',
                                                              })
                                                            : '-'}
                                                    </td>
                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <StatusBadge status={b.status} />
                                                        {b.status === 'ditawarkan_alternatif' && b.kamar_alternatif && (
                                                            <div className="text-[11px] text-amber-700 font-medium mt-1">
                                                                Menunggu persetujuan cust &rarr; Kamar {b.kamar_alternatif.nomor_kamar}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        {canProcess ? (
                                                            <div className="inline-flex items-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedBooking(b);
                                                                        setAcceptDialogOpen(true);
                                                                    }}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition cursor-pointer"
                                                                >
                                                                    Terima
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openAlternativeModal(b)}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition cursor-pointer"
                                                                    title="Alihkan ke cabang terdekat (butuh persetujuan customer)"
                                                                >
                                                                    Alihkan Cabang
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedBooking(b);
                                                                        setRejectReason('');
                                                                        setRejectError('');
                                                                        setRejectModalOpen(true);
                                                                    }}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition cursor-pointer"
                                                                >
                                                                    Tolak
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <Link
                                                                to="/admin/booking"
                                                                className="text-xs font-semibold text-[#263b53] hover:underline"
                                                            >
                                                                Detail &rarr;
                                                            </Link>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Section 1: Pembayaran Terbaru (Full Width) */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <PaymentTable payments={dashboardData?.pembayaran_terbaru} loading={loading} />
                    </div>

                    {/* Section 2: Komplain Terbaru (Full Width) */}
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <ComplaintTable complaints={dashboardData?.komplain_terbaru} loading={loading} />
                    </div>
                </div>
            </div>

            {/* Confirm Accept Booking */}
            <ConfirmDialog
                isOpen={acceptDialogOpen}
                onClose={() => setAcceptDialogOpen(false)}
                onConfirm={handleAcceptBooking}
                title="Konfirmasi Terima Booking"
                message={`Apakah Anda yakin ingin menerima permohonan booking dari ${selectedBooking?.user?.nama || 'calon penghuni'} untuk Kamar ${selectedBooking?.kamar?.nomor_kamar || ''}? Status kamar akan otomatis berubah menjadi DIBOOKING.`}
                confirmText="Ya, Terima & Konfirmasi"
                variant="primary"
                loading={submittingAccept}
            />

            {/* Modal Tolak Booking */}
            <Modal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                title="Tolak Permohonan Booking"
                size="md"
            >
                <form onSubmit={handleRejectBooking} className="space-y-4">
                    <p className="text-xs text-[#64748b]">
                        Tuliskan alasan penolakan untuk calon penghuni <strong>{selectedBooking?.user?.nama}</strong>. Alasan ini wajib diisi (minimal 10 karakter) dan akan dikirimkan melalui notifikasi.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-[#263b53] mb-1">
                            Alasan Penolakan <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Contoh: Kamar sedang dalam perbaikan saluran air hingga akhir bulan..."
                            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-[#263b53] outline-none"
                            required
                        />
                        {rejectError && <p className="text-xs text-rose-600 mt-1">{rejectError}</p>}
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setRejectModalOpen(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#64748b] hover:bg-slate-50 cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingReject}
                            className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                        >
                            {submittingReject ? 'Memproses...' : 'Tolak Booking'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Alihkan ke Cabang Lain (Haversine + Persetujuan Customer) */}
            <Modal
                isOpen={altModalOpen}
                onClose={() => setAltModalOpen(false)}
                title="Alihkan ke Cabang Alternatif Terdekat"
                size="lg"
            >
                <form onSubmit={handleOfferAlternative} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                        <strong>Penting (Persetujuan Customer):</strong> Pengalihan kamar ke cabang lain memerlukan persetujuan dari calon penghuni. Setelah Anda mengirim tawaran ini, status booking akan menjadi <em>Ditawarkan Alternatif</em> dan sistem mengirim notifikasi kepada customer untuk menyetujui atau menolak dalam 2x24 jam.
                    </div>

                    {altLoading ? (
                        <div className="py-8 text-center text-xs text-[#64748b]">
                            Menghitung jarak cabang terdekat (Rumus Haversine)...
                        </div>
                    ) : altData.alternatives?.length === 0 ? (
                        <div className="py-6 text-center text-xs text-rose-600 bg-rose-50 rounded-xl">
                            Tidak ditemukan cabang alternatif yang memiliki kamar kosong saat ini.
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                            {altData.alternatives.map((cab) => (
                                <div key={cab.cabang_id} className="border border-slate-200 rounded-2xl p-3.5">
                                    <div className="flex items-center justify-between mb-2">
                                        <div>
                                            <span className="font-bold text-sm text-[#263b53]">{cab.nama_cabang}</span>
                                            <p className="text-xs text-[#64748b]">{cab.alamat}</p>
                                        </div>
                                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-[#263b53] text-xs font-extrabold">
                                            {cab.distance_text} ({cab.available_rooms_count} kamar kosong)
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                                        {cab.rooms.map((rm) => (
                                            <label
                                                key={rm.id}
                                                className={
                                                    'flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ' +
                                                    (String(selectedAltRoom) === String(rm.id)
                                                        ? 'border-[#263b53] bg-blue-50/60 font-bold'
                                                        : 'border-slate-200 hover:bg-slate-50')
                                                }
                                            >
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="radio"
                                                        name="kamar_alternatif_id"
                                                        value={rm.id}
                                                        checked={String(selectedAltRoom) === String(rm.id)}
                                                        onChange={(e) => setSelectedAltRoom(e.target.value)}
                                                        className="text-[#263b53] focus:ring-[#263b53]"
                                                    />
                                                    <div>
                                                        <div className="text-[#263b53]">Kamar {rm.nomor_kamar} (Lt. {rm.lantai})</div>
                                                        <div className="text-[11px] text-[#64748b]">{rm.tipe_kamar}</div>
                                                    </div>
                                                </div>
                                                <span className="text-[#263b53] font-bold">
                                                    Rp {Number(rm.harga_bulanan).toLocaleString('id-ID')}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setAltModalOpen(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-[#64748b] hover:bg-slate-50 cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingAlt || !selectedAltRoom}
                            className="px-4 py-2 rounded-xl bg-[#263b53] text-white text-xs font-bold hover:bg-[#1b2c3f] disabled:opacity-50 cursor-pointer"
                        >
                            {submittingAlt ? 'Mengirim Tawaran...' : 'Kirim Tawaran ke Customer'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
