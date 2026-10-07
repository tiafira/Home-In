<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| All frontend routing is handled by the React Router SPA application.
|
*/

Route::get('/', function () {
    return view('landing');
});

Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
