import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function ReservasiFasilitas() {
    const { toast } = useToast();

    const [reservasiList, setReservasiList] = useState([]);
    const [counts, setCounts] = useState({ all: 0, menunggu: 0, disetujui: 0, ditolak: 0, selesai: 0 });
    const [fasilitasList, setFasilitasList] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedFasilitas, setSelectedFasilitas] = useState('');
    const [selectedTanggal, setSelectedTanggal] = useState('');

    // Modal Create / Form
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        fasilitas_id: '',
        penghuni_id: '',
        tanggal: new Date().toISOString().split('T')[0],
        jam_mulai: '09:00',
        jam_selesai: '10:00',
        jumlah_orang: 1,
        keperluan: '',
        catatan_admin: '',
        status: 'disetujui',
    });
    const [submitting, setSubmitting] = useState(false);

    // Modal Reject Note
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [targetReject, setTargetReject] = useState(null);
    const [alasanPenolakan, setAlasanPenolakan] = useState('');
    const [submittingReject, setSubmittingReject] = useState(false);

    // Confirm Approve
    const [targetApprove, setTargetApprove] = useState(null);
    const [submittingApprove, setSubmittingApprove] = useState(false);

    // Confirm Delete
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [targetDelete, setTargetDelete] = useState(null);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const fetchReservasi = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/reservasi-fasilitas', {
                params: {
                    status: statusFilter,
                    fasilitas_id: selectedFasilitas || undefined,
                    tanggal: selectedTanggal || undefined,
                },
            });
            if (res.data?.status === 'success') {
                setReservasiList(res.data.data || []);
                if (res.data.counts) {
                    setCounts(res.data.counts);
                }
                if (res.data.fasilitas_list) {
                    setFasilitasList(res.data.fasilitas_list);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat jadwal reservasi fasilitas.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, selectedFasilitas, selectedTanggal, toast]);

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
        fetchReservasi();
        fetchTenants();
    }, [fetchReservasi, fetchTenants]);

    const handleOpenAdd = () => {
        const today = new Date().toISOString().split('T')[0];
        setForm({
            fasilitas_id: fasilitasList.length > 0 ? String(fasilitasList[0].id) : '',
            penghuni_id: tenants.length > 0 ? String(tenants[0].id) : '',
            tanggal: today,
            jam_mulai: '09:00',
            jam_selesai: '10:00',
            jumlah_orang: 1,
            keperluan: '',
            catatan_admin: '',
            status: 'disetujui',
        });
        setModalOpen(true);
    };

    const handleSubmitAdd = async (e) => {
        e.preventDefault();
        if (!form.fasilitas_id) {
            toast.error('Pilih fasilitas yang akan direservasi.');
            return;
        }
        if (!form.tanggal || !form.jam_mulai || !form.jam_selesai) {
            toast.error('Lengkapi tanggal, jam mulai, dan jam selesai.');
            return;
        }
        if (form.jam_selesai <= form.jam_mulai) {
            toast.error('Jam selesai harus lebih akhir daripada jam mulai.');
            return;
        }

        setSubmitting(true);
        try {
            const res = await api.post('/admin/reservasi-fasilitas', form);
            if (res.data?.status === 'success') {
                toast.success('Jadwal reservasi fasilitas berhasil dibuat.');
                setModalOpen(false);
                fetchReservasi();
            } else {
                toast.error(res.data?.message || 'Gagal menyimpan reservasi.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal menyimpan reservasi fasilitas. Periksa kemungkinan tabrakan jadwal.';
            toast.error(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async () => {
        if (!targetApprove) return;
        setSubmittingApprove(true);
        try {
            const res = await api.post(`/admin/reservasi-fasilitas/${targetApprove.id}/approve`);
            if (res.data?.status === 'success') {
                toast.success('Reservasi berhasil disetujui.');
                setTargetApprove(null);
                fetchReservasi();
            } else {
                toast.error(res.data?.message || 'Gagal menyetujui reservasi.');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Gagal menyetujui reservasi. Mungkin bertabrakan dengan jadwal lain.';
            toast.error(msg);
        } finally {
            setSubmittingApprove(false);
        }
    };

    const handleReject = async () => {
        if (!targetReject) return;
        setSubmittingReject(true);
        try {
            const res = await api.post(`/admin/reservasi-fasilitas/${targetReject.id}/reject`, {
                alasan_penolakan: alasanPenolakan || 'Mohon maaf jadwal fasilitas pada jam tersebut tidak tersedia.',
            });
            if (res.data?.status === 'success') {
                toast.success('Reservasi telah ditolak.');
                setRejectModalOpen(false);
                setTargetReject(null);
                setAlasanPenolakan('');
                fetchReservasi();
            }
        } catch (err) {
            toast.error('Gagal menolak reservasi.');
        } finally {
            setSubmittingReject(false);
        }
    };

    const handleDelete = async () => {
        if (!targetDelete) return;
        setSubmittingDelete(true);
        try {
            const res = await api.delete(`/admin/reservasi-fasilitas/${targetDelete.id}`);
            if (res.data?.status === 'success') {
                toast.success('Reservasi berhasil dipindahkan ke tempat sampah.');
                setDeleteModalOpen(false);
                setTargetDelete(null);
                fetchReservasi();
            }
        } catch (err) {
            toast.error('Gagal menghapus reservasi.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    const handleExportPdf = () => {
        exportToPdf({
            title: 'Laporan Jadwal Reservasi Fasilitas Bersama',
            subtitle: `Filter Status: ${statusFilter.toUpperCase()} | Total: ${reservasiList.length} Jadwal`,
            branchName: 'Home-In Kost',
            columns: [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Fasilitas', render: (r) => r.fasilitas?.nama_fasilitas || 'Fasilitas' },
                { header: 'Pemohon / Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || r.user?.nama || r.user?.name || '-' },
                { header: 'Kamar', render: (r) => (r.penghuni?.kamar?.nomor_kamar ? `Kamar ${r.penghuni.kamar.nomor_kamar}` : '-') },
                { header: 'Tanggal Pakai', accessor: 'tanggal' },
                { header: 'Waktu / Jam', render: (r) => `${r.jam_mulai?.slice(0, 5)} - ${r.jam_selesai?.slice(0, 5)}` },
                { header: 'Kapasitas', render: (r) => `${r.jumlah_orang || 1} Orang` },
                { header: 'Keperluan', accessor: 'keperluan' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ],
            data: reservasiList,
            summary: `Total Reservasi: ${reservasiList.length} | Disetujui: ${counts.disetujui} | Menunggu: ${counts.menunggu} | Selesai: ${counts.selesai}`,
        });
        toast.success('Laporan reservasi fasilitas siap dicetak / disimpan ke PDF.');
    };

    const handleExportExcel = () => {
        const headers = ['No', 'Fasilitas', 'Pemohon / Penghuni', 'Nomor Kamar', 'Tanggal Pakai', 'Jam Mulai', 'Jam Selesai', 'Jumlah Orang', 'Keperluan', 'Status', 'Catatan Admin'];
        const rows = reservasiList.map((r, i) => [
            i + 1,
            r.fasilitas?.nama_fasilitas || '-',
            r.penghuni?.user?.nama || r.penghuni?.user?.name || r.user?.nama || r.user?.name || '-',
            r.penghuni?.kamar?.nomor_kamar || '-',
            r.tanggal || '-',
            r.jam_mulai || '-',
            r.jam_selesai || '-',
            r.jumlah_orang || 1,
            r.keperluan || '-',
            (r.status || '').toUpperCase(),
            r.catatan_admin || '-',
        ]);
        exportToExcel({
            filename: `laporan-reservasi-fasilitas-${new Date().toISOString().split('T')[0]}.xls`,
            title: 'Laporan Jadwal Reservasi Fasilitas Home-In',
            headers,
            rows,
        });
        toast.success('Data reservasi fasilitas berhasil diekspor ke Excel!');
    };

    const columns = [
        {
            key: 'fasilitas',
            label: 'Fasilitas & Jadwal',
            render: (row) => (
                <div className="space-y-1">
                    <div className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        {row.fasilitas?.nama_fasilitas || 'Fasilitas Bersama'}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
                        <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>
                            {row.tanggal ? new Date(row.tanggal).toLocaleDateString('id-ID', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                            }) : '-'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                            {row.jam_mulai?.slice(0, 5)} - {row.jam_selesai?.slice(0, 5)}
                        </span>
                    </div>
                </div>
            ),
        },
        {
            key: 'pemohon',
            label: 'Pemohon / Penghuni',
            render: (row) => (
                <div className="space-y-0.5">
                    <div className="font-semibold text-slate-800 text-xs flex items-center gap-1.5">
                        {row.penghuni?.user?.name || row.penghuni?.user?.nama || row.user?.name || 'Admin / Staf'}
                        {row.penghuni?.kamar?.nomor_kamar && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                Kamar {row.penghuni.kamar.nomor_kamar}
                            </span>
                        )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                        Kapasitas: <span className="font-semibold text-slate-700">{row.jumlah_orang || 1} Orang</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'keperluan',
            label: 'Keperluan & Catatan',
            render: (row) => (
                <div className="space-y-1 max-w-xs">
                    <div className="text-xs text-slate-700 font-medium">
                        {row.keperluan || '-'}
                    </div>
                    {row.catatan_admin && (
                        <div className="text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            Catatan: {row.catatan_admin}
                        </div>
                    )}
                    {row.alasan_penolakan && (
                        <div className="text-[11px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                            Ditolak: {row.alasan_penolakan}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => {
                const map = {
                    menunggu: { label: 'Menunggu', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
                    disetujui: { label: 'Disetujui', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                    ditolak: { label: 'Ditolak', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
                    selesai: { label: 'Selesai', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
                };
                const s = map[row.status] || map.menunggu;
                return (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${s.bg}`}>
                        {s.label}
                    </span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Aksi',
            render: (row) => (
                <div className="flex items-center gap-1.5">
                    {row.status === 'menunggu' && (
                        <>
                            <button
                                type="button"
                                onClick={() => setTargetApprove(row)}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm"
                                title="Setujui reservasi fasilitas"
                            >
                                Setujui
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setTargetReject(row);
                                    setAlasanPenolakan('');
                                    setRejectModalOpen(true);
                                }}
                                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition"
                                title="Tolak reservasi"
                            >
                                Tolak
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setTargetDelete(row);
                            setDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Hapus reservasi"
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
        <AdminLayout title="Reservasi Fasilitas">
            <div className="space-y-6">
                {/* Header Title & CTA */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Reservasi Fasilitas</h1>
                        <p className="text-xs sm:text-sm text-slate-500 mt-1">
                            Kelola jadwal pemakaian fasilitas bersama (Dapur, Ruang Belajar, Aula, Gym) dan sinkronisasi dengan aplikasi Flutter penghuni.
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
                            Atur Jadwal Reservasi
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-xs font-semibold text-slate-500">Semua Jadwal</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{counts.all}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-xs font-semibold text-amber-600">Menunggu Verifikasi</div>
                        <div className="text-2xl font-bold text-amber-700 mt-1">{counts.menunggu}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-xs font-semibold text-emerald-600">Disetujui</div>
                        <div className="text-2xl font-bold text-emerald-700 mt-1">{counts.disetujui}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                        <div className="text-xs font-semibold text-slate-500">Selesai Digunakan</div>
                        <div className="text-2xl font-bold text-slate-700 mt-1">{counts.selesai}</div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                        {['all', 'menunggu', 'disetujui', 'ditolak', 'selesai'].map((st) => (
                            <button
                                key={st}
                                type="button"
                                onClick={() => setStatusFilter(st)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize whitespace-nowrap ${
                                    statusFilter === st
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                {st === 'all' ? 'Semua' : st} ({counts[st] ?? 0})
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={selectedFasilitas}
                            onChange={(e) => setSelectedFasilitas(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">Semua Fasilitas</option>
                            {fasilitasList.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.nama_fasilitas}
                                </option>
                            ))}
                        </select>

                        <input
                            type="date"
                            value={selectedTanggal}
                            onChange={(e) => setSelectedTanggal(e.target.value)}
                            className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        {(selectedFasilitas || selectedTanggal) && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedFasilitas('');
                                    setSelectedTanggal('');
                                }}
                                className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>

                {/* Table */}
                <DataTable
                    columns={columns}
                    data={reservasiList}
                    loading={loading}
                    searchable={true}
                    searchPlaceholder="Cari fasilitas, pemohon, atau keperluan..."
                    emptyMessage="Belum ada jadwal reservasi fasilitas."
                />
            </div>

            {/* Modal Tambah Reservasi */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Atur Jadwal Reservasi Fasilitas"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmitAdd} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Pilih Fasilitas <span className="text-red-500">*</span>
                        </label>
                        <select
                            required
                            value={form.fasilitas_id}
                            onChange={(e) => setForm({ ...form, fasilitas_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">-- Pilih Fasilitas --</option>
                            {fasilitasList.map((f) => (
                                <option key={f.id} value={f.id}>
                                    {f.nama_fasilitas} ({f.tipe})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Pemohon (Penghuni) <span className="text-slate-400 font-normal">(Opsional jika untuk keperluan internal)</span>
                        </label>
                        <select
                            value={form.penghuni_id}
                            onChange={(e) => setForm({ ...form, penghuni_id: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="">-- Internal / Keperluan Kost --</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.user?.name || t.user?.nama || 'Penghuni'} (Kamar {t.kamar?.nomor_kamar || '-'})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Tanggal <span className="text-red-500">*</span>
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
                                Jam Mulai <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                required
                                value={form.jam_mulai}
                                onChange={(e) => setForm({ ...form, jam_mulai: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Jam Selesai <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="time"
                                required
                                value={form.jam_selesai}
                                onChange={(e) => setForm({ ...form, jam_selesai: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Estimasi Jumlah Orang <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="50"
                                required
                                value={form.jumlah_orang}
                                onChange={(e) => setForm({ ...form, jumlah_orang: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Status Awal
                            </label>
                            <select
                                value={form.status}
                                onChange={(e) => setForm({ ...form, status: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="disetujui">Langsung Disetujui</option>
                                <option value="menunggu">Menunggu Verifikasi</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Keperluan Pemakaian <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows="2"
                            required
                            placeholder="Contoh: Belajar kelompok bersama rekan kuliah"
                            value={form.keperluan}
                            onChange={(e) => setForm({ ...form, keperluan: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        ></textarea>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Catatan Khusus Admin
                        </label>
                        <input
                            type="text"
                            placeholder="Contoh: Pastikan AC dan lampu dimatikan setelah selesai"
                            value={form.catatan_admin}
                            onChange={(e) => setForm({ ...form, catatan_admin: e.target.value })}
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
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                            {submitting ? 'Menyimpan...' : 'Simpan Jadwal'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Tolak Reservasi */}
            <Modal
                isOpen={rejectModalOpen}
                onClose={() => setRejectModalOpen(false)}
                title="Tolak Reservasi Fasilitas"
                maxWidth="max-w-md"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-600">
                        Berikan alasan penolakan agar pemohon mengetahui penyebab jadwal tidak dapat disetujui.
                    </p>
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Alasan Penolakan
                        </label>
                        <textarea
                            rows="3"
                            value={alasanPenolakan}
                            onChange={(e) => setAlasanPenolakan(e.target.value)}
                            placeholder="Contoh: Sedang dalam pemeliharaan berkala / Bertabrakan dengan kegiatan pengelola"
                            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-rose-500"
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setRejectModalOpen(false)}
                            className="px-4 py-2 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            disabled={submittingReject}
                            onClick={handleReject}
                            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                            {submittingReject ? 'Memproses...' : 'Tolak Reservasi'}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Confirm Approve */}
            <ConfirmDialog
                isOpen={!!targetApprove}
                title="Setujui Reservasi Fasilitas"
                message={`Setujui penggunaan "${targetApprove?.fasilitas?.nama_fasilitas}" untuk ${targetApprove?.penghuni?.user?.name || 'pemohon'} pada ${targetApprove?.tanggal} jam ${targetApprove?.jam_mulai?.slice(0, 5)} - ${targetApprove?.jam_selesai?.slice(0, 5)}?`}
                confirmText={submittingApprove ? 'Memproses...' : 'Setujui Reservasi'}
                cancelText="Batal"
                variant="primary"
                onConfirm={handleApprove}
                onCancel={() => setTargetApprove(null)}
            />

            {/* Confirm Delete */}
            <ConfirmDialog
                isOpen={deleteModalOpen}
                title="Hapus Reservasi"
                message="Pindahkan data reservasi ini ke Baru Saja Dihapus (Trash)? Data dapat dipulihkan kapan saja."
                confirmText={submittingDelete ? 'Menghapus...' : 'Hapus ke Trash'}
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

