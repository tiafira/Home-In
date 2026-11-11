<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Notifikasi;
use App\Models\Paket;
use App\Models\Penghuni;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class PaketController extends Controller
{
    /**
     * Get list of packages with status filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all'); // all | belum_diambil | sudah_diambil
        $search = $request->query('search', '');

        $query = Paket::with(['penghuni.user', 'penghuni.kamar', 'kamar', 'diterimaOleh']);

        $counts = [
            'all' => Paket::count(),
            'belum_diambil' => Paket::where('status', 'belum_diambil')->count(),
            'sudah_diambil' => Paket::where('status', 'sudah_diambil')->count(),
        ];

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nama_penerima', 'like', "%{$search}%")
                    ->orWhere('nomor_kamar', 'like', "%{$search}%")
                    ->orWhere('no_resi', 'like', "%{$search}%")
                    ->orWhere('ekspedisi', 'like', "%{$search}%")
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
            });
        }

        $paket = $query->orderBy('created_at', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $paket,
        ]);
    }

    /**
     * Store incoming package.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama_penerima' => 'required|string|max:100',
            'nomor_kamar' => 'nullable|string|max:50',
            'penghuni_id' => 'nullable|exists:penghuni,id',
            'kamar_id' => 'nullable|exists:kamar,id',
            'ekspedisi' => 'required|string|max:50',
            'no_resi' => 'nullable|string|max:100',
            'foto_paket' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120', // max 5MB
            'catatan' => 'nullable|string|max:500',
            'waktu_tiba' => 'nullable|date',
        ]);

        $fotoUrl = null;
        if ($request->hasFile('foto_paket')) {
            $path = $request->file('foto_paket')->store('paket', 'public');
            $fotoUrl = Storage::url($path);
        }

        // If penghuni_id provided, autofill kamar_id & nomor_kamar if empty
        if (! empty($validated['penghuni_id']) && empty($validated['kamar_id'])) {
            $penghuni = Penghuni::with('kamar')->find($validated['penghuni_id']);
            if ($penghuni && $penghuni->kamar) {
                $validated['kamar_id'] = $penghuni->kamar_id;
                $validated['nomor_kamar'] = $penghuni->kamar->nomor_kamar;
            }
        }

        $paket = Paket::create([
            'penghuni_id' => $validated['penghuni_id'] ?? null,
            'kamar_id' => $validated['kamar_id'] ?? null,
            'nama_penerima' => $validated['nama_penerima'],
            'nomor_kamar' => $validated['nomor_kamar'] ?? null,
            'ekspedisi' => $validated['ekspedisi'],
            'no_resi' => $validated['no_resi'] ?? null,
            'foto_paket' => $fotoUrl,
            'status' => 'belum_diambil',
            'waktu_tiba' => $validated['waktu_tiba'] ?? now(),
            'diterima_oleh' => auth()->id(),
            'catatan' => $validated['catatan'] ?? null,
        ]);

        // Send in-app notification to tenant if linked
        if ($paket->penghuni_id) {
            $p = Penghuni::with('user')->find($paket->penghuni_id);
            if ($p && $p->user_id) {
                Notifikasi::create([
                    'user_id' => $p->user_id,
                    'judul' => 'Paket Anda Telah Tiba!',
                    'pesan' => "Paket kiriman {$paket->ekspedisi} telah tiba di pos pengelola kost. Silakan ambil paket Anda.",
                    'tipe' => 'info',
                    'sudah_dibaca' => false,
                ]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Penerimaan paket berhasil dicatat.',
            'data' => $paket->load(['penghuni.user', 'kamar']),
        ], 201);
    }

    /**
     * Mark package as picked up.
     */
    public function markDiambil(int $id): JsonResponse
    {
        $paket = Paket::findOrFail($id);

        $paket->status = 'sudah_diambil';
        $paket->waktu_diambil = now();
        $paket->save();

        return response()->json([
            'status' => 'success',
            'message' => 'Paket berhasil ditandai telah diambil.',
            'data' => $paket,
        ]);
    }

    /**
     * Update package info.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $paket = Paket::findOrFail($id);

        $validated = $request->validate([
            'nama_penerima' => 'required|string|max:100',
            'nomor_kamar' => 'nullable|string|max:50',
            'penghuni_id' => 'nullable|exists:penghuni,id',
            'ekspedisi' => 'required|string|max:50',
            'no_resi' => 'nullable|string|max:100',
            'foto_paket' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
            'catatan' => 'nullable|string|max:500',
            'status' => 'required|in:belum_diambil,sudah_diambil',
        ]);

        if ($request->hasFile('foto_paket')) {
            $path = $request->file('foto_paket')->store('paket', 'public');
            $validated['foto_paket'] = Storage::url($path);
        }

        if ($validated['status'] === 'sudah_diambil' && ! $paket->waktu_diambil) {
            $validated['waktu_diambil'] = now();
        }

        $paket->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Data paket berhasil diperbarui.',
            'data' => $paket->load(['penghuni.user', 'kamar']),
        ]);
    }

    /**
     * Soft delete package.
     */
    public function destroy(int $id): JsonResponse
    {
        $paket = Paket::findOrFail($id);
        $paket->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Data paket berhasil dipindahkan ke menu "Baru Saja Dihapus".',
        ]);
    }
}
