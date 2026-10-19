import React from 'react';

export function TableSkeleton({ rows = 5, cols = 5 }) {
    return (
        <div className="w-full animate-pulse space-y-3 py-2">
            {[...Array(rows)].map((_, r) => (
                <div key={r} className="flex items-center gap-4 py-3 border-b border-slate-100">
                    {[...Array(cols)].map((_, c) => (
                        <div
                            key={c}
                            className="h-4 bg-slate-200 rounded-lg flex-1"
                            style={{ maxWidth: c === 0 ? '25%' : '100%' }}
                        ></div>
                    ))}
                </div>
            ))}
        </div>
    );
}

export function CardSkeleton({ count = 4 }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-100 rounded-2xl p-4 flex flex-col justify-between">
                    <div className="h-4 w-24 bg-slate-200 rounded"></div>
                    <div className="h-7 w-32 bg-slate-200 rounded"></div>
                    <div className="h-3 w-20 bg-slate-200 rounded"></div>
                </div>
            ))}
        </div>
    );
}
