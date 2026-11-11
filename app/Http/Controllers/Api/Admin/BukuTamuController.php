<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\LaporanTamu;
use App\Models\Penghuni;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BukuTamuController extends Controller
{
    /**
     * Get list of visitors with status and date filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all'); // all | sedang_berkunjung | sudah_pulang
        $search = $request->query('search', '');
        $tanggal = $request->query('tanggal', '');

        $query = LaporanTamu::with(['penghuni.user', 'penghuni.kamar', 'kamar']);

        $counts = [
            'all' => LaporanTamu::count(),
            'sedang_berkunjung' => LaporanTamu::where('status', 'sedang_berkunjung')->count(),
            'sudah_pulang' => LaporanTamu::where('status', 'sudah_pulang')->count(),
        ];

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($tanggal) {
            $query->whereDate('tanggal', $tanggal);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nama_tamu', 'like', "%{$search}%")
                    ->orWhere('no_hp_tamu', 'like', "%{$search}%")
                    ->orWhere('keperluan', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"))
                    ->orWhereHas('penghuni.kamar', fn ($kq) => $kq->where('nomor_kamar', 'like', "%{$search}%"));
            });
        }

        $tamu = $query->orderBy('tanggal', 'desc')->orderBy('jam_masuk', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $tamu,
        ]);
    }

    /**
     * Record new visitor.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_tamu' => 'required|string|max:100',
            'no_hp_tamu' => 'nullable|string|max:30',
            'jumlah_tamu' => 'required|integer|min:1|max:20',
            'penghuni_id' => 'required|exists:penghuni,id',
            'keperluan' => 'required|string|max:255',
            'tanggal' => 'required|date',
            'jam_masuk' => 'required|string',
            'foto_identitas' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120', // max 5MB
        ]);

        $fotoUrl = null;
        if ($request->hasFile('foto_identitas')) {
            $path = $request->file('foto_identitas')->store('tamu', 'public');
            $fotoUrl = Storage::url($path);
        }

        $penghuni = Penghuni::with('kamar')->findOrFail($validated['penghuni_id']);

        $tamu = LaporanTamu::create([
            'penghuni_id' => $penghuni->id,
            'kamar_id' => $penghuni->kamar_id,
            'nama_tamu' => $validated['nama_tamu'],
            'no_hp_tamu' => $validated['no_hp_tamu'] ?? null,
            'jumlah_tamu' => $validated['jumlah_tamu'],
            'keperluan' => $validated['keperluan'],
            'foto_identitas' => $fotoUrl,
            'tanggal' => $validated['tanggal'],
            'jam_masuk' => $validated['jam_masuk'],
            'jam_keluar' => null,
            'status' => 'sedang_berkunjung',
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Kunjungan tamu berhasil dicatat.',
            'data' => $tamu->load(['penghuni.user', 'penghuni.kamar']),
        ], 201);
    }

    /**
     * Record visitor checkout.
     */
    public function checkout(Request $request, int $id): JsonResponse
    {
        $tamu = LaporanTamu::findOrFail($id);

        $tamu->jam_keluar = now()->format('H:i:s');
        $tamu->status = 'sudah_pulang';
        $tamu->save();

        return response()->json([
            'status' => 'success',
            'message' => "Kepulangan tamu {$tamu->nama_tamu} berhasil dicatat.",
            'data' => $tamu,
        ]);
    }

    /**
     * Update visitor record.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $tamu = LaporanTamu::findOrFail($id);

        $validated = $request->validate([
            'nama_tamu' => 'required|string|max:100',
            'no_hp_tamu' => 'nullable|string|max:30',
            'jumlah_tamu' => 'required|integer|min:1',
            'penghuni_id' => 'required|exists:penghuni,id',
            'keperluan' => 'required|string|max:255',
            'tanggal' => 'required|date',
            'jam_masuk' => 'required|string',
            'jam_keluar' => 'nullable|string',
            'status' => 'required|in:sedang_berkunjung,sudah_pulang',
            'foto_identitas' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        if ($request->hasFile('foto_identitas')) {
            $path = $request->file('foto_identitas')->store('tamu', 'public');
            $validated['foto_identitas'] = Storage::url($path);
        }

        $penghuni = Penghuni::findOrFail($validated['penghuni_id']);
        $validated['kamar_id'] = $penghuni->kamar_id;

        $tamu->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Data buku tamu berhasil diperbarui.',
            'data' => $tamu->load(['penghuni.user', 'penghuni.kamar']),
        ]);
    }

    /**
     * Soft delete visitor record.
     */
    public function destroy(int $id): JsonResponse
    {
        $tamu = LaporanTamu::findOrFail($id);
        $tamu->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Data tamu berhasil dipindahkan ke menu "Baru Saja Dihapus".',
        ]);
    }
}
