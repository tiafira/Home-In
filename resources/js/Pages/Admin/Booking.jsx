import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Booking() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    const [activeTab, setActiveTab] = useState('request_baru');
    const [bookings, setBookings] = useState([]);
    const [counts, setCounts] = useState({
        request_baru: 0,
        menunggu_pembayaran: 0,
        ditawarkan_alternatif: 0,
        dikonfirmasi: 0,
        ditolak: 0,
        selesai: 0,
        all: 0,
    });
    const [loading, setLoading] = useState(true);

    // Selected booking for detail
    const [selectedBooking, setSelectedBooking] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // Image Preview Modal state
    const [previewImageModalUrl, setPreviewImageModalUrl] = useState(null);

    const resolveStorageUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('http://') || url.startsWith('https://')) return url;
        if (url.startsWith('/storage/')) return url;
        if (url.startsWith('storage/')) return `/${url}`;
        if (url.startsWith('/')) return url;
        return `/storage/${url}`;
    };

    // Verify Payment Modal state
    const [verifyModalOpen, setVerifyModalOpen] = useState(false);
    const [submittingVerify, setSubmittingVerify] = useState(false);

    // Reject Payment Proof Modal state
    const [rejectProofModalOpen, setRejectProofModalOpen] = useState(false);
    const [rejectProofReason, setRejectProofReason] = useState('');
    const [submittingRejectProof, setSubmittingRejectProof] = useState(false);

    // Reject Modal state
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [rejectError, setRejectError] = useState('');
    const [submittingReject, setSubmittingReject] = useState(false);

    // Accept Confirm Dialog
    const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
    const [submittingAccept, setSubmittingAccept] = useState(false);

    // Alternative Offer Modal state
    const [altModalOpen, setAltModalOpen] = useState(false);
    const [altLoading, setAltLoading] = useState(false);
    const [altData, setAltData] = useState({ current_cabang: null, alternatives: [] });
    const [selectedAltRoom, setSelectedAltRoom] = useState('');
    const [submittingAlt, setSubmittingAlt] = useState(false);

    // Check-in Awal Modal state
    const [checkinAwalModalOpen, setCheckinAwalModalOpen] = useState(false);
    const [checkinTarget, setCheckinTarget] = useState(null);
    const [checkinTanggal, setCheckinTanggal] = useState(new Date().toISOString().split('T')[0]);
    const [submittingCheckinAwal, setSubmittingCheckinAwal] = useState(false);

    const fetchBookings = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/booking', {
                params: {
                    tab: activeTab,
                },
            });
            if (res.data.status === 'success') {
                setBookings(res.data.data);
                if (res.data.counts) {
                    setCounts(res.data.counts);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat data permohonan booking.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, activeBranchId, toast]);

    useEffect(() => {
        fetchBookings();
    }, [fetchBookings]);

    // Handle open detail
    const handleOpenDetail = (booking) => {
        setSelectedBooking(booking);
        setDetailModalOpen(true);
    };

    // Handle Accept
    const handleConfirmAccept = async () => {
        if (!selectedBooking) return;
        setSubmittingAccept(true);
        try {
            const res = await api.post(`/admin/booking/${selectedBooking.id}/terima`);
            toast.success(res.data.message || 'Permohonan booking berhasil dikonfirmasi!');
            setAcceptDialogOpen(false);
            setDetailModalOpen(false);
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengonfirmasi booking.');
        } finally {
            setSubmittingAccept(false);
        }
    };

    // Handle Reject
    const handleConfirmReject = async () => {
        if (!rejectReason.trim() || rejectReason.trim().length < 10) {
            setRejectError('Alasan penolakan wajib diisi minimal 10 karakter.');
            return;
        }

        setSubmittingReject(true);
        try {
            const res = await api.post(`/admin/booking/${selectedBooking.id}/tolak`, {
                alasan_penolakan: rejectReason,
            });
            toast.success(res.data.message || 'Permohonan booking berhasil ditolak.');
            setRejectModalOpen(false);
            setRejectReason('');
            setRejectError('');
            setDetailModalOpen(false);
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memproses penolakan booking.');
        } finally {
            setSubmittingReject(false);
        }
    };

    // Handle Load Alternatives
    const handleOpenAlternatives = async () => {
        if (!selectedBooking) return;
        setAltLoading(true);
        setAltModalOpen(true);
        setSelectedAltRoom('');
        try {
            const res = await api.get(`/admin/booking/${selectedBooking.id}/alternatives`);
            if (res.data.status === 'success') {
                setAltData(res.data);
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mencari cabang alternatif.');
        } finally {
            setAltLoading(false);
        }
    };

    // Handle Submit Alternative Offer
    const handleSubmitAlternative = async () => {
        if (!selectedAltRoom) {
            toast.warning('Pilih salah satu kamar alternatif terlebih dahulu.');
            return;
        }

        setSubmittingAlt(true);
        try {
            const res = await api.post(`/admin/booking/${selectedBooking.id}/tawarkan-alternatif`, {
                kamar_alternatif_id: selectedAltRoom,
                kadaluarsa_jam: 24,
            });
            toast.success(res.data.message || 'Tawaran kamar alternatif berhasil dikirim!');
            setAltModalOpen(false);
            setDetailModalOpen(false);
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengirimkan tawaran alternatif.');
        } finally {
            setSubmittingAlt(false);
        }
    };

    // Handle Accept Alternative Response
    const handleAcceptOffer = async (bookingId) => {
        try {
            const res = await api.post(`/admin/booking/${bookingId}/terima-tawaran`);
            toast.success(res.data.message || 'Tawaran berhasil diterima dan booking dikonfirmasi!');
            setDetailModalOpen(false);
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memproses tawaran.');
        }
    };

    // Handle Open Verify Modal
    const handleOpenVerifyModal = (booking) => {
        setSelectedBooking(booking);
        setVerifyModalOpen(true);
    };

    // Handle Verify Payment (Tandai Lunas)
    const handleVerifyPayment = async (bookingId) => {
        setSubmittingVerify(true);
        try {
            const res = await api.post(`/admin/booking/${bookingId}/verifikasi-pembayaran`);
            toast.success(res.data.message || 'Pembayaran berhasil diverifikasi dan ditandai Lunas!');
            setVerifyModalOpen(false);
            setDetailModalOpen(false);
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memverifikasi pembayaran.');
        } finally {
            setSubmittingVerify(false);
        }
    };

    // Handle Reject Proof
    const handleRejectProof = async (e) => {
        e.preventDefault();
        if (!selectedBooking) return;
        if (!rejectProofReason.trim()) {
            toast.warning('Alasan penolakan bukti transfer wajib diisi.');
            return;
        }
        setSubmittingRejectProof(true);
        try {
            const res = await api.post(`/admin/booking/${selectedBooking.id}/tolak-bukti`, {
                alasan: rejectProofReason.trim(),
            });
            toast.success(res.data.message || 'Bukti transfer ditolak.');
            setRejectProofModalOpen(false);
            setVerifyModalOpen(false);
            setDetailModalOpen(false);
            setRejectProofReason('');
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menolak bukti transfer.');
        } finally {
            setSubmittingRejectProof(false);
        }
    };

    // Handle Check-in Awal
    const handleOpenCheckinAwalModal = (booking) => {
        setCheckinTarget(booking);
        setCheckinTanggal(new Date().toISOString().split('T')[0]);
        setCheckinAwalModalOpen(true);
    };

    const handleConfirmCheckinAwal = async () => {
        if (!checkinTarget || !checkinTanggal) return;
        setSubmittingCheckinAwal(true);
        try {
            const res = await api.post(`/admin/booking/${checkinTarget.id}/checkin-awal`, {
                tanggal_checkin: checkinTanggal,
            });
            toast.success(res.data.message || 'Check-in berhasil diproses! Penghuni kini berstatus aktif.');
            setCheckinAwalModalOpen(false);
            if (detailModalOpen) setDetailModalOpen(false);
            fetchBookings();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memproses check-in penghuni.');
        } finally {
            setSubmittingCheckinAwal(false);
        }
    };

    const tabs = [
        { key: 'request_baru', label: 'Request Baru', count: counts.request_baru, color: 'bg-amber-500' },
        { key: 'menunggu_pembayaran', label: 'Menunggu Pembayaran / Bukti', count: counts.menunggu_pembayaran, color: 'bg-blue-500' },
        { key: 'ditawarkan_alternatif', label: 'Ditawarkan Alternatif', count: counts.ditawarkan_alternatif, color: 'bg-purple-500' },
        { key: 'dikonfirmasi', label: 'Dikonfirmasi', count: counts.dikonfirmasi, color: 'bg-emerald-500' },
        { key: 'ditolak', label: 'Ditolak', count: counts.ditolak, color: 'bg-rose-500' },
        { key: 'selesai', label: 'Selesai', count: counts.selesai, color: 'bg-slate-500' },
        { key: 'all', label: 'Semua', count: counts.all, color: 'bg-blue-600' },
    ];

    const columns = [
        {
            key: 'tanggal_booking',
            label: 'Tgl Permohonan',
            className: 'whitespace-nowrap font-medium text-slate-500',
            render: (row) => {
                const date = new Date(row.tanggal_booking || row.created_at);
                return date.toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });
            },
        },
        {
            key: 'user',
            label: 'Calon Penghuni',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.user?.name || 'Tanpa Nama'}</div>
                    <div className="text-xs text-slate-500">{row.user?.email || '-'} • {row.user?.no_hp || '-'}</div>
                </div>
            ),
        },
        {
            key: 'kamar',
            label: 'Kamar & Lokasi',
            className: 'whitespace-nowrap',
            render: (row) => (
                <div>
                    <div className="font-semibold text-[#263b53]">
                        Kamar {row.kamar?.nomor_kamar || '-'} (Lt. {row.kamar?.lantai || 1})
                    </div>
                    <div className="text-xs text-slate-500">
                        {row.kamar?.gedung?.cabang?.nama_cabang || '-'} • {row.kamar?.gedung?.nama_gedung || '-'}
                    </div>
                    {row.kamar_alternatif_id && (
                        <div className="mt-1 text-[11px] text-purple-600 font-medium">
                            Alternatif: Kamar {row.kamar_alternatif?.nomor_kamar} ({row.kamar_alternatif?.gedung?.cabang?.nama_cabang})
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'rencana_checkin',
            label: 'Rencana Check-In',
            className: 'whitespace-nowrap',
            render: (row) => {
                const date = new Date(row.rencana_checkin);
                return (
                    <span className="font-medium text-slate-700">
                        {date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                );
            },
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
                    {['menunggu_konfirmasi', 'menunggu_persetujuan'].includes(row.status) && (
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedBooking(row);
                                setAcceptDialogOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        >
                            Setujui
                        </button>
                    )}
                    {row.status === 'menunggu_verifikasi' && (
                        <button
                            type="button"
                            onClick={() => handleOpenVerifyModal(row)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                            title="Tinjau & Verifikasi Bukti Pembayaran"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verifikasi Bukti
                        </button>
                    )}
                    {['terjadwal', 'dikonfirmasi', 'disetujui'].includes(row.status) && (
                        <button
                            type="button"
                            onClick={() => handleOpenCheckinAwalModal(row)}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors flex items-center gap-1 cursor-pointer"
                            title="Check-In Sekarang / Lebih Awal"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                            </svg>
                            Check-In Awal
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenDetail(row)}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#EAF1FC] text-[#1E5FC9] hover:bg-blue-100 transition-colors flex items-center gap-1"
                    >
                        Detail
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Manajemen Booking"
            subtitle="Tinjau permohonan sewa baru, tawarkan cabang alternatif saat kost penuh, dan konfirmasi reservasi calon penghuni."
        >
            {/* Tab navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-200">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                                isActive
                                    ? 'bg-[#263b53] text-white shadow-sm shadow-blue-500/20'
                                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
                            }`}
                        >
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span
                                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                                    }`}
                                >
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Main DataTable */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <DataTable
                    columns={columns}
                    data={bookings}
                    loading={loading}
                    searchPlaceholder="Cari nama pemohon, email, kamar, no HP..."
                    emptyTitle="Tidak ada data booking"
                    emptyDescription={`Belum ada permohonan booking pada tab ${tabs.find((t) => t.key === activeTab)?.label || ''}.`}
                />
            </div>

            {/* DETAIL MODAL */}
            {selectedBooking && (
                <Modal
                    isOpen={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    title={`Detail Booking #${selectedBooking.id}`}
                    maxWidth="max-w-2xl"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => setDetailModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Tutup
                            </button>

                            <div className="flex items-center gap-2">
                                {['menunggu_konfirmasi', 'menunggu_persetujuan'].includes(selectedBooking.status) && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={handleOpenAlternatives}
                                            className="px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition"
                                        >
                                            Tawarkan Alternatif
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRejectReason('');
                                                setRejectError('');
                                                setRejectModalOpen(true);
                                            }}
                                            className="px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                                        >
                                            Tolak Permohonan
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setAcceptDialogOpen(true)}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-[#1E5FC9] hover:bg-[#184ea8] rounded-xl shadow-sm transition"
                                        >
                                            Setujui Permohonan
                                        </button>
                                    </>
                                )}

                                {selectedBooking.status === 'ditawarkan_alternatif' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => handleAcceptOffer(selectedBooking.id)}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                                        >
                                            Calon Penghuni Menerima Tawaran
                                        </button>
                                    </>
                                )}

                                {selectedBooking.status === 'menunggu_verifikasi' && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setRejectProofReason('');
                                                setRejectProofModalOpen(true);
                                            }}
                                            className="px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                                        >
                                            Tolak Bukti
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleVerifyPayment(selectedBooking.id)}
                                            disabled={submittingVerify}
                                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                            </svg>
                                            {submittingVerify ? 'Memproses...' : 'Verifikasi & Tandai Lunas'}
                                        </button>
                                    </>
                                )}

                                {['terjadwal', 'dikonfirmasi', 'disetujui'].includes(selectedBooking.status) && (
                                    <button
                                        type="button"
                                        onClick={() => handleOpenCheckinAwalModal(selectedBooking)}
                                        className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                        </svg>
                                        Check-In Sekarang / Lebih Awal
                                    </button>
                                )}
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-6">
                        {/* Status Alert Banner */}
                        <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl">
                            <div>
                                <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block mb-1">
                                    Status Permohonan
                                </span>
                                <StatusBadge status={selectedBooking.status} />
                            </div>
                            <div className="text-right text-xs text-slate-500">
                                <div>Tanggal Booking:</div>
                                <div className="font-semibold text-slate-700">
                                    {new Date(selectedBooking.tanggal_booking || selectedBooking.created_at).toLocaleString('id-ID')}
                                </div>
                            </div>
                        </div>

                        {/* Applicant details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                                <span className="text-xs text-slate-400 font-medium block mb-1">Nama Calon Penghuni</span>
                                <div className="font-semibold text-slate-800 text-base">{selectedBooking.user?.name || '-'}</div>
                                <div className="text-xs text-slate-500 mt-1">{selectedBooking.user?.email || '-'}</div>
                                <div className="text-xs text-slate-500">{selectedBooking.user?.no_hp || '-'}</div>
                            </div>

                            <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-100">
                                <span className="text-xs text-slate-400 font-medium block mb-1">Rencana Check-In</span>
                                <div className="font-semibold text-[#263b53] text-base">
                                    {new Date(selectedBooking.rencana_checkin).toLocaleDateString('id-ID', {
                                        weekday: 'long',
                                        day: 'numeric',
                                        month: 'long',
                                        year: 'numeric',
                                    })}
                                </div>
                                <div className="text-xs text-slate-500 mt-1">
                                    Harga: Rp {Number(selectedBooking.kamar?.harga_bulanan || 0).toLocaleString('id-ID')}/bln
                                </div>
                            </div>
                        </div>

                        {/* Room requested info */}
                        <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                            <div className="text-xs font-semibold text-[#263b53] uppercase tracking-wider mb-2">
                                Kamar Yang Dipilih
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-sm">
                                <div>
                                    <span className="text-xs text-slate-500 block">Nomor Kamar:</span>
                                    <strong className="text-slate-800">Kamar {selectedBooking.kamar?.nomor_kamar}</strong>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">Gedung / Lantai:</span>
                                    <strong className="text-slate-800">
                                        {selectedBooking.kamar?.gedung?.nama_gedung} (Lt. {selectedBooking.kamar?.lantai})
                                    </strong>
                                </div>
                                <div>
                                    <span className="text-xs text-slate-500 block">Cabang:</span>
                                    <strong className="text-slate-800">
                                        {selectedBooking.kamar?.gedung?.cabang?.nama_cabang}
                                    </strong>
                                </div>
                            </div>
                        </div>

                        {/* Rincian Fasilitas & Tagihan */}
                        {selectedBooking.rincian_biaya && (
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                                    Rincian Tagihan & Fasilitas
                                </div>
                                <div className="text-xs space-y-2">
                                    <div className="flex justify-between items-center text-slate-600">
                                        <span>Harga Dasar Kamar {selectedBooking.kamar?.nomor_kamar}:</span>
                                        <span className="font-semibold text-slate-800">
                                            Rp {Number(selectedBooking.rincian_biaya.harga_kamar || 0).toLocaleString('id-ID')}/bln
                                        </span>
                                    </div>

                                    {/* Fasilitas Per Bulan */}
                                    {selectedBooking.rincian_biaya.fasilitas_per_bulan?.map((f) => (
                                        <div key={f.id} className="flex justify-between items-center text-slate-600">
                                            <span className="flex items-center gap-1.5">
                                                <span>{f.nama}</span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                                    Per Bulan
                                                </span>
                                            </span>
                                            <span className="font-semibold text-slate-800">
                                                +Rp {Number(f.biaya).toLocaleString('id-ID')}/bln
                                            </span>
                                        </div>
                                    ))}

                                    {/* Fasilitas Sekali Bayar */}
                                    {selectedBooking.rincian_biaya.fasilitas_sekali_bayar?.map((f) => (
                                        <div key={f.id} className="flex justify-between items-center text-emerald-800">
                                            <span className="flex items-center gap-1.5">
                                                <span>{f.nama}</span>
                                                <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                                    Sekali Bayar • Hak Milik
                                                </span>
                                            </span>
                                            <span className="font-bold text-emerald-700">
                                                +Rp {Number(f.biaya).toLocaleString('id-ID')} (1x)
                                            </span>
                                        </div>
                                    ))}

                                    <div className="pt-2 border-t border-slate-200 flex justify-between items-center font-bold text-sm">
                                        <span className="text-slate-800">Total Tagihan Bulan Pertama:</span>
                                        <span className="text-[#1E5FC9]">
                                            Rp {Number(selectedBooking.rincian_biaya.total_bulan_pertama || 0).toLocaleString('id-ID')}
                                        </span>
                                    </div>
                                    {selectedBooking.rincian_biaya.subtotal_fasilitas_sekali_bayar > 0 && (
                                        <div className="text-[11px] text-slate-500 text-right">
                                            Tagihan Bulan ke-2 dst: <strong>Rp {Number(selectedBooking.rincian_biaya.total_bulan_berikutnya || 0).toLocaleString('id-ID')}/bln</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Informasi Bukti Pembayaran */}
                        {(() => {
                            const payment = Array.isArray(selectedBooking.pembayaran_booking)
                                ? selectedBooking.pembayaran_booking[0]
                                : selectedBooking.pembayaran_booking;
                            const buktiUrl = payment?.bukti_bayar || payment?.bukti_pembayaran;

                            if (!payment && !buktiUrl) return null;

                            return (
                                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                                            <span>💳 Informasi Pembayaran & Bukti Transfer</span>
                                        </div>
                                        <StatusBadge status={payment?.status || selectedBooking.status} />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                        <div className="space-y-1.5 text-slate-700">
                                            <div>
                                                <span className="text-slate-500">Nominal Tagihan:</span>{' '}
                                                <strong>Rp {Number(payment?.nominal || 0).toLocaleString('id-ID')}</strong>
                                            </div>
                                            {payment?.kode_unik > 0 && (
                                                <div>
                                                    <span className="text-slate-500">Kode Unik:</span>{' '}
                                                    <strong className="text-blue-600">+{payment.kode_unik}</strong>
                                                </div>
                                            )}
                                            <div>
                                                <span className="text-slate-500">Metode:</span>{' '}
                                                <strong>{payment?.metode || payment?.metode_pembayaran || 'Transfer'}</strong>
                                            </div>
                                            {payment?.tanggal_bayar && (
                                                <div>
                                                    <span className="text-slate-500">Waktu Transfer:</span>{' '}
                                                    <strong>{new Date(payment.tanggal_bayar).toLocaleString('id-ID')}</strong>
                                                </div>
                                            )}
                                            {payment?.kwitansi_nomor && (
                                                <div>
                                                    <span className="text-slate-500">No. Kwitansi:</span>{' '}
                                                    <strong className="text-emerald-700">{payment.kwitansi_nomor}</strong>
                                                </div>
                                            )}
                                        </div>

                                        {buktiUrl ? (
                                            <div>
                                                <span className="text-[11px] text-slate-500 block mb-1 font-medium">Foto Bukti Transfer:</span>
                                                <div className="flex flex-col gap-1.5 items-start">
                                                    <button
                                                        type="button"
                                                        onClick={() => setPreviewImageModalUrl(resolveStorageUrl(buktiUrl))}
                                                        className="inline-block border border-amber-300 rounded-lg overflow-hidden hover:opacity-90 shadow-sm transition group relative cursor-pointer"
                                                        title="Klik untuk membuka foto ukuran penuh"
                                                    >
                                                        <img
                                                            src={resolveStorageUrl(buktiUrl)}
                                                            alt="Bukti Transfer"
                                                            className="w-36 h-28 object-cover group-hover:scale-105 transition duration-150"
                                                        />
                                                        <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[11px] font-bold transition">
                                                            Perbesar 🔍
                                                        </div>
                                                    </button>
                                                    <div className="flex items-center gap-2 text-[11px]">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPreviewImageModalUrl(resolveStorageUrl(buktiUrl))}
                                                            className="text-[#1E5FC9] font-bold hover:underline"
                                                        >
                                                            Lihat Foto
                                                        </button>
                                                        <span className="text-slate-300">•</span>
                                                        <a
                                                            href={resolveStorageUrl(buktiUrl)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-slate-500 hover:text-slate-700"
                                                        >
                                                            Tab Baru ↗
                                                        </a>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-slate-400 italic flex items-center">
                                                Belum ada foto bukti transfer yang diunggah.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Alternative room offer if present */}
                        {selectedBooking.kamar_alternatif && (
                            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                                <div className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-2">
                                    Tawaran Kamar Alternatif Aktif
                                </div>
                                <div className="text-sm text-purple-900">
                                    Kamar <strong>{selectedBooking.kamar_alternatif.nomor_kamar}</strong> di{' '}
                                    <strong>{selectedBooking.kamar_alternatif.gedung?.cabang?.nama_cabang}</strong>
                                    (Gedung {selectedBooking.kamar_alternatif.gedung?.nama_gedung}, Lt.{' '}
                                    {selectedBooking.kamar_alternatif.lantai})
                                </div>
                                {selectedBooking.tawaran_kadaluarsa_pada && (
                                    <div className="text-xs text-purple-600 mt-1">
                                        Batas konfirmasi:{' '}
                                        {new Date(selectedBooking.tawaran_kadaluarsa_pada).toLocaleString('id-ID')}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Note from applicant */}
                        {selectedBooking.catatan && (
                            <div>
                                <span className="text-xs text-slate-400 font-medium block mb-1">Catatan Tambahan Calon Penghuni:</span>
                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm text-slate-700 italic">
                                    "{selectedBooking.catatan}"
                                </div>
                            </div>
                        )}

                        {/* Rejection reason if rejected */}
                        {selectedBooking.alasan_penolakan && (
                            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl">
                                <span className="text-xs font-bold text-rose-700 uppercase tracking-wider block mb-1">
                                    Alasan Penolakan:
                                </span>
                                <p className="text-sm text-rose-800">{selectedBooking.alasan_penolakan}</p>
                            </div>
                        )}

                        {/* Processed By audit */}
                        {selectedBooking.diproses_oleh && (
                            <div className="text-xs text-slate-400 border-t border-slate-100 pt-3 flex justify-between">
                                <span>Diproses oleh: <strong>{selectedBooking.diproses_oleh?.name || 'Admin'}</strong></span>
                                <span>Waktu: <strong>{new Date(selectedBooking.diproses_pada).toLocaleString('id-ID')}</strong></span>
                            </div>
                        )}
                    </div>
                </Modal>
            )}

            {/* ACCEPT CONFIRM DIALOG */}
            <ConfirmDialog
                isOpen={acceptDialogOpen}
                onClose={() => setAcceptDialogOpen(false)}
                onConfirm={handleConfirmAccept}
                title="Konfirmasi Terima Booking"
                message={`Apakah Anda yakin ingin menerima permohonan booking untuk Kamar ${selectedBooking?.kamar?.nomor_kamar}? Status kamar akan langsung diubah menjadi 'dibooking' dan notifikasi konfirmasi akan dikirimkan ke calon penghuni.`}
                confirmText="Ya, Terima & Konfirmasi"
                cancelText="Batal"
                type="primary"
                loading={submittingAccept}
            />

            {/* REJECT MODAL WITH MIN 10 CHARS VALIDATION */}
            <Modal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                title="Tolak Permohonan Booking"
                maxWidth="max-w-md"
                footer={
                    <div className="flex items-center justify-end gap-2 w-full">
                        <button
                            type="button"
                            onClick={() => setRejectModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleConfirmReject}
                            disabled={submittingReject || rejectReason.trim().length < 10}
                            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition shadow-sm"
                        >
                            {submittingReject ? 'Menyimpan...' : 'Kirim Penolakan'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">
                        Harap masukkan alasan penolakan yang jelas. Alasan ini akan tercatat dalam sistem dan dikirimkan langsung
                        melalui notifikasi ke akun calon penghuni.
                    </p>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Alasan Penolakan <span className="text-rose-500">* (minimal 10 karakter)</span>
                        </label>
                        <textarea
                            rows={4}
                            value={rejectReason}
                            onChange={(e) => {
                                setRejectReason(e.target.value);
                                if (e.target.value.trim().length >= 10) setRejectError('');
                            }}
                            placeholder="Contoh: Mohon maaf, kamar ini baru saja terisi penuh oleh penghuni lain / identitas tidak valid..."
                            className={`w-full px-3 py-2 text-sm rounded-xl border transition focus:outline-none focus:ring-2 ${
                                rejectError ? 'border-rose-400 focus:ring-rose-200' : 'border-slate-300 focus:ring-blue-100 focus:border-[#263b53]'
                            }`}
                        />
                        <div className="flex justify-between items-center mt-1 text-xs">
                            <span className={rejectReason.trim().length < 10 ? 'text-rose-500 font-medium' : 'text-slate-400'}>
                                {rejectReason.trim().length} / 10 karakter minimum
                            </span>
                            {rejectError && <span className="text-rose-600 font-medium">{rejectError}</span>}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* ALTERNATIVE OFFER MODAL (HAVERSINE NEAREST BRANCHES) */}
            <Modal
                isOpen={altModalOpen}
                onClose={() => setAltModalOpen(false)}
                title="Tawarkan Cabang Alternatif (Kost Penuh)"
                maxWidth="max-w-2xl"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <button
                            type="button"
                            onClick={() => setAltModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmitAlternative}
                            disabled={!selectedAltRoom || submittingAlt}
                            className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-sm transition"
                        >
                            {submittingAlt ? 'Mengirim Tawaran...' : 'Tawarkan ke Calon Penghuni'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-4">
                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl text-xs text-purple-800 leading-relaxed">
                        Sistem secara otomatis menghitung jarak menggunakan <strong>Rumus Haversine</strong> dan
                        menampilkan cabang terdekat yang memiliki kamar kosong. Calon penghuni memiliki waktu 24 jam untuk
                        menerima atau menolak tawaran ini.
                    </div>

                    {altLoading ? (
                        <div className="py-12 text-center text-slate-500 text-sm">
                            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            Mencari cabang terdekat dengan kamar kosong...
                        </div>
                    ) : altData.alternatives?.length === 0 ? (
                        <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-200">
                            <p className="text-sm font-semibold text-slate-700">Tidak ada cabang lain yang memiliki kamar kosong.</p>
                            <p className="text-xs text-slate-500 mt-1">Anda dapat langsung menolak permohonan dengan menyertakan alasan.</p>
                        </div>
                    ) : (
                        <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                            {altData.alternatives?.map((cabang) => (
                                <div
                                    key={cabang.cabang_id}
                                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-purple-300 transition-all shadow-sm"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4 className="font-semibold text-slate-800 text-sm">{cabang.nama_cabang}</h4>
                                            <p className="text-xs text-slate-500 mt-0.5">{cabang.alamat}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                                                {cabang.jarak_km} km dari sini
                                            </span>
                                            <div className="text-[11px] text-slate-500 mt-1">
                                                {cabang.kamar_kosong_count} kamar kosong
                                            </div>
                                        </div>
                                    </div>

                                    {/* Select Room */}
                                    <div className="mt-3 pt-3 border-t border-slate-100">
                                        <label className="block text-xs font-medium text-slate-600 mb-1">
                                            Pilih Kamar di Cabang Ini:
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {cabang.rooms?.map((rm) => {
                                                const isSelected = selectedAltRoom === rm.id;
                                                return (
                                                    <button
                                                        type="button"
                                                        key={rm.id}
                                                        onClick={() => setSelectedAltRoom(rm.id)}
                                                        className={`p-2.5 text-left rounded-lg text-xs transition border ${
                                                            isSelected
                                                                ? 'border-purple-600 bg-purple-50 text-purple-900 font-semibold ring-1 ring-purple-600'
                                                                : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                                                        }`}
                                                    >
                                                        <div>Kamar {rm.nomor_kamar} (Lt. {rm.lantai})</div>
                                                        <div className="text-[11px] text-slate-500 font-normal">
                                                            Rp {Number(rm.harga_bulanan).toLocaleString('id-ID')}/bln • {rm.gedung_nama}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Modal>

            {/* VERIFY PAYMENT PROOF MODAL */}
            {selectedBooking && (
                <Modal
                    isOpen={verifyModalOpen}
                    onClose={() => setVerifyModalOpen(false)}
                    title={`Verifikasi Bukti Pembayaran Booking #${selectedBooking.id}`}
                    maxWidth="max-w-xl"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={() => setVerifyModalOpen(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Tutup
                            </button>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setRejectProofReason('');
                                        setRejectProofModalOpen(true);
                                    }}
                                    className="px-4 py-2 text-sm font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition"
                                >
                                    Tolak Bukti
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleVerifyPayment(selectedBooking.id)}
                                    disabled={submittingVerify}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition flex items-center gap-1.5"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    {submittingVerify ? 'Memproses...' : 'Verifikasi & Tandai Lunas'}
                                </button>
                            </div>
                        </div>
                    }
                >
                    {(() => {
                        const payment = Array.isArray(selectedBooking.pembayaran_booking)
                            ? selectedBooking.pembayaran_booking[0]
                            : selectedBooking.pembayaran_booking;
                        const buktiUrl = payment?.bukti_bayar || payment?.bukti_pembayaran;

                        return (
                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Calon Penghuni:</span>
                                        <strong className="text-slate-800">{selectedBooking.user?.name || selectedBooking.user?.nama}</strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Kamar:</span>
                                        <strong className="text-slate-800">
                                            Kamar {selectedBooking.kamar?.nomor_kamar} ({selectedBooking.kamar?.gedung?.cabang?.nama_cabang})
                                        </strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Nominal Tagihan:</span>
                                        <strong className="text-[#1E5FC9]">
                                            Rp {Number((payment?.nominal || selectedBooking.rincian_biaya?.total_bulan_pertama || 0) + (payment?.kode_unik || 0)).toLocaleString('id-ID')}
                                        </strong>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Metode Pembayaran:</span>
                                        <strong className="capitalize">{payment?.metode || payment?.metode_pembayaran || 'Transfer QRIS'}</strong>
                                    </div>
                                </div>

                                <div>
                                    <span className="text-xs font-bold text-slate-700 block mb-2">
                                        Foto Bukti Transfer yang Diunggah:
                                    </span>
                                    {buktiUrl ? (
                                        <div className="text-center space-y-2">
                                            <button
                                                type="button"
                                                onClick={() => setPreviewImageModalUrl(resolveStorageUrl(buktiUrl))}
                                                className="inline-block border-2 border-slate-200 rounded-2xl overflow-hidden hover:border-[#1E5FC9] transition shadow-md group relative cursor-pointer"
                                                title="Klik untuk membuka ukuran penuh"
                                            >
                                                <img
                                                    src={resolveStorageUrl(buktiUrl)}
                                                    alt="Bukti Transfer"
                                                    className="max-h-80 w-auto object-contain mx-auto group-hover:scale-102 transition duration-150"
                                                />
                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition">
                                                    Klik untuk Memperbesar 🔍
                                                </div>
                                            </button>
                                            <div className="flex items-center justify-center gap-3 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => setPreviewImageModalUrl(resolveStorageUrl(buktiUrl))}
                                                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1E5FC9] font-bold hover:bg-blue-100 transition"
                                                >
                                                    🔍 Perbesar Foto
                                                </button>
                                                <a
                                                    href={resolveStorageUrl(buktiUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 font-semibold hover:bg-slate-200 transition"
                                                >
                                                    Buka di Tab Baru ↗
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 rounded-2xl text-xs">
                                            Tidak ada foto bukti transfer yang diunggah.
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })()}
                </Modal>
            )}

            {/* REJECT PROOF MODAL */}
            <Modal
                isOpen={rejectProofModalOpen}
                onClose={() => setRejectProofModalOpen(false)}
                title="Tolak Bukti Transfer Pembayaran"
                maxWidth="max-w-md"
                footer={
                    <div className="flex items-center justify-between w-full">
                        <button
                            type="button"
                            onClick={() => setRejectProofModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleRejectProof}
                            disabled={submittingRejectProof || !rejectProofReason.trim()}
                            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition"
                        >
                            {submittingRejectProof ? 'Memproses...' : 'Tolak Bukti & Minta Upload Ulang'}
                        </button>
                    </div>
                }
            >
                <div className="space-y-3">
                    <p className="text-xs text-slate-600">
                        Harap berikan alasan penolakan bukti transfer ini. Calon penghuni akan menerima notifikasi dan diminta mengunggah ulang bukti transfer yang valid.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Alasan Penolakan Bukti *
                        </label>
                        <textarea
                            rows={3}
                            value={rejectProofReason}
                            onChange={(e) => setRejectProofReason(e.target.value)}
                            placeholder="Contoh: Nominal transfer kurang dari Rp 750.342 / Bukti transfer buram tidak terbaca..."
                            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                            required
                        />
                    </div>
                </div>
            </Modal>

            {/* CHECK-IN AWAL MODAL */}
            {checkinTarget && (
                <Modal
                    isOpen={checkinAwalModalOpen}
                    onClose={() => setCheckinAwalModalOpen(false)}
                    title={`Check-In Sekarang / Lebih Awal — ${checkinTarget.user?.name || checkinTarget.user?.nama || 'Calon Penghuni'}`}
                    maxWidth="max-w-md"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setCheckinAwalModalOpen(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmCheckinAwal}
                                disabled={submittingCheckinAwal || !checkinTanggal}
                                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                </svg>
                                {submittingCheckinAwal ? 'Memproses...' : 'Konfirmasi Check-In Sekarang'}
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                            💡 Calon penghuni dapat melakukan <strong>check-in lebih awal</strong> dari jadwal rencana semula. Kamar <strong>{checkinTarget.kamar?.nomor_kamar}</strong> ({checkinTarget.kamar?.gedung?.nama_gedung}) akan langsung diaktifkan sebagai <strong>Terisi</strong> dan akun penghuni menjadi <strong>Aktif</strong>.
                        </div>

                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Unit Kamar:</span>
                                <span className="font-semibold text-slate-800">Kamar {checkinTarget.kamar?.nomor_kamar} (Lt. {checkinTarget.kamar?.lantai})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Gedung / Cabang:</span>
                                <span className="font-semibold text-slate-800">{checkinTarget.kamar?.gedung?.nama_gedung} ({checkinTarget.kamar?.gedung?.cabang?.nama_cabang})</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Rencana Check-In Semula:</span>
                                <span className="font-medium text-slate-700">
                                    {checkinTarget.rencana_checkin ? new Date(checkinTarget.rencana_checkin).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Tanggal Check-In Aktual / Hari Kedatangan *
                            </label>
                            <input
                                type="date"
                                required
                                value={checkinTanggal}
                                onChange={(e) => setCheckinTanggal(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-200 focus:border-emerald-600"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                💡 Anda bisa memilih tanggal hari ini atau tanggal lebih awal jika penghuni sudah mulai menempati kamar.
                            </p>
                        </div>
                    </div>
                </Modal>
            )}

            {/* IMAGE PREVIEW LIGHTBOX MODAL */}
            {previewImageModalUrl && (
                <div
                    className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
                    onClick={() => setPreviewImageModalUrl(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-3xl w-full p-4 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-150"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <span>Bukti Transfer Pembayaran</span>
                            </h4>
                            <div className="flex items-center gap-2">
                                <a
                                    href={previewImageModalUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg bg-blue-50 text-[#1E5FC9] hover:bg-blue-100 text-xs font-semibold flex items-center gap-1"
                                >
                                    Buka di Tab Baru ↗
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setPreviewImageModalUrl(null)}
                                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-center bg-slate-900/5 rounded-2xl overflow-hidden p-2">
                            <img
                                src={previewImageModalUrl}
                                alt="Bukti Transfer Penuh"
                                className="max-h-[75vh] w-auto max-w-full object-contain rounded-xl shadow-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
