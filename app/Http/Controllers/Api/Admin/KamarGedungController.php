<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Cabang;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\KamarFoto;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class KamarGedungController extends Controller
{
    /**
     * Get rooms and buildings with summary statistics.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $gedungId = $request->query('gedung_id');
        $lantai = $request->query('lantai');
        $status = $request->query('status');
        $search = $request->query('search');

        $cabangs = Cabang::orderBy('nama_cabang')->get();

        $gedungQuery = Gedung::with(['cabang']);
        if ($branchId) {
            $gedungQuery->where('cabang_id', $branchId);
        }
        $gedungs = $gedungQuery->orderBy('nama_gedung')->get();

        $kamarQuery = Kamar::with(['gedung.cabang', 'penghuni.user', 'kamarFoto']);
        if ($branchId) {
            $kamarQuery->whereHas('gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        // Summary counts
        $counts = [
            'total' => (clone $kamarQuery)->count(),
            'kosong' => (clone $kamarQuery)->where('status', 'kosong')->count(),
            'terisi' => (clone $kamarQuery)->where('status', 'terisi')->count(),
            'dibooking' => (clone $kamarQuery)->where('status', 'dibooking')->count(),
            'maintenance' => (clone $kamarQuery)->where('status', 'maintenance')->count(),
        ];

        if ($gedungId) {
            $kamarQuery->where('gedung_id', $gedungId);
        }
        if ($lantai) {
            $kamarQuery->where('lantai', $lantai);
        }
        if ($status && $status !== 'all') {
            $kamarQuery->where('status', $status);
        }
        if ($search) {
            $search = trim($search);
            $kamarQuery->where(function ($q) use ($search): void {
                $q->where('nomor_kamar', 'like', "%{$search}%")
                    ->orWhereHas('gedung', function ($gq) use ($search): void {
                        $gq->where('nama_gedung', 'like', "%{$search}%")
                            ->orWhere('alamat', 'like', "%{$search}%");
                    });
            });
        }

        $kamars = $kamarQuery->orderBy('lantai')->orderBy('nomor_kamar')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'cabangs' => $cabangs,
            'gedungs' => $gedungs,
            'data' => $kamars,
        ]);
    }

    /**
     * Create room (Single).
     */
    public function storeKamar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gedung_id' => 'required|exists:gedung,id',
            'nomor_kamar' => 'required|string|max:20',
            'lantai' => 'required|integer|min:1',
            'harga_bulanan' => 'required|numeric|min:0',
            'status' => 'required|in:kosong,terisi,dibooking,maintenance',
            'deskripsi' => 'nullable|string',
            'foto' => 'required|file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ], [
            'foto.required' => 'Foto kamar wajib diunggah.',
            'foto.image' => 'File foto kamar harus berupa gambar valid.',
            'foto.max' => 'Ukuran foto kamar maksimal 5 MB.',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $kamar = Kamar::create([
                'gedung_id' => $validated['gedung_id'],
                'nomor_kamar' => $validated['nomor_kamar'],
                'lantai' => $validated['lantai'],
                'harga_bulanan' => $validated['harga_bulanan'],
                'status' => $validated['status'],
                'deskripsi' => $validated['deskripsi'] ?? null,
            ]);

            if ($request->hasFile('foto')) {
                $path = $request->file('foto')->store('kamar', 'public');
                $urlFoto = Storage::url($path);

                KamarFoto::create([
                    'kamar_id' => $kamar->id,
                    'url_foto' => $urlFoto,
                    'created_at' => now(),
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => "Kamar {$kamar->nomor_kamar} berhasil ditambahkan.",
                'data' => $kamar->load(['gedung.cabang', 'kamarFoto']),
            ], 201);
        });
    }

    /**
     * Bulk create rooms for a floor.
     * System generates room numbers automatically (e.g. Lantai 2 -> 201, 202, 203...)
     */
    public function bulkStoreKamar(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gedung_id' => 'required|exists:gedung,id',
            'lantai' => 'required|integer|min:1|max:25',
            'harga_bulanan' => 'required|numeric|min:0',
            'jumlah_kamar' => 'required|integer|min:1|max:50',
            'deskripsi' => 'nullable|string',
            'foto' => 'required|file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ], [
            'gedung_id.required' => 'Gedung wajib dipilih.',
            'lantai.required' => 'Lantai wajib ditentukan.',
            'harga_bulanan.required' => 'Harga sewa per bulan wajib diisi.',
            'jumlah_kamar.required' => 'Jumlah kamar yang akan ditambahkan wajib diisi.',
            'foto.required' => 'Foto kamar wajib diunggah untuk kelengkapan data kamar.',
            'foto.image' => 'File foto kamar harus berupa gambar valid.',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $gedung = Gedung::with('cabang')->findOrFail($validated['gedung_id']);
            $lantai = (int) $validated['lantai'];
            $jumlahKamar = (int) $validated['jumlah_kamar'];

            // Store photo once and share URL across the bulk rooms
            $path = $request->file('foto')->store('kamar', 'public');
            $urlFoto = Storage::url($path);

            // Fetch existing room numbers in this gedung & lantai
            $existingNumbers = Kamar::where('gedung_id', $gedung->id)
                ->where('lantai', $lantai)
                ->pluck('nomor_kamar')
                ->map(fn ($n) => trim($n))
                ->toArray();

            $createdRooms = [];
            $roomCounter = 1;

            while (count($createdRooms) < $jumlahKamar && $roomCounter <= 999) {
                // Auto generate number based on floor: e.g. Lantai 1 -> 101, Lantai 2 -> 201
                $candidateNumber = ($lantai * 100) + $roomCounter;
                $candidateStr = (string) $candidateNumber;

                if (! in_array($candidateStr, $existingNumbers)) {
                    $kamar = Kamar::create([
                        'gedung_id' => $gedung->id,
                        'nomor_kamar' => $candidateStr,
                        'lantai' => $lantai,
                        'harga_bulanan' => $validated['harga_bulanan'],
                        'status' => 'kosong',
                        'deskripsi' => $validated['deskripsi'] ?? "Kamar Lantai {$lantai} - {$gedung->nama_gedung}",
                    ]);

                    KamarFoto::create([
                        'kamar_id' => $kamar->id,
                        'url_foto' => $urlFoto,
                        'created_at' => now(),
                    ]);

                    $createdRooms[] = $kamar;
                    $existingNumbers[] = $candidateStr;
                }

                $roomCounter++;
            }

            ActivityLog::create([
                'user_id' => auth()->id(),
                'cabang_id' => $gedung->cabang_id,
                'aksi' => 'bulk_create_kamar',
                'model_type' => 'Kamar',
                'model_id' => $gedung->id,
                'keterangan' => 'Menambahkan massal '.count($createdRooms)." kamar di {$gedung->nama_gedung} Lantai {$lantai}.",
                'created_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Berhasil menambahkan '.count($createdRooms)." kamar secara massal di Lantai {$lantai}.",
                'data' => $createdRooms,
            ], 201);
        });
    }

    /**
     * Update room.
     */
    public function updateKamar(Request $request, int $id): JsonResponse
    {
        $kamar = Kamar::findOrFail($id);

        $validated = $request->validate([
            'gedung_id' => 'required|exists:gedung,id',
            'nomor_kamar' => 'required|string|max:20',
            'lantai' => 'required|integer|min:1',
            'harga_bulanan' => 'required|numeric|min:0',
            'status' => 'required|in:kosong,terisi,dibooking,maintenance',
            'deskripsi' => 'nullable|string',
            'foto' => 'nullable|file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        return DB::transaction(function () use ($request, $kamar, $validated) {
            $kamar->update([
                'gedung_id' => $validated['gedung_id'],
                'nomor_kamar' => $validated['nomor_kamar'],
                'lantai' => $validated['lantai'],
                'harga_bulanan' => $validated['harga_bulanan'],
                'status' => $validated['status'],
                'deskripsi' => $validated['deskripsi'] ?? null,
            ]);

            if ($request->hasFile('foto')) {
                $path = $request->file('foto')->store('kamar', 'public');
                $urlFoto = Storage::url($path);

                KamarFoto::create([
                    'kamar_id' => $kamar->id,
                    'url_foto' => $urlFoto,
                    'created_at' => now(),
                ]);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Data kamar berhasil diperbarui.',
                'data' => $kamar->load(['gedung.cabang', 'kamarFoto']),
            ]);
        });
    }

    /**
     * Quick status update for room.
     * Enforces: Rooms that are 'terisi' or 'dibooking' cannot be toggled to 'kosong' or 'maintenance'.
     */
    public function updateStatusKamar(Request $request, int $id): JsonResponse
    {
        $kamar = Kamar::with('gedung')->findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|in:kosong,terisi,dibooking,maintenance',
        ]);

        $newStatus = $validated['status'];
        $currentStatus = $kamar->status;

        // Restriction: Kamar yang terisi atau dibooking tidak boleh di-toggle
        if (in_array($currentStatus, ['terisi', 'dibooking']) && in_array($newStatus, ['kosong', 'maintenance'])) {
            return response()->json([
                'status' => 'error',
                'message' => "Kamar {$kamar->nomor_kamar} sedang {$currentStatus}. Kamar yang terisi atau dibooking tidak dapat diubah status ketersediaannya secara manual.",
            ], 422);
        }

        $kamar->status = $newStatus;
        $kamar->save();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $kamar->gedung?->cabang_id,
            'aksi' => 'update_status_kamar',
            'model_type' => 'Kamar',
            'model_id' => $kamar->id,
            'keterangan' => "Mengubah status kamar {$kamar->nomor_kamar} dari {$currentStatus} menjadi {$newStatus}.",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Status kamar {$kamar->nomor_kamar} berhasil diubah menjadi {$newStatus}.",
            'data' => $kamar->load('gedung.cabang'),
        ]);
    }

    /**
     * Delete room.
     */
    public function destroyKamar(int $id): JsonResponse
    {
        $kamar = Kamar::findOrFail($id);
        if ($kamar->status === 'terisi') {
            return response()->json([
                'status' => 'error',
                'message' => 'Kamar sedang terisi dan tidak dapat dihapus.',
            ], 422);
        }

        $kamar->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Kamar berhasil dihapus.',
        ]);
    }

    /**
     * Create building.
     */
    public function storeGedung(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cabang_id' => 'nullable|exists:cabang,id',
            'nama_gedung' => 'required|string|max:100',
            'jumlah_lantai' => 'required|integer|min:1',
            'alamat' => 'required|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'link_gmaps' => 'nullable|string|max:500',
            'foto' => 'required|file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ], [
            'foto.required' => 'Foto tampak depan/gedung kosan wajib diunggah.',
            'foto.image' => 'File foto gedung harus berupa gambar valid.',
            'foto.max' => 'Ukuran foto gedung maksimal 5 MB.',
        ]);

        $validated['cabang_id'] = $validated['cabang_id'] ?? BranchContext::getEffectiveBranchId($request) ?? null;

        if ($request->hasFile('foto')) {
            $path = $request->file('foto')->store('gedung', 'public');
            $validated['foto'] = Storage::url($path);
        }

        $gedung = Gedung::create($validated);

        // Also update parent cabang address/coordinates if provided so Haversine & branch info stay in sync
        if ($gedung->cabang) {
            $cabangUpdates = [];
            if (! empty($validated['alamat'])) {
                $cabangUpdates['alamat'] = $validated['alamat'];
            }
            if (isset($validated['latitude']) && $validated['latitude'] !== null) {
                $cabangUpdates['latitude'] = $validated['latitude'];
            }
            if (isset($validated['longitude']) && $validated['longitude'] !== null) {
                $cabangUpdates['longitude'] = $validated['longitude'];
            }
            if (! empty($cabangUpdates)) {
                $gedung->cabang->update($cabangUpdates);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Gedung berhasil ditambahkan beserta foto dan lokasi Google Maps.',
            'data' => $gedung->load('cabang'),
        ], 201);
    }

    /**
     * Update building.
     */
    public function updateGedung(Request $request, int $id): JsonResponse
    {
        $gedung = Gedung::findOrFail($id);

        $validated = $request->validate([
            'cabang_id' => 'nullable|exists:cabang,id',
            'nama_gedung' => 'required|string|max:100',
            'jumlah_lantai' => 'required|integer|min:1',
            'alamat' => 'required|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'link_gmaps' => 'nullable|string|max:500',
            'foto' => 'nullable|file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $validated['cabang_id'] = $validated['cabang_id'] ?? $gedung->cabang_id ?? BranchContext::getEffectiveBranchId($request) ?? null;

        if ($request->hasFile('foto')) {
            $path = $request->file('foto')->store('gedung', 'public');
            $validated['foto'] = Storage::url($path);
        }

        $gedung->update($validated);

        if ($gedung->cabang) {
            $cabangUpdates = [];
            if (! empty($validated['alamat'])) {
                $cabangUpdates['alamat'] = $validated['alamat'];
            }
            if (isset($validated['latitude']) && $validated['latitude'] !== null) {
                $cabangUpdates['latitude'] = $validated['latitude'];
            }
            if (isset($validated['longitude']) && $validated['longitude'] !== null) {
                $cabangUpdates['longitude'] = $validated['longitude'];
            }
            if (! empty($cabangUpdates)) {
                $gedung->cabang->update($cabangUpdates);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Data gedung dan lokasi berhasil diperbarui.',
            'data' => $gedung->load('cabang'),
        ]);
    }

    /**
     * Delete building.
     */
    public function destroyGedung(int $id): JsonResponse
    {
        $gedung = Gedung::withCount('kamar')->findOrFail($id);
        if ($gedung->kamar_count > 0) {
            return response()->json([
                'status' => 'error',
                'message' => "Gedung ini memiliki {$gedung->kamar_count} kamar terdaftar. Hapus kamar terlebih dahulu.",
            ], 422);
        }

        $gedung->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Gedung berhasil dihapus.',
        ]);
    }

    /**
     * Resolve Google Maps link or coordinates from paste.
     */
    public function resolveGmapsLocation(Request $request): JsonResponse
    {
        $input = trim((string) ($request->input('url', '') ?: $request->input('q', '') ?: $request->input('input', '')));
        if (empty($input)) {
            return response()->json([
                'status' => 'error',
                'message' => 'URL atau teks koordinat tidak boleh kosong.',
            ], 422);
        }

        // 1. Direct coordinate match: "-6.8869, 107.5356" or "-6.8869 107.5356" or "(-6.8869, 107.5356)"
        if (preg_match('/(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/', $input, $m)) {
            $lat = (float) $m[1];
            $lng = (float) $m[2];
            if ($lat >= -90 && $lat <= 90 && $lng >= -180 && $lng <= 180 && (str_contains($m[1], '.') || str_contains($m[2], '.'))) {
                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'latitude' => $lat,
                        'longitude' => $lng,
                        'source' => 'direct_coordinates',
                        'link_gmaps' => "https://www.google.com/maps?q={$lat},{$lng}",
                    ],
                ]);
            }
        }

        // 2. Shortened link or standard URL resolution (maps.app.goo.gl, goo.gl/maps, google.com/maps)
        if (str_contains($input, 'goo.gl') || str_contains($input, 'google.') || str_contains($input, 'maps') || str_contains($input, 'http')) {
            $targetUrl = $input;
            if (! str_starts_with($targetUrl, 'http://') && ! str_starts_with($targetUrl, 'https://')) {
                $targetUrl = 'https://'.ltrim($targetUrl, '/');
            }

            try {
                $response = Http::timeout(6)->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ])->withoutRedirecting()->get($targetUrl);

                $redirectUrl = $response->header('Location');
                $maxHops = 5;
                while ($redirectUrl && $maxHops > 0) {
                    $targetUrl = $redirectUrl;
                    $response = Http::timeout(6)->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    ])->withoutRedirecting()->get($targetUrl);
                    $redirectUrl = $response->header('Location');
                    $maxHops--;
                }

                // Check $targetUrl for coordinates
                if (preg_match('/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/', $targetUrl, $m) ||
                    preg_match('/[?&](?:q|ll|query)=(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/', $targetUrl, $m) ||
                    preg_match('/\/(?:search|place)\/(-?\d{1,2}\.\d+),\+?(-?\d{1,3}\.\d+)/', $targetUrl, $m) ||
                    preg_match('/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/', $targetUrl, $m)) {

                    $lat = (float) $m[1];
                    $lng = (float) $m[2];

                    return response()->json([
                        'status' => 'success',
                        'data' => [
                            'latitude' => $lat,
                            'longitude' => $lng,
                            'source' => 'gmaps_redirect_url',
                            'link_gmaps' => "https://www.google.com/maps?q={$lat},{$lng}",
                        ],
                    ]);
                }

                if (preg_match('/!2d(-?\d{1,3}\.\d+)!3d(-?\d{1,2}\.\d+)/', $targetUrl, $mReverse)) {
                    $lng = (float) $mReverse[1];
                    $lat = (float) $mReverse[2];

                    return response()->json([
                        'status' => 'success',
                        'data' => [
                            'latitude' => $lat,
                            'longitude' => $lng,
                            'source' => 'gmaps_redirect_url',
                            'link_gmaps' => "https://www.google.com/maps?q={$lat},{$lng}",
                        ],
                    ]);
                }

                // Check HTML body for meta or canonical coords
                $body = (string) $response->body();
                if (! empty($body)) {
                    if (preg_match('/@(-?\d{1,2}\.\d+),(-?\d{1,3}\.\d+)/', $body, $m) ||
                        preg_match('/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/', $body, $m)) {
                        $lat = (float) $m[1];
                        $lng = (float) $m[2];

                        return response()->json([
                            'status' => 'success',
                            'data' => [
                                'latitude' => $lat,
                                'longitude' => $lng,
                                'source' => 'gmaps_html_meta',
                                'link_gmaps' => "https://www.google.com/maps?q={$lat},{$lng}",
                            ],
                        ]);
                    }
                }
            } catch (\Exception $e) {
                // Silently continue to Nominatim fallback
            }
        }

        // 3. Fallback Nominatim Search with proper User-Agent
        try {
            $nomRes = Http::withHeaders([
                'User-Agent' => 'HomeIn-KostManagement/1.0 (contact: admin@home-in.com)',
            ])->get('https://nominatim.openstreetmap.org/search', [
                'q' => $input,
                'format' => 'json',
                'limit' => 1,
                'countrycodes' => 'id',
            ]);

            if ($nomRes->successful() && ! empty($nomRes->json())) {
                $item = $nomRes->json()[0];

                return response()->json([
                    'status' => 'success',
                    'data' => [
                        'latitude' => (float) $item['lat'],
                        'longitude' => (float) $item['lon'],
                        'display_name' => $item['display_name'],
                        'source' => 'nominatim_search',
                        'link_gmaps' => "https://www.google.com/maps?q={$item['lat']},{$item['lon']}",
                    ],
                ]);
            }
        } catch (\Exception $e) {
            // ignore
        }

        return response()->json([
            'status' => 'error',
            'message' => 'Koordinat tidak ditemukan dari link atau pencarian tersebut. Pastikan format angka koordinat (contoh: -6.8869, 107.5356) atau buka Google Maps lalu klik kanan titik lokasi gedung.',
        ], 404);
    }
}
