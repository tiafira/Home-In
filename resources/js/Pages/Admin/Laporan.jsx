import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Laporan() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    const [activeTab, setActiveTab] = useState('tamu'); // 'tamu' | 'pulang'
    const [tamuList, setTamuList] = useState([]);
    const [pulangList, setPulangList] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter tanggal
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Tenants for dropdown
    const [tenants, setTenants] = useState([]);

    // Add Guest Modal
    const [tamuModalOpen, setTamuModalOpen] = useState(false);
    const [tamuForm, setTamuForm] = useState({
        penghuni_id: '',
        nama_tamu: '',
        keperluan: '',
        tanggal: new Date().toISOString().split('T')[0],
        jam_masuk: '10:00',
        jam_keluar: '',
    });
    const [submittingTamu, setSubmittingTamu] = useState(false);

    // Add Pulang Modal
    const [pulangModalOpen, setPulangModalOpen] = useState(false);
    const [pulangForm, setPulangForm] = useState({
        penghuni_id: '',
        jenis: 'pulang_kampung',
        tanggal_mulai: new Date().toISOString().split('T')[0],
        tanggal_selesai: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        keterangan: '',
    });
    const [submittingPulang, setSubmittingPulang] = useState(false);

    const fetchTenants = async () => {
        try {
            const res = await api.get('/admin/penghuni', { params: { status: 'aktif' } });
            if (res.data.status === 'success') {
                setTenants(res.data.data);
            }
        } catch (err) {
            // ignore
        }
    };

    const fetchTamu = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/laporan/tamu', {
                params: {
                    tanggal_mulai: startDate || undefined,
                    tanggal_selesai: endDate || undefined,
                },
            });
            if (res.data.status === 'success') {
                setTamuList(res.data.data);
            }
        } catch (err) {
            toast.error('Gagal memuat laporan tamu.');
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, activeBranchId, toast]);

    const fetchPulang = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/laporan/pulang');
            if (res.data.status === 'success') {
                setPulangList(res.data.data);
            }
        } catch (err) {
            toast.error('Gagal memuat laporan kepulangan.');
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

    useEffect(() => {
        if (activeTab === 'tamu') {
            fetchTamu();
        } else {
            fetchPulang();
        }
    }, [activeTab, fetchTamu, fetchPulang]);

    const handleOpenAddTamu = () => {
        fetchTenants();
        setTamuForm({
            penghuni_id: tenants[0]?.id || '',
            nama_tamu: '',
            keperluan: '',
            tanggal: new Date().toISOString().split('T')[0],
            jam_masuk: new Date().toTimeString().split(' ')[0].substring(0, 5),
            jam_keluar: '',
        });
        setTamuModalOpen(true);
    };

    const handleSubmitTamu = async (e) => {
        e.preventDefault();
        setSubmittingTamu(true);
        try {
            const res = await api.post('/admin/laporan/tamu', tamuForm);
            toast.success(res.data.message || 'Kunjungan tamu berhasil dicatat!');
            setTamuModalOpen(false);
            fetchTamu();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mencatat kunjungan tamu.');
        } finally {
            setSubmittingTamu(false);
        }
    };

    const handleCheckoutTamu = async (id) => {
        try {
            const res = await api.post(`/admin/laporan/tamu/${id}/checkout`);
            toast.success(res.data.message || 'Kepulangan tamu berhasil dicatat!');
            fetchTamu();
        } catch (err) {
            toast.error('Gagal mencatat jam keluar tamu.');
        }
    };

    const handleOpenAddPulang = () => {
        fetchTenants();
        setPulangForm({
            penghuni_id: tenants[0]?.id || '',
            jenis: 'pulang_kampung',
            tanggal_mulai: new Date().toISOString().split('T')[0],
            tanggal_selesai: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
            keterangan: '',
        });
        setPulangModalOpen(true);
    };

    const handleSubmitPulang = async (e) => {
        e.preventDefault();
        setSubmittingPulang(true);
        try {
            const res = await api.post('/admin/laporan/pulang', pulangForm);
            toast.success(res.data.message || 'Laporan pulang/menginap berhasil disimpan!');
            setPulangModalOpen(false);
            fetchPulang();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan laporan.');
        } finally {
            setSubmittingPulang(false);
        }
    };

    // CSV Export
    const handleExportCSV = () => {
        let headers = [];
        let rows = [];
        let filename = '';

        if (activeTab === 'tamu') {
            headers = ['Tanggal', 'Jam Masuk', 'Jam Keluar', 'Nama Tamu', 'Keperluan', 'Penghuni', 'Kamar', 'Cabang'];
            rows = tamuList.map((t) => [
                t.tanggal,
                t.jam_masuk,
                t.jam_keluar || 'Masih Berkunjung',
                `"${t.nama_tamu.replace(/"/g, '""')}"`,
                `"${(t.keperluan || '').replace(/"/g, '""')}"`,
                `"${(t.penghuni?.user?.name || '').replace(/"/g, '""')}"`,
                t.penghuni?.kamar?.nomor_kamar || '',
                `"${(t.penghuni?.kamar?.gedung?.cabang?.nama_cabang || '').replace(/"/g, '""')}"`,
            ]);
            filename = `laporan-tamu-${new Date().toISOString().split('T')[0]}.csv`;
        } else {
            headers = ['Jenis', 'Tgl Mulai', 'Tgl Selesai', 'Penghuni', 'Kamar', 'Cabang', 'Keterangan'];
            rows = pulangList.map((p) => [
                p.jenis,
                p.tanggal_mulai,
                p.tanggal_selesai,
                `"${(p.penghuni?.user?.name || '').replace(/"/g, '""')}"`,
                p.penghuni?.kamar?.nomor_kamar || '',
                `"${(p.penghuni?.kamar?.gedung?.cabang?.nama_cabang || '').replace(/"/g, '""')}"`,
                `"${(p.keterangan || '').replace(/"/g, '""')}"`,
            ]);
            filename = `laporan-pulang-${new Date().toISOString().split('T')[0]}.csv`;
        }

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`Data ${filename} berhasil diekspor!`);
    };

    const tamuColumns = [
        {
            key: 'tanggal',
            label: 'Tanggal',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => row.tanggal,
        },
        {
            key: 'nama_tamu',
            label: 'Nama Tamu & Keperluan',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.nama_tamu}</div>
                    <div className="text-xs text-slate-500">{row.keperluan || 'Kunjungan pribadi'}</div>
                </div>
            ),
        },
        {
            key: 'penghuni',
            label: 'Penghuni Dikunjungi',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.penghuni?.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">
                        Kamar {row.penghuni?.kamar?.nomor_kamar} ({row.penghuni?.kamar?.gedung?.cabang?.nama_cabang})
                    </div>
                </div>
            ),
        },
        {
            key: 'waktu',
            label: 'Waktu Kunjungan',
            className: 'whitespace-nowrap text-xs',
            render: (row) => (
                <div>
                    <span className="font-medium text-slate-700">Masuk: {row.jam_masuk}</span>
                    <div className="mt-0.5">
                        {row.jam_keluar ? (
                            <span className="text-slate-400">Keluar: {row.jam_keluar}</span>
                        ) : (
                            <span className="text-emerald-600 font-bold">Sedang Berkunjung</span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <div>
                    {!row.jam_keluar && (
                        <button
                            onClick={() => handleCheckoutTamu(row.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                        >
                            Tamu Pulang
                        </button>
                    )}
                </div>
            ),
        },
    ];

    const pulangColumns = [
        {
            key: 'periode',
            label: 'Periode Izin',
            className: 'whitespace-nowrap font-medium text-slate-800 text-xs',
            render: (row) => `${row.tanggal_mulai} s/d ${row.tanggal_selesai}`,
        },
        {
            key: 'jenis',
            label: 'Jenis Izin',
            className: 'whitespace-nowrap',
            render: (row) => (
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        row.jenis === 'pulang_kampung'
                            ? 'bg-blue-50 text-[#263b53]'
                            : 'bg-purple-50 text-purple-700'
                    }`}
                >
                    {row.jenis === 'pulang_kampung' ? 'Pulang Kampung' : 'Nginap di Luar'}
                </span>
            ),
        },
        {
            key: 'penghuni',
            label: 'Penghuni & Kamar',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.penghuni?.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">
                        Kamar {row.penghuni?.kamar?.nomor_kamar} ({row.penghuni?.kamar?.gedung?.cabang?.nama_cabang})
                    </div>
                </div>
            ),
        },
        {
            key: 'keterangan',
            label: 'Keterangan',
            render: (row) => <span className="text-xs text-slate-600">{row.keterangan || '-'}</span>,
        },
    ];

    return (
        <AdminLayout
            title="Laporan Tamu & Kepulangan"
            subtitle="Pencatatan buku tamu berkunjung serta laporan penghuni yang pulang kampung atau menginap di luar."
        >
            {/* Top switcher and actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl self-start">
                    <button
                        onClick={() => setActiveTab('tamu')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            activeTab === 'tamu'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Buku Tamu ({tamuList.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('pulang')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            activeTab === 'pulang'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Laporan Pulang / Nginap ({pulangList.length})
                    </button>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <button
                        type="button"
                        onClick={handleExportCSV}
                        className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition flex items-center gap-1.5"
                    >
                        📥 Export CSV
                    </button>
                    {activeTab === 'tamu' ? (
                        <button
                            type="button"
                            onClick={handleOpenAddTamu}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition"
                        >
                            + Catat Tamu Masuk
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleOpenAddPulang}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition"
                        >
                            + Catat Kepulangan
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                {activeTab === 'tamu' ? (
                    <DataTable
                        columns={tamuColumns}
                        data={tamuList}
                        loading={loading}
                        searchPlaceholder="Cari nama tamu, keperluan, penghuni..."
                        emptyTitle="Tidak ada data tamu"
                        emptyDescription="Belum ada kunjungan tamu yang tercatat."
                    />
                ) : (
                    <DataTable
                        columns={pulangColumns}
                        data={pulangList}
                        loading={loading}
                        searchPlaceholder="Cari nama penghuni, keterangan..."
                        emptyTitle="Tidak ada data laporan pulang"
                        emptyDescription="Belum ada penghuni yang mencatat izin pulang/menginap di luar."
                    />
                )}
            </div>

            {/* MODAL CATAT TAMU */}
            <Modal
                isOpen={tamuModalOpen}
                onClose={() => setTamuModalOpen(false)}
                title="Catat Tamu Berkunjung"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmitTamu} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Penghuni Yang Dikunjungi *</label>
                        <select
                            required
                            value={tamuForm.penghuni_id}
                            onChange={(e) => setTamuForm({ ...tamuForm, penghuni_id: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        >
                            <option value="">Pilih Penghuni</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.user?.name} (Kamar {t.kamar?.nomor_kamar} - {t.kamar?.gedung?.cabang?.nama_cabang})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap Tamu *</label>
                        <input
                            type="text"
                            required
                            placeholder="Nama tamu..."
                            value={tamuForm.nama_tamu}
                            onChange={(e) => setTamuForm({ ...tamuForm, nama_tamu: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Keperluan / Hubungan</label>
                        <input
                            type="text"
                            placeholder="Contoh: Orang tua berkunjung / Kerja kelompok"
                            value={tamuForm.keperluan}
                            onChange={(e) => setTamuForm({ ...tamuForm, keperluan: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal *</label>
                            <input
                                type="date"
                                required
                                value={tamuForm.tanggal}
                                onChange={(e) => setTamuForm({ ...tamuForm, tanggal: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Jam Masuk *</label>
                            <input
                                type="time"
                                required
                                value={tamuForm.jam_masuk}
                                onChange={(e) => setTamuForm({ ...tamuForm, jam_masuk: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setTamuModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingTamu}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm"
                        >
                            {submittingTamu ? 'Menyimpan...' : 'Simpan Kunjungan'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* MODAL CATAT PULANG */}
            <Modal
                isOpen={pulangModalOpen}
                onClose={() => setPulangModalOpen(false)}
                title="Catat Izin Pulang / Menginap di Luar"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmitPulang} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Penghuni *</label>
                        <select
                            required
                            value={pulangForm.penghuni_id}
                            onChange={(e) => setPulangForm({ ...pulangForm, penghuni_id: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        >
                            <option value="">Pilih Penghuni</option>
                            {tenants.map((t) => (
                                <option key={t.id} value={t.id}>
                                    {t.user?.name} (Kamar {t.kamar?.nomor_kamar} - {t.kamar?.gedung?.cabang?.nama_cabang})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Izin *</label>
                        <select
                            value={pulangForm.jenis}
                            onChange={(e) => setPulangForm({ ...pulangForm, jenis: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        >
                            <option value="pulang_kampung">Pulang Kampung</option>
                            <option value="nginap_di_luar">Nginap di Luar</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Mulai *</label>
                            <input
                                type="date"
                                required
                                value={pulangForm.tanggal_mulai}
                                onChange={(e) => setPulangForm({ ...pulangForm, tanggal_mulai: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Selesai *</label>
                            <input
                                type="date"
                                required
                                value={pulangForm.tanggal_selesai}
                                onChange={(e) => setPulangForm({ ...pulangForm, tanggal_selesai: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Tambahan</label>
                        <textarea
                            rows={3}
                            placeholder="Alasan kepulangan atau alamat tujuan..."
                            value={pulangForm.keterangan}
                            onChange={(e) => setPulangForm({ ...pulangForm, keterangan: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setPulangModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingPulang}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm"
                        >
                            {submittingPulang ? 'Menyimpan...' : 'Simpan Laporan'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
