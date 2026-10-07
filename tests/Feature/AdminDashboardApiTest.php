<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminDashboardApiTest extends TestCase
{
    public function test_admin_can_access_dashboard_with_accurate_metrics(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin_test@homein.com'],
            [
                'nama' => 'Admin Test',
                'password' => Hash::make('password123'),
                'no_hp' => '081234567891',
                'role' => 'admin',
                'status_aktif' => 1,
            ]
        );

        $token = $admin->createToken('test_admin')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
            ])
            ->assertJsonStructure([
                'data' => [
                    'quick_access' => [
                        'kamar_kosong',
                        'penghuni_aktif',
                        'pemasukan',
                        'komplain_baru',
                    ],
                    'occupancy' => [
                        'kamar' => ['terisi', 'total', 'percent', 'label'],
                        'pembayaran' => ['lunas', 'total', 'percent', 'label'],
                    ],
                    'pembayaran_terbaru',
                    'komplain_terbaru',
                ],
            ]);
    }

    public function test_regular_tenant_is_forbidden_from_accessing_dashboard(): void
    {
        $penghuni = User::firstOrCreate(
            ['email' => 'penghuni_test@homein.com'],
            [
                'nama' => 'Penghuni Test',
                'password' => Hash::make('password123'),
                'no_hp' => '081234567892',
                'role' => 'penghuni',
                'status_aktif' => 1,
            ]
        );

        $token = $penghuni->createToken('test_penghuni')->plainTextToken;

        $response = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/admin/dashboard');

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Akses ditolak. Halaman ini hanya dapat diakses oleh pemilik atau admin kost.',
            ]);
    }

    public function test_guest_is_unauthorized_from_accessing_dashboard(): void
    {
        $response = $this->getJson('/api/admin/dashboard');
        $response->assertStatus(401);
    }
}
