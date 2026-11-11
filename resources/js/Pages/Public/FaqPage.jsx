import React, { useState, useEffect } from 'react';
import PublicLayout from '../../Layouts/PublicLayout';
import FourSquareLoader from '../../Components/UI/FourSquareLoader';
import api from '../../services/api';

export default function FaqPage() {
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [openIndex, setOpenIndex] = useState(null);

    useEffect(() => {
        const fetchFaqs = async () => {
            try {
                const res = await api.get('/public/faq');
                if (res.data?.status === 'success') {
                    setFaqs(res.data.data || []);
                }
            } catch (err) {
                // ignore
            } finally {
                setLoading(false);
            }
        };

        fetchFaqs();
    }, []);

    const filteredFaqs = faqs.filter(
        (f) =>
            f.pertanyaan.toLowerCase().includes(searchQuery.toLowerCase()) ||
            f.jawaban.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PublicLayout title="Tanya Jawab (FAQ)">
            <div className="bg-[#1F2A44] text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-3xl mx-auto text-center space-y-3">
                    <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">Pusat Informasi</span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold">Pertanyaan yang Sering Diajukan</h1>
                    <p className="text-xs sm:text-sm text-[#8A94A6]">
                        Pelajari aturan kost, alur booking, pembayaran, fasilitas tambahan, serta ketentuan kenyamanan bersama di Home-In.
                    </p>

                    <div className="pt-4 max-w-lg mx-auto">
                        <input
                            type="text"
                            placeholder="Cari pertanyaan, aturan, atau fasilitas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full h-12 px-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-xs text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#60a5fa]"
                        />
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {loading ? (
                    <div className="py-20 flex justify-center">
                        <FourSquareLoader size={80} label="Memuat daftar FAQ..." />
                    </div>
                ) : filteredFaqs.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-3xl border border-slate-100">
                        <p className="text-sm font-semibold text-[#1F2A44]">Tidak ada pertanyaan yang cocok</p>
                        <p className="text-xs text-[#8A94A6] mt-1">Coba gunakan kata kunci lain dalam pencarian Anda.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredFaqs.map((faq, index) => {
                            const isOpen = openIndex === index;
                            return (
                                <div
                                    key={faq.id}
                                    className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition"
                                >
                                    <button
                                        onClick={() => setOpenIndex(isOpen ? null : index)}
                                        className="w-full p-5 text-left flex items-center justify-between gap-4 focus:outline-none"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="w-7 h-7 rounded-lg bg-[#EAF1FC] text-[#1E5FC9] text-xs font-black flex items-center justify-center shrink-0">
                                                ?
                                            </span>
                                            <h3 className="font-bold text-sm sm:text-base text-[#1F2A44]">
                                                {faq.pertanyaan}
                                            </h3>
                                        </div>
                                        <svg
                                            className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                                                isOpen ? 'rotate-180' : ''
                                            }`}
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </button>

                                    {isOpen && (
                                        <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-[#8A94A6] leading-relaxed border-t border-slate-50">
                                            <div className="pl-10">
                                                {faq.jawaban}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PublicLayout>
    );
}

