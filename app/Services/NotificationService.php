<?php

namespace App\Services;

use App\Models\Notifikasi;
use App\Models\Pegawai;
use App\Models\User;
use App\Services\Notification\LogWhatsAppChannel;
use App\Services\Notification\WhatsAppChannelInterface;
use Illuminate\Support\Collection;

class NotificationService
{
    protected WhatsAppChannelInterface $waChannel;

    public function __construct(?WhatsAppChannelInterface $waChannel = null)
    {
        $this->waChannel = $waChannel ?? app(WhatsAppChannelInterface::class, fn () => new LogWhatsAppChannel);
    }

    /**
     * Send in-app notification and WhatsApp message to a user.
     */
    public function send(
        User $user,
        string $judul,
        string $pesan,
        string $tipe = 'info',
        ?string $redirectUrl = null,
        ?string $referensiTabel = null,
        ?int $referensiId = null,
        bool $sendWhatsApp = true
    ): Notifikasi {
        // 1. In-App Notification
        $notif = Notifikasi::create([
            'user_id' => $user->id,
            'judul' => $judul,
            'isi' => $pesan,
            'tipe' => $tipe,
            'redirect_url' => $redirectUrl,
            'referensi_tabel' => $referensiTabel,
            'referensi_id' => $referensiId,
            'sudah_dibaca' => false,
            'created_at' => now(),
        ]);

        // 2. WhatsApp Notification
        if ($sendWhatsApp && ! empty($user->no_hp)) {
            $appName = config('app.name', 'Home-In Kost');
            $waMessage = "*[{$appName}] - {$judul}*\n\nHalo {$user->nama},\n\n{$pesan}";

            if ($redirectUrl) {
                $fullUrl = str_starts_with($redirectUrl, 'http')
                    ? $redirectUrl
                    : url($redirectUrl);
                $waMessage .= "\n\nLihat detail selengkapnya di:\n{$fullUrl}";
            }

            $waMessage .= "\n\n_Pesan otomatis sistem Home-In Kost._";

            $this->waChannel->send($user, $waMessage, [
                'redirect_url' => $redirectUrl,
                'judul' => $judul,
            ]);
        }

        return $notif;
    }

    /**
     * Alias helper for notifyUser
     */
    public function notifyUser(
        ?User $user,
        string $judul,
        ?string $isi = null,
        string $tipe = 'info',
        ?string $redirectUrl = null,
        ?string $referensiTabel = null,
        ?int $referensiId = null,
        bool $sendWhatsApp = true,
        ?string $pesan = null
    ): ?Notifikasi {
        if (! $user) {
            return null;
        }

        $finalPesan = $isi ?? $pesan ?? '';

        return $this->send($user, $judul, $finalPesan, $tipe, $redirectUrl, $referensiTabel, $referensiId, $sendWhatsApp);
    }

    /**
     * Send notification to all Administrators and Owners.
     */
    public function notifyAdmins(
        string $judul,
        ?string $pesan = null,
        string $tipe = 'info',
        ?string $redirectUrl = null,
        ?string $referensiTabel = null,
        ?int $referensiId = null,
        ?string $isi = null
    ): Collection {
        $finalPesan = $isi ?? $pesan ?? '';
        $admins = User::whereIn('role', ['pemilik', 'admin'])->get();

        return $admins->map(function ($admin) use ($judul, $finalPesan, $tipe, $redirectUrl, $referensiTabel, $referensiId) {
            return $this->send($admin, $judul, $finalPesan, $tipe, $redirectUrl, $referensiTabel, $referensiId, false);
        });
    }

    /**
     * Send notification to Penjaga assigned to a specific branch.
     */
    public function notifyBranchGuards(
        int $cabangId,
        string $judul,
        ?string $pesan = null,
        string $tipe = 'info',
        ?string $redirectUrl = null,
        ?string $referensiTabel = null,
        ?int $referensiId = null,
        ?string $isi = null
    ): Collection {
        $finalPesan = $isi ?? $pesan ?? '';
        $pegawais = Pegawai::with('user')
            ->where('cabang_id', $cabangId)
            ->where('jabatan', 'penjaga')
            ->get();

        return $pegawais->map(function ($pegawai) use ($judul, $finalPesan, $tipe, $redirectUrl, $referensiTabel, $referensiId) {
            if ($pegawai->user) {
                return $this->send($pegawai->user, $judul, $finalPesan, $tipe, $redirectUrl, $referensiTabel, $referensiId, true);
            }

            return null;
        })->filter();
    }
}
