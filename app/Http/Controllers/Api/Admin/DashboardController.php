<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\Kamar;
use App\Models\Komplain;
use App\Models\Pembayaran;
use App\Models\Penghuni;
use App\Services\BranchContext;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private const BULAN_FULL = [
        1 => 'Jan', 2 => 'Feb', 3 => 'Mar', 4 => 'Apr',
        5 => 'Mei', 6 => 'Jun', 7 => 'Jul', 8 => 'Agu',
        9 => 'Sep', 10 => 'Okt', 11 => 'Nov', 12 => 'Des',
    ];

    public function index(Request $request): JsonResponse
    {
        $now = Carbon::now();
        $periodeBulan = (int) $request->input('bulan', $now->month);
        $periodeTahun = (int) $request->input('tahun', $now->year);

        $branchId = BranchContext::getEffectiveBranchId($request);

        // Kamar query scoped by branch
        $kamarQuery = Kamar::query();
        if ($branchId) {
            $kamarQuery->whereHas('gedung', function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId);
            });
        }

        $totalKamar = (clone $kamarQuery)->count();
        $kamarKosong = (clone $kamarQuery)->where('status', 'kosong')->count();
        $kamarTerisi = (clone $kamarQuery)->where('status', 'terisi')->count();

        // Penghuni query scoped by branch
        $penghuniQuery = Penghuni::where('status', 'aktif');
        if ($branchId) {
            $penghuniQuery->whereHas('kamar.gedung', function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId);
            });
        }

        $penghuniAktif = (clone $penghuniQuery)->count();
        $persenKapasitas = $totalKamar > 0 ? (int) round(($penghuniAktif / $totalKamar) * 100) : 0;

        $penghuniAvatars = (clone $penghuniQuery)
            ->with('user:id,nama')
            ->take(4)
            ->get()
            ->map(function ($p) {
                $nama = $p->user->nama ?? '';
                $words = explode(' ', trim($nama));
                $initial = '';
                foreach ($words as $w) {
                    if ($w !== '') {
                        $initial .= strtoupper(mb_substr($w, 0, 1));
                    }
                    if (mb_strlen($initial) >= 2) {
                        break;
                    }
                }

                return ['initial' => $initial ?: 'P', 'nama' => $nama];
            });

        // Pemasukan bulan ini
        $pembayaranQuery = Pembayaran::query();
        if ($branchId) {
            $pembayaranQuery->whereHas('penghuni.kamar.gedung', function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId);
            });
        }

        $pemasukanBulanIni = (clone $pembayaranQuery)
            ->where('status', 'lunas')
            ->where('periode_bulan', $periodeBulan)
            ->where('periode_tahun', $periodeTahun)
            ->sum('jumlah_tagihan');

        // Pemasukan bulan lalu
        $prevMonth = $periodeBulan === 1 ? 12 : $periodeBulan - 1;
        $prevYear = $periodeBulan === 1 ? $periodeTahun - 1 : $periodeTahun;

        $pemasukanBulanLalu = (clone $pembayaranQuery)
            ->where('status', 'lunas')
            ->where('periode_bulan', $prevMonth)
            ->where('periode_tahun', $prevYear)
            ->sum('jumlah_tagihan');

        if ($pemasukanBulanLalu > 0) {
            $selisih = (($pemasukanBulanIni - $pemasukanBulanLalu) / $pemasukanBulanLalu) * 100;
            $persenPerubahan = ($selisih >= 0 ? '+' : '').round($selisih).'%';
        } else {
            $persenPerubahan = $pemasukanBulanIni > 0 ? '+100%' : '0%';
        }

        // Komplain baru
        $komplainQuery = Komplain::query();
        if ($branchId) {
            $komplainQuery->whereHas('penghuni.kamar.gedung', function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId);
            });
        }
        $komplainBaru = (clone $komplainQuery)->where('status', 'baru')->count();

        // Booking requests count
        $bookingQuery = Booking::query();
        if ($branchId) {
            $bookingQuery->whereHas('kamar.gedung', function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId);
            });
        }
        $bookingBaruCount = (clone $bookingQuery)
            ->whereIn('status', ['menunggu_pembayaran', 'menunggu_persetujuan'])
            ->count();

        // Occupancy calculation
        $persenKamarTerisi = $totalKamar > 0 ? (int) round(($kamarTerisi / $totalKamar) * 100) : 0;

        $totalTagihanBulanIni = (clone $pembayaranQuery)
            ->where('periode_bulan', $periodeBulan)
            ->where('periode_tahun', $periodeTahun)
            ->count();

        $tagihanLunasBulanIni = (clone $pembayaranQuery)
            ->where('status', 'lunas')
            ->where('periode_bulan', $periodeBulan)
            ->where('periode_tahun', $periodeTahun)
            ->count();

        $persenBayarLunas = $totalTagihanBulanIni > 0 ? (int) round(($tagihanLunasBulanIni / $totalTagihanBulanIni) * 100) : 0;

        // Tabel Pembayaran Terbaru (6 data terbaru)
        $pembayaranTerbaru = (clone $pembayaranQuery)
            ->with([
                'penghuni.user:id,nama',
                'penghuni.kamar.gedung:id,nama_gedung,cabang_id',
                'penghuni.kamar:id,gedung_id,nomor_kamar,lantai',
            ])
            ->orderBy('id', 'desc')
            ->take(6)
            ->get()
            ->map(function ($p) {
                $nama = $p->penghuni->user->nama ?? 'Tidak Diketahui';
                $words = explode(' ', trim($nama));
                $initial = '';
                foreach ($words as $w) {
                    if ($w !== '') {
                        $initial .= strtoupper(mb_substr($w, 0, 1));
                    }
                    if (mb_strlen($initial) >= 2) {
                        break;
                    }
                }

                $kamar = $p->penghuni->kamar ?? null;
                $kamarInfo = $kamar
                    ? "Kamar {$kamar->nomor_kamar} (Lt. {$kamar->lantai})"
                    : '-';

                $jatuhTempo = $p->tanggal_jatuh_tempo
                    ? Carbon::parse($p->tanggal_jatuh_tempo)->format('d M Y')
                    : '-';

                return [
                    'id' => $p->id,
                    'penghuni_nama' => $nama,
                    'penghuni_initial' => $initial ?: 'P',
                    'kamar_info' => $kamarInfo,
                    'periode' => (self::BULAN_FULL[$p->periode_bulan] ?? $p->periode_bulan)." {$p->periode_tahun}",
                    'jumlah_tagihan' => (float) $p->jumlah_tagihan,
                    'jumlah_tagihan_format' => 'Rp '.number_format($p->jumlah_tagihan, 0, ',', '.'),
                    'tanggal_jatuh_tempo' => $jatuhTempo,
                    'status' => $p->status,
                    'bukti_bayar' => $p->bukti_bayar,
                ];
            });

        // Tabel Komplain Terbaru (5 data terbaru)
        $komplainTerbaru = (clone $komplainQuery)
            ->with([
                'penghuni.user:id,nama',
                'penghuni.kamar:id,nomor_kamar',
            ])
            ->orderBy('id', 'desc')
            ->take(5)
            ->get()
            ->map(function ($k) {
                $nama = $k->penghuni->user->nama ?? 'Tidak Diketahui';
                $nomorKamar = $k->penghuni->kamar->nomor_kamar ?? '-';

                return [
                    'id' => $k->id,
                    'penghuni_nama' => $nama,
                    'kamar_info' => "Kamar {$nomorKamar}",
                    'kategori' => $k->kategori ?? 'Umum',
                    'isi' => $k->isi,
                    'status' => $k->status,
                    'created_at' => $k->created_at ? Carbon::parse($k->created_at)->diffForHumans() : '-',
                ];
            });

        // Permohonan Booking Terbaru
        $bookingTerbaru = (clone $bookingQuery)
            ->with([
                'user:id,nama,email,no_hp',
                'kamar.gedung.cabang:id,nama_cabang,alamat',
                'kamar:id,gedung_id,nomor_kamar,lantai,harga_bulanan,status',
                'kamarAlternatif.gedung.cabang:id,nama_cabang',
                'pembayaranBooking',
            ])
            ->orderByRaw("CASE WHEN status = 'menunggu_pembayaran' THEN 1 WHEN status = 'menunggu_persetujuan' THEN 2 WHEN status = 'ditawarkan_alternatif' THEN 3 ELSE 4 END")
            ->orderBy('id', 'desc')
            ->take(5)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'branch_id' => $branchId,
                'quick_access' => [
                    'kamar_kosong' => [
                        'count' => $kamarKosong,
                        'label' => "{$kamarKosong} Kamar",
                        'subtext' => 'Siap huni',
                    ],
                    'penghuni_aktif' => [
                        'count' => $penghuniAktif,
                        'label' => "{$penghuniAktif} Orang",
                        'persen_kapasitas' => $persenKapasitas,
                        'subtext' => "{$persenKapasitas}% Kapasitas",
                        'avatars' => $penghuniAvatars,
                    ],
                    'pemasukan' => [
                        'total' => $pemasukanBulanIni,
                        'total_format' => 'Rp '.number_format($pemasukanBulanIni, 0, ',', '.'),
                        'periode_label' => 'Periode '.(self::BULAN_FULL[$periodeBulan] ?? $periodeBulan)." {$periodeTahun}",
                        'persen_perubahan' => $persenPerubahan,
                    ],
                    'komplain_baru' => [
                        'count' => $komplainBaru,
                        'label' => "{$komplainBaru} Komplain",
                        'subtext' => "{$komplainBaru} belum ditangani",
                    ],
                    'booking_baru' => [
                        'count' => $bookingBaruCount,
                        'label' => "{$bookingBaruCount} Permintaan",
                        'subtext' => 'Perlu ditinjau',
                    ],
                ],
                'occupancy' => [
                    'kamar' => [
                        'terisi' => $kamarTerisi,
                        'total' => $totalKamar,
                        'percent' => $persenKamarTerisi,
                        'label' => "{$kamarTerisi} / {$totalKamar} kamar terisi",
                    ],
                    'pembayaran' => [
                        'lunas' => $tagihanLunasBulanIni,
                        'total' => $totalTagihanBulanIni,
                        'percent' => $persenBayarLunas,
                        'label' => "{$tagihanLunasBulanIni} / {$totalTagihanBulanIni} sudah lunas",
                    ],
                ],
                'booking_terbaru' => $bookingTerbaru,
                'pembayaran_terbaru' => $pembayaranTerbaru,
                'komplain_terbaru' => $komplainTerbaru,
            ],
        ]);
    }
}
