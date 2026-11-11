import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function FaqBubble() {
    const [isOpen, setIsOpen] = useState(false);
    const [faqs, setFaqs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedFaqId, setExpandedFaqId] = useState(null);

    // Fetch FAQs when bubble opens
    useEffect(() => {
        if (!isOpen || faqs.length > 0) return;

        let isMounted = true;
        setLoading(true);

        const fetchFaqs = async () => {
            try {
                const res = await api.get('/public/faq');
                if (isMounted && res.data?.status === 'success') {
                    setFaqs(res.data.data || []);
                }
            } catch (err) {
                // ignore
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchFaqs();
        return () => {
            isMounted = false;
        };
    }, [isOpen, faqs.length]);

    const filteredFaqs = faqs.filter((faq) => {
        const q = searchQuery.toLowerCase();
        return (
            faq.pertanyaan?.toLowerCase().includes(q) ||
            faq.jawaban?.toLowerCase().includes(q) ||
            faq.cabang?.nama_cabang?.toLowerCase().includes(q)
        );
    });

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Expanded FAQ Bubble Dialog */}
            {isOpen && (
                <div className="mb-3 w-[92vw] sm:w-[420px] max-h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[#1E5FC9] to-[#3b82f6] text-white p-4 sm:p-5 flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg backdrop-blur-xs">
                                💬
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm leading-tight">Pusat Bantuan & FAQ</h3>
                                <p className="text-[11px] text-blue-100 mt-0.5">Pertanyaan seputar sewa & aturan kost</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition cursor-pointer"
                            aria-label="Tutup FAQ"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Search Input */}
                    <div className="p-3.5 bg-slate-50 border-b border-slate-100">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari pertanyaan kamu di sini..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-9 pl-9 pr-3 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1E5FC9] text-[#1F2A44]"
                            />
                            <svg
                                className="w-4 h-4 text-slate-400 absolute left-3 top-2.5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* FAQ Items Accordion */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-2.5 max-h-[340px] text-xs">
                        {loading ? (
                            <div className="py-12 text-center text-slate-400">
                                <div className="w-7 h-7 border-3 border-[#1E5FC9] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                <span>Memuat pertanyaan...</span>
                            </div>
                        ) : filteredFaqs.length === 0 ? (
                            <div className="py-10 text-center text-slate-400">
                                <p className="font-semibold text-slate-600">Tidak ada pertanyaan ditemukan.</p>
                                <p className="text-[11px] mt-1">Coba kata kunci lain atau hubungi admin langsung.</p>
                            </div>
                        ) : (
                            filteredFaqs.map((faq) => {
                                const isExpanded = expandedFaqId === faq.id;
                                return (
                                    <div
                                        key={faq.id}
                                        className="border border-slate-200/80 rounded-2xl overflow-hidden bg-slate-50/50 hover:bg-slate-50 transition"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                                            className="w-full p-3.5 text-left font-bold text-[#1F2A44] flex items-center justify-between gap-2 cursor-pointer"
                                        >
                                            <span className="flex-1 text-[13px] leading-snug">{faq.pertanyaan}</span>
                                            <svg
                                                className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${
                                                    isExpanded ? 'rotate-180 text-[#1E5FC9]' : ''
                                                }`}
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </button>

                                        {isExpanded && (
                                            <div className="px-3.5 pb-3.5 pt-1 text-slate-600 text-xs leading-relaxed border-t border-slate-100/80 bg-white">
                                                {faq.jawaban}
                                                {faq.cabang && (
                                                    <span className="inline-block mt-2 px-2 py-0.5 rounded-md bg-blue-50 text-[#1E5FC9] text-[10px] font-semibold">
                                                        📍 {faq.cabang.nama_cabang}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Footer Contact Assistance */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Belum terjawab?</span>
                        <a
                            href="https://wa.me/6281234567890?text=Halo%20Home-In,%20saya%20ingin%20bertanya%20seputar%20kost"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                        >
                            <span>WhatsApp CS 24 Jam ↗</span>
                        </a>
                    </div>
                </div>
            )}

            {/* Floating Bubble Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="group relative flex items-center gap-2.5 px-4 py-3 bg-[#1E5FC9] hover:bg-[#184ea8] text-white rounded-full shadow-2xl hover:shadow-blue-500/40 hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer"
                aria-label="Buka FAQ"
                title="Tanya Jawab & FAQ Kost"
            >
                <div className="relative flex items-center justify-center">
                    <span className="text-xl">💬</span>
                </div>
                <span className="font-extrabold text-xs tracking-wide pr-1">
                    {isOpen ? 'Tutup FAQ' : 'FAQ Kost'}
                </span>
            </button>
        </div>
    );
}

