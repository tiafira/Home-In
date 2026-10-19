import React, { useState } from 'react';
import Header from '../Components/Admin/Header';
import Sidebar from '../Components/Admin/Sidebar';

export default function AdminLayout({
    children,
    title,
    subtitle,
    occupancy,
    bookingCount,
    onAddPenghuniClick,
}) {
    const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc] text-[#263b53] font-sans antialiased">
            {/* Sticky Full-width Header */}
            <Header
                onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
                bookingRequestCount={bookingCount}
            />

            {/* Main Body: Fixed Full-Height Sidebar + Scrollable Content Area */}
            <div className="flex-1 flex flex-row overflow-hidden relative">
                <Sidebar
                    occupancy={occupancy}
                    bookingCount={bookingCount}
                    onAddPenghuniClick={onAddPenghuniClick}
                    mobileOpen={mobileSidebarOpen}
                    onCloseMobile={() => setMobileSidebarOpen(false)}
                />

                {/* Only this main content area scrolls */}
                <main className="flex-1 h-[calc(100vh-72px)] overflow-y-auto main-scroll p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        {title && (
                            <div className="mb-6">
                                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#263b53] tracking-tight">
                                    {title}
                                </h1>
                                {subtitle && (
                                    <p className="text-sm text-[#64748b] mt-0.5">{subtitle}</p>
                                )}
                            </div>
                        )}
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
