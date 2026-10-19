import React from 'react';

const STATUS_CONFIG = {
    // Pembayaran
    lunas: { label: 'Lunas', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    menunggu_konfirmasi: { label: 'Menunggu Konfirmasi', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    belum_bayar: { label: 'Belum Bayar', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
    telat: { label: 'Telat Bayar', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    dibatalkan: { label: 'Dibatalkan', bg: 'bg-zinc-100 text-zinc-600 border-zinc-200' },

    // Kamar
    kosong: { label: 'Kosong', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    terisi: { label: 'Terisi', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    dibooking: { label: 'Dibooking', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    maintenance: { label: 'Perbaikan', bg: 'bg-purple-50 text-purple-700 border-purple-200' },

    // Komplain
    baru: { label: 'Belum Ditanggapi', bg: 'bg-rose-50 text-rose-700 border-rose-200' },
    diproses: { label: 'Diproses', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    selesai: { label: 'Selesai', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },

    // Booking
    menunggu_pembayaran: { label: 'Menunggu Pembayaran', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    menunggu_persetujuan: { label: 'Menunggu Persetujuan', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
    ditawarkan_alternatif: { label: 'Ditawarkan Alternatif', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
    dikonfirmasi: { label: 'Dikonfirmasi', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    ditolak: { label: 'Ditolak', bg: 'bg-rose-50 text-rose-700 border-rose-200' },

    // Izin Keluar
    menunggu: { label: 'Menunggu', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
    disetujui: { label: 'Disetujui', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },

    // Umum
    aktif: { label: 'Aktif', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    nonaktif: { label: 'Nonaktif', bg: 'bg-slate-100 text-slate-600 border-slate-200' },
};

export default function StatusBadge({ status, text, size = 'md' }) {
    const key = (status || '').toLowerCase().trim();
    const config = STATUS_CONFIG[key] || {
        label: text || status || '-',
        bg: 'bg-slate-100 text-slate-600 border-slate-200',
    };

    const displayText = text || config.label;
    const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-[13px]';

    return (
        <span
            className={
                'inline-flex items-center font-semibold rounded-full border whitespace-nowrap ' +
                sizeClasses + ' ' + config.bg
            }
        >
            {displayText}
        </span>
    );
}
