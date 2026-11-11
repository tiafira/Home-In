<?php

namespace App\Services;

use App\Models\Booking;
use App\Models\Kamar;
use App\Models\Pengaturan;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

class BookingAvailabilityService
{
    /**
     * Check if a room currently has an active tenant.
     * Rule (a): Kamar yang saat ini masih punya penghuni berstatus Aktif
     * TIDAK muncul dan TIDAK bisa dibooking, sekalipun tanggal selesai sewanya sudah lewat.
     */
    public function hasActiveTenant(int|Kamar $kamar): bool
    {
        $kamarId = $kamar instanceof Kamar ? $kamar->id : $kamar;

        return Kamar::where('id', $kamarId)
            ->whereHas('penghuni', function ($q): void {
                $q->where('status', 'aktif');
            })
            ->exists();
    }

    /**
     * Safely calculate end date month-to-month.
     * Uses addMonthsNoOverflow to handle edge cases like Jan 31 -> Feb 28.
     */
    public function calculateEndDate(Carbon|string $startDate, int $durasiBulan): Carbon
    {
        $start = $startDate instanceof Carbon ? $startDate->copy() : Carbon::parse($startDate);

        return $start->startOfDay()->addMonthsNoOverflow($durasiBulan);
    }

    /**
     * Calculate room block end date, which includes the 14-day cleaning / vacancy buffer.
     */
    public function calculateBlockEndDate(Carbon|string $endDate, ?int $jedaHari = null): Carbon
    {
        $end = $endDate instanceof Carbon ? $endDate->copy() : Carbon::parse($endDate);
        $jeda = $jedaHari ?? (int) Pengaturan::get('booking_jeda_hari', 14);

        return $end->startOfDay()->addDays($jeda);
    }

    /**
     * Validate candidate start date.
     * Rule (b): Tanggal mulai booking maksimal 3 bulan ke depan dari hari ini.
     * Tanggal mulai bebas dan tidak boleh tanggal lampau.
     */
    public function validateStartDate(Carbon|string $startDate): array
    {
        try {
            $start = ($startDate instanceof Carbon ? $startDate->copy() : Carbon::parse($startDate))->startOfDay();
        } catch (\Exception $e) {
            return [
                'valid' => false,
                'message' => 'Format tanggal mulai tidak valid.',
            ];
        }

        $today = now()->startOfDay();
        if ($start->lt($today)) {
            return [
                'valid' => false,
                'message' => 'Tanggal mulai booking tidak boleh di masa lampau.',
            ];
        }

        $maxBulan = (int) Pengaturan::get('booking_max_bulan_ke_depan', 3);
        $maxDate = $today->copy()->addMonthsNoOverflow($maxBulan);

        if ($start->gt($maxDate)) {
            return [
                'valid' => false,
                'message' => "Tanggal mulai booking maksimal {$maxBulan} bulan ke depan dari hari ini (maksimal tanggal {$maxDate->translatedFormat('d F Y')}).",
            ];
        }

        return [
            'valid' => true,
            'message' => null,
            'date' => $start,
        ];
    }

    /**
     * Comprehensive room availability check for a specific start date and duration.
     *
     * @return array{
     *     available: bool,
     *     reason: ?string,
     *     message: ?string,
     *     tanggal_mulai: string,
     *     tanggal_selesai: string,
     *     tanggal_blok_selesai: string,
     *     durasi_bulan: int,
     *     max_durasi_bulan: int,
     *     available_durations: int[],
     *     ada_booking_berikutnya: bool,
     *     booking_berikutnya_mulai: ?string
     * }
     */
    public function checkKamarAvailability(
        int|Kamar $kamar,
        Carbon|string $tanggalMulai,
        int $durasiBulan = 1,
        ?int $excludeBookingId = null,
        bool $withLock = false
    ): array {
        $kamarModel = $kamar instanceof Kamar
            ? $kamar
            : Kamar::with('gedung.cabang')->findOrFail($kamar);

        // 1. Rule (a): Check active tenant
        if ($this->hasActiveTenant($kamarModel)) {
            return [
                'available' => false,
                'reason' => 'active_tenant',
                'message' => "Kamar {$kamarModel->nomor_kamar} saat ini masih dihuni oleh penghuni aktif dan belum dapat dibooking.",
                'tanggal_mulai' => (string) $tanggalMulai,
                'tanggal_selesai' => '',
                'tanggal_blok_selesai' => '',
                'durasi_bulan' => $durasiBulan,
                'max_durasi_bulan' => 0,
                'available_durations' => [],
                'ada_booking_berikutnya' => false,
                'booking_berikutnya_mulai' => null,
            ];
        }

        // 2. Check room operational status
        if ($kamarModel->status === 'maintenance') {
            return [
                'available' => false,
                'reason' => 'maintenance',
                'message' => "Kamar {$kamarModel->nomor_kamar} sedang dalam masa perbaikan (maintenance).",
                'tanggal_mulai' => (string) $tanggalMulai,
                'tanggal_selesai' => '',
                'tanggal_blok_selesai' => '',
                'durasi_bulan' => $durasiBulan,
                'max_durasi_bulan' => 0,
                'available_durations' => [],
                'ada_booking_berikutnya' => false,
                'booking_berikutnya_mulai' => null,
            ];
        }

        // 3. Rule (b): Validate start date
        $valStart = $this->validateStartDate($tanggalMulai);
        if (! $valStart['valid']) {
            return [
                'available' => false,
                'reason' => 'invalid_start_date',
                'message' => $valStart['message'],
                'tanggal_mulai' => (string) $tanggalMulai,
                'tanggal_selesai' => '',
                'tanggal_blok_selesai' => '',
                'durasi_bulan' => $durasiBulan,
                'max_durasi_bulan' => 0,
                'available_durations' => [],
                'ada_booking_berikutnya' => false,
                'booking_berikutnya_mulai' => null,
            ];
        }

        $startDate = $valStart['date'];
        $durasiBulan = max(1, $durasiBulan);
        $endDate = $this->calculateEndDate($startDate, $durasiBulan);
        $blockEndDate = $this->calculateBlockEndDate($endDate);

        // 4. Calculate available durations and gap to next booking
        $durationInfo = $this->calculateAvailableDurations($kamarModel, $startDate, $excludeBookingId, $withLock);

        if (! $durationInfo['available'] || $durationInfo['max_durasi_bulan'] === 0) {
            return [
                'available' => false,
                'reason' => 'no_available_gap',
                'message' => $durationInfo['alasan'] ?? 'Kamar tidak tersedia pada tanggal tersebut karena bertabrakan dengan booking lain atau jeda 14 hari.',
                'tanggal_mulai' => $startDate->toDateString(),
                'tanggal_selesai' => $endDate->toDateString(),
                'tanggal_blok_selesai' => $blockEndDate->toDateString(),
                'durasi_bulan' => $durasiBulan,
                'max_durasi_bulan' => 0,
                'available_durations' => [],
                'ada_booking_berikutnya' => $durationInfo['ada_booking_berikutnya'],
                'booking_berikutnya_mulai' => $durationInfo['booking_berikutnya_mulai'],
            ];
        }

        // 5. Rule (c): Check if requested duration fits within max allowed duration
        if ($durasiBulan > $durationInfo['max_durasi_bulan']) {
            return [
                'available' => false,
                'reason' => 'duration_exceeded',
                'message' => "Durasi sewa yang diminta ({$durasiBulan} bulan) melebihi durasi maksimal yang tersedia ({$durationInfo['max_durasi_bulan']} bulan) sebelum penyewa berikutnya masuk.",
                'tanggal_mulai' => $startDate->toDateString(),
                'tanggal_selesai' => $endDate->toDateString(),
                'tanggal_blok_selesai' => $blockEndDate->toDateString(),
                'durasi_bulan' => $durasiBulan,
                'max_durasi_bulan' => $durationInfo['max_durasi_bulan'],
                'available_durations' => $durationInfo['durasi_pilihan'],
                'ada_booking_berikutnya' => $durationInfo['ada_booking_berikutnya'],
                'booking_berikutnya_mulai' => $durationInfo['booking_berikutnya_mulai'],
            ];
        }

        // 6. Direct collision verification against all active bookings
        $hasCollision = $this->hasBookingCollision(
            $kamarModel->id,
            $startDate->toDateString(),
            $blockEndDate->toDateString(),
            $excludeBookingId,
            $withLock
        );

        if ($hasCollision) {
            return [
                'available' => false,
                'reason' => 'date_collision',
                'message' => 'Rentang tanggal sewa atau masa jeda pembersihan 14 hari bertabrakan dengan jadwal booking lain di kamar ini.',
                'tanggal_mulai' => $startDate->toDateString(),
                'tanggal_selesai' => $endDate->toDateString(),
                'tanggal_blok_selesai' => $blockEndDate->toDateString(),
                'durasi_bulan' => $durasiBulan,
                'max_durasi_bulan' => $durationInfo['max_durasi_bulan'],
                'available_durations' => $durationInfo['durasi_pilihan'],
                'ada_booking_berikutnya' => $durationInfo['ada_booking_berikutnya'],
                'booking_berikutnya_mulai' => $durationInfo['booking_berikutnya_mulai'],
            ];
        }

        return [
            'available' => true,
            'reason' => null,
            'message' => 'Kamar tersedia untuk dibooking pada rentang tanggal tersebut.',
            'tanggal_mulai' => $startDate->toDateString(),
            'tanggal_selesai' => $endDate->toDateString(),
            'tanggal_blok_selesai' => $blockEndDate->toDateString(),
            'durasi_bulan' => $durasiBulan,
            'max_durasi_bulan' => $durationInfo['max_durasi_bulan'],
            'available_durations' => $durationInfo['durasi_pilihan'],
            'ada_booking_berikutnya' => $durationInfo['ada_booking_berikutnya'],
            'booking_berikutnya_mulai' => $durationInfo['booking_berikutnya_mulai'],
        ];
    }

    /**
     * Calculate available durations in whole months that fit in the time window.
     * Celah ke booking berikutnya minimal 1 bulan + 14 hari.
     *
     * @return array{
     *     available: bool,
     *     max_durasi_bulan: int,
     *     durasi_pilihan: int[],
     *     ada_booking_berikutnya: bool,
     *     booking_berikutnya_mulai: ?string,
     *     alasan: ?string
     * }
     */
    public function calculateAvailableDurations(
        int|Kamar $kamar = 0,
        Carbon|string $tanggalMulai = '',
        ?int $excludeBookingId = null,
        bool $withLock = false,
        int|Kamar|null $kamarId = null
    ): array {
        $actualKamar = $kamarId ?? $kamar;
        $resolvedKamarId = $actualKamar instanceof Kamar ? $actualKamar->id : $actualKamar;
        $start = ($tanggalMulai instanceof Carbon ? $tanggalMulai->copy() : Carbon::parse($tanggalMulai))->startOfDay();

        // Check active tenant
        if ($this->hasActiveTenant($resolvedKamarId)) {
            return [
                'available' => false,
                'max_durasi_bulan' => 0,
                'durasi_pilihan' => [],
                'ada_booking_berikutnya' => false,
                'booking_berikutnya_mulai' => null,
                'alasan' => 'Kamar saat ini masih memiliki penghuni aktif.',
            ];
        }

        // Query active bookings for this room
        $bookingQuery = Booking::where('kamar_id', $resolvedKamarId)
            ->whereIn('status', Booking::STATUSES_HOLDING_ROOM);

        if ($excludeBookingId) {
            $bookingQuery->where('id', '!=', $excludeBookingId);
        }

        if ($withLock) {
            $bookingQuery->lockForUpdate();
        }

        $bookings = $bookingQuery->get();

        // 1. Check if candidate start date is inside a previous booking's block window (end + 14 days)
        foreach ($bookings as $b) {
            $bBlockEnd = $b->tanggal_blok_selesai
                ? Carbon::parse($b->tanggal_blok_selesai)->startOfDay()
                : $this->calculateBlockEndDate(Carbon::parse($b->tanggal_selesai ?? $b->rencana_checkin));

            $bStart = Carbon::parse($b->tanggal_mulai ?? $b->rencana_checkin)->startOfDay();

            // If candidate starts before previous booking finishes its 14-day block
            if ($start->gte($bStart) && $start->lt($bBlockEnd)) {
                return [
                    'available' => false,
                    'max_durasi_bulan' => 0,
                    'durasi_pilihan' => [],
                    'ada_booking_berikutnya' => false,
                    'booking_berikutnya_mulai' => null,
                    'alasan' => "Kamar sedang dalam masa pembersihan/jeda hingga tanggal {$bBlockEnd->translatedFormat('d F Y')}.",
                ];
            }

            // If candidate overlaps directly with a booking starting before it
            if ($bStart->lte($start) && $bBlockEnd->gt($start)) {
                return [
                    'available' => false,
                    'max_durasi_bulan' => 0,
                    'durasi_pilihan' => [],
                    'ada_booking_berikutnya' => false,
                    'booking_berikutnya_mulai' => null,
                    'alasan' => 'Tanggal mulai bertabrakan dengan jadwal sewa sebelumnya.',
                ];
            }
        }

        // 2. Find earliest future booking that starts AFTER candidate start date
        $nextBooking = $bookings->filter(function ($b) use ($start) {
            $bStart = Carbon::parse($b->tanggal_mulai ?? $b->rencana_checkin)->startOfDay();

            return $bStart->gt($start);
        })->sortBy(function ($b) {
            return Carbon::parse($b->tanggal_mulai ?? $b->rencana_checkin)->timestamp;
        })->first();

        $maxAllowed = (int) Pengaturan::get('booking_max_durasi_standar', 12);
        if ($maxAllowed < 1) {
            $maxAllowed = 12;
        }

        $durasiPilihan = [];

        if ($nextBooking) {
            $nextStart = Carbon::parse($nextBooking->tanggal_mulai ?? $nextBooking->rencana_checkin)->startOfDay();
            $jedaHari = (int) Pengaturan::get('booking_jeda_hari', 14);

            for ($d = 1; $d <= $maxAllowed; $d++) {
                $candEnd = (clone $start)->addMonthsNoOverflow($d);
                $candBlockEnd = (clone $candEnd)->addDays($jedaHari);

                // Safe check: candidate + 14-day buffer must not exceed next booking's start
                if ($candBlockEnd->lte($nextStart)) {
                    $durasiPilihan[] = $d;
                } else {
                    break;
                }
            }

            $maxDurasi = count($durasiPilihan) > 0 ? max($durasiPilihan) : 0;

            if ($maxDurasi === 0) {
                return [
                    'available' => false,
                    'max_durasi_bulan' => 0,
                    'durasi_pilihan' => [],
                    'ada_booking_berikutnya' => true,
                    'booking_berikutnya_mulai' => $nextStart->toDateString(),
                    'alasan' => "Celah ke booking berikutnya (mulai {$nextStart->translatedFormat('d F Y')}) kurang dari 1 bulan sewa + 14 hari jeda pengosongan.",
                ];
            }

            return [
                'available' => true,
                'max_durasi_bulan' => $maxDurasi,
                'durasi_pilihan' => $durasiPilihan,
                'ada_booking_berikutnya' => true,
                'booking_berikutnya_mulai' => $nextStart->toDateString(),
                'alasan' => null,
            ];
        }

        // No subsequent booking: all standard duration choices 1 to maxAllowed
        $durasiPilihan = range(1, $maxAllowed);

        return [
            'available' => true,
            'max_durasi_bulan' => $maxAllowed,
            'durasi_pilihan' => $durasiPilihan,
            'ada_booking_berikutnya' => false,
            'booking_berikutnya_mulai' => null,
            'alasan' => null,
        ];
    }

    /**
     * Check if interval [candStart, candBlockEnd] collides with any existing booking holding the room.
     */
    public function hasBookingCollision(
        int $kamarId,
        string $candStartDate,
        string $candBlockEndDate,
        ?int $excludeBookingId = null,
        bool $withLock = false
    ): bool {
        $candStart = Carbon::parse($candStartDate)->startOfDay();
        $candBlockEnd = Carbon::parse($candBlockEndDate)->startOfDay();

        $query = Booking::where('kamar_id', $kamarId)
            ->whereIn('status', Booking::STATUSES_HOLDING_ROOM);

        if ($excludeBookingId) {
            $query->where('id', '!=', $excludeBookingId);
        }

        if ($withLock) {
            $query->lockForUpdate();
        }

        $existingBookings = $query->get();

        foreach ($existingBookings as $b) {
            $bStart = Carbon::parse($b->tanggal_mulai ?? $b->rencana_checkin)->startOfDay();
            $bBlockEnd = $b->tanggal_blok_selesai
                ? Carbon::parse($b->tanggal_blok_selesai)->startOfDay()
                : $this->calculateBlockEndDate(Carbon::parse($b->tanggal_selesai ?? $b->rencana_checkin));

            // Standard interval overlap condition:
            // B_start < candBlockEnd AND candStart < B_blockEnd
            if ($bStart->lt($candBlockEnd) && $candStart->lt($bBlockEnd)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Scope/Filter rooms that can be booked (no active tenant and not in maintenance).
     */
    public function filterKamarDapatDibooking(Builder $query): Builder
    {
        return $query->whereDoesntHave('penghuni', function ($q): void {
            $q->where('status', 'aktif');
        })->where('status', '!=', 'maintenance');
    }

    /**
     * Lock the room row and assert it can be booked inside a database transaction.
     * Prevents double bookings and race conditions.
     *
     * @throws ValidationException
     */
    public function lockAndVerifyKamar(
        int $kamarId,
        Carbon|string $tanggalMulai,
        int $durasiBulan,
        ?int $excludeBookingId = null
    ): array {
        // Lock room row in DB
        $kamar = Kamar::where('id', $kamarId)->lockForUpdate()->firstOrFail();

        $check = $this->checkKamarAvailability($kamar, $tanggalMulai, $durasiBulan, $excludeBookingId, true);

        if (! $check['available']) {
            throw ValidationException::withMessages([
                'kamar_id' => [$check['message'] ?? 'Kamar tidak tersedia untuk dibooking pada tanggal tersebut.'],
            ]);
        }

        return [
            'kamar' => $kamar,
            'info' => $check,
        ];
    }
}
