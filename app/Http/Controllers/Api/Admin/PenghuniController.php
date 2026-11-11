<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Fasilitas;
use App\Models\IzinKeluar;
use App\Models\Kamar;
use App\Models\KamarFasilitas;
use App\Models\Notifikasi;
use App\Models\Penghuni;
use App\Models\Peringatan;
use App\Models\User;
use App\Services\BranchContext;
use Carbon\Carbon;
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
            'no_hp' => 'nullable|string|max:20',
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
        $penghuni = Penghuni::with('kamar.gedung')->findOrFail($id);

        $penghuni->status = 'nonaktif';
        $penghuni->tanggal_keluar = now()->toDateString();
        $penghuni->save();

        if ($penghuni->kamar) {
            $penghuni->kamar->status = 'kosong';
            $penghuni->kamar->save();
        }

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $penghuni->kamar?->gedung?->cabang_id,
            'aksi' => 'checkout_penghuni',
            'model_type' => 'Penghuni',
            'model_id' => $penghuni->id,
            'keterangan' => "Penghuni {$penghuni->user?->nama} telah checkout dari kamar {$penghuni->kamar?->nomor_kamar}.",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Penghuni telah berhasil di-checkout dan status kamar kembali kosong.',
            'data' => $penghuni,
        ]);
    }

    /**
     * Extend tenant stay duration.
     */
    public function perpanjang(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'durasi_bulan' => 'required|integer|min:1|max:36',
        ]);

        $penghuni = Penghuni::with(['kamar.gedung', 'user'])->findOrFail($id);
        $durasi = (int) $request->durasi_bulan;

        $currentEnd = $penghuni->masa_tinggal_sampai
            ? Carbon::parse($penghuni->masa_tinggal_sampai)
            : Carbon::today();

        // If already passed, extend from today
        $baseDate = $currentEnd->isPast() ? Carbon::today() : $currentEnd;
        $newEnd = (clone $baseDate)->addMonths($durasi);

        $penghuni->masa_tinggal_sampai = $newEnd;
        $penghuni->status = 'aktif';
        $penghuni->save();

        Notifikasi::create([
            'user_id' => $penghuni->user_id,
            'judul' => 'Masa Tinggal Diperpanjang',
            'isi' => "Masa tinggal Anda di kamar {$penghuni->kamar?->nomor_kamar} telah diperpanjang sebanyak {$durasi} bulan hingga {$newEnd->format('d/m/Y')}.",
            'tipe' => 'info',
            'redirect_url' => '/mobile-app',
            'referensi_tabel' => 'penghuni',
            'referensi_id' => $penghuni->id,
            'sudah_dibaca' => false,
        ]);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $penghuni->kamar?->gedung?->cabang_id,
            'aksi' => 'perpanjang_masa_tinggal',
            'model_type' => 'Penghuni',
            'model_id' => $penghuni->id,
            'keterangan' => "Admin memperpanjang masa tinggal {$penghuni->user?->nama} sebanyak {$durasi} bulan hingga {$newEnd->toDateString()}.",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Masa tinggal berhasil diperpanjang hingga {$newEnd->format('d/m/Y')}.",
            'data' => $penghuni->load('kamar.gedung.cabang', 'user'),
        ]);
    }

    /**
     * Move tenant to another empty room.
     */
    public function pindahKamar(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'kamar_baru_id' => 'required|exists:kamar,id',
        ]);

        $penghuni = Penghuni::with(['kamar.gedung', 'user'])->findOrFail($id);
        $kamarBaru = Kamar::with('gedung.cabang')->findOrFail($request->kamar_baru_id);

        if ($kamarBaru->status !== 'kosong') {
            return response()->json([
                'status' => 'error',
                'message' => "Kamar {$kamarBaru->nomor_kamar} tidak sedang kosong.",
            ], 422);
        }

        return DB::transaction(function () use ($penghuni, $kamarBaru) {
            $oldKamar = $penghuni->kamar;

            // 1. Free old room
            if ($oldKamar) {
                $oldKamar->status = 'kosong';
                $oldKamar->save();
            }

            // 2. Set new room as occupied
            $kamarBaru->status = 'terisi';
            $kamarBaru->save();

            // 3. Move tenant
            $penghuni->kamar_id = $kamarBaru->id;
            $penghuni->save();

            // 4. Migrate requested facilities from old room to new room
            if ($oldKamar) {
                KamarFasilitas::where('kamar_id', $oldKamar->id)
                    ->whereIn('status_request', ['aktif', 'terpasang'])
                    ->update(['kamar_id' => $kamarBaru->id]);
            }

            Notifikasi::create([
                'user_id' => $penghuni->user_id,
                'judul' => 'Pindah Kamar Berhasil',
                'isi' => "Anda telah berhasil dipindahkan ke kamar {$kamarBaru->nomor_kamar} gedung {$kamarBaru->gedung?->nama_gedung}.",
                'tipe' => 'info',
                'redirect_url' => '/mobile-app',
                'referensi_tabel' => 'penghuni',
                'referensi_id' => $penghuni->id,
                'sudah_dibaca' => false,
            ]);

            ActivityLog::create([
                'user_id' => auth()->id(),
                'cabang_id' => $kamarBaru->gedung?->cabang_id,
                'aksi' => 'pindah_kamar',
                'model_type' => 'Penghuni',
                'model_id' => $penghuni->id,
                'keterangan' => "Penghuni {$penghuni->user?->nama} pindah dari kamar {$oldKamar?->nomor_kamar} ke kamar {$kamarBaru->nomor_kamar}.",
                'created_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Penghuni {$penghuni->user?->nama} berhasil dipindahkan ke Kamar {$kamarBaru->nomor_kamar}.",
                'data' => $penghuni->load('kamar.gedung.cabang', 'user'),
            ]);
        });
    }

    /**
     * Get available rooms for moving tenant.
     */
    public function emptyRooms(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);

        $query = Kamar::with('gedung.cabang')
            ->where('status', 'kosong');

        if ($branchId) {
            $query->whereHas('gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $rooms = $query->orderBy('nomor_kamar')->get();

        return response()->json([
            'status' => 'success',
            'data' => $rooms,
        ]);
    }

    /**
     * Get troublesome tenants (pelacakan penyewa bermasalah).
     * Calculates unpaid/overdue bills, warnings, and risk level.
     */
    public function penyewaBermasalah(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);

        $query = Penghuni::with([
            'user',
            'kamar.gedung.cabang',
            'peringatan',
            'pembayaran' => function ($pq) {
                $pq->whereIn('status', ['telat', 'belum_bayar']);
            },
        ])->where('status', '!=', 'nonaktif');

        if ($branchId) {
            $query->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $allTenants = $query->get();

        $troublesome = [];

        foreach ($allTenants as $tenant) {
            $unpaidCount = $tenant->pembayaran->count();
            $totalDebt = $tenant->pembayaran->sum('jumlah_tagihan');
            $warningCount = $tenant->peringatan->count();

            // Include if they have any warning or overdue/unpaid bill or status is nunggak
            if ($unpaidCount > 0 || $warningCount > 0 || $tenant->status === 'nunggak') {
                $riskLevel = 'rendah';
                if ($warningCount >= 2 || $unpaidCount >= 2 || $totalDebt >= 1500000) {
                    $riskLevel = 'tinggi';
                } elseif ($warningCount >= 1 || $unpaidCount >= 1) {
                    $riskLevel = 'sedang';
                }

                $troublesome[] = [
                    'penghuni' => $tenant,
                    'unpaid_bills_count' => $unpaidCount,
                    'total_tunggakan' => (float) $totalDebt,
                    'peringatan_count' => $warningCount,
                    'risk_level' => $riskLevel,
                    'latest_peringatan' => $tenant->peringatan->sortByDesc('created_at')->first(),
                ];
            }
        }

        // Sort by risk level (tinggi first) then total debt
        usort($troublesome, function ($a, $b) {
            $riskWeight = ['tinggi' => 3, 'sedang' => 2, 'rendah' => 1];
            $cmp = ($riskWeight[$b['risk_level']] ?? 0) <=> ($riskWeight[$a['risk_level']] ?? 0);
            if ($cmp === 0) {
                return $b['total_tunggakan'] <=> $a['total_tunggakan'];
            }

            return $cmp;
        });

        return response()->json([
            'status' => 'success',
            'total_bermasalah' => count($troublesome),
            'data' => $troublesome,
        ]);
    }

    /**
     * Get curfew violations list (pelanggaran jam malam).
     */
    public function pelanggaranJamMalam(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);

        $query = IzinKeluar::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
            'penyetuju',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        $allIzin = $query->orderBy('tanggal', 'desc')->get();

        $violations = [];

        foreach ($allIzin as $izin) {
            $cabang = $izin->penghuni?->kamar?->gedung?->cabang;
            $jamMalam = $cabang?->jam_malam ? Carbon::parse($cabang->jam_malam)->format('H:i:s') : '22:00:00';
            $jamKembali = $izin->rencana_jam_kembali ? Carbon::parse($izin->rencana_jam_kembali)->format('H:i:s') : '00:00:00';

            // Mark violation if planned return is past curfew or status was rejected but tenant still went out
            $isViolation = ($jamKembali > $jamMalam) || ($izin->status === 'ditolak');

            if ($isViolation) {
                $violations[] = [
                    'izin' => $izin,
                    'jam_malam_cabang' => $jamMalam,
                    'jam_kembali' => $jamKembali,
                    'tipe_pelanggaran' => $jamKembali > $jamMalam ? 'Rencana Kembali Melewati Jam Malam' : 'Izin Ditolak',
                ];
            }
        }

        // Also fetch warning records related to curfew
        $curfewWarnings = Peringatan::with(['penghuni.user', 'penghuni.kamar.gedung.cabang', 'pembuat'])
            ->where(function ($q) {
                $q->where('kategori_pelanggaran', 'like', '%jam malam%')
                    ->orWhere('kategori_pelanggaran', 'like', '%malam%')
                    ->orWhere('keterangan', 'like', '%jam malam%');
            })
            ->when($branchId, function ($q) use ($branchId) {
                $q->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
            })
            ->orderBy('tanggal_kejadian', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'total_pelanggaran' => count($violations) + $curfewWarnings->count(),
            'violations_izin' => $violations,
            'warnings_curfew' => $curfewWarnings,
        ]);
    }

    /**
     * Send official warning to tenant.
     */
    public function kirimPeringatan(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'jenis' => 'required|in:nunggak,pelanggaran',
            'kategori_pelanggaran' => 'required|string|max:100',
            'keterangan' => 'required|string',
            'tanggal_kejadian' => 'nullable|date',
        ]);

        $penghuni = Penghuni::with(['user', 'kamar.gedung'])->findOrFail($id);

        return DB::transaction(function () use ($request, $penghuni) {
            $peringatan = Peringatan::create([
                'penghuni_id' => $penghuni->id,
                'jenis' => $request->jenis,
                'kategori_pelanggaran' => $request->kategori_pelanggaran,
                'keterangan' => $request->keterangan,
                'tanggal_kejadian' => $request->tanggal_kejadian ?: now()->toDateString(),
                'dibuat_oleh' => auth()->id(),
            ]);

            // If warning is about unpaid rent, mark tenant status as nunggak
            if ($request->jenis === 'nunggak') {
                $penghuni->status = 'nunggak';
                $penghuni->save();
            }

            Notifikasi::create([
                'user_id' => $penghuni->user_id,
                'judul' => 'Surat Peringatan Resmi',
                'isi' => "Peringatan: {$request->kategori_pelanggaran}. Keterangan: {$request->keterangan}",
                'tipe' => 'peringatan',
                'redirect_url' => '/mobile-app',
                'referensi_tabel' => 'peringatan',
                'referensi_id' => $peringatan->id,
                'sudah_dibaca' => false,
            ]);

            ActivityLog::create([
                'user_id' => auth()->id(),
                'cabang_id' => $penghuni->kamar?->gedung?->cabang_id,
                'aksi' => 'kirim_surat_peringatan',
                'model_type' => 'Peringatan',
                'model_id' => $peringatan->id,
                'keterangan' => "Admin menerbitkan surat peringatan untuk {$penghuni->user?->nama}. Kategori: {$request->kategori_pelanggaran}",
                'created_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => "Surat peringatan berhasil diterbitkan dan notifikasi telah dikirim ke {$penghuni->user?->nama}.",
                'data' => $peringatan,
            ]);
        });
    }
}
