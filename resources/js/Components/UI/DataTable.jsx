import React, { useState, useMemo } from 'react';
import EmptyState from './EmptyState';
import { TableSkeleton } from './Skeleton';

export default function DataTable({
    columns,
    data = [],
    loading = false,
    searchable = true,
    searchPlaceholder = 'Cari data...',
    filtersSlot,
    actionsSlot,
    defaultSortKey = 'id',
    defaultSortDir = 'desc',
    initialPerPage = 10,
    emptyTitle,
    emptyMessage,
}) {
    const [search, setSearch] = useState('');
    const [sortKey, setSortKey] = useState(defaultSortKey);
    const [sortDir, setSortDir] = useState(defaultSortDir);
    const [currentPage, setCurrentPage] = useState(1);
    const [perPage, setPerPage] = useState(initialPerPage);

    // Filtering
    const filteredData = useMemo(() => {
        if (!search.trim()) return data;
        const q = search.toLowerCase();
        return data.filter((item) => {
            return Object.values(item).some((val) => {
                if (val === null || val === undefined) return false;
                if (typeof val === 'object') return false;
                return String(val).toLowerCase().includes(q);
            });
        });
    }, [data, search]);

    // Sorting
    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData;
        return [...filteredData].sort((a, b) => {
            const valA = a[sortKey];
            const valB = b[sortKey];
            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortDir === 'asc' ? valA - valB : valB - valA;
            }
            const comp = String(valA).localeCompare(String(valB), 'id');
            return sortDir === 'asc' ? comp : -comp;
        });
    }, [filteredData, sortKey, sortDir]);

    // Pagination
    const totalItems = sortedData.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * perPage;
        return sortedData.slice(start, start + perPage);
    }, [sortedData, currentPage, perPage]);

    const handleSort = (key) => {
        if (!key) return;
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
            {/* Top Toolbar */}
            <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3">
                    {searchable && (
                        <div className="relative flex-1 max-w-sm">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#64748b]">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                                </svg>
                            </div>
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder={searchPlaceholder}
                                className="w-full bg-[#f8fafc] border-none rounded-xl pl-10 pr-4 py-2 text-sm text-[#263b53] placeholder-[#64748b] focus:ring-2 focus:ring-[#263b53] focus:bg-white transition outline-none"
                            />
                        </div>
                    )}
                    {filtersSlot}
                </div>

                {actionsSlot && (
                    <div className="flex items-center gap-3 shrink-0">
                        {actionsSlot}
                    </div>
                )}
            </div>

            {/* Table Area */}
            <div className="w-full overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                    <thead>
                        <tr className="border-b border-slate-100 bg-[#f8fafc]/60 text-xs font-bold tracking-wider text-[#64748b] uppercase select-none">
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    style={{ width: col.width }}
                                    onClick={() => col.sortable !== false && col.key && handleSort(col.key)}
                                    className={
                                        'py-3 px-4 font-bold ' +
                                        (col.sortable !== false && col.key ? 'cursor-pointer hover:text-[#263b53] transition-colors ' : '') +
                                        (col.align === 'right' ? 'text-right ' : col.align === 'center' ? 'text-center ' : 'text-left ') +
                                        (col.headerClassName || '')
                                    }
                                >
                                    <div className={'inline-flex items-center gap-1.5 ' + (col.align === 'right' ? 'justify-end' : '')}>
                                        <span>{col.label}</span>
                                        {col.sortable !== false && col.key && sortKey === col.key && (
                                            <span className="text-[#263b53]">
                                                {sortDir === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm text-[#263b53]">
                        {loading ? (
                            <tr>
                                <td colSpan={columns.length} className="p-6">
                                    <TableSkeleton rows={perPage > 5 ? 5 : perPage} cols={columns.length} />
                                </td>
                            </tr>
                        ) : paginatedData.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length}>
                                    <EmptyState title={emptyTitle} message={emptyMessage} />
                                </td>
                            </tr>
                        ) : (
                            paginatedData.map((row, rowIdx) => (
                                <tr key={row.id || rowIdx} className="hover:bg-blue-50/30 transition-colors">
                                    {columns.map((col, colIdx) => (
                                        <td
                                            key={colIdx}
                                            className={
                                                'py-3.5 px-4 text-sm ' +
                                                (col.align === 'right' ? 'text-right ' : col.align === 'center' ? 'text-center ' : 'text-left ') +
                                                (col.className || '')
                                            }
                                        >
                                            {col.render ? col.render(row) : (row[col.key] ?? '-')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {!loading && totalItems > 0 && (
                <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#64748b]">
                    <div className="flex items-center gap-2">
                        <span>Menampilkan</span>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="bg-[#f8fafc] border-none rounded-lg text-xs font-semibold py-1 px-2 text-[#263b53] focus:ring-1 focus:ring-[#263b53]"
                        >
                            {[5, 10, 20, 50].map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span>dari <strong className="text-[#263b53]">{totalItems}</strong> data</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-[#263b53] font-semibold hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            type="button"
                        >
                            Sebelumnya
                        </button>
                        <span className="px-3 py-1.5 font-bold text-[#263b53]">
                            {currentPage} / {totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 text-[#263b53] font-semibold hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                            type="button"
                        >
                            Selanjutnya
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
