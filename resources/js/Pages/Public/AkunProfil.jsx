import React, { useState } from 'react';
import PublicLayout from '../../Layouts/PublicLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function AkunProfil() {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('profile');

    // Profile Edit Form State
    const [profileForm, setProfileForm] = useState({
        nama: user?.nama || '',
        no_hp: user?.no_hp || '',
    });
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileError, setProfileError] = useState('');

    // Password Change Form State
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    const handleProfileSubmit = async (e) => {
        e.preventDefault();
        setProfileSaving(true);
        setProfileError('');

        try {
            const res = await api.post('/user/profile', profileForm);
            if (res.data?.status === 'success') {
                if (addToast) {
                    addToast({
                        title: 'Profil Diperbarui',
                        message: 'Data profil Anda telah berhasil disimpan.',
                        type: 'success',
                    });
                }
            }
        } catch (err) {
            setProfileError(err.response?.data?.message || 'Gagal menyimpan profil.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handlePasswordSubmit = async (e) => {
        e.preventDefault();
        setPasswordSaving(true);
        setPasswordError('');

        try {
            const res = await api.post('/user/password', passwordForm);
            if (res.data?.status === 'success') {
                if (addToast) {
                    addToast({
                        title: 'Password Berhasil Diubah',
                        message: 'Kata sandi akun Anda telah berhasil diperbarui.',
                        type: 'success',
                    });
                }
                setPasswordForm({
                    current_password: '',
                    password: '',
                    password_confirmation: '',
                });
            }
        } catch (err) {
            setPasswordError(err.response?.data?.message || 'Gagal mengubah password.');
        } finally {
            setPasswordSaving(false);
        }
    };

    return (
        <PublicLayout title="Profil & Akun Saya">
            <div className="bg-[#1F2A44] text-white py-12 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">
                            Pengaturan Akun
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold mt-1">
                            Profil & Data Diri
                        </h1>
                        <p className="text-xs text-[#8A94A6] mt-1">
                            Kelola data diri, nomor kontak pemesanan, dan keamanan kata sandi Anda.
                        </p>
                    </div>

                    <div className="flex gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/10 self-start sm:self-auto">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                activeTab === 'profile'
                                    ? 'bg-white text-[#1F2A44] shadow-sm'
                                    : 'text-blue-200 hover:text-white'
                            }`}
                        >
                            Data Diri
                        </button>
                        <button
                            onClick={() => setActiveTab('password')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                                activeTab === 'password'
                                    ? 'bg-white text-[#1F2A44] shadow-sm'
                                    : 'text-blue-200 hover:text-white'
                            }`}
                        >
                            Ganti Password
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-100 shadow-sm space-y-8">
                    {/* User Header Profile Card */}
                    <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#1E5FC9] to-indigo-600 text-white font-extrabold text-2xl flex items-center justify-center uppercase shadow-md">
                            {user?.nama ? user.nama.charAt(0) : 'U'}
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-[#1F2A44]">{user?.nama}</h3>
                            <p className="text-xs text-[#8A94A6]">{user?.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                    ✓ Akun Aktif
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* TAB 1: DATA DIRI */}
                    {activeTab === 'profile' && (
                        <form onSubmit={handleProfileSubmit} className="space-y-6">
                            {profileError && (
                                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                                    {profileError}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                        Nama Lengkap *
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.nama}
                                        onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                        Alamat Email (Akun)
                                    </label>
                                    <input
                                        type="email"
                                        value={user?.email || ''}
                                        readOnly
                                        disabled
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-slate-500 bg-slate-50 cursor-not-allowed"
                                    />
                                    <span className="text-[10px] text-[#8A94A6] mt-1 block">Email akun tidak dapat diubah</span>
                                </div>

                                <div className="sm:col-span-2">
                                    <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                        Nomor WhatsApp / HP Aktif *
                                    </label>
                                    <input
                                        type="text"
                                        value={profileForm.no_hp}
                                        onChange={(e) => setProfileForm({ ...profileForm, no_hp: e.target.value })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                        required
                                    />
                                    <span className="text-[10px] text-[#8A94A6] mt-1 block">Digunakan oleh pengelola untuk konfirmasi booking</span>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={profileSaving}
                                    className="px-6 py-3 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                                >
                                    {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* TAB 2: GANTI PASSWORD */}
                    {activeTab === 'password' && (
                        <form onSubmit={handlePasswordSubmit} className="space-y-6 max-w-lg">
                            {passwordError && (
                                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                                    {passwordError}
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                    Password Saat Ini *
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.current_password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                    Password Baru *
                                </label>
                                <input
                                    type="password"
                                    placeholder="Minimal 8 karakter"
                                    value={passwordForm.password}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                    Konfirmasi Password Baru *
                                </label>
                                <input
                                    type="password"
                                    value={passwordForm.password_confirmation}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                    required
                                />
                            </div>

                            <div className="pt-4 flex justify-end">
                                <button
                                    type="submit"
                                    disabled={passwordSaving}
                                    className="px-6 py-3 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-bold shadow-md transition disabled:opacity-50"
                                >
                                    {passwordSaving ? 'Mengubah...' : 'Ubah Kata Sandi'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}
