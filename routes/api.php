<?php

use App\Http\Controllers\Api\Admin\BookingController;
use App\Http\Controllers\Api\Admin\CabangController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\FasilitasController;
use App\Http\Controllers\Api\Admin\IzinKeluarController;
use App\Http\Controllers\Api\Admin\KamarGedungController;
use App\Http\Controllers\Api\Admin\KomplainController;
use App\Http\Controllers\Api\Admin\LaporanBulananController;
use App\Http\Controllers\Api\Admin\LaporanController;
use App\Http\Controllers\Api\Admin\NotificationController;
use App\Http\Controllers\Api\Admin\PegawaiController;
use App\Http\Controllers\Api\Admin\PembayaranController;
use App\Http\Controllers\Api\Admin\PenghuniController;
use App\Http\Controllers\Api\Admin\PengumumanController;
use App\Http\Controllers\Api\Admin\PeringatanController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Middleware\CheckAdminRole;
use Illuminate\Support\Facades\Route;

// Public Auth Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected Routes
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Admin & Pemilik Only
    Route::middleware(CheckAdminRole::class)->prefix('admin')->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/cabang/list', [CabangController::class, 'list']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        // Booking
        Route::get('/booking', [BookingController::class, 'index']);
        Route::get('/booking/{id}', [BookingController::class, 'show']);
        Route::post('/booking/{id}/terima', [BookingController::class, 'terima']);
        Route::post('/booking/{id}/tolak', [BookingController::class, 'tolak']);
        Route::get('/booking/{id}/alternatives', [BookingController::class, 'alternatives']);
        Route::post('/booking/{id}/tawarkan-alternatif', [BookingController::class, 'tawarkanAlternatif']);
        Route::post('/booking/{id}/terima-tawaran', [BookingController::class, 'terimaTawaran']);
        Route::post('/booking/{id}/tolak-tawaran', [BookingController::class, 'tolakTawaran']);

        // Kamar & Gedung
        Route::get('/kamar-gedung', [KamarGedungController::class, 'index']);
        Route::post('/kamar', [KamarGedungController::class, 'storeKamar']);
        Route::put('/kamar/{id}', [KamarGedungController::class, 'updateKamar']);
        Route::post('/kamar/{id}/status', [KamarGedungController::class, 'updateStatusKamar']);
        Route::delete('/kamar/{id}', [KamarGedungController::class, 'destroyKamar']);
        Route::post('/gedung', [KamarGedungController::class, 'storeGedung']);
        Route::put('/gedung/{id}', [KamarGedungController::class, 'updateGedung']);
        Route::delete('/gedung/{id}', [KamarGedungController::class, 'destroyGedung']);

        // Penghuni
        Route::get('/penghuni', [PenghuniController::class, 'index']);
        Route::get('/penghuni/{id}', [PenghuniController::class, 'show']);
        Route::post('/penghuni', [PenghuniController::class, 'store']);
        Route::post('/penghuni/import', [PenghuniController::class, 'import']);
        Route::post('/penghuni/{id}/fasilitas', [PenghuniController::class, 'requestFasilitas']);
        Route::post('/penghuni/{id}/checkout', [PenghuniController::class, 'checkout']);

        // Pembayaran
        Route::get('/pembayaran', [PembayaranController::class, 'index']);
        Route::post('/pembayaran/manual', [PembayaranController::class, 'storeManual']);
        Route::put('/pembayaran/{id}/status', [PembayaranController::class, 'updateStatus']);
        Route::get('/pembayaran/booking', [PembayaranController::class, 'bookingPayments']);
        Route::post('/pembayaran/booking/{id}/verify', [PembayaranController::class, 'verifyBookingPayment']);

        // Komplain
        Route::get('/komplain', [KomplainController::class, 'index']);
        Route::put('/komplain/{id}/status', [KomplainController::class, 'updateStatus']);

        // Izin Keluar
        Route::get('/izin-keluar', [IzinKeluarController::class, 'index']);
        Route::put('/izin-keluar/{id}/status', [IzinKeluarController::class, 'updateStatus']);

        // Pengumuman
        Route::get('/pengumuman', [PengumumanController::class, 'index']);
        Route::post('/pengumuman', [PengumumanController::class, 'store']);
        Route::put('/pengumuman/{id}', [PengumumanController::class, 'update']);
        Route::delete('/pengumuman/{id}', [PengumumanController::class, 'destroy']);

        // Peringatan
        Route::get('/peringatan', [PeringatanController::class, 'index']);
        Route::post('/peringatan', [PeringatanController::class, 'store']);
        Route::post('/peringatan/quick/{penghuniId}', [PeringatanController::class, 'quickWarn']);

        // Laporan (Tamu & Pulang)
        Route::get('/laporan/tamu', [LaporanController::class, 'tamu']);
        Route::post('/laporan/tamu', [LaporanController::class, 'storeTamu']);
        Route::post('/laporan/tamu/{id}/checkout', [LaporanController::class, 'checkoutTamu']);
        Route::get('/laporan/pulang', [LaporanController::class, 'pulang']);
        Route::post('/laporan/pulang', [LaporanController::class, 'storePulang']);

        // Laporan Bulanan
        Route::get('/laporan-bulanan', [LaporanBulananController::class, 'index']);
        Route::post('/laporan-bulanan', [LaporanBulananController::class, 'store']);

        // Pegawai
        Route::get('/pegawai', [PegawaiController::class, 'index']);
        Route::post('/pegawai', [PegawaiController::class, 'store']);
        Route::put('/pegawai/{id}', [PegawaiController::class, 'update']);
        Route::delete('/pegawai/{id}', [PegawaiController::class, 'destroy']);

        // Fasilitas
        Route::get('/fasilitas', [FasilitasController::class, 'index']);
        Route::post('/fasilitas', [FasilitasController::class, 'store']);
        Route::put('/fasilitas/{id}', [FasilitasController::class, 'update']);
        Route::delete('/fasilitas/{id}', [FasilitasController::class, 'destroy']);
        Route::post('/fasilitas/permintaan/{id}', [FasilitasController::class, 'updatePermintaan']);
    });
});
