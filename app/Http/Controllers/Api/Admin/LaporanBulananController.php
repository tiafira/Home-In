<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LaporanBulanan;
use App\Models\Pembayaran;
use App\Models\Penghuni;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaporanBulananController extends Controller
{
    /**
     * Get monthly financial and operational report summary with chart data.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $tahun = (int) $request->query('tahun', date('Y'));

        // Query recorded monthly reports
        $query = LaporanBulanan::with(['cabang', 'pembuat'])
            ->where('periode_tahun', $tahun);

        if ($branchId) {
            $query->where('cabang_id', $branchId);
        }

        $recordedReports = $query->orderBy('periode_bulan')->get();

        // Dynamically compute current year monthly revenue from pembayaran table
        $revenueQuery = Pembayaran::where('periode_tahun', $tahun)
            ->where('status', 'lunas');

        if ($branchId) {
            $revenueQuery->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $monthlyRevenues = $revenueQuery->selectRaw('periode_bulan, SUM(jumlah_tagihan) as total')
            ->groupBy('periode_bulan')
            ->pluck('total', 'periode_bulan');

        $chartData = [];
        $months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

        $totalYearIncome = 0;
        for ($m = 1; $m <= 12; $m++) {
            $income = (float) ($monthlyRevenues[$m] ?? 0);
            $totalYearIncome += $income;
            // Realistic operational estimate (35% maintenance, utilities, staff)
            $operasional = $income > 0 ? round($income * 0.35, 2) : 0;
            $netProfit = $income - $operasional;

            $chartData[] = [
                'bulan_angka' => $m,
                'bulan_nama' => $months[$m - 1],
                'pemasukan' => $income,
                'operasional' => $operasional,
                'laba_bersih' => $netProfit,
            ];
        }

        $penghuniAktifCount = Penghuni::where('status', 'aktif');
        if ($branchId) {
            $penghuniAktifCount->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }
        $totalAktif = $penghuniAktifCount->count();

        return response()->json([
            'status' => 'success',
            'tahun' => $tahun,
            'summary' => [
                'total_pemasukan_tahun' => $totalYearIncome,
                'total_estimasi_operasional' => round($totalYearIncome * 0.35, 2),
                'total_laba_bersih' => round($totalYearIncome * 0.65, 2),
                'penghuni_aktif_saat_ini' => $totalAktif,
            ],
            'chart_data' => $chartData,
            'recorded_reports' => $recordedReports,
        ]);
    }

    /**
     * Store/generate monthly archive report.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cabang_id' => 'required|exists:cabang,id',
            'periode_bulan' => 'required|integer|between:1,12',
            'periode_tahun' => 'required|integer|min:2020|max:2035',
            'total_pemasukan' => 'required|numeric|min:0',
            'total_penghuni_aktif' => 'required|integer|min:0',
            'total_kamar_kosong' => 'required|integer|min:0',
            'total_komplain' => 'nullable|integer|min:0',
            'total_pelanggaran' => 'nullable|integer|min:0',
        ]);

        $validated['dibuat_oleh'] = auth()->id();

        $report = LaporanBulanan::updateOrCreate(
            [
                'cabang_id' => $validated['cabang_id'],
                'periode_bulan' => $validated['periode_bulan'],
                'periode_tahun' => $validated['periode_tahun'],
            ],
            $validated
        );

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan bulanan berhasil diarsipkan.',
            'data' => $report->load(['cabang', 'pembuat']),
        ], 201);
    }
}
