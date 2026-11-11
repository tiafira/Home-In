import React from 'react';

export default function SkeletonCard({ type = 'room', count = 1 }) {
    const items = Array.from({ length: count });

    if (type === 'room') {
        return (
            <>
                {items.map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm animate-pulse"
                    >
                        <div className="aspect-[4/3] w-full bg-slate-200" />
                        <div className="p-5 space-y-3">
                            <div className="h-3 w-1/3 bg-slate-200 rounded-md" />
                            <div className="h-5 w-2/3 bg-slate-200 rounded-md" />
                            <div className="flex gap-2 pt-1">
                                <div className="h-4 w-16 bg-slate-200 rounded-md" />
                                <div className="h-4 w-16 bg-slate-200 rounded-md" />
                            </div>
                        </div>
                        <div className="p-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                            <div className="h-6 w-24 bg-slate-200 rounded-md" />
                            <div className="h-8 w-20 bg-slate-200 rounded-xl" />
                        </div>
                    </div>
                ))}
            </>
        );
    }

    if (type === 'branch') {
        return (
            <>
                {items.map((_, i) => (
                    <div
                        key={i}
                        className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm animate-pulse space-y-4"
                    >
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-12 rounded-2xl bg-slate-200" />
                            <div className="h-6 w-24 bg-slate-200 rounded-full" />
                        </div>
                        <div className="h-6 w-3/4 bg-slate-200 rounded-md" />
                        <div className="h-4 w-full bg-slate-200 rounded-md" />
                        <div className="flex gap-2">
                            <div className="h-6 w-20 bg-slate-200 rounded-xl" />
                            <div className="h-6 w-28 bg-slate-200 rounded-xl" />
                        </div>
                        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                            <div className="h-6 w-24 bg-slate-200 rounded-md" />
                            <div className="h-8 w-24 bg-slate-200 rounded-xl" />
                        </div>
                    </div>
                ))}
            </>
        );
    }

    return null;
}

