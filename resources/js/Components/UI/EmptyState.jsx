import React from 'react';

export default function EmptyState({
    title = 'Tidak Ada Data Ditemukan',
    description = 'Belum ada data yang sesuai dengan pencarian atau filter yang dipilih.',
    actionLabel,
    onAction,
    icon,
}) {
    return (
        <div className="w-full py-16 px-4 flex flex-col items-center justify-center text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#1E5FC9] flex items-center justify-center mb-4">
                {icon ? (
                    icon
                ) : (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                )}
            </div>

            <h3 className="text-lg font-bold text-[#1F2A44] mb-1.5">{title}</h3>
            <p className="text-xs sm:text-sm text-[#8A94A6] max-w-sm mb-6 leading-relaxed">
                {description}
            </p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-5 py-2.5 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}
