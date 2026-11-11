<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\Cabang;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\PembayaranBooking;
use App\Models\Penghuni;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class BookingFullWorkflowTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;

    protected User $customer;

    protected Cabang $cabang;

    protected Gedung $gedung;

    protected Kamar $kamar1;

    protected Kamar $kamar2;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('public');

        $this->admin = User::create([
            'nama' => 'Owner Admin',
            'email' => 'admin_'.uniqid().'@homein.test',
            'password' => bcrypt('password123'),
            'role' => 'pemilik',
        ]);

        $this->customer = User::create([
            'nama' => 'Budi Santoso',
            'email' => 'budi_'.uniqid().'@test.com',
            'password' => bcrypt('password123'),
            'role' => 'calon_penghuni',
            'no_hp' => '081234567890',
        ]);

        $this->cabang = Cabang::create([
            'nama_cabang' => 'Home-In Dago Test',
            'alamat' => 'Jl. Dago No. 100, Bandung',
            'kota' => 'Bandung',
            'latitude' => -6.8850,
            'longitude' => 107.6135,
        ]);

        $this->gedung = Gedung::create([
            'cabang_id' => $this->cabang->id,
            'nama_gedung' => 'Gedung Mawar Test',
            'total_lantai' => 2,
        ]);

        $this->kamar1 = Kamar::create([
            'gedung_id' => $this->gedung->id,
            'nomor_kamar' => 'WF101',
            'lantai' => 1,
            'tipe_kamar' => 'Deluxe',
            'harga_bulanan' => 1500000,
            'status' => 'kosong',
        ]);

        $this->kamar2 = Kamar::create([
            'gedung_id' => $this->gedung->id,
            'nomor_kamar' => 'WF102',
            'lantai' => 1,
            'tipe_kamar' => 'Standard',
            'harga_bulanan' => 1200000,
            'status' => 'kosong',
        ]);
    }

    /**
     * Test Tahap 3: Customer submits booking -> Menunggu Konfirmasi -> Room is held immediately.
     */
    public function test_customer_can_submit_booking_and_room_is_held(): void
    {
        $startDate = Carbon::today()->addDays(5)->toDateString();

        $response = $this->actingAs($this->customer, 'sanctum')->postJson('/api/user/booking', [
            'kamar_id' => $this->kamar1->id,
            'tanggal_mulai' => $startDate,
            'durasi_bulan' => 3,
            'catatan' => 'Mohon kamar yang tenang.',
            'setuju_aturan' => true,
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('booking', [
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar1->id,
            'status' => Booking::STATUS_MENUNGGU_KONFIRMASI,
            'durasi_bulan' => 3,
        ]);

        // Status history created
        $this->assertDatabaseHas('booking_status_history', [
            'ke_status' => Booking::STATUS_MENUNGGU_KONFIRMASI,
            'user_id' => $this->customer->id,
        ]);

        // Activity log created
        $this->assertDatabaseHas('activity_log', [
            'peran' => 'customer',
            'aksi' => 'booking_dibuat',
        ]);
    }

    /**
     * Test Tahap 3 & 4: Admin approves booking -> Menunggu Pembayaran -> Generates month 1 bill with kode unik.
     */
    public function test_admin_approves_booking_and_generates_payment_draft(): void
    {
        $startDate = Carbon::today()->addDays(2)->toDateString();

        $booking = Booking::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar1->id,
            'tanggal_booking' => now(),
            'tanggal_mulai' => $startDate,
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_MENUNGGU_KONFIRMASI,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/booking/{$booking->id}/setujui");

        $response->assertStatus(200);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_MENUNGGU_PEMBAYARAN, $booking->status);
        $this->assertNotNull($booking->batas_bayar);

        // Month 1 bill created
        $bill = PembayaranBooking::where('booking_id', $booking->id)->where('periode_bulan_ke', 1)->first();
        $this->assertNotNull($bill);
        $this->assertEquals(1500000, $bill->nominal);
        $this->assertGreaterThanOrEqual(100, $bill->kode_unik);
        $this->assertEquals(PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN, $bill->status);
    }

    /**
     * Test Tahap 4: Transfer / QRIS payment proof upload and admin verification.
     */
    public function test_customer_uploads_payment_proof_and_admin_verifies_payment(): void
    {
        $startDate = Carbon::today()->addDays(5)->toDateString();

        $booking = Booking::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar1->id,
            'tanggal_booking' => now(),
            'tanggal_mulai' => $startDate,
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_MENUNGGU_PEMBAYARAN,
            'batas_bayar' => now()->addHours(24),
        ]);

        $bill = PembayaranBooking::create([
            'booking_id' => $booking->id,
            'periode_bulan_ke' => 1,
            'nominal' => 1500000,
            'kode_unik' => 245,
            'metode' => 'transfer_qris',
            'status' => PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN,
            'batas_bayar' => now()->addHours(24),
        ]);

        $fakeFile = UploadedFile::fake()->image('bukti_transfer.jpg');

        $uploadResp = $this->actingAs($this->customer, 'sanctum')->postJson("/api/user/booking/{$booking->id}/pay", [
            'bukti_pembayaran' => $fakeFile,
            'metode_pembayaran' => 'transfer_qris',
        ]);

        $uploadResp->assertStatus(200);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_MENUNGGU_VERIFIKASI, $booking->status);

        // Admin verifies transfer
        $verifyResp = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/booking/{$booking->id}/verifikasi-pembayaran");
        $verifyResp->assertStatus(200);

        $booking->refresh();
        // Since start date is in 5 days (future), status is Terjadwal
        $this->assertEquals(Booking::STATUS_TERJADWAL, $booking->status);

        $bill->refresh();
        $this->assertEquals(PembayaranBooking::STATUS_LUNAS, $bill->status);
        $this->assertNotNull($bill->kwitansi_nomor);
        $this->assertEquals($this->admin->id, $bill->penerima_id);

        // Kwitansi endpoint
        $kwitansiResp = $this->actingAs($this->admin, 'sanctum')->getJson("/api/admin/booking/{$booking->id}/kwitansi");
        $kwitansiResp->assertStatus(200)
            ->assertJsonPath('data.kwitansi_nomor', $bill->kwitansi_nomor)
            ->assertJsonPath('data.total_bayar', 1500245);
    }

    /**
     * Test Tahap 4: Cash payment marks paid immediately and issues receipt.
     */
    public function test_admin_marks_cash_payment_paid(): void
    {
        $today = Carbon::today()->toDateString();

        $booking = Booking::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar2->id,
            'tanggal_booking' => now(),
            'tanggal_mulai' => $today,
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_MENUNGGU_PEMBAYARAN,
        ]);

        $cashResp = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/booking/{$booking->id}/bayar-tunai");
        $cashResp->assertStatus(200);

        $booking->refresh();
        // Because start date is today, booking becomes Aktif immediately and tenant is created
        $this->assertEquals(Booking::STATUS_AKTIF, $booking->status);

        $bill = PembayaranBooking::where('booking_id', $booking->id)->first();
        $this->assertEquals(PembayaranBooking::STATUS_LUNAS, $bill->status);
        $this->assertEquals('tunai', $bill->metode);

        // Room status updated to terisi
        $this->kamar2->refresh();
        $this->assertEquals('terisi', $this->kamar2->status);

        // Tenant created
        $this->assertDatabaseHas('penghuni', [
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar2->id,
            'status' => 'aktif',
        ]);
    }

    /**
     * Test Tahap 3: Admin offers alternative room -> customer rejects -> Ditolak.
     */
    public function test_alternative_room_offer_and_customer_rejection(): void
    {
        $startDate = Carbon::today()->addDays(3)->toDateString();

        $booking = Booking::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar1->id,
            'tanggal_booking' => now(),
            'tanggal_mulai' => $startDate,
            'durasi_bulan' => 2,
            'status' => Booking::STATUS_MENUNGGU_KONFIRMASI,
        ]);

        // Admin offers alternative room 102
        $offerResp = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/booking/{$booking->id}/tawarkan-alternatif", [
            'kamar_alternatif_id' => $this->kamar2->id,
            'kadaluarsa_jam' => 48,
        ]);
        $offerResp->assertStatus(200);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_MENUNGGU_RESPON_CUSTOMER, $booking->status);
        $this->assertEquals($this->kamar2->id, $booking->kamar_alternatif_id);

        // Customer rejects alternative
        $rejectResp = $this->actingAs($this->customer, 'sanctum')->postJson("/api/user/booking/{$booking->id}/reject-alternative");
        $rejectResp->assertStatus(200);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_DITOLAK, $booking->status);
        $this->assertStringContainsString('Customer menolak tawaran kamar alternatif', $booking->alasan_tolak);
    }

    /**
     * Test Tahap 4: Customer cancels paid booking -> moves to menunggu_refund -> Admin marks refund done.
     */
    public function test_customer_cancels_paid_booking_triggers_refund_flow(): void
    {
        $startDate = Carbon::today()->addDays(7)->toDateString();

        $booking = Booking::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar1->id,
            'tanggal_booking' => now(),
            'tanggal_mulai' => $startDate,
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_TERJADWAL,
        ]);

        $bill = PembayaranBooking::create([
            'booking_id' => $booking->id,
            'periode_bulan_ke' => 1,
            'nominal' => 1500000,
            'kode_unik' => 111,
            'metode' => 'transfer_qris',
            'status' => PembayaranBooking::STATUS_LUNAS,
            'status_refund' => PembayaranBooking::REFUND_TIDAK_ADA,
        ]);

        $this->kamar1->update(['status' => 'dibooking']);

        // Customer cancels
        $cancelResp = $this->actingAs($this->customer, 'sanctum')->postJson("/api/user/booking/{$booking->id}/cancel");
        $cancelResp->assertStatus(200);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_DIBATALKAN, $booking->status);

        $bill->refresh();
        $this->assertEquals(PembayaranBooking::REFUND_MENUNGGU, $bill->status_refund);

        // Room is freed immediately
        $this->kamar1->refresh();
        $this->assertEquals('kosong', $this->kamar1->status);

        // Admin marks refund completed
        $refundResp = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/booking/{$booking->id}/refund");
        $refundResp->assertStatus(200);

        $bill->refresh();
        $this->assertEquals(PembayaranBooking::REFUND_SUDAH, $bill->status_refund);
    }

    /**
     * Test Tahap 5: Konfirmasi Keluar (Checkout) -> Selesai, Penghuni Nonaktif, Kamar Kosong.
     */
    public function test_admin_confirms_checkout_sets_tenant_nonactive_and_room_empty(): void
    {
        $today = Carbon::today()->toDateString();

        $booking = Booking::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar1->id,
            'tanggal_booking' => now()->subMonth(),
            'tanggal_mulai' => now()->subMonth()->toDateString(),
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_AKTIF,
        ]);

        Penghuni::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar1->id,
            'tanggal_masuk' => now()->subMonth(),
            'status' => 'aktif',
        ]);

        $this->kamar1->update(['status' => 'terisi']);

        $checkoutResp = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/booking/{$booking->id}/konfirmasi-keluar", [
            'alasan_selesai' => 'keluar normal',
        ]);
        $checkoutResp->assertStatus(200);

        $booking->refresh();
        $this->assertEquals(Booking::STATUS_SELESAI, $booking->status);
        $this->assertEquals('keluar normal', $booking->alasan_selesai);
        $this->assertEquals($this->admin->id, $booking->dikonfirmasi_keluar_oleh);

        $penghuni = Penghuni::where('user_id', $this->customer->id)->first();
        $this->assertEquals('nonaktif', $penghuni->status);

        $this->kamar1->refresh();
        $this->assertEquals('kosong', $this->kamar1->status);
    }

    /**
     * Test Tahap 6: Activity Log API filtering and mark as read.
     */
    public function test_activity_log_api_filters_and_read_markers(): void
    {
        ActivityLog::catat(
            userId: $this->customer->id,
            cabangId: $this->cabang->id,
            peran: 'customer',
            jenisAksi: 'booking_dibuat',
            objekTerkait: 'Booking #10',
            detail: 'Aktivitas customer belum dibaca'
        );

        ActivityLog::catat(
            userId: $this->admin->id,
            cabangId: $this->cabang->id,
            peran: 'admin',
            jenisAksi: 'setujui_booking',
            objekTerkait: 'Booking #10',
            detail: 'Aktivitas admin belum dibaca'
        );

        $listResp = $this->actingAs($this->admin, 'sanctum')->getJson('/api/admin/activity-logs?peran=customer');
        $listResp->assertStatus(200);

        $logId = $listResp->json('data.0.id');

        // Mark single as read
        $readResp = $this->actingAs($this->admin, 'sanctum')->postJson("/api/admin/activity-logs/{$logId}/read");
        $readResp->assertStatus(200);

        // Mark all as read
        $readAllResp = $this->actingAs($this->admin, 'sanctum')->postJson('/api/admin/activity-logs/read-all');
        $readAllResp->assertStatus(200);
    }

    /**
     * Test Tahap 5: Scheduler daily check auto-activates scheduled bookings and deactivates long-overdue tenants (>1 month).
     */
    public function test_scheduler_daily_check_command(): void
    {
        $today = Carbon::today()->toDateString();

        // 1. Scheduled booking whose start date has arrived
        $scheduledBooking = Booking::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar1->id,
            'tanggal_booking' => now()->subDays(5),
            'tanggal_mulai' => $today,
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_TERJADWAL,
        ]);

        // 2. Unpaid expired booking (>24h past batas_bayar)
        $expiredBooking = Booking::create([
            'user_id' => $this->customer->id,
            'kamar_id' => $this->kamar2->id,
            'tanggal_booking' => now()->subDays(2),
            'tanggal_mulai' => Carbon::today()->addDays(10)->toDateString(),
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_MENUNGGU_PEMBAYARAN,
            'batas_bayar' => now()->subHours(2),
        ]);
        $this->kamar2->update(['status' => 'dibooking']);

        // Run artisan command
        Artisan::call('booking:daily-check');

        // 1 should now be Aktif
        $scheduledBooking->refresh();
        $this->assertEquals(Booking::STATUS_AKTIF, $scheduledBooking->status);

        // 2 should now be Kedaluwarsa and room freed
        $expiredBooking->refresh();
        $this->assertEquals(Booking::STATUS_KEDALUWARSA, $expiredBooking->status);
        $this->kamar2->refresh();
        $this->assertEquals('kosong', $this->kamar2->status);
    }
}
