import React, { useState, useEffect } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function ProfilAdmin() {
    const { user, login } = useAuth();
    const toast = useToast();

    // Profile State
    const [profileForm, setProfileForm] = useState({
        nama: '',
        no_hp: '',
        email: '',
    });
    const [fotoFile, setFotoFile] = useState(null);
    const [fotoPreview, setFotoPreview] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    // Password State
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        password: '',
        password_confirmation: '',
    });
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setProfileForm({
                nama: user.nama || user.name || '',
                no_hp: user.no_hp || '',
                email: user.email || '',
            });
            setFotoPreview(user.foto_profil || '');
        }
    }, [user]);

    const handleFotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            setFotoFile(file);
            setFotoPreview(URL.createObjectURL(file));
        }
    };

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        setSavingProfile(true);
        try {
            const formData = new FormData();
            formData.append('nama', profileForm.nama);
            formData.append('no_hp', profileForm.no_hp);
            if (fotoFile) {
                formData.append('foto_profil', fotoFile);
            }

            const res = await api.post('/user/profile', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            if (res.data.status === 'success') {
                toast.success(res.data.message || 'Profil berhasil diperbarui!');
                // refresh auth user
                const meRes = await api.get('/me');
                if (meRes.data?.data) {
                    localStorage.setItem('user', JSON.stringify(meRes.data.data));
                }
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memperbarui profil.');
        } finally {
            setSavingProfile(false);
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (passwordForm.password !== passwordForm.password_confirmation) {
            toast.error('Konfirmasi password baru tidak cocok.');
            return;
        }

        setSavingPassword(true);
        try {
            const res = await api.post('/user/password', passwordForm);
            if (res.data.status === 'success') {
                toast.success(res.data.message || 'Password berhasil diubah!');
                setPasswordForm({
                    current_password: '',
                    password: '',
                    password_confirmation: '',
                });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengubah password.');
        } finally {
            setSavingPassword(false);
        }
    };

    return (
        <AdminLayout
            title="Profil Saya & Keamanan Akun"
            subtitle="Kelola identitas akun admin, foto profil, dan perbarui kata sandi untuk keamanan sistem kost."
        >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Profile Edit Card */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#1E5FC9] flex items-center justify-center font-bold text-lg">
                            👤
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-[#1F2A44]">Informasi Pribadi</h3>
                            <p className="text-xs text-slate-400">Nama lengkap dan nomor kontak admin</p>
                        </div>
                    </div>

                    <form onSubmit={handleSaveProfile} className="space-y-4">
                        {/* Avatar Picker */}
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                {fotoPreview ? (
                                    <img
                                        src={fotoPreview}
                                        alt="Foto Profil"
                                        className="w-20 h-20 rounded-full object-cover border-2 border-[#1E5FC9] shadow-sm"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-[#1E5FC9] text-white flex items-center justify-center text-xl font-bold shadow-sm">
                                        {(profileForm.nama || 'A').substring(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <label className="inline-block px-3.5 py-1.5 text-xs font-bold text-[#1E5FC9] bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer">
                                    <span>Ganti Foto</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFotoChange}
                                        className="hidden"
                                    />
                                </label>
                                <p className="text-[11px] text-slate-400">Format: PNG, JPG, WEBP. Maks 2MB.</p>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Nama Lengkap</label>
                            <input
                                type="text"
                                required
                                value={profileForm.nama}
                                onChange={(e) => setProfileForm({ ...profileForm, nama: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9]"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Email (Akun)</label>
                            <input
                                type="email"
                                disabled
                                value={profileForm.email}
                                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                            />
                            <span className="text-[11px] text-slate-400 mt-0.5 block">Email digunakan sebagai username login utama.</span>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Nomor WhatsApp / HP</label>
                            <input
                                type="text"
                                required
                                value={profileForm.no_hp}
                                onChange={(e) => setProfileForm({ ...profileForm, no_hp: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9]"
                                placeholder="08xxxxxxxxxx"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={savingProfile}
                                className="w-full py-2.5 bg-[#1E5FC9] hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                            >
                                {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Password Change Card */}
                <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-sm space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-lg">
                            🔒
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-[#1F2A44]">Ganti Kata Sandi</h3>
                            <p className="text-xs text-slate-400">Pastikan gunakan kombinasi sandi yang aman</p>
                        </div>
                    </div>

                    <form onSubmit={handleSavePassword} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Password Saat Ini</label>
                            <input
                                type="password"
                                required
                                value={passwordForm.current_password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9]"
                                placeholder="Masukkan password lama Anda"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Password Baru</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={passwordForm.password}
                                onChange={(e) => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9]"
                                placeholder="Minimal 8 karakter"
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-700 block mb-1">Konfirmasi Password Baru</label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={passwordForm.password_confirmation}
                                onChange={(e) =>
                                    setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })
                                }
                                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9]"
                                placeholder="Ulangi password baru"
                            />
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={savingPassword}
                                className="w-full py-2.5 bg-[#1F2A44] hover:bg-[#131c2e] text-white font-bold text-sm rounded-xl shadow-md transition cursor-pointer disabled:opacity-50"
                            >
                                {savingPassword ? 'Mengubah Password...' : 'Perbarui Kata Sandi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </AdminLayout>
    );
}

