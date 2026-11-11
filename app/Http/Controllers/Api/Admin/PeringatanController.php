<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notifikasi;
use App\Models\Penghuni;
use App\Models\Peringatan;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PeringatanController extends Controller
{
    /**
     * Standard violation categories grouped by severity (Ringan, Sedang, Berat).
     * Rule: Melakukan pelanggaran BERAT 3 kali akan otomatis dikeluarkan dari kost.
     */
    protected array $standardViolations = [
        // Ringan
        ['kategori' => 'Keterlambatan Jam Malam Ringan (< 30 Menit)', 'tingkat' => 'ringan', 'poin' => 5, 'tindakan_default' => 'Teguran lisan & pencatatan log'],
        ['kategori' => 'Membuat Kegaduhan / Suara Berisik di Jam Istirahat', 'tingkat' => 'ringan', 'poin' => 10, 'tindakan_default' => 'Teguran lisan & imbauan ketertiban'],
        ['kategori' => 'Menaruh Barang Pribadi Sembarangan di Area Bersama', 'tingkat' => 'ringan', 'poin' => 5, 'tindakan_default' => 'Pembersihan barang & teguran lisan'],
        ['kategori' => 'Membuang Sampah Tidak Pada Tempatnya', 'tingkat' => 'ringan', 'poin' => 5, 'tindakan_default' => 'Pembersihan area & teguran lisan'],

        // Sedang
        ['kategori' => 'Keterlambatan Jam Malam Tanpa Izin (> 1 Jam)', 'tingkat' => 'sedang', 'poin' => 15, 'tindakan_default' => 'Peringatan tertulis tingkat sedang'],
        ['kategori' => 'Membawa Tamu Menginap Tanpa Izin Pengelola', 'tingkat' => 'sedang', 'poin' => 20, 'tindakan_default' => 'Denda biaya menginap & surat peringatan'],
        ['kategori' => 'Merokok di Kamar Ber-AC / Area Bebas Rokok', 'tingkat' => 'sedang', 'poin' => 20, 'tindakan_default' => 'Denda pembersihan & peringatan tertulis'],
        ['kategori' => 'Merusak atau Mengotori Fasilitas Bersama Kost', 'tingkat' => 'sedang', 'poin' => 25, 'tindakan_default' => 'Ganti rugi biaya perbaikan fasilitas'],

        // Berat (3x = Dikeluarkan)
        ['kategori' => 'Membawa Tamu Lawan Jenis ke Dalam Kamar', 'tingkat' => 'berat', 'poin' => 50, 'tindakan_default' => 'Pelanggaran Berat (3x dikeluarkan dari kost)'],
        ['kategori' => 'Tindakan Asusila / Perbuatan Melanggar Norma', 'tingkat' => 'berat', 'poin' => 50, 'tindakan_default' => 'Pelanggaran Berat (3x dikeluarkan dari kost)'],
        ['kategori' => 'Membawa / Mengonsumsi Miras atau Narkoba di Kost', 'tingkat' => 'berat', 'poin' => 50, 'tindakan_default' => 'Pelanggaran Berat & Tindak Hukum'],
        ['kategori' => 'Tindak Kriminal / Pencurian / Kekerasan Fisik di Kost', 'tingkat' => 'berat', 'poin' => 50, 'tindakan_default' => 'Pelanggaran Berat & Dikeluarkan Langsung'],
    ];

    /**
     * Get warnings list, tenant violation point summary, and delinquent tenants.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');
        $status = $request->query('status', 'all'); // all | aktif | selesai

        $warningQuery = Peringatan::with([
            'penghuni.user',
            'penghuni.kamar.gedung',
            'pembuat',
        ]);

        if ($branchId) {
            $warningQuery->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($status && $status !== 'all') {
            $warningQuery->where('status', $status);
        }

        if ($search) {
            $warningQuery->where(function ($q) use ($search) {
                $q->where('keterangan', 'like', "%{$search}%")
                    ->orWhere('kategori_pelanggaran', 'like', "%{$search}%")
                    ->orWhere('tindakan', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"))
                    ->orWhereHas('penghuni.kamar', fn ($kq) => $kq->where('nomor_kamar', 'like', "%{$search}%"));
            });
        }

        $peringatan = $warningQuery->orderBy('created_at', 'desc')->get();

        // Calculate tenant accumulated violation points summary
        $tenantQuery = Penghuni::with(['user', 'kamar.gedung', 'peringatan' => function ($pq) {
            $pq->where('status', 'aktif');
        }]);

        if ($branchId) {
            $tenantQuery->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $tenantPointsSummary = $tenantQuery->get()->map(function ($penghuni) {
            $totalPoints = $penghuni->peringatan->sum('poin_pelanggaran');
            $ringanCount = $penghuni->peringatan->where('tingkat_pelanggaran', 'ringan')->count();
            $sedangCount = $penghuni->peringatan->where('tingkat_pelanggaran', 'sedang')->count();
            $beratCount = $penghuni->peringatan->where('tingkat_pelanggaran', 'berat')->count();

            $statusSanksi = 'normal';
            if ($beratCount >= 3) {
                $statusSanksi = 'dikeluarkan';
            } elseif ($beratCount === 2) {
                $statusSanksi = 'waspada_berat_2'; // 1x lagi dikeluarkan
            } elseif ($beratCount === 1) {
                $statusSanksi = 'peringatan_berat_1';
            }

            return [
                'penghuni_id' => $penghuni->id,
                'nama' => $penghuni->user?->name ?? 'Penghuni #'.$penghuni->id,
                'kamar' => $penghuni->kamar?->nomor_kamar ?? '-',
                'gedung' => $penghuni->kamar?->gedung?->nama_gedung ?? '-',
                'total_poin' => $totalPoints,
                'ringan_count' => $ringanCount,
                'sedang_count' => $sedangCount,
                'berat_count' => $beratCount,
                'status_sanksi' => $statusSanksi,
                'jumlah_pelanggaran' => $penghuni->peringatan->count(),
            ];
        })->sortByDesc('berat_count')->values();

        // Delinquent tenants
        $delinquentQuery = Penghuni::with(['user', 'kamar.gedung', 'pembayaran' => function ($pq) {
            $pq->whereIn('status', ['belum_bayar', 'telat'])->latest();
        }])
            ->where(function ($q) {
                $q->where('status', 'nunggak')
                    ->orWhereHas('pembayaran', fn ($pq) => $pq->whereIn('status', ['belum_bayar', 'telat']));
            });

        if ($branchId) {
            $delinquentQuery->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $penghuniNunggak = $delinquentQuery->get();

        return response()->json([
            'status' => 'success',
            'data' => $peringatan,
            'tenant_summary' => $tenantPointsSummary,
            'standard_violations' => $this->standardViolations,
            'menunggak' => $penghuniNunggak,
        ]);
    }

    /**
     * Store new violation record.
     * Rule: Pelanggaran Ringan, Sedang, Berat. Melakukan Berat 3 kali otomatis dikeluarkan.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'penghuni_id' => 'required|exists:penghuni,id',
            'jenis' => 'nullable|in:nunggak,pelanggaran',
            'kategori_pelanggaran' => 'nullable|string|max:100',
            'tingkat_pelanggaran' => 'required|in:ringan,sedang,berat',
            'poin_pelanggaran' => 'nullable|integer|min:0|max:100',
            'keterangan' => 'required|string',
            'tindakan' => 'nullable|string',
            'tanggal_kejadian' => 'required|date',
            'status' => 'nullable|in:aktif,selesai',
        ]);

        $validated['jenis'] = $validated['jenis'] ?? 'pelanggaran';
        $validated['poin_pelanggaran'] = $validated['poin_pelanggaran'] ?? match ($validated['tingkat_pelanggaran']) {
            'berat' => 50,
            'sedang' => 20,
            default => 10,
        };
        $validated['tingkat_sp'] = 'none'; // SP sistem dihapus
        $validated['dibuat_oleh'] = auth()->id();
        $validated['status'] = $validated['status'] ?? 'aktif';

        $penghuni = Penghuni::with(['user', 'kamar'])->findOrFail($validated['penghuni_id']);

        // Cek pelanggaran berat jika input adalah 'berat'
        $isExpelled = false;
        $beratCount = 0;
        if ($validated['tingkat_pelanggaran'] === 'berat') {
            $existingBerat = Peringatan::where('penghuni_id', $penghuni->id)
                ->where('tingkat_pelanggaran', 'berat')
                ->where('status', 'aktif')
                ->count();

            $beratCount = $existingBerat + 1;

            if ($beratCount >= 3) {
                $isExpelled = true;
                // Sanksi Dikeluarkan dari Kost
                $penghuni->update([
                    'status' => 'nonaktif',
                    'tanggal_keluar' => now()->toDateString(),
                ]);
                if ($penghuni->kamar) {
                    $penghuni->kamar->update(['status' => 'kosong']);
                }
            }
        }

        $peringatan = Peringatan::create($validated);

        // Notifikasi ke penghuni
        if ($penghuni && $penghuni->user_id) {
            $judulNotif = match ($validated['tingkat_pelanggaran']) {
                'berat' => $isExpelled
                    ? 'PEMBERITAHUAN RESMI: DIKELUARKAN DARI KOST (3x Pelanggaran Berat)'
                    : "PERINGATAN KERAS: Pelanggaran Berat Ke-{$beratCount} (3x Akan Dikeluarkan)",
                'sedang' => 'Catatan Pelanggaran Tingkat Sedang',
                default => 'Catatan Pelanggaran Tingkat Ringan',
            };

            $pesanNotif = $isExpelled
                ? "Anda telah melakukan pelanggaran berat sebanyak 3 kali [{$validated['kategori_pelanggaran']}]. Sesuai peraturan tata tertib kost, Anda resmi DIKELUARKAN dari kost dan kamar harus segera dikosongkan."
                : "Anda menerima catatan pelanggaran tingkat ".strtoupper($validated['tingkat_pelanggaran'])." [{$validated['kategori_pelanggaran']}]: {$validated['keterangan']}".($validated['tingkat_pelanggaran'] === 'berat' ? " (PERINGATAN: Penghuni yang melakukan 3x pelanggaran berat akan langsung dikeluarkan dari kost)." : "");

            Notifikasi::create([
                'user_id' => $penghuni->user_id,
                'judul' => $judulNotif,
                'pesan' => $pesanNotif,
                'tipe' => 'peringatan',
                'sudah_dibaca' => false,
            ]);
        }

        $message = $isExpelled
            ? "Pelanggaran Berat ke-3 berhasil dicatat. SANKSI DITERAPKAN: Penghuni {$penghuni->user?->name} RESMI DIKELUARKAN dari kost dan status kamar telah dikosongkan."
            : ($validated['tingkat_pelanggaran'] === 'berat'
                ? "Pelanggaran Berat ke-{$beratCount} berhasil dicatat. Penghuni menerima peringatan keras (1x pelanggaran berat lagi akan dikeluarkan)."
                : "Catatan pelanggaran tingkat {$validated['tingkat_pelanggaran']} berhasil dicatat.");

        return response()->json([
            'status' => 'success',
            'message' => $message,
            'is_expelled' => $isExpelled,
            'berat_count' => $beratCount,
            'data' => $peringatan->load(['penghuni.user', 'pembuat']),
        ], 201);
    }

    /**
     * Update violation record.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $peringatan = Peringatan::findOrFail($id);

        $validated = $request->validate([
            'kategori_pelanggaran' => 'nullable|string|max:100',
            'tingkat_pelanggaran' => 'required|in:ringan,sedang,berat',
            'poin_pelanggaran' => 'nullable|integer|min:0|max:100',
            'keterangan' => 'required|string',
            'tindakan' => 'nullable|string',
            'status' => 'required|in:aktif,selesai,dibatalkan',
        ]);

        $peringatan->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Catatan pelanggaran berhasil diperbarui.',
            'data' => $peringatan->load(['penghuni.user', 'pembuat']),
        ]);
    }

    /**
     * Soft delete violation record.
     */
    public function destroy(int $id): JsonResponse
    {
        $peringatan = Peringatan::findOrFail($id);
        $peringatan->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Data peringatan berhasil dipindahkan ke menu "Baru Saja Dihapus".',
        ]);
    }
}
