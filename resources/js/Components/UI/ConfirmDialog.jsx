import React from 'react';
import Modal from './Modal';

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title = 'Konfirmasi Tindakan',
    message = 'Apakah Anda yakin ingin melanjutkan tindakan ini?',
    confirmText = 'Lanjutkan',
    cancelText = 'Batal',
    isDanger = false,
    loading = false,
}) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={loading ? () => {} : onClose}
            title={title}
            maxWidth="max-w-md"
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                    >
                        {cancelText}
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={loading}
                        className={
                            'px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition flex items-center gap-2 cursor-pointer disabled:opacity-50 ' +
                            (isDanger ? 'bg-rose-600 hover:bg-rose-700' : 'bg-[#263b53] hover:bg-[#1b2c3f]')
                        }
                    >
                        {loading && (
                            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        )}
                        <span>{confirmText}</span>
                    </button>
                </>
            }
        >
            <div className="flex items-start gap-4">
                <div
                    className={
                        'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ' +
                        (isDanger ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-[#263b53]')
                    }
                >
                    {isDanger ? (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                        </svg>
                    ) : (
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                        </svg>
                    )}
                </div>
                <div className="text-sm text-slate-600 leading-relaxed pt-1">
                    {message}
                </div>
            </div>
        </Modal>
    );
}
