import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function KelolaAkun() {
    const { toast } = useToast();

    const [users, setUsers] = useState([]);
    const [counts, setCounts] = useState({ all: 0, user: 0, penghuni: 0, karyawan: 0, nonaktif: 0 });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all'); // all | user | penghuni | karyawan | nonaktif
    const [searchQuery, setSearchQuery] = useState('');

    // Modal Create / Edit
    const [formModalOpen, setFormModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState({
        name: '',
        email: '',
        no_hp: '',
        role: 'calon_penghuni',
        password: '',
        status_aktif: 1,
    });
    const [formErrors, setFormErrors] = useState({});
    const [submittingForm, setSubmittingForm] = useState(false);

    // Modal Reset Password
    const [resetModalOpen, setResetModalOpen] = useState(false);
    const [targetResetUser, setTargetResetUser] = useState(null);
    const [newPassword, setNewPassword] = useState('');
    const [submittingReset, setSubmittingReset] = useState(false);

    // Delete Dialog
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [targetDeleteUser, setTargetDeleteUser] = useState(null);
    const [submittingDelete, setSubmittingDelete] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/users', {
                params: {
                    kategori: activeTab,
                    search: searchQuery,
                },
            });
            if (res.data?.status === 'success') {
                setUsers(res.data.data || []);
                if (res.data.counts) {
                    setCounts(res.data.counts);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat data akun pengguna.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, searchQuery, toast]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenAdd = () => {
        setEditingUser(null);
        setForm({
            name: '',
            email: '',
            no_hp: '',
            role: 'calon_penghuni',
            password: 'password123',
            status_aktif: 1,
        });
        setFormErrors({});
        setFormModalOpen(true);
    };

    const handleOpenEdit = (u) => {
        setEditingUser(u);
        setForm({
            name: u.name || u.nama || '',
            email: u.email || '',
            no_hp: u.no_hp || '',
            role: u.role || 'calon_penghuni',
            password: '',
            status_aktif: u.status_aktif ? 1 : 0,
        });
        setFormErrors({});
        setFormModalOpen(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!form.name.trim()) errors.name = 'Nama lengkap wajib diisi.';
        if (!form.email.trim()) {
            errors.email = 'Alamat email wajib diisi.';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            errors.email = 'Format email tidak valid.';
        }
        if (!form.no_hp.trim()) {
            errors.no_hp = 'Nomor HP wajib diisi.';
        } else if (!/^[0-9+\-\s]{8,18}$/.test(form.no_hp)) {
            errors.no_hp = 'Format nomor HP tidak valid (8-18 digit).';
        }
        if (!editingUser && (!form.password || form.password.length < 6)) {
            errors.password = 'Password minimal 6 karakter.';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmitForm = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setSubmittingForm(true);
        try {
            if (editingUser) {
                await api.put(`/admin/users/${editingUser.id}`, form);
                toast.success('Data akun berhasil diperbarui!');
            } else {
                await api.post('/admin/users', form);
                toast.success('Akun pengguna baru berhasil dibuat!');
            }
            setFormModalOpen(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan akun.');
        } finally {
            setSubmittingForm(false);
        }
    };

    const handleToggleStatus = async (userItem) => {
        try {
            const res = await api.post(`/admin/users/${userItem.id}/toggle-status`);
            toast.success(res.data?.message || 'Status akun berhasil diubah.');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengubah status akun.');
        }
    };

    const handleOpenReset = (userItem) => {
        setTargetResetUser(userItem);
        setNewPassword('password123');
        setResetModalOpen(true);
    };

    const handleSubmitReset = async (e) => {
        e.preventDefault();
        if (newPassword.length < 6) {
            toast.error('Password baru minimal 6 karakter.');
            return;
        }

        setSubmittingReset(true);
        try {
            await api.post(`/admin/users/${targetResetUser.id}/reset-password`, {
                password: newPassword,
            });
            toast.success(`Password untuk ${targetResetUser.name} berhasil direset!`);
            setResetModalOpen(false);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mereset password.');
        } finally {
            setSubmittingReset(false);
        }
    };

    const handleConfirmDelete = async () => {
        if (!targetDeleteUser) return;
        setSubmittingDelete(true);
        try {
            await api.delete(`/admin/users/${targetDeleteUser.id}`);
            toast.success('Akun berhasil dipindahkan ke menu Baru Saja Dihapus.');
            setDeleteModalOpen(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menghapus akun.');
        } finally {
            setSubmittingDelete(false);
        }
    };

    const getRoleBadge = (role) => {
        switch (role) {
            case 'pemilik':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">Pemilik</span>;
            case 'admin':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">Admin</span>;
            case 'penjaga':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-teal-100 text-teal-800">Karyawan / Penjaga</span>;
            case 'penghuni':
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Penghuni Aktif</span>;
            case 'calon_penghuni':
            default:
                return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">User (Calon Penghuni)</span>;
        }
    };

    const columns = [
        {
            key: 'user_info',
            label: 'Pengguna',
            render: (r) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#263b53] font-bold flex items-center justify-center text-sm uppercase">
                        {(r.name || r.nama || 'U').substring(0, 2)}
                    </div>
                    <div>
                        <div className="font-bold text-slate-800 text-sm">{r.name || r.nama || '-'}</div>
                        <div className="text-xs text-slate-500">{r.email}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'role',
            label: 'Hak Akses / Kategori',
            render: (r) => (
                <div>
                    {getRoleBadge(r.role)}
                    {r.penghuni && r.penghuni.kamar && (
                        <div className="text-[11px] text-slate-500 mt-1 font-medium">
                            Kamar: {r.penghuni.kamar.nomor_kamar} ({r.penghuni.kamar.gedung?.nama_gedung || 'Gedung'})
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'no_hp',
            label: 'No. WhatsApp / HP',
            render: (r) => (
                <span className="text-xs font-semibold text-slate-700">
                    {r.no_hp || '-'}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Status Akun',
            render: (r) => (
                <button
                    type="button"
                    onClick={() => handleToggleStatus(r)}
                    title="Klik untuk mengubah status aktif"
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                        r.status_aktif
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                    }`}
                >
                    <span className={`w-2 h-2 rounded-full ${r.status_aktif ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                    <span>{r.status_aktif ? 'Aktif' : 'Nonaktif'}</span>
                </button>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (r) => (
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        type="button"
                        onClick={() => handleOpenReset(r)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition"
                        title="Reset Password"
                    >
                        🔑 Reset
                    </button>
                    <button
                        type="button"
                        onClick={() => handleOpenEdit(r)}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setTargetDeleteUser(r);
                            setDeleteModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                    >
                        Hapus
                    </button>
                </div>
            ),
        },
    ];

    const tabList = [
        { id: 'all', label: 'Semua Akun', count: counts.all },
        { id: 'user', label: 'User (Calon Penghuni)', count: counts.user },
        { id: 'penghuni', label: 'Penghuni', count: counts.penghuni },
        { id: 'karyawan', label: 'Karyawan / Staf', count: counts.karyawan },
        { id: 'nonaktif', label: 'Nonaktif', count: counts.nonaktif },
    ];

    return (
        <AdminLayout
            title="Kelola Akun"
            subtitle="Pusat manajemen hak akses pengguna, verifikasi status aktif, dan reset kata sandi."
        >
            {/* Top Filter Tabs & Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl overflow-x-auto max-w-full">
                    {tabList.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                                activeTab === tab.id
                                    ? 'bg-white text-[#263b53] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            <span>{tab.label}</span>
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                activeTab === tab.id ? 'bg-blue-100 text-[#263b53]' : 'bg-slate-200 text-slate-600'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-4 py-2.5 bg-[#263b53] hover:bg-[#1b2c3f] text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm shrink-0"
                >
                    <span>+ Buat Akun Baru</span>
                </button>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <DataTable
                    columns={columns}
                    data={users}
                    loading={loading}
                    searchPlaceholder="Cari nama, email, no handphone..."
                    emptyTitle="Tidak ada data akun"
                    emptyDescription="Tidak ditemukan akun pada filter ini."
                />
            </div>

            {/* MODAL CREATE / EDIT */}
            <Modal
                isOpen={formModalOpen}
                onClose={() => setFormModalOpen(false)}
                title={editingUser ? `Edit Akun — ${editingUser.name}` : 'Buat Akun Pengguna Baru'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmitForm} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                            Nama Lengkap <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className={`w-full px-3 py-2 text-sm border rounded-xl ${
                                formErrors.name ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
                            }`}
                            placeholder="Contoh: Muhammad Raihan"
                        />
                        {formErrors.name && <p className="text-xs text-rose-500 mt-1">{formErrors.name}</p>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Email Akun <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className={`w-full px-3 py-2 text-sm border rounded-xl ${
                                    formErrors.email ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
                                }`}
                                placeholder="nama@email.com"
                            />
                            {formErrors.email && <p className="text-xs text-rose-500 mt-1">{formErrors.email}</p>}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Nomor HP / WhatsApp <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={form.no_hp}
                                onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                                className={`w-full px-3 py-2 text-sm border rounded-xl ${
                                    formErrors.no_hp ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
                                }`}
                                placeholder="081234567890"
                            />
                            {formErrors.no_hp && <p className="text-xs text-rose-500 mt-1">{formErrors.no_hp}</p>}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Peran / Hak Akses <span className="text-rose-500">*</span>
                            </label>
                            <select
                                value={form.role}
                                onChange={(e) => setForm({ ...form, role: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="calon_penghuni">User (Calon Penghuni)</option>
                                <option value="penghuni">Penghuni Kost</option>
                                <option value="penjaga">Karyawan / Penjaga</option>
                                <option value="admin">Administrator</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Status Akun
                            </label>
                            <select
                                value={form.status_aktif}
                                onChange={(e) => setForm({ ...form, status_aktif: parseInt(e.target.value) })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value={1}>Aktif (Bisa Login)</option>
                                <option value={0}>Nonaktif (Diblokir)</option>
                            </select>
                        </div>
                    </div>

                    {!editingUser && (
                        <div>
                            <label className="block text-xs font-bold text-slate-700 mb-1">
                                Password Awal <span className="text-rose-500">*</span>
                            </label>
                            <input
                                type="password"
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className={`w-full px-3 py-2 text-sm border rounded-xl ${
                                    formErrors.password ? 'border-rose-500 bg-rose-50' : 'border-slate-300'
                                }`}
                                placeholder="Minimal 6 karakter"
                            />
                            {formErrors.password && <p className="text-xs text-rose-500 mt-1">{formErrors.password}</p>}
                        </div>
                    )}

                    <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setFormModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingForm}
                            className="px-5 py-2 text-xs font-bold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl transition"
                        >
                            {submittingForm ? 'Menyimpan...' : (editingUser ? 'Simpan Perubahan' : 'Buat Akun')}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL RESET PASSWORD */}
            <Modal
                isOpen={resetModalOpen}
                onClose={() => setResetModalOpen(false)}
                title={`Reset Password — ${targetResetUser?.name}`}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmitReset} className="space-y-4">
                    <p className="text-xs text-slate-500">
                        Masukkan kata sandi baru untuk akun <strong className="text-slate-700">{targetResetUser?.email}</strong>.
                    </p>

                    <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Password Baru</label>
                        <input
                            type="text"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl font-mono"
                            placeholder="Minimal 6 karakter"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setResetModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingReset}
                            className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition"
                        >
                            {submittingReset ? 'Mereset...' : 'Terapkan Password Baru'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* CONFIRM DELETE DIALOG */}
            <ConfirmDialog
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                loading={submittingDelete}
                title="Hapus Akun Pengguna"
                message={`Apakah Anda yakin ingin menghapus akun "${targetDeleteUser?.name}" (${targetDeleteUser?.email})? Data akan dipindahkan ke menu Baru Saja Dihapus dan dapat dipulihkan kapan saja.`}
                confirmText="Hapus Akun"
                confirmVariant="danger"
            />
        </AdminLayout>
    );
}

