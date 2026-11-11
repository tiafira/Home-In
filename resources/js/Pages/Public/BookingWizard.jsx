import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import PublicLayout from '../../Layouts/PublicLayout';
import FourSquareLoader from '../../Components/UI/FourSquareLoader';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

export default function BookingWizard() {
    const { kamarId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addToast } = useToast();

    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [kamarData, setKamarData] = useState(null);

    // Form State
    const [form, setForm] = useState({
        rencana_checkin: '',
        fasilitas_ids: [],
        fasilitas_opsi: {}, // { [fasilitasId]: 'permanen' | 'dari_kost' }
        catatan: '',
        setuju_aturan: false,
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        let isMounted = true;
        const fetchKamar = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/public/kamar/${kamarId}`);
                if (isMounted && res.data?.status === 'success') {
                    setKamarData(res.data.data);
                }
            } catch (err) {
                // handle error
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchKamar();
        return () => { isMounted = false; };
    }, [kamarId]);

    const formatRupiah = (val) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(val || 0);
    };

    if (loading) {
        return (
            <PublicLayout title="Memuat Pemesanan Kamar...">
                <div className="min-h-[70vh] flex items-center justify-center py-20">
                    <FourSquareLoader size={90} label="Menyiapkan formulir booking..." />
                </div>
            </PublicLayout>
        );
    }

    if (!kamarData || !kamarData.kamar) {
        return (
            <PublicLayout title="Kamar Tidak Ditemukan">
                <div className="max-w-md mx-auto py-20 px-4 text-center">
                    <h2 className="text-xl font-bold text-[#1F2A44] mb-2">Kamar Tidak Ditemukan</h2>
                    <Link to="/kamar" className="px-5 py-2.5 bg-[#1E5FC9] text-white rounded-xl text-xs font-bold">
                        Pilih Kamar Lain
                    </Link>
                </div>
            </PublicLayout>
        );
    }

    const { kamar, fasilitas_tambahan_tersedia } = kamarData;
    const gedung = kamar.gedung;
    const cabang = gedung?.cabang;

    // Calculate total cost
    const hargaKamar = parseFloat(kamar.harga_bulanan) || 0;
    const fasilitasDipilih = fasilitas_tambahan_tersedia.filter((f) =>
        form.fasilitas_ids.includes(f.id)
    );

    // Calculate based on each chosen option:
    let totalFasilitasPerBulan = 0;
    let totalFasilitasSekaliBayar = 0;
    const fasilitasPerBulan = [];
    const fasilitasSekaliBayar = [];

    fasilitasDipilih.forEach((f) => {
        const opsi = form.fasilitas_opsi[f.id] || (f.kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost');
        const hargaAsli = parseFloat(f.harga_barang) > 0 ? parseFloat(f.harga_barang) : (parseFloat(f.biaya_tambahan) || 0);
        const sewaBulanan = parseFloat(f.biaya_tambahan) || 0;

        if (opsi === 'permanen') {
            totalFasilitasSekaliBayar += hargaAsli;
            fasilitasSekaliBayar.push(f);
        } else {
            totalFasilitasPerBulan += sewaBulanan;
            fasilitasPerBulan.push(f);
        }
    });

    const totalBulanPertama = hargaKamar + totalFasilitasPerBulan + totalFasilitasSekaliBayar;
    const totalBulanBerikutnya = hargaKamar + totalFasilitasPerBulan;

    const toggleFasilitas = (id) => {
        setForm((prev) => {
            const exists = prev.fasilitas_ids.includes(id);
            const newIds = exists
                ? prev.fasilitas_ids.filter((fid) => fid !== id)
                : [...prev.fasilitas_ids, id];

            const newOpsi = { ...prev.fasilitas_opsi };
            if (!exists && !newOpsi[id]) {
                const f = fasilitas_tambahan_tersedia.find((item) => item.id === id);
                newOpsi[id] = f?.kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost';
            }

            return {
                ...prev,
                fasilitas_ids: newIds,
                fasilitas_opsi: newOpsi,
            };
        });
    };

    const changeFasilitasOpsi = (id, opsi) => {
        setForm((prev) => ({
            ...prev,
            fasilitas_opsi: {
                ...prev.fasilitas_opsi,
                [id]: opsi,
            },
        }));
    };

    // Validation step 1
    const handleNextToStep2 = () => {
        if (!form.rencana_checkin) {
            setErrors({ rencana_checkin: 'Silakan pilih tanggal rencana mulai tinggal / check-in.' });
            return;
        }
        setErrors({});
        setCurrentStep(2);
    };

    // Validation step 2
    const handleNextToStep3 = () => {
        setCurrentStep(3);
    };

    // Submit Booking
    const handleSubmitBooking = async (e) => {
        e.preventDefault();
        if (!form.setuju_aturan) {
            setErrors({ setuju_aturan: 'Anda wajib menyetujui syarat & aturan kost sebelum melanjutkan.' });
            return;
        }

        setErrors({});
        setSubmitting(true);

        try {
            const payload = {
                kamar_id: kamar.id,
                rencana_checkin: form.rencana_checkin,
                fasilitas_ids: form.fasilitas_ids,
                fasilitas_pilihan: form.fasilitas_ids.map((id) => ({
                    id,
                    opsi: form.fasilitas_opsi[id] || 'dari_kost',
                })),
                catatan: form.catatan,
                setuju_aturan: form.setuju_aturan ? 1 : 0,
            };

            const res = await api.post('/user/booking', payload);
            if (res.data?.status === 'success') {
                if (addToast) {
                    addToast({
                        title: 'Booking Berhasil!',
                        message: 'Permohonan booking kamar Anda telah dikirim dan menunggu persetujuan pengelola.',
                        type: 'success',
                    });
                }
                navigate('/booking-saya');
            }
        } catch (err) {
            if (err.response?.data?.message) {
                setErrors({ submit: err.response.data.message });
            } else {
                setErrors({ submit: 'Terjadi kesalahan saat memproses booking. Silakan coba kembali.' });
            }
        } finally {
            setSubmitting(false);
        }
    };

    const mainPhoto = kamar.kamar_foto && kamar.kamar_foto.length > 0
        ? kamar.kamar_foto[0].url_foto
        : null;

    return (
        <PublicLayout title={`Booking Kamar ${kamar.nomor_kamar}`}>
            {/* Header Steps */}
            <div className="bg-[#1F2A44] text-white py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-4xl mx-auto">
                    <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider block mb-1">
                        Formulir Pemesanan Kamar
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold">
                        Booking Kamar {kamar.nomor_kamar}
                    </h1>
                    <p className="text-xs text-[#8A94A6] mt-1">
                        {cabang?.nama_cabang} • {gedung?.nama_gedung} • Lantai {kamar.lantai}
                    </p>

                    {/* Step Tracker */}
                    <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-8 pt-6 border-t border-slate-700/60">
                        <div className={`flex items-center gap-2.5 ${currentStep >= 1 ? 'text-white' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                currentStep >= 1 ? 'bg-[#1E5FC9] text-white' : 'bg-slate-700 text-slate-400'
                            }`}>
                                1
                            </div>
                            <span className="text-xs font-bold hidden sm:inline">Pilih Kamar & Check-in</span>
                            <span className="text-xs font-bold sm:hidden">Langkah 1</span>
                        </div>

                        <div className={`flex items-center gap-2.5 ${currentStep >= 2 ? 'text-white' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                currentStep >= 2 ? 'bg-[#1E5FC9] text-white' : 'bg-slate-700 text-slate-400'
                            }`}>
                                2
                            </div>
                            <span className="text-xs font-bold hidden sm:inline">Fasilitas Tambahan</span>
                            <span className="text-xs font-bold sm:hidden">Langkah 2</span>
                        </div>

                        <div className={`flex items-center gap-2.5 ${currentStep >= 3 ? 'text-white' : 'text-slate-500'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
                                currentStep >= 3 ? 'bg-[#1E5FC9] text-white' : 'bg-slate-700 text-slate-400'
                            }`}>
                                3
                            </div>
                            <span className="text-xs font-bold hidden sm:inline">Ringkasan & Kirim</span>
                            <span className="text-xs font-bold sm:hidden">Langkah 3</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
                {/* Global Submission Error Alert */}
                {errors.submit && (
                    <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
                        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{errors.submit}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* LEFT / CENTER: Wizard Step Form */}
                    <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
                        {/* STEP 1: PILIH CHECK-IN */}
                        {currentStep === 1 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-[#1F2A44] mb-1">
                                        Langkah 1: Tentukan Tanggal Rencana Check-In
                                    </h3>
                                    <p className="text-xs text-[#8A94A6]">
                                        Pastikan tanggal rencana mulai tinggal Anda tidak melebihi jadwal yang Anda inginkan.
                                    </p>
                                </div>

                                {/* Room Quick Card */}
                                <div className="p-4 rounded-2xl bg-slate-50 flex items-center gap-4">
                                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-200 shrink-0">
                                        {mainPhoto ? (
                                            <img src={mainPhoto} alt="kamar" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                                                Home-In
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs font-semibold text-[#8A94A6]">{cabang?.nama_cabang}</p>
                                        <h4 className="text-base font-extrabold text-[#1F2A44]">Kamar {kamar.nomor_kamar}</h4>
                                        <p className="text-xs font-bold text-[#1E5FC9]">
                                            {formatRupiah(kamar.harga_bulanan)} / bulan
                                        </p>
                                    </div>
                                </div>

                                {/* Checkin Date Input */}
                                <div>
                                    <label className="block text-xs font-bold text-[#1F2A44] mb-2 uppercase tracking-wide">
                                        Tanggal Rencana Check-In *
                                    </label>
                                    <input
                                        type="date"
                                        min={new Date().toISOString().split('T')[0]}
                                        value={form.rencana_checkin}
                                        onChange={(e) => {
                                            setForm({ ...form, rencana_checkin: e.target.value });
                                            setErrors({ ...errors, rencana_checkin: null });
                                        }}
                                        className="w-full h-12 px-4 rounded-xl border border-slate-200 text-xs font-semibold text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9] bg-slate-50"
                                    />
                                    {errors.rencana_checkin && (
                                        <p className="text-rose-500 text-xs mt-1.5">{errors.rencana_checkin}</p>
                                    )}
                                    <p className="text-[11px] text-[#8A94A6] mt-1.5">
                                        * Anda dapat check-in pada jam operasional gerbang ({cabang?.jam_operasional_mulai || '06:00'} - {cabang?.jam_operasional_selesai || '22:00'} WIB).
                                    </p>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleNextToStep2}
                                        className="px-6 py-3 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center gap-2"
                                    >
                                        <span>Lanjut: Pilih Fasilitas Tambahan</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: FASILITAS TAMBAHAN & CATATAN */}
                        {currentStep === 2 && (
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-[#1F2A44] mb-1">
                                        Langkah 2: Pilih Fasilitas Tambahan (Opsional)
                                    </h3>
                                    <p className="text-xs text-[#8A94A6]">
                                        Tersedia 2 pilihan kepemilikan: <strong>Beli Permanen (Hak Milik Langsung)</strong> atau <strong>Sewa dari Kost</strong> (biaya bulanan bertahap, dan jika terbayar seharga barang otomatis menjadi hak milik Anda!).
                                    </p>
                                </div>

                                {/* List Fasilitas Tambahan */}
                                <div className="space-y-4">
                                    {fasilitas_tambahan_tersedia.map((f) => {
                                        const isSelected = form.fasilitas_ids.includes(f.id);
                                        const opsi = form.fasilitas_opsi[f.id] || (f.kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost');
                                        const hargaAsli = parseFloat(f.harga_barang) > 0 ? parseFloat(f.harga_barang) : (parseFloat(f.biaya_tambahan) || 0);
                                        const sewaBulanan = parseFloat(f.biaya_tambahan) || 0;

                                        return (
                                            <div
                                                key={f.id}
                                                className={`p-4 sm:p-5 rounded-2xl border-2 transition ${
                                                    isSelected
                                                        ? 'border-[#1E5FC9] bg-blue-50/30 shadow-sm'
                                                        : 'border-slate-100 bg-white hover:border-slate-200'
                                                }`}
                                            >
                                                {/* Checkbox Header */}
                                                <div
                                                    onClick={() => toggleFasilitas(f.id)}
                                                    className="flex items-start justify-between gap-3 cursor-pointer"
                                                >
                                                    <div className="flex items-start gap-3">
                                                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border mt-0.5 shrink-0 ${
                                                            isSelected ? 'bg-[#1E5FC9] border-[#1E5FC9] text-white' : 'border-slate-300 bg-white'
                                                        }`}>
                                                            {isSelected && (
                                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                                                </svg>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-bold text-[#1F2A44]">{f.nama_fasilitas}</h4>
                                                            <p className="text-[11px] text-[#8A94A6] mt-0.5">{f.deskripsi}</p>
                                                        </div>
                                                    </div>

                                                    <div className="text-right shrink-0">
                                                        <span className="text-xs font-black text-[#1E5FC9] block">
                                                            {opsi === 'permanen'
                                                                ? formatRupiah(hargaAsli)
                                                                : `+${formatRupiah(sewaBulanan)}/bln`}
                                                        </span>
                                                        <span className="text-[10px] text-slate-500">
                                                            {opsi === 'permanen' ? 'Beli Hak Milik' : 'Sewa Kost'}
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Pilihan Opsi Pembayaran (Muncul saat fasilitas dicentang) */}
                                                {isSelected && (
                                                    <div className="mt-4 pt-3.5 border-t border-blue-100/80 space-y-2">
                                                        <span className="text-[11px] font-bold text-[#1F2A44] uppercase tracking-wider block mb-2">
                                                            Pilih Skema Biaya:
                                                        </span>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                            {/* Opsi 1: Sewa dari Kost */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    changeFasilitasOpsi(f.id, 'dari_kost');
                                                                }}
                                                                className={`p-3 rounded-xl border text-left transition ${
                                                                    opsi === 'dari_kost'
                                                                        ? 'border-[#1E5FC9] bg-white ring-2 ring-[#1E5FC9]/20 shadow-sm'
                                                                        : 'border-slate-200 bg-slate-50/70 hover:bg-white text-slate-600'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-extrabold text-[#1F2A44] flex items-center gap-1.5">
                                                                        <span>🏠 Sewa dari Kost</span>
                                                                    </span>
                                                                    <span className="text-xs font-black text-[#1E5FC9]">
                                                                        +{formatRupiah(sewaBulanan)}<span className="text-[10px] font-normal">/bln</span>
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                                                    Tambahan sewa per bulan. Jika terakumulasi hingga lunas seharga barang ({formatRupiah(hargaAsli)}), otomatis jadi Hak Milik Anda!
                                                                </p>
                                                            </button>

                                                            {/* Opsi 2: Beli Permanen (Hak Milik Langsung) */}
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    changeFasilitasOpsi(f.id, 'permanen');
                                                                }}
                                                                className={`p-3 rounded-xl border text-left transition ${
                                                                    opsi === 'permanen'
                                                                        ? 'border-emerald-600 bg-white ring-2 ring-emerald-500/20 shadow-sm'
                                                                        : 'border-slate-200 bg-slate-50/70 hover:bg-white text-slate-600'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-extrabold text-emerald-800 flex items-center gap-1.5">
                                                                        <span>💎 Beli Hak Milik</span>
                                                                    </span>
                                                                    <span className="text-xs font-black text-emerald-700">
                                                                        {formatRupiah(hargaAsli)}
                                                                    </span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-500 leading-relaxed">
                                                                    Bayar harga asli barang 1x di awal, barang langsung jadi hak milik permanen Anda.
                                                                </p>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Special Notes Input */}
                                <div>
                                    <label className="block text-xs font-bold text-[#1F2A44] mb-1.5 uppercase tracking-wide">
                                        Catatan Tambahan untuk Pengelola (Opsional)
                                    </label>
                                    <textarea
                                        rows="3"
                                        placeholder="Contoh: Saya membawa 1 sepeda motor, perkiraan tiba sore hari..."
                                        value={form.catatan}
                                        onChange={(e) => setForm({ ...form, catatan: e.target.value })}
                                        className="w-full p-3 rounded-xl border border-slate-200 text-xs text-[#1F2A44] focus:outline-none focus:ring-2 focus:ring-[#1E5FC9] bg-slate-50"
                                    />
                                </div>

                                <div className="pt-4 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(1)}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 cursor-pointer"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleNextToStep3}
                                        className="px-6 py-3 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition active:scale-95 flex items-center gap-2 cursor-pointer"
                                    >
                                        <span>Lanjut: Ringkasan Biaya</span>
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: RINGKASAN & PERSETUJUAN */}
                        {currentStep === 3 && (
                            <form onSubmit={handleSubmitBooking} className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-[#1F2A44] mb-1">
                                        Langkah 3: Konfirmasi & Kirim Permohonan
                                    </h3>
                                    <p className="text-xs text-[#8A94A6]">
                                        Tinjau rincian biaya sewa dan setujui aturan tata tertib kost sebelum mengirim permohonan.
                                    </p>
                                </div>

                                {/* Ringkasan Lengkap Card */}
                                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3 text-xs">
                                    <div className="flex justify-between pb-2 border-b border-slate-200">
                                        <span className="text-[#8A94A6]">Unit Kamar</span>
                                        <strong className="text-[#1F2A44]">Kamar {kamar.nomor_kamar} ({cabang?.nama_cabang || gedung?.nama_gedung})</strong>
                                    </div>

                                    <div className="flex justify-between pb-2 border-b border-slate-200">
                                        <span className="text-[#8A94A6]">Tanggal Check-In</span>
                                        <strong className="text-[#1F2A44]">{form.rencana_checkin}</strong>
                                    </div>

                                    <div className="flex justify-between pb-2 border-b border-slate-200">
                                        <span className="text-[#8A94A6]">Sewa Kamar Dasar</span>
                                        <strong className="text-[#1F2A44]">{formatRupiah(hargaKamar)} / bln</strong>
                                    </div>

                                    {fasilitasDipilih.length > 0 && (
                                        <div className="space-y-2 pb-2 border-b border-slate-200">
                                            <span className="text-[#8A94A6] block font-semibold">Fasilitas Tambahan Request:</span>
                                            {fasilitasDipilih.map((f) => {
                                                const opsi = form.fasilitas_opsi[f.id] || (f.kategori_biaya === 'sekali_bayar' ? 'permanen' : 'dari_kost');
                                                const hargaAsli = parseFloat(f.harga_barang) > 0 ? parseFloat(f.harga_barang) : (parseFloat(f.biaya_tambahan) || 0);
                                                const sewaBulanan = parseFloat(f.biaya_tambahan) || 0;

                                                return (
                                                    <div key={f.id} className="flex justify-between items-center pl-2 text-slate-700">
                                                        <div className="flex items-center gap-1.5">
                                                            <span>• {f.nama_fasilitas}</span>
                                                            {opsi === 'permanen' ? (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                    Beli Hak Milik
                                                                </span>
                                                            ) : (
                                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                                                    Sewa Kost
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className="font-bold">
                                                            {opsi === 'permanen'
                                                                ? `+${formatRupiah(hargaAsli)} (1x)`
                                                                : `+${formatRupiah(sewaBulanan)}/bln`}
                                                        </span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Subtotal Bulan Pertama vs Bulan Berikutnya */}
                                    <div className="pt-2 space-y-1.5">
                                        <div className="flex justify-between items-center text-sm font-extrabold text-[#1F2A44]">
                                            <span>Total Pembayaran Bulan Ke-1:</span>
                                            <span className="text-base text-[#1E5FC9]">{formatRupiah(totalBulanPertama)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                            <span>Estimasi Sewa Bulan Ke-2 dst:</span>
                                            <span className="font-semibold text-slate-700">{formatRupiah(totalBulanBerikutnya)} / bln</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Agreement Checkbox */}
                                <div>
                                    <label className="flex items-start gap-3 p-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={form.setuju_aturan}
                                            onChange={(e) => {
                                                setForm({ ...form, setuju_aturan: e.target.checked });
                                                setErrors({ ...errors, setuju_aturan: null });
                                            }}
                                            className="w-5 h-5 rounded text-[#1E5FC9] focus:ring-[#1E5FC9] mt-0.5"
                                        />
                                        <div className="text-xs text-[#1F2A44]">
                                            <span className="font-bold block">Saya menyetujui Syarat & Ketentuan Kost Home-In</span>
                                            <span className="text-[#8A94A6] text-[11px] leading-relaxed block mt-0.5">
                                                Termasuk kewajiban menjaga ketertiban, mematuhi batas jam malam (pukul {cabang?.jam_malam || '23:00'} WIB), dan melakukan konfirmasi pembayaran tepat waktu setelah booking disetujui.
                                            </span>
                                        </div>
                                    </label>
                                    {errors.setuju_aturan && (
                                        <p className="text-rose-500 text-xs mt-1.5">{errors.setuju_aturan}</p>
                                    )}
                                </div>

                                <div className="pt-4 flex items-center justify-between">
                                    <button
                                        type="button"
                                        onClick={() => setCurrentStep(2)}
                                        disabled={submitting}
                                        className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50"
                                    >
                                        Kembali
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="px-8 py-3.5 rounded-xl bg-[#1E5FC9] hover:bg-[#184ea8] text-white text-xs font-extrabold shadow-lg shadow-blue-500/25 transition active:scale-95 flex items-center gap-2 disabled:opacity-60 cursor-pointer"
                                    >
                                        {submitting ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Mengirim Booking...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>Kirim Permohonan Booking Sekarang</span>
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                </svg>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>

                    {/* RIGHT: Live Price Summary Sticky Card */}
                    <div className="lg:col-span-4 sticky top-28 space-y-4">
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
                            <h4 className="font-extrabold text-sm text-[#1F2A44] pb-3 border-b border-slate-100">
                                Estimasi Tagihan
                            </h4>

                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between text-slate-600">
                                    <span>Sewa Kamar ({kamar.nomor_kamar})</span>
                                    <span>{formatRupiah(hargaKamar)}/bln</span>
                                </div>
                                {totalFasilitasPerBulan > 0 && (
                                    <div className="flex justify-between text-blue-700">
                                        <span>Fasilitas Bulanan ({fasilitasPerBulan.length})</span>
                                        <span>+{formatRupiah(totalFasilitasPerBulan)}/bln</span>
                                    </div>
                                )}
                                {totalFasilitasSekaliBayar > 0 && (
                                    <div className="flex justify-between text-emerald-700 font-semibold">
                                        <span>Fasilitas Hak Milik ({fasilitasSekaliBayar.length})</span>
                                        <span>+{formatRupiah(totalFasilitasSekaliBayar)} (1x)</span>
                                    </div>
                                )}
                            </div>

                            <div className="pt-3 border-t border-slate-100 space-y-2">
                                <div>
                                    <span className="text-[10px] text-[#8A94A6] block uppercase tracking-wider font-semibold">
                                        Total Pembayaran Bulan Pertama
                                    </span>
                                    <p className="text-xl font-black text-[#1E5FC9] mt-0.5">
                                        {formatRupiah(totalBulanPertama)}
                                    </p>
                                </div>
                                {totalFasilitasSekaliBayar > 0 && (
                                    <div className="pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                                        <span>Bulan ke-2 & seterusnya:</span>
                                        <span className="font-bold text-slate-700">{formatRupiah(totalBulanBerikutnya)}/bln</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-3 rounded-xl bg-blue-50 text-[#1E5FC9] text-[11px] leading-relaxed">
                                💡 Pembayaran baru dilakukan setelah pengelola menyetujui permohonan booking Anda.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </PublicLayout>
    );
}

