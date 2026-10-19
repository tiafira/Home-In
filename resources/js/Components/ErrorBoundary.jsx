import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#F4F6FA] flex items-center justify-center p-6 text-center">
                    <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-md w-full">
                        <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                            ⚠️
                        </div>
                        <h2 className="text-lg font-bold text-slate-800 mb-2">Terjadi Kesalahan Tampilan</h2>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            {this.state.error?.message || 'Aplikasi mengalami kendala saat merender komponen.'}
                        </p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-4 py-2 bg-[#1E5FC9] text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition"
                        >
                            Muat Ulang Halaman
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
