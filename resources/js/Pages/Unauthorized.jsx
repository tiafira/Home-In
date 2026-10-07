import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-[#EAF1FC] flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white rounded-[24px] shadow-card-xl p-8 text-center flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mb-5">
                    <svg className="w-8 h-8 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                </div>

                <h1 className="text-[22px] font-bold text-[#1F2A44] mb-2 tracking-tight">
                    Akses Ditolak
                </h1>
                <p className="text-[14px] text-[#8A94A6] mb-6 leading-relaxed">
                    Akses belum tersedia untuk role ini. Dashboard Admin kost hanya diperuntukkan bagi akun Pemilik dan Admin.
                </p>

                {user && (
                    <div className="w-full bg-[#F4F6FA] rounded-xl p-4 text-left mb-6 text-[13px]">
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                            <span className="text-[#8A94A6]">Nama:</span>
                            <span className="font-semibold text-[#1F2A44]">{user.nama}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-200/60">
                            <span className="text-[#8A94A6]">Email:</span>
                            <span className="font-semibold text-[#1F2A44]">{user.email}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-[#8A94A6]">Role:</span>
                            <span className="font-semibold text-[#1E5FC9] uppercase">{user.role}</span>
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 w-full">
                    <button
                        onClick={handleLogout}
                        className="flex-1 h-[46px] rounded-[10px] bg-[#1E5FC9] hover:bg-[#184ea8] text-white font-semibold text-[14px] transition-colors cursor-pointer"
                    >
                        Keluar / Ganti Akun
                    </button>
                    <button
                        onClick={() => navigate('/login')}
                        className="flex-1 h-[46px] rounded-[10px] border border-slate-200 text-[#1F2A44] hover:bg-slate-50 font-semibold text-[14px] transition-colors cursor-pointer"
                    >
                        Halaman Login
                    </button>
                </div>
            </div>
        </div>
    );
}
