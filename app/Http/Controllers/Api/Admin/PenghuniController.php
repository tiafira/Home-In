<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fasilitas;
use App\Models\Kamar;
use App\Models\KamarFasilitas;
use App\Models\Penghuni;
use App\Models\User;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PenghuniController extends Controller
{
    /**
     * Get tenants list with branch scoping, status filtering, and facilities list.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $status = $request->query('status', 'aktif');
        $search = $request->query('search', '');

        $query = Penghuni::with([
            'user',
            'kamar.gedung.cabang',
            'kamar.kamarFasilitas.fasilitas',
            'pembayaran' => fn ($pq) => $pq->latest()->limit(5),
            'peringatan',
        ]);

        if ($branchId) {
            $query->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $counts = [
            'aktif' => (clone $query)->where('status', 'aktif')->count(),
            'nunggak' => (clone $query)->where('status', 'nunggak')->count(),
            'nonaktif' => (clone $query)->where('status', 'nonaktif')->count(),
            'all' => (clone $query)->count(),
        ];

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->whereHas('user', function ($uq) use ($search) {
                    $uq->where('nama', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('no_hp', 'like', "%{$search}%");
                })->orWhereHas('kamar', function ($kq) use ($search) {
                    $kq->where('nomor_kamar', 'like', "%{$search}%");
                })->orWhere('no_ktp', 'like', "%{$search}%");
            });
        }

        $penghuni = $query->orderBy('created_at', 'desc')->get();
        $fasilitasList = Fasilitas::orderByRaw("CASE WHEN tipe = 'tambahan' THEN 0 ELSE 1 END")
            ->orderBy('nama_fasilitas')
            ->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'fasilitas_list' => $fasilitasList,
            'data' => $penghuni,
        ]);
    }

    /**
     * Show single tenant details.
     */
    public function show(int $id): JsonResponse
    {
        $penghuni = Penghuni::with([
            'user',
            'kamar.gedung.cabang',
            'kamar.kamarFasilitas.fasilitas',
            'pembayaran',
            'peringatan',
            'izinKeluar',
            'laporanTamu',
            'laporanPulang',
        ])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $penghuni,
        ]);
    }

    /**
     * Add new tenant directly to an empty room (with optional facility request).
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'email' => 'required|email|max:100',
            'no_hp' => 'required|string|max:20',
            'kamar_id' => 'required|exists:kamar,id',
            'no_ktp' => 'nullable|string|max:20',
            'alamat_asal' => 'nullable|string',
            'kontak_darurat_nama' => 'nullable|string|max:100',
            'kontak_darurat_hp' => 'nullable|string|max:20',
            'tanggal_masuk' => 'required|date',
            'masa_tinggal_sampai' => 'nullable|date|after_or_equal:tanggal_masuk',
            'fasilitas_id' => 'nullable|exists:fasilitas,id',
            'fasilitas_custom' => 'nullable|string|max:100',
            'fasilitas_ids' => 'nullable|array',
            'fasilitas_ids.*' => 'exists:fasilitas,id',
            'status_request' => 'nullable|in:menunggu_konfirmasi,aktif',
        ]);

        $kamar = Kamar::findOrFail($request->kamar_id);
        if ($kamar->status !== 'kosong') {
            return response()->json([
                'status' => 'error',
                'message' => 'Kamar yang dipilih tidak dalam status kosong.',
            ], 422);
        }

        return DB::transaction(function () use ($request, $kamar) {
            // Find or create user
            $user = User::where('email', $request->email)->first();
            if (! $user) {
                $user = User::create([
                    'nama' => $request->name,
                    'email' => $request->email,
                    'password' => Hash::make('password123'),
                    'role' => 'penghuni',
                    'no_hp' => $request->no_hp,
                ]);
            } else {
                $user->nama = $request->name;
                $user->role = 'penghuni';
                $user->no_hp = $request->no_hp;
                $user->save();
            }

            // Create penghuni
            $penghuni = Penghuni::create([
                'user_id' => $user->id,
                'kamar_id' => $kamar->id,
                'no_ktp' => $request->no_ktp,
                'alamat_asal' => $request->alamat_asal,
                'kontak_darurat_nama' => $request->kontak_darurat_nama,
                'kontak_darurat_hp' => $request->kontak_darurat_hp,
                'tanggal_masuk' => $request->tanggal_masuk,
                'masa_tinggal_sampai' => $request->masa_tinggal_sampai,
                'status' => 'aktif',
            ]);

            // Set room to terisi
            $kamar->status = 'terisi';
            $kamar->save();

            // Attach requested facilities if selected or custom input
            $fasilitasIds = [];
            if ($request->filled('fasilitas_id')) {
                $fasilitasIds[] = (int) $request->fasilitas_id;
            }
            if ($request->filled('fasilitas_custom')) {
                $customName = trim($request->fasilitas_custom);
                $customFasilitas = Fasilitas::firstOrCreate(
                    ['nama_fasilitas' => $customName],
                    [
                        'deskripsi' => 'Fasilitas kustom permintaan penghuni',
                        'tipe' => 'tambahan',
                        'biaya_tambahan' => 0,
                    ]
                );
                $fasilitasIds[] = $customFasilitas->id;
            }
            if (is_array($request->fasilitas_ids)) {
                foreach ($request->fasilitas_ids as $fid) {
                    if ($fid) {
                        $fasilitasIds[] = (int) $fid;
                    }
                }
            }
            $fasilitasIds = array_values(array_unique($fasilitasIds));
            $statusReq = $request->input('status_request', 'menunggu_konfirmasi');

            foreach ($fasilitasIds as $fid) {
                KamarFasilitas::create([
                    'kamar_id' => $kamar->id,
                    'fasilitas_id' => $fid,
                    'status_request' => $statusReq,
                    'tanggal_pasang' => $statusReq === 'aktif' ? now()->toDateString() : null,
                    'created_at' => now(),
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Penghuni baru berhasil didaftarkan.',
                'data' => $penghuni->load(['user', 'kamar.gedung.cabang', 'kamar.kamarFasilitas.fasilitas']),
            ], 201);
        });
    }

    /**
     * Request or assign an additional facility for a tenant's room.
     */
    public function requestFasilitas(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'fasilitas_id' => 'nullable|exists:fasilitas,id',
            'fasilitas_custom' => 'nullable|string|max:100',
            'status_request' => 'nullable|in:menunggu_konfirmasi,aktif',
        ]);

        if (! $request->filled('fasilitas_id') && ! $request->filled('fasilitas_custom')) {
            return response()->json([
                'status' => 'error',
                'message' => 'Pilih fasilitas atau masukkan nama fasilitas kustom.',
            ], 422);
        }

        $penghuni = Penghuni::with('kamar')->findOrFail($id);
        if (! $penghuni->kamar_id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Penghuni ini tidak memiliki kamar aktif.',
            ], 422);
        }

        $fasilitasId = $request->fasilitas_id;
        if (! $fasilitasId && $request->filled('fasilitas_custom')) {
            $customName = trim($request->fasilitas_custom);
            $customFasilitas = Fasilitas::firstOrCreate(
                ['nama_fasilitas' => $customName],
                [
                    'deskripsi' => 'Fasilitas kustom permintaan penghuni',
                    'tipe' => 'tambahan',
                    'biaya_tambahan' => 0,
                ]
            );
            $fasilitasId = $customFasilitas->id;
        }

        $statusReq = $request->input('status_request', 'menunggu_konfirmasi');

        KamarFasilitas::create([
            'kamar_id' => $penghuni->kamar_id,
            'fasilitas_id' => $fasilitasId,
            'status_request' => $statusReq,
            'tanggal_pasang' => $statusReq === 'aktif' ? now()->toDateString() : null,
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Request fasilitas tambahan berhasil ditambahkan untuk kamar penghuni ini.',
            'data' => $penghuni->load(['user', 'kamar.gedung.cabang', 'kamar.kamarFasilitas.fasilitas']),
        ]);
    }

    /**
     * Import multiple tenants from Google Form CSV.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.nama' => 'required|string|max:100',
            'items.*.email' => 'required|email|max:150',
            'items.*.no_hp' => 'nullable|string|max:20',
            'items.*.no_ktp' => 'nullable|string|max:20',
            'items.*.alamat_asal' => 'nullable|string',
            'items.*.kamar_id' => 'required|exists:kamar,id',
            'items.*.tanggal_masuk' => 'nullable|date',
            'items.*.fasilitas_id' => 'nullable|exists:fasilitas,id',
        ]);

        return DB::transaction(function () use ($request) {
            $importedCount = 0;

            foreach ($request->items as $row) {
                $kamar = Kamar::find($row['kamar_id']);
                if (! $kamar) {
                    continue;
                }

                $user = User::where('email', $row['email'])->first();
                if (! $user) {
                    $user = User::create([
                        'nama' => $row['nama'],
                        'email' => $row['email'],
                        'password' => Hash::make('password123'),
                        'role' => 'penghuni',
                        'no_hp' => $row['no_hp'] ?? null,
                    ]);
                } else {
                    $user->nama = $row['nama'];
                    $user->role = 'penghuni';
                    if (! empty($row['no_hp'])) {
                        $user->no_hp = $row['no_hp'];
                    }
                    $user->save();
                }

                Penghuni::create([
                    'user_id' => $user->id,
                    'kamar_id' => $kamar->id,
                    'no_ktp' => $row['no_ktp'] ?? null,
                    'alamat_asal' => $row['alamat_asal'] ?? null,
                    'tanggal_masuk' => $row['tanggal_masuk'] ?? now()->toDateString(),
                    'status' => 'aktif',
                ]);

                $kamar->status = 'terisi';
                $kamar->save();

                if (! empty($row['fasilitas_id'])) {
                    KamarFasilitas::create([
                        'kamar_id' => $kamar->id,
                        'fasilitas_id' => $row['fasilitas_id'],
                        'status_request' => 'menunggu_konfirmasi',
                        'created_at' => now(),
                    ]);
                }

                $importedCount++;
            }

            return response()->json([
                'status' => 'success',
                'message' => "{$importedCount} data penghuni berhasil diimpor dari Google Form.",
            ]);
        });
    }

    /**
     * Check out tenant (set to nonaktif, free room to kosong).
     */
    public function checkout(Request $request, int $id): JsonResponse
    {
        $penghuni = Penghuni::with('kamar')->findOrFail($id);

        $penghuni->status = 'nonaktif';
        $penghuni->tanggal_keluar = now()->toDateString();
        $penghuni->save();

        if ($penghuni->kamar) {
            $penghuni->kamar->status = 'kosong';
            $penghuni->kamar->save();
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Penghuni telah berhasil di-checkout dan status kamar kembali kosong.',
            'data' => $penghuni,
        ]);
    }
}
