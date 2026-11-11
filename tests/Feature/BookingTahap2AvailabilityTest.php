<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Cabang;
use App\Models\Gedung;
use App\Models\Kamar;
use App\Models\Penghuni;
use App\Models\User;
use App\Services\BookingAvailabilityService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class BookingTahap2AvailabilityTest extends TestCase
{
    use DatabaseTransactions;

    protected BookingAvailabilityService $service;

    protected User $user;

    protected User $penghuniUser;

    protected Cabang $cabang;

    protected Gedung $gedung;

    protected Kamar $kamar;

    protected function setUp(): void
    {
        parent::setUp();

        $this->service = app(BookingAvailabilityService::class);

        $this->user = User::create([
            'nama' => 'Calon Penghuni Test',
            'email' => 'calon_'.uniqid().'@test.com',
            'password' => bcrypt('password123'),
            'role' => 'calon_penghuni',
        ]);

        $this->penghuniUser = User::create([
            'nama' => 'Penghuni Aktif Test',
            'email' => 'penghuni_'.uniqid().'@test.com',
            'password' => bcrypt('password123'),
            'role' => 'penghuni',
        ]);

        $this->cabang = Cabang::create([
            'nama_cabang' => 'Cabang Ketersediaan',
            'alamat' => 'Jl. Ketersediaan No. 1',
        ]);

        $this->gedung = Gedung::create([
            'cabang_id' => $this->cabang->id,
            'nama_gedung' => 'Gedung Ketersediaan',
            'jumlah_lantai' => 2,
        ]);

        $this->kamar = Kamar::create([
            'gedung_id' => $this->gedung->id,
            'nomor_kamar' => 'K-101',
            'lantai' => 1,
            'harga_bulanan' => 1200000,
            'status' => 'kosong',
        ]);
    }

    /**
     * Test Rule (a): Kamar dengan penghuni aktif TIDAK BISA dibooking,
     * bahkan jika tanggal masa tinggalnya sudah lewat.
     */
    public function test_room_with_active_tenant_is_not_available_even_if_stay_date_has_passed(): void
    {
        // Create an active tenant whose stay date expired yesterday
        Penghuni::create([
            'user_id' => $this->penghuniUser->id,
            'kamar_id' => $this->kamar->id,
            'status' => 'aktif',
            'tanggal_masuk' => now()->subMonths(6)->toDateString(),
            'masa_tinggal_sampai' => now()->subDay()->toDateString(), // expired yesterday!
        ]);

        $result = $this->service->checkKamarAvailability($this->kamar, now()->addDays(2)->toDateString(), 1);

        $this->assertFalse($result['available']);
        $this->assertEquals('active_tenant', $result['reason']);
        $this->assertEquals(0, $result['max_durasi_bulan']);

        // Verify scopeDapatDibooking excludes this room
        $availableRooms = Kamar::dapatDibooking()->where('id', $this->kamar->id)->get();
        $this->assertCount(0, $availableRooms);
    }

    /**
     * Test Rule (b): Tanggal mulai maksimal 3 bulan ke depan, dan tidak boleh tanggal lampau.
     */
    public function test_start_date_constraints_and_safe_month_end(): void
    {
        // 1. Past date must fail
        $pastCheck = $this->service->checkKamarAvailability($this->kamar, now()->subDay()->toDateString(), 1);
        $this->assertFalse($pastCheck['available']);
        $this->assertEquals('invalid_start_date', $pastCheck['reason']);

        // 2. More than 3 months ahead must fail
        $tooFar = now()->addMonths(4)->toDateString();
        $farCheck = $this->service->checkKamarAvailability($this->kamar, $tooFar, 1);
        $this->assertFalse($farCheck['available']);
        $this->assertEquals('invalid_start_date', $farCheck['reason']);

        // 3. Within 3 months must succeed
        $validDate = now()->addDays(10)->toDateString();
        $validCheck = $this->service->checkKamarAvailability($this->kamar, $validDate, 1);
        $this->assertTrue($validCheck['available']);

        // 4. Safe month calculation for month-end dates (e.g. 31 Jan -> 28 Feb)
        $jan31 = Carbon::create(2027, 1, 31);
        $oneMonthLater = $this->service->calculateEndDate($jan31, 1);
        $this->assertEquals('2027-02-28', $oneMonthLater->toDateString());

        $threeMonthsLater = $this->service->calculateEndDate($jan31, 3);
        $this->assertEquals('2027-04-30', $threeMonthsLater->toDateString());
    }

    /**
     * Test Rule (c): 14-day cleaning buffer and collision detection.
     */
    public function test_14_day_buffer_and_interval_collision(): void
    {
        $start1 = now()->addDays(5)->toDateString();
        // Booking 1: 1 month duration
        $end1 = $this->service->calculateEndDate($start1, 1)->toDateString();
        $blockEnd1 = $this->service->calculateBlockEndDate($end1, 14)->toDateString();

        Booking::create([
            'user_id' => $this->user->id,
            'kamar_id' => $this->kamar->id,
            'tanggal_mulai' => $start1,
            'tanggal_selesai' => $end1,
            'tanggal_blok_selesai' => $blockEnd1,
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_MENUNGGU_PEMBAYARAN,
        ]);

        // Attempt Booking 2 on the day right after end1 (inside the 14-day buffer)
        $insideBufferDate = Carbon::parse($end1)->addDays(5)->toDateString();
        $bufferCheck = $this->service->checkKamarAvailability($this->kamar, $insideBufferDate, 1);
        $this->assertFalse($bufferCheck['available']);

        // Attempt Booking 2 on or after blockEnd1 (14-day buffer completed)
        $afterBufferDate = Carbon::parse($blockEnd1)->toDateString();
        $afterCheck = $this->service->checkKamarAvailability($this->kamar, $afterBufferDate, 1);
        $this->assertTrue($afterCheck['available']);
    }

    /**
     * Test max duration calculation in the gap between bookings.
     */
    public function test_duration_gap_calculation_and_subsequent_booking_indicator(): void
    {
        $today = now()->startOfDay();
        // Subsequent booking starting 3 months from now
        $subsequentStart = (clone $today)->addMonthsNoOverflow(3)->toDateString();
        $subsequentEnd = $this->service->calculateEndDate($subsequentStart, 2)->toDateString();
        $subsequentBlockEnd = $this->service->calculateBlockEndDate($subsequentEnd)->toDateString();

        Booking::create([
            'user_id' => $this->user->id,
            'kamar_id' => $this->kamar->id,
            'tanggal_mulai' => $subsequentStart,
            'tanggal_selesai' => $subsequentEnd,
            'tanggal_blok_selesai' => $subsequentBlockEnd,
            'durasi_bulan' => 2,
            'status' => Booking::STATUS_TERJADWAL,
        ]);

        // Candidate wants to start today + 2 days
        $candStart = (clone $today)->addDays(2)->toDateString();
        $durations = $this->service->calculateAvailableDurations($this->kamar, $candStart);

        $this->assertTrue($durations['available']);
        $this->assertTrue($durations['ada_booking_berikutnya']);
        $this->assertEquals($subsequentStart, $durations['booking_berikutnya_mulai']);

        // Check that requested duration exceeding max_durasi_bulan is rejected
        $max = $durations['max_durasi_bulan'];
        $this->assertGreaterThanOrEqual(1, $max);

        $tooLongCheck = $this->service->checkKamarAvailability($this->kamar, $candStart, $max + 1);
        $this->assertFalse($tooLongCheck['available']);
        $this->assertEquals('duration_exceeded', $tooLongCheck['reason']);

        // Requested duration within max is accepted
        $fitCheck = $this->service->checkKamarAvailability($this->kamar, $candStart, $max);
        $this->assertTrue($fitCheck['available']);
    }

    /**
     * Test lockAndVerifyKamar inside transaction prevents double bookings.
     */
    public function test_lock_and_verify_kamar_validation(): void
    {
        $startDate = now()->addDays(5)->toDateString();

        // 1. First lock and verify passes
        $result = $this->service->lockAndVerifyKamar($this->kamar->id, $startDate, 1);
        $this->assertTrue($result['info']['available']);

        // 2. Put an active booking on that room
        $end = $this->service->calculateEndDate($startDate, 1)->toDateString();
        $blockEnd = $this->service->calculateBlockEndDate($end)->toDateString();

        Booking::create([
            'user_id' => $this->user->id,
            'kamar_id' => $this->kamar->id,
            'tanggal_mulai' => $startDate,
            'tanggal_selesai' => $end,
            'tanggal_blok_selesai' => $blockEnd,
            'durasi_bulan' => 1,
            'status' => Booking::STATUS_MENUNGGU_KONFIRMASI,
        ]);

        // 3. Second lock and verify must throw ValidationException
        $this->expectException(ValidationException::class);
        $this->service->lockAndVerifyKamar($this->kamar->id, $startDate, 1);
    }

    /**
     * Test public availability API endpoint.
     */
    public function test_public_kamar_ketersediaan_endpoint(): void
    {
        $startDate = now()->addDays(7)->toDateString();

        $response = $this->getJson("/api/public/kamar/{$this->kamar->id}/ketersediaan?tanggal_mulai={$startDate}&durasi_bulan=2");

        $response->assertStatus(200)
            ->assertJsonPath('status', 'success')
            ->assertJsonPath('data.available', true)
            ->assertJsonPath('data.durasi_bulan', 2)
            ->assertJsonStructure([
                'status',
                'data' => [
                    'available',
                    'tanggal_mulai',
                    'tanggal_selesai',
                    'tanggal_blok_selesai',
                    'durasi_bulan',
                    'max_durasi_bulan',
                    'available_durations',
                    'ada_booking_berikutnya',
                ],
            ]);
    }
}
