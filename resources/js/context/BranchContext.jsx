import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const BranchContext = createContext(null);

export const BranchProvider = ({ children }) => {
    const { user } = useAuth();
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState(() => {
        const saved = localStorage.getItem('home_in_selected_branch');
        return saved ? Number(saved) : null;
    });
    const [loadingBranches, setLoadingBranches] = useState(false);

    const fetchBranches = async () => {
        if (!user || !['pemilik', 'admin'].includes(user.role)) return;
        try {
            setLoadingBranches(true);
            const res = await api.get('/admin/cabang/list');
            if (res.data && res.data.data) {
                setBranches(res.data.data);
                // If user is admin, their branch is fixed by backend
                if (user.role === 'admin' && res.data.meta?.current_branch_id) {
                    setSelectedBranchId(res.data.meta.current_branch_id);
                }
            }
        } catch (err) {
            console.error('Failed to load branches:', err);
        } finally {
            setLoadingBranches(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, [user]);

    const changeBranch = (branchId) => {
        const val = branchId ? Number(branchId) : null;
        setSelectedBranchId(val);
        if (val) {
            localStorage.setItem('home_in_selected_branch', String(val));
        } else {
            localStorage.removeItem('home_in_selected_branch');
        }
    };

    return (
        <BranchContext.Provider
            value={{
                branches,
                selectedBranchId,
                activeBranchId: selectedBranchId,
                changeBranch,
                loadingBranches,
                fetchBranches,
                isPemilik: user?.role === 'pemilik',
            }}
        >
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => {
    const context = useContext(BranchContext);
    if (!context) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
};
