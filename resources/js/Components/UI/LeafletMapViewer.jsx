import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

export default function LeafletMapViewer({
    latitude = -6.2941234,
    longitude = 106.7995678,
    title = 'Lokasi Cabang Home-In',
    address = '',
    height = '320px',
    zoom = 16,
    className = '',
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        const lat = parseFloat(latitude) || -6.2941234;
        const lng = parseFloat(longitude) || 106.7995678;

        // Cleanup existing map instance if any
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        // Initialize Map
        const map = L.map(mapContainerRef.current, {
            center: [lat, lng],
            zoom: zoom,
            scrollWheelZoom: false,
            zoomControl: true,
        });

        // Add OpenStreetMap Tile Layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        // Modern SVG Pin Icon
        const pinIcon = L.divIcon({
            className: 'custom-leaflet-marker',
            html: `
                <div style="position: relative; width: 36px; height: 36px; transform: translate(-50%, -100%); filter: drop-shadow(0 6px 10px rgba(30,95,201,0.4)); cursor: pointer;">
                    <div style="background: #1E5FC9; width: 36px; height: 36px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; border: 2px solid white;">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="white" style="transform: rotate(45deg);">
                            <path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3z"/>
                        </svg>
                    </div>
                </div>
            `,
            iconSize: [36, 36],
            iconAnchor: [18, 36],
            popupAnchor: [0, -36],
        });

        // Add Marker
        const marker = L.marker([lat, lng], { icon: pinIcon }).addTo(map);

        const gmapsLink = `https://www.google.com/maps?q=${lat},${lng}`;
        const popupContent = `
            <div style="font-family: 'Poppins', sans-serif; padding: 4px 2px; min-width: 180px;">
                <p style="font-weight: 800; font-size: 13px; color: #1F2A44; margin: 0 0 4px 0;">${title}</p>
                ${address ? `<p style="font-size: 11px; color: #64748b; margin: 0 0 8px 0; line-height: 1.4;">${address}</p>` : ''}
                <a href="${gmapsLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; font-size: 11px; font-weight: 700; color: #1E5FC9; text-decoration: underline;">
                    📍 Buka di Google Maps &rarr;
                </a>
            </div>
        `;

        marker.bindPopup(popupContent);

        // Invalidate map size after a tiny tick so container width is accurate
        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [latitude, longitude, title, address, zoom]);

    const activeGmapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;

    return (
        <div className={`relative rounded-2xl overflow-hidden border border-slate-200/80 shadow-inner ${className}`}>
            <div ref={mapContainerRef} style={{ height: height, width: '100%', zIndex: 10 }} />
            <div className="absolute top-3 right-3" style={{ zIndex: 1000 }}>
                <a
                    href={activeGmapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 bg-white/95 hover:bg-white text-[#1E5FC9] text-xs font-bold rounded-xl shadow-md border border-slate-200 flex items-center gap-1.5 transition hover:shadow-lg cursor-pointer"
                >
                    <svg className="w-3.5 h-3.5 text-rose-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>Buka Google Maps ↗</span>
                </a>
            </div>
        </div>
    );
}

