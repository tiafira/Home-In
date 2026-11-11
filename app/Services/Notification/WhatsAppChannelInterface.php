<?php

namespace App\Services\Notification;

use App\Models\User;

interface WhatsAppChannelInterface
{
    /**
     * Send a WhatsApp message to a user or phone number.
     *
     * @param  User|string  $recipient  User model or raw phone number (e.g. 08123456789 or 628123456789)
     * @param  string  $message  Text message
     * @param  array  $metadata  Additional payload (buttons, image url, template id)
     */
    public function send(User|string $recipient, string $message, array $metadata = []): bool;
}
