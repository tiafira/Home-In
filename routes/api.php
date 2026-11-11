<?php

use App\Http\Controllers\Api\Admin\AccountManagementController;
use App\Http\Controllers\Api\Admin\ActivityLogController;
use App\Http\Controllers\Api\Admin\BookingController;
use App\Http\Controllers\Api\Admin\BukuTamuController;
use App\Http\Controllers\Api\Admin\CabangController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\FaqController;
use App\Http\Controllers\Api\Admin\FasilitasController;
use App\Http\Controllers\Api\Admin\GlobalSearchController;
use App\Http\Controllers\Api\Admin\IzinKeluarController;
use App\Http\Controllers\Api\Admin\KamarGedungController;
use App\Http\Controllers\Api\Admin\KomplainController;
use App\Http\Controllers\Api\Admin\LaporanBulananController;
use App\Http\Controllers\Api\Admin\LaporanController;
use App\Http\Controllers\Api\Admin\NotificationController;
use App\Http\Controllers\Api\Admin\PaketController;
use App\Http\Controllers\Api\Admin\PegawaiController;
use App\Http\Controllers\Api\Admin\PembayaranController;
use App\Http\Controllers\Api\Admin\PenghuniController;
use App\Http\Controllers\Api\Admin\PengumumanController;
use App\Http\Controllers\Api\Admin\PeringatanController;
use App\Http\Controllers\Api\Admin\ReservasiFasilitasController;
use App\Http\Controllers\Api\Admin\TrashController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Public\BookingFlowController;
use App\Http\Controllers\Api\Public\PublicContentController;
use App\Http\Controllers\Api\Public\PublicNotificationController;
use App\Http\Controllers\Api\Public\UserProfileController;
use App\Http\Middleware\CheckAdminRole;
use Illuminate\Support\Facades\Route;

// Public Auth Routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Public Website API (No Auth Required)
Route::prefix('public')->group(function (): void {
    Route::get('/beranda', [PublicContentController::class, 'beranda']);
    Route::get('/cabang', [PublicContentController::class, 'cabang']);
    Route::get('/cabang/{id}', [PublicContentController::class, 'cabangDetail']);
    Route::get('/kamar/filters', [PublicContentController::class, 'filterOptions']);
    Route::get('/kamar', [PublicContentController::class, 'kamar']);
    Route::get('/kamar/{id}', [PublicContentController::class, 'kamarDetail']);
    Route::get('/kamar/{id}/ketersediaan', [PublicContentController::class, 'kamarKetersediaan']);
    Route::get('/faq', [PublicContentController::class, 'faq']);
    Route::get('/kontak', [PublicContentController::class, 'kontak']);
});

// Protected Routes
Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Calon Penghuni / User Notifications
    Route::get('/user/notifications', [PublicNotificationController::class, 'index']);
    Route::post('/user/notifications/{id}/read', [PublicNotificationController::class, 'markAsRead']);
    Route::post('/user/notifications/read-all', [PublicNotificationController::class, 'markAllAsRead']);

    // Calon Penghuni Booking Flow & Management
    Route::post('/user/booking', [BookingFlowController::class, 'store']);
    Route::get('/user/bookings', [BookingFlowController::class, 'myBookings']);
    Route::get('/user/booking/{id}', [BookingFlowController::class, 'show']);
    Route::post('/user/booking/{id}/cancel', [BookingFlowController::class, 'cancel']);
    Route::post('/user/booking/{id}/pay', [BookingFlowController::class, 'uploadPaymentProof']);
    Route::post('/user/booking/{id}/accept-alternative', [BookingFlowController::class, 'acceptAlternative']);
    Route::post('/user/booking/{id}/reject-alternative', [BookingFlowController::class, 'rejectAlternative']);
    Route::post('/user/booking/{id}/perpanjang', [BookingFlowController::class, 'ajukanPerpanjang']);

    // Calon Penghuni Profile & Account
    Route::get('/user/profile', [UserProfileController::class, 'show']);
    Route::post('/user/profile', [UserProfileController::class, 'update']);
    Route::post('/user/password', [UserProfileController::class, 'updatePassword']);

    // Admin & Pemilik Only
    Route::middleware(CheckAdminRole::class)->prefix('admin')->group(function (): void {
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/cabang', [CabangController::class, 'index']);
        Route::get('/cabang/list', [CabangController::class, 'list']);
        Route::get('/cabang/{id}', [CabangController::class, 'show']);
        Route::put('/cabang/{id}', [CabangController::class, 'update']);
        Route::post('/cabang/{id}/upload-qr', [CabangController::class, 'uploadQr']);
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
        Route::post('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);
        Route::get('/global-search', [GlobalSearchController::class, 'search']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
        Route::post('/activity-logs/{id}/read', [ActivityLogController::class, 'markAsRead']);
        Route::post('/activity-logs/read-all', [ActivityLogController::class, 'markAllAsRead']);

        // Booking
        Route::get('/booking', [BookingController::class, 'index']);
        Route::get('/booking/{id}', [BookingController::class, 'show']);
        Route::post('/booking/{id}/terima', [BookingController::class, 'setujui']);
        Route::post('/booking/{id}/setujui', [BookingController::class, 'setujui']);
        Route::post('/booking/{id}/tolak', [BookingController::class, 'tolak']);
        Route::post('/booking/{id}/bayar-tunai', [BookingController::class, 'bayarTunai']);
        Route::post('/booking/{id}/konfirmasi-pembayaran', [BookingController::class, 'verifikasiPembayaran']);
        Route::post('/booking/{id}/verifikasi-pembayaran', [BookingController::class, 'verifikasiPembayaran']);
        Route::post('/booking/{id}/tolak-bukti', [BookingController::class, 'tolakBuktiPembayaran']);
        Route::post('/booking/{id}/konfirmasi-keluar', [BookingController::class, 'konfirmasiKeluar']);
        Route::post('/booking/{id}/refund', [BookingController::class, 'tandaiRefund']);
        Route::get('/booking/{id}/kwitansi', [BookingController::class, 'kwitansi']);
        Route::get('/booking/{id}/alternatives', [BookingController::class, 'alternatives']);
        Route::post('/booking/{id}/tawarkan-alternatif', [BookingController::class, 'tawarkanAlternatif']);
        Route::post('/booking/{id}/terima-tawaran', [BookingController::class, 'terimaTawaran']);
        Route::post('/booking/{id}/tolak-tawaran', [BookingController::class, 'tolakTawaran']);
        Route::post('/booking/{id}/checkin-awal', [BookingController::class, 'checkinAwal']);

        // Kamar & Gedung
        Route::get('/kamar-gedung', [KamarGedungController::class, 'index']);
        Route::post('/kamar', [KamarGedungController::class, 'storeKamar']);
        Route::post('/kamar/bulk', [KamarGedungController::class, 'bulkStoreKamar']);
        Route::put('/kamar/{id}', [KamarGedungController::class, 'updateKamar']);
        Route::post('/kamar/{id}/status', [KamarGedungController::class, 'updateStatusKamar']);
        Route::delete('/kamar/{id}', [KamarGedungController::class, 'destroyKamar']);
        Route::post('/gedung/resolve-location', [KamarGedungController::class, 'resolveGmapsLocation']);
        Route::post('/gedung', [KamarGedungController::class, 'storeGedung']);
        Route::put('/gedung/{id}', [KamarGedungController::class, 'updateGedung']);
        Route::delete('/gedung/{id}', [KamarGedungController::class, 'destroyGedung']);

        // Penghuni
        Route::get('/penghuni', [PenghuniController::class, 'index']);
        Route::get('/penghuni/empty-rooms', [PenghuniController::class, 'emptyRooms']);
        Route::get('/penghuni/bermasalah', [PenghuniController::class, 'penyewaBermasalah']);
        Route::get('/penghuni/pelanggaran-jam-malam', [PenghuniController::class, 'pelanggaranJamMalam']);
        Route::get('/penghuni/{id}', [PenghuniController::class, 'show']);
        Route::post('/penghuni', [PenghuniController::class, 'store']);
        Route::post('/penghuni/import', [PenghuniController::class, 'import']);
        Route::post('/penghuni/{id}/fasilitas', [PenghuniController::class, 'requestFasilitas']);
        Route::post('/penghuni/{id}/perpanjang', [PenghuniController::class, 'perpanjang']);
        Route::post('/penghuni/{id}/pindah-kamar', [PenghuniController::class, 'pindahKamar']);
        Route::post('/penghuni/{id}/peringatan', [PenghuniController::class, 'kirimPeringatan']);
        Route::post('/penghuni/{id}/checkout', [PenghuniController::class, 'checkout']);

        // Pembayaran
        Route::get('/pembayaran', [PembayaranController::class, 'index']);
        Route::get('/pembayaran/penjaga-list', [PembayaranController::class, 'penjagaList']);
        Route::post('/pembayaran/generate-massal', [PembayaranController::class, 'generateMassal']);
        Route::post('/pembayaran/ingatkan-massal', [PembayaranController::class, 'ingatkanMassal']);
        Route::post('/pembayaran/manual', [PembayaranController::class, 'storeManual']);
        Route::put('/pembayaran/{id}/status', [PembayaranController::class, 'updateStatus']);
        Route::post('/pembayaran/{id}/bayar-tunai', [PembayaranController::class, 'bayarTunai']);
        Route::post('/pembayaran/{id}/tolak-bukti', [PembayaranController::class, 'tolakBukti']);
        Route::get('/pembayaran/booking', [PembayaranController::class, 'bookingPayments']);
        Route::post('/pembayaran/booking/{id}/verify', [PembayaranController::class, 'verifyBookingPayment']);

        // Kelola Akun (Manajemen Pengguna)
        Route::get('/users', [AccountManagementController::class, 'index']);
        Route::post('/users', [AccountManagementController::class, 'store']);
        Route::put('/users/{id}', [AccountManagementController::class, 'update']);
        Route::post('/users/{id}/toggle-status', [AccountManagementController::class, 'toggleStatus']);
        Route::post('/users/{id}/reset-password', [AccountManagementController::class, 'resetPassword']);
        Route::delete('/users/{id}', [AccountManagementController::class, 'destroy']);

        // Baru Saja Dihapus (Trash / Soft Delete Management)
        Route::get('/trash', [TrashController::class, 'index']);
        Route::post('/trash/{type}/{id}/restore', [TrashController::class, 'restore']);
        Route::delete('/trash/{type}/{id}/force-delete', [TrashController::class, 'forceDelete']);
        Route::post('/trash/restore-all', [TrashController::class, 'restoreAll']);
        Route::delete('/trash/empty', [TrashController::class, 'emptyTrash']);

        // Penerimaan Paket
        Route::get('/paket', [PaketController::class, 'index']);
        Route::post('/paket', [PaketController::class, 'store']);
        Route::put('/paket/{id}', [PaketController::class, 'update']);
        Route::post('/paket/{id}/diambil', [PaketController::class, 'markDiambil']);
        Route::delete('/paket/{id}', [PaketController::class, 'destroy']);

        // Buku Tamu
        Route::get('/buku-tamu', [BukuTamuController::class, 'index']);
        Route::post('/buku-tamu', [BukuTamuController::class, 'store']);
        Route::put('/buku-tamu/{id}', [BukuTamuController::class, 'update']);
        Route::post('/buku-tamu/{id}/checkout', [BukuTamuController::class, 'checkout']);
        Route::delete('/buku-tamu/{id}', [BukuTamuController::class, 'destroy']);

        // Reservasi Fasilitas
        Route::get('/reservasi-fasilitas', [ReservasiFasilitasController::class, 'index']);
        Route::post('/reservasi-fasilitas', [ReservasiFasilitasController::class, 'store']);
        Route::post('/reservasi-fasilitas/{id}/approve', [ReservasiFasilitasController::class, 'approve']);
        Route::post('/reservasi-fasilitas/{id}/reject', [ReservasiFasilitasController::class, 'reject']);
        Route::delete('/reservasi-fasilitas/{id}', [ReservasiFasilitasController::class, 'destroy']);

        // Komplain
        Route::get('/komplain', [KomplainController::class, 'index']);
        Route::put('/komplain/{id}/status', [KomplainController::class, 'updateStatus']);
        Route::post('/komplain/{id}/assign', [KomplainController::class, 'assign']);
        Route::delete('/komplain/{id}', [KomplainController::class, 'destroy']);

        // Izin Keluar
        Route::get('/izin-keluar', [IzinKeluarController::class, 'index']);
        Route::put('/izin-keluar/{id}/status', [IzinKeluarController::class, 'updateStatus']);

        // Pengumuman
        Route::get('/pengumuman', [PengumumanController::class, 'index']);
        Route::post('/pengumuman', [PengumumanController::class, 'store']);
        Route::put('/pengumuman/{id}', [PengumumanController::class, 'update']);
        Route::delete('/pengumuman/{id}', [PengumumanController::class, 'destroy']);

        // Kelola FAQ Publik
        Route::get('/faq', [FaqController::class, 'index']);
        Route::post('/faq', [FaqController::class, 'store']);
        Route::put('/faq/{id}', [FaqController::class, 'update']);
        Route::delete('/faq/{id}', [FaqController::class, 'destroy']);

        // Peringatan
        Route::get('/peringatan', [PeringatanController::class, 'index']);
        Route::post('/peringatan', [PeringatanController::class, 'store']);
        Route::put('/peringatan/{id}', [PeringatanController::class, 'update']);
        Route::delete('/peringatan/{id}', [PeringatanController::class, 'destroy']);
        Route::post('/peringatan/quick/{penghuniId}', [PeringatanController::class, 'quickWarn']);

        // Laporan (General, Tamu & Pulang)
        Route::get('/laporan/general', [LaporanController::class, 'generalReport']);
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
