<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAdminRole
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, ['pemilik', 'admin'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Akses ditolak. Halaman ini hanya dapat diakses oleh pemilik atau admin kost.',
            ], 403);
        }

        return $next($request);
    }
}
