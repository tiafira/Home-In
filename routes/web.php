<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| The entire frontend is handled by the React Router SPA application.
| This includes the Public Website (Beranda, Kamar, Cabang, FAQ, Booking),
| Auth pages (Login, Register), and Admin Dashboard.
|
*/

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
