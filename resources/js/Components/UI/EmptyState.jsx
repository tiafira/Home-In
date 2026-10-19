import React from 'react';

export default function EmptyState({
    title = 'Belum Ada Data',
    message = 'Tidak ada catatan yang ditemukan untuk kriteria ini.',
    icon,
    action,
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#263b53] flex items-center justify-center mb-4 shadow-xs">
                {icon || (
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                )}
            </div>
            <h4 className="text-base font-bold text-[#263b53] mb-1">{title}</h4>
            <p className="text-sm text-[#64748b] max-w-sm mb-5 leading-relaxed">{message}</p>
            {action && <div>{action}</div>}
        </div>
    );
}
