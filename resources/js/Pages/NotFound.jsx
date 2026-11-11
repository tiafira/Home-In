import React from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../Layouts/PublicLayout';

export default function NotFound() {
    return (
        <PublicLayout title="Halaman Tidak Ditemukan (404)">
            <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
                <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-100 shadow-xl">
                    <div className="w-24 h-24 rounded-3xl bg-[#EAF1FC] text-[#1E5FC9] flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <span className="text-4xl font-black">404</span>
                    </div>

                    <h1 className="text-2xl font-extrabold text-[#1F2A44] mb-2">
                        Halaman Tidak Ditemukan
                    </h1>

                    <p className="text-xs sm:text-sm text-[#8A94A6] mb-8 leading-relaxed">
                        Maaf, halaman yang Anda tuju tidak ditemukan atau alamat URL mungkin telah dipindahkan.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                        <Link
                            to="/"
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
                        >
                            Kembali ke Beranda
                        </Link>
                        <Link
                            to="/kamar"
                            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#1F2A44] text-xs font-bold transition active:scale-95"
                        >
                            Cari Kamar Kost
                        </Link>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}

