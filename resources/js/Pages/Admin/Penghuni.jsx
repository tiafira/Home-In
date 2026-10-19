import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import { exportToPdf } from '../../utils/exportPdf';
import api from '../../services/api';

export default function Penghuni() {
    const toast = useToast();
    const { activeBranchId, branches, selectedBranchId } = useBranch();

    const [activeTab, setActiveTab] = useState('aktif');
    const [penghunis, setPenghunis] = useState([]);
    const [fasilitasList, setFasilitasList] = useState([]);
    const [counts, setCounts] = useState({ aktif: 0, nunggak: 0, nonaktif: 0, all: 0 });
    const [loading, setLoading] = useState(true);

    // Empty rooms for adding tenant
    const [emptyRooms, setEmptyRooms] = useState([]);

    // Detail Modal
    const [selectedPenghuni, setSelectedPenghuni] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailFasilitasId, setDetailFasilitasId] = useState('');
    const [detailStatusReq, setDetailStatusReq] = useState('menunggu_konfirmasi');
    const [submittingDetailFasilitas, setSubmittingDetailFasilitas] = useState(false);

    // Add Tenant Modal
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        no_hp: '',
        kamar_id: '',
        fasilitas_id: '',
        fasilitas_custom: '',
        status_request: 'menunggu_konfirmasi',
        no_ktp: '',
        alamat_asal: '',
        kontak_darurat_nama: '',
        kontak_darurat_hp: '',
        tanggal_masuk: new Date().toISOString().split('T')[0],
        masa_tinggal_sampai: '',
    });
    const [submittingAdd, setSubmittingAdd] = useState(false);

    // Import Google Form (CSV) Modal
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [csvRaw, setCsvRaw] = useState('');
    const [importRows, setImportRows] = useState([]);
    const [submittingImport, setSubmittingImport] = useState(false);

    // Checkout Confirm Dialog
    const [checkoutTarget, setCheckoutTarget] = useState(null);
    const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
    const [submittingCheckout, setSubmittingCheckout] = useState(false);

    const fetchPenghuni = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/penghuni', {
                params: {
                    status: activeTab,
                },
            });
            if (res.data.status === 'success') {
                setPenghunis(res.data.data || []);
                setCounts(res.data.counts || { aktif: 0, nunggak: 0, nonaktif: 0, all: 0 });
                if (res.data.fasilitas_list) {
                    setFasilitasList(res.data.fasilitas_list);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat daftar penghuni.');
        } finally {
            setLoading(false);
        }
    }, [activeTab, activeBranchId, toast]);

    const fetchEmptyRooms = async () => {
        try {
            const res = await api.get('/admin/kamar-gedung', { params: { status: 'kosong' } });
            if (res.data.status === 'success') {
                setEmptyRooms(res.data.data || []);
                return res.data.data || [];
            }
        } catch (err) {
            // ignore
        }
        return [];
    };

    useEffect(() => {
        fetchPenghuni();
    }, [fetchPenghuni]);

    const handleOpenAddModal = async () => {
        const rooms = await fetchEmptyRooms();
        setForm({
            name: '',
            email: '',
            no_hp: '',
            kamar_id: rooms[0]?.id || '',
            fasilitas_id: '',
            fasilitas_custom: '',
            status_request: 'menunggu_konfirmasi',
            no_ktp: '',
            alamat_asal: '',
            kontak_darurat_nama: '',
            kontak_darurat_hp: '',
            tanggal_masuk: new Date().toISOString().split('T')[0],
            masa_tinggal_sampai: '',
        });
        setAddModalOpen(true);
    };

    const handleAddSubmit = async (e) => {
        e.preventDefault();
        setSubmittingAdd(true);
        try {
            const payload = {
                ...form,
                fasilitas_id: form.fasilitas_id || null,
                fasilitas_custom: form.fasilitas_custom ? form.fasilitas_custom.trim() : null,
            };
            const res = await api.post('/admin/penghuni', payload);
            toast.success(res.data.message || 'Penghuni baru berhasil ditambahkan!');
            setAddModalOpen(false);
            fetchPenghuni();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menambahkan penghuni.');
        } finally {
            setSubmittingAdd(false);
        }
    };

    // Quick request facility from Table Dropdown or Detail Modal
    const handleQuickRequestFasilitas = async (penghuniId, fasilitasId, statusRequest = 'menunggu_konfirmasi', customName = null) => {
        if (!fasilitasId && !customName) return;
        try {
            const res = await api.post(`/admin/penghuni/${penghuniId}/fasilitas`, {
                fasilitas_id: fasilitasId || null,
                fasilitas_custom: customName ? customName.trim() : null,
                status_request: statusRequest,
            });
            toast.success(res.data.message || 'Fasilitas berhasil ditambahkan!');
            if (selectedPenghuni && selectedPenghuni.id === penghuniId && res.data.data) {
                setSelectedPenghuni(res.data.data);
            }
            fetchPenghuni();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menambahkan request fasilitas.');
        }
    };

    const handleAddFasilitasFromDetail = async (e) => {
        e.preventDefault();
        if (!selectedPenghuni || !detailFasilitasId) {
            toast.warning('Pilih fasilitas terlebih dahulu dari dropdown.');
            return;
        }
        setSubmittingDetailFasilitas(true);
        await handleQuickRequestFasilitas(selectedPenghuni.id, detailFasilitasId, detailStatusReq);
        setDetailFasilitasId('');
        setSubmittingDetailFasilitas(false);
    };

    const handleUpdatePermintaanStatus = async (kamarFasilitasId, newStatus) => {
        try {
            await api.post(`/admin/fasilitas/permintaan/${kamarFasilitasId}`, {
                status_request: newStatus,
            });
            toast.success(`Status request fasilitas diperbarui menjadi ${newStatus}.`);
            fetchPenghuni();
            if (selectedPenghuni) {
                const res = await api.get(`/admin/penghuni/${selectedPenghuni.id}`);
                if (res.data.status === 'success') {
                    setSelectedPenghuni(res.data.data);
                }
            }
        } catch (err) {
            toast.error('Gagal memperbarui status fasilitas.');
        }
    };

    const handleConfirmCheckout = async () => {
        if (!checkoutTarget) return;
        setSubmittingCheckout(true);
        try {
            const res = await api.post(`/admin/penghuni/${checkoutTarget.id}/checkout`);
            toast.success(res.data.message || 'Penghuni berhasil checkout.');
            setCheckoutDialogOpen(false);
            setDetailModalOpen(false);
            fetchPenghuni();
        } catch (err) {
            toast.error('Gagal memproses checkout.');
        } finally {
            setSubmittingCheckout(false);
        }
    };

    const handlePrintCard = () => {
        window.print();
    };

    const handleExportPdf = () => {
        const branchName =
            branches.find((b) => String(b.id) === String(selectedBranchId))?.nama_cabang ||
            'Semua Cabang';

        exportToPdf({
            title: 'Laporan Data Penghuni Kost',
            subtitle: `Filter Status: ${activeTab.toUpperCase()}`,
            branchName,
            columns: [
                { header: 'No', render: (_, i) => i + 1, align: 'center' },
                { header: 'Nama Penghuni', render: (r) => r.user?.nama || r.user?.name || '-' },
                { header: 'Email / No HP', render: (r) => `${r.user?.email || '-'} / ${r.user?.no_hp || '-'}` },
                { header: 'No KTP', render: (r) => r.no_ktp || '-' },
                {
                    header: 'Kamar & Cabang',
                    render: (r) =>
                        `Kamar ${r.kamar?.nomor_kamar || '-'} (${r.kamar?.gedung?.cabang?.nama_cabang || '-'})`,
                },
                {
                    header: 'Fasilitas Req',
                    render: (r) =>
                        (r.kamar?.kamar_fasilitas || [])
                            .map((kf) => `${kf.fasilitas?.nama_fasilitas || '-'} (${kf.status_request})`)
                            .join(', ') || '-',
                },
                { header: 'Tgl Masuk', accessor: 'tanggal_masuk' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ],
            data: penghunis,
            summary: `Total Penghuni Aktif: ${counts.aktif} | Menunggak: ${counts.nunggak} | Alumni/Keluar: ${counts.nonaktif}`,
        });
    };

    const handleOpenImportModal = async () => {
        await fetchEmptyRooms();
        setCsvRaw('');
        setImportRows([]);
        setImportModalOpen(true);
    };

    const parseGoogleFormCsv = (text) => {
        setCsvRaw(text);
        if (!text.trim()) {
            setImportRows([]);
            return;
        }
        const lines = text
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);

        if (lines.length === 0) {
            setImportRows([]);
            return;
        }

        const firstLineLower = lines[0].toLowerCase();
        const hasHeader =
            firstLineLower.includes('nama') ||
            firstLineLower.includes('email') ||
            firstLineLower.includes('timestamp');

        const dataLines = hasHeader ? lines.slice(1) : lines;

        const parsed = dataLines
            .map((line, index) => {
                const cols = line.split(',').map((c) => c.replace(/^"|"$/g, '').trim());
                const offset = hasHeader && firstLineLower.startsWith('timestamp') ? 1 : 0;
                const defaultRoomId = emptyRooms[index]?.id || emptyRooms[0]?.id || '';

                return {
                    nama: cols[offset] || '',
                    email: cols[offset + 1] || '',
                    no_hp: cols[offset + 2] || '',
                    no_ktp: cols[offset + 3] || '',
                    alamat_asal: cols[offset + 4] || '',
                    kamar_id: defaultRoomId,
                    fasilitas_id: '',
                    tanggal_masuk: new Date().toISOString().split('T')[0],
                };
            })
            .filter((r) => r.nama || r.email);

        setImportRows(parsed);
    };

    const handleCsvFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            parseGoogleFormCsv(evt.target?.result || '');
        };
        reader.readAsText(file);
    };

    const handleImportSubmit = async (e) => {
        e.preventDefault();
        if (importRows.length === 0) {
            toast.warning('Belum ada baris data valid untuk diimpor.');
            return;
        }
        const missingRoom = importRows.some((r) => !r.kamar_id);
        if (missingRoom) {
            toast.warning('Pastikan setiap calon penghuni telah dipilihkan kamar yang kosong.');
            return;
        }
        setSubmittingImport(true);
        try {
            const res = await api.post('/admin/penghuni/import', { items: importRows });
            toast.success(res.data.message || 'Data Google Form berhasil diimpor!');
            setImportModalOpen(false);
            fetchPenghuni();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengimpor data penghuni.');
        } finally {
            setSubmittingImport(false);
        }
    };

    const tabs = [
        { key: 'aktif', label: 'Penghuni Aktif', count: counts.aktif },
        { key: 'nunggak', label: 'Menunggak', count: counts.nunggak, alert: counts.nunggak > 0 },
        { key: 'nonaktif', label: 'Riwayat (Alumni/Keluar)', count: counts.nonaktif },
        { key: 'all', label: 'Semua', count: counts.all },
    ];

    const columns = [
        {
            key: 'user',
            label: 'Penghuni',
            render: (row) => (
                <div>
                    <div className="font-semibold text-slate-800">{row.user?.nama || row.user?.name || '-'}</div>
                    <div className="text-xs text-slate-500">
                        {row.user?.email || '-'} • {row.user?.no_hp || '-'}
                    </div>
                </div>
            ),
        },
        {
            key: 'kamar',
            label: 'Kamar & Lokasi',
            className: 'whitespace-nowrap',
            render: (row) => (
                <div>
                    <div className="font-semibold text-[#263b53]">
                        Kamar {row.kamar?.nomor_kamar || '-'} (Lt. {row.kamar?.lantai || 1})
                    </div>
                    <div className="text-xs text-slate-500">
                        {row.kamar?.gedung?.cabang?.nama_cabang || '-'} • {row.kamar?.gedung?.nama_gedung || '-'}
                    </div>
                </div>
            ),
        },
        {
            key: 'fasilitas_req',
            label: 'Request Fasilitas',
            render: (row) => {
                const kfList = row.kamar?.kamar_fasilitas || [];
                return (
                    <div className="space-y-1.5 min-w-[190px]">
                        {kfList.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {kfList.map((kf) => (
                                    <span
                                        key={kf.id}
                                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${
                                            kf.status_request === 'aktif'
                                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                : kf.status_request === 'menunggu_konfirmasi'
                                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                                : 'bg-rose-50 text-rose-700 border-rose-200'
                                        }`}
                                    >
                                        <span>{kf.fasilitas?.nama_fasilitas || 'Fasilitas'}</span>
                                        <span className="opacity-75 text-[10px]">
                                            ({kf.status_request === 'menunggu_konfirmasi' ? 'Req' : kf.status_request})
                                        </span>
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <span className="text-xs text-slate-400 italic block">Belum ada request</span>
                        )}

                        {/* Dropdown langsung untuk tambah / request fasilitas penghuni */}
                        {row.status !== 'nonaktif' && (
                            <select
                                defaultValue=""
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                        handleQuickRequestFasilitas(row.id, val, 'menunggu_konfirmasi');
                                        e.target.value = '';
                                    }
                                }}
                                className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 hover:bg-white text-[#263b53] font-medium focus:outline-none focus:border-[#263b53] cursor-pointer"
                            >
                                <option value="">+ Pilih Fasilitas Req...</option>
                                {fasilitasList.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.nama_fasilitas}{' '}
                                        {Number(f.biaya_tambahan) > 0
                                            ? `(+Rp ${Number(f.biaya_tambahan).toLocaleString('id-ID')})`
                                            : '(Default)'}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'tanggal_masuk',
            label: 'Masa Tinggal',
            className: 'whitespace-nowrap text-xs text-slate-600',
            render: (row) => (
                <div>
                    <div>
                        Masuk: <strong>{row.tanggal_masuk}</strong>
                    </div>
                    {row.masa_tinggal_sampai && (
                        <div className="text-slate-400">Sampai: {row.masa_tinggal_sampai}</div>
                    )}
                </div>
            ),
        },
        {
            key: 'status',
            label: 'Status',
            className: 'whitespace-nowrap',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            label: 'Aksi',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <div className="flex items-center justify-end gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedPenghuni(row);
                            setDetailModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-[#263b53] hover:bg-blue-100 transition cursor-pointer"
                    >
                        Detail & Fasilitas
                    </button>
                    {row.status === 'aktif' && (
                        <button
                            type="button"
                            onClick={() => {
                                setCheckoutTarget(row);
                                setCheckoutDialogOpen(true);
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                        >
                            Checkout
                        </button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <AdminLayout
            title="Data Penghuni"
            subtitle="Manajemen data penghuni aktif, request fasilitas tambahan, import pendaftaran Google Form, serta proses check-out."
        >
            {/* Header Action Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.key;
                        return (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap cursor-pointer ${
                                    isActive
                                        ? 'bg-[#263b53] text-white shadow-sm'
                                        : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.count > 0 && (
                                    <span
                                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                            isActive
                                                ? 'bg-white/20 text-white'
                                                : tab.alert
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}
                                    >
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <button
                        type="button"
                        onClick={handleExportPdf}
                        className="px-3.5 py-2.5 text-xs font-bold text-[#263b53] bg-white border border-slate-200 hover:bg-blue-50 rounded-xl shadow-xs transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m.75 12l3 3m0 0l3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                            />
                        </svg>
                        <span>Export PDF</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenImportModal}
                        className="px-3.5 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl shadow-xs transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                            />
                        </svg>
                        <span>Import Google Form (CSV)</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="px-4 py-2.5 text-xs font-bold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                    >
                        + Tambah Penghuni Baru
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                <DataTable
                    columns={columns}
                    data={penghunis}
                    loading={loading}
                    searchPlaceholder="Cari nama penghuni, email, no KTP, kamar..."
                    emptyTitle="Tidak ada data penghuni"
                    emptyDescription="Belum ada penghuni pada kategori ini."
                />
            </div>

            {/* DETAIL, FASILITAS REQ & PRINT KARTU MODAL */}
            {selectedPenghuni && (
                <Modal
                    isOpen={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    title={`Profil, Fasilitas & Kartu Penghuni — ${selectedPenghuni.user?.nama || selectedPenghuni.user?.name}`}
                    maxWidth="max-w-2xl"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <button
                                type="button"
                                onClick={handlePrintCard}
                                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer"
                            >
                                🖨️ Cetak Kartu Penghuni
                            </button>

                            <div className="flex items-center gap-2">
                                {selectedPenghuni.status === 'aktif' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setCheckoutTarget(selectedPenghuni);
                                            setCheckoutDialogOpen(true);
                                        }}
                                        className="px-4 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer"
                                    >
                                        Proses Checkout
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setDetailModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl cursor-pointer"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-5" id="printable-tenant-card">
                        {/* Printable ID Card Mockup */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#263b53] to-[#0D3880] text-white shadow-md relative overflow-hidden">
                            <div className="flex items-center justify-between border-b border-white/20 pb-3 mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-bold text-white text-sm">
                                        HI
                                    </div>
                                    <span className="font-bold tracking-tight text-base">KARTU PENGHUNI HOME-IN</span>
                                </div>
                                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-white/20 text-white capitalize">
                                    {selectedPenghuni.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="opacity-70 block mb-0.5">Nama Lengkap</span>
                                    <strong className="text-base text-white block">
                                        {selectedPenghuni.user?.nama || selectedPenghuni.user?.name}
                                    </strong>
                                    <span className="opacity-80 mt-1 block">KTP: {selectedPenghuni.no_ktp || '-'}</span>
                                    <span className="opacity-80 block">HP: {selectedPenghuni.user?.no_hp || '-'}</span>
                                </div>

                                <div className="text-right">
                                    <span className="opacity-70 block mb-0.5">Kamar Ditempati</span>
                                    <strong className="text-xl text-yellow-300 block font-bold">
                                        Kamar {selectedPenghuni.kamar?.nomor_kamar}
                                    </strong>
                                    <span className="opacity-80 mt-1 block">
                                        {selectedPenghuni.kamar?.gedung?.nama_gedung} (Lt.{' '}
                                        {selectedPenghuni.kamar?.lantai})
                                    </span>
                                    <span className="opacity-80 block font-medium">
                                        {selectedPenghuni.kamar?.gedung?.cabang?.nama_cabang}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-t border-white/15 flex justify-between text-[11px] opacity-80">
                                <span>Tanggal Masuk: {selectedPenghuni.tanggal_masuk}</span>
                                <span>
                                    Kontak Darurat: {selectedPenghuni.kontak_darurat_nama || '-'} (
                                    {selectedPenghuni.kontak_darurat_hp || '-'})
                                </span>
                            </div>
                        </div>

                        {/* Additional Information */}
                        <div className="grid grid-cols-2 gap-4 text-xs text-slate-600">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="font-semibold text-slate-500 block mb-1">Alamat Asal</span>
                                <p className="text-slate-800">
                                    {selectedPenghuni.alamat_asal || 'Tidak ada catatan alamat asal.'}
                                </p>
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                                <span className="font-semibold text-slate-500 block mb-1">Masa Tinggal</span>
                                <p className="text-slate-800">
                                    {selectedPenghuni.tanggal_masuk} s/d{' '}
                                    {selectedPenghuni.masa_tinggal_sampai || 'Fleksibel / Belum Ditentukan'}
                                </p>
                            </div>
                        </div>

                        {/* SECTION DROPDOWN REQUEST FASILITAS PENGHUNI */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-[#263b53] uppercase tracking-wider">
                                    🛋️ Request & Fasilitas Kamar Penghuni
                                </h4>
                                <span className="text-[11px] text-slate-500">
                                    Kamar {selectedPenghuni.kamar?.nomor_kamar}
                                </span>
                            </div>

                            {/* Daftar Fasilitas yang sudah di-request / terpasang di kamar ini */}
                            {(selectedPenghuni.kamar?.kamar_fasilitas || []).length === 0 ? (
                                <p className="text-xs text-slate-400 italic">
                                    Belum ada request fasilitas tambahan untuk kamar penghuni ini.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {(selectedPenghuni.kamar?.kamar_fasilitas || []).map((kf) => (
                                        <div
                                            key={kf.id}
                                            className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200 text-xs"
                                        >
                                            <div>
                                                <strong className="text-slate-800">
                                                    {kf.fasilitas?.nama_fasilitas || 'Fasilitas'}
                                                </strong>
                                                <span className="ml-2 text-slate-500">
                                                    +Rp{' '}
                                                    {Number(kf.fasilitas?.biaya_tambahan || 0).toLocaleString('id-ID')}
                                                    /bln
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={kf.status_request} />
                                                {kf.status_request === 'menunggu_konfirmasi' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleUpdatePermintaanStatus(kf.id, 'aktif')
                                                            }
                                                            className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                                                        >
                                                            Setujui
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleUpdatePermintaanStatus(kf.id, 'ditolak')
                                                            }
                                                            className="px-2 py-1 text-[11px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg cursor-pointer"
                                                        >
                                                            Tolak
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Form Dropdown Tambah Request Fasilitas */}
                            <form
                                onSubmit={handleAddFasilitasFromDetail}
                                className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-2"
                            >
                                <select
                                    value={detailFasilitasId}
                                    onChange={(e) => setDetailFasilitasId(e.target.value)}
                                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700"
                                >
                                    <option value="">-- Pilih Request Fasilitas Tambahan --</option>
                                    {fasilitasList.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.nama_fasilitas} ({f.tipe}) — +Rp{' '}
                                            {Number(f.biaya_tambahan || 0).toLocaleString('id-ID')}/bln
                                        </option>
                                    ))}
                                </select>

                                <select
                                    value={detailStatusReq}
                                    onChange={(e) => setDetailStatusReq(e.target.value)}
                                    className="px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700"
                                >
                                    <option value="menunggu_konfirmasi">Status: Request (Menunggu)</option>
                                    <option value="aktif">Status: Langsung Aktif</option>
                                </select>

                                <button
                                    type="submit"
                                    disabled={submittingDetailFasilitas || !detailFasilitasId}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] disabled:opacity-50 rounded-xl transition shrink-0 cursor-pointer"
                                >
                                    + Tambah Fasilitas
                                </button>
                            </form>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ADD TENANT MODAL (WITH DROPDOWN REQUEST FASILITAS) */}
            <Modal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Daftarkan Penghuni Baru"
                maxWidth="max-w-xl"
            >
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap *</label>
                            <input
                                type="text"
                                required
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                placeholder="Nama lengkap penghuni"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Email *</label>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                placeholder="email@contoh.com"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Nomor HP / WhatsApp *
                            </label>
                            <input
                                type="text"
                                required
                                value={form.no_hp}
                                onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                                placeholder="08123456789"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor KTP / NIK</label>
                            <input
                                type="text"
                                value={form.no_ktp}
                                onChange={(e) => setForm({ ...form, no_ktp: e.target.value })}
                                placeholder="3271XXXXXXXXXXXX"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Pilih Kamar Kosong *
                            </label>
                            <select
                                required
                                value={form.kamar_id}
                                onChange={(e) => setForm({ ...form, kamar_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="">Pilih Kamar Kosong</option>
                                {emptyRooms.map((rm) => (
                                    <option key={rm.id} value={rm.id}>
                                        Kamar {rm.nomor_kamar} (Lt. {rm.lantai}) - {rm.gedung?.nama_gedung} - Rp{' '}
                                        {Number(rm.harga_bulanan).toLocaleString('id-ID')}/bln
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* DROPDOWN REQUEST FASILITAS & INPUT KUSTOM */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Request Fasilitas Kost <span className="text-slate-400 font-normal">(Opsional - Bisa Dikosongkan)</span>
                            </label>
                            <select
                                value={form.fasilitas_id}
                                onChange={(e) => setForm({ ...form, fasilitas_id: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="">-- Tidak Ada / Kosongkan --</option>
                                {fasilitasList.map((f) => (
                                     <option key={f.id} value={f.id}>
                                         {f.nama_fasilitas}{' '}
                                         {Number(f.biaya_tambahan) > 0
                                             ? `(+Rp ${Number(f.biaya_tambahan).toLocaleString('id-ID')}/bln)`
                                             : '(Gratis/Default)'}
                                     </option>
                                ))}
                            </select>

                            {/* Opsi Input Manual / Fasilitas Kustom */}
                            <div className="mt-2">
                                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                    Atau Ketik Fasilitas Kustom / Manual:
                                </label>
                                <input
                                    type="text"
                                    placeholder="Contoh: Kulkas mini, Smart TV, Meja belajar..."
                                    value={form.fasilitas_custom || ''}
                                    onChange={(e) => setForm({ ...form, fasilitas_custom: e.target.value })}
                                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#263b53]"
                                />
                            </div>
                        </div>
                    </div>

                    {(form.fasilitas_id || (form.fasilitas_custom && form.fasilitas_custom.trim())) && (
                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                            <span className="font-semibold text-[#263b53]">
                                Status Pemasangan Fasilitas yang Dipilih:
                            </span>
                            <select
                                value={form.status_request}
                                onChange={(e) => setForm({ ...form, status_request: e.target.value })}
                                className="px-2.5 py-1 border border-slate-300 rounded-lg bg-white font-semibold text-[#263b53]"
                            >
                                <option value="menunggu_konfirmasi">Menunggu Konfirmasi (Request)</option>
                                <option value="aktif">Langsung Aktif / Terpasang</option>
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Masuk *</label>
                            <input
                                type="date"
                                required
                                value={form.tanggal_masuk}
                                onChange={(e) => setForm({ ...form, tanggal_masuk: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Masa Tinggal Sampai
                            </label>
                            <input
                                type="date"
                                value={form.masa_tinggal_sampai}
                                onChange={(e) => setForm({ ...form, masa_tinggal_sampai: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Nama Kontak Darurat
                            </label>
                            <input
                                type="text"
                                value={form.kontak_darurat_nama}
                                onChange={(e) => setForm({ ...form, kontak_darurat_nama: e.target.value })}
                                placeholder="Nama orang tua / wali"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                No HP Kontak Darurat
                            </label>
                            <input
                                type="text"
                                value={form.kontak_darurat_hp}
                                onChange={(e) => setForm({ ...form, kontak_darurat_hp: e.target.value })}
                                placeholder="08XXXXXXXXXX"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Alamat Asal</label>
                        <textarea
                            rows={2}
                            value={form.alamat_asal}
                            onChange={(e) => setForm({ ...form, alamat_asal: e.target.value })}
                            placeholder="Alamat domisili asal..."
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingAdd}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm cursor-pointer"
                        >
                            {submittingAdd ? 'Mendaftarkan...' : 'Daftarkan Penghuni'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* IMPORT GOOGLE FORM (CSV) MODAL */}
            <Modal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Import Data Pendaftaran Penghuni dari Google Form (CSV)"
                maxWidth="max-w-3xl"
            >
                <form onSubmit={handleImportSubmit} className="space-y-4">
                    <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                        Unggah file <strong>.csv</strong> hasil unduhan Google Sheets / Google Form atau tempelkan baris
                        CSV dengan urutan kolom: <strong>Nama, Email, No HP, No KTP, Alamat Asal</strong>. Anda juga
                        dapat memilih Kamar dan Request Fasilitas untuk setiap penghuni sebelum mengimpor.
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Upload File CSV Google Form
                            </label>
                            <input
                                type="file"
                                accept=".csv,.txt"
                                onChange={handleCsvFileChange}
                                className="w-full text-xs border border-slate-300 rounded-xl p-2 bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Atau Tempel Teks CSV Langsung
                            </label>
                            <textarea
                                rows={2}
                                value={csvRaw}
                                onChange={(e) => parseGoogleFormCsv(e.target.value)}
                                placeholder="Budi Santoso, budi@gmail.com, 08123456789, 32710001, Jl. Merdeka 10"
                                className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    {importRows.length > 0 && (
                        <div className="border border-slate-200 rounded-xl overflow-x-auto max-h-64">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                        <th className="py-2 px-3">Nama & Email</th>
                                        <th className="py-2 px-3">No HP / KTP</th>
                                        <th className="py-2 px-3">Pilih Kamar *</th>
                                        <th className="py-2 px-3">Request Fasilitas</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {importRows.map((r, idx) => (
                                        <tr key={idx}>
                                            <td className="py-2 px-3">
                                                <div className="font-semibold text-slate-800">{r.nama}</div>
                                                <div className="text-slate-500">{r.email}</div>
                                            </td>
                                            <td className="py-2 px-3">
                                                <div>{r.no_hp || '-'}</div>
                                                <div className="text-slate-400">{r.no_ktp || '-'}</div>
                                            </td>
                                            <td className="py-2 px-3">
                                                <select
                                                    required
                                                    value={r.kamar_id}
                                                    onChange={(e) => {
                                                        const next = [...importRows];
                                                        next[idx].kamar_id = e.target.value;
                                                        setImportRows(next);
                                                    }}
                                                    className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs"
                                                >
                                                    <option value="">Pilih Kamar</option>
                                                    {emptyRooms.map((rm) => (
                                                        <option key={rm.id} value={rm.id}>
                                                            Kamar {rm.nomor_kamar} ({rm.gedung?.nama_gedung})
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-2 px-3">
                                                <select
                                                    value={r.fasilitas_id || ''}
                                                    onChange={(e) => {
                                                        const next = [...importRows];
                                                        next[idx].fasilitas_id = e.target.value;
                                                        setImportRows(next);
                                                    }}
                                                    className="px-2 py-1 border border-slate-300 rounded-lg bg-white text-xs"
                                                >
                                                    <option value="">-- Tanpa Req --</option>
                                                    {fasilitasList.map((f) => (
                                                        <option key={f.id} value={f.id}>
                                                            {f.nama_fasilitas}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setImportModalOpen(false)}
                            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingImport || importRows.length === 0}
                            className="px-4 py-2 text-xs font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] disabled:opacity-50 rounded-xl shadow-sm cursor-pointer"
                        >
                            {submittingImport ? 'Mengimpor...' : `Impor ${importRows.length} Penghuni`}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* CHECKOUT CONFIRM DIALOG */}
            <ConfirmDialog
                isOpen={checkoutDialogOpen}
                onClose={() => setCheckoutDialogOpen(false)}
                onConfirm={handleConfirmCheckout}
                title="Konfirmasi Check-Out Penghuni"
                message={`Apakah Anda yakin ingin melakukan check-out untuk ${checkoutTarget?.user?.nama || checkoutTarget?.user?.name}? Kamar ${checkoutTarget?.kamar?.nomor_kamar} akan otomatis dikembalikan ke status 'kosong' dan status penghuni diubah ke nonaktif.`}
                confirmText="Ya, Check-Out"
                cancelText="Batal"
                type="danger"
                loading={submittingCheckout}
            />
        </AdminLayout>
    );
}
