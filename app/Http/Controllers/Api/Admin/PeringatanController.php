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
     * Get warnings list and delinquent tenants.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');

        $warningQuery = Peringatan::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
            'pembuat',
        ]);

        if ($branchId) {
            $warningQuery->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($search) {
            $warningQuery->where(function ($q) use ($search) {
                $q->where('keterangan', 'like', "%{$search}%")
                    ->orWhere('kategori_pelanggaran', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"));
            });
        }

        $peringatan = $warningQuery->orderBy('created_at', 'desc')->get();

        // Get delinquent tenants (penghuni menunggak)
        $delinquentQuery = Penghuni::with(['user', 'kamar.gedung.cabang', 'pembayaran' => function ($pq) {
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
            'menunggak' => $penghuniNunggak,
        ]);
    }

    /**
     * Store new warning (SP).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'penghuni_id' => 'required|exists:penghuni,id',
            'jenis' => 'required|in:nunggak,pelanggaran',
            'kategori_pelanggaran' => 'nullable|string|max:100',
            'keterangan' => 'required|string',
            'tanggal_kejadian' => 'required|date',
        ]);

        $validated['dibuat_oleh'] = auth()->id();

        $peringatan = Peringatan::create($validated);

        $penghuni = Penghuni::with('user')->find($request->penghuni_id);
        if ($penghuni && $penghuni->user_id) {
            Notifikasi::create([
                'user_id' => $penghuni->user_id,
                'judul' => 'Surat Peringatan Baru',
                'pesan' => "Anda menerima surat peringatan: {$validated['keterangan']}",
                'tipe' => 'peringatan',
                'sudah_dibaca' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Surat peringatan berhasil diterbitkan.',
            'data' => $peringatan->load(['penghuni.user', 'pembuat']),
        ], 201);
    }

    /**
     * Fast warning for late payment.
     */
    public function quickWarn(Request $request, int $penghuniId): JsonResponse
    {
        $penghuni = Penghuni::with('user')->findOrFail($penghuniId);

        $peringatan = Peringatan::create([
            'penghuni_id' => $penghuni->id,
            'jenis' => 'nunggak',
            'kategori_pelanggaran' => 'Keterlambatan Pembayaran Sewa',
            'keterangan' => 'Peringatan otomatis: Segera lunasi kewajiban pembayaran sewa kost Anda yang telah melewati jatuh tempo.',
            'tanggal_kejadian' => now()->toDateString(),
            'dibuat_oleh' => auth()->id(),
        ]);

        // Update status penghuni to nunggak
        $penghuni->status = 'nunggak';
        $penghuni->save();

        if ($penghuni->user_id) {
            Notifikasi::create([
                'user_id' => $penghuni->user_id,
                'judul' => 'Peringatan Tunggakan Sewa',
                'pesan' => 'Mohon segera lakukan pelunasan tagihan sewa kamar Anda untuk menghindari sanksi penghentian fasilitas.',
                'tipe' => 'peringatan',
                'sudah_dibaca' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Peringatan tunggakan sewa berhasil dikirimkan.',
            'data' => $peringatan,
        ]);
    }
}
