import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel } from '../../utils/exportExcel';
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

    const handleExportPdf = () => {
        exportToPdf({
            title: 'Laporan Rekapitulasi Izin Keluar Penghuni',
            subtitle: `Total: ${izins.length} Catatan Izin Keluar (Filter: ${statusFilter.toUpperCase()})`,
            branchName: 'Home-In Kost',
            columns: [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Tanggal', accessor: 'tanggal' },
                { header: 'Nama Penghuni', render: (r) => r.penghuni?.user?.nama || r.penghuni?.user?.name || '-' },
                { header: 'Kamar / Cabang', render: (r) => `Kamar ${r.penghuni?.kamar?.nomor_kamar || '-'} (${r.penghuni?.kamar?.gedung?.cabang?.nama_cabang || '-'})` },
                { header: 'Rencana Jam', render: (r) => `${r.rencana_jam_keluar || '-'} s/d ${r.rencana_jam_kembali || '-'}` },
                { header: 'Alasan Keluar', accessor: 'alasan' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ],
            data: izins,
            filename: `Laporan_Izin_Keluar_${new Date().toISOString().split('T')[0]}.pdf`,
        });
    };

    const handleExportExcel = () => {
        const headers = ['No', 'Tanggal Izin', 'Nama Penghuni', 'Kamar', 'Cabang', 'Jam Keluar', 'Jam Kembali', 'Alasan', 'Status'];
        const rows = izins.map((r, i) => [
            i + 1,
            r.tanggal || '-',
            r.penghuni?.user?.nama || r.penghuni?.user?.name || '-',
            r.penghuni?.kamar?.nomor_kamar || '-',
            r.penghuni?.kamar?.gedung?.cabang?.nama_cabang || '-',
            r.rencana_jam_keluar || '-',
            r.rencana_jam_kembali || '-',
            r.alasan || '-',
            (r.status || '').toUpperCase(),
        ]);
        exportToExcel({
            title: 'Laporan Rekapitulasi Izin Keluar Penghuni',
            headers,
            rows,
            filename: `Laporan_Izin_Keluar_${new Date().toISOString().split('T')[0]}.xlsx`,
        });
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
            action={
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportPdf}
                        disabled={izins.length === 0}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        <span>📄</span>
                        <span>Export PDF</span>
                    </button>
                    <button
                        onClick={handleExportExcel}
                        disabled={izins.length === 0}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 transition active:scale-95 cursor-pointer disabled:opacity-50"
                    >
                        <span>📊</span>
                        <span>Export Excel</span>
                    </button>
                </div>
            }
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
