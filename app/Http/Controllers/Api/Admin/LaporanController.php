<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Komplain;
use App\Models\LaporanPulang;
use App\Models\LaporanTamu;
use App\Models\Paket;
use App\Models\Pembayaran;
use App\Models\Peringatan;
use App\Models\ReservasiFasilitas;
use App\Models\User;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LaporanController extends Controller
{
    /**
     * Pusat Laporan Eksekutif Umum (General Report Hub).
     * Mendukung kategori: keuangan, pengguna, komplain, reservasi, paket, tamu, peringatan.
     */
    public function generalReport(Request $request): JsonResponse
    {
        $kategori = $request->query('kategori', 'keuangan');
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');
        $tanggalMulai = $request->query('tanggal_mulai');
        $tanggalSelesai = $request->query('tanggal_selesai');
        $status = $request->query('status', 'all');

        $data = [];
        $summary = [];

        switch ($kategori) {
            case 'keuangan':
                $query = Pembayaran::with([
                    'penghuni.user',
                    'penghuni.kamar.gedung.cabang',
                    'konfirmator',
                ]);

                if ($branchId) {
                    $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
                }
                if ($tanggalMulai) {
                    $query->whereDate('created_at', '>=', $tanggalMulai);
                }
                if ($tanggalSelesai) {
                    $query->whereDate('created_at', '<=', $tanggalSelesai);
                }
                if ($status && $status !== 'all') {
                    $query->where('status', $status);
                }
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->whereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"))
                            ->orWhereHas('penghuni.kamar', fn ($kq) => $kq->where('nomor_kamar', 'like', "%{$search}%"))
                            ->orWhere('metode_pembayaran', 'like', "%{$search}%");
                    });
                }

                $items = $query->orderBy('created_at', 'desc')->get();
                $totalNominal = (float) $items->sum('jumlah_tagihan');
                $lunasNominal = (float) $items->where('status', 'lunas')->sum('jumlah_tagihan');
                $pendingNominal = (float) $items->whereIn('status', ['belum_bayar', 'menunggu_konfirmasi'])->sum('jumlah_tagihan');

                $summary = [
                    'total_data' => $items->count(),
                    'total_nominal' => $totalNominal,
                    'total_nominal_rp' => 'Rp '.number_format($totalNominal, 0, ',', '.'),
                    'lunas_count' => $items->where('status', 'lunas')->count(),
                    'lunas_nominal_rp' => 'Rp '.number_format($lunasNominal, 0, ',', '.'),
                    'pending_count' => $items->whereIn('status', ['belum_bayar', 'menunggu_konfirmasi'])->count(),
                    'pending_nominal_rp' => 'Rp '.number_format($pendingNominal, 0, ',', '.'),
                ];
                $data = $items;
                break;

            case 'pengguna':
                $query = User::with(['penghuni.kamar.gedung.cabang', 'pegawai']);

                if ($tanggalMulai) {
                    $query->whereDate('created_at', '>=', $tanggalMulai);
                }
                if ($tanggalSelesai) {
                    $query->whereDate('created_at', '<=', $tanggalSelesai);
                }
                if ($status && $status !== 'all') {
                    $query->where('role', $status);
                }
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('nama', 'like', "%{$search}%")
                            ->orWhere('email', 'like', "%{$search}%")
                            ->orWhere('no_hp', 'like', "%{$search}%");
                    });
                }

                $items = $query->orderBy('created_at', 'desc')->get();
                $summary = [
                    'total_data' => $items->count(),
                    'penghuni' => $items->where('role', 'penghuni')->count(),
                    'calon_penghuni' => $items->where('role', 'user')->count(),
                    'karyawan' => $items->whereIn('role', ['pegawai', 'karyawan'])->count(),
                    'admin' => $items->whereIn('role', ['admin', 'pemilik'])->count(),
                ];
                $data = $items;
                break;

            case 'komplain':
                $query = Komplain::with([
                    'penghuni.user',
                    'penghuni.kamar.gedung.cabang',
                    'karyawan.user',
                    'penangan',
                ]);

                if ($branchId) {
                    $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
                }
                if ($tanggalMulai) {
                    $query->whereDate('created_at', '>=', $tanggalMulai);
                }
                if ($tanggalSelesai) {
                    $query->whereDate('created_at', '<=', $tanggalSelesai);
                }
                if ($status && $status !== 'all') {
                    $query->where('status', $status);
                }
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('isi', 'like', "%{$search}%")
                            ->orWhere('kategori', 'like', "%{$search}%")
                            ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"));
                    });
                }

                $items = $query->orderBy('created_at', 'desc')->get();
                $summary = [
                    'total_data' => $items->count(),
                    'menunggu' => $items->where('status', 'menunggu')->count(),
                    'proses' => $items->where('status', 'proses')->count(),
                    'selesai' => $items->where('status', 'selesai')->count(),
                ];
                $data = $items;
                break;

            case 'reservasi':
                $query = ReservasiFasilitas::with([
                    'fasilitas',
                    'penghuni.user',
                    'penghuni.kamar.gedung.cabang',
                    'user',
                ]);

                if ($branchId) {
                    $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
                }
                if ($tanggalMulai) {
                    $query->whereDate('tanggal', '>=', $tanggalMulai);
                }
                if ($tanggalSelesai) {
                    $query->whereDate('tanggal', '<=', $tanggalSelesai);
                }
                if ($status && $status !== 'all') {
                    $query->where('status', $status);
                }
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('keperluan', 'like', "%{$search}%")
                            ->orWhereHas('fasilitas', fn ($fq) => $fq->where('nama_fasilitas', 'like', "%{$search}%"))
                            ->orWhereHas('user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"))
                            ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"));
                    });
                }

                $items = $query->orderBy('tanggal', 'desc')->orderBy('jam_mulai', 'desc')->get();
                $summary = [
                    'total_data' => $items->count(),
                    'menunggu' => $items->where('status', 'menunggu')->count(),
                    'disetujui' => $items->where('status', 'disetujui')->count(),
                    'ditolak' => $items->where('status', 'ditolak')->count(),
                    'selesai' => $items->where('status', 'selesai')->count(),
                ];
                $data = $items;
                break;

            case 'paket':
                $query = Paket::with([
                    'penghuni.user',
                    'penghuni.kamar.gedung.cabang',
                    'kamar.gedung.cabang',
                ]);

                if ($branchId) {
                    $query->whereHas('kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
                }
                if ($tanggalMulai) {
                    $query->whereDate('created_at', '>=', $tanggalMulai);
                }
                if ($tanggalSelesai) {
                    $query->whereDate('created_at', '<=', $tanggalSelesai);
                }
                if ($status && $status !== 'all') {
                    $query->where('status', $status);
                }
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('nama_penerima', 'like', "%{$search}%")
                            ->orWhere('nomor_kamar', 'like', "%{$search}%")
                            ->orWhere('ekspedisi', 'like', "%{$search}%")
                            ->orWhere('no_resi', 'like', "%{$search}%");
                    });
                }

                $items = $query->orderBy('created_at', 'desc')->get();
                $summary = [
                    'total_data' => $items->count(),
                    'belum_diambil' => $items->where('status', 'belum_diambil')->count(),
                    'sudah_diambil' => $items->where('status', 'sudah_diambil')->count(),
                ];
                $data = $items;
                break;

            case 'tamu':
                $query = LaporanTamu::with([
                    'penghuni.user',
                    'penghuni.kamar.gedung.cabang',
                    'kamar',
                ]);

                if ($branchId) {
                    $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
                }
                if ($tanggalMulai) {
                    $query->whereDate('tanggal', '>=', $tanggalMulai);
                }
                if ($tanggalSelesai) {
                    $query->whereDate('tanggal', '<=', $tanggalSelesai);
                }
                if ($status && $status !== 'all') {
                    $query->where('status', $status);
                }
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('nama_tamu', 'like', "%{$search}%")
                            ->orWhere('no_hp_tamu', 'like', "%{$search}%")
                            ->orWhere('keperluan', 'like', "%{$search}%")
                            ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"));
                    });
                }

                $items = $query->orderBy('tanggal', 'desc')->orderBy('jam_masuk', 'desc')->get();
                $summary = [
                    'total_data' => $items->count(),
                    'sedang_berkunjung' => $items->where('status', 'sedang_berkunjung')->count(),
                    'sudah_pulang' => $items->where('status', 'sudah_pulang')->count(),
                ];
                $data = $items;
                break;

            case 'izin':
                $query = \App\Models\IzinKeluar::with([
                    'penghuni.user',
                    'penghuni.kamar.gedung.cabang',
                    'penyetuju',
                ]);

                if ($branchId) {
                    $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
                }
                if ($tanggalMulai) {
                    $query->whereDate('tanggal', '>=', $tanggalMulai);
                }
                if ($tanggalSelesai) {
                    $query->whereDate('tanggal', '<=', $tanggalSelesai);
                }
                if ($status && $status !== 'all') {
                    $query->where('status', $status);
                }
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('alasan', 'like', "%{$search}%")
                            ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"))
                            ->orWhereHas('penghuni.kamar', fn ($kq) => $kq->where('nomor_kamar', 'like', "%{$search}%"));
                    });
                }

                $items = $query->orderBy('tanggal', 'desc')->get();
                $summary = [
                    'total_data' => $items->count(),
                    'menunggu' => $items->where('status', 'menunggu')->count(),
                    'disetujui' => $items->where('status', 'disetujui')->count(),
                    'ditolak' => $items->where('status', 'ditolak')->count(),
                ];
                $data = $items;
                break;

            case 'peringatan':
                $query = Peringatan::with([
                    'penghuni.user',
                    'penghuni.kamar.gedung.cabang',
                ]);

                if ($branchId) {
                    $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
                }
                if ($tanggalMulai) {
                    $query->whereDate('tanggal_kejadian', '>=', $tanggalMulai);
                }
                if ($tanggalSelesai) {
                    $query->whereDate('tanggal_kejadian', '<=', $tanggalSelesai);
                }
                if ($status && $status !== 'all') {
                    $query->where('tingkat_pelanggaran', $status);
                }
                if ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('kategori_pelanggaran', 'like', "%{$search}%")
                            ->orWhere('keterangan', 'like', "%{$search}%")
                            ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
                    });
                }

                $items = $query->orderBy('tanggal_kejadian', 'desc')->get();
                $summary = [
                    'total_data' => $items->count(),
                    'ringan' => $items->where('tingkat_pelanggaran', 'ringan')->count(),
                    'sedang' => $items->where('tingkat_pelanggaran', 'sedang')->count(),
                    'berat' => $items->where('tingkat_pelanggaran', 'berat')->count(),
                ];
                $data = $items;
                break;

            default:
                $data = [];
                $summary = ['total_data' => 0];
                break;
        }

        return response()->json([
            'status' => 'success',
            'kategori' => $kategori,
            'summary' => $summary,
            'data' => $data,
        ]);
    }

    /**
     * Get guest reports (Laporan Tamu).
     */
    public function tamu(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');
        $tanggalMulai = $request->query('tanggal_mulai');
        $tanggalSelesai = $request->query('tanggal_selesai');

        $query = LaporanTamu::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($tanggalMulai) {
            $query->where('tanggal', '>=', $tanggalMulai);
        }
        if ($tanggalSelesai) {
            $query->where('tanggal', '<=', $tanggalSelesai);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nama_tamu', 'like', "%{$search}%")
                    ->orWhere('keperluan', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"));
            });
        }

        $data = $query->orderBy('tanggal', 'desc')->orderBy('jam_masuk', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Store guest report.
     */
    public function storeTamu(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'penghuni_id' => 'required|exists:penghuni,id',
            'nama_tamu' => 'required|string|max:100',
            'keperluan' => 'nullable|string|max:150',
            'tanggal' => 'required|date',
            'jam_masuk' => 'required',
            'jam_keluar' => 'nullable',
        ]);

        $tamu = LaporanTamu::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan kunjungan tamu berhasil dicatat.',
            'data' => $tamu->load(['penghuni.user', 'penghuni.kamar']),
        ], 201);
    }

    /**
     * Update guest checkout time.
     */
    public function checkoutTamu(Request $request, int $id): JsonResponse
    {
        $tamu = LaporanTamu::findOrFail($id);
        $tamu->jam_keluar = now()->format('H:i:s');
        $tamu->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Waktu kepulangan tamu telah dicatat.',
            'data' => $tamu,
        ]);
    }

    /**
     * Get departure/leave-out reports (Laporan Pulang).
     */
    public function pulang(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');
        $jenis = $request->query('jenis', 'all');

        $query = LaporanPulang::with([
            'penghuni.user',
            'penghuni.kamar.gedung.cabang',
        ]);

        if ($branchId) {
            $query->whereHas('penghuni.kamar.gedung', fn ($g) => $g->where('cabang_id', $branchId));
        }

        if ($jenis && $jenis !== 'all') {
            $query->where('jenis', $jenis);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('keterangan', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%"));
            });
        }

        $data = $query->orderBy('tanggal_mulai', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Store departure report.
     */
    public function storePulang(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'penghuni_id' => 'required|exists:penghuni,id',
            'jenis' => 'required|in:pulang_kampung,nginap_di_luar',
            'tanggal_mulai' => 'required|date',
            'tanggal_selesai' => 'required|date|after_or_equal:tanggal_mulai',
            'keterangan' => 'nullable|string',
        ]);

        $pulang = LaporanPulang::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Laporan pulang/menginap berhasil disimpan.',
            'data' => $pulang->load(['penghuni.user', 'penghuni.kamar']),
        ], 201);
    }
}
