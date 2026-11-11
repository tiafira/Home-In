import React, { useState, useEffect, useCallback, useMemo } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import DataTable from '../../Components/UI/DataTable';
import StatusBadge from '../../Components/UI/StatusBadge';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import { exportToPdf } from '../../utils/exportPdf';
import { exportToExcel, exportToCsv } from '../../utils/exportExcel';
import api from '../../services/api';

export default function Penghuni() {
    const toast = useToast();
    const { activeBranchId, branches, selectedBranchId } = useBranch();

    // Section: 'penghuni' | 'bermasalah' | 'jam_malam'
    const [activeSection, setActiveSection] = useState('penghuni');

    // Sub-tab for Daftar Penghuni
    const [activeTab, setActiveTab] = useState('aktif');
    const [penghunis, setPenghunis] = useState([]);
    const [fasilitasList, setFasilitasList] = useState([]);
    const [counts, setCounts] = useState({ aktif: 0, nunggak: 0, nonaktif: 0, all: 0 });
    const [loading, setLoading] = useState(true);

    // Troublesome tenants data
    const [bermasalahList, setBermasalahList] = useState([]);
    const [loadingBermasalah, setLoadingBermasalah] = useState(false);

    // Curfew violations data
    const [curfewData, setCurfewData] = useState({ total_pelanggaran: 0, violations_izin: [], warnings_curfew: [] });
    const [loadingCurfew, setLoadingCurfew] = useState(false);

    // Empty rooms for adding or moving tenant
    const [emptyRooms, setEmptyRooms] = useState([]);

    // Detail Modal
    const [selectedPenghuni, setSelectedPenghuni] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [detailFasilitasId, setDetailFasilitasId] = useState('');
    const [detailStatusReq, setDetailStatusReq] = useState('menunggu_konfirmasi');
    const [submittingDetailFasilitas, setSubmittingDetailFasilitas] = useState(false);

    // Perpanjang Masa Tinggal Modal
    const [perpanjangModalOpen, setPerpanjangModalOpen] = useState(false);
    const [perpanjangTarget, setPerpanjangTarget] = useState(null);
    const [perpanjangBulan, setPerpanjangBulan] = useState(1);
    const [submittingPerpanjang, setSubmittingPerpanjang] = useState(false);

    // Pindah Kamar Modal
    const [pindahModalOpen, setPindahModalOpen] = useState(false);
    const [pindahTarget, setPindahTarget] = useState(null);
    const [pindahKamarBaruId, setPindahKamarBaruId] = useState('');
    const [submittingPindah, setSubmittingPindah] = useState(false);
    const [pindahGedungId, setPindahGedungId] = useState('');
    const [pindahLantai, setPindahLantai] = useState('');

    // Kirim Peringatan Modal
    const [peringatanModalOpen, setPeringatanModalOpen] = useState(false);
    const [peringatanTarget, setPeringatanTarget] = useState(null);
    const [peringatanForm, setPeringatanForm] = useState({
        jenis: 'nunggak',
        kategori_pelanggaran: 'Keterlambatan Pembayaran Sewa Kost',
        keterangan: '',
        tanggal_kejadian: new Date().toISOString().split('T')[0],
    });
    const [submittingPeringatan, setSubmittingPeringatan] = useState(false);

    // Add Tenant Modal
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [addGedungId, setAddGedungId] = useState('');
    const [addLantai, setAddLantai] = useState('');
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

    // Derived cascading options for Tambah Penghuni
    const addAvailableGedungs = useMemo(() => {
        const map = new Map();
        emptyRooms.forEach((r) => {
            if (r.gedung && !map.has(String(r.gedung.id))) {
                map.set(String(r.gedung.id), {
                    id: String(r.gedung.id),
                    nama: r.gedung.nama_gedung,
                    cabang: r.gedung.cabang?.nama_cabang,
                });
            }
        });
        return Array.from(map.values());
    }, [emptyRooms]);

    const addAvailableLantais = useMemo(() => {
        if (!addGedungId) return [];
        const lantais = new Set();
        emptyRooms
            .filter((r) => String(r.gedung_id) === String(addGedungId))
            .forEach((r) => {
                if (r.lantai !== undefined && r.lantai !== null) {
                    lantais.add(String(r.lantai));
                }
            });
        return Array.from(lantais).sort((a, b) => Number(a) - Number(b));
    }, [emptyRooms, addGedungId]);

    const addFilteredRooms = useMemo(() => {
        if (!addGedungId || !addLantai) return [];
        return emptyRooms.filter(
            (r) => String(r.gedung_id) === String(addGedungId) && String(r.lantai) === String(addLantai)
        );
    }, [emptyRooms, addGedungId, addLantai]);

    const addSelectedRoomObj = useMemo(() => {
        return emptyRooms.find((r) => String(r.id) === String(form.kamar_id)) || null;
    }, [emptyRooms, form.kamar_id]);

    // Derived cascading options for Pindah Kamar
    const pindahAvailableGedungs = useMemo(() => {
        const map = new Map();
        emptyRooms.forEach((r) => {
            if (r.gedung && !map.has(String(r.gedung.id))) {
                map.set(String(r.gedung.id), {
                    id: String(r.gedung.id),
                    nama: r.gedung.nama_gedung,
                    cabang: r.gedung.cabang?.nama_cabang,
                });
            }
        });
        return Array.from(map.values());
    }, [emptyRooms]);

    const pindahAvailableLantais = useMemo(() => {
        if (!pindahGedungId) return [];
        const lantais = new Set();
        emptyRooms
            .filter((r) => String(r.gedung_id) === String(pindahGedungId))
            .forEach((r) => {
                if (r.lantai !== undefined && r.lantai !== null) {
                    lantais.add(String(r.lantai));
                }
            });
        return Array.from(lantais).sort((a, b) => Number(a) - Number(b));
    }, [emptyRooms, pindahGedungId]);

    const pindahFilteredRooms = useMemo(() => {
        if (!pindahGedungId || !pindahLantai) return [];
        return emptyRooms.filter(
            (r) => String(r.gedung_id) === String(pindahGedungId) && String(r.lantai) === String(pindahLantai)
        );
    }, [emptyRooms, pindahGedungId, pindahLantai]);

    const pindahSelectedRoomObj = useMemo(() => {
        return emptyRooms.find((r) => String(r.id) === String(pindahKamarBaruId)) || null;
    }, [emptyRooms, pindahKamarBaruId]);

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

    const fetchBermasalah = useCallback(async () => {
        setLoadingBermasalah(true);
        try {
            const res = await api.get('/admin/penghuni/bermasalah');
            if (res.data.status === 'success') {
                setBermasalahList(res.data.data || []);
            }
        } catch (err) {
            toast.error('Gagal memuat pelacakan penyewa bermasalah.');
        } finally {
            setLoadingBermasalah(false);
        }
    }, [activeBranchId, toast]);

    const fetchCurfew = useCallback(async () => {
        setLoadingCurfew(true);
        try {
            const res = await api.get('/admin/penghuni/pelanggaran-jam-malam');
            if (res.data.status === 'success') {
                setCurfewData(res.data);
            }
        } catch (err) {
            toast.error('Gagal memuat data pelanggaran jam malam.');
        } finally {
            setLoadingCurfew(false);
        }
    }, [activeBranchId, toast]);

    const fetchEmptyRooms = async () => {
        try {
            const res = await api.get('/admin/penghuni/empty-rooms');
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
        if (activeSection === 'penghuni') {
            fetchPenghuni();
        } else if (activeSection === 'bermasalah') {
            fetchBermasalah();
        } else if (activeSection === 'jam_malam') {
            fetchCurfew();
        }
    }, [activeSection, fetchPenghuni, fetchBermasalah, fetchCurfew]);

    // Open Perpanjang Masa Tinggal modal
    const handleOpenPerpanjang = (penghuni) => {
        setPerpanjangTarget(penghuni);
        setPerpanjangBulan(1);
        setPerpanjangModalOpen(true);
    };

    const handlePerpanjangSubmit = async (e) => {
        e.preventDefault();
        if (!perpanjangTarget) return;
        setSubmittingPerpanjang(true);
        try {
            const res = await api.post(`/admin/penghuni/${perpanjangTarget.id}/perpanjang`, {
                durasi_bulan: perpanjangBulan,
            });
            toast.success(res.data.message || 'Masa tinggal berhasil diperpanjang!');
            setPerpanjangModalOpen(false);
            if (detailModalOpen) setDetailModalOpen(false);
            fetchPenghuni();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memperpanjang masa tinggal.');
        } finally {
            setSubmittingPerpanjang(false);
        }
    };

    // Open Pindah Kamar modal
    const handleOpenPindahKamar = async (penghuni) => {
        setPindahTarget(penghuni);
        const rooms = await fetchEmptyRooms();
        let initGedung = '';
        let initLantai = '';
        let initKamarId = '';
        if (rooms && rooms.length > 0) {
            const currentGedungId = penghuni.kamar?.gedung_id ? String(penghuni.kamar.gedung_id) : '';
            const hasSameGedung = rooms.some((r) => String(r.gedung_id) === currentGedungId);
            initGedung = hasSameGedung ? currentGedungId : String(rooms[0].gedung_id);
            const floors = rooms
                .filter((r) => String(r.gedung_id) === initGedung)
                .map((r) => String(r.lantai));
            const uniqueFloors = Array.from(new Set(floors)).sort((a, b) => Number(a) - Number(b));
            initLantai = uniqueFloors[0] || (rooms[0].lantai !== undefined ? String(rooms[0].lantai) : '');
            const matching = rooms.filter(
                (r) => String(r.gedung_id) === initGedung && String(r.lantai) === initLantai
            );
            initKamarId = matching[0]?.id || rooms[0].id;
        }
        setPindahGedungId(initGedung);
        setPindahLantai(initLantai);
        setPindahKamarBaruId(initKamarId);
        setPindahModalOpen(true);
    };

    const handlePindahGedungChange = (e) => {
        const newGedungId = e.target.value;
        setPindahGedungId(newGedungId);
        const floors = emptyRooms
            .filter((r) => String(r.gedung_id) === String(newGedungId))
            .map((r) => String(r.lantai));
        const uniqueFloors = Array.from(new Set(floors)).sort((a, b) => Number(a) - Number(b));
        if (uniqueFloors.length > 0) {
            const firstFloor = uniqueFloors[0];
            setPindahLantai(firstFloor);
            const matching = emptyRooms.filter(
                (r) => String(r.gedung_id) === String(newGedungId) && String(r.lantai) === firstFloor
            );
            setPindahKamarBaruId(matching[0]?.id || '');
        } else {
            setPindahLantai('');
            setPindahKamarBaruId('');
        }
    };

    const handlePindahLantaiChange = (e) => {
        const newLantai = e.target.value;
        setPindahLantai(newLantai);
        const matching = emptyRooms.filter(
            (r) => String(r.gedung_id) === String(pindahGedungId) && String(r.lantai) === String(newLantai)
        );
        setPindahKamarBaruId(matching[0]?.id || '');
    };

    const handlePindahKamarSubmit = async (e) => {
        e.preventDefault();
        if (!pindahTarget || !pindahKamarBaruId) {
            toast.warning('Pilih kamar baru yang masih kosong.');
            return;
        }
        setSubmittingPindah(true);
        try {
            const res = await api.post(`/admin/penghuni/${pindahTarget.id}/pindah-kamar`, {
                kamar_baru_id: pindahKamarBaruId,
            });
            toast.success(res.data.message || 'Penghuni berhasil dipindahkan ke kamar baru!');
            setPindahModalOpen(false);
            if (detailModalOpen) setDetailModalOpen(false);
            fetchPenghuni();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memindahkan kamar penghuni.');
        } finally {
            setSubmittingPindah(false);
        }
    };

    // Open Kirim Peringatan modal
    const handleOpenPeringatan = (penghuni) => {
        setPeringatanTarget(penghuni);
        setPeringatanForm({
            jenis: 'nunggak',
            kategori_pelanggaran: 'Keterlambatan Pembayaran Sewa Kost',
            keterangan: '',
            tanggal_kejadian: new Date().toISOString().split('T')[0],
        });
        setPeringatanModalOpen(true);
    };

    const handlePeringatanSubmit = async (e) => {
        e.preventDefault();
        if (!peringatanTarget) return;
        setSubmittingPeringatan(true);
        try {
            const res = await api.post(`/admin/penghuni/${peringatanTarget.id}/peringatan`, peringatanForm);
            toast.success(res.data.message || 'Surat peringatan berhasil diterbitkan!');
            setPeringatanModalOpen(false);
            if (activeSection === 'bermasalah') fetchBermasalah();
            else fetchPenghuni();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menerbitkan surat peringatan.');
        } finally {
            setSubmittingPeringatan(false);
        }
    };

    const handleOpenAddModal = async () => {
        const rooms = await fetchEmptyRooms();
        let initGedung = '';
        let initLantai = '';
        let initKamarId = '';
        if (rooms && rooms.length > 0) {
            initGedung = rooms[0].gedung_id ? String(rooms[0].gedung_id) : '';
            const floors = rooms
                .filter((r) => String(r.gedung_id) === initGedung)
                .map((r) => String(r.lantai));
            const uniqueFloors = Array.from(new Set(floors)).sort((a, b) => Number(a) - Number(b));
            initLantai = uniqueFloors[0] || (rooms[0].lantai !== undefined ? String(rooms[0].lantai) : '');
            const matching = rooms.filter(
                (r) => String(r.gedung_id) === initGedung && String(r.lantai) === initLantai
            );
            initKamarId = matching[0]?.id || rooms[0].id;
        }
        setAddGedungId(initGedung);
        setAddLantai(initLantai);
        setForm({
            name: '',
            email: '',
            no_hp: '',
            kamar_id: initKamarId,
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

    const handleAddGedungChange = (e) => {
        const newGedungId = e.target.value;
        setAddGedungId(newGedungId);
        const floors = emptyRooms
            .filter((r) => String(r.gedung_id) === String(newGedungId))
            .map((r) => String(r.lantai));
        const uniqueFloors = Array.from(new Set(floors)).sort((a, b) => Number(a) - Number(b));
        if (uniqueFloors.length > 0) {
            const firstFloor = uniqueFloors[0];
            setAddLantai(firstFloor);
            const matching = emptyRooms.filter(
                (r) => String(r.gedung_id) === String(newGedungId) && String(r.lantai) === firstFloor
            );
            setForm((prev) => ({ ...prev, kamar_id: matching[0]?.id || '' }));
        } else {
            setAddLantai('');
            setForm((prev) => ({ ...prev, kamar_id: '' }));
        }
    };

    const handleAddLantaiChange = (e) => {
        const newLantai = e.target.value;
        setAddLantai(newLantai);
        const matching = emptyRooms.filter(
            (r) => String(r.gedung_id) === String(addGedungId) && String(r.lantai) === String(newLantai)
        );
        setForm((prev) => ({ ...prev, kamar_id: matching[0]?.id || '' }));
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
                { header: 'Tgl Masuk', accessor: 'tanggal_masuk' },
                { header: 'Masa Tinggal Sampai', accessor: 'masa_tinggal_sampai' },
                { header: 'Status', render: (r) => (r.status || '').toUpperCase() },
            ],
            data: penghunis,
            summary: `Total Penghuni Aktif: ${counts.aktif} | Menunggak: ${counts.nunggak} | Alumni/Keluar: ${counts.nonaktif}`,
        });
    };

    const handleExportExcel = () => {
        const headers = ['No', 'Nama Penghuni', 'Email', 'No HP', 'No KTP', 'Nomor Kamar', 'Gedung', 'Cabang', 'Tgl Masuk', 'Masa Tinggal Sampai', 'Status'];
        const rows = penghunis.map((r, i) => [
            i + 1,
            r.user?.nama || r.user?.name || '-',
            r.user?.email || '-',
            r.user?.no_hp || '-',
            r.no_ktp || '-',
            r.kamar?.nomor_kamar || '-',
            r.kamar?.gedung?.nama_gedung || '-',
            r.kamar?.gedung?.cabang?.nama_cabang || '-',
            r.tanggal_masuk || '-',
            r.masa_tinggal_sampai || '-',
            (r.status || '').toUpperCase(),
        ]);
        exportToExcel({
            filename: `data-penghuni-${new Date().toISOString().split('T')[0]}.xls`,
            title: 'Data Penyewa Kost Home-In',
            headers,
            rows,
        });
        toast.success('Data penghuni berhasil diekspor ke Excel!');
    };

    const handleExportCsv = () => {
        const headers = ['No', 'Nama Penghuni', 'Email', 'No HP', 'No KTP', 'Nomor Kamar', 'Gedung', 'Cabang', 'Tgl Masuk', 'Masa Tinggal Sampai', 'Status'];
        const rows = penghunis.map((r, i) => [
            i + 1,
            r.user?.nama || r.user?.name || '-',
            r.user?.email || '-',
            r.user?.no_hp || '-',
            r.no_ktp || '-',
            r.kamar?.nomor_kamar || '-',
            r.kamar?.gedung?.nama_gedung || '-',
            r.kamar?.gedung?.cabang?.nama_cabang || '-',
            r.tanggal_masuk || '-',
            r.masa_tinggal_sampai || '-',
            (r.status || '').toUpperCase(),
        ]);
        exportToCsv({
            filename: `data-penghuni-${new Date().toISOString().split('T')[0]}.csv`,
            headers,
            rows,
        });
        toast.success('Data penghuni berhasil diekspor ke CSV!');
    };

    const handleOpenImportModal = async () => {
        await fetchEmptyRooms();
        setCsvRaw('');
        setImportRows([]);
        setImportModalOpen(true);
    };

    const parseCsv = (text) => {
        const lines = text.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length <= 1) return [];

        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
            if (cols.length >= 3 && cols[1] && cols[2]) {
                rows.push({
                    timestamp: cols[0] || '',
                    nama: cols[1] || '',
                    email: cols[2] || '',
                    no_hp: cols[3] || '',
                    no_ktp: cols[4] || '',
                    alamat_asal: cols[5] || '',
                    tanggal_masuk: cols[6] || new Date().toISOString().split('T')[0],
                    fasilitas_pilihan: cols[7] || '',
                    fasilitas_id: '',
                    kamar_id: emptyRooms[0]?.id || '',
                });
            }
        }
        return rows;
    };

    const handleCsvTextChange = (text) => {
        setCsvRaw(text);
        const parsed = parseCsv(text);
        setImportRows(parsed);
    };

    const handleImportSubmit = async () => {
        if (importRows.length === 0) {
            toast.warning('Tidak ada baris data CSV yang valid untuk diimpor.');
            return;
        }

        const unassigned = importRows.find((r) => !r.kamar_id);
        if (unassigned) {
            toast.error(`Pilih kamar kosong terlebih dahulu untuk calon penghuni "${unassigned.nama}".`);
            return;
        }

        setSubmittingImport(true);
        try {
            const payload = {
                items: importRows.map((r) => ({
                    nama: r.nama,
                    email: r.email,
                    no_hp: r.no_hp,
                    no_ktp: r.no_ktp,
                    alamat_asal: r.alamat_asal,
                    tanggal_masuk: r.tanggal_masuk,
                    kamar_id: r.kamar_id,
                    fasilitas_id: r.fasilitas_id || null,
                })),
            };

            const res = await api.post('/admin/penghuni/import', payload);
            toast.success(res.data.message || 'Impor data Google Form berhasil!');
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
        { key: 'nunggak', label: 'Menunggak Sewa', count: counts.nunggak, alert: true },
        { key: 'nonaktif', label: 'Keluar / Alumni', count: counts.nonaktif },
        { key: 'all', label: 'Semua Status', count: counts.all },
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
                    {row.no_ktp && <div className="text-[11px] text-slate-400">KTP: {row.no_ktp}</div>}
                </div>
            ),
        },
        {
            key: 'kamar',
            label: 'Kamar & Lokasi',
            className: 'whitespace-nowrap',
            render: (row) => (
                <div>
                    <div className="font-semibold text-[#1E5FC9]">
                        Kamar {row.kamar?.nomor_kamar || '-'} (Lt. {row.kamar?.lantai || 1})
                    </div>
                    <div className="text-xs text-slate-500">
                        {row.kamar?.gedung?.cabang?.nama_cabang || '-'} • {row.kamar?.gedung?.nama_gedung || '-'}
                    </div>
                </div>
            ),
        },
        {
            key: 'masa_tinggal',
            label: 'Masa Tinggal & Hitung Mundur',
            className: 'whitespace-nowrap text-xs',
            render: (row) => {
                let daysLeftBadge = null;
                if (row.masa_tinggal_sampai) {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const expiry = new Date(row.masa_tinggal_sampai);
                    expiry.setHours(0, 0, 0, 0);
                    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));

                    if (diffDays < 0) {
                        daysLeftBadge = (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                                Lewat {Math.abs(diffDays)} hari
                            </span>
                        );
                    } else if (diffDays === 0) {
                        daysLeftBadge = (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                Berakhir Hari Ini
                            </span>
                        );
                    } else if (diffDays <= 7) {
                        daysLeftBadge = (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {diffDays} hari lagi
                            </span>
                        );
                    } else {
                        daysLeftBadge = (
                            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700">
                                {diffDays} hari lagi
                            </span>
                        );
                    }
                }

                return (
                    <div className="space-y-0.5">
                        <div className="text-slate-600">
                            Masuk: <strong>{row.tanggal_masuk}</strong>
                        </div>
                        {row.masa_tinggal_sampai && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-500">s/d {row.masa_tinggal_sampai}</span>
                                {daysLeftBadge}
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: 'Status',
            className: 'whitespace-nowrap',
            render: (row) => <StatusBadge status={row.status} />,
        },
        {
            key: 'actions',
            label: 'Aksi Cepat',
            className: 'text-right whitespace-nowrap',
            render: (row) => (
                <div className="flex items-center justify-end gap-1.5">
                    {row.status === 'aktif' && (
                        <>
                            <button
                                type="button"
                                onClick={() => handleOpenPerpanjang(row)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition"
                                title="Perpanjang masa sewa"
                            >
                                Perpanjang
                            </button>
                            <button
                                type="button"
                                onClick={() => handleOpenPindahKamar(row)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition"
                                title="Pindahkan ke kamar kosong lain"
                            >
                                Pindah Kamar
                            </button>
                        </>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setSelectedPenghuni(row);
                            setDetailModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#EAF1FC] text-[#1E5FC9] hover:bg-blue-100 transition"
                    >
                        Detail
                    </button>
                    {row.status === 'aktif' && (
                        <button
                            type="button"
                            onClick={() => {
                                setCheckoutTarget(row);
                                setCheckoutDialogOpen(true);
                            }}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
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
            title="Penyewa & Penghuni"
            subtitle="Manajemen penyewa aktif, hitung mundur masa tinggal, perpanjang sewa, pindah kamar, pelacakan penyewa bermasalah, dan kepatuhan jam malam."
        >
            {/* Top Switcher: Penghuni Aktif vs Penyewa Bermasalah vs Jam Malam */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl mb-6 self-start w-fit">
                <button
                    onClick={() => setActiveSection('penghuni')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                        activeSection === 'penghuni'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    👥 Daftar Penyewa
                </button>
                <button
                    onClick={() => setActiveSection('bermasalah')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                        activeSection === 'bermasalah'
                            ? 'bg-white text-rose-700 shadow-sm'
                            : 'text-slate-500 hover:text-rose-600'
                    }`}
                >
                    <span>⚠️ Pelacakan Penyewa Bermasalah</span>
                </button>
                <button
                    onClick={() => setActiveSection('jam_malam')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 ${
                        activeSection === 'jam_malam'
                            ? 'bg-white text-purple-700 shadow-sm'
                            : 'text-slate-500 hover:text-purple-600'
                    }`}
                >
                    <span>🌙 Pelanggaran Jam Malam</span>
                </button>
            </div>

            {/* SECTION 1: DAFTAR PENGHUNI */}
            {activeSection === 'penghuni' && (
                <>
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
                                                ? 'bg-[#1E5FC9] text-white shadow-sm'
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

                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={handleExportExcel}
                                    title="Export Data ke Excel (.xls)"
                                    className="px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-white rounded-lg transition cursor-pointer flex items-center gap-1"
                                >
                                    <span>📊 Excel</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportCsv}
                                    title="Export Data ke CSV"
                                    className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition cursor-pointer flex items-center gap-1"
                                >
                                    <span>📑 CSV</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleExportPdf}
                                    title="Cetak atau Simpan PDF"
                                    className="px-2.5 py-1.5 text-xs font-bold text-rose-700 hover:bg-white rounded-lg transition cursor-pointer flex items-center gap-1"
                                >
                                    <span>🖨️ PDF</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleOpenImportModal}
                                className="px-3.5 py-2.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-xl shadow-xs transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>Import Google Form (CSV)</span>
                            </button>

                            <button
                                type="button"
                                onClick={handleOpenAddModal}
                                className="px-4 py-2.5 text-xs font-bold text-white bg-[#1E5FC9] hover:bg-blue-700 rounded-xl shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
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
                </>
            )}

            {/* SECTION 2: PELACAKAN PENYEWA BERMASALAH */}
            {activeSection === 'bermasalah' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">
                                Daftar Penyewa Bermasalah (Tunggakan & Pelanggaran)
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Dihitung otomatis dari akumulasi tagihan sewa yang telat/belum bayar dan riwayat surat peringatan.
                            </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                            {bermasalahList.length} Penyewa Terdeteksi
                        </span>
                    </div>

                    {loadingBermasalah ? (
                        <div className="py-12 text-center text-slate-500 text-sm">
                            <div className="w-8 h-8 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            Menganalisis data tagihan dan riwayat peringatan...
                        </div>
                    ) : bermasalahList.length === 0 ? (
                        <div className="py-12 text-center bg-emerald-50 rounded-xl border border-emerald-200">
                            <span className="text-3xl block mb-2">🎉</span>
                            <h4 className="font-bold text-emerald-800 text-sm">Semua Penyewa Tertib</h4>
                            <p className="text-xs text-emerald-600 mt-1">Tidak ada penghuni yang memiliki tunggakan menumpuk atau catatan pelanggaran aktif saat ini.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-700">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Penghuni & Kamar</th>
                                        <th className="py-3 px-4">Tunggakan Tagihan</th>
                                        <th className="py-3 px-4">Total Hutang</th>
                                        <th className="py-3 px-4">Surat Peringatan</th>
                                        <th className="py-3 px-4">Tingkat Risiko</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {bermasalahList.map((item) => {
                                        const p = item.penghuni;
                                        return (
                                            <tr key={p.id} className="hover:bg-slate-50/70">
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-slate-800">{p.user?.nama || p.user?.name}</div>
                                                    <div className="text-xs text-slate-500">
                                                        Kamar {p.kamar?.nomor_kamar} ({p.kamar?.gedung?.cabang?.nama_cabang}) • {p.user?.no_hp || '-'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={`font-semibold ${item.unpaid_bills_count > 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                        {item.unpaid_bills_count} bulan tagihan
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 font-bold text-slate-800">
                                                    Rp {Number(item.total_tunggakan).toLocaleString('id-ID')}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                                                        {item.peringatan_count} peringatan
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span
                                                        className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
                                                            item.risk_level === 'tinggi'
                                                                ? 'bg-rose-100 text-rose-700'
                                                                : item.risk_level === 'sedang'
                                                                ? 'bg-amber-100 text-amber-800'
                                                                : 'bg-emerald-100 text-emerald-800'
                                                        }`}
                                                    >
                                                        {item.risk_level}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenPeringatan(p)}
                                                        className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm transition"
                                                    >
                                                        Kirim Peringatan
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* SECTION 3: PELANGGARAN JAM MALAM */}
            {activeSection === 'jam_malam' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">
                                Monitoring Pelanggaran Jam Malam
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Daftar pengajuan izin keluar yang melewati jam malam cabang kost atau penolakan izin yang terdeteksi.
                            </p>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                            {curfewData.total_pelanggaran} Riwayat Terdata
                        </span>
                    </div>

                    {loadingCurfew ? (
                        <div className="py-12 text-center text-slate-500 text-sm">
                            <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            Memeriksa izin keluar dan jam malam...
                        </div>
                    ) : curfewData.total_pelanggaran === 0 ? (
                        <div className="py-12 text-center bg-purple-50 rounded-xl border border-purple-200">
                            <span className="text-3xl block mb-2">🌙</span>
                            <h4 className="font-bold text-purple-800 text-sm">Tidak Ada Pelanggaran Jam Malam</h4>
                            <p className="text-xs text-purple-600 mt-1">Seluruh izin keluar dan aktivitas kembali sesuai dengan batas jam malam cabang.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-700">
                                <thead className="bg-slate-50 text-xs font-semibold text-slate-500 uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="py-3 px-4">Tanggal</th>
                                        <th className="py-3 px-4">Penghuni & Kamar</th>
                                        <th className="py-3 px-4">Jam Malam Cabang</th>
                                        <th className="py-3 px-4">Rencana Kembali</th>
                                        <th className="py-3 px-4">Kategori Pelanggaran</th>
                                        <th className="py-3 px-4 text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {curfewData.violations_izin?.map((v, i) => (
                                        <tr key={i} className="hover:bg-slate-50/70">
                                            <td className="py-3 px-4 text-xs text-slate-500">{v.izin?.tanggal}</td>
                                            <td className="py-3 px-4">
                                                <div className="font-semibold text-slate-800">{v.izin?.penghuni?.user?.nama || v.izin?.penghuni?.user?.name}</div>
                                                <div className="text-xs text-slate-500">
                                                    Kamar {v.izin?.penghuni?.kamar?.nomor_kamar} ({v.izin?.penghuni?.kamar?.gedung?.cabang?.nama_cabang})
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 font-semibold text-slate-700">{v.jam_malam_cabang}</td>
                                            <td className="py-3 px-4 font-bold text-rose-600">{v.jam_kembali}</td>
                                            <td className="py-3 px-4">
                                                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                                                    {v.tipe_pelanggaran}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenPeringatan(v.izin?.penghuni)}
                                                    className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition"
                                                >
                                                    Peringatkan
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* PERPANJANG MASA TINGGAL MODAL */}
            {perpanjangTarget && (
                <Modal
                    isOpen={perpanjangModalOpen}
                    onClose={() => setPerpanjangModalOpen(false)}
                    title={`Perpanjang Masa Tinggal — ${perpanjangTarget.user?.nama || perpanjangTarget.user?.name}`}
                    maxWidth="max-w-md"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setPerpanjangModalOpen(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handlePerpanjangSubmit}
                                disabled={submittingPerpanjang}
                                className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition"
                            >
                                {submittingPerpanjang ? 'Menyimpan...' : 'Perpanjang Masa Tinggal'}
                            </button>
                        </div>
                    }
                >
                    <form onSubmit={handlePerpanjangSubmit} className="space-y-4">
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                            <div>Kamar: <strong>{perpanjangTarget.kamar?.nomor_kamar} ({perpanjangTarget.kamar?.gedung?.cabang?.nama_cabang})</strong></div>
                            <div>Masa Tinggal Saat Ini: <strong>{perpanjangTarget.masa_tinggal_sampai || 'Belum diatur'}</strong></div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-2">
                                Tambahkan Durasi Sewa (Bulan) *
                            </label>
                            <div className="grid grid-cols-4 gap-2 mb-3">
                                {[1, 3, 6, 12].map((bln) => (
                                    <button
                                        type="button"
                                        key={bln}
                                        onClick={() => setPerpanjangBulan(bln)}
                                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                                            perpanjangBulan === bln
                                                ? 'bg-[#1E5FC9] text-white border-[#1E5FC9]'
                                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                        }`}
                                    >
                                        +{bln} Bulan
                                    </button>
                                ))}
                            </div>
                            <input
                                type="number"
                                min="1"
                                max="36"
                                required
                                value={perpanjangBulan}
                                onChange={(e) => setPerpanjangBulan(parseInt(e.target.value) || 1)}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </form>
                </Modal>
            )}

            {/* PINDAH KAMAR MODAL */}
            {pindahTarget && (
                <Modal
                    isOpen={pindahModalOpen}
                    onClose={() => setPindahModalOpen(false)}
                    title={`Pindah Kamar — ${pindahTarget.user?.nama || pindahTarget.user?.name}`}
                    maxWidth="max-w-xl"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setPindahModalOpen(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handlePindahKamarSubmit}
                                disabled={submittingPindah || !pindahKamarBaruId}
                                className="px-4 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl shadow-sm transition"
                            >
                                {submittingPindah ? 'Memindahkan...' : 'Konfirmasi Pindah Kamar'}
                            </button>
                        </div>
                    }
                >
                    <form onSubmit={handlePindahKamarSubmit} className="space-y-4">
                        <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 leading-relaxed">
                            Kamar lama (<strong>Kamar {pindahTarget.kamar?.nomor_kamar}</strong>, Lt. {pindahTarget.kamar?.lantai}) akan otomatis dikembalikan ke status <strong>Kosong</strong>, dan kamar tujuan baru akan berubah menjadi <strong>Terisi</strong> dalam satu transaksi aman.
                        </div>

                        {/* Cascading Room Selection: Gedung -> Lantai -> Kamar Kosong */}
                        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                    Pilih Unit Kamar Tujuan Baru
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">
                                    Gedung &rarr; Lantai &rarr; Kamar
                                </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                {/* Step 1: Gedung */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        1. Gedung Tujuan *
                                    </label>
                                    <select
                                        required
                                        value={pindahGedungId}
                                        onChange={handlePindahGedungChange}
                                        className="w-full px-2.5 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-purple-100 focus:border-purple-600"
                                    >
                                        <option value="">-- Pilih Gedung --</option>
                                        {pindahAvailableGedungs.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.nama} {g.cabang ? `(${g.cabang})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Step 2: Lantai */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        2. Lantai Tujuan *
                                    </label>
                                    <select
                                        required
                                        disabled={!pindahGedungId || pindahAvailableLantais.length === 0}
                                        value={pindahLantai}
                                        onChange={handlePindahLantaiChange}
                                        className="w-full px-2.5 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-purple-100 focus:border-purple-600"
                                    >
                                        <option value="">{pindahGedungId ? '-- Pilih Lantai --' : 'Pilih Gedung dulu'}</option>
                                        {pindahAvailableLantais.map((lt) => (
                                            <option key={lt} value={lt}>
                                                Lantai {lt}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Step 3: Kamar Kosong */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                        3. Kamar Kosong *
                                    </label>
                                    <select
                                        required
                                        disabled={!pindahLantai || pindahFilteredRooms.length === 0}
                                        value={pindahKamarBaruId}
                                        onChange={(e) => setPindahKamarBaruId(e.target.value)}
                                        className="w-full px-2.5 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-purple-100 focus:border-purple-600"
                                    >
                                        <option value="">{pindahLantai ? (pindahFilteredRooms.length > 0 ? '-- Pilih Kamar --' : 'Tidak ada kamar') : 'Pilih Lantai dulu'}</option>
                                        {pindahFilteredRooms.map((rm) => (
                                            <option key={rm.id} value={rm.id}>
                                                Kamar {rm.nomor_kamar} (Rp {Number(rm.harga_bulanan).toLocaleString('id-ID')})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Selected Room Badge / Status */}
                            {pindahSelectedRoomObj ? (
                                <div className="p-2.5 bg-purple-50/80 border border-purple-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-purple-950">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                                        <span>
                                            Kamar Baru Terpilih: <strong>Kamar {pindahSelectedRoomObj.nomor_kamar}</strong> (Lantai {pindahSelectedRoomObj.lantai}) &bull; {pindahSelectedRoomObj.gedung?.nama_gedung}
                                        </span>
                                    </div>
                                    <div className="font-semibold text-purple-700 bg-white px-2.5 py-0.5 rounded-lg border border-purple-200 shadow-xs">
                                        Rp {Number(pindahSelectedRoomObj.harga_bulanan).toLocaleString('id-ID')} / bulan
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[11px] text-slate-400 italic">
                                    Silakan pilih gedung, lantai, dan kamar tujuan baru yang kosong.
                                </p>
                            )}
                        </div>
                    </form>
                </Modal>
            )}

            {/* KIRIM PERINGATAN MODAL */}
            {peringatanTarget && (
                <Modal
                    isOpen={peringatanModalOpen}
                    onClose={() => setPeringatanModalOpen(false)}
                    title={`Kirim Surat Peringatan — ${peringatanTarget.user?.nama || peringatanTarget.user?.name}`}
                    maxWidth="max-w-md"
                    footer={
                        <div className="flex items-center justify-end gap-2 w-full">
                            <button
                                type="button"
                                onClick={() => setPeringatanModalOpen(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                            >
                                Batal
                            </button>
                            <button
                                type="button"
                                onClick={handlePeringatanSubmit}
                                disabled={submittingPeringatan || !peringatanForm.keterangan.trim()}
                                className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition"
                            >
                                {submittingPeringatan ? 'Mengirim...' : 'Kirim Peringatan Resmi'}
                            </button>
                        </div>
                    }
                >
                    <form onSubmit={handlePeringatanSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Jenis Peringatan *</label>
                                <select
                                    value={peringatanForm.jenis}
                                    onChange={(e) => setPeringatanForm({ ...peringatanForm, jenis: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                                >
                                    <option value="nunggak">Tunggakan Pembayaran</option>
                                    <option value="pelanggaran">Pelanggaran Tata Tertib</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Kejadian</label>
                                <input
                                    type="date"
                                    required
                                    value={peringatanForm.tanggal_kejadian}
                                    onChange={(e) => setPeringatanForm({ ...peringatanForm, tanggal_kejadian: e.target.value })}
                                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori Pelanggaran *</label>
                            <input
                                type="text"
                                required
                                value={peringatanForm.kategori_pelanggaran}
                                onChange={(e) => setPeringatanForm({ ...peringatanForm, kategori_pelanggaran: e.target.value })}
                                placeholder="Contoh: Keterlambatan Pembayaran / Lewat Jam Malam / Kebisingan"
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan & Teguran *</label>
                            <textarea
                                rows={3}
                                required
                                value={peringatanForm.keterangan}
                                onChange={(e) => setPeringatanForm({ ...peringatanForm, keterangan: e.target.value })}
                                placeholder="Tuliskan isi teguran resmi yang akan dikirimkan ke akun penghuni..."
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </form>
                </Modal>
            )}

            {/* DETAIL, FASILITAS REQ & PRINT KARTU MODAL */}
            {selectedPenghuni && (
                <Modal
                    isOpen={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    title={`Profil & Kartu Penghuni — ${selectedPenghuni.user?.nama || selectedPenghuni.user?.name}`}
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
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDetailModalOpen(false);
                                                handleOpenPerpanjang(selectedPenghuni);
                                            }}
                                            className="px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl"
                                        >
                                            Perpanjang
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setDetailModalOpen(false);
                                                handleOpenPindahKamar(selectedPenghuni);
                                            }}
                                            className="px-3.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl"
                                        >
                                            Pindah Kamar
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCheckoutTarget(selectedPenghuni);
                                                setCheckoutDialogOpen(true);
                                            }}
                                            className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl"
                                        >
                                            Checkout
                                        </button>
                                    </>
                                )}
                                <button
                                    type="button"
                                    onClick={() => setDetailModalOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1E5FC9] hover:bg-blue-700 rounded-xl"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-5" id="printable-tenant-card">
                        {/* Printable ID Card Mockup */}
                        <div className="p-5 rounded-2xl bg-gradient-to-br from-[#1E5FC9] to-[#0D3880] text-white shadow-md relative overflow-hidden">
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

                        {/* Request & Fasilitas Kamar */}
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-[#1E5FC9] uppercase tracking-wider">
                                    🛋️ Request Fasilitas Tambahan Kamar
                                </h4>
                                <span className="text-[11px] text-slate-500">
                                    Kamar {selectedPenghuni.kamar?.nomor_kamar}
                                </span>
                            </div>

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
                                                            onClick={() => handleUpdatePermintaanStatus(kf.id, 'aktif')}
                                                            className="px-2 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg cursor-pointer"
                                                        >
                                                            Setujui
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdatePermintaanStatus(kf.id, 'ditolak')}
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

                            <form onSubmit={handleAddFasilitasFromDetail} className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row gap-2">
                                <select
                                    value={detailFasilitasId}
                                    onChange={(e) => setDetailFasilitasId(e.target.value)}
                                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white text-slate-700"
                                >
                                    <option value="">+ Tambah Fasilitas Tambahan...</option>
                                    {fasilitasList.map((f) => (
                                        <option key={f.id} value={f.id}>
                                            {f.nama_fasilitas} (+Rp {Number(f.biaya_tambahan).toLocaleString('id-ID')})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="submit"
                                    disabled={submittingDetailFasilitas || !detailFasilitasId}
                                    className="px-4 py-2 text-xs font-semibold text-white bg-[#1E5FC9] hover:bg-blue-700 disabled:opacity-50 rounded-xl transition"
                                >
                                    Tambah
                                </button>
                            </form>
                        </div>
                    </div>
                </Modal>
            )}

            {/* ADD TENANT MODAL */}
            <Modal
                isOpen={addModalOpen}
                onClose={() => setAddModalOpen(false)}
                title="Tambah Penghuni Baru"
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
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">No. WhatsApp / HP</label>
                        <input
                            type="text"
                            value={form.no_hp}
                            onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
                            placeholder="Contoh: 081234567890"
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    {/* Cascading Room Selection: Gedung -> Lantai -> Kamar Kosong */}
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                                <svg className="w-4 h-4 text-[#1E5FC9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Pemilihan Unit Kamar
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                                Step: Gedung &rarr; Lantai &rarr; Kamar
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* Step 1: Gedung */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    1. Pilih Gedung *
                                </label>
                                <select
                                    required
                                    value={addGedungId}
                                    onChange={handleAddGedungChange}
                                    className="w-full px-2.5 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800 focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9]"
                                >
                                    <option value="">-- Pilih Gedung --</option>
                                    {addAvailableGedungs.map((g) => (
                                        <option key={g.id} value={g.id}>
                                            {g.nama} {g.cabang ? `(${g.cabang})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 2: Lantai */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    2. Pilih Lantai *
                                </label>
                                <select
                                    required
                                    disabled={!addGedungId || addAvailableLantais.length === 0}
                                    value={addLantai}
                                    onChange={handleAddLantaiChange}
                                    className="w-full px-2.5 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9]"
                                >
                                    <option value="">{addGedungId ? '-- Pilih Lantai --' : 'Pilih Gedung dulu'}</option>
                                    {addAvailableLantais.map((lt) => (
                                        <option key={lt} value={lt}>
                                            Lantai {lt}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Step 3: Kamar Kosong */}
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                                    3. Pilih Kamar Kosong *
                                </label>
                                <select
                                    required
                                    disabled={!addLantai || addFilteredRooms.length === 0}
                                    value={form.kamar_id}
                                    onChange={(e) => setForm({ ...form, kamar_id: e.target.value })}
                                    className="w-full px-2.5 py-2 text-xs font-medium border border-slate-300 rounded-xl bg-white text-slate-800 disabled:bg-slate-100 disabled:text-slate-400 focus:ring-2 focus:ring-blue-100 focus:border-[#1E5FC9]"
                                >
                                    <option value="">{addLantai ? (addFilteredRooms.length > 0 ? '-- Pilih Kamar --' : 'Tidak ada kamar') : 'Pilih Lantai dulu'}</option>
                                    {addFilteredRooms.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            Kamar {r.nomor_kamar} (Rp {Number(r.harga_bulanan).toLocaleString('id-ID')})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Selected Room Badge / Status */}
                        {addSelectedRoomObj ? (
                            <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-blue-950">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span>
                                        Unit Terpilih: <strong>Kamar {addSelectedRoomObj.nomor_kamar}</strong> (Lantai {addSelectedRoomObj.lantai}) &bull; {addSelectedRoomObj.gedung?.nama_gedung}
                                    </span>
                                </div>
                                <div className="font-semibold text-emerald-700 bg-white px-2.5 py-0.5 rounded-lg border border-emerald-200 shadow-xs">
                                    Rp {Number(addSelectedRoomObj.harga_bulanan).toLocaleString('id-ID')} / bulan
                                </div>
                            </div>
                        ) : (
                            <p className="text-[11px] text-slate-400 italic">
                                Silakan pilih gedung, lalu lantai, kemudian kamar kosong yang diinginkan.
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Masuk (Check-In) *</label>
                            <input
                                type="date"
                                required
                                value={form.tanggal_masuk}
                                onChange={(e) => setForm({ ...form, tanggal_masuk: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                            <p className="text-[11px] text-slate-500 mt-1">
                                💡 Bisa pilih hari ini atau tanggal lebih awal jika sudah mulai tinggal duluan.
                            </p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Masa Tinggal Sampai</label>
                            <input
                                type="date"
                                value={form.masa_tinggal_sampai}
                                onChange={(e) => setForm({ ...form, masa_tinggal_sampai: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                            <p className="text-[11px] text-slate-400 mt-1">
                                Opsional. Kosongkan jika belum ada batas akhir sewa.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setAddModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingAdd}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#1E5FC9] hover:bg-blue-700 rounded-xl shadow-sm"
                        >
                            {submittingAdd ? 'Menyimpan...' : 'Simpan Penghuni'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* IMPORT CSV MODAL */}
            <Modal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title="Import Pendaftaran dari Google Form (CSV)"
                maxWidth="max-w-2xl"
            >
                <div className="space-y-4">
                    <p className="text-xs text-slate-600">
                        Salin (copy-paste) isi teks CSV dari Google Form atau Spreadsheet pendaftaran Anda ke dalam kotak di bawah ini.
                    </p>
                    <textarea
                        rows={5}
                        placeholder="Timestamp,Nama Lengkap,Email,No HP,No KTP,Alamat Asal,Tanggal Masuk,Fasilitas Tambahan..."
                        value={csvRaw}
                        onChange={(e) => handleCsvTextChange(e.target.value)}
                        className="w-full p-3 font-mono text-xs border border-slate-300 rounded-xl"
                    />

                    {importRows.length > 0 && (
                        <div className="border border-slate-200 rounded-xl p-3 max-h-56 overflow-y-auto space-y-2">
                            <span className="text-xs font-bold text-slate-700 block">
                                Terdeteksi {importRows.length} calon penghuni:
                            </span>
                            {importRows.map((row, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs">
                                    <div>
                                        <strong>{row.nama}</strong> ({row.email})
                                    </div>
                                    <select
                                        value={row.kamar_id}
                                        onChange={(e) => {
                                            const updated = [...importRows];
                                            updated[idx].kamar_id = e.target.value;
                                            setImportRows(updated);
                                        }}
                                        className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                                    >
                                        <option value="">Pilih Kamar</option>
                                        {emptyRooms.map((rm) => (
                                            <option key={rm.id} value={rm.id}>
                                                Kamar {rm.nomor_kamar} ({rm.gedung?.nama_gedung})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setImportModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                            Batal
                        </button>
                        <button
                            type="button"
                            onClick={handleImportSubmit}
                            disabled={submittingImport || importRows.length === 0}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm"
                        >
                            {submittingImport ? 'Mengimpor...' : `Impor ${importRows.length} Penghuni`}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* CHECKOUT CONFIRM DIALOG */}
            <ConfirmDialog
                isOpen={checkoutDialogOpen}
                onClose={() => setCheckoutDialogOpen(false)}
                onConfirm={handleConfirmCheckout}
                title="Konfirmasi Check-Out Penghuni"
                message={`Apakah Anda yakin ingin memproses check-out untuk ${checkoutTarget?.user?.nama || checkoutTarget?.user?.name}? Kamar ${checkoutTarget?.kamar?.nomor_kamar} akan otomatis dikembalikan menjadi KOSONG dan tersedia untuk booking kembali.`}
                confirmText="Ya, Selesaikan Check-Out"
                cancelText="Batal"
                type="danger"
                loading={submittingCheckout}
            />
        </AdminLayout>
    );
}
