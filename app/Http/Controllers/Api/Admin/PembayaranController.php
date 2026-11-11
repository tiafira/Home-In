<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Notifikasi;
use App\Models\Pegawai;
use App\Models\Pembayaran;
use App\Models\PembayaranBooking;
use App\Models\Penghuni;
use App\Services\BranchContext;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PembayaranController extends Controller
{
    /**
     * Get monthly billings and payments.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $status = $request->query('status', 'all');
        $search = $request->query('search', '');
        $bulan = $request->query('bulan');
        $tahun = $request->query('tahun');

        $query = Pembayaran::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
            'konfirmator',
            'penjaga.user',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $counts = [
            'all' => (clone $query)->count(),
            'lunas' => (clone $query)->where('status', 'lunas')->count(),
            'belum_bayar' => (clone $query)->where('status', 'belum_bayar')->count(),
            'menunggu_konfirmasi' => (clone $query)->where('status', 'menunggu_konfirmasi')->count(),
            'telat' => (clone $query)->where('status', 'telat')->count(),
        ];

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }
        if ($bulan) {
            $query->where('periode_bulan', $bulan);
        }
        if ($tahun) {
            $query->where('periode_tahun', $tahun);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('penghuni.user', function ($uq) use ($search) {
                    $uq->where('nama', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%");
                })->orWhereHas('penghuni.kamar', function ($kq) use ($search) {
                    $kq->where('nomor_kamar', 'like', "%{$search}%");
                });
            });
        }

        $pembayaran = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $pembayaran,
        ]);
    }

    /**
     * Store manual payment.
     */
    public function storeManual(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'penghuni_id' => 'required|exists:penghuni,id',
            'periode_bulan' => 'required|integer|between:1,12',
            'periode_tahun' => 'required|integer|min:2020|max:2035',
            'jumlah_tagihan' => 'required|numeric|min:0',
            'metode_pembayaran' => 'required|string|max:50',
            'status' => 'required|in:belum_bayar,lunas,menunggu_konfirmasi,telat',
            'tanggal_jatuh_tempo' => 'required|date',
            'tanggal_bayar' => 'nullable|date',
            'penjaga_perantara_id' => 'nullable|exists:pegawai,id',
        ]);

        if ($validated['status'] === 'lunas' && empty($validated['tanggal_bayar'])) {
            $validated['tanggal_bayar'] = now();
            $validated['dikonfirmasi_oleh'] = auth()->id();
            $validated['tanggal_konfirmasi'] = now();
        }

        $pembayaran = Pembayaran::create($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $pembayaran->penghuni?->kamar?->gedung?->cabang_id,
            'aksi' => 'create_pembayaran_manual',
            'model_type' => 'Pembayaran',
            'model_id' => $pembayaran->id,
            'keterangan' => "Admin membuat tagihan manual #{$pembayaran->id} untuk penghuni {$pembayaran->penghuni?->user?->nama}.",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Tagihan pembayaran berhasil dicatat.',
            'data' => $pembayaran->load(['penghuni.user', 'penghuni.kamar', 'penjaga.user']),
        ], 201);
    }

    /**
     * Generate bulk monthly bills for all active tenants.
     */
    public function generateMassal(Request $request): JsonResponse
    {
        $request->validate([
            'periode_bulan' => 'required|integer|between:1,12',
            'periode_tahun' => 'required|integer|min:2020|max:2035',
            'tanggal_jatuh_tempo' => 'nullable|date',
            'cabang_id' => 'nullable|exists:cabang,id',
        ]);

        $bulan = (int) $request->periode_bulan;
        $tahun = (int) $request->periode_tahun;
        $branchId = $request->cabang_id ?: BranchContext::getEffectiveBranchId($request);

        $jatuhTempo = $request->tanggal_jatuh_tempo
            ? Carbon::parse($request->tanggal_jatuh_tempo)
            : Carbon::create($tahun, $bulan, 10);

        return DB::transaction(function () use ($bulan, $tahun, $branchId, $jatuhTempo) {
            $tenantsQuery = Penghuni::with(['user', 'kamar.gedung', 'kamar.kamarFasilitas.fasilitas'])
                ->where('status', 'aktif');

            if ($branchId) {
                $tenantsQuery->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
            }

            $activeTenants = $tenantsQuery->get();
            $generatedCount = 0;
            $skippedCount = 0;

            foreach ($activeTenants as $penghuni) {
                // Check if bill already exists for this tenant & period
                $exists = Pembayaran::where('penghuni_id', $penghuni->id)
                    ->where('periode_bulan', $bulan)
                    ->where('periode_tahun', $tahun)
                    ->exists();

                if ($exists) {
                    $skippedCount++;

                    continue;
                }

                // Calculate base price + active additional requested facilities
                $totalTagihan = (float) ($penghuni->kamar?->harga_bulanan ?? 0);

                if ($penghuni->kamar && $penghuni->kamar->kamarFasilitas) {
                    foreach ($penghuni->kamar->kamarFasilitas as $kf) {
                        if (in_array($kf->status_request, ['aktif', 'terpasang']) && $kf->fasilitas) {
                            $totalTagihan += (float) ($kf->fasilitas->biaya_tambahan ?? 0);
                        }
                    }
                }

                $pembayaran = Pembayaran::create([
                    'penghuni_id' => $penghuni->id,
                    'periode_bulan' => $bulan,
                    'periode_tahun' => $tahun,
                    'jumlah_tagihan' => $totalTagihan,
                    'tanggal_jatuh_tempo' => $jatuhTempo,
                    'status' => 'belum_bayar',
                    'metode_pembayaran' => 'transfer',
                ]);

                // Send notification to tenant
                if ($penghuni->user_id) {
                    Notifikasi::create([
                        'user_id' => $penghuni->user_id,
                        'judul' => 'Tagihan Kost Baru Diterbitkan',
                        'isi' => "Tagihan sewa kost periode {$bulan}/{$tahun} sebesar Rp ".number_format($totalTagihan, 0, ',', '.')." telah diterbitkan. Batas pembayaran: {$jatuhTempo->format('d/m/Y')}.",
                        'tipe' => 'info',
                        'redirect_url' => '/mobile-app',
                        'referensi_tabel' => 'pembayaran',
                        'referensi_id' => $pembayaran->id,
                        'sudah_dibaca' => false,
                    ]);
                }

                $generatedCount++;
            }

            ActivityLog::create([
                'user_id' => auth()->id(),
                'cabang_id' => $branchId,
                'aksi' => 'generate_tagihan_massal',
                'model_type' => 'Pembayaran',
                'keterangan' => "Admin menerbitkan {$generatedCount} tagihan massal untuk periode {$bulan}/{$tahun}.",
                'created_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Berhasil menerbitkan {$generatedCount} tagihan baru periode {$bulan}/{$tahun} ({$skippedCount} tagihan sudah ada sebelumnya).",
                'data' => [
                    'generated' => $generatedCount,
                    'skipped' => $skippedCount,
                ],
            ]);
        });
    }

    /**
     * Send bulk payment reminder notification strictly to active tenants with unpaid/late bills.
     */
    public function ingatkanMassal(Request $request): JsonResponse
    {
        $branchId = $request->cabang_id ?: BranchContext::getEffectiveBranchId($request);
        $periodeBulan = $request->periode_bulan;
        $periodeTahun = $request->periode_tahun;

        $query = Pembayaran::with(['penghuni.user', 'penghuni.kamar.gedung'])
            ->whereIn('status', ['belum_bayar', 'telat'])
            ->whereHas('penghuni', fn ($pq) => $pq->where('status', 'aktif'));

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($periodeBulan && $periodeTahun) {
            $query->where('periode_bulan', (int) $periodeBulan)
                ->where('periode_tahun', (int) $periodeTahun);
        }

        $unpaidBills = $query->get();
        $remindedCount = 0;

        foreach ($unpaidBills as $tagihan) {
            if ($tagihan->penghuni?->user_id) {
                Notifikasi::create([
                    'user_id' => $tagihan->penghuni->user_id,
                    'judul' => 'Pengingat Tagihan Sewa Kost Belum Dibayar',
                    'isi' => "Halo {$tagihan->penghuni->user?->name}, tagihan sewa kost periode {$tagihan->periode_bulan}/{$tagihan->periode_tahun} sebesar Rp ".number_format($tagihan->jumlah_tagihan, 0, ',', '.')." belum dibayar. Mohon segera melakukan pembayaran sebelum jatuh tempo.",
                    'tipe' => 'peringatan',
                    'redirect_url' => '/mobile-app',
                    'referensi_tabel' => 'pembayaran',
                    'referensi_id' => $tagihan->id,
                    'sudah_dibaca' => false,
                ]);
                $remindedCount++;
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Berhasil mengirimkan pengingat tagihan kepada {$remindedCount} penghuni aktif yang belum bayar.",
            'reminded_count' => $remindedCount,
        ]);
    }

    /**
     * Cash payment via security guard.
     */
    public function bayarTunai(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'penjaga_perantara_id' => 'required|exists:pegawai,id',
            'catatan' => 'nullable|string',
        ]);

        $pembayaran = Pembayaran::with(['penghuni.user', 'penghuni.kamar.gedung'])->findOrFail($id);

        return DB::transaction(function () use ($request, $pembayaran) {
            $pembayaran->status = 'lunas';
            $pembayaran->metode_pembayaran = 'tunai';
            $pembayaran->penjaga_perantara_id = $request->penjaga_perantara_id;
            $pembayaran->tanggal_bayar = now();
            $pembayaran->dikonfirmasi_oleh = auth()->id();
            $pembayaran->tanggal_konfirmasi = now();
            $pembayaran->save();

            // Check if tenant was nunggak and has no remaining unpaid/telat bills
            if ($pembayaran->penghuni && $pembayaran->penghuni->status === 'nunggak') {
                $hasOtherDebt = Pembayaran::where('penghuni_id', $pembayaran->penghuni_id)
                    ->whereIn('status', ['telat', 'belum_bayar'])
                    ->exists();

                if (! $hasOtherDebt) {
                    $pembayaran->penghuni->status = 'aktif';
                    $pembayaran->penghuni->save();
                }
            }

            $penjaga = Pegawai::with('user')->find($request->penjaga_perantara_id);
            $namaPenjaga = $penjaga?->user?->nama ?? 'Penjaga';

            Notifikasi::create([
                'user_id' => $pembayaran->penghuni?->user_id,
                'judul' => 'Pembayaran Tunai Dikonfirmasi',
                'isi' => "Pembayaran tunai tagihan sewa kost periode {$pembayaran->periode_bulan}/{$pembayaran->periode_tahun} melalui penjaga ({$namaPenjaga}) telah berhasil diterima dan dikonfirmasi.",
                'tipe' => 'info',
                'redirect_url' => '/mobile-app',
                'referensi_tabel' => 'pembayaran',
                'referensi_id' => $pembayaran->id,
                'sudah_dibaca' => false,
            ]);

            ActivityLog::create([
                'user_id' => auth()->id(),
                'cabang_id' => $pembayaran->penghuni?->kamar?->gedung?->cabang_id,
                'aksi' => 'bayar_tunai_penjaga',
                'model_type' => 'Pembayaran',
                'model_id' => $pembayaran->id,
                'keterangan' => "Admin mencatat pembayaran tunai #{$pembayaran->id} penghuni {$pembayaran->penghuni?->user?->nama} via penjaga {$namaPenjaga}.",
                'created_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Pembayaran tunai via {$namaPenjaga} berhasil dikonfirmasi.",
                'data' => $pembayaran->load(['penghuni.user', 'penghuni.kamar', 'penjaga.user', 'konfirmator']),
            ]);
        });
    }

    /**
     * Update payment status (e.g. approve transfer proof as lunas).
     */
    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $pembayaran = Pembayaran::with(['penghuni.user', 'penghuni.kamar.gedung'])->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:belum_bayar,lunas,menunggu_konfirmasi,telat',
        ]);

        return DB::transaction(function () use ($validated, $pembayaran) {
            $pembayaran->status = $validated['status'];
            if ($validated['status'] === 'lunas') {
                $pembayaran->tanggal_bayar = $pembayaran->tanggal_bayar ?? now();
                $pembayaran->dikonfirmasi_oleh = auth()->id();
                $pembayaran->tanggal_konfirmasi = now();

                // If tenant status was nunggak, restore to aktif if no more overdue bills
                if ($pembayaran->penghuni && $pembayaran->penghuni->status === 'nunggak') {
                    $hasOtherDebt = Pembayaran::where('penghuni_id', $pembayaran->penghuni_id)
                        ->where('id', '!=', $pembayaran->id)
                        ->whereIn('status', ['telat', 'belum_bayar'])
                        ->exists();

                    if (! $hasOtherDebt) {
                        $pembayaran->penghuni->status = 'aktif';
                        $pembayaran->penghuni->save();
                    }
                }

                Notifikasi::create([
                    'user_id' => $pembayaran->penghuni?->user_id,
                    'judul' => 'Pembayaran Sewa Terverifikasi',
                    'isi' => "Tagihan sewa kost periode {$pembayaran->periode_bulan}/{$pembayaran->periode_tahun} telah diverifikasi dan lunas.",
                    'tipe' => 'info',
                    'redirect_url' => '/mobile-app',
                    'referensi_tabel' => 'pembayaran',
                    'referensi_id' => $pembayaran->id,
                    'sudah_dibaca' => false,
                ]);
            }
            $pembayaran->save();

            ActivityLog::create([
                'user_id' => auth()->id(),
                'cabang_id' => $pembayaran->penghuni?->kamar?->gedung?->cabang_id,
                'aksi' => 'update_status_pembayaran',
                'model_type' => 'Pembayaran',
                'model_id' => $pembayaran->id,
                'keterangan' => "Mengubah status pembayaran tagihan #{$pembayaran->id} ({$pembayaran->penghuni?->user?->nama}) menjadi {$validated['status']}.",
                'created_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Status pembayaran berhasil diperbarui.',
                'data' => $pembayaran->load(['penghuni.user', 'penghuni.kamar', 'konfirmator', 'penjaga.user']),
            ]);
        });
    }

    /**
     * Reject payment proof with explanation.
     */
    public function tolakBukti(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'alasan_penolakan' => 'required|string|min:5',
        ]);

        $pembayaran = Pembayaran::with(['penghuni.user', 'penghuni.kamar.gedung'])->findOrFail($id);

        return DB::transaction(function () use ($request, $pembayaran) {
            $pembayaran->status = 'belum_bayar';
            $pembayaran->save();

            Notifikasi::create([
                'user_id' => $pembayaran->penghuni?->user_id,
                'judul' => 'Bukti Pembayaran Ditolak',
                'isi' => "Bukti pembayaran periode {$pembayaran->periode_bulan}/{$pembayaran->periode_tahun} ditolak: {$request->alasan_penolakan}. Silakan unggah kembali bukti transfer yang valid.",
                'tipe' => 'peringatan',
                'redirect_url' => '/mobile-app',
                'referensi_tabel' => 'pembayaran',
                'referensi_id' => $pembayaran->id,
                'sudah_dibaca' => false,
            ]);

            ActivityLog::create([
                'user_id' => auth()->id(),
                'cabang_id' => $pembayaran->penghuni?->kamar?->gedung?->cabang_id,
                'aksi' => 'tolak_bukti_bayar',
                'model_type' => 'Pembayaran',
                'model_id' => $pembayaran->id,
                'keterangan' => "Admin menolak bukti bayar tagihan #{$pembayaran->id} ({$pembayaran->penghuni?->user?->nama}). Alasan: {$request->alasan_penolakan}",
                'created_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Bukti pembayaran telah ditolak dan penghuni diminta unggah ulang.',
                'data' => $pembayaran->load(['penghuni.user', 'penghuni.kamar']),
            ]);
        });
    }

    /**
     * Get guards list for cash payment selection.
     */
    public function penjagaList(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);

        $query = Pegawai::with('user', 'cabang')
            ->where('jabatan', 'penjaga');

        if ($branchId) {
            $query->where('cabang_id', $branchId);
        }

        $penjagas = $query->get();

        return response()->json([
            'status' => 'success',
            'data' => $penjagas,
        ]);
    }

    /**
     * Get booking payments for verification.
     */
    public function bookingPayments(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $status = $request->query('status', 'all');

        $query = PembayaranBooking::with([
            'booking.user',
            'booking.kamar.gedung.cabang',
            'konfirmator',
        ]);

        if ($branchId) {
            $query->whereHas('booking.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        $bookingPayments = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $bookingPayments,
        ]);
    }

    /**
     * Verify booking payment proof.
     */
    public function verifyBookingPayment(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:dikonfirmasi,ditolak',
        ]);

        $payment = PembayaranBooking::with('booking')->findOrFail($id);
        $payment->status = $request->status;
        $payment->dikonfirmasi_oleh = auth()->id();
        $payment->tanggal_konfirmasi = now();
        $payment->save();

        return response()->json([
            'status' => 'success',
            'message' => "Pembayaran booking telah {$request->status}.",
            'data' => $payment,
        ]);
    }
}
