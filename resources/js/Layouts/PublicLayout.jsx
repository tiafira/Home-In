import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import PublicNavbar from '../Components/Public/PublicNavbar';
import PublicFooter from '../Components/Public/PublicFooter';
import FaqBubble from '../Components/Public/FaqBubble';

export default function PublicLayout({ children, title }) {
    const location = useLocation();

    useEffect(() => {
        if (title) {
            document.title = `${title} | Home-In Kost Modern`;
        } else {
            document.title = 'Home-In - Hunian Kost Modern, Bersih & Nyaman';
        }
        window.scrollTo(0, 0);
    }, [title, location.pathname]);

    return (
        <div className="min-h-screen flex flex-col bg-[#F4F6FA] text-[#1F2A44] font-['Montserrat',sans-serif] antialiased selection:bg-[#1E5FC9] selection:text-white">
            <PublicNavbar />
            <main className="flex-1 w-full">
                {children}
            </main>
            <PublicFooter />
            {/* Floating FAQ Bubble */}
            <FaqBubble />
        </div>
    );
}

