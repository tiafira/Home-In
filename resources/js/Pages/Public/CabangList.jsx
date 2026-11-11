import React, { useState, useEffect } from 'react';
import PublicLayout from '../../Layouts/PublicLayout';
import BranchCard from '../../Components/Public/BranchCard';
import SkeletonCard from '../../Components/UI/SkeletonCard';
import api from '../../services/api';

export default function CabangList() {
    const [cabangs, setCabangs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCabangs = async () => {
            try {
                const res = await api.get('/public/cabang');
                if (res.data?.status === 'success') {
                    setCabangs(res.data.data || []);
                }
            } catch (err) {
                // ignore
            } finally {
                setLoading(false);
            }
        };

        fetchCabangs();
    }, []);

    return (
        <PublicLayout title="Cabang Kost Home-In">
            <div className="bg-[#1F2A44] text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
                <div className="max-w-7xl mx-auto text-center max-w-2xl">
                    <span className="text-xs font-bold text-[#60a5fa] uppercase tracking-wider">
                        Lokasi Strategis & Nyaman
                    </span>
                    <h1 className="text-3xl sm:text-5xl font-extrabold mt-2">
                        Cabang Kost Home-In
                    </h1>
                    <p className="text-xs sm:text-sm text-[#8A94A6] mt-3 leading-relaxed">
                        Kami mengoperasikan 4 cabang kost yang terawat dengan baik. Setiap cabang memiliki standar kebersihan tinggi, penjaga standby, dan sistem keamanan 24 jam.
                    </p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {loading ? (
                        <SkeletonCard type="branch" count={4} />
                    ) : (
                        cabangs.map((c) => (
                            <BranchCard key={c.id} cabang={c} />
                        ))
                    )}
                </div>
            </div>
        </PublicLayout>
    );
}

