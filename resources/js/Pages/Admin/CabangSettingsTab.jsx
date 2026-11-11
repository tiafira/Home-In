import React, { useState, useEffect, useCallback } from 'react';
import LeafletMapPicker from '../../Components/UI/LeafletMapPicker';
import { useToast } from '../../context/ToastContext';
import { useBranch } from '../../context/BranchContext';
import { parseLatLngFromInput } from '../../utils/geoUtils';
import api from '../../services/api';

export default function CabangSettingsTab() {
    const toast = useToast();
    const { isPemilik, branches: contextBranches } = useBranch();

    const [branches, setBranches] = useState([]);
    const [selectedCabangId, setSelectedCabangId] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingQr, setUploadingQr] = useState(false);

    const [form, setForm] = useState({
        nama_cabang: '',
        alamat: '',
        latitude: -6.2,
        longitude: 106.8,
        jam_operasional_mulai: '06:00',
        jam_operasional_selesai: '23:00',
        jam_malam: '23:00',
        nama_bank: '',
        no_rekening: '',
        nama_pemilik_rekening: '',
        qr_pembayaran: '',
        no_wa: '',
        email_cabang: '',
    });

    const [mapSearchQuery, setMapSearchQuery] = useState('');
    const [searchingMap, setSearchingMap] = useState(false);

    // Fetch branches from admin endpoint
    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/cabang');
            if (res.data.status === 'success') {
                const list = res.data.data || [];
                setBranches(list);
                if (list.length > 0) {
                    const initialId = selectedCabangId || String(list[0].id);
                    setSelectedCabangId(initialId);
                    loadBranchDetails(initialId, list);
                }
            }
        } catch (err) {
            toast.error('Gagal memuat daftar cabang.');
        } finally {
            setLoading(false);
        }
    }, [selectedCabangId, toast]);

    useEffect(() => {
        fetchBranches();
    }, []);

    const loadBranchDetails = (branchId, branchList = branches) => {
        const found = branchList.find((b) => String(b.id) === String(branchId));
        if (found) {
            setForm({
                nama_cabang: found.nama_cabang || '',
                alamat: found.alamat || '',
                latitude: found.latitude ? parseFloat(found.latitude) : -6.2,
                longitude: found.longitude ? parseFloat(found.longitude) : 106.8,
                jam_operasional_mulai: found.jam_operasional_mulai || '06:00',
                jam_operasional_selesai: found.jam_operasional_selesai || '23:00',
                jam_malam: found.jam_malam || '23:00',
                nama_bank: found.nama_bank || '',
                no_rekening: found.no_rekening || '',
                nama_pemilik_rekening: found.nama_pemilik_rekening || '',
                qr_pembayaran: found.qr_pembayaran || '',
                no_wa: found.no_wa || '',
                email_cabang: found.email_cabang || '',
            });
        }
    };

    const handleBranchChange = (e) => {
        const id = e.target.value;
        setSelectedCabangId(id);
        loadBranchDetails(id);
    };

    const handleLocationSelect = ({ lat, lng }) => {
        setForm((prev) => ({
            ...prev,
            latitude: parseFloat(Number(lat).toFixed(6)),
            longitude: parseFloat(Number(lng).toFixed(6)),
        }));
    };

    const handleResolveLocation = async (rawInput) => {
        const query = (rawInput ?? mapSearchQuery ?? form.alamat ?? '').trim();
        if (!query) {
            toast.warning('Masukkan link Google Maps, koordinat, atau nama tempat terlebih dahulu.');
            return;
        }

        // 1. First attempt: instant client-side parse
        const clientParsed = parseLatLngFromInput(query);
        if (clientParsed) {
            const { lat, lng } = clientParsed;
            setForm((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
            }));
            toast.success(`Titik koordinat berhasil dideteksi (${lat}, ${lng})!`);
            return;
        }

        // 2. Second attempt: server-side resolver
        setSearchingMap(true);
        try {
            const res = await api.post('/admin/gedung/resolve-location', { input: query });
            if (res.data?.status === 'success' && res.data?.data) {
                const { latitude, longitude, display_name } = res.data.data;
                const lat = parseFloat(Number(latitude).toFixed(6));
                const lng = parseFloat(Number(longitude).toFixed(6));
                setForm((prev) => ({
                    ...prev,
                    latitude: lat,
                    longitude: lng,
                    alamat: prev.alamat || display_name || prev.alamat,
                }));
                toast.success(`Titik lokasi Google Maps berhasil ditemukan (${lat}, ${lng})!`);
            } else {
                toast.warning('Lokasi tidak ditemukan. Silakan buka Google Maps, klik kanan lokasi cabang, lalu salin angka koordinat (contoh: -6.2941, 106.7995).');
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
            setForm((prev) => ({
                ...prev,
                latitude: parsed.lat,
                longitude: parsed.lng,
            }));
            toast.success(`Koordinat berhasil dipaste (${parsed.lat}, ${parsed.lng})!`);
        }
    };

    const handleQrUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedCabangId) return;

        if (file.size > 3 * 1024 * 1024) {
            toast.error('Ukuran file maksimal 3MB.');
            return;
        }

        const formData = new FormData();
        formData.append('qr_file', file);

        setUploadingQr(true);
        try {
            const res = await api.post(`/admin/cabang/${selectedCabangId}/upload-qr`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            if (res.data.status === 'success') {
                const newUrl = res.data.data?.qr_pembayaran;
                setForm((prev) => ({ ...prev, qr_pembayaran: newUrl }));
                toast.success('QRIS pembayaran berhasil diunggah!');
                fetchBranches();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal mengunggah QRIS.');
        } finally {
            setUploadingQr(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCabangId) return;

        setSaving(true);
        try {
            const res = await api.put(`/admin/cabang/${selectedCabangId}`, form);
            if (res.data.status === 'success') {
                toast.success(res.data.message || 'Pengaturan cabang berhasil disimpan!');
                fetchBranches();
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal menyimpan pengaturan cabang.');
        } finally {
            setSaving(false);
        }
    };

    const currentBranch = branches.find((b) => String(b.id) === String(selectedCabangId));

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm text-center">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-500">Memuat data pengaturan cabang...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header selection card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-base font-extrabold text-[#263b53] flex items-center gap-2">
                        <span>⚙️ Pengaturan Cabang & Rekening Pembayaran</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Konfigurasi jam operasional, aturan jam malam, koordinat peta lokasi, dan rekening pembayaran untuk calon penghuni.
                    </p>
                </div>

                {isPemilik && branches.length > 1 && (
                    <div className="flex items-center gap-2 shrink-0">
                        <label className="text-xs font-semibold text-slate-600">Pilih Cabang:</label>
                        <select
                            value={selectedCabangId}
                            onChange={handleBranchChange}
                            className="px-3.5 py-2 text-xs font-bold text-[#263b53] bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
                        >
                            {branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.nama_cabang}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Main Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* LEFT COLUMN: Profil, Jam Operasional & Jam Malam */}
                    <div className="space-y-6">
                        {/* Card: Identitas Cabang */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <h4 className="text-sm font-extrabold text-[#263b53] flex items-center gap-2">
                                    <span>🏢</span>
                                    <span>Identitas & Kontak Cabang</span>
                                </h4>
                                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#1E5FC9]">
                                    {currentBranch?.gedung_count || 0} Gedung
                                </span>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Cabang</label>
                                <input
                                    type="text"
                                    required
                                    value={form.nama_cabang}
                                    onChange={(e) => setForm({ ...form, nama_cabang: e.target.value })}
                                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#263b53]"
                                    placeholder="Contoh: Cabang Cilandak Barat"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Alamat Lengkap</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={form.alamat}
                                    onChange={(e) => setForm({ ...form, alamat: e.target.value })}
                                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-[#263b53]"
                                    placeholder="Alamat jalan, kelurahan, kecamatan, kota..."
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">WhatsApp Cabang</label>
                                    <input
                                        type="text"
                                        value={form.no_wa}
                                        onChange={(e) => setForm({ ...form, no_wa: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        placeholder="081234567890"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Email Cabang</label>
                                    <input
                                        type="email"
                                        value={form.email_cabang}
                                        onChange={(e) => setForm({ ...form, email_cabang: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        placeholder="cilandak@home-in.com"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Card: Jam Operasional & Jam Malam */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                                <h4 className="text-sm font-extrabold text-[#263b53] flex items-center gap-2">
                                    <span>⏰</span>
                                    <span>Aturan Waktu & Jam Malam</span>
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Jam malam menjadi acuan monitoring kepulangan penghuni dan pencatatan pelanggaran.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Jam Buka Kost</label>
                                    <input
                                        type="time"
                                        value={form.jam_operasional_mulai}
                                        onChange={(e) => setForm({ ...form, jam_operasional_mulai: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <span className="text-[11px] text-slate-400 mt-1 block">Waktu gerbang dibuka</span>
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Jam Tutup Operasional</label>
                                    <input
                                        type="time"
                                        value={form.jam_operasional_selesai}
                                        onChange={(e) => setForm({ ...form, jam_operasional_selesai: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <span className="text-[11px] text-slate-400 mt-1 block">Waktu penerimaan tamu berakhir</span>
                                </div>
                            </div>

                            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-base">🚨</span>
                                    <label className="text-xs font-bold text-amber-900">Batas Jam Malam Kost</label>
                                </div>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="time"
                                        value={form.jam_malam}
                                        onChange={(e) => setForm({ ...form, jam_malam: e.target.value })}
                                        className="px-3.5 py-2 text-sm font-bold text-amber-900 bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-200"
                                    />
                                    <span className="text-xs text-amber-800 leading-tight">
                                        Penghuni yang masuk setelah jam ini tanpa izin keluar yang disetujui akan tercatat otomatis sebagai <strong>pelanggaran jam malam</strong>.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Card: Rekening & QRIS Pembayaran */}
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                            <div className="border-b border-slate-100 pb-3">
                                <h4 className="text-sm font-extrabold text-[#263b53] flex items-center gap-2">
                                    <span>💳</span>
                                    <span>Rekening Bank & QRIS Pembayaran Cabang</span>
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">
                                    Informasi ini otomatis tampil kepada calon penghuni saat booking diterima untuk transfer DP / pembayaran sewa.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Nama Bank</label>
                                    <input
                                        type="text"
                                        value={form.nama_bank}
                                        onChange={(e) => setForm({ ...form, nama_bank: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        placeholder="Contoh: BCA, Mandiri, BRI"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-slate-700 block mb-1">Nomor Rekening</label>
                                    <input
                                        type="text"
                                        value={form.no_rekening}
                                        onChange={(e) => setForm({ ...form, no_rekening: e.target.value })}
                                        className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-mono"
                                        placeholder="1234567890"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-700 block mb-1">Atas Nama Rekening</label>
                                <input
                                    type="text"
                                    value={form.nama_pemilik_rekening}
                                    onChange={(e) => setForm({ ...form, nama_pemilik_rekening: e.target.value })}
                                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    placeholder="Contoh: PT Home In Kost Indonesia"
                                />
                            </div>

                            {/* QRIS Upload & Preview */}
                            <div className="pt-2">
                                <label className="text-xs font-bold text-slate-700 block mb-2">QRIS Pembayaran Cabang</label>
                                <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
                                    {form.qr_pembayaran ? (
                                        <div className="relative group shrink-0">
                                            <img
                                                src={form.qr_pembayaran}
                                                alt="QRIS Cabang"
                                                className="w-28 h-28 object-contain rounded-xl border border-slate-200 bg-white p-1 shadow-xs"
                                            />
                                            <a
                                                href={form.qr_pembayaran}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="absolute inset-0 bg-slate-900/40 rounded-xl opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-bold"
                                            >
                                                Perbesar
                                            </a>
                                        </div>
                                    ) : (
                                        <div className="w-28 h-28 rounded-xl border border-slate-200 bg-white flex flex-col items-center justify-center text-slate-400 text-xs shrink-0 p-2 text-center">
                                            <span className="text-2xl mb-1">📱</span>
                                            <span>Belum ada QRIS</span>
                                        </div>
                                    )}

                                    <div className="flex-1 space-y-2 text-center sm:text-left">
                                        <label className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#263b53] border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition shadow-xs">
                                            <span>📤 {uploadingQr ? 'Mengunggah...' : 'Unggah Barcode QRIS Baru'}</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                disabled={uploadingQr}
                                                onChange={handleQrUpload}
                                                className="hidden"
                                            />
                                        </label>
                                        <p className="text-[11px] text-slate-400">
                                            Format: JPG, PNG, WEBP. Maksimal 3MB. Barcode ini akan langsung ditampilkan kepada calon penghuni saat pembayaran.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Peta Lokasi & Koordinat GPS */}
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h4 className="text-sm font-extrabold text-[#263b53] flex items-center gap-2">
                                        <span>📍</span>
                                        <span>Koordinat & Titik Lokasi Peta</span>
                                    </h4>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Digunakan untuk navigasi calon penghuni dan perhitungan tawaran cabang alternatif saat kost penuh.
                                    </p>
                                </div>
                                <a
                                    href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition flex items-center gap-1 shrink-0"
                                >
                                    Buka Google Maps ↗
                                </a>
                            </div>

                            {/* Petunjuk Pengambilan Titik Google Maps */}
                            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 leading-relaxed">
                                <p className="font-bold flex items-center gap-1 mb-1">
                                    <span>💡</span>
                                    <span>Cara Mudah Menentukan Titik Cabang dari Google Maps:</span>
                                </p>
                                <ol className="list-decimal list-inside space-y-0.5 text-[11px] text-blue-800">
                                    <li>
                                        Buka <a href="https://www.google.com/maps" target="_blank" rel="noopener noreferrer" className="font-bold underline text-blue-700">Google Maps ↗</a> di tab baru dan cari lokasi kost Anda.
                                    </li>
                                    <li>
                                        <strong>Klik kanan</strong> tepat di gedung cabang &rarr; <strong>klik angka koordinat</strong> di baris teratas (contoh: <code className="bg-white/80 px-1 py-0.2 rounded font-mono">-6.2941, 106.7995</code>).
                                    </li>
                                    <li>
                                        <strong>Tempel (Paste)</strong> link atau koordinat di kotak di bawah ini, atau langsung ke kolom Latitude/Longitude.
                                    </li>
                                </ol>
                            </div>

                            {/* Search Address or Paste Link/Coords in Map */}
                            <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                    Tempel Link Google Maps, Koordinat, atau Cari Alamat:
                                </label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
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
                                        placeholder="Tempel link Google Maps / koordinat (-6.2941, 106.7995) / nama jalan..."
                                        className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                    />
                                    <button
                                        type="button"
                                        disabled={searchingMap}
                                        onClick={() => handleResolveLocation()}
                                        className="px-3.5 py-2 text-xs font-bold text-white bg-[#263b53] hover:bg-[#1b2c3f] rounded-xl transition shrink-0 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {searchingMap ? (
                                            <>
                                                <span className="animate-spin inline-block">⏳</span>
                                                <span>Mencari...</span>
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

                            {/* Leaflet Map Picker Component */}
                            <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                                <LeafletMapPicker
                                    latitude={form.latitude}
                                    longitude={form.longitude}
                                    onChange={handleLocationSelect}
                                    height="360px"
                                />
                            </div>

                            {/* Latitude & Longitude inputs (with smart onPaste) */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-600">Latitude</label>
                                        <span className="text-[10px] text-slate-400">Bisa paste &quot;lat, lng&quot;</span>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.latitude}
                                        onPaste={handleCoordinatePaste}
                                        onChange={(e) =>
                                            setForm({ ...form, latitude: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) })
                                        }
                                        className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        placeholder="-6.2941"
                                    />
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-xs font-bold text-slate-600">Longitude</label>
                                        <span className="text-[10px] text-slate-400">Bisa paste &quot;lat, lng&quot;</span>
                                    </div>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        value={form.longitude}
                                        onPaste={handleCoordinatePaste}
                                        onChange={(e) =>
                                            setForm({ ...form, longitude: e.target.value === '' ? '' : (parseFloat(e.target.value) || 0) })
                                        }
                                        className="w-full px-3.5 py-2 text-xs font-mono border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100"
                                        placeholder="106.7995"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between gap-4">
                            <span className="text-xs text-slate-500">
                                Pastikan seluruh data cabang sudah akurat sebelum disimpan.
                            </span>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2.5 text-sm font-bold text-white bg-[#1E5FC9] hover:bg-blue-700 rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-50"
                            >
                                <span>{saving ? 'Menyimpan Pengaturan...' : '💾 Simpan Pengaturan Cabang'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

