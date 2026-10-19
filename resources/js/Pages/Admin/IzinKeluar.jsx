import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function IzinKeluar() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    const [statusFilter, setStatusFilter] = useState('all');
    const [izins, setIzins] = useState([]);
    const [counts, setCounts] = useState({ all: 0, menunggu: 0, disetujui: 0, ditolak: 0 });
    const [loading, setLoading] = useState(true);

    const fetchIzins = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/izin-keluar', {
                params: {
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                },
            });
            if (res.data.status === 'success') {
                setIzins(res.data.data);
                setCounts(res.data.counts);
            }
        } catch (err) {
            toast.error('Gagal memuat data izin keluar.');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, activeBranchId, toast]);

    useEffect(() => {
        fetchIzins();
    }, [fetchIzins]);

    const handleUpdateStatus = async (id, status) => {
        try {
            const res = await api.put(`/admin/izin-keluar/${id}/status`, { status });
            toast.success(res.data.message || `Izin keluar telah ${status}!`);
            fetchIzins();
        } catch (err) {
            toast.error('Gagal memproses persetujuan izin keluar.');
        }
    };

    const columns = [
        {
            key: 'tanggal',
            label: 'Tanggal Izin',
            className: 'whitespace-nowrap font-medium text-slate-800',
            render: (row) => row.tanggal,
        },
        {
            key: 'penghuni',
            label: 'Nama Penghuni',
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
            key: 'jam',
            label: 'Rencana Jam Keluar - Kembali',
            className: 'whitespace-nowrap text-xs text-slate-700',
            render: (row) => `${row.rencana_jam_keluar} s/d ${row.rencana_jam_kembali}`,
        },
        {
            key: 'alasan',
            label: 'Alasan Keluar',
            render: (row) => <span className="text-xs text-slate-600 line-clamp-2">{row.alasan}</span>,
        },
        {
            key: 'status',
            label: 'Status Persetujuan',
            className: 'whitespace-nowrap',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    {row.status === 'menunggu' ? (
                        <>
                            <button
                                onClick={() => handleUpdateStatus(row.id, 'ditolak')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                            >
                                Tolak
                            </button>
                            <button
                                onClick={() => handleUpdateStatus(row.id, 'disetujui')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            >
                                Setujui
                            </button>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400">Tercatat</span>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Izin Keluar"
            subtitle="Persetujuan dan pencatatan jam malam serta izin keluar penghuni kost."
        >
            {/* Filter chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6">
                {[
                    { key: 'all', label: 'Semua Izin', count: counts.all },
                    { key: 'menunggu', label: 'Menunggu Persetujuan', count: counts.menunggu },
                    { key: 'disetujui', label: 'Disetujui', count: counts.disetujui },
                    { key: 'ditolak', label: 'Ditolak', count: counts.ditolak },
                ].map((chip) => {
                    const isSelected = statusFilter === chip.key;
                    return (
                        <button
                            key={chip.key}
                            onClick={() => setStatusFilter(chip.key)}
                            className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                                isSelected
                                    ? 'bg-[#263b53] text-white shadow-sm'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span>{chip.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${isSelected ? 'bg-white/20' : 'bg-slate-100'}`}>
                                {chip.count}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <DataTable
                    columns={columns}
                    data={izins}
                    loading={loading}
                    searchPlaceholder="Cari nama penghuni, alasan..."
                    emptyTitle="Tidak ada data izin keluar"
                    emptyDescription="Belum ada catatan izin keluar pada filter ini."
                />
            </div>
        </AdminLayout>
    );
}
