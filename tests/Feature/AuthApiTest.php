<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthApiTest extends TestCase
{
    public function test_user_can_register_successfully_with_default_role_calon_penghuni(): void
    {
        $uniqueEmail = 'calon_'.uniqid().'@example.com';

        $response = $this->postJson('/api/register', [
            'nama' => 'Budi Calon Penghuni',
            'email' => $uniqueEmail,
            'no_hp' => '081234567890',
            'password' => 'password123',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'status' => 'success',
                'message' => 'Registrasi berhasil',
            ])
            ->assertJsonPath('data.user.email', $uniqueEmail)
            ->assertJsonPath('data.user.role', 'calon_penghuni')
            ->assertJsonPath('data.user.status_aktif', 1);

        $this->assertDatabaseHas('users', [
            'email' => $uniqueEmail,
            'role' => 'calon_penghuni',
            'status_aktif' => 1,
        ]);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        $email = 'existing_'.uniqid().'@example.com';
        User::create([
            'nama' => 'User Existing',
            'email' => $email,
            'password' => Hash::make('password123'),
            'no_hp' => '081211112222',
            'role' => 'calon_penghuni',
            'status_aktif' => 1,
        ]);

        $response = $this->postJson('/api/register', [
            'nama' => 'User Duplikat',
            'email' => $email,
            'no_hp' => '081233334444',
            'password' => 'password123',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['email']);
    }

    public function test_user_can_login_successfully_with_correct_credentials(): void
    {
        $email = 'login_'.uniqid().'@example.com';
        User::create([
            'nama' => 'User Login',
            'email' => $email,
            'password' => Hash::make('secret123'),
            'no_hp' => '081299998888',
            'role' => 'admin',
            'status_aktif' => 1,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'secret123',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Login berhasil',
            ])
            ->assertJsonPath('data.user.email', $email)
            ->assertJsonStructure([
                'data' => [
                    'user' => ['id', 'nama', 'email', 'role', 'status_aktif'],
                    'token',
                ],
            ]);
    }

    public function test_login_fails_with_invalid_credentials(): void
    {
        $email = 'fail_'.uniqid().'@example.com';
        User::create([
            'nama' => 'User Gagal',
            'email' => $email,
            'password' => Hash::make('secret123'),
            'no_hp' => '081277776666',
            'role' => 'admin',
            'status_aktif' => 1,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'wrong_password',
        ]);

        $response->assertStatus(422)
            ->assertJson([
                'status' => 'error',
                'message' => 'Email atau password salah.',
            ]);
    }

    public function test_inactive_user_cannot_login(): void
    {
        $email = 'inactive_'.uniqid().'@example.com';
        User::create([
            'nama' => 'User Nonaktif',
            'email' => $email,
            'password' => Hash::make('secret123'),
            'no_hp' => '081255554444',
            'role' => 'penghuni',
            'status_aktif' => 0,
        ]);

        $response = $this->postJson('/api/login', [
            'email' => $email,
            'password' => 'secret123',
        ]);

        $response->assertStatus(403)
            ->assertJson([
                'status' => 'error',
                'message' => 'Akun Anda dinonaktifkan. Silakan hubungi admin kost.',
            ]);
    }

    public function test_authenticated_user_can_fetch_profile_and_logout(): void
    {
        $user = User::create([
            'nama' => 'User Profil',
            'email' => 'profil_'.uniqid().'@example.com',
            'password' => Hash::make('secret123'),
            'no_hp' => '081244443333',
            'role' => 'admin',
            'status_aktif' => 1,
        ]);

        $token = $user->createToken('test_token')->plainTextToken;

        $meResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/me');

        $meResponse->assertStatus(200)
            ->assertJsonPath('data.user.email', $user->email);

        $logoutResponse = $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/logout');

        $logoutResponse->assertStatus(200)
            ->assertJson([
                'status' => 'success',
                'message' => 'Logout berhasil',
            ]);
    }
}
