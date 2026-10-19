import React from 'react';
import Header from '../../components/Admin/Header';
import Sidebar from '../../components/Admin/Sidebar';

export default function PlaceholderPage({ title = 'Menu Admin' }) {
    return (
        <div className="min-h-screen p-3 md:p-7 flex items-center justify-center antialiased text-brand-dark bg-[#263b53]">
            <div className="w-full max-w-[1440px] h-[930px] max-h-[96vh] bg-white rounded-[36px] shadow-2xl overflow-hidden flex flex-col relative">
                <Header />
                <div className="flex-1 flex flex-row overflow-hidden relative">
                    <Sidebar />
                    <main className="flex-1 h-full overflow-y-auto main-scroll px-6 md:px-10 py-12 bg-white flex flex-col items-center justify-center text-center">
                        <div className="w-16 h-16 rounded-2xl bg-brand-lightBlue text-brand-blue flex items-center justify-center mb-4 shadow-sm">
                            <svg className="w-8 h-8 stroke-[2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.143a5.952 5.952 0 004.81-4.81 5.942 5.942 0 00-1.076-4.577l-2.454 2.455-2.828-2.829 2.454-2.454A5.955 5.955 0 0013.9 1.155a5.95 5.95 0 00-4.81 4.81c-.045.58-.02 1.193.143 1.743" />
                            </svg>
                        </div>
                        <h2 className="text-[24px] font-bold text-brand-dark mb-2">{title}</h2>
                        <p className="text-[15px] text-brand-muted max-w-md mb-6 leading-relaxed">
                            Halaman ini merupakan placeholder navigasi dan akan tersedia pada modul berikutnya.
                        </p>
                    </main>
                </div>
            </div>
        </div>
    );
}
