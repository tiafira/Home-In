import React, { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../Layouts/AdminLayout';
import Modal from '../../Components/UI/Modal';
import ConfirmDialog from '../../Components/UI/ConfirmDialog';
import StatusBadge from '../../Components/UI/StatusBadge';
import LeafletMapPicker from '../../Components/UI/LeafletMapPicker';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import api from '../../services/api';

/**
 * Helper to extract latitude & longitude from a Google Maps URL or "lat, lng" string
 */
function parseLatLngFromInput(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // 1. Direct "lat, lng" format e.g. "-6.8869, 107.5356"
    const directMatch = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
    if (directMatch) {
        return { lat: parseFloat(directMatch[1]), lng: parseFloat(directMatch[2]) };
    }

    // 2. Google Maps URL with @lat,lng e.g. https://www.google.com/maps/place/.../@-6.8869,107.5356,17z
    const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
        return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
    }

    // 3. Google Maps URL with ?q=lat,lng or &q=lat,lng or !3dlat!4dlng
    const qMatch = trimmed.match(/[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
        return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
    }

    const bangMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (bangMatch) {
        return { lat: parseFloat(bangMatch[1]), lng: parseFloat(bangMatch[2]) };
    }

    return null;
}

export default function KamarGedung() {
    const toast = useToast();
    const { activeBranchId } = useBranch();

    const [kamars, setKamars] = useState([]);
    const [gedungs, setGedungs] = useState([]);
    const [cabangs, setCabangs] = useState([]);
    const [counts, setCounts] = useState({ total: 0, kosong: 0, terisi: 0, dibooking: 0, maintenance: 0 });
    const [loading, setLoading] = useState(true);

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
    const [submittingKamar, setSubmittingKamar] = useState(false);

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
        setKamarModalOpen(true);
    };

    const handleSubmitKamar = async (e) => {
        e.preventDefault();
        setSubmittingKamar(true);
        try {
            if (editingKamar) {
                await api.put(`/admin/kamar/${editingKamar.id}`, kamarForm);
                toast.success('Data kamar berhasil diperbarui!');
            } else {
                await api.post('/admin/kamar', kamarForm);
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
            await api.post(`/admin/kamar/${kamarId}/status`, { status: newStatus });
            toast.success(`Status kamar diubah ke ${newStatus}.`);
            fetchData();
            if (selectedKamar && selectedKamar.id === kamarId) {
                setSelectedKamar((prev) => ({ ...prev, status: newStatus }));
            }
        } catch (err) {
            toast.error('Gagal mengubah status kamar.');
        }
    };

    const handleOpenAddGedung = () => {
        setEditingGedung(null);
        const defaultCabangId = activeBranchId || gedungs[0]?.cabang_id || cabangs[0]?.id || 1;
        const selectedCabang = cabangs.find((c) => Number(c.id) === Number(defaultCabangId));
        setGedungForm({
            cabang_id: defaultCabangId,
            nama_gedung: '',
            jumlah_lantai: 2,
            alamat: selectedCabang?.alamat || '',
            latitude: selectedCabang?.latitude ? Number(selectedCabang.latitude) : -6.8869,
            longitude: selectedCabang?.longitude ? Number(selectedCabang.longitude) : 107.5356,
            link_gmaps: '',
        });
        setMapSearchQuery('');
        setGedungModalOpen(true);
    };

    const handleOpenEditGedung = (gedung) => {
        setEditingGedung(gedung);
        const lat = gedung.latitude ?? gedung.cabang?.latitude ?? -6.8869;
        const lng = gedung.longitude ?? gedung.cabang?.longitude ?? 107.5356;
        setGedungForm({
            cabang_id: gedung.cabang_id,
            nama_gedung: gedung.nama_gedung || '',
            jumlah_lantai: gedung.jumlah_lantai || 2,
            alamat: gedung.alamat || gedung.cabang?.alamat || '',
            latitude: Number(lat),
            longitude: Number(lng),
            link_gmaps: gedung.link_gmaps || `https://www.google.com/maps?q=${lat},${lng}`,
        });
        setMapSearchQuery('');
        setGedungModalOpen(true);
    };

    const handleSearchLocationOnMap = async () => {
        const query = mapSearchQuery.trim() || gedungForm.alamat.trim();
        if (!query) {
            toast.warning('Masukkan nama jalan/lokasi atau alamat terlebih dahulu untuk mencari di peta.');
            return;
        }
        setSearchingMap(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=id`
            );
            const results = await response.json();
            if (results && results.length > 0) {
                const place = results[0];
                const lat = parseFloat(Number(place.lat).toFixed(7));
                const lng = parseFloat(Number(place.lon).toFixed(7));
                setGedungForm((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    alamat: prev.alamat || place.display_name,
                    link_gmaps: `https://www.google.com/maps?q=${lat},${lng}`,
                }));
                toast.success('Titik lokasi ditemukan di peta!');
            } else {
                toast.warning('Lokasi tidak ditemukan secara otomatis. Anda juga dapat menempelkan link Google Maps atau mengisi koordinat.');
            }
        } catch (e) {
            toast.error('Gagal mencari lokasi. Silakan tempel link Google Maps atau koordinat.');
        } finally {
            setSearchingMap(false);
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

    const handleGmapsLinkChange = (value) => {
        const parsed = parseLatLngFromInput(value);
        if (parsed) {
            setGedungForm((prev) => ({
                ...prev,
                link_gmaps: value,
                latitude: parsed.lat,
                longitude: parsed.lng,
            }));
            toast.info(`Koordinat terdeteksi dari link: ${parsed.lat}, ${parsed.lng}`);
        } else {
            setGedungForm((prev) => ({
                ...prev,
                link_gmaps: value,
            }));
        }
    };

    const handleSubmitGedung = async (e) => {
        e.preventDefault();
        setSubmittingGedung(true);
        try {
            if (editingGedung) {
                await api.put(`/admin/gedung/${editingGedung.id}`, gedungForm);
                toast.success('Data gedung & lokasi Google Maps berhasil diperbarui!');
            } else {
                await api.post('/admin/gedung', gedungForm);
                toast.success('Gedung baru beserta lokasi Google Maps berhasil ditambahkan!');
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
                };
            case 'terisi':
                return {
                    bg: 'bg-rose-50 hover:bg-rose-100/80 border-rose-300 text-rose-800',
                    dot: 'bg-rose-500',
                    tag: 'bg-rose-100 text-rose-800',
                };
            case 'dibooking':
                return {
                    bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-300 text-amber-800',
                    dot: 'bg-amber-500',
                    tag: 'bg-amber-100 text-amber-800',
                };
            case 'maintenance':
                return {
                    bg: 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700',
                    dot: 'bg-slate-500',
                    tag: 'bg-slate-200 text-slate-700',
                };
            default:
                return {
                    bg: 'bg-slate-50 border-slate-200 text-slate-800',
                    dot: 'bg-slate-400',
                    tag: 'bg-slate-100 text-slate-700',
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
                        placeholder="Cari nomor kamar..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="px-3 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#263b53] w-48"
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
                    Belum ada gedung atau kamar terdaftar pada cabang ini.
                </div>
            ) : (
                <div className="space-y-6">
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
                                <div className="flex flex-col md:flex-row md:items-start justify-between border-b border-slate-100 pb-4 mb-4 gap-3">
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
                                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition cursor-pointer"
                                            title="Hapus Gedung"
                                        >
                                            Hapus
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
                                                        return (
                                                            <div
                                                                key={k.id}
                                                                onClick={() => {
                                                                    setSelectedKamar(k);
                                                                    setDetailModalOpen(true);
                                                                }}
                                                                className={`p-3 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] shadow-sm flex flex-col justify-between ${style.bg}`}
                                                            >
                                                                <div className="flex items-start justify-between mb-1.5">
                                                                    <span className="font-bold text-sm tracking-tight">
                                                                        {k.nomor_kamar}
                                                                    </span>
                                                                    <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-[10px] font-medium opacity-80 capitalize">
                                                                        {k.status}
                                                                    </div>
                                                                    <div className="text-[11px] font-semibold mt-1">
                                                                        Rp {Number(k.harga_bulanan / 1000).toLocaleString('id-ID')}rb
                                                                    </div>
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
                                        onClick={() => setDeleteKamarTarget(selectedKamar)}
                                        className="px-3.5 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl cursor-pointer"
                                    >
                                        Hapus Kamar
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
                            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-sm">
                                <span className="text-xs font-semibold text-rose-700 block mb-1">Penghuni Aktif:</span>
                                <strong className="text-rose-900">{selectedKamar.penghuni.user.name}</strong>
                                <div className="text-xs text-rose-700 mt-0.5">
                                    {selectedKamar.penghuni.user.no_hp || '-'} • Masuk sejak:{' '}
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

                        {/* Quick Status Changer */}
                        <div className="pt-2 border-t border-slate-100">
                            <span className="text-xs font-semibold text-slate-700 block mb-2">
                                Ubah Cepat Status Kamar:
                            </span>
                            <div className="grid grid-cols-4 gap-2">
                                {['kosong', 'terisi', 'dibooking', 'maintenance'].map((st) => (
                                    <button
                                        key={st}
                                        type="button"
                                        disabled={selectedKamar.status === st}
                                        onClick={() => handleUpdateStatusKamar(selectedKamar.id, st)}
                                        className={`py-1.5 text-xs font-medium rounded-lg border transition capitalize cursor-pointer ${
                                            selectedKamar.status === st
                                                ? 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed'
                                                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
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
                            rows={3}
                            placeholder="Catatan fasilitas khusus (AC, kamar mandi dalam, balkon)..."
                            value={kamarForm.deskripsi}
                            onChange={(e) => setKamarForm({ ...kamarForm, deskripsi: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl"
                        />
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
                            className="px-4 py-2 text-sm font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl shadow-sm cursor-pointer"
                        >
                            {submittingKamar ? 'Menyimpan...' : 'Simpan Kamar'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ADD/EDIT GEDUNG MODAL (WITH ADDRESS & GOOGLE MAPS PICKER/PREVIEW) */}
            <Modal
                isOpen={gedungModalOpen}
                onClose={() => setGedungModalOpen(false)}
                title={editingGedung ? `Edit Gedung & Lokasi — ${editingGedung.nama_gedung}` : 'Tambah Gedung Baru & Lokasi Maps'}
                maxWidth="max-w-2xl"
            >
                <form onSubmit={handleSubmitGedung} className="space-y-4">
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
                            <span className="text-xs font-bold text-[#263b53] uppercase tracking-wider">
                                📍 Pilih Titik Lokasi di Maps (Klik Langsung Pada Peta)
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleUseCurrentGPS}
                                    className="px-2.5 py-1 text-xs font-semibold text-[#263b53] bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition cursor-pointer"
                                >
                                    🎯 Gunakan Lokasi Saya (GPS)
                                </button>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                                        gedungForm.alamat || `${gedungForm.latitude},${gedungForm.longitude}`
                                    )}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                                >
                                    Buka Google Maps ↗
                                </a>
                            </div>
                        </div>

                        {/* Search box to find place on map */}
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Ketik nama daerah / kampus / jalan (misal: Unjani Cimahi)..."
                                value={mapSearchQuery}
                                onChange={(e) => setMapSearchQuery(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        handleSearchLocationOnMap();
                                    }
                                }}
                                className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                            />
                            <button
                                type="button"
                                onClick={handleSearchLocationOnMap}
                                disabled={searchingMap}
                                className="px-3.5 py-2 text-xs font-semibold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl transition shrink-0 cursor-pointer"
                            >
                                {searchingMap ? 'Mencari...' : 'Cari di Peta'}
                            </button>
                        </div>

                        {/* Paste Google Maps Link or Lat,Lng */}
                        <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                Link Google Maps atau Koordinat (otomatis mendeteksi titik peta saat ditempel):
                            </label>
                            <input
                                type="text"
                                placeholder="Tempel link Google Maps (https://www.google.com/maps/@-6.88,107.53...) atau -6.8869, 107.5356"
                                value={gedungForm.link_gmaps}
                                onChange={(e) => handleGmapsLinkChange(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                            />
                        </div>

                        {/* Coordinate inputs */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Latitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={gedungForm.latitude}
                                    onChange={(e) =>
                                        setGedungForm({
                                            ...gedungForm,
                                            latitude: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Longitude</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={gedungForm.longitude}
                                    onChange={(e) =>
                                        setGedungForm({
                                            ...gedungForm,
                                            longitude: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-white"
                                />
                            </div>
                        </div>

                        {/* Interactive Leaflet Map (Pilih Titik di Maps) */}
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
                title="Hapus Kamar"
                message={`Apakah Anda yakin ingin menghapus Kamar ${deleteKamarTarget?.nomor_kamar}?`}
                confirmText="Ya, Hapus Kamar"
                variant="danger"
                loading={deletingKamar}
            />

            {/* CONFIRM DELETE GEDUNG */}
            <ConfirmDialog
                isOpen={Boolean(deleteGedungTarget)}
                onClose={() => setDeleteGedungTarget(null)}
                onConfirm={handleConfirmDeleteGedung}
                title="Hapus Gedung"
                message={`Apakah Anda yakin ingin menghapus ${deleteGedungTarget?.nama_gedung}? Pastikan seluruh kamar di dalam gedung ini sudah kosong/dihapus terlebih dahulu.`}
                confirmText="Ya, Hapus Gedung"
                variant="danger"
                loading={deletingGedung}
            />
        </AdminLayout>
    );
}
