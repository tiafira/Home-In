<?php

namespace App\Services\Notification;

use App\Models\User;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class LogWhatsAppChannel implements WhatsAppChannelInterface
{
    /**
     * Send a WhatsApp message.
     */
    public function send(User|string $recipient, string $message, array $metadata = []): bool
    {
        $phone = $recipient instanceof User ? ($recipient->no_hp ?? '') : $recipient;
        $phone = preg_replace('/[^0-9]/', '', (string) $phone);

        if (empty($phone)) {
            Log::info('[WhatsApp Notif] No phone number provided, skipping WA delivery.');

            return false;
        }

        // Format into standard Indonesian international format (628...)
        if (str_starts_with($phone, '0')) {
            $phone = '62'.substr($phone, 1);
        }

        $apiUrl = config('services.whatsapp.api_url', env('WHATSAPP_API_URL'));
        $apiKey = config('services.whatsapp.api_key', env('WHATSAPP_API_KEY'));

        // If external gateway is configured in .env, send via HTTP
        if (! empty($apiUrl) && ! empty($apiKey)) {
            try {
                $response = Http::timeout(10)
                    ->withHeaders(['Authorization' => $apiKey])
                    ->post($apiUrl, [
                        'target' => $phone,
                        'message' => $message,
                        'url' => $metadata['url'] ?? null,
                    ]);

                Log::info("[WhatsApp Gateway] Dispatched to {$phone}: HTTP ".$response->status());

                return $response->successful();
            } catch (\Exception $e) {
                Log::warning("[WhatsApp Gateway Error] Failed sending to {$phone}: ".$e->getMessage());
            }
        }

        // Default fallback: Log cleanly for audit and development
        Log::info("[WhatsApp Simulated Delivery] To: {$phone}\nMessage:\n{$message}");

        return true;
    }
}
