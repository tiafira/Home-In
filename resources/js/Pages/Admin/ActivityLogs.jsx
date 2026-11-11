import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function ActivityLogs() {
    const toast = useToast();
    const { activeBranchId } = useBranch();

    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [filterAksi, setFilterAksi] = useState('');
    const [search, setSearch] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/activity-logs', {
                params: {
                    page,
                    aksi: filterAksi || undefined,
                    search: search || undefined,
                },
            });
            if (res.data?.status === 'success') {
                setLogs(res.data.data || []);
                setPagination(res.data.pagination || { current_page: 1, last_page: 1, total: 0 });
            }
        } catch (err) {
            toast.error('Gagal memuat log aktivitas.');
        } finally {
            setLoading(false);
        }
    }, [page, filterAksi, search, activeBranchId, toast]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const getAksiBadge = (aksi) => {
        if (!aksi) return <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">Umum</span>;

        if (aksi.includes('terima') || aksi.includes('konfirmasi') || aksi.includes('jadikan_penghuni')) {
            return (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {aksi.replace(/_/g, ' ')}
                </span>
            );
        }
        if (aksi.includes('tolak') || aksi.includes('hapus') || aksi.includes('batal')) {
            return (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                    {aksi.replace(/_/g, ' ')}
                </span>
            );
        }
        if (aksi.includes('warning') || aksi.includes('peringatan') || aksi.includes('nunggak')) {
            return (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    {aksi.replace(/_/g, ' ')}
                </span>
            );
        }
        return (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1E5FC9] border border-blue-200">
                {aksi.replace(/_/g, ' ')}
            </span>
        );
    };

    const columns = [
        {
            key: 'created_at',
            label: 'Waktu Aktivitas',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => (
                <div>
                    <span className="font-semibold text-[#1F2A44] block">
                        {new Date(row.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                        })}
                    </span>
                    <span className="text-[11px] text-slate-400">
                        {new Date(row.created_at).toLocaleTimeString('id-ID', {
                            hour: '2-digit',
                            minute: '2-digit',
                        })}{' '}
                        WIB
                    </span>
                </div>
            ),
        },
        {
            key: 'user',
            label: 'Admin Pelaksana',
            render: (row) => (
                <div>
                    <span className="font-bold text-[#1F2A44] block">{row.user?.name || 'Sistem Otomatis'}</span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                            {row.user?.role || 'SYSTEM'}
                        </span>
                        <span className="text-xs text-slate-400">{row.user?.email}</span>
                    </div>
                </div>
            ),
        },
        {
            key: 'cabang',
            label: 'Cabang Kost',
            className: 'whitespace-nowrap text-xs',
            render: (row) => (
                <span className="font-medium text-slate-700">
                    {row.cabang?.nama_cabang || 'Global / Semua Cabang'}
                </span>
            ),
        },
        {
            key: 'aksi',
            label: 'Aksi / Event',
            className: 'whitespace-nowrap',
            render: (row) => getAksiBadge(row.aksi),
        },
        {
            key: 'keterangan',
            label: 'Detail Keterangan',
            render: (row) => (
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {row.keterangan || '-'}
                </p>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Log Aktivitas Admin"
            subtitle="Rekam jejak audit trail seluruh tindakan admin (persetujuan booking, konfirmasi bayar, mutasi kamar, terbit SP, dll)."
        >
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        placeholder="Cari aktivitas atau nama admin..."
                        className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 w-64"
                    />

                    <select
                        value={filterAksi}
                        onChange={(e) => {
                            setFilterAksi(e.target.value);
                            setPage(1);
                        }}
                        className="px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none bg-white text-slate-700 font-medium cursor-pointer"
                    >
                        <option value="">Semua Jenis Aksi</option>
                        <option value="terima_booking">Terima Booking</option>
                        <option value="tolak_booking">Tolak Booking</option>
                        <option value="konfirmasi_pembayaran_booking">Konfirmasi Pembayaran</option>
                        <option value="jadikan_penghuni">Jadikan Penghuni</option>
                        <option value="pindah_kamar">Pindah Kamar</option>
                        <option value="perpanjang_sewa">Perpanjang Sewa</option>
                        <option value="kirim_peringatan">Surat Peringatan</option>
                        <option value="generate_tagihan_massal">Generate Tagihan Massal</option>
                        <option value="bayar_tunai_penjaga">Bayar Tunai</option>
                        <option value="update_pengaturan_cabang">Update Pengaturan Cabang</option>
                    </select>
                </div>

                <div className="text-xs text-slate-500 font-semibold">
                    Total Aktivitas: <strong className="text-[#1F2A44]">{pagination.total}</strong>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 sm:p-6 space-y-4">
                <DataTable
                    columns={columns}
                    data={logs}
                    loading={loading}
                    emptyMessage="Belum ada catatan aktivitas admin yang terekam."
                />

                {/* Pagination Controls */}
                {pagination.last_page > 1 && (
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs">
                        <span className="text-slate-500">
                            Halaman <strong>{pagination.current_page}</strong> dari <strong>{pagination.last_page}</strong>
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={pagination.current_page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                            >
                                ← Sebelumnya
                            </button>
                            <button
                                disabled={pagination.current_page >= pagination.last_page}
                                onClick={() => setPage((p) => p + 1)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                            >
                                Selanjutnya →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}

