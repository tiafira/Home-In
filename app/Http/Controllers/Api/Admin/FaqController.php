<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Faq;
use App\Services\BranchContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FaqController extends Controller
{
    /**
     * Get list of FAQ items.
     */
    public function index(Request $request): JsonResponse
    {
        $branchId = BranchContext::getEffectiveBranchId($request);
        $search = $request->query('search', '');

        $query = Faq::with('cabang');

        if ($branchId) {
            $query->where(function ($q) use ($branchId) {
                $q->where('cabang_id', $branchId)->orWhereNull('cabang_id');
            });
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('pertanyaan', 'like', "%{$search}%")
                    ->orWhere('jawaban', 'like', "%{$search}%");
            });
        }

        $faqs = $query->orderBy('urutan')->orderBy('id', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $faqs,
        ]);
    }

    /**
     * Store new FAQ.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'pertanyaan' => 'required|string|max:255',
            'jawaban' => 'required|string',
            'cabang_id' => 'nullable|exists:cabang,id',
            'urutan' => 'nullable|integer|min:0',
        ]);

        $validated['urutan'] = $validated['urutan'] ?? (Faq::max('urutan') + 1);

        $faq = Faq::create($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $faq->cabang_id,
            'aksi' => 'create_faq',
            'model_type' => 'Faq',
            'model_id' => $faq->id,
            'keterangan' => "Admin menambahkan FAQ baru: \"{$faq->pertanyaan}\"",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'FAQ berhasil ditambahkan.',
            'data' => $faq->load('cabang'),
        ], 201);
    }

    /**
     * Update FAQ item.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $faq = Faq::findOrFail($id);

        $validated = $request->validate([
            'pertanyaan' => 'required|string|max:255',
            'jawaban' => 'required|string',
            'cabang_id' => 'nullable|exists:cabang,id',
            'urutan' => 'nullable|integer|min:0',
        ]);

        $faq->update($validated);

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $faq->cabang_id,
            'aksi' => 'update_faq',
            'model_type' => 'Faq',
            'model_id' => $faq->id,
            'keterangan' => "Admin memperbarui FAQ #{$faq->id}.",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'FAQ berhasil diperbarui.',
            'data' => $faq->load('cabang'),
        ]);
    }

    /**
     * Delete FAQ item.
     */
    public function destroy(int $id): JsonResponse
    {
        $faq = Faq::findOrFail($id);
        $tanya = $faq->pertanyaan;
        $cabangId = $faq->cabang_id;
        $faq->delete();

        ActivityLog::create([
            'user_id' => auth()->id(),
            'cabang_id' => $cabangId,
            'aksi' => 'delete_faq',
            'model_type' => 'Faq',
            'model_id' => $id,
            'keterangan' => "Admin menghapus FAQ: \"{$tanya}\"",
            'created_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'FAQ berhasil dihapus.',
        ]);
    }
}
