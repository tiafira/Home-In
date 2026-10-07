<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Kamar;
use App\Models\Komplain;
use App\Models\Pembayaran;
use App\Models\Penghuni;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private const BULAN_NAMA = [
        1 => 'Okt', 2 => 'Nov', 3 => 'Des', 4 => 'Jan',
        5 => 'Feb', 6 => 'Mar', 7 => 'Apr', 8 => 'Mei',
        9 => 'Jun', 10 => 'Jul', 11 => 'Agu', 12 => 'Sep',
    ];

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

        $totalKamar = Kamar::count();
        $kamarKosong = Kamar::where('status', 'kosong')->count();
        $kamarTerisi = Kamar::where('status', 'terisi')->count();

        $penghuniAktif = Penghuni::where('status', 'aktif')->count();
        $persenKapasitas = $totalKamar > 0 ? round(($penghuniAktif / $totalKamar) * 100) : 0;

        $penghuniAvatars = Penghuni::where('status', 'aktif')
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

                return $initial ?: 'P';
            });

        $pemasukanBulanIni = (float) Pembayaran::where('status', 'lunas')
            ->where('periode_bulan', $periodeBulan)
            ->where('periode_tahun', $periodeTahun)
            ->sum('jumlah_tagihan');

        $bulanLaluDate = Carbon::createFromDate($periodeTahun, $periodeBulan, 1)->subMonth();
        $pemasukanBulanLalu = (float) Pembayaran::where('status', 'lunas')
            ->where('periode_bulan', $bulanLaluDate->month)
            ->where('periode_tahun', $bulanLaluDate->year)
            ->sum('jumlah_tagihan');

        $persenPerubahan = null;
        if ($pemasukanBulanLalu > 0) {
            $diff = (($pemasukanBulanIni - $pemasukanBulanLalu) / $pemasukanBulanLalu) * 100;
            $persenPerubahan = ($diff >= 0 ? '+' : '').number_format($diff, 1, '.', '').'%';
        } elseif ($pemasukanBulanIni > 0) {
            $persenPerubahan = '+100%';
        } else {
            $persenPerubahan = '0%';
        }

        $komplainBaru = Komplain::where('status', 'baru')->count();

        $persenKamarTerisi = $totalKamar > 0 ? round(($kamarTerisi / $totalKamar) * 100) : 0;

        $totalTagihanBulanIni = Pembayaran::where('periode_bulan', $periodeBulan)
            ->where('periode_tahun', $periodeTahun)
            ->count();

        $tagihanLunasBulanIni = Pembayaran::where('status', 'lunas')
            ->where('periode_bulan', $periodeBulan)
            ->where('periode_tahun', $periodeTahun)
            ->count();

        $persenBayarLunas = $totalTagihanBulanIni > 0 ? round(($tagihanLunasBulanIni / $totalTagihanBulanIni) * 100) : 0;

        $pembayaranTerbaru = Pembayaran::with([
            'penghuni.user:id,nama',
            'penghuni.kamar.gedung:id,nama_gedung',
        ])
            ->orderBy('id', 'asc')
            ->take(6)
            ->get()
            ->map(function ($item) {
                $userNama = $item->penghuni->user->nama ?? 'Tanpa Nama';
                $words = explode(' ', trim($userNama));
                $initial = '';
                foreach ($words as $w) {
                    if ($w !== '') {
                        $initial .= strtoupper(mb_substr($w, 0, 1));
                    }
                    if (mb_strlen($initial) >= 2) {
                        break;
                    }
                }

                $kamar = $item->penghuni->kamar ?? null;
                $kamarText = '-';
                if ($kamar) {
                    $kamarText = "Kamar {$kamar->nomor_kamar} (Lt. {$kamar->lantai})";
                }

                $periodeText = (self::BULAN_FULL[$item->periode_bulan] ?? $item->periode_bulan)." {$item->periode_tahun}";
                $jatuhTempoText = $item->tanggal_jatuh_tempo
                    ? Carbon::parse($item->tanggal_jatuh_tempo)->translatedFormat('d M Y')
                    : '-';

                return [
                    'id' => $item->id,
                    'penghuni_nama' => $userNama,
                    'penghuni_initial' => $initial ?: 'U',
                    'kamar_info' => $kamarText,
                    'periode' => $periodeText,
                    'jumlah_tagihan' => (float) $item->jumlah_tagihan,
                    'jumlah_tagihan_format' => 'Rp '.number_format($item->jumlah_tagihan, 0, ',', '.'),
                    'tanggal_jatuh_tempo' => $jatuhTempoText,
                    'status' => $item->status,
                ];
            });

        $komplainTerbaru = Komplain::with([
            'penghuni.user:id,nama',
            'penghuni.kamar:id,nomor_kamar',
        ])
            ->orderBy('id', 'asc')
            ->take(3)
            ->get()
            ->map(function ($item) {
                $userNama = $item->penghuni->user->nama ?? 'Tanpa Nama';
                $kamar = $item->penghuni->kamar ?? null;
                $kamarText = $kamar ? "Kamar {$kamar->nomor_kamar}" : '-';

                return [
                    'id' => $item->id,
                    'penghuni_nama' => $userNama,
                    'kamar_info' => $kamarText,
                    'kategori' => $item->kategori ?: 'Umum',
                    'isi' => $item->isi,
                    'status' => $item->status,
                    'created_at' => $item->created_at ? $item->created_at->diffForHumans() : null,
                ];
            });

        return response()->json([
            'status' => 'success',
            'data' => [
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
                'pembayaran_terbaru' => $pembayaranTerbaru,
                'komplain_terbaru' => $komplainTerbaru,
            ],
        ]);
    }
}
