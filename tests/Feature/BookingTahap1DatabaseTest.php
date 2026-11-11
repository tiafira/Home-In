<?php

namespace Tests\Feature;

use App\Models\ActivityLog;
use App\Models\Booking;
use App\Models\BookingStatusHistory;
use App\Models\Cabang;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\PembayaranBooking;
use App\Models\Pengaturan;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class BookingTahap1DatabaseTest extends TestCase
{
    use DatabaseTransactions;

    protected User $user;

    protected User $admin;

    protected Cabang $cabang;

    protected Gedung $gedung;

    protected Kamar $kamar;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::create([
            'nama' => 'User Customer',
            'email' => 'customer_'.uniqid().'@test.com',
            'password' => bcrypt('password123'),
            'role' => 'calon_penghuni',
        ]);

        $this->admin = User::create([
            'nama' => 'Admin Kost',
            'email' => 'admin_'.uniqid().'@test.com',
            'password' => bcrypt('password123'),
            'role' => 'admin',
        ]);

        $this->cabang = Cabang::create([
            'nama_cabang' => 'Cabang Database Test',
            'alamat' => 'Jl. Pengujian No. 1',
        ]);

        $this->gedung = Gedung::create([
            'cabang_id' => $this->cabang->id,
            'nama_gedung' => 'Gedung DB',
            'jumlah_lantai' => 2,
        ]);

        $this->kamar = Kamar::create([
            'gedung_id' => $this->gedung->id,
            'nomor_kamar' => 'DB-01',
            'lantai' => 1,
            'harga_bulanan' => 1000000,
            'status' => 'kosong',
        ]);
    }

    public function test_booking_table_and_model_fields(): void
    {
        $startDate = now()->addDays(5)->toDateString();

        $booking = Booking::create([
            'user_id' => $this->user->id,
            'kamar_id' => $this->kamar->id,
            'tanggal_mulai' => $startDate,
            'durasi_bulan' => 3,
            'status' => Booking::STATUS_MENUNGGU_KONFIRMASI,
            'metode_bayar' => 'transfer_qris',
        ]);

        $this->assertNotNull($booking->id);
        $this->assertEquals($startDate, $booking->tanggal_mulai->toDateString());
        $this->assertEquals($startDate, $booking->rencana_checkin->toDateString());
        $this->assertEquals(3, $booking->durasi_bulan);
        $this->assertNotNull($booking->tanggal_selesai);
        $this->assertNotNull($booking->tanggal_blok_selesai);

        // Check 14-day gap calculation
        $expectedBlockDate = $booking->tanggal_selesai->copy()->addDays(14)->toDateString();
        $this->assertEquals($expectedBlockDate, $booking->tanggal_blok_selesai->toDateString());
    }

    public function test_booking_status_history_logging(): void
    {
        $booking = Booking::create([
            'user_id' => $this->user->id,
            'kamar_id' => $this->kamar->id,
            'tanggal_mulai' => now()->addDays(3)->toDateString(),
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_MENUNGGU_KONFIRMASI,
        ]);

        $history = $booking->logStatusChange(
            Booking::STATUS_MENUNGGU_PEMBAYARAN,
            'Admin menyetujui booking',
            $this->admin->id
        );

        $this->assertInstanceOf(BookingStatusHistory::class, $history);
        $this->assertEquals(Booking::STATUS_MENUNGGU_KONFIRMASI, $history->dari_status);
        $this->assertEquals(Booking::STATUS_MENUNGGU_PEMBAYARAN, $history->ke_status);
        $this->assertEquals('Admin menyetujui booking', $history->alasan);
        $this->assertEquals($this->admin->id, $history->user_id);

        $this->assertEquals(Booking::STATUS_MENUNGGU_PEMBAYARAN, $booking->fresh()->status);
        $this->assertCount(1, $booking->fresh()->statusHistories);
    }

    public function test_pembayaran_booking_fields_and_monthly_tagihan(): void
    {
        $booking = Booking::create([
            'user_id' => $this->user->id,
            'kamar_id' => $this->kamar->id,
            'tanggal_mulai' => now()->addDays(3)->toDateString(),
            'durasi_bulan' => 2,
            'status' => Booking::STATUS_MENUNGGU_PEMBAYARAN,
        ]);

        $payment = PembayaranBooking::create([
            'booking_id' => $booking->id,
            'periode_bulan_ke' => 1,
            'nominal' => 1000000,
            'kode_unik' => 123,
            'metode' => PembayaranBooking::METODE_TRANSFER_QRIS,
            'status' => PembayaranBooking::STATUS_MENUNGGU_PEMBAYARAN,
            'status_refund' => PembayaranBooking::REFUND_TIDAK_ADA,
        ]);

        $this->assertEquals(1000000, $payment->nominal);
        $this->assertEquals(1000000, $payment->jumlah);
        $this->assertEquals(1000123, $payment->total_bayar);
        $this->assertEquals('transfer_qris', $payment->metode);
        $this->assertEquals('transfer_qris', $payment->metode_pembayaran);

        // Verify mark as paid by admin
        $payment->update([
            'status' => PembayaranBooking::STATUS_LUNAS,
            'penerima_id' => $this->admin->id,
            'waktu_lunas' => now(),
        ]);

        $this->assertEquals($this->admin->id, $payment->fresh()->penerima_id);
        $this->assertEquals($this->admin->id, $payment->fresh()->dikonfirmasi_oleh);
        $this->assertNotNull($payment->fresh()->waktu_lunas);
    }

    public function test_activity_log_catat_helper(): void
    {
        $log = ActivityLog::catat([
            'user_id' => $this->user->id,
            'peran' => 'customer',
            'cabang_id' => $this->cabang->id,
            'aksi' => 'booking_baru',
            'model_type' => Booking::class,
            'model_id' => 999,
            'keterangan' => 'Customer membuat booking baru',
        ]);

        $this->assertInstanceOf(ActivityLog::class, $log);
        $this->assertEquals('customer', $log->peran);
        $this->assertEquals('booking_baru', $log->aksi);
        $this->assertFalse($log->dibaca);
    }

    public function test_pengaturan_defaults_seeded(): void
    {
        $this->assertEquals(14, Pengaturan::get('booking_jeda_hari'));
        $this->assertEquals(3, Pengaturan::get('booking_max_bulan_ke_depan'));
        $this->assertEquals(24, Pengaturan::get('booking_batas_bayar_transfer_jam'));
        $this->assertEquals(48, Pengaturan::get('booking_batas_bayar_tunai_jam'));
        $this->assertEquals(50000, Pengaturan::get('booking_nominal_denda'));
        $this->assertNotEmpty(Pengaturan::get('booking_qris_image'));
    }
}
