<?php

namespace Database\Seeders;

use App\Models\Cabang;
use Illuminate\Database\Seeder;

class CleanDuplicateCabangSeeder extends Seeder
{
    public function run(): void
    {
        $c1 = Cabang::find(1);
        if ($c1) {
            $c1->update([
                'nama_cabang' => 'Home In Cilandak - Jakarta Selatan',
                'nama_bank' => 'BCA (Bank Central Asia)',
                'no_rekening' => '8801234567',
                'nama_pemilik_rekening' => 'PT Home In Properti Cilandak',
                'qr_pembayaran' => 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=HOMEIN_CILANDAK',
                'no_wa' => '081234567890',
                'email_cabang' => 'cilandak@home-in.com',
            ]);
        }

        $c18 = Cabang::find(18);
        if ($c18) {
            foreach ($c18->gedung as $g) {
                foreach ($g->kamar as $k) {
                    $k->kamarFoto()->delete();
                    $k->kamarFasilitas()->delete();
                    $k->delete();
                }
                $g->delete();
            }
            $c18->delete();
        }
    }
}
