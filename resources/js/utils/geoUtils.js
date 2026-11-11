/**
 * Smart coordinate parser from various Google Maps formats and direct inputs.
 */
export function parseLatLngFromInput(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // 1. Direct coordinate match with comma, semicolon, or space:
    // e.g. "-6.886912, 107.535612" or "(-6.886912, 107.535612)" or "-6.886912 107.535612"
    const coordRegex = /(-?\d{1,2}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)/;
    const match = trimmed.match(coordRegex);
    if (match) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            if (String(match[1]).includes('.') || String(match[2]).includes('.')) {
                return { lat: parseFloat(lat.toFixed(7)), lng: parseFloat(lng.toFixed(7)) };
            }
        }
    }

    // 2. Google Maps URL with @lat,lng e.g. /@-6.8869,107.5356
    const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
        return { lat: parseFloat(parseFloat(atMatch[1]).toFixed(7)), lng: parseFloat(parseFloat(atMatch[2]).toFixed(7)) };
    }

    // 3. Google Maps URL with ?q=lat,lng or &q=lat,lng or ll=lat,lng
    const qMatch = trimmed.match(/[?&](?:q|ll|sll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
        return { lat: parseFloat(parseFloat(qMatch[1]).toFixed(7)), lng: parseFloat(parseFloat(qMatch[2]).toFixed(7)) };
    }

    // 4. Google Maps URL with /search/lat,+lng or /place/lat,+lng
    const searchUrlMatch = trimmed.match(/\/(?:search|place)\/(-?\d+\.\d+),\+?(-?\d+\.\d+)/);
    if (searchUrlMatch) {
        return { lat: parseFloat(parseFloat(searchUrlMatch[1]).toFixed(7)), lng: parseFloat(parseFloat(searchUrlMatch[2]).toFixed(7)) };
    }

    // 5. Google Maps URL with !3dlat!4dlng (standard desktop embed/share link)
    const bangMatch = trimmed.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    if (bangMatch) {
        return { lat: parseFloat(parseFloat(bangMatch[1]).toFixed(7)), lng: parseFloat(parseFloat(bangMatch[2]).toFixed(7)) };
    }

    // 6. Google Maps URL with !2dlng!3dlat
    const reverseBangMatch = trimmed.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    if (reverseBangMatch) {
        return { lat: parseFloat(parseFloat(reverseBangMatch[2]).toFixed(7)), lng: parseFloat(parseFloat(reverseBangMatch[1]).toFixed(7)) };
    }

    // 7. DMS (Degrees Minutes Seconds) e.g. 6°53'12.8"S 107°32'08.2"E
    const dmsMatch = trimmed.match(/(\d+)[°\s]+(\d+)['\s]+([\d.]+)["]?\s*([NSns])\s*[,;\s]*(\d+)[°\s]+(\d+)['\s]+([\d.]+)["]?\s*([EWew])/);
    if (dmsMatch) {
        let lat = parseInt(dmsMatch[1], 10) + parseInt(dmsMatch[2], 10) / 60 + parseFloat(dmsMatch[3]) / 3600;
        if (dmsMatch[4].toUpperCase() === 'S') lat = -lat;
        let lng = parseInt(dmsMatch[5], 10) + parseInt(dmsMatch[6], 10) / 60 + parseFloat(dmsMatch[7]) / 3600;
        if (dmsMatch[8].toUpperCase() === 'W') lng = -lng;
        return { lat: parseFloat(lat.toFixed(7)), lng: parseFloat(lng.toFixed(7)) };
    }

    return null;
}

/**
 * Extract Kecamatan and Kota from address string.
 * Example: "Kp Babakan Sari RT03/RW03, Padasuka, Cimahi Tengah, Cimahi, Jawa Barat" -> "Cimahi Tengah, Kota Cimahi"
 */
export function extractKecamatanKota(alamat, fallback = 'Cimahi Tengah, Kota Cimahi') {
    if (!alamat || typeof alamat !== 'string') return fallback;

    // Check for explicit "Kecamatan" or "Kec." and "Kota" or "Kab."
    const kecMatch = alamat.match(/(?:kecamatan|kec\.)\s*([^,]+)/i);
    const kotaMatch = alamat.match(/(?:kota|kabupaten|kab\.)\s*([^,]+)/i);

    if (kecMatch && kotaMatch) {
        return `Kec. ${kecMatch[1].trim()}, Kota ${kotaMatch[1].trim()}`;
    }

    const segments = alamat.split(',').map((s) => s.trim()).filter(Boolean);

    // Look for segment containing "Kota" or "Kabupaten" or known cities
    let kota = '';
    let kec = '';

    for (let i = segments.length - 1; i >= 0; i--) {
        const seg = segments[i];
        if (!kota && (/(kota|kabupaten|kab\.)/i.test(seg) || /(cimahi|bandung|jakarta|surabaya|semarang|yogyakarta)/i.test(seg))) {
            if (!/jawa|dki|daerah istimewa/i.test(seg)) {
                kota = seg.replace(/^(kota|kabupaten|kab\.)\s*/i, '').trim();
                if (i > 0) {
                    kec = segments[i - 1].replace(/^(kecamatan|kec\.)\s*/i, '').trim();
                }
                break;
            }
        }
    }

    if (kec && kota) {
        const kotaPrefix = /kota/i.test(kota) ? kota : `Kota ${kota}`;
        return `${kec}, ${kotaPrefix}`;
    }

    if (segments.length >= 4) {
        const k = segments[segments.length - 2].replace(/^(kota|kabupaten|kab\.)\s*/i, '').trim();
        const kc = segments[segments.length - 3].replace(/^(kecamatan|kec\.)\s*/i, '').trim();
        return `${kc}, Kota ${k}`;
    }

    if (segments.length === 3) {
        if (/kota|kab/i.test(segments[2])) {
            return `${segments[1]}, ${segments[2]}`;
        }
        return `${segments[2]}, Kota Cimahi`;
    }

    if (segments.length === 2) {
        return `${segments[0]}, ${segments[1]}`;
    }

    return fallback;
}

