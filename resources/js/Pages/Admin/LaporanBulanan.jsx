import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function LaporanBulanan() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [summary, setSummary] = useState({
        total_pemasukan_tahun: 0,
        total_estimasi_operasional: 0,
        total_laba_bersih: 0,
        penghuni_aktif_saat_ini: 0,
    });
    const [chartData, setChartData] = useState([]);
    const [recordedReports, setRecordedReports] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/laporan-bulanan', {
                params: { tahun: selectedYear },
            });
            if (res.data.status === 'success') {
                setSummary(res.data.summary);
                setChartData(res.data.chart_data);
                setRecordedReports(res.data.recorded_reports || []);
            }
        } catch (err) {
            toast.error('Gagal memuat laporan keuangan tahunan.');
        } finally {
            setLoading(false);
        }
    }, [selectedYear, activeBranchId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const maxMonthlyRevenue = Math.max(...chartData.map((d) => d.pemasukan), 1000000);

    const handlePrint = () => {
        window.print();
    };

    return (
        <AdminLayout
            title="Laporan Bulanan & Keuangan"
            subtitle="Ringkasan arus kas pendapatan sewa, estimasi beban operasional, dan grafik tren keuntungan kost."
        >
            {/* Top filter and actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-slate-600">Pilih Tahun:</label>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 text-sm font-semibold border border-slate-300 rounded-xl bg-white text-slate-800"
                    >
                        {[2024, 2025, 2026, 2027].map((y) => (
                            <option key={y} value={y}>
                                Tahun {y}
                            </option>
                        ))}
                    </select>
                </div>

                <button
                    type="button"
                    onClick={handlePrint}
                    className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition flex items-center gap-2 self-start sm:self-auto"
                >
                    🖨️ Cetak / Print Rekapitulasi
                </button>
            </div>

            {/* 3 Summary Financial Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Total Pemasukan Sewa ({selectedYear})
                    </span>
                    <span className="text-2xl font-extrabold text-[#263b53]">
                        Rp {Number(summary.total_pemasukan_tahun).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">Akumulasi pelunasan tagihan sewa</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Estimasi Biaya Operasional (35%)
                    </span>
                    <span className="text-2xl font-extrabold text-amber-600">
                        Rp {Number(summary.total_estimasi_operasional).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">Utilitas listrik, air, kebersihan, perawatan</span>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                        Estimasi Laba Bersih
                    </span>
                    <span className="text-2xl font-extrabold text-emerald-600">
                        Rp {Number(summary.total_laba_bersih).toLocaleString('id-ID')}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 block">Net operating income kost</span>
                </div>
            </div>

            {/* Visual Bar Chart */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Grafik Tren Pendapatan Sewa Bulanan</h3>
                        <p className="text-xs text-slate-500 mt-0.5">Visualisasi omzet kost per bulan dalam tahun {selectedYear}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-[#263b53]" /> Pemasukan
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 rounded bg-emerald-500" /> Laba Bersih
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-500">
                        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                        Menghitung rekapitulasi finansial...
                    </div>
                ) : (
                    <div className="grid grid-cols-12 gap-2 sm:gap-3 items-end h-64 pt-6 pb-2 border-b border-slate-200">
                        {chartData.map((item) => {
                            const incomePercent = Math.max(Math.round((item.pemasukan / maxMonthlyRevenue) * 100), 4);
                            const profitPercent = Math.max(Math.round((item.laba_bersih / maxMonthlyRevenue) * 100), 2);

                            return (
                                <div key={item.bulan_angka} className="flex flex-col items-center h-full justify-end group">
                                    <div className="w-full flex items-end justify-center gap-1 h-full relative">
                                        {/* Tooltip on hover */}
                                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none whitespace-nowrap z-10 shadow-lg">
                                            {item.bulan_nama}: Rp {Number(item.pemasukan).toLocaleString('id-ID')}
                                        </div>

                                        {/* Income Bar */}
                                        <div
                                            style={{ height: `${incomePercent}%` }}
                                            className="w-1/2 bg-[#263b53] rounded-t-md hover:bg-[#1b2c3f] transition-all cursor-pointer"
                                        />
                                        {/* Profit Bar */}
                                        <div
                                            style={{ height: `${profitPercent}%` }}
                                            className="w-1/2 bg-emerald-500 rounded-t-md hover:bg-emerald-600 transition-all cursor-pointer"
                                        />
                                    </div>
                                    <span className="text-[11px] font-semibold text-slate-600 mt-2 block">
                                        {item.bulan_nama}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Monthly Breakdown Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Rincian Finansial Bulanan</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="border-b border-slate-200 text-slate-500 font-semibold uppercase">
                                <th className="pb-3">Bulan</th>
                                <th className="pb-3 text-right">Pemasukan Sewa</th>
                                <th className="pb-3 text-right">Estimasi Beban Operasional</th>
                                <th className="pb-3 text-right">Estimasi Laba Bersih</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {chartData.map((row) => (
                                <tr key={row.bulan_angka} className="hover:bg-slate-50/70 transition">
                                    <td className="py-3 font-semibold text-slate-800">{row.bulan_nama} {selectedYear}</td>
                                    <td className="py-3 text-right font-medium text-slate-800">
                                        Rp {Number(row.pemasukan).toLocaleString('id-ID')}
                                    </td>
                                    <td className="py-3 text-right text-amber-700">
                                        Rp {Number(row.operasional).toLocaleString('id-ID')}
                                    </td>
                                    <td className="py-3 text-right font-bold text-emerald-600">
                                        Rp {Number(row.laba_bersih).toLocaleString('id-ID')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
}
