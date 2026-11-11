import React from 'react';
import { Link } from 'react-router-dom';

export default function PublicFooter() {
    return (
        <footer className="bg-[#1F2A44] text-white pt-16 pb-10 border-t border-slate-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-slate-700/60">
                    {/* Brand Info */}
                    <div className="space-y-4">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#263b53] flex items-center justify-center p-1.5 shadow-md">
                                <img
                                    src="/Group 2.svg"
                                    alt="Home-In Logo"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                            <span className="font-extrabold text-2xl tracking-tight">
                                Home<span className="text-[#60a5fa]">-in</span>
                            </span>
                        </Link>
                        <p className="text-sm text-[#8A94A6] leading-relaxed">
                            Jaringan kost modern & terpercaya di 4 cabang strategis. Hunian bersih, aman dengan penjaga 24 jam, kamar mandi dalam, parkiran luas, dan free WiFi cepat.
                        </p>
                        <div className="pt-2">
                            <span className="inline-block px-3 py-1.5 bg-[#1E5FC9]/20 text-[#60a5fa] text-xs font-semibold rounded-lg border border-[#1E5FC9]/30">
                                Sewa Kamar Mulai Rp600.000 / bulan
                            </span>
                        </div>
                    </div>

                    {/* Navigasi Cepat */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-base text-white tracking-wide uppercase text-xs">
                            Navigasi
                        </h3>
                        <ul className="space-y-2.5 text-sm text-[#8A94A6]">
                            <li>
                                <Link to="/" className="hover:text-white hover:underline transition">
                                    Beranda
                                </Link>
                            </li>
                            <li>
                                <Link to="/kamar" className="hover:text-white hover:underline transition">
                                    Cari & Daftar Kamar
                                </Link>
                            </li>
                            <li>
                                <Link to="/cabang" className="hover:text-white hover:underline transition">
                                    Daftar Cabang & Gedung
                                </Link>
                            </li>
                            <li>
                                <Link to="/faq" className="hover:text-white hover:underline transition">
                                    Tanya Jawab (FAQ)
                                </Link>
                            </li>
                            <li>
                                <Link to="/kontak" className="hover:text-white hover:underline transition">
                                    Hubungi Pengelola
                                </Link>
                            </li>
                            <li>
                                <Link to="/booking-saya" className="hover:text-white hover:underline transition">
                                    Cek Status Booking
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Fasilitas & Aturan Kost */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-base text-white tracking-wide uppercase text-xs">
                            Fasilitas & Layanan
                        </h3>
                        <ul className="space-y-2 text-xs text-[#8A94A6]">
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>Kamar Mandi Dalam di setiap kamar</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>Koneksi Free WiFi Berkecepatan Tinggi</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>Penjaga Standby & Keamanan 24 Jam</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span>Area Parkir Motor & Mobil yang Luas</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                                <span>Request Kasur & Lemari (Biaya Tambahan)</span>
                            </li>
                            <li className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                <span>Pemberlakuan Jam Malam demi Kenyamanan</span>
                            </li>
                        </ul>
                    </div>

                    {/* Kontak & Bantuan */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-base text-white tracking-wide uppercase text-xs">
                            Pusat Bantuan
                        </h3>
                        <div className="space-y-3 text-xs text-[#8A94A6]">
                            <div className="flex items-start gap-2.5">
                                <svg className="w-4 h-4 text-[#60a5fa] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <div>
                                    <p className="font-semibold text-white">Layanan WhatsApp</p>
                                    <p>0812-3456-7890 (CS 24 Jam)</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <svg className="w-4 h-4 text-[#60a5fa] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                <div>
                                    <p className="font-semibold text-white">Email Resmi</p>
                                    <p>halo@home-in.com</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-2.5">
                                <svg className="w-4 h-4 text-[#60a5fa] mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                    <p className="font-semibold text-white">Jam Operasional Kantor</p>
                                    <p>08:00 - 21:00 WIB Setiap Hari</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Bar */}
                <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8A94A6]">
                    <p>&copy; {new Date().getFullYear()} Home-In Kost Management. Seluruh hak cipta dilindungi.</p>
                    <div className="flex items-center gap-6">
                        <Link to="/faq" className="hover:text-white transition">Kebijakan Privasi</Link>
                        <Link to="/faq" className="hover:text-white transition">Syarat & Aturan Kost</Link>
                        <Link to="/kontak" className="hover:text-white transition">Bantuan</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

