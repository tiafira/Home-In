<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Scheduled Jobs
Schedule::command('booking:daily-check')->dailyAt('00:30');
Schedule::command('booking:cancel-expired --hours=24')->hourly();
Schedule::command('pembayaran:mark-overdue')->dailyAt('01:00');
