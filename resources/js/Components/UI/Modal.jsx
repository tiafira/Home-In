import React, { useEffect } from 'react';

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    footer,
    maxWidth = 'max-w-xl',
}) {
    useEffect(() => {
        function handleEscape(e) {
            if (e.key === 'Escape') {
                onClose();
            }
        }
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleEscape);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
                onClick={onClose}
            ></div>

            {/* Dialog Panel */}
            <div
                className={
                    'relative w-full bg-white rounded-3xl shadow-2xl overflow-hidden z-10 my-8 transition-all animate-in zoom-in-95 duration-200 ' +
                    maxWidth
                }
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-[#263b53]">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-[#64748b] hover:text-[#263b53] hover:bg-slate-100 transition cursor-pointer"
                        type="button"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[calc(85vh-130px)] overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
