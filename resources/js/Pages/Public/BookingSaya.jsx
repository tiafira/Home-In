import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../Layouts/PublicLayout';
import FourSquareLoader from '../../Components/UI/FourSquareLoader';
import EmptyState from '../../Components/UI/EmptyState';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function BookingSaya() {
    const { addToast } = useToast();

    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedBooking, setSelectedBooking] = useState(null);

    // Modal state for uploading payment proof
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [paymentBookingTarget, setPaymentBookingTarget] = useState(null);
    const [paymentForm, setPaymentForm] = useState({
        jumlah: '',
        metode_pembayaran: 'Transfer Bank BCA',
        bukti_pembayaran: null,
    });
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // Action state
    const [cancellingId, setCancellingId] = useState(null);
    const [respondingOffer, setRespondingOffer] = useState(false);

    const fetchMyBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/user/bookings');
            if (res.data?.status === 'success') {
                const list = res.data.data || [];
                setBookings(list);
                if (list.length > 0 && !selectedBooking) {
                    setSelectedBooking(list[0]);
                } else if (selectedBooking) {
                    const updated = list.find((b) => b.id === selectedBooking.id);
                    if (updated) setSelectedBooking(updated);
                }
            }
        } catch (err) {
            // handle error
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMyBookings();
    }, []);

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    const copyToClipboard = (text, label) => {
        navigator.clipboard.writeText(text);
        if (addToast) {
            addToast({
                title: 'Tersalin!',
                message: `${label} telah disalin ke clipboard.`,
                type: 'info',
            });
        }
    };

    // Handle Cancel Booking
    const handleCancelBooking = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin membatalkan permohonan booking ini?')) {
            return;
        }

        setCancellingId(id);
        try {
            const res = await api.post(`/user/booking/${id}/cancel`);
            if (res.data?.status === 'success') {
                if (addToast) {
                    addToast({
                        title: 'Booking Dibatalkan',
                        message: 'Permohonan booking telah dibatalkan.',
                        type: 'warning',
                    });
                }
                await fetchMyBookings();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal membatalkan booking.');
        } finally {
            setCancellingId(null);
        }
    };

    // Open Payment Modal
    const handleOpenPaymentModal = (b) => {
        setPaymentBookingTarget(b);
        const bill = Array.isArray(b.pembayaran_booking)
            ? (b.pembayaran_booking.find((p) => ['menunggu_pembayaran', 'menunggu_verifikasi'].includes(p.status)) || b.pembayaran_booking[0])
            : b.pembayaran_booking;

        const nominal = bill?.nominal
            ? (parseFloat(bill.nominal) + (parseInt(bill.kode_unik) || 0))
            : (b.rincian_biaya?.total_bulan_pertama || parseFloat(b.kamar?.harga_bulanan) || 0);

        setPaymentForm({
            jumlah: Math.round(nominal) || '',
            metode_pembayaran: b.kamar?.gedung?.cabang?.nama_bank ? `Transfer Bank ${b.kamar.gedung.cabang.nama_bank}` : 'Transfer Bank BCA',
            bukti_pembayaran: null,
        });
        setUploadError('');
        setUploadModalOpen(true);
    };

    // Submit Payment Proof
    const handleSubmitPayment = async (e) => {
        e.preventDefault();
        if (!paymentForm.bukti_pembayaran) {
            setUploadError('Silakan pilih file bukti transfer/pembayaran.');
            return;
        }

        setUploading(true);
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('jumlah', paymentForm.jumlah);
            formData.append('metode_pembayaran', paymentForm.metode_pembayaran);
            formData.append('bukti_pembayaran', paymentForm.bukti_pembayaran);

            const res = await api.post(`/user/booking/${paymentBookingTarget.id}/pay`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data?.status === 'success') {
                if (addToast) {
                    addToast({
                        title: 'Bukti Bayar Terkirim!',
                        message: 'Bukti pembayaran Anda berhasil dikirim dan sedang diverifikasi admin.',
                        type: 'success',
                    });
                }
                setUploadModalOpen(false);
                await fetchMyBookings();
            }
        } catch (err) {
            setUploadError(err.response?.data?.message || 'Gagal mengunggah bukti pembayaran.');
        } finally {
            setUploading(false);
        }
    };

    // Handle Alternative Offer Acceptance
    const handleAcceptAlternative = async (id) => {
        setRespondingOffer(true);
        try {
            const res = await api.post(`/user/booking/${id}/accept-alternative`);
            if (res.data?.status === 'success') {
                if (addToast) {
                    addToast({
                        title: 'Tawaran Diterima!',
                        message: 'Kamar alternatif disetujui. Silakan lanjutkan ke instruksi pembayaran.',
                        type: 'success',
                    });
                }
                await fetchMyBookings();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal merespon tawaran.');
        } finally {
            setRespondingOffer(false);
        }
    };

    // Handle Alternative Offer Rejection
    const handleRejectAlternative = async (id) => {
        if (!window.confirm('Apakah Anda yakin ingin menolak tawaran kamar alternatif ini?')) {
            return;
        }

        setRespondingOffer(true);
        try {
            const res = await api.post(`/user/booking/${id}/reject-alternative`);
            if (res.data?.status === 'success') {
                if (addToast) {
                    addToast({
                        title: 'Tawaran Ditolak',
                        message: 'Tawaran kamar alternatif telah ditolak.',
                        type: 'info',
                    });
                }
                await fetchMyBookings();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Gagal menolak tawaran.');
        } finally {
            setRespondingOffer(false);
        }
    };

    // Status Badges & Labels
    const statusMap = {
        menunggu_konfirmasi: {
            label: 'Menunggu Konfirmasi Admin',
            bg: 'bg-amber-50 text-amber-700 border-amber-200',
            step: 1,
        },
        menunggu_persetujuan: {
            label: 'Menunggu Persetujuan Admin',
            bg: 'bg-amber-50 text-amber-700 border-amber-200',
            step: 1,
        },
        menunggu_pembayaran: {
            label: 'Disetujui - Menunggu Pembayaran',
            bg: 'bg-blue-50 text-blue-700 border-blue-200',
            step: 2,
        },
        menunggu_verifikasi: {
            label: 'Bukti Terkirim - Menunggu Verifikasi',
            bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            step: 2,
        },
        ditawarkan_alternatif: {
            label: 'Ditawarkan Kamar Alternatif',
            bg: 'bg-purple-50 text-purple-700 border-purple-200',
            step: 2,
        },
        dikonfirmasi: {
            label: 'Booking Dikonfirmasi (Lunas)',
            bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            step: 3,
        },
        terjadwal: {
            label: 'Terjadwal (Menunggu Check-In)',
            bg: 'bg-teal-50 text-teal-700 border-teal-200',
            step: 3,
        },
        aktif: {
            label: 'Aktif Menghuni',
            bg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            step: 4,
        },
        dibatalkan: {
            label: 'Dibatalkan',
            bg: 'bg-slate-100 text-slate-600 border-slate-200',
            step: 0,
        },
        ditolak: {
            label: 'Ditolak',
            bg: 'bg-rose-50 text-rose-700 border-rose-200',
            step: 0,
        },
        selesai: {
            label: 'Selesai (Sudah Check-Out)',
            bg: 'bg-slate-100 text-slate-700 border-slate-300',
            step: 4,
        },
    };

    return (
        <PublicLayout title="Booking Saya">
            {/* Header Banner */}
            <div className="bg-[#1F2A44] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">
                            Status Pemesanan Anda
                        </span>
                        <h1 className="text-2xl sm:text-4xl font-extrabold mt-1">
                            Booking Saya
                        </h1>
                        <p className="text-xs sm:text-sm text-[#8A94A6] mt-1.5 max-w-xl">
                            Pantau proses verifikasi permohonan kamar, instruksi pembayaran resmi, dan konfirmasi jadwal check-in dari pengelola kost.
                        </p>
                    </div>

                    <Link
                        to="/kamar"
                        className="px-5 py-2.5 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-bold shadow-md shadow-blue-500/25 transition active:scale-95 self-start md:self-auto flex items-center gap-2"
                    >
                        <span>Cari Kamar Baru</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                        </svg>
                    </Link>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <FourSquareLoader size={90} label="Memuat data booking Anda..." />
                    </div>
                ) : bookings.length === 0 ? (
                    <EmptyState
                        title="Anda Belum ada Pesanan"
                        description="Anda belum memiliki permohonan booking kamar yang aktif atau riwayat pesanan sewa kost. Silakan cari dan jelajahi pilihan kamar kost kami."
                        actionLabel="Jelajahi Kamar Kost Sekarang"
                        onAction={() => { window.location.href = '/kamar'; }}
                    />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        {/* LEFT COLUMN: List of Bookings */}
                        <div className="lg:col-span-5 space-y-4">
                            <h3 className="text-sm font-extrabold text-[#1F2A44] uppercase tracking-wider mb-2">
                                Daftar Pengajuan ({bookings.length})
                            </h3>

                            {bookings.map((b) => {
                                const st = statusMap[b.status] || statusMap.menunggu_persetujuan;
                                const isSelected = selectedBooking?.id === b.id;
                                const cabang = b.kamar?.gedung?.cabang;

                                return (
                                    <div
                                        key={b.id}
                                        onClick={() => setSelectedBooking(b)}
                                        className={`p-5 rounded-3xl border-2 transition cursor-pointer bg-white ${
                                            isSelected
                                                ? 'border-[#1E5FC9] shadow-lg shadow-blue-500/10 ring-1 ring-[#1E5FC9]'
                                                : 'border-slate-100 hover:border-slate-200 shadow-sm'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-3">
                                            <div>
                                                <span className="text-[11px] text-[#8A94A6] font-semibold block">
                                                    ID Booking: #{b.id}
                                                </span>
                                                <h4 className="font-extrabold text-base text-[#1F2A44]">
                                                    Kamar {b.kamar?.nomor_kamar || '-'}
                                                </h4>
                                                <p className="text-xs text-slate-500">
                                                    {cabang?.nama_cabang} • {b.kamar?.gedung?.nama_gedung}
                                                </p>
                                            </div>

                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${st.bg}`}>
                                                {st.label}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                                            <span className="text-[#8A94A6]">
                                                Check-In: <strong>{b.rencana_checkin}</strong>
                                            </span>
                                            <span className="font-extrabold text-[#1E5FC9]">
                                                {formatRupiah(b.kamar?.harga_bulanan)}/bln
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* RIGHT COLUMN: Detail & Timeline of Selected Booking */}
                        {selectedBooking && (
                            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
                                {/* Top Header */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs text-[#8A94A6] font-semibold">
                                                Booking #{selectedBooking.id}
                                            </span>
                                            <span>•</span>
                                            <span className="text-xs text-[#8A94A6]">
                                                Dibuat: {new Date(selectedBooking.tanggal_booking).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                            </span>
                                        </div>
                                        <h2 className="text-2xl font-black text-[#1F2A44]">
                                            Kamar {selectedBooking.kamar?.nomor_kamar}
                                        </h2>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            {selectedBooking.kamar?.gedung?.cabang?.nama_cabang} • Lantai {selectedBooking.kamar?.lantai}
                                        </p>
                                    </div>

                                    <div className="text-left sm:text-right">
                                        <span className={`inline-block px-3.5 py-1.5 rounded-full text-xs font-bold border ${statusMap[selectedBooking.status]?.bg || ''}`}>
                                            {statusMap[selectedBooking.status]?.label}
                                        </span>
                                    </div>
                                </div>

                                {/* TIMELINE STATUS VISUALIZER */}
                                <div>
                                    <h4 className="text-xs font-extrabold text-[#1F2A44] uppercase tracking-wider mb-4">
                                        Perjalanan Status Booking
                                    </h4>
                                    <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                                        {/* Step 1: Pengajuan */}
                                        <div className="relative">
                                            <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px]">
                                                ✓
                                            </div>
                                            <p className="text-xs font-bold text-[#1F2A44]">Permohonan Booking Terkirim</p>
                                            <p className="text-[11px] text-[#8A94A6]">Permohonan telah dicatat di sistem pengelola.</p>
                                        </div>

                                        {/* Step 2: Persetujuan Pengelola */}
                                        <div className="relative">
                                            <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] ${
                                                ['menunggu_pembayaran', 'dikonfirmasi', 'selesai'].includes(selectedBooking.status)
                                                    ? 'bg-emerald-500 text-white'
                                                    : selectedBooking.status === 'ditolak'
                                                    ? 'bg-rose-500 text-white'
                                                    : selectedBooking.status === 'ditawarkan_alternatif'
                                                    ? 'bg-purple-500 text-white'
                                                    : 'bg-amber-400 text-white animate-pulse'
                                            }`}>
                                                {['menunggu_pembayaran', 'dikonfirmasi', 'selesai'].includes(selectedBooking.status) ? '✓' : '!'}
                                            </div>
                                            <p className="text-xs font-bold text-[#1F2A44]">Persetujuan Pengelola Kost</p>
                                            <p className="text-[11px] text-[#8A94A6]">
                                                {selectedBooking.status === 'menunggu_persetujuan'
                                                    ? 'Sedang ditinjau oleh admin kost...'
                                                    : selectedBooking.status === 'ditolak'
                                                    ? 'Permohonan ditolak oleh pengelola.'
                                                    : selectedBooking.status === 'ditawarkan_alternatif'
                                                    ? 'Pengelola menawarkan kamar alternatif karena unit awal penuh.'
                                                    : 'Permohonan diterima! Menunggu pembayaran.'}
                                            </p>
                                        </div>

                                        {/* Step 3: Pembayaran & Konfirmasi */}
                                        {(() => {
                                            const payment = Array.isArray(selectedBooking.pembayaran_booking)
                                                ? selectedBooking.pembayaran_booking[0]
                                                : selectedBooking.pembayaran_booking;
                                            const isLunas = ['dikonfirmasi', 'terjadwal', 'aktif', 'selesai'].includes(selectedBooking.status) || payment?.status === 'lunas';

                                            return (
                                                <div className="relative">
                                                    <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-[10px] ${
                                                        isLunas
                                                            ? 'bg-emerald-500 text-white'
                                                            : payment
                                                            ? 'bg-blue-500 text-white animate-pulse'
                                                            : 'bg-slate-300 text-white'
                                                    }`}>
                                                        {isLunas ? '✓' : '3'}
                                                    </div>
                                                    <p className="text-xs font-bold text-[#1F2A44]">Pembayaran & Konfirmasi</p>
                                                    <p className="text-[11px] text-[#8A94A6]">
                                                        {payment
                                                            ? `Bukti bayar diunggah (Status: ${payment.status === 'lunas' ? 'Lunas / Terverifikasi' : 'Menunggu Verifikasi Admin'})`
                                                            : 'Menunggu transfer dan upload bukti bayar.'}
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>

                                {/* CASE 1: JIKA DITOLAK (Show reason) */}
                                {selectedBooking.status === 'ditolak' && selectedBooking.alasan_penolakan && (
                                    <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-1.5">
                                        <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                            <span>Alasan Penolakan dari Pengelola:</span>
                                        </div>
                                        <p className="text-xs text-rose-800 leading-relaxed pl-6">
                                            "{selectedBooking.alasan_penolakan}"
                                        </p>
                                    </div>
                                )}

                                {/* CASE 2: JIKA DITAWARKAN KAMAR ALTERNATIF */}
                                {selectedBooking.status === 'ditawarkan_alternatif' && selectedBooking.kamar_alternatif && (
                                    <div className="p-6 rounded-3xl bg-purple-50/70 border border-purple-200 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-purple-700 uppercase tracking-wide">
                                                Tawaran Kamar Alternatif Terdekat
                                            </span>
                                            {selectedBooking.tawaran_kadaluarsa_pada && (
                                                <span className="text-[11px] font-semibold text-purple-600 bg-white px-2.5 py-1 rounded-lg border border-purple-200">
                                                    Batas: {new Date(selectedBooking.tawaran_kadaluarsa_pada).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs text-purple-900 leading-relaxed">
                                            Kamar yang Anda pilih sebelumnya saat ini penuh. Admin menawarkan kamar alternatif berikut yang masih tersedia di cabang kami:
                                        </p>

                                        <div className="p-4 bg-white rounded-2xl border border-purple-200 flex items-center justify-between gap-4">
                                            <div>
                                                <p className="text-[11px] text-purple-700 font-semibold">
                                                    {selectedBooking.kamar_alternatif.gedung?.cabang?.nama_cabang}
                                                </p>
                                                <h4 className="text-base font-extrabold text-[#1F2A44]">
                                                    Kamar {selectedBooking.kamar_alternatif.nomor_kamar}
                                                </h4>
                                                <p className="text-[11px] text-[#8A94A6]">
                                                    {selectedBooking.kamar_alternatif.gedung?.nama_gedung} • Lantai {selectedBooking.kamar_alternatif.lantai}
                                                </p>
                                            </div>

                                            <div className="text-right">
                                                <p className="text-base font-black text-[#1E5FC9]">
                                                    {formatRupiah(selectedBooking.kamar_alternatif.harga_bulanan)}
                                                    <span className="text-xs font-normal text-[#8A94A6]">/bln</span>
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 pt-2">
                                            <button
                                                onClick={() => handleAcceptAlternative(selectedBooking.id)}
                                                disabled={respondingOffer}
                                                className="flex-1 py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition active:scale-95 disabled:opacity-50"
                                            >
                                                {respondingOffer ? 'Memproses...' : 'Terima Kamar Alternatif Ini'}
                                            </button>
                                            <button
                                                onClick={() => handleRejectAlternative(selectedBooking.id)}
                                                disabled={respondingOffer}
                                                className="py-3 px-5 rounded-xl border border-purple-300 bg-white text-purple-800 font-bold text-xs hover:bg-purple-50 transition active:scale-95 disabled:opacity-50"
                                            >
                                                Tolak Tawaran
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* CASE 3: JIKA DITERIMA / MENUNGGU PEMBAYARAN */}
                                {selectedBooking.status === 'menunggu_pembayaran' && (
                                    <div className="p-6 rounded-3xl bg-blue-50/70 border border-blue-200 space-y-5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-extrabold text-[#1E5FC9] uppercase tracking-wide">
                                                Instruksi Pembayaran Sewa
                                            </span>
                                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                                                Disetujui Admin
                                            </span>
                                        </div>

                                        <p className="text-xs text-slate-700 leading-relaxed">
                                            Selamat! Permohonan booking Anda telah disetujui. Silakan transfer biaya sewa bulan pertama ke rekening resmi cabang berikut:
                                        </p>

                                        {/* Bank Account Info Card */}
                                        <div className="p-5 bg-white rounded-2xl border border-blue-200 space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-[#8A94A6]">Bank Tujuan:</span>
                                                <strong className="text-sm text-[#1F2A44]">
                                                    {selectedBooking.kamar?.gedung?.cabang?.nama_bank || 'BCA (Bank Central Asia)'}
                                                </strong>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-[#8A94A6]">Nomor Rekening:</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-base font-black text-[#1E5FC9] tracking-wider">
                                                        {selectedBooking.kamar?.gedung?.cabang?.no_rekening || '8801234567'}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => copyToClipboard(selectedBooking.kamar?.gedung?.cabang?.no_rekening || '8801234567', 'Nomor Rekening')}
                                                        className="px-2 py-1 rounded bg-[#EAF1FC] text-[#1E5FC9] hover:bg-blue-100 text-[10px] font-bold"
                                                    >
                                                        Salin
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex justify-between items-center">
                                                <span className="text-xs text-[#8A94A6]">Atas Nama Rekening:</span>
                                                <strong className="text-xs text-[#1F2A44]">
                                                    {selectedBooking.kamar?.gedung?.cabang?.nama_pemilik_rekening || 'PT Home In Properti Kost'}
                                                </strong>
                                            </div>

                                            {/* Rincian Komponen Tagihan */}
                                            {(() => {
                                                const bill = Array.isArray(selectedBooking.pembayaran_booking)
                                                    ? (selectedBooking.pembayaran_booking.find((p) => ['menunggu_pembayaran', 'menunggu_verifikasi'].includes(p.status)) || selectedBooking.pembayaran_booking[0])
                                                    : selectedBooking.pembayaran_booking;
                                                const nominalDasar = bill?.nominal
                                                    ? parseFloat(bill.nominal)
                                                    : (selectedBooking.rincian_biaya?.total_bulan_pertama || parseFloat(selectedBooking.kamar?.harga_bulanan) || 0);
                                                const kodeUnik = parseInt(bill?.kode_unik) || 0;
                                                const totalTransfer = nominalDasar + kodeUnik;

                                                return (
                                                    <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                                                        <div className="flex justify-between items-center text-slate-600">
                                                            <span>Sewa Kamar {selectedBooking.kamar?.nomor_kamar}</span>
                                                            <span className="font-semibold text-slate-800">{formatRupiah(selectedBooking.kamar?.harga_bulanan)}</span>
                                                        </div>

                                                        {/* Fasilitas Per Bulan */}
                                                        {selectedBooking.rincian_biaya?.fasilitas_per_bulan?.map((f) => (
                                                            <div key={f.id} className="flex justify-between items-center text-slate-600">
                                                                <span className="flex items-center gap-1.5">
                                                                    <span>{f.nama}</span>
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-50 text-blue-700 font-semibold">Per Bulan</span>
                                                                </span>
                                                                <span className="font-semibold text-slate-800">+{formatRupiah(f.biaya)}</span>
                                                            </div>
                                                        ))}

                                                        {/* Fasilitas Sekali Bayar (Hak Milik) */}
                                                        {selectedBooking.rincian_biaya?.fasilitas_sekali_bayar?.map((f) => (
                                                            <div key={f.id} className="flex justify-between items-center text-emerald-800">
                                                                <span className="flex items-center gap-1.5">
                                                                    <span>{f.nama}</span>
                                                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-50 text-emerald-700 font-bold">Sekali Bayar • Hak Milik</span>
                                                                </span>
                                                                <span className="font-bold text-emerald-700">+{formatRupiah(f.biaya)}</span>
                                                            </div>
                                                        ))}

                                                        {kodeUnik > 0 && (
                                                            <div className="flex justify-between items-center text-amber-700">
                                                                <span>Kode Unik Verifikasi</span>
                                                                <span className="font-semibold">+{kodeUnik}</span>
                                                            </div>
                                                        )}

                                                        <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                                                            <span className="text-xs font-bold text-[#1F2A44]">Total Harus Ditransfer:</span>
                                                            <span className="text-base font-black text-[#1E5FC9]">
                                                                {formatRupiah(totalTransfer)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Action Button: Upload Proof */}
                                        <div>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenPaymentModal(selectedBooking)}
                                                className="w-full py-3.5 rounded-2xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white font-extrabold text-xs shadow-md shadow-blue-500/25 transition active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                                </svg>
                                                <span>Upload Bukti Pembayaran</span>
                                            </button>
                                            <p className="text-[11px] text-[#8A94A6] text-center mt-2">
                                                Batas waktu pembayaran 1x24 jam sebelum booking dibatalkan otomatis oleh sistem.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* CASE 4: JIKA SUDAH UPLOAD BUKTI BAYAR */}
                                {(() => {
                                    const payment = Array.isArray(selectedBooking.pembayaran_booking)
                                        ? selectedBooking.pembayaran_booking[0]
                                        : selectedBooking.pembayaran_booking;
                                    if (!payment) return null;

                                    const buktiUrl = payment.bukti_bayar || payment.bukti_pembayaran;
                                    const nominalBayar = payment.nominal || payment.jumlah || selectedBooking.rincian_biaya?.total_bulan_pertama;
                                    const isLunas = payment.status === 'lunas' || ['dikonfirmasi', 'terjadwal', 'aktif', 'selesai'].includes(selectedBooking.status);

                                    return (
                                        <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-[#1F2A44]">Status Bukti Pembayaran:</span>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                                    isLunas
                                                        ? 'bg-emerald-100 text-emerald-800'
                                                        : payment.status === 'ditolak'
                                                        ? 'bg-rose-100 text-rose-800'
                                                        : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {isLunas
                                                        ? 'Terverifikasi (Lunas)'
                                                        : payment.status === 'ditolak'
                                                        ? 'Ditolak'
                                                        : 'Menunggu Verifikasi Admin'}
                                                </span>
                                            </div>

                                            <p className="text-xs text-[#8A94A6]">
                                                Nominal: <strong>{formatRupiah(nominalBayar)}</strong> via {payment.metode || payment.metode_pembayaran || 'Transfer'}
                                            </p>

                                            {buktiUrl && (
                                                <div className="pt-2">
                                                    <a
                                                        href={buktiUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1E5FC9] hover:underline"
                                                    >
                                                        <span>Lihat Bukti Transfer yang Diunggah</span>
                                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                        </svg>
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Cancel Button (Available while not yet confirmed) */}
                                {['menunggu_persetujuan', 'menunggu_pembayaran', 'ditawarkan_alternatif'].includes(selectedBooking.status) && (
                                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => handleCancelBooking(selectedBooking.id)}
                                            disabled={cancellingId === selectedBooking.id}
                                            className="px-4 py-2.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition disabled:opacity-50"
                                        >
                                            {cancellingId === selectedBooking.id ? 'Membatalkan...' : 'Batalkan Permohonan Booking'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* MODAL UPLOAD BUKTI PEMBAYARAN */}
            {uploadModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                            <div>
                                <h3 className="text-base font-extrabold text-[#1F2A44]">
                                    Upload Bukti Pembayaran
                                </h3>
                                <p className="text-xs text-[#8A94A6]">Booking #{paymentBookingTarget?.id}</p>
                            </div>
                            <button
                                onClick={() => setUploadModalOpen(false)}
                                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center"
                            >
                                ✕
                            </button>
                        </div>

                        {uploadError && (
                            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                                {uploadError}
                            </div>
                        )}

                        <form onSubmit={handleSubmitPayment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                    Jumlah Nominal Transfer (Rp) *
                                </label>
                                <input
                                    type="number"
                                    value={paymentForm.jumlah}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, jumlah: e.target.value })}
                                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                    Metode Pembayaran *
                                </label>
                                <select
                                    value={paymentForm.metode_pembayaran}
                                    onChange={(e) => setPaymentForm({ ...paymentForm, metode_pembayaran: e.target.value })}
                                    className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                >
                                    <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                                    <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                                    <option value="Transfer Bank BNI">Transfer Bank BNI</option>
                                    <option value="Transfer Bank BRI">Transfer Bank BRI</option>
                                    <option value="QRIS / Dompet Digital">QRIS / Dompet Digital</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                    File Bukti Transfer (Foto / Screenshot / PDF) *
                                </label>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                                    onChange={(e) => setPaymentForm({ ...paymentForm, bukti_pembayaran: e.target.files[0] })}
                                    className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#EAF1FC] file:text-[#1E5FC9] hover:file:bg-blue-100"
                                    required
                                />
                                <span className="text-[10px] text-[#8A94A6] block mt-1">Maksimal ukuran file: 3 MB</span>
                            </div>

                            <div className="pt-4 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setUploadModalOpen(false)}
                                    disabled={uploading}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="px-6 py-2.5 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-extrabold shadow-md transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    {uploading ? (
                                        <>
                                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            <span>Mengunggah...</span>
                                        </>
                                    ) : (
                                        <span>Kirim Bukti Pembayaran</span>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PublicLayout>
    );
}
