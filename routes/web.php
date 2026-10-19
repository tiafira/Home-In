<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Landing page at root (/), and all other non-API routes are handled
| by the React Router SPA application.
|
*/

Route::get('/', function () {
    return view('landing');
});

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '^(?!api).*$');
