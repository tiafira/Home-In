import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import AdminLayout from '../../Layouts/AdminLayout';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import StatusBadge from '../../Components/UI/StatusBadge';
import LeafletMapPicker from '../../Components/UI/LeafletMapPicker';
import CabangSettingsTab from './CabangSettingsTab';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import { parseLatLngFromInput } from '../../utils/geoUtils';
import api from '../../services/api';

export default function KamarGedung() {
    const toast = useToast();
    const { activeBranchId } = useBranch();
    const [searchParams] = useSearchParams();

    const [kamars, setKamars] = useState([]);
    const [gedungs, setGedungs] = useState([]);
    const [cabangs, setCabangs] = useState([]);
    const [counts, setCounts] = useState({ total: 0, kosong: 0, terisi: 0, dibooking: 0, maintenance: 0 });
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState('kamar_gedung'); // 'kamar_gedung' | 'pengaturan_cabang'

    // Filters
    const [filterGedung, setFilterGedung] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [search, setSearch] = useState('');

    // Expanded Maps per Gedung card
    const [expandedMapsGedungId, setExpandedMapsGedungId] = useState(null);

    // Selected Room for detail
    const [selectedKamar, setSelectedKamar] = useState(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    // Delete Confirmations
    const [deleteKamarTarget, setDeleteKamarTarget] = useState(null);
    const [deletingKamar, setDeletingKamar] = useState(false);
    const [deleteGedungTarget, setDeleteGedungTarget] = useState(null);
    const [deletingGedung, setDeletingGedung] = useState(false);

    // Add/Edit Kamar Modal
    const [kamarModalOpen, setKamarModalOpen] = useState(false);
    const [editingKamar, setEditingKamar] = useState(null);
    const [kamarForm, setKamarForm] = useState({
        gedung_id: '',
        nomor_kamar: '',
        lantai: 1,
        harga_bulanan: 600000,
        status: 'kosong',
        deskripsi: '',
    });
    const [kamarFotoFile, setKamarFotoFile] = useState(null);
    const [kamarFotoPreview, setKamarFotoPreview] = useState(null);
    const [submittingKamar, setSubmittingKamar] = useState(false);

    // Bulk Add Kamar Modal
    const [bulkModalOpen, setBulkModalOpen] = useState(false);
    const [bulkForm, setBulkForm] = useState({
        gedung_id: '',
        lantai: 1,
        harga_bulanan: 600000,
        jumlah_kamar: 5,
        deskripsi: '',
    });
    const [bulkFotoFile, setBulkFotoFile] = useState(null);
    const [bulkFotoPreview, setBulkFotoPreview] = useState(null);
    const [submittingBulk, setSubmittingBulk] = useState(false);

    // Add/Edit Gedung Modal
    const [gedungModalOpen, setGedungModalOpen] = useState(false);
    const [editingGedung, setEditingGedung] = useState(null);
    const [gedungForm, setGedungForm] = useState({
        cabang_id: '',
        nama_gedung: '',
        jumlah_lantai: 2,
        alamat: '',
        latitude: -6.8869,
        longitude: 107.5356,
        link_gmaps: '',
    });
    const [gedungFotoFile, setGedungFotoFile] = useState(null);
    const [gedungFotoPreview, setGedungFotoPreview] = useState(null);
    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [searchingMap, setSearchingMap] = useState(false);
    const [submittingGedung, setSubmittingGedung] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/kamar-gedung', {
                params: {
                    gedung_id: filterGedung || undefined,
                    status: filterStatus !== 'all' ? filterStatus : undefined,
                    search: search || undefined,
                },
            });
            if (res.data.status === 'success') {
                setKamars(res.data.data || []);
                setGedungs(res.data.gedungs || []);
                setCabangs(res.data.cabangs || []);
                setCounts(res.data.counts || { total: 0, kosong: 0, terisi: 0, dibooking: 0, maintenance: 0 });
            }
        } catch (err) {
            toast.error('Gagal memuat data kamar & gedung.');
        } finally {
            setLoading(false);
        }
    }, [filterGedung, filterStatus, search, activeBranchId, toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (searchParams.get('tab') === 'gedung') {
            const el = document.getElementById('gedung-section');
            if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }, [searchParams]);

    const handleOpenAddKamar = () => {
        setEditingKamar(null);
        setKamarForm({
            gedung_id: gedungs[0]?.id || '',
            nomor_kamar: '',
            lantai: 1,
            harga_bulanan: 600000,
            status: 'kosong',
            deskripsi: '',
        });
        setKamarFotoFile(null);
        setKamarFotoPreview(null);
        setKamarModalOpen(true);
    };

    const handleOpenEditKamar = (k) => {
        setEditingKamar(k);
        setKamarForm({
            gedung_id: k.gedung_id,
            nomor_kamar: k.nomor_kamar,
            lantai: k.lantai,
            harga_bulanan: k.harga_bulanan,
            status: k.status,
            deskripsi: k.deskripsi || '',
        });
        setKamarFotoFile(null);
        setKamarFotoPreview(k.kamar_foto?.[0]?.url_foto || null);
        setKamarModalOpen(true);
    };

    const handleOpenAddBulk = () => {
        setBulkForm({
            gedung_id: gedungs[0]?.id || '',
            lantai: 1,
            harga_bulanan: 600000,
            jumlah_kamar: 5,
            deskripsi: '',
        });
        setBulkFotoFile(null);
        setBulkFotoPreview(null);
        setBulkModalOpen(true);
    };

    const handleSubmitKamar = async (e) => {
        e.preventDefault();
        if (!editingKamar && !kamarFotoFile) {
            toast.warning('Foto kamar wajib diunggah.');
            return;
        }

        setSubmittingKamar(true);
        try {
            const formData = new FormData();
            formData.append('gedung_id', kamarForm.gedung_id);
            formData.append('nomor_kamar', kamarForm.nomor_kamar);
            formData.append('lantai', kamarForm.lantai);
            formData.append('harga_bulanan', kamarForm.harga_bulanan);
            formData.append('status', kamarForm.status);
            if (kamarForm.deskripsi) formData.append('deskripsi', kamarForm.deskripsi);
            if (kamarFotoFile) formData.append('foto', kamarFotoFile);

            if (editingKamar) {
                formData.append('_method', 'PUT');
                await api.post(`/admin/kamar/${editingKamar.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Data kamar berhasil diperbarui!');
            } else {
                await api.post('/admin/kamar', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Kamar baru berhasil ditambahkan!');
            }
            setKamarModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan kamar.');
        } finally {
            setSubmittingKamar(false);
        }
    };

    const handleSubmitBulk = async (e) => {
        e.preventDefault();
        if (!bulkFotoFile) {
            toast.warning('Foto kamar wajib diunggah untuk kelengkapan kamar massal.');
            return;
        }

        setSubmittingBulk(true);
        try {
            const formData = new FormData();
            formData.append('gedung_id', bulkForm.gedung_id);
            formData.append('lantai', bulkForm.lantai);
            formData.append('harga_bulanan', bulkForm.harga_bulanan);
            formData.append('jumlah_kamar', bulkForm.jumlah_kamar);
            if (bulkForm.deskripsi) formData.append('deskripsi', bulkForm.deskripsi);
            formData.append('foto', bulkFotoFile);

            const res = await api.post('/admin/kamar/bulk', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success(res.data?.message || 'Kamar berhasil ditambahkan secara massal!');
            setBulkModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menambahkan kamar massal.');
        } finally {
            setSubmittingBulk(false);
        }
    };

    const handleConfirmDeleteKamar = async () => {
        if (!deleteKamarTarget) return;
        setDeletingKamar(true);
        try {
            await api.delete(`/admin/kamar/${deleteKamarTarget.id}`);
            toast.success('Kamar berhasil dihapus.');
            setDeleteKamarTarget(null);
            setDetailModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menghapus kamar.');
        } finally {
            setDeletingKamar(false);
        }
    };

    const handleUpdateStatusKamar = async (kamarId, newStatus) => {
        try {
            const res = await api.post(`/admin/kamar/${kamarId}/status`, { status: newStatus });
            toast.success(res.data?.message || `Status kamar diubah ke ${newStatus}.`);
            fetchData();
            if (selectedKamar && selectedKamar.id === kamarId) {
                setSelectedKamar((prev) => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengubah status kamar.');
        }
    };

    const handleToggleKamarAvailability = async (kamar, e) => {
        if (e) e.stopPropagation();
        if (kamar.status === 'terisi' || kamar.status === 'dibooking') {
            toast.warning(`Kamar ${kamar.nomor_kamar} sedang ${kamar.status} dan tidak dapat di-toggle.`);
            return;
        }

        const targetStatus = kamar.status === 'kosong' ? 'maintenance' : 'kosong';
        try {
            const res = await api.post(`/admin/kamar/${kamar.id}/status`, { status: targetStatus });
            toast.success(res.data?.message || `Status kamar ${kamar.nomor_kamar} berhasil diubah.`);
            fetchData();
            if (selectedKamar && selectedKamar.id === kamar.id) {
                setSelectedKamar((prev) => ({ ...prev, status: targetStatus }));
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengubah ketersediaan kamar.');
        }
    };

    const handleOpenAddGedung = () => {
        setEditingGedung(null);
        setGedungForm({
            cabang_id: null,
            nama_gedung: '',
            jumlah_lantai: 2,
            alamat: '',
            latitude: -6.8869,
            longitude: 107.5356,
            link_gmaps: '',
        });
        setGedungFotoFile(null);
        setGedungFotoPreview(null);
        setMapSearchQuery('');
        setGedungModalOpen(true);
    };

    const handleOpenEditGedung = (gedung) => {
        setEditingGedung(gedung);
        const lat = gedung.latitude ?? -6.8869;
        const lng = gedung.longitude ?? 107.5356;
        setGedungForm({
            cabang_id: gedung.cabang_id ?? null,
            nama_gedung: gedung.nama_gedung || '',
            jumlah_lantai: gedung.jumlah_lantai || 2,
            alamat: gedung.alamat || '',
            latitude: Number(lat),
            longitude: Number(lng),
            link_gmaps: gedung.link_gmaps || `https://www.google.com/maps?q=${lat},${lng}`,
        });
        setGedungFotoFile(null);
        setGedungFotoPreview(gedung.url_foto || gedung.foto || null);
        setMapSearchQuery('');
        setGedungModalOpen(true);
    };

    const handleResolveLocation = async (rawInput) => {
        const query = (rawInput ?? mapSearchQuery ?? gedungForm.link_gmaps ?? gedungForm.alamat ?? '').trim();
        if (!query) {
            toast.warning('Masukkan link Google Maps, koordinat, atau nama tempat terlebih dahulu.');
            return;
        }

        // 1. First attempt: instant client-side parse (for direct coords e.g. "-6.8869, 107.5356" or standard gmaps URLs)
        const clientParsed = parseLatLngFromInput(query);
        if (clientParsed) {
            const { lat, lng } = clientParsed;
            setGedungForm((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                link_gmaps: query.startsWith('http') ? query : `https://www.google.com/maps?q=${lat},${lng}`,
            }));
            toast.success(`Titik koordinat berhasil dideteksi (${lat}, ${lng})!`);
            return;
        }

        // 2. Second attempt: server-side resolver (handles shortened maps.app.goo.gl, goo.gl/maps, or Nominatim search)
        setSearchingMap(true);
        try {
            const res = await api.post('/admin/gedung/resolve-location', { input: query });
            if (res.data?.status === 'success' && res.data?.data) {
                const { latitude, longitude, display_name, link_gmaps } = res.data.data;
                const lat = parseFloat(Number(latitude).toFixed(7));
                const lng = parseFloat(Number(longitude).toFixed(7));
                setGedungForm((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    alamat: prev.alamat || display_name || prev.alamat,
                    link_gmaps: link_gmaps || (query.startsWith('http') ? query : `https://www.google.com/maps?q=${lat},${lng}`),
                }));
                toast.success(`Titik lokasi Google Maps berhasil ditemukan (${lat}, ${lng})!`);
            } else {
                toast.warning('Lokasi tidak ditemukan. Silakan buka Google Maps, klik kanan lokasi gedung, lalu salin angka koordinat (contoh: -6.8869, 107.5356).');
            }
        } catch (err) {
            toast.warning(err.response?.data?.message || 'Tidak dapat mendeteksi lokasi otomatis. Silakan salin koordinat langsung dari Google Maps.');
        } finally {
            setSearchingMap(false);
        }
    };

    const handleCoordinatePaste = (e) => {
        const pastedText = e.clipboardData.getData('text');
        if (!pastedText) return;

        const parsed = parseLatLngFromInput(pastedText);
        if (parsed) {
            e.preventDefault();
            setGedungForm((prev) => ({
                ...prev,
                latitude: parsed.lat,
                longitude: parsed.lng,
                link_gmaps: `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`,
            }));
            toast.success(`Koordinat berhasil dipaste (${parsed.lat}, ${parsed.lng})!`);
        }
    };

    const handleGmapsLinkChange = (value) => {
        const parsed = parseLatLngFromInput(value);
        if (parsed) {
            setGedungForm((prev) => ({
                ...prev,
                link_gmaps: value,
                latitude: parsed.lat,
                longitude: parsed.lng,
            }));
            toast.info(`Koordinat terdeteksi (${parsed.lat}, ${parsed.lng})`);
        } else {
            setGedungForm((prev) => ({
                ...prev,
                link_gmaps: value,
            }));
            // If it's a URL, attempt automatic resolve after slight debounce
            if (value.startsWith('http') && (value.includes('goo.gl') || value.includes('google.') || value.includes('maps'))) {
                handleResolveLocation(value);
            }
        }
    };

    const handleUseCurrentGPS = () => {
        if (!navigator.geolocation) {
            toast.error('Browser Anda tidak mendukung fitur GPS Geolocation.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = parseFloat(pos.coords.latitude.toFixed(7));
                const lng = parseFloat(pos.coords.longitude.toFixed(7));
                setGedungForm((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    link_gmaps: `https://www.google.com/maps?q=${lat},${lng}`,
                }));
                toast.success('Koordinat GPS saat ini berhasil diambil!');
            },
            () => {
                toast.error('Gagal mengambil lokasi GPS. Pastikan izin lokasi browser aktif.');
            }
        );
    };

    const handleSubmitGedung = async (e) => {
        e.preventDefault();
        if (!editingGedung && !gedungFotoFile) {
            toast.warning('Foto tampak depan gedung wajib diunggah.');
            return;
        }

        setSubmittingGedung(true);
        try {
            const formData = new FormData();
            if (gedungForm.cabang_id) formData.append('cabang_id', gedungForm.cabang_id);
            formData.append('nama_gedung', gedungForm.nama_gedung);
            formData.append('jumlah_lantai', gedungForm.jumlah_lantai);
            formData.append('alamat', gedungForm.alamat);
            if (gedungForm.latitude !== null && gedungForm.latitude !== undefined) formData.append('latitude', gedungForm.latitude);
            if (gedungForm.longitude !== null && gedungForm.longitude !== undefined) formData.append('longitude', gedungForm.longitude);
            if (gedungForm.link_gmaps) formData.append('link_gmaps', gedungForm.link_gmaps);
            if (gedungFotoFile) formData.append('foto', gedungFotoFile);

            if (editingGedung) {
                formData.append('_method', 'PUT');
                await api.post(`/admin/gedung/${editingGedung.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Data gedung & lokasi Google Maps berhasil diperbarui!');
            } else {
                await api.post('/admin/gedung', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Gedung baru beserta foto & lokasi berhasil ditambahkan!');
            }
            setGedungModalOpen(false);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan gedung.');
        } finally {
            setSubmittingGedung(false);
        }
    };

    const handleConfirmDeleteGedung = async () => {
        if (!deleteGedungTarget) return;
        setDeletingGedung(true);
        try {
            await api.delete(`/admin/gedung/${deleteGedungTarget.id}`);
            toast.success('Gedung berhasil dihapus.');
            setDeleteGedungTarget(null);
            fetchData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menghapus gedung.');
        } finally {
            setDeletingGedung(false);
        }
    };

    // Color mapper for room status
    const getStatusStyle = (status) => {
        switch (status) {
            case 'kosong':
                return {
                    bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-300 text-emerald-800',
                    dot: 'bg-emerald-500',
                    tag: 'bg-emerald-100 text-emerald-800',
                    badge: 'Tersedia',
                };
            case 'terisi':
                return {
                    bg: 'bg-blue-50 hover:bg-blue-100/80 border-blue-300 text-[#1E5FC9]',
                    dot: 'bg-[#1E5FC9]',
                    tag: 'bg-blue-100 text-[#1E5FC9]',
                    badge: 'Terisi',
                };
            case 'dibooking':
                return {
                    bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 text-amber-800',
                    dot: 'bg-amber-500',
                    tag: 'bg-amber-100 text-amber-800',
                    badge: 'Dibooking',
                };
            case 'maintenance':
                return {
                    bg: 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700',
                    dot: 'bg-slate-500',
                    tag: 'bg-slate-200 text-slate-700',
                    badge: 'Maintenance',
                };
            default:
                return {
                    bg: 'bg-slate-50 border-slate-200 text-slate-800',
                    dot: 'bg-slate-400',
                    tag: 'bg-slate-100 text-slate-700',
                    badge: status,
                };
        }
    };

    // Group rooms by gedung and then by lantai
    const groupedRooms = gedungs.map((gedung) => {
        const roomsInGedung = kamars.filter((k) => k.gedung_id === gedung.id);
        const floors = {};
        for (let l = 1; l <= gedung.jumlah_lantai; l++) {
            floors[l] = roomsInGedung.filter((k) => k.lantai === l);
        }
        return {
            gedung,
            floors,
            totalRooms: roomsInGedung.length,
        };
    });

    // Selected gedung inside Add/Edit Kamar Modal to preview its address
    const selectedGedungForKamar = gedungs.find((g) => Number(g.id) === Number(kamarForm.gedung_id));

    return (
        <AdminLayout
            title="Kamar & Gedung"
            subtitle="Tata letak visual denah kamar, status okupansi real-time, serta manajemen gedung & titik lokasi Google Maps."
        >
            {/* Top Switcher: Denah Kamar vs Pengaturan Cabang */}
            <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl mb-6 self-start w-fit">
                <button
                    type="button"
                    onClick={() => setActiveSection('kamar_gedung')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition cursor-pointer ${
                        activeSection === 'kamar_gedung'
                            ? 'bg-white text-slate-800 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                    }`}
                >
                    🏢 Denah Kamar & Gedung
                </button>
                <button
                    type="button"
                    onClick={() => setActiveSection('pengaturan_cabang')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                        activeSection === 'pengaturan_cabang'
                            ? 'bg-white text-[#1E5FC9] shadow-sm'
                            : 'text-slate-500 hover:text-[#1E5FC9]'
                    }`}
                >
                    <span>⚙️ Pengaturan Cabang & Rekening</span>
                </button>
            </div>

            {activeSection === 'pengaturan_cabang' ? (
                <CabangSettingsTab />
            ) : (
                <>
                    {/* Top Stat Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mb-6">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                    <span className="text-xs text-slate-500 font-medium block">Total Kamar</span>
                    <span className="text-2xl font-bold text-slate-800 mt-1 block">{counts.total}</span>
                </div>
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
                    <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Kosong
                    </span>
                    <span className="text-2xl font-bold text-emerald-800 mt-1 block">{counts.kosong}</span>
                </div>
                <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-sm">
                    <span className="text-xs text-rose-700 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" /> Terisi
                    </span>
                    <span className="text-2xl font-bold text-rose-800 mt-1 block">{counts.terisi}</span>
                </div>
                <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-sm">
                    <span className="text-xs text-amber-700 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500" /> Dibooking
                    </span>
                    <span className="text-2xl font-bold text-amber-800 mt-1 block">{counts.dibooking}</span>
                </div>
                <div className="bg-slate-100/80 p-4 rounded-2xl border border-slate-300 shadow-sm">
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-500" /> Maintenance
                    </span>
                    <span className="text-2xl font-bold text-slate-700 mt-1 block">{counts.maintenance}</span>
                </div>
            </div>

            {/* Filter bar & Actions */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex flex-wrap items-center gap-3">
                    <input
                        type="text"
                        placeholder="Cari kamar, gedung, daerah..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#263b53] w-64"
                    />

                    <select
                        value={filterGedung}
                        onChange={(e) => setFilterGedung(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none bg-white text-slate-700"
                    >
                        <option value="">Semua Gedung</option>
                        {gedungs.map((g) => (
                            <option key={g.id} value={g.id}>
                                {g.nama_gedung}
                            </option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none bg-white text-slate-700"
                    >
                        <option value="all">Semua Status</option>
                        <option value="kosong">Kosong (Tersedia)</option>
                        <option value="terisi">Terisi</option>
                        <option value="dibooking">Dibooking</option>
                        <option value="maintenance">Maintenance</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={handleOpenAddGedung}
                        className="px-3.5 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                    >
                        + Gedung Baru
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenAddBulk}
                        className="px-3.5 py-2 text-sm font-semibold text-[#1E5FC9] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                    >
                        <span>⚡</span>
                        <span>+ Tambah Massal</span>
                    </button>
                    <button
                        type="button"
                        onClick={handleOpenAddKamar}
                        className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm transition cursor-pointer"
                    >
                        + Tambah Kamar
                    </button>
                </div>
            </div>

            {/* Visual Grid Layout */}
            {loading ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                    <div className="w-8 h-8 border-4 border-[#263b53] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Memuat denah visual kamar & gedung...
                </div>
            ) : groupedRooms.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
                    Belum ada gedung atau kamar yang terdaftar. Silakan klik "+ Tambah Gedung" untuk mulai menambahkan.
                </div>
            ) : (
                <div id="gedung-section" className="space-y-6">
                    {groupedRooms.map(({ gedung, floors, totalRooms }) => {
                        const alamatGedung = gedung.alamat || gedung.cabang?.alamat || 'Alamat belum diatur';
                        const lat = gedung.latitude ?? gedung.cabang?.latitude;
                        const lng = gedung.longitude ?? gedung.cabang?.longitude;
                        const gmapsQuery = lat && lng ? `${lat},${lng}` : encodeURIComponent(alamatGedung);
                        const gmapsExternalUrl =
                            gedung.link_gmaps || `https://www.google.com/maps/search/?api=1&query=${gmapsQuery}`;
                        const isMapExpanded = expandedMapsGedungId === gedung.id;

                        return (
                            <div key={gedung.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                                <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-slate-100 pb-4 mb-4 gap-4">
                                    <div className="flex items-start gap-4">
                                        {gedung.url_foto || gedung.foto ? (
                                            <img
                                                src={gedung.url_foto || gedung.foto}
                                                alt={gedung.nama_gedung}
                                                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shadow-sm shrink-0"
                                            />
                                        ) : (
                                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center text-slate-400 text-xs shrink-0 font-bold">
                                                <span className="text-xl">🏢</span>
                                                <span className="text-[10px] text-slate-400">Gedung</span>
                                            </div>
                                        )}
                                        <div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h3 className="text-lg font-bold text-[#263b53]">{gedung.nama_gedung}</h3>
                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                                                    {totalRooms} kamar
                                                </span>
                                                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-[#263b53] font-semibold">
                                                    {gedung.jumlah_lantai} Lantai
                                                </span>
                                            </div>

                                            {/* Alamat Gedung & Koordinat */}
                                            <div className="flex items-start gap-1.5 mt-2 text-xs text-slate-600">
                                                <svg
                                                    className="w-4 h-4 text-rose-500 shrink-0 mt-0.5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                                                    />
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                                                    />
                                                </svg>
                                                <div>
                                                    <span className="font-medium text-slate-700">{alamatGedung}</span>
                                                    {lat && lng && (
                                                        <span className="ml-2 text-[11px] text-slate-400">
                                                            ({Number(lat).toFixed(5)}, {Number(lng).toFixed(5)})
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Gedung Action Buttons (Maps, Edit, Delete) */}
                                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setExpandedMapsGedungId(isMapExpanded ? null : gedung.id)
                                            }
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition flex items-center gap-1.5 cursor-pointer ${
                                                isMapExpanded
                                                    ? 'bg-[#263b53] text-white border-[#263b53]'
                                                    : 'bg-blue-50/70 text-[#263b53] border-blue-200 hover:bg-blue-100/70'
                                            }`}
                                        >
                                            <svg
                                                className="w-3.5 h-3.5"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z"
                                                />
                                            </svg>
                                            {isMapExpanded ? 'Tutup Maps' : 'Lihat Maps'}
                                        </button>

                                        <a
                                            href={gmapsExternalUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1"
                                        >
                                            Google Maps ↗
                                        </a>

                                        <button
                                            type="button"
                                            onClick={() => handleOpenEditGedung(gedung)}
                                            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                                        >
                                            Edit Gedung & Alamat
                                        </button>

                                        <button
                                            type="button"
                                            onClick={() => setDeleteGedungTarget(gedung)}
                                            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                                            title="Hapus Seluruh Gedung Beserta Lokasinya"
                                        >
                                            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                            <span>Hapus Gedung</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Expandable Maps for this Gedung */}
                                {isMapExpanded && (
                                    <div className="mb-5 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50">
                                        <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs">
                                            <span className="font-semibold text-[#263b53]">
                                                📍 Peta Lokasi {gedung.nama_gedung} — {alamatGedung}
                                            </span>
                                            <a
                                                href={gmapsExternalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="font-bold text-blue-600 hover:underline"
                                            >
                                                Buka Penuh di Google Maps &rarr;
                                            </a>
                                        </div>
                                        <div className="p-3 bg-white">
                                            <LeafletMapPicker
                                                latitude={lat ? Number(lat) : -6.8869}
                                                longitude={lng ? Number(lng) : 107.5356}
                                                interactive={false}
                                                height="260px"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Floors Stack */}
                                <div className="space-y-5">
                                    {Object.entries(floors).map(([lantaiNum, rooms]) => (
                                        <div
                                            key={lantaiNum}
                                            className="p-4 bg-slate-50/70 rounded-xl border border-slate-200/60"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                                    Lantai {lantaiNum} ({rooms.length} kamar)
                                                </span>
                                            </div>

                                            {rooms.length === 0 ? (
                                                <div className="text-xs text-slate-400 italic py-2">
                                                    Belum ada kamar di lantai ini.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                                                    {rooms.map((k) => {
                                                        const style = getStatusStyle(k.status);
                                                        const canToggle = ['kosong', 'maintenance'].includes(k.status);
                                                        return (
                                                            <div
                                                                key={k.id}
                                                                onClick={() => {
                                                                    setSelectedKamar(k);
                                                                    setDetailModalOpen(true);
                                                                }}
                                                                className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between ${style.bg}`}
                                                            >
                                                                <div>
                                                                    <div className="flex items-start justify-between mb-1.5">
                                                                        <span className="font-bold text-sm tracking-tight">
                                                                            {k.nomor_kamar}
                                                                        </span>
                                                                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                                                    </div>
                                                                    <div className="text-[10px] font-semibold opacity-90">
                                                                        {style.badge}
                                                                    </div>
                                                                    <div className="text-[11px] font-semibold mt-0.5">
                                                                        Rp {Number(k.harga_bulanan / 1000).toLocaleString('id-ID')}rb
                                                                    </div>
                                                                </div>

                                                                {/* Toggle Tersedia / Maintenance & Delete Kamar */}
                                                                <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-black/5">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[9px] font-semibold uppercase tracking-wider opacity-70">
                                                                            {k.status === 'kosong' ? 'Aktif' : k.status === 'maintenance' ? 'Perbaikan' : 'Terkunci'}
                                                                        </span>
                                                                        {k.status !== 'terisi' && (
                                                                            <button
                                                                                type="button"
                                                                                title={`Hapus Kamar ${k.nomor_kamar}`}
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setDeleteKamarTarget(k);
                                                                                }}
                                                                                className="p-1 rounded-md text-rose-500 hover:text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                                                                            >
                                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                                </svg>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                    {canToggle ? (
                                                                        <button
                                                                            type="button"
                                                                            title={`Klik untuk ubah ke ${k.status === 'kosong' ? 'Maintenance' : 'Kosong (Tersedia)'}`}
                                                                            onClick={(e) => handleToggleKamarAvailability(k, e)}
                                                                            className={`w-7 h-4 rounded-full transition-colors p-0.5 flex items-center cursor-pointer ${
                                                                                k.status === 'kosong' ? 'bg-emerald-600 justify-end' : 'bg-slate-400 justify-start'
                                                                            }`}
                                                                        >
                                                                            <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-[10px]" title="Kamar sedang terisi atau dibooking (status terkunci)">
                                                                            🔒
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
                </>
            )}

            {/* DETAIL MODAL KAMAR */}
            {selectedKamar && (
                <Modal
                    isOpen={detailModalOpen}
                    onClose={() => setDetailModalOpen(false)}
                    title={`Detail Kamar ${selectedKamar.nomor_kamar}`}
                    maxWidth="max-w-md"
                    footer={
                        <div className="flex items-center justify-between w-full">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setDetailModalOpen(false);
                                        handleOpenEditKamar(selectedKamar);
                                    }}
                                    className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                                >
                                    Edit Kamar
                                </button>
                                {selectedKamar.status !== 'terisi' && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const target = selectedKamar;
                                            setDetailModalOpen(false);
                                            setDeleteKamarTarget(target);
                                        }}
                                        className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer"
                                    >
                                        Hapus Kamar Ini
                                    </button>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => setDetailModalOpen(false)}
                                className="px-4 py-2 text-xs font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl cursor-pointer"
                            >
                                Tutup
                            </button>
                        </div>
                    }
                >
                    <div className="space-y-4">
                        {/* Foto Kamar */}
                        {selectedKamar.kamar_foto && selectedKamar.kamar_foto.length > 0 && (
                            <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                                <img
                                    src={selectedKamar.kamar_foto[0].url_foto}
                                    alt={`Foto Kamar ${selectedKamar.nomor_kamar}`}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                            <div>
                                <span className="text-xs text-slate-400 block mb-0.5">Status Saat Ini</span>
                                <StatusBadge status={selectedKamar.status} />
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-slate-400 block mb-0.5">Tarif Sewa</span>
                                <span className="font-bold text-[#263b53] text-sm">
                                    Rp {Number(selectedKamar.harga_bulanan).toLocaleString('id-ID')} / bln
                                </span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div className="p-3 bg-slate-50/70 rounded-xl">
                                <span className="text-xs text-slate-400 block">Gedung & Lantai</span>
                                <strong className="text-slate-800">
                                    {selectedKamar.gedung?.nama_gedung} (Lt. {selectedKamar.lantai})
                                </strong>
                            </div>
                            <div className="p-3 bg-slate-50/70 rounded-xl">
                                <span className="text-xs text-slate-400 block">Kapasitas</span>
                                <strong className="text-slate-800">
                                    1 Orang / Kamar
                                </strong>
                            </div>
                        </div>

                        {/* Alamat Gedung tempat kamar berada */}
                        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-xs">
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-semibold text-[#263b53]">
                                    📍 Lokasi Gedung ({selectedKamar.gedung?.nama_gedung}):
                                </span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const g = gedungs.find((gd) => gd.id === selectedKamar.gedung_id);
                                        if (g) {
                                            setDetailModalOpen(false);
                                            handleOpenEditGedung(g);
                                        }
                                    }}
                                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                                >
                                    Ubah Alamat Gedung
                                </button>
                            </div>
                            <p className="text-slate-600">
                                {selectedKamar.gedung?.alamat ||
                                    selectedKamar.gedung?.cabang?.alamat ||
                                    'Alamat gedung belum diisi'}
                            </p>
                        </div>

                        {selectedKamar.penghuni && selectedKamar.penghuni.user && (
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-sm">
                                <span className="text-xs font-semibold text-[#1E5FC9] block mb-1">Penghuni Aktif:</span>
                                <strong className="text-slate-800">{selectedKamar.penghuni.user?.nama || selectedKamar.penghuni.user?.name}</strong>
                                <div className="text-xs text-slate-500 mt-0.5">
                                    {selectedKamar.penghuni.user?.no_hp || '-'} • Masuk sejak:{' '}
                                    {selectedKamar.penghuni.tanggal_masuk}
                                </div>
                            </div>
                        )}

                        {selectedKamar.deskripsi && (
                            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                                <span className="font-medium text-slate-400 block mb-1">Deskripsi Fasilitas Kamar:</span>
                                {selectedKamar.deskripsi}
                            </div>
                        )}

                        {/* Toggle Ketersediaan Kamar (Kosong <-> Maintenance) */}
                        <div className="pt-3 border-t border-slate-100">
                            <span className="text-xs font-semibold text-slate-700 block mb-2">
                                Kontrol Ketersediaan Kamar (Kosong ⟷ Maintenance):
                            </span>
                            {['terisi', 'dibooking'].includes(selectedKamar.status) ? (
                                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                                    <span className="text-base">🔒</span>
                                    <span>
                                        Kamar ini sedang <strong>{selectedKamar.status}</strong>. Status kamar tidak dapat di-toggle secara manual karena terikat kontrak sewa / booking aktif.
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    <div>
                                        <div className="text-xs font-bold text-slate-800">
                                            {selectedKamar.status === 'kosong' ? 'Tersedia untuk Booking (Kosong)' : 'Sedang Perbaikan (Maintenance)'}
                                        </div>
                                        <div className="text-[11px] text-slate-500">
                                            {selectedKamar.status === 'kosong'
                                                ? 'Calon penghuni dapat melihat dan membooking kamar ini.'
                                                : 'Kamar disembunyikan dari pemesanan publik selama maintenance.'}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleKamarAvailability(selectedKamar)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer shadow-sm ${
                                            selectedKamar.status === 'kosong'
                                                ? 'bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-300'
                                                : 'bg-emerald-600 text-white hover:bg-emerald-700'
                                        }`}
                                    >
                                        {selectedKamar.status === 'kosong' ? 'Set Maintenance' : 'Set Tersedia'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* ADD/EDIT KAMAR MODAL */}
            <Modal
                isOpen={kamarModalOpen}
                onClose={() => setKamarModalOpen(false)}
                title={editingKamar ? `Edit Kamar ${editingKamar.nomor_kamar}` : 'Tambah Kamar Baru'}
                maxWidth="max-w-md"
            >
                <form onSubmit={handleSubmitKamar} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Gedung</label>
                        <select
                            required
                            value={kamarForm.gedung_id}
                            onChange={(e) => setKamarForm({ ...kamarForm, gedung_id: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        >
                            <option value="">Pilih Gedung</option>
                            {gedungs.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.nama_gedung}
                                </option>
                            ))}
                        </select>
                        {selectedGedungForKamar && (
                            <p className="text-[11px] text-slate-500 mt-1">
                                📍 Alamat Gedung:{' '}
                                <span className="font-medium text-slate-700">
                                    {selectedGedungForKamar.alamat ||
                                        selectedGedungForKamar.cabang?.alamat ||
                                        'Belum diatur'}
                                </span>
                            </p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Kamar</label>
                            <input
                                type="text"
                                required
                                placeholder="Contoh: A-101"
                                value={kamarForm.nomor_kamar}
                                onChange={(e) => setKamarForm({ ...kamarForm, nomor_kamar: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Lantai</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max={selectedGedungForKamar?.jumlah_lantai || 20}
                                value={kamarForm.lantai}
                                onChange={(e) => setKamarForm({ ...kamarForm, lantai: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Bulanan (Rp)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="10000"
                                value={kamarForm.harga_bulanan}
                                onChange={(e) =>
                                    setKamarForm({ ...kamarForm, harga_bulanan: parseFloat(e.target.value) || 0 })
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Status Awal</label>
                            <select
                                value={kamarForm.status}
                                onChange={(e) => setKamarForm({ ...kamarForm, status: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                            >
                                <option value="kosong">Kosong</option>
                                <option value="terisi">Terisi</option>
                                <option value="dibooking">Dibooking</option>
                                <option value="maintenance">Maintenance</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Tambahan</label>
                        <textarea
                            rows={2}
                            placeholder="Catatan fasilitas khusus (AC, kamar mandi dalam, balkon)..."
                            value={kamarForm.deskripsi}
                            onChange={(e) => setKamarForm({ ...kamarForm, deskripsi: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    {/* Foto Kamar (Wajib untuk input baru) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Foto Kamar Kost {!editingKamar && <span className="text-rose-500">* (Wajib)</span>}
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            required={!editingKamar && !kamarFotoPreview}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setKamarFotoFile(file);
                                    setKamarFotoPreview(URL.createObjectURL(file));
                                }
                            }}
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1E5FC9] hover:file:bg-blue-100 cursor-pointer"
                        />
                        {kamarFotoPreview && (
                            <div className="mt-2 relative w-36 h-24 rounded-xl overflow-hidden border border-slate-200">
                                <img src={kamarFotoPreview} alt="preview kamar" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setKamarFotoFile(null);
                                        setKamarFotoPreview(null);
                                    }}
                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] cursor-pointer"
                                    title="Hapus foto"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                            Format JPG, PNG, WEBP. Maks 5 MB. Foto akan tampil di halaman detail kamar pemesan.
                        </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setKamarModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingKamar}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                        >
                            {submittingKamar ? 'Menyimpan...' : 'Simpan Kamar'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* TAMBAH KAMAR MASSAL (BULK) PER LANTAI */}
            <Modal
                isOpen={bulkModalOpen}
                onClose={() => setBulkModalOpen(false)}
                title="⚡ Tambah Kamar Massal Otomatis per Lantai"
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmitBulk} className="space-y-4">
                    <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                        <p className="font-bold flex items-center gap-1.5 mb-1">
                            <span>💡</span>
                            <span>Sistem Penomoran Kamar Otomatis:</span>
                        </p>
                        <p className="text-[11px] text-blue-800">
                            Sistem akan otomatis menghasilkan nomor kamar sesuai lantai (contoh: Lantai 2 &rarr; 201, 202, 203, dst) dan melewati nomor yang sudah terdaftar.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Gedung</label>
                        <select
                            required
                            value={bulkForm.gedung_id}
                            onChange={(e) => setBulkForm({ ...bulkForm, gedung_id: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl bg-white"
                        >
                            <option value="">Pilih Gedung</option>
                            {gedungs.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.nama_gedung} ({g.jumlah_lantai} Lantai)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Pilih Lantai</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max={gedungs.find((g) => g.id === parseInt(bulkForm.gedung_id))?.jumlah_lantai || 20}
                                value={bulkForm.lantai}
                                onChange={(e) => setBulkForm({ ...bulkForm, lantai: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Kamar</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="50"
                                value={bulkForm.jumlah_kamar}
                                onChange={(e) => setBulkForm({ ...bulkForm, jumlah_kamar: parseInt(e.target.value) || 1 })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Live Preview Nomor Kamar yang akan dibuat */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                            Preview Nomor Kamar yang Akan Dibuat:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: Math.min(bulkForm.jumlah_kamar || 1, 15) }, (_, i) => {
                                const num = (bulkForm.lantai * 100) + (i + 1);
                                return (
                                    <span key={num} className="px-2 py-0.5 rounded-md text-xs font-bold bg-[#263b53] text-white">
                                        {num}
                                    </span>
                                );
                            })}
                            {(bulkForm.jumlah_kamar || 1) > 15 && (
                                <span className="text-xs text-slate-500 font-semibold self-center">
                                    ...dan {bulkForm.jumlah_kamar - 15} kamar lainnya
                                </span>
                            )}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Harga Bulanan Semua Kamar (Rp)</label>
                        <input
                            type="number"
                            required
                            min="0"
                            step="10000"
                            value={bulkForm.harga_bulanan}
                            onChange={(e) => setBulkForm({ ...bulkForm, harga_bulanan: parseFloat(e.target.value) || 0 })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Fasilitas (Sama untuk batch ini)</label>
                        <textarea
                            rows={2}
                            placeholder="Contoh: Kamar Mandi Dalam, Kasur Busa, Jendela Menghadap Taman..."
                            value={bulkForm.deskripsi}
                            onChange={(e) => setBulkForm({ ...bulkForm, deskripsi: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    {/* Foto Kamar Massal */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Foto Kamar (Wajib • Digunakan untuk seluruh kamar batch ini) <span className="text-rose-500">*</span>
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            required
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setBulkFotoFile(file);
                                    setBulkFotoPreview(URL.createObjectURL(file));
                                }
                            }}
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1E5FC9] hover:file:bg-blue-100 cursor-pointer"
                        />
                        {bulkFotoPreview && (
                            <div className="mt-2 relative w-36 h-24 rounded-xl overflow-hidden border border-slate-200">
                                <img src={bulkFotoPreview} alt="preview kamar massal" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBulkFotoFile(null);
                                        setBulkFotoPreview(null);
                                    }}
                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] cursor-pointer"
                                    title="Hapus foto"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setBulkModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingBulk}
                            className="px-5 py-2 text-sm font-semibold text-white bg-[#1E5FC9] hover:bg-[#184ea8] rounded-xl shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-2"
                        >
                            {submittingBulk ? 'Menambahkan Massal...' : `Buat ${bulkForm.jumlah_kamar} Kamar Sekaligus`}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ADD/EDIT GEDUNG MODAL (WITH PHOTO, ADDRESS & GOOGLE MAPS PICKER/PREVIEW) */}
            <Modal
                isOpen={gedungModalOpen}
                onClose={() => setGedungModalOpen(false)}
                title={editingGedung ? `Edit Gedung & Lokasi — ${editingGedung.nama_gedung}` : 'Tambah Gedung Baru & Lokasi Maps'}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSubmitGedung} className="space-y-4">
                    {/* Foto Gedung */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Foto Gedung Kost (Tampak Depan) {!editingGedung && <span className="text-rose-500">* (Wajib)</span>}
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            required={!editingGedung && !gedungFotoPreview}
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file) {
                                    setGedungFotoFile(file);
                                    setGedungFotoPreview(URL.createObjectURL(file));
                                }
                            }}
                            className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#1E5FC9] hover:file:bg-blue-100 cursor-pointer"
                        />
                        {gedungFotoPreview && (
                            <div className="mt-2 relative w-44 h-28 rounded-xl overflow-hidden border border-slate-200">
                                <img src={gedungFotoPreview} alt="preview gedung" className="w-full h-full object-cover" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        setGedungFotoFile(null);
                                        setGedungFotoPreview(null);
                                    }}
                                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] cursor-pointer"
                                    title="Hapus foto"
                                >
                                    ✕
                                </button>
                            </div>
                        )}
                        <p className="text-[11px] text-slate-400 mt-1">
                            Foto ini akan ditampilkan di kartu Gedung Kost pada halaman depan (Landing Page).
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Gedung</label>
                            <input
                                type="text"
                                required
                                placeholder="Contoh: Gedung A (Putra)"
                                value={gedungForm.nama_gedung}
                                onChange={(e) => setGedungForm({ ...gedungForm, nama_gedung: e.target.value })}
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Jumlah Lantai</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="20"
                                value={gedungForm.jumlah_lantai}
                                onChange={(e) =>
                                    setGedungForm({ ...gedungForm, jumlah_lantai: parseInt(e.target.value) || 1 })
                                }
                                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Alamat Lengkap Gedung */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Alamat Lengkap Gedung <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                            rows={2}
                            required
                            placeholder="Contoh: Jl. Terusan Jenderal Sudirman No. 14, Baros, Kota Cimahi, Jawa Barat"
                            value={gedungForm.alamat}
                            onChange={(e) => setGedungForm({ ...gedungForm, alamat: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
                    </div>

                    {/* Pencarian & Pilih Titik Google Maps */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#263b53] uppercase tracking-wider flex items-center gap-1.5">
                                <span>📍</span>
                                <span>Titik Lokasi & Koordinat Google Maps</span>
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleUseCurrentGPS}
                                    className="px-2.5 py-1 text-xs font-semibold text-[#263b53] bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
                                    title="Gunakan posisi GPS perangkat saat ini"
                                >
                                    🎯 Gunakan GPS Saya
                                </button>
                                <a
                                    href={`https://www.google.com/maps?q=${gedungForm.latitude},${gedungForm.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1"
                                >
                                    <span>Buka Google Maps ↗</span>
                                </a>
                            </div>
                        </div>

                        {/* Petunjuk Pengambilan Titik Google Maps */}
                        <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                            <p className="font-bold flex items-center gap-1 mb-1">
                                <span>💡</span>
                                <span>Cara Mudah Mengambil Titik dari Google Maps:</span>
                            </p>
                            <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-blue-800">
                                <li>
                                    Buka <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="font-bold underline text-blue-700">Google Maps ↗</a> di tab baru dan cari area kost Anda.
                                </li>
                                <li>
                                    <strong>Klik kanan</strong> tepat di atap gedung kost &rarr; <strong>klik angka koordinat</strong> di baris teratas (contoh: <code className="bg-white/80 px-1 py-0.2 rounded font-mono">-6.8869, 107.5356</code>).
                                </li>
                                <li>
                                    <strong>Tempel (Paste)</strong> koordinat atau link Google Maps di kotak di bawah ini, atau langsung ke kolom Latitude/Longitude.
                                </li>
                            </ol>
                        </div>

                        {/* Search / Paste URL or Coords Box */}
                        <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                Tempel Link Google Maps, Koordinat, atau Cari Patokan Jalan:
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Tempel link https://maps.app.goo.gl/... ATAU koordinat -6.8869, 107.5356 ATAU nama jalan..."
                                    value={mapSearchQuery}
                                    onChange={(e) => setMapSearchQuery(e.target.value)}
                                    onPaste={(e) => {
                                        const pasted = e.clipboardData.getData('text');
                                        if (pasted) {
                                            setMapSearchQuery(pasted);
                                            setTimeout(() => handleResolveLocation(pasted), 50);
                                        }
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleResolveLocation();
                                        }
                                    }}
                                    className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => handleResolveLocation()}
                                    disabled={searchingMap}
                                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl transition shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {searchingMap ? (
                                        <>
                                            <span className="animate-spin inline-block">⏳</span>
                                            <span>Mendeteksi...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>🔍</span>
                                            <span>Terapkan Titik</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Direct Coordinate inputs (with smart onPaste) */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[11px] font-semibold text-slate-600">Latitude</label>
                                    <span className="text-[10px] text-slate-400">Bisa paste &quot;lat, lng&quot;</span>
                                </div>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={gedungForm.latitude}
                                    onPaste={handleCoordinatePaste}
                                    onChange={(e) =>
                                        setGedungForm({
                                            ...gedungForm,
                                            latitude: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0),
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    placeholder="-6.8869"
                                />
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="block text-[11px] font-semibold text-slate-600">Longitude</label>
                                    <span className="text-[10px] text-slate-400">Bisa paste &quot;lat, lng&quot;</span>
                                </div>
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    value={gedungForm.longitude}
                                    onPaste={handleCoordinatePaste}
                                    onChange={(e) =>
                                        setGedungForm({
                                            ...gedungForm,
                                            longitude: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0),
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    placeholder="107.5356"
                                />
                            </div>
                        </div>

                        {/* Link Google Maps custom / preview */}
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                Link Google Maps Gedung (otomatis tersinkronisasi):
                            </label>
                            <input
                                type="text"
                                placeholder="https://www.google.com/maps?q=-6.8869,107.5356"
                                value={gedungForm.link_gmaps}
                                onChange={(e) => handleGmapsLinkChange(e.target.value)}
                                className="w-full px-3 py-1.5 text-xs font-mono text-slate-600 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
                            />
                        </div>

                        {/* Interactive Leaflet Map (Pilih Titik di Maps) */}
                        <div className="rounded-xl overflow-hidden border border-slate-200">
                            <LeafletMapPicker
                                latitude={gedungForm.latitude}
                                longitude={gedungForm.longitude}
                                interactive={true}
                                height="260px"
                                onChange={({ lat, lng, address }) => {
                                    setGedungForm((prev) => ({
                                        ...prev,
                                        latitude: lat,
                                        longitude: lng,
                                        alamat: address ? address : prev.alamat,
                                        link_gmaps: `https://www.google.com/maps?q=${lat},${lng}`,
                                    }));
                                }}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={() => setGedungModalOpen(false)}
                            className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            disabled={submittingGedung}
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm cursor-pointer"
                        >
                            {submittingGedung ? 'Menyimpan...' : 'Simpan Gedung & Lokasi'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* CONFIRM DELETE KAMAR */}
            <ConfirmDialog
                isOpen={Boolean(deleteKamarTarget)}
                onClose={() => setDeleteKamarTarget(null)}
                onConfirm={handleConfirmDeleteKamar}
                title={`Hapus Kamar ${deleteKamarTarget?.nomor_kamar}`}
                message={`Apakah Anda yakin ingin menghapus Kamar ${deleteKamarTarget?.nomor_kamar}? Kamar ini akan dipindahkan ke menu "Baru Saja Dihapus". Gedung kost tidak akan terpengaruh.`}
                confirmText="Ya, Hapus Kamar Ini"
                isDanger={true}
                loading={deletingKamar}
            />

            {/* CONFIRM DELETE GEDUNG */}
            <ConfirmDialog
                isOpen={Boolean(deleteGedungTarget)}
                onClose={() => setDeleteGedungTarget(null)}
                onConfirm={handleConfirmDeleteGedung}
                title={`Hapus Gedung: ${deleteGedungTarget?.nama_gedung}`}
                message={`PERINGATAN: Anda akan menghapus GEDUNG "${deleteGedungTarget?.nama_gedung}". Tindakan ini BUKAN untuk menghapus kamar, melainkan menghapus seluruh bangunan gedung kost. Pastikan seluruh kamar di dalam gedung ini sudah kosong/dihapus terlebih dahulu.`}
                confirmText="Ya, Hapus Gedung Ini"
                isDanger={true}
                loading={deletingGedung}
            />
        </AdminLayout>
    );
}
