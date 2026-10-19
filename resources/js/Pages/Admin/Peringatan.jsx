import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import Modal from '../../Components/UI/Modal';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

export default function Peringatan() {
    const { toast } = useToast();
    const { activeBranchId } = useBranch();

    const [activeSection, setActiveSection] = useState('surat'); // 'surat' | 'menunggak'
    const [peringatans, setPeringatans] = useState([]);
    const [menunggakList, setMenunggakList] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({
        penghuni_id: '',
        jenis: 'pelanggaran',
        kategori_pelanggaran: 'Kebisingan Jam Malam',
        keterangan: '',
        tanggal_kejadian: new Date().toISOString().split('T')[0],
    });
    const [submitting, setSubmitting] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/peringatan');
            if (res.data.status === 'success') {
                setPeringatans(res.data.data);
                setMenunggakList(res.data.menunggak || []);
            }
        } catch (err) {
            toast.error('Gagal memuat data surat peringatan.');
        } finally {
            setLoading(false);
        }
    }, [activeBranchId, toast]);

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

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenAdd = () => {
        fetchTenants();
        setForm({
            penghuni_id: tenants[0]?.id || '',
            jenis: 'pelanggaran',
            kategori_pelanggaran: 'Kebisingan Jam Malam',
            keterangan: '',
            tanggal_kejadian: new Date().toISOString().split('T')[0],
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await api.post('/admin/peringatan', form);
            toast.success(res.data.message || 'Surat peringatan berhasil diterbitkan!');
            setModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menerbitkan surat peringatan.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleQuickWarn = async (penghuniId) => {
        try {
            const res = await api.post(`/admin/peringatan/quick/${penghuniId}`);
            toast.success(res.data.message || 'Peringatan keterlambatan sewa berhasil dikirimkan!');
            fetchData();
        } catch (err) {
            toast.error('Gagal mengirimkan surat peringatan.');
        }
    };

    const spColumns = [
        {
            key: 'tanggal_kejadian',
            label: 'Tgl SP',
            className: 'whitespace-nowrap text-xs text-slate-500',
            render: (row) => row.tanggal_kejadian,
        },
        {
            key: 'penghuni',
            label: 'Penghuni',
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
            key: 'jenis',
            label: 'Jenis Peringatan',
            className: 'whitespace-nowrap',
            render: (row) => (
                <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                        row.jenis === 'nunggak' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}
                >
                    {row.jenis}
                </span>
            ),
        },
        {
            key: 'kategori_pelanggaran',
            label: 'Pelanggaran',
            className: 'whitespace-nowrap text-xs font-semibold text-slate-700',
            render: (row) => row.kategori_pelanggaran || '-',
        },
        {
            key: 'keterangan',
            label: 'Keterangan Sanksi',
            render: (row) => <span className="text-xs text-slate-600 line-clamp-2">{row.keterangan}</span>,
        },
    ];

    const nunggakColumns = [
        {
            key: 'penghuni',
            label: 'Nama Penghuni',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">{row.user?.no_hp || '-'}</div>
                </div>
            ),
        },
        {
            key: 'kamar',
            label: 'Kamar & Cabang',
            className: 'whitespace-nowrap',
            render: (row) => (
                <div>
                    <div className="font-semibold text-[#263b53]">Kamar {row.kamar?.nomor_kamar}</div>
                    <div className="text-xs text-slate-500">{row.kamar?.gedung?.cabang?.nama_cabang}</div>
                </div>
            ),
        },
        {
            key: 'tagihan',
            label: 'Tagihan Tertunggak',
            className: 'whitespace-nowrap',
            render: (row) => {
                const unpaid = row.pembayaran?.[0];
                return unpaid ? (
                    <div>
                        <div className="text-xs font-bold text-rose-600">
                            Rp {Number(unpaid.jumlah_tagihan).toLocaleString('id-ID')}
                        </div>
                        <div className="text-[11px] text-slate-400">
                            Jatuh tempo: {unpaid.tanggal_jatuh_tempo}
                        </div>
                    </div>
                ) : (
                    <span className="text-xs text-amber-600 font-medium">Status: Nunggak</span>
                );
            },
        },
        {
            key: 'actions',
            label: 'Tindakan Cepat',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <button
                    onClick={() => handleQuickWarn(row.id)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition flex items-center gap-1.5 ml-auto"
                >
                    ⚠️ Terbitkan SP Tunggakan
                </button>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Surat Peringatan & Tunggakan"
            subtitle="Penerbitan Surat Peringatan (SP) tata tertib kost serta pemantauan penghuni yang menunggak biaya sewa."
        >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl self-start">
                    <button
                        onClick={() => setActiveSection('surat')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            activeSection === 'surat'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        Riwayat Surat Peringatan ({peringatans.length})
                    </button>
                    <button
                        onClick={() => setActiveSection('menunggak')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                            activeSection === 'menunggak'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        <span>Penghuni Menunggak</span>
                        {menunggakList.length > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                                {menunggakList.length}
                            </span>
                        )}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="px-4 py-2.5 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition whitespace-nowrap self-start sm:self-auto"
                >
                    + Terbitkan SP Baru
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                {activeSection === 'surat' ? (
                    <DataTable
                        columns={spColumns}
                        data={peringatans}
                        loading={loading}
                        searchPlaceholder="Cari isi pelanggaran, nama penghuni..."
                        emptyTitle="Tidak ada riwayat peringatan"
                        emptyDescription="Belum ada Surat Peringatan yang diterbitkan."
                    />
                ) : (
                    <DataTable
                        columns={nunggakColumns}
                        data={menunggakList}
                        loading={loading}
                        searchPlaceholder="Cari nama penghuni menunggak..."
                        emptyTitle="Tidak ada penghuni menunggak"
                        emptyDescription="Semua penghuni kost tertib melakukan pembayaran tepat waktu."
                    />
                )}
            </div>

            {/* MODAL TERBITKAN SP */}
            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Terbitkan Surat Peringatan (SP)"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Penghuni *</label>
                        <select
                            required
                            value={form.penghuni_id}
                            onChange={(e) => setForm({ ...form, penghuni_id: e.target.value })}
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

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Masalah</label>
                            <select
                                value={form.jenis}
                                onChange={(e) => setForm({ ...form, jenis: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="pelanggaran">Pelanggaran Tata Tertib</option>
                                <option value="nunggak">Tunggakan Pembayaran</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kejadian</label>
                            <input
                                type="date"
                                required
                                value={form.tanggal_kejadian}
                                onChange={(e) => setForm({ ...form, tanggal_kejadian: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Pelanggaran</label>
                        <input
                            type="text"
                            placeholder="Contoh: Merokok di dalam kamar ber-AC / Gaduh lewat jam malam"
                            value={form.kategori_pelanggaran}
                            onChange={(e) => setForm({ ...form, kategori_pelanggaran: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Isi Peringatan & Sanksi *</label>
                        <textarea
                            rows={4}
                            required
                            placeholder="Uraikan rincian kejadian dan peringatan/sanksi yang diberikan..."
                            value={form.keterangan}
                            onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm"
                        >
                            {submitting ? 'Menerbitkan...' : 'Terbitkan SP'}
                        </button>
                    </div>
                </form>
            </Modal>
        </AdminLayout>
    );
}
