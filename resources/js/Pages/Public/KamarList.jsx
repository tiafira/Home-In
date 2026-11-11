import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PublicLayout from '../../Layouts/PublicLayout';
import RoomCard from '../../Components/Public/RoomCard';
import SkeletonCard from '../../Components/UI/SkeletonCard';
import EmptyState from '../../Components/UI/EmptyState';
import api from '../../services/api';

export default function KamarList() {
    const [searchParams, setSearchParams] = useSearchParams();

    const [kamars, setKamars] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 });
    const [loading, setLoading] = useState(true);

    const [filterOptions, setFilterOptions] = useState({
        cabang: [],
        gedung: [],
        fasilitas: [],
        rentang_harga: { min: 500000, max: 3000000 },
    });

    // Filters state initialized from URL search params
    const [selectedCabang, setSelectedCabang] = useState(searchParams.get('cabang_id') || '');
    const [selectedGedung, setSelectedGedung] = useState(searchParams.get('gedung_id') || '');
    const [selectedLantai, setSelectedLantai] = useState(searchParams.get('lantai') || '');
    const [minHarga, setMinHarga] = useState(searchParams.get('min_harga') || '');
    const [maxHarga, setMaxHarga] = useState(searchParams.get('max_harga') || '');
    const [rencanaCheckin, setRencanaCheckin] = useState(searchParams.get('checkin') || '');
    const [hanyaKosong, setHanyaKosong] = useState(searchParams.get('hanya_kosong') === '1');
    const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
    const [sort, setSort] = useState(searchParams.get('sort') || 'rekomendasi');
    const [selectedFasilitas, setSelectedFasilitas] = useState([]);

    // Fetch Filter Options once
    useEffect(() => {
        const fetchFilters = async () => {
            try {
                const res = await api.get('/public/kamar/filters');
                if (res.data?.status === 'success') {
                    setFilterOptions(res.data.data);
                }
            } catch (err) {
                // ignore
            }
        };
        fetchFilters();
    }, []);

    // Sync with URL query params when searchParams change
    useEffect(() => {
        const qParam = searchParams.get('q') || '';
        const gedungParam = searchParams.get('gedung_id') || '';
        const cabangParam = searchParams.get('cabang_id') || '';
        const lantaiParam = searchParams.get('lantai') || '';
        const minParam = searchParams.get('min_harga') || '';
        const maxParam = searchParams.get('max_harga') || '';

        setSearchQuery(qParam);
        if (gedungParam) setSelectedGedung(gedungParam);
        if (cabangParam) setSelectedCabang(cabangParam);
        if (lantaiParam) setSelectedLantai(lantaiParam);
        if (minParam) setMinHarga(minParam);
        if (maxParam) setMaxHarga(maxParam);
    }, [searchParams]);

    // Fetch Kamar list on filter/page change
    const fetchKamars = async (page = 1) => {
        setLoading(true);
        try {
            const params = {
                page,
                cabang_id: selectedCabang || undefined,
                gedung_id: selectedGedung || undefined,
                lantai: selectedLantai || undefined,
                min_harga: minHarga || undefined,
                max_harga: maxHarga || undefined,
                checkin: rencanaCheckin || undefined,
                hanya_kosong: hanyaKosong ? 1 : 0,
                q: searchQuery || undefined,
                sort,
                fasilitas: selectedFasilitas.length > 0 ? selectedFasilitas.join(',') : undefined,
            };

            const res = await api.get('/public/kamar', { params });
            if (res.data?.status === 'success') {
                const paginated = res.data.data;
                setKamars(paginated.data || []);
                setPagination({
                    current_page: paginated.current_page,
                    last_page: paginated.last_page,
                    total: paginated.total,
                });
            }
        } catch (err) {
            // ignore
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKamars(1);
    }, [selectedCabang, selectedGedung, selectedLantai, minHarga, maxHarga, hanyaKosong, sort, selectedFasilitas, searchParams]);

    // Handle Quick Search Form submit (From Top Card)
    const handleQuickSearchSubmit = (e) => {
        e.preventDefault();
        const nextParams = new URLSearchParams(searchParams);
        if (searchQuery.trim()) {
            nextParams.set('q', searchQuery.trim());
        } else {
            nextParams.delete('q');
        }
        if (selectedGedung) {
            nextParams.set('gedung_id', selectedGedung);
        } else {
            nextParams.delete('gedung_id');
        }
        if (maxHarga) {
            nextParams.set('max_harga', maxHarga);
        } else {
            nextParams.delete('max_harga');
        }
        setSearchParams(nextParams);
        fetchKamars(1);
    };

    // Handle Search Form submit (From Sidebar text search)
    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const nextParams = new URLSearchParams(searchParams);
        if (searchQuery.trim()) {
            nextParams.set('q', searchQuery.trim());
        } else {
            nextParams.delete('q');
        }
        setSearchParams(nextParams);
        fetchKamars(1);
    };

    const handleResetFilter = () => {
        setSelectedCabang('');
        setSelectedGedung('');
        setSelectedLantai('');
        setMinHarga('');
        setMaxHarga('');
        setRencanaCheckin('');
        setHanyaKosong(false);
        setSearchQuery('');
        setSort('rekomendasi');
        setSelectedFasilitas([]);
        setSearchParams({});
    };

    const filteredGedungs = selectedCabang
        ? filterOptions.gedung.filter((g) => g.cabang_id === parseInt(selectedCabang))
        : filterOptions.gedung;

    // Group rooms by gedung & lantai so we display 1 representative card per floor
    const groupedKamars = React.useMemo(() => {
        const groups = {};
        (kamars || []).forEach((k) => {
            const gedungId = k.gedung_id || k.gedung?.id || 0;
            const lantai = k.lantai || 1;
            const key = `${gedungId}-${lantai}`;

            if (!groups[key]) {
                const mainPhoto =
                    k.kamar_foto && k.kamar_foto.length > 0
                        ? k.kamar_foto[0].url_foto
                        : (k.gedung?.foto || null);

                groups[key] = {
                    key,
                    id: k.id,
                    sample_kamar_id: k.id,
                    first_available_id: k.status === 'kosong' ? k.id : null,
                    gedung_id: gedungId,
                    gedung: k.gedung,
                    gedung_foto: k.gedung?.foto || null,
                    nama_gedung: k.gedung?.nama_gedung || 'Gedung Kost',
                    cabang: k.gedung?.cabang,
                    nama_cabang: k.gedung?.cabang?.nama_cabang || 'Home-In Cabang Cimahi',
                    cabang_nama: k.gedung?.cabang?.nama_cabang || 'Home-In Cabang Cimahi',
                    alamat: k.gedung?.alamat || k.gedung?.cabang?.alamat || 'Home-In Kost',
                    lantai: lantai,
                    harga_bulanan: k.harga_bulanan,
                    foto: mainPhoto,
                    kamar_foto: k.kamar_foto || (mainPhoto ? [{ url_foto: mainPhoto }] : []),
                    deskripsi: k.deskripsi,
                    kamar_fasilitas: k.kamar_fasilitas || [],
                    kamar_kosong_count: 0,
                    total_kamar_count: 0,
                    kamar_list: [],
                    status: 'terisi',
                };
            }

            groups[key].total_kamar_count += 1;
            if (k.status === 'kosong') {
                groups[key].kamar_kosong_count += 1;
                groups[key].status = 'kosong';
                if (!groups[key].first_available_id) {
                    groups[key].first_available_id = k.id;
                }
            }
            groups[key].kamar_list.push(k);
            if (Number(k.harga_bulanan) < Number(groups[key].harga_bulanan)) {
                groups[key].harga_bulanan = k.harga_bulanan;
            }
        });

        return Object.values(groups);
    }, [kamars]);

    return (
        <PublicLayout title="Daftar & Booking Kamar Kost">
            {/* Header Banner */}
            <div className="bg-[#1F2A44] text-white pt-12 pb-20 sm:pb-24 px-4 sm:px-6 lg:px-8 border-b border-slate-800 relative">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">
                            Pemesanan Kamar Kost
                        </span>
                        <h1 className="text-2xl sm:text-4xl font-extrabold mt-1">
                            Pilihan Kamar Kost Home-In
                        </h1>
                        <p className="text-xs sm:text-sm text-[#8A94A6] mt-1.5 max-w-xl">
                            Temukan kamar dengan fasilitas lengkap mulai Rp600.000/bln. Gunakan form pencarian cepat di bawah untuk menemukan kamar yang tepat.
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/15 self-start md:self-auto text-center">
                        <span className="text-[11px] text-blue-200 uppercase tracking-wider block font-semibold">Total Unit</span>
                        <span className="text-2xl font-black text-white">{pagination.total} Kamar</span>
                    </div>
                </div>
            </div>

            {/* QUICK SEARCH CARD AT THE VERY TOP OF THE BOOKING PAGE */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 sm:-mt-12 relative z-20">
                <form
                    onSubmit={handleQuickSearchSubmit}
                    className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
                >
                    {/* 1. Cari Daerah / Lokasi / Nama Gedung */}
                    <div>
                        <label className="block text-xs font-bold text-[#1F2A44] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="text-[#1E5FC9]">📍</span>
                            <span>Cari Daerah / Gedung</span>
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Misal: Babakan, Cimahi, Gedung A..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full h-12 pl-10 pr-4 rounded-xl border border-slate-200 text-xs font-semibold text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9] bg-slate-50 placeholder:font-normal placeholder:text-slate-400"
                            />
                            <svg className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                    </div>

                    {/* 2. Pilih Gedung Kost (Opsional) */}
                    <div>
                        <label className="block text-xs font-bold text-[#1F2A44] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="text-[#1E5FC9]">🏢</span>
                            <span>Pilih Gedung Kost</span>
                        </label>
                        <select
                            value={selectedGedung}
                            onChange={(e) => setSelectedGedung(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9] bg-slate-50"
                        >
                            <option value="">Semua Gedung Kost</option>
                            {filterOptions.gedung.map((g) => (
                                <option key={g.id} value={g.id}>
                                    {g.nama_gedung} {g.alamat ? `— 📍 ${g.alamat}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* 3. Budget Maksimal / Bulan */}
                    <div>
                        <label className="block text-xs font-bold text-[#1F2A44] mb-2 uppercase tracking-wide flex items-center gap-1.5">
                            <span className="text-[#1E5FC9]">💰</span>
                            <span>Budget Maksimal / Bulan</span>
                        </label>
                        <select
                            value={maxHarga}
                            onChange={(e) => setMaxHarga(e.target.value)}
                            className="w-full h-12 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9] bg-slate-50"
                        >
                            <option value="">Semua Budget</option>
                            <option value="800000">&le; Rp 800.000</option>
                            <option value="1200000">&le; Rp 1.200.000</option>
                            <option value="1500000">&le; Rp 1.500.000</option>
                            <option value="2000000">&le; Rp 2.000.000</option>
                            <option value="3000000">&le; Rp 3.000.000</option>
                        </select>
                    </div>

                    {/* 4. Action Button */}
                    <div>
                        <button
                            type="submit"
                            className="w-full h-12 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white font-extrabold text-sm shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <span>Cari Kost</span>
                        </button>
                    </div>
                </form>
            </div>

            {/* Main Content Area: Filter Sidebar + Room Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* FILTER SIDEBAR */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
                            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                                <h3 className="font-bold text-base text-[#1F2A44]">Filter Lanjutan</h3>
                                <button
                                    onClick={handleResetFilter}
                                    className="text-xs font-semibold text-[#1E5FC9] hover:underline"
                                >
                                    Reset
                                </button>
                            </div>

                            {/* Search Input */}
                            <form onSubmit={handleSearchSubmit}>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">
                                    Cari Daerah / Gedung / No. Kamar
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Cimahi, Babakan, Gedung A, 101..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9]"
                                    />
                                    <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </form>

                            {/* Filter: Status Hanya Kosong */}
                            <div>
                                <label className="flex items-center gap-2.5 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={hanyaKosong}
                                        onChange={(e) => setHanyaKosong(e.target.checked)}
                                        className="w-4 h-4 rounded text-[#1E5FC9] focus:ring-[#1E5FC9]"
                                    />
                                    <span className="text-xs font-bold text-[#1F2A44]">Hanya Kamar Kosong (Tersedia)</span>
                                </label>
                            </div>

                            {/* Filter: Gedung */}
                            {filteredGedungs.length > 0 && (
                                <div>
                                    <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">Gedung</label>
                                    <select
                                        value={selectedGedung}
                                        onChange={(e) => setSelectedGedung(e.target.value)}
                                        className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9]"
                                    >
                                        <option value="">Semua Gedung</option>
                                        {filteredGedungs.map((g) => (
                                            <option key={g.id} value={g.id}>
                                                {g.nama_gedung} ({g.jumlah_lantai} Lantai)
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Filter: Lantai */}
                            <div>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">Lantai</label>
                                <select
                                    value={selectedLantai}
                                    onChange={(e) => setSelectedLantai(e.target.value)}
                                    className="w-full h-11 px-3 rounded-xl border border-slate-200 text-xs font-medium text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9]"
                                >
                                    <option value="">Semua Lantai</option>
                                    <option value="1">Lantai 1</option>
                                    <option value="2">Lantai 2</option>
                                    <option value="3">Lantai 3</option>
                                    <option value="4">Lantai 4</option>
                                </select>
                            </div>

                            {/* Filter: Rentang Harga Manual */}
                            <div>
                                <label className="block text-xs font-bold text-[#1F2A44] mb-1.5">Rentang Harga Manual (Rp)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="number"
                                        placeholder="Min"
                                        value={minHarga}
                                        onChange={(e) => setMinHarga(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                    />
                                    <input
                                        type="number"
                                        placeholder="Maks"
                                        value={maxHarga}
                                        onChange={(e) => setMaxHarga(e.target.value)}
                                        className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:ring-2 focus:ring-[#1E5FC9]"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ROOMS GRID & SORTING */}
                    <div className="lg:col-span-3 space-y-6">
                        {/* Top Bar Sorting & Counter */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                            <span className="text-xs text-[#8A94A6]">
                                Menampilkan <strong className="text-[#1F2A44]">{groupedKamars.length}</strong> lantai ({kamars.length} kamar) dari{' '}
                                <strong className="text-[#1F2A44]">{pagination.total}</strong> total kamar
                            </span>

                            <div className="flex items-center gap-2 self-end sm:self-auto">
                                <label className="text-xs font-bold text-[#1F2A44] shrink-0">Urutkan:</label>
                                <select
                                    value={sort}
                                    onChange={(e) => setSort(e.target.value)}
                                    className="h-9 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9] bg-slate-50"
                                >
                                    <option value="rekomendasi">Rekomendasi (Kosong Teratas)</option>
                                    <option value="harga_asc">Harga: Terendah &rarr; Tertinggi</option>
                                    <option value="harga_desc">Harga: Tertinggi &rarr; Terendah</option>
                                    <option value="nomor_asc">Nomor Kamar (A-Z)</option>
                                    <option value="terbaru">Terbaru Ditambahkan</option>
                                </select>
                            </div>
                        </div>

                        {/* Room Grid */}
                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                <SkeletonCard type="room" count={6} />
                            </div>
                        ) : groupedKamars.length === 0 ? (
                            <EmptyState
                                title="Tidak Ada Kamar yang Sesuai"
                                description="Coba ubah kriteria filter atau reset untuk melihat semua unit kamar yang tersedia."
                                actionLabel="Reset Semua Filter"
                                onAction={handleResetFilter}
                            />
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {groupedKamars.map((group) => (
                                    <RoomCard key={group.key} kamar={group} />
                                ))}
                            </div>
                        )}

                        {/* Pagination */}
                        {pagination.last_page > 1 && (
                            <div className="flex items-center justify-center gap-2 pt-6">
                                <button
                                    onClick={() => fetchKamars(pagination.current_page - 1)}
                                    disabled={pagination.current_page <= 1}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-[#1F2A44] disabled:opacity-40"
                                >
                                    Sebelumnya
                                </button>
                                <span className="text-xs font-semibold text-[#8A94A6]">
                                    Halaman {pagination.current_page} dari {pagination.last_page}
                                </span>
                                <button
                                    onClick={() => fetchKamars(pagination.current_page + 1)}
                                    disabled={pagination.current_page >= pagination.last_page}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-white border border-slate-200 text-[#1F2A44] disabled:opacity-40"
                                >
                                    Selanjutnya
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}
