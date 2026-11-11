<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Fasilitas;
use App\Models\Notifikasi;
use App\Models\Penghuni;
use App\Models\ReservasiFasilitas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReservasiFasilitasController extends Controller
{
    /**
     * Get list of facility reservations with filtering.
     */
    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status', 'all'); // all | menunggu | disetujui | ditolak | selesai
        $fasilitasId = $request->query('fasilitas_id');
        $tanggal = $request->query('tanggal');
        $search = $request->query('search', '');

        $query = ReservasiFasilitas::with(['fasilitas', 'penghuni.user', 'penghuni.kamar', 'user', 'disetujuiOleh']);

        $counts = [
            'all' => ReservasiFasilitas::count(),
            'menunggu' => ReservasiFasilitas::where('status', 'menunggu')->count(),
            'disetujui' => ReservasiFasilitas::where('status', 'disetujui')->count(),
            'ditolak' => ReservasiFasilitas::where('status', 'ditolak')->count(),
            'selesai' => ReservasiFasilitas::where('status', 'selesai')->count(),
        ];

        if ($status && $status !== 'all') {
            $query->where('status', $status);
        }

        if ($fasilitasId) {
            $query->where('fasilitas_id', $fasilitasId);
        }

        if ($tanggal) {
            $query->whereDate('tanggal', $tanggal);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('keperluan', 'like', "%{$search}%")
                    ->orWhereHas('fasilitas', fn ($fq) => $fq->where('nama_fasilitas', 'like', "%{$search}%"))
                    ->orWhereHas('penghuni.user', fn ($uq) => $uq->where('nama', 'like', "%{$search}%")->orWhere('name', 'like', "%{$search}%"));
            });
        }

        $reservasi = $query->orderBy('tanggal', 'desc')->orderBy('jam_mulai', 'desc')->get();
        $fasilitasList = Fasilitas::select('id', 'nama_fasilitas', 'tipe')->get();

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'fasilitas_list' => $fasilitasList,
            'data' => $reservasi,
        ]);
    }

    /**
     * Create facility reservation (Admin or on behalf of tenant).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'fasilitas_id' => 'required|exists:fasilitas,id',
            'penghuni_id' => 'nullable|exists:penghuni,id',
            'tanggal' => 'required|date|after_or_equal:today',
            'jam_mulai' => 'required|date_format:H:i',
            'jam_selesai' => 'required|date_format:H:i|after:jam_mulai',
            'jumlah_orang' => 'required|integer|min:1|max:50',
            'keperluan' => 'required|string|max:255',
            'catatan_admin' => 'nullable|string|max:500',
            'status' => 'nullable|in:menunggu,disetujui',
        ]);

        // Check if there is collision with existing approved reservation on same facility
        $collision = ReservasiFasilitas::where('fasilitas_id', $validated['fasilitas_id'])
            ->where('tanggal', $validated['tanggal'])
            ->where('status', 'disetujui')
            ->where(function ($q) use ($validated) {
                $q->whereBetween('jam_mulai', [$validated['jam_mulai'], $validated['jam_selesai']])
                    ->orWhereBetween('jam_selesai', [$validated['jam_mulai'], $validated['jam_selesai']])
                    ->orWhere(function ($sub) use ($validated) {
                        $sub->where('jam_mulai', '<=', $validated['jam_mulai'])
                            ->where('jam_selesai', '>=', $validated['jam_selesai']);
                    });
            })
            ->exists();

        if ($collision && ($validated['status'] ?? 'menunggu') === 'disetujui') {
            return response()->json([
                'status' => 'error',
                'message' => 'Jadwal fasilitas ini bertabrakan dengan reservasi lain yang sudah disetujui pada jam tersebut.',
            ], 422);
        }

        $userId = null;
        if (! empty($validated['penghuni_id'])) {
            $penghuni = Penghuni::find($validated['penghuni_id']);
            $userId = $penghuni?->user_id;
        }

        $status = $validated['status'] ?? 'disetujui';

        $reservasi = ReservasiFasilitas::create([
            'fasilitas_id' => $validated['fasilitas_id'],
            'penghuni_id' => $validated['penghuni_id'] ?? null,
            'user_id' => $userId ?? auth()->id(),
            'tanggal' => $validated['tanggal'],
            'jam_mulai' => $validated['jam_mulai'],
            'jam_selesai' => $validated['jam_selesai'],
            'jumlah_orang' => $validated['jumlah_orang'],
            'keperluan' => $validated['keperluan'],
            'status' => $status,
            'catatan_admin' => $validated['catatan_admin'] ?? null,
            'disetujui_oleh' => $status === 'disetujui' ? auth()->id() : null,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Reservasi fasilitas berhasil dibuat.',
            'data' => $reservasi->load(['fasilitas', 'penghuni.user']),
        ], 201);
    }

    /**
     * Approve reservation.
     */
    public function approve(Request $request, int $id): JsonResponse
    {
        $reservasi = ReservasiFasilitas::with(['fasilitas', 'penghuni.user'])->findOrFail($id);

        // Check collision before approving
        $collision = ReservasiFasilitas::where('fasilitas_id', $reservasi->fasilitas_id)
            ->where('id', '!=', $reservasi->id)
            ->where('tanggal', $reservasi->tanggal)
            ->where('status', 'disetujui')
            ->where(function ($q) use ($reservasi) {
                $q->whereBetween('jam_mulai', [$reservasi->jam_mulai, $reservasi->jam_selesai])
                    ->orWhereBetween('jam_selesai', [$reservasi->jam_mulai, $reservasi->jam_selesai]);
            })
            ->exists();

        if ($collision) {
            return response()->json([
                'status' => 'error',
                'message' => 'Tidak dapat menyetujui: ada reservasi lain yang telah disetujui pada jam tersebut.',
            ], 422);
        }

        $reservasi->status = 'disetujui';
        $reservasi->disetujui_oleh = auth()->id();
        $reservasi->save();

        if ($reservasi->user_id) {
            Notifikasi::create([
                'user_id' => $reservasi->user_id,
                'judul' => 'Reservasi Fasilitas Disetujui',
                'pesan' => "Pengajuan reservasi {$reservasi->fasilitas?->nama_fasilitas} untuk tanggal {$reservasi->tanggal->format('d/m/Y')} ({$reservasi->jam_mulai} - {$reservasi->jam_selesai}) telah disetujui.",
                'tipe' => 'info',
                'sudah_dibaca' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Reservasi fasilitas berhasil disetujui.',
            'data' => $reservasi,
        ]);
    }

    /**
     * Reject reservation.
     */
    public function reject(Request $request, int $id): JsonResponse
    {
        $reservasi = ReservasiFasilitas::with(['fasilitas', 'penghuni.user'])->findOrFail($id);

        $validated = $request->validate([
            'alasan' => 'required|string|max:255',
        ]);

        $reservasi->status = 'ditolak';
        $reservasi->catatan_admin = $validated['alasan'];
        $reservasi->save();

        if ($reservasi->user_id) {
            Notifikasi::create([
                'user_id' => $reservasi->user_id,
                'judul' => 'Reservasi Fasilitas Ditolak',
                'pesan' => "Mohon maaf, reservasi {$reservasi->fasilitas?->nama_fasilitas} Anda ditolak. Alasan: {$validated['alasan']}",
                'tipe' => 'peringatan',
                'sudah_dibaca' => false,
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Reservasi fasilitas telah ditolak.',
            'data' => $reservasi,
        ]);
    }

    /**
     * Soft delete reservation.
     */
    public function destroy(int $id): JsonResponse
    {
        $reservasi = ReservasiFasilitas::findOrFail($id);
        $reservasi->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Data reservasi fasilitas berhasil dipindahkan ke menu "Baru Saja Dihapus".',
        ]);
    }
}
