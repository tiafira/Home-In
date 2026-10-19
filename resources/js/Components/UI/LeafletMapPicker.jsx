import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// Modern SVG Location Pin DivIcon so Vite never fails to load marker images
const createPinIcon = (color = '#e11d48') => {
    return L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
            <div style="position: relative; width: 32px; height: 32px; transform: translate(-50%, -100%); filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3)); cursor: pointer;">
                <svg viewBox="0 0 24 24" width="32" height="32" fill="${color}">
                    <path d="M12 0C7.58 0 4 3.58 4 8c0 5.25 7 13 8 13s8-7.75 8-13c0-4.42-3.58-8-8-8zm0 11c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
                </svg>
            </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
    });
};

export default function LeafletMapPicker({
    latitude = -6.8869,
    longitude = 107.5356,
    onChange,
    interactive = true,
    height = '280px',
    zoom = 16,
}) {
    const mapContainerRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    // Reverse geocode helper (Nominatim)
    const reverseGeocode = async (lat, lng) => {
        try {
            const res = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
            );
            const data = await res.json();
            return data.display_name || '';
        } catch (e) {
            return '';
        }
    };

    const handleLocationSelected = async (lat, lng) => {
        if (!onChange) return;
        const fixedLat = parseFloat(Number(lat).toFixed(7));
        const fixedLng = parseFloat(Number(lng).toFixed(7));

        // Immediately update lat/lng
        onChange({ lat: fixedLat, lng: fixedLng, address: '' });

        // Then try reverse geocoding
        const address = await reverseGeocode(fixedLat, fixedLng);
        if (address) {
            onChange({ lat: fixedLat, lng: fixedLng, address });
        }
    };

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // If map instance already exists, cleanup before re-initializing
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
        }

        const validLat = Number.isFinite(Number(latitude)) ? Number(latitude) : -6.8869;
        const validLng = Number.isFinite(Number(longitude)) ? Number(longitude) : 107.5356;

        const map = L.map(mapContainerRef.current, {
            center: [validLat, validLng],
            zoom: zoom,
            scrollWheelZoom: interactive,
            zoomControl: true,
        });

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap kontributor',
        }).addTo(map);

        const icon = createPinIcon();
        const marker = L.marker([validLat, validLng], {
            icon,
            draggable: interactive,
        }).addTo(map);

        if (interactive) {
            marker.bindPopup('<b>Titik Lokasi Gedung</b><br/>Geser atau klik peta untuk memindahkan pin.').openPopup();

            marker.on('dragend', () => {
                const position = marker.getLatLng();
                handleLocationSelected(position.lat, position.lng);
            });

            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                marker.setLatLng([lat, lng]);
                map.panTo([lat, lng]);
                handleLocationSelected(lat, lng);
            });
        }

        mapInstanceRef.current = map;
        markerRef.current = marker;

        // Fix modal sizing rendering glitch
        const timer = setTimeout(() => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.invalidateSize();
            }
        }, 250);

        return () => {
            clearTimeout(timer);
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Sync external latitude/longitude changes to existing map
    useEffect(() => {
        if (!mapInstanceRef.current || !markerRef.current) return;
        const validLat = Number.isFinite(Number(latitude)) ? Number(latitude) : -6.8869;
        const validLng = Number.isFinite(Number(longitude)) ? Number(longitude) : 107.5356;

        const currentPos = markerRef.current.getLatLng();
        if (Math.abs(currentPos.lat - validLat) > 0.00001 || Math.abs(currentPos.lng - validLng) > 0.00001) {
            markerRef.current.setLatLng([validLat, validLng]);
            mapInstanceRef.current.panTo([validLat, validLng]);
        }
    }, [latitude, longitude]);

    return (
        <div className="relative rounded-xl overflow-hidden border border-slate-300 shadow-inner bg-slate-100">
            <div ref={mapContainerRef} style={{ width: '100%', height }} />
            {interactive && (
                <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-xs pointer-events-none">
                    👆 Klik atau geser pin pada peta untuk memilih titik lokasi
                </div>
            )}
        </div>
    );
}

