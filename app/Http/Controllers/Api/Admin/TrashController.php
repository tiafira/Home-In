<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Faq;
use App\Models\Fasilitas;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Komplain;
use App\Models\LaporanTamu;
use App\Models\Paket;
use App\Models\Pegawai;
use App\Models\Penghuni;
use App\Models\Pengumuman;
use App\Models\Peringatan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TrashController extends Controller
{
    /**
     * Map type keys to their Eloquent model classes and labels.
     */
    protected function getModelMap(): array
    {
        return [
            'gedung' => [
                'class' => Gedung::class,
                'label' => 'Gedung',
                'display_field' => 'nama_gedung',
                'detail_format' => 'Alamat: :alamat',
            ],
            'kamar' => [
                'class' => Kamar::class,
                'label' => 'Kamar',
                'display_field' => 'nomor_kamar',
                'detail_format' => 'Lantai: :lantai, Harga: :harga_bulanan',
            ],
            'fasilitas' => [
                'class' => Fasilitas::class,
                'label' => 'Fasilitas',
                'display_field' => 'nama_fasilitas',
                'detail_format' => 'Tipe: :tipe',
            ],
            'penghuni' => [
                'class' => Penghuni::class,
                'label' => 'Penghuni',
                'with' => ['user', 'kamar'],
                'display_field' => fn ($item) => $item->user?->name ?? 'Penghuni #'.$item->id,
                'detail_format' => fn ($item) => 'Kamar: '.($item->kamar?->nomor_kamar ?? '-').' | Masuk: '.($item->tanggal_masuk ?? '-'),
            ],
            'pegawai' => [
                'class' => Pegawai::class,
                'label' => 'Karyawan',
                'with' => ['user'],
                'display_field' => fn ($item) => $item->user?->name ?? 'Karyawan #'.$item->id,
                'detail_format' => fn ($item) => 'Jabatan: '.strtoupper($item->jabatan ?? '-'),
            ],
            'komplain' => [
                'class' => Komplain::class,
                'label' => 'Komplain',
                'with' => ['penghuni.user'],
                'display_field' => fn ($item) => ($item->kategori ?? 'Komplain').': '.mb_substr($item->isi ?? '', 0, 40).'...',
                'detail_format' => fn ($item) => 'Pelapor: '.($item->penghuni?->user?->name ?? '-'),
            ],
            'pengumuman' => [
                'class' => Pengumuman::class,
                'label' => 'Pengumuman',
                'display_field' => 'judul',
                'detail_format' => 'Target: :target',
            ],
            'peringatan' => [
                'class' => Peringatan::class,
                'label' => 'Peringatan / SP',
                'with' => ['penghuni.user'],
                'display_field' => fn ($item) => ($item->kategori_pelanggaran ?? 'Peringatan').': '.mb_substr($item->keterangan ?? '', 0, 40).'...',
                'detail_format' => fn ($item) => 'Penghuni: '.($item->penghuni?->user?->name ?? '-').' | Poin: '.($item->poin_pelanggaran ?? 10),
            ],
            'paket' => [
                'class' => Paket::class,
                'label' => 'Paket',
                'display_field' => fn ($item) => 'Paket '.$item->ekspedisi.' - '.$item->nama_penerima,
                'detail_format' => fn ($item) => 'Kamar: '.($item->nomor_kamar ?? '-').' | Resi: '.($item->no_resi ?? '-'),
            ],
            'tamu' => [
                'class' => LaporanTamu::class,
                'label' => 'Buku Tamu',
                'with' => ['penghuni.user'],
                'display_field' => fn ($item) => 'Tamu: '.$item->nama_tamu,
                'detail_format' => fn ($item) => 'Menemui: '.($item->penghuni?->user?->name ?? '-').' | Keperluan: '.($item->keperluan ?? '-'),
            ],
            'faq' => [
                'class' => Faq::class,
                'label' => 'FAQ',
                'display_field' => 'pertanyaan',
                'detail_format' => 'Urutan: :urutan',
            ],
            'user' => [
                'class' => User::class,
                'label' => 'Akun Pengguna',
                'display_field' => 'name',
                'detail_format' => 'Email: :email | Role: :role',
            ],
        ];
    }

    /**
     * List all trashed items with counts.
     */
    public function index(Request $request): JsonResponse
    {
        $map = $this->getModelMap();
        $selectedType = $request->query('type', 'all');
        $search = $request->query('search', '');

        $counts = ['all' => 0];
        foreach ($map as $typeKey => $config) {
            $modelClass = $config['class'];
            $count = $modelClass::onlyTrashed()->count();
            $counts[$typeKey] = $count;
            $counts['all'] += $count;
        }

        $items = [];
        $typesToQuery = ($selectedType === 'all') ? array_keys($map) : (isset($map[$selectedType]) ? [$selectedType] : []);

        foreach ($typesToQuery as $typeKey) {
            $config = $map[$typeKey];
            $modelClass = $config['class'];

            $query = $modelClass::onlyTrashed();

            if (isset($config['with'])) {
                $query->with($config['with']);
            }

            $results = $query->orderBy('deleted_at', 'desc')->get();

            foreach ($results as $item) {
                // Determine display title
                if (is_callable($config['display_field'])) {
                    $title = ($config['display_field'])($item);
                } else {
                    $prop = $config['display_field'];
                    $title = $item->$prop ?? "Data #{$item->id}";
                }

                // Determine subtitle/detail
                if (is_callable($config['detail_format'])) {
                    $detail = ($config['detail_format'])($item);
                } else {
                    $detail = $config['detail_format'];
                    preg_match_all('/:([a-zA-Z0-9_]+)/', $detail, $matches);
                    if (! empty($matches[1])) {
                        foreach ($matches[1] as $field) {
                            $detail = str_replace(':'.$field, (string) ($item->$field ?? '-'), $detail);
                        }
                    }
                }

                // Apply text search if requested
                if ($search && ! (
                    stripos($title, $search) !== false ||
                    stripos($detail, $search) !== false ||
                    stripos($config['label'], $search) !== false
                )) {
                    continue;
                }

                $items[] = [
                    'id' => $item->id,
                    'type' => $typeKey,
                    'type_label' => $config['label'],
                    'title' => $title,
                    'detail' => $detail,
                    'deleted_at' => $item->deleted_at ? $item->deleted_at->format('Y-m-d H:i:s') : null,
                    'deleted_at_human' => $item->deleted_at ? $item->deleted_at->diffForHumans() : null,
                ];
            }
        }

        // Sort items by deleted_at descending
        usort($items, fn ($a, $b) => strcmp($b['deleted_at'] ?? '', $a['deleted_at'] ?? ''));

        return response()->json([
            'status' => 'success',
            'counts' => $counts,
            'data' => $items,
        ]);
    }

    /**
     * Restore a trashed item.
     */
    public function restore(string $type, int $id): JsonResponse
    {
        $map = $this->getModelMap();
        if (! isset($map[$type])) {
            return response()->json(['status' => 'error', 'message' => 'Tipe data tidak valid.'], 404);
        }

        $modelClass = $map[$type]['class'];
        $item = $modelClass::onlyTrashed()->findOrFail($id);
        $item->restore();

        return response()->json([
            'status' => 'success',
            'message' => "Data {$map[$type]['label']} berhasil dipulihkan.",
        ]);
    }

    /**
     * Force delete a trashed item permanently.
     */
    public function forceDelete(string $type, int $id): JsonResponse
    {
        $map = $this->getModelMap();
        if (! isset($map[$type])) {
            return response()->json(['status' => 'error', 'message' => 'Tipe data tidak valid.'], 404);
        }

        $modelClass = $map[$type]['class'];
        $item = $modelClass::onlyTrashed()->findOrFail($id);
        $item->forceDelete();

        return response()->json([
            'status' => 'success',
            'message' => "Data {$map[$type]['label']} berhasil dihapus permanen dari sistem.",
        ]);
    }

    /**
     * Restore all trashed items of a type or all types.
     */
    public function restoreAll(Request $request): JsonResponse
    {
        $map = $this->getModelMap();
        $type = $request->query('type', 'all');

        $types = ($type === 'all') ? array_keys($map) : (isset($map[$type]) ? [$type] : []);

        $count = 0;
        foreach ($types as $t) {
            $modelClass = $map[$t]['class'];
            $count += $modelClass::onlyTrashed()->restore();
        }

        return response()->json([
            'status' => 'success',
            'message' => "Berhasil memulihkan {$count} data.",
        ]);
    }

    /**
     * Empty trash (force delete all) for a type or all types.
     */
    public function emptyTrash(Request $request): JsonResponse
    {
        $map = $this->getModelMap();
        $type = $request->query('type', 'all');

        $types = ($type === 'all') ? array_keys($map) : (isset($map[$type]) ? [$type] : []);

        $count = 0;
        foreach ($types as $t) {
            $modelClass = $map[$t]['class'];
            $trashed = $modelClass::onlyTrashed()->get();
            foreach ($trashed as $item) {
                $item->forceDelete();
                $count++;
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Berhasil menghapus permanen {$count} data dari tempat sampah.",
        ]);
    }
}
