<?php

namespace App\Http\Controllers\Api\Public;

use App\Http\Controllers\Controller;
use App\Models\Cabang;
use App\Models\Faq;
use App\Models\Fasilitas;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Services\BookingAvailabilityService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicContentController extends Controller
{
    /**
     * Data agregat untuk Halaman Beranda publik.
     */
    public function beranda(): JsonResponse
    {
        // 1. Min price kamar across all branches
        $minPrice = Kamar::where('status', 'kosong')->min('harga_bulanan')
            ?? Kamar::min('harga_bulanan')
            ?? 600000;

        // 2. Daftar cabang dengan info kamar kosong & gedung
        $cabangList = Cabang::with(['gedung.kamar' => function ($q): void {
            $q->select('id', 'gedung_id', 'status', 'harga_bulanan');
        }])->get()->map(function ($cabang) {
            $allRooms = $cabang->gedung->flatMap->kamar;
            $kosongCount = $allRooms->where('status', 'kosong')->count();
            $totalCount = $allRooms->count();
            $minCabangPrice = $allRooms->min('harga_bulanan') ?? 600000;

            return [
                'id' => $cabang->id,
                'nama_cabang' => $cabang->nama_cabang,
                'alamat' => $cabang->alamat,
                'latitude' => $cabang->latitude,
                'longitude' => $cabang->longitude,
                'jumlah_gedung' => $cabang->gedung->count(),
                'jumlah_kamar' => $totalCount,
                'kamar_kosong_count' => $kosongCount,
                'harga_mulai' => (float) $minCabangPrice,
                'no_wa' => $cabang->no_wa,
            ];
        });

        // 3. Daftar seluruh gedung kost (Gedung Kost)
        $gedungList = Gedung::with([
            'cabang',
            'kamar' => function ($q): void {
                $q->select('id', 'gedung_id', 'nomor_kamar', 'lantai', 'status', 'harga_bulanan')
                    ->with('kamarFoto');
            },
        ])->get()->map(function ($g) {
            $totalKamar = $g->kamar->count();
            $kamarKosong = $g->kamar->where('status', 'kosong')->count();
            $minHarga = $g->kamar->min('harga_bulanan') ?? 600000;
            // First photo from gedung or from first room
            $foto = $g->url_foto ?: $g->foto ?: $g->kamar->flatMap->kamarFoto->first()?->url_foto;

            return [
                'id' => $g->id,
                'nama_gedung' => $g->nama_gedung,
                'foto' => $foto,
                'jumlah_lantai' => $g->jumlah_lantai,
                'alamat' => $g->alamat ?: $g->cabang?->alamat ?: 'Alamat belum diatur',
                'cabang_nama' => $g->cabang?->nama_cabang,
                'jumlah_kamar' => $totalKamar,
                'kamar_kosong_count' => $kamarKosong,
                'harga_mulai' => (float) $minHarga,
                'link_gmaps' => $g->link_gmaps,
            ];
        });

        // 4. Kamar pilihan (prioritaskan kosong, ambil dari seluruh lantai & gedung)
        $kamarPilihan = Kamar::with([
            'gedung.cabang',
            'kamarFoto',
            'kamarFasilitas.fasilitas',
        ])
            ->where('status', 'kosong')
            ->orderBy('gedung_id', 'asc')
            ->orderBy('lantai', 'asc')
            ->orderBy('harga_bulanan', 'asc')
            ->take(50)
            ->get();

        // Jika kamar kosong kurang dari 4, ambil juga yang lainnya untuk display
        if ($kamarPilihan->count() < 4) {
            $kamarPilihan = Kamar::with([
                'gedung.cabang',
                'kamarFoto',
                'kamarFasilitas.fasilitas',
            ])
                ->orderBy('gedung_id', 'asc')
                ->orderBy('lantai', 'asc')
                ->orderByRaw("FIELD(status, 'kosong', 'dibooking', 'terisi', 'maintenance')")
                ->take(50)
                ->get();
        }

        // 5. FAQ ringkas (top 5)
        $faqs = Faq::orderBy('urutan', 'asc')->take(5)->get();

        // 6. Fasilitas umum kost
        $fasilitasPopuler = Fasilitas::where('tipe', 'default')->take(6)->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'stats' => [
                    'harga_mulai' => (float) $minPrice,
                    'total_cabang' => $cabangList->count(),
                    'total_gedung' => $gedungList->count(),
                    'total_kamar_kosong' => $cabangList->sum('kamar_kosong_count'),
                ],
                'cabang' => $cabangList,
                'gedung' => $gedungList,
                'kamar_pilihan' => $kamarPilihan,
                'faqs' => $faqs,
                'fasilitas_populer' => $fasilitasPopuler,
            ],
        ]);
    }

    /**
     * Daftar seluruh cabang beserta statistik kamar dan gedung.
     */
    public function cabang(): JsonResponse
    {
        $cabang = Cabang::with([
            'gedung' => function ($g): void {
                $g->withCount([
                    'kamar',
                    'kamar as kamar_kosong_count' => function ($k): void {
                        $k->where('status', 'kosong');
                    },
                ]);
            },
        ])->get()->map(function ($c) {
            $totalKamar = $c->gedung->sum('kamar_count');
            $kamarKosong = $c->gedung->sum('kamar_kosong_count');

            return [
                'id' => $c->id,
                'nama_cabang' => $c->nama_cabang,
                'alamat' => $c->alamat,
                'latitude' => $c->latitude,
                'longitude' => $c->longitude,
                'jam_operasional_mulai' => $c->jam_operasional_mulai,
                'jam_operasional_selesai' => $c->jam_operasional_selesai,
                'jam_malam' => $c->jam_malam,
                'no_wa' => $c->no_wa,
                'email_cabang' => $c->email_cabang,
                'jumlah_gedung' => $c->gedung->count(),
                'total_kamar' => $totalKamar,
                'kamar_kosong' => $kamarKosong,
                'gedung' => $c->gedung->map(fn ($g) => [
                    'id' => $g->id,
                    'nama_gedung' => $g->nama_gedung,
                    'jumlah_lantai' => $g->jumlah_lantai,
                    'alamat' => $g->alamat,
                    'kamar_count' => $g->kamar_count,
                    'kamar_kosong_count' => $g->kamar_kosong_count,
                ]),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $cabang,
        ]);
    }

    /**
     * Detail satu cabang dengan daftar gedung dan kamar yang tersedia.
     */
    public function cabangDetail(int $id): JsonResponse
    {
        $cabang = Cabang::with([
            'gedung.kamar' => function ($q): void {
                $q->with(['kamarFoto', 'kamarFasilitas.fasilitas']);
            },
        ])->findOrFail($id);

        $allRooms = $cabang->gedung->flatMap->kamar;

        return response()->json([
            'status' => 'success',
            'data' => [
                'cabang' => [
                    'id' => $cabang->id,
                    'nama_cabang' => $cabang->nama_cabang,
                    'alamat' => $cabang->alamat,
                    'latitude' => $cabang->latitude,
                    'longitude' => $cabang->longitude,
                    'jam_operasional_mulai' => $cabang->jam_operasional_mulai,
                    'jam_operasional_selesai' => $cabang->jam_operasional_selesai,
                    'jam_malam' => $cabang->jam_malam,
                    'nama_bank' => $cabang->nama_bank,
                    'no_rekening' => $cabang->no_rekening,
                    'nama_pemilik_rekening' => $cabang->nama_pemilik_rekening,
                    'qr_pembayaran' => $cabang->qr_pembayaran,
                    'no_wa' => $cabang->no_wa,
                    'email_cabang' => $cabang->email_cabang,
                    'total_kamar' => $allRooms->count(),
                    'kamar_kosong' => $allRooms->where('status', 'kosong')->count(),
                ],
                'gedung' => $cabang->gedung,
            ],
        ]);
    }

    /**
     * Daftar kamar publik dengan filter lengkap (cabang, gedung, lantai, harga, fasilitas, hanya_kosong) & sorting.
     */
    public function kamar(Request $request): JsonResponse
    {
        $query = Kamar::with([
            'gedung.cabang',
            'kamarFoto',
            'kamarFasilitas.fasilitas',
        ]);

        // Filter: Cabang
        if ($request->filled('cabang_id')) {
            $cabangId = $request->input('cabang_id');
            $query->whereHas('gedung', function ($q) use ($cabangId): void {
                $q->where('cabang_id', $cabangId);
            });
        }

        // Filter: Gedung
        if ($request->filled('gedung_id')) {
            $query->where('gedung_id', $request->input('gedung_id'));
        }

        // Filter: Lantai
        if ($request->filled('lantai')) {
            $query->where('lantai', $request->input('lantai'));
        }

        // Filter: Rentang Harga
        if ($request->filled('min_harga')) {
            $query->where('harga_bulanan', '>=', (float) $request->input('min_harga'));
        }
        if ($request->filled('max_harga')) {
            $query->where('harga_bulanan', '<=', (float) $request->input('max_harga'));
        }

        // Filter: Hanya Kosong / Dapat Dibooking (tidak memiliki penghuni aktif)
        if ($request->boolean('hanya_kosong') || $request->boolean('hanya_dapat_dibooking')) {
            $query->dapatDibooking();
        }

        // Filter: Fasilitas (Array of fasilitas_id)
        if ($request->filled('fasilitas')) {
            $fasilitasIds = is_array($request->input('fasilitas'))
                ? $request->input('fasilitas')
                : explode(',', $request->input('fasilitas'));

            foreach ($fasilitasIds as $fid) {
                if ($fid) {
                    $query->whereHas('kamarFasilitas', function ($q) use ($fid): void {
                        $q->where('fasilitas_id', $fid);
                    });
                }
            }
        }

        // Search: Nomor kamar / nama gedung / alamat gedung (daerah) / nama cabang / alamat cabang
        if ($request->filled('q')) {
            $rawSearch = trim($request->input('q'));
            $stopWords = ['kost', 'kos', 'sewa'];
            $words = array_values(array_filter(explode(' ', $rawSearch), fn ($w) => ! empty($w)));
            $meaningfulWords = array_values(array_filter($words, fn ($w) => ! in_array(mb_strtolower($w), $stopWords)));
            $tokens = ! empty($meaningfulWords) ? $meaningfulWords : $words;

            $query->where(function ($q) use ($rawSearch, $tokens): void {
                // Exact full search match
                $q->where('nomor_kamar', 'like', "%{$rawSearch}%")
                    ->orWhereHas('gedung', function ($gq) use ($rawSearch): void {
                        $gq->where('nama_gedung', 'like', "%{$rawSearch}%")
                            ->orWhere('alamat', 'like', "%{$rawSearch}%")
                            ->orWhereHas('cabang', function ($cq) use ($rawSearch): void {
                                $cq->where('nama_cabang', 'like', "%{$rawSearch}%")
                                    ->orWhere('alamat', 'like', "%{$rawSearch}%");
                            });
                    });

                // Match individual tokens across gedung name, address, room number
                if (count($tokens) > 0) {
                    $q->orWhere(function ($subQ) use ($tokens): void {
                        foreach ($tokens as $token) {
                            $subQ->where(function ($tokenQ) use ($token): void {
                                $tokenQ->where('nomor_kamar', 'like', "%{$token}%")
                                    ->orWhereHas('gedung', function ($gq) use ($token): void {
                                        $gq->where('nama_gedung', 'like', "%{$token}%")
                                            ->orWhere('alamat', 'like', "%{$token}%")
                                            ->orWhereHas('cabang', function ($cq) use ($token): void {
                                                $cq->where('nama_cabang', 'like', "%{$token}%")
                                                    ->orWhere('alamat', 'like', "%{$token}%");
                                            });
                                    });
                            });
                        }
                    });
                }
            });
        }

        // Filter: Pencarian spesifik daerah/lokasi
        if ($request->filled('daerah')) {
            $daerah = trim($request->input('daerah'));
            $query->where(function ($q) use ($daerah): void {
                $q->whereHas('gedung', function ($gq) use ($daerah): void {
                    $gq->where('alamat', 'like', "%{$daerah}%")
                        ->orWhereHas('cabang', function ($cq) use ($daerah): void {
                            $cq->where('alamat', 'like', "%{$daerah}%");
                        });
                });
            });
        }

        // Sorting
        $sort = $request->input('sort', 'rekomendasi');
        match ($sort) {
            'harga_asc' => $query->orderBy('harga_bulanan', 'asc'),
            'harga_desc' => $query->orderBy('harga_bulanan', 'desc'),
            'nomor_asc' => $query->orderBy('nomor_kamar', 'asc'),
            'terbaru' => $query->orderBy('created_at', 'desc'),
            default => $query->orderByRaw("FIELD(status, 'kosong', 'dibooking', 'terisi', 'maintenance')")
                ->orderBy('harga_bulanan', 'asc'),
        };

        $kamars = $query->paginate($request->input('per_page', 12));

        return response()->json([
            'status' => 'success',
            'data' => $kamars,
        ]);
    }

    /**
     * Detail lengkap satu kamar untuk Halaman Detail Kamar.
     */
    public function kamarDetail(int $id): JsonResponse
    {
        $kamar = Kamar::with([
            'gedung.cabang',
            'kamarFoto',
            'kamarFasilitas.fasilitas',
        ])->findOrFail($id);

        // Ambil juga semua fasilitas tipe 'tambahan' yang dapat di-request
        $fasilitasTambahanTersedia = Fasilitas::where('tipe', 'tambahan')->get();

        // Pisahkan fasilitas yang sudah ada di kamar: default vs tambahan
        $fasilitasDefault = [];
        $fasilitasTambahanTerpasang = [];

        foreach ($kamar->kamarFasilitas as $kf) {
            if (! $kf->fasilitas) {
                continue;
            }

            if ($kf->fasilitas->tipe === 'default') {
                $fasilitasDefault[] = $kf->fasilitas;
            } else {
                $fasilitasTambahanTerpasang[] = [
                    'fasilitas' => $kf->fasilitas,
                    'status_request' => $kf->status_request,
                ];
            }
        }

        // Rekomendasi kamar lain di cabang/gedung yang sama
        $rekomendasiKamar = Kamar::with(['gedung.cabang', 'kamarFoto'])
            ->where('id', '!=', $kamar->id)
            ->whereHas('gedung', function ($q) use ($kamar): void {
                $q->where('cabang_id', $kamar->gedung->cabang_id);
            })
            ->where('status', 'kosong')
            ->take(3)
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'kamar' => $kamar,
                'bisa_dibooking' => ! app(BookingAvailabilityService::class)->hasActiveTenant($kamar) && $kamar->status !== 'maintenance',
                'fasilitas_default' => $fasilitasDefault,
                'fasilitas_tambahan_terpasang' => $fasilitasTambahanTerpasang,
                'fasilitas_tambahan_tersedia' => $fasilitasTambahanTersedia,
                'rekomendasi' => $rekomendasiKamar,
            ],
        ]);
    }

    /**
     * Cek ketersediaan kamar & hitung opsi durasi sewa maksimal yang muat.
     */
    public function kamarKetersediaan(Request $request, int $id, BookingAvailabilityService $availabilityService): JsonResponse
    {
        $kamar = Kamar::with('gedung.cabang')->findOrFail($id);
        $tanggalMulai = $request->input('tanggal_mulai', now()->toDateString());
        $durasiBulan = (int) $request->input('durasi_bulan', 1);

        $check = $availabilityService->checkKamarAvailability($kamar, $tanggalMulai, $durasiBulan);

        return response()->json([
            'status' => 'success',
            'data' => $check,
        ]);
    }

    /**
     * Master data filter untuk halaman listing kamar.
     */
    public function filterOptions(): JsonResponse
    {
        $cabangList = Cabang::select('id', 'nama_cabang', 'alamat')->get();
        $gedungList = Gedung::select('id', 'cabang_id', 'nama_gedung', 'alamat', 'jumlah_lantai')->get();
        $fasilitas = Fasilitas::select('id', 'nama_fasilitas', 'tipe', 'biaya_tambahan')->get();

        $daerahList = Gedung::whereNotNull('alamat')
            ->where('alamat', '!=', '')
            ->pluck('alamat')
            ->map(fn ($a) => trim($a))
            ->unique()
            ->values();

        $maxPrice = Kamar::max('harga_bulanan') ?? 3000000;
        $minPrice = Kamar::min('harga_bulanan') ?? 500000;

        return response()->json([
            'status' => 'success',
            'data' => [
                'cabang' => $cabangList,
                'gedung' => $gedungList,
                'daerah' => $daerahList,
                'fasilitas' => $fasilitas,
                'rentang_harga' => [
                    'min' => (float) $minPrice,
                    'max' => (float) $maxPrice,
                ],
            ],
        ]);
    }

    /**
     * FAQ Publik (dapat difilter per cabang_id).
     */
    public function faq(Request $request): JsonResponse
    {
        $query = Faq::query();

        if ($request->filled('cabang_id')) {
            $query->where(function ($q) use ($request): void {
                $q->where('cabang_id', $request->input('cabang_id'))
                    ->orWhereNull('cabang_id');
            });
        }

        $faqs = $query->orderBy('urutan', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $faqs,
        ]);
    }

    /**
     * Data Kontak dan Cabang untuk Halaman Kontak.
     */
    public function kontak(): JsonResponse
    {
        $cabangs = Cabang::select([
            'id', 'nama_cabang', 'alamat', 'latitude', 'longitude',
            'jam_operasional_mulai', 'jam_operasional_selesai',
            'jam_malam', 'no_wa', 'email_cabang',
        ])->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'pusat' => [
                    'telepon' => '0812-3456-7890',
                    'whatsapp' => '0812-3456-7890',
                    'email' => 'halo@home-in.com',
                    'jam_operasional' => '08:00 - 21:00 WIB',
                ],
                'cabangs' => $cabangs,
            ],
        ]);
    }
}
