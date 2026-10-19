import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3500) => {
        const id = Date.now() + Math.random().toString(36).substring(2, 9);
        setToasts((prev) => [...prev, { id, message, type }]);

        if (duration > 0) {
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const toastMethods = useMemo(() => {
        const methods = {
            success: (msg, duration) => addToast(msg, 'success', duration),
            error: (msg, duration) => addToast(msg, 'error', duration),
            warning: (msg, duration) => addToast(msg, 'warning', duration),
            info: (msg, duration) => addToast(msg, 'info', duration),
        };
        methods.toast = methods;
        return methods;
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ toast: toastMethods, toasts, removeToast, ...toastMethods }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={
                            'pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border text-sm font-medium transition-all duration-300 animate-in slide-in-from-bottom-3 ' +
                            (t.type === 'success'
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                                : t.type === 'error'
                                ? 'bg-rose-50 border-rose-200 text-rose-800'
                                : t.type === 'warning'
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-blue-50 border-blue-200 text-blue-800')
                        }
                    >
                        <div className="mt-0.5 shrink-0">
                            {t.type === 'success' && (
                                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            )}
                            {t.type === 'error' && (
                                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                                </svg>
                            )}
                            {t.type === 'warning' && (
                                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            )}
                            {t.type === 'info' && (
                                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                                </svg>
                            )}
                        </div>
                        <div className="flex-1 text-xs sm:text-sm leading-relaxed">{t.message}</div>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="shrink-0 text-slate-400 hover:text-slate-600 transition"
                            type="button"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context.toast;
};
