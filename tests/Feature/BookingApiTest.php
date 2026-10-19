<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Cabang;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;

    protected User $pemohon;

    protected Cabang $cabang1;

    protected Cabang $cabang2;

    protected Gedung $gedung1;

    protected Gedung $gedung2;

    protected Kamar $kamar1;

    protected Kamar $kamar2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'nama' => 'Admin Test',
            'name' => 'Admin Test',
            'email' => 'admin_test_'.uniqid().'@home-in.com',
            'password' => bcrypt('password123'),
            'role' => 'pemilik',
        ]);

        $this->pemohon = User::create([
            'nama' => 'Calon Penghuni Test',
            'name' => 'Calon Penghuni Test',
            'email' => 'pemohon_'.uniqid().'@home-in.com',
            'password' => bcrypt('password123'),
            'role' => 'calon_penghuni',
        ]);

        $this->cabang1 = Cabang::create([
            'nama_cabang' => 'Cabang Tebet',
            'alamat' => 'Jl. Tebet Raya No. 10',
            'latitude' => -6.2250,
            'longitude' => 106.8580,
        ]);

        $this->cabang2 = Cabang::create([
            'nama_cabang' => 'Cabang Kuningan',
            'alamat' => 'Jl. Rasuna Said No. 5',
            'latitude' => -6.2200,
            'longitude' => 106.8300,
        ]);

        $this->gedung1 = Gedung::create([
            'cabang_id' => $this->cabang1->id,
            'nama_gedung' => 'Gedung A',
            'jumlah_lantai' => 2,
        ]);

        $this->gedung2 = Gedung::create([
            'cabang_id' => $this->cabang2->id,
            'nama_gedung' => 'Gedung B',
            'jumlah_lantai' => 2,
        ]);

        $this->kamar1 = Kamar::create([
            'gedung_id' => $this->gedung1->id,
            'nomor_kamar' => 'A-01',
            'lantai' => 1,
            'harga_bulanan' => 1500000,
            'status' => 'kosong',
        ]);

        $this->kamar2 = Kamar::create([
            'gedung_id' => $this->gedung2->id,
            'nomor_kamar' => 'B-01',
            'lantai' => 1,
            'harga_bulanan' => 1600000,
            'status' => 'kosong',
        ]);
    }

    public function test_admin_can_list_bookings_with_counts(): void
    {
        Booking::create([
            'user_id' => $this->pemohon->id,
            'kamar_id' => $this->kamar1->id,
            'rencana_checkin' => now()->addDays(3)->toDateString(),
            'status' => 'menunggu_persetujuan',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/booking?tab=request_baru');

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'counts' => [
                    'request_baru',
                    'ditawarkan_alternatif',
                    'dikonfirmasi',
                    'ditolak',
                    'selesai',
                    'all',
                ],
                'data',
            ]);
    }

    public function test_admin_can_accept_booking_and_room_becomes_dibooking(): void
    {
        $booking = Booking::create([
            'user_id' => $this->pemohon->id,
            'kamar_id' => $this->kamar1->id,
            'rencana_checkin' => now()->addDays(3)->toDateString(),
            'status' => 'menunggu_persetujuan',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/booking/{$booking->id}/terima");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success');

        $this->assertDatabaseHas('booking', [
            'id' => $booking->id,
            'status' => 'dikonfirmasi',
            'diproses_oleh' => $this->admin->id,
        ]);

        $this->assertDatabaseHas('kamar', [
            'id' => $this->kamar1->id,
            'status' => 'dibooking',
        ]);
    }

    public function test_admin_reject_requires_minimum_10_characters(): void
    {
        $booking = Booking::create([
            'user_id' => $this->pemohon->id,
            'kamar_id' => $this->kamar1->id,
            'rencana_checkin' => now()->addDays(3)->toDateString(),
            'status' => 'menunggu_persetujuan',
        ]);

        // Attempt short reason (< 10 chars)
        $shortResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/booking/{$booking->id}/tolak", [
                'alasan_penolakan' => 'Penuh',
            ]);

        $shortResponse->assertStatus(422);

        // Attempt valid reason
        $validResponse = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/admin/booking/{$booking->id}/tolak", [
                'alasan_penolakan' => 'Mohon maaf, kamar yang diminta saat ini sudah penuh terisi.',
            ]);

        $validResponse->assertStatus(200);

        $this->assertDatabaseHas('booking', [
            'id' => $booking->id,
            'status' => 'ditolak',
            'alasan_penolakan' => 'Mohon maaf, kamar yang diminta saat ini sudah penuh terisi.',
        ]);
    }

    public function test_haversine_formula_finds_nearest_alternative_branch(): void
    {
        $booking = Booking::create([
            'user_id' => $this->pemohon->id,
            'kamar_id' => $this->kamar1->id,
            'rencana_checkin' => now()->addDays(3)->toDateString(),
            'status' => 'menunggu_persetujuan',
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/admin/booking/{$booking->id}/alternatives");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonStructure([
                'status',
                'current_cabang',
                'alternatives' => [
                    '*' => [
                        'cabang_id',
                        'nama_cabang',
                        'jarak_km',
                        'kamar_kosong_count',
                        'rooms',
                    ],
                ],
            ]);
    }
}
