const Technician = require('../models/Technician');
const axios = require('axios');

/**
 * Geocode address details into [lat, lng] using OpenStreetMap (Nominatim)
 * @param {Object} details - { street, city, pincode }
 * @returns {Promise<Array|null>} - [lat, lng] or null
 */
exports.geocodeAddress = async (details) => {
    try {
        if (!details) return null;

        // Construct query string: street, city, pincode, India (hardcoded for now as it's a local app)
        const queryParts = [];
        if (details.street) queryParts.push(details.street);
        if (details.city) queryParts.push(details.city);
        if (details.pincode) queryParts.push(details.pincode);
        queryParts.push("India");

        const q = queryParts.join(", ");
        console.log(`[Geocoding] Searching for: ${q}`);

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`;

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'ElectroCare-App/1.0'
            }
        });

        if (response.data && response.data.length > 0) {
            const lat = parseFloat(response.data[0].lat);
            const lng = parseFloat(response.data[0].lon);
            console.log(`[Geocoding] Success: Lat ${lat}, Lng ${lng}`);
            return [lat, lng];
        }

        // Fallback: Try just City and Pincode
        if (details.city && details.pincode) {
            console.log(`[Geocoding] Primary failed, trying fallback (City + Pincode)...`);
            const fallbackQ = `${details.city}, ${details.pincode}, India`;
            const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQ)}&limit=1`;

            const fallbackRes = await axios.get(fallbackUrl, {
                headers: { 'User-Agent': 'ElectroCare-App/1.0' }
            });

            if (fallbackRes.data && fallbackRes.data.length > 0) {
                const lat = parseFloat(fallbackRes.data[0].lat);
                const lng = parseFloat(fallbackRes.data[0].lon);
                console.log(`[Geocoding] Fallback Success: Lat ${lat}, Lng ${lng}`);
                return [lat, lng];
            }
        }

        console.warn(`[Geocoding] No results found for: ${q}`);
        return null;
    } catch (error) {
        console.error('[Geocoding] Error:', error.message);
        return null;
    }
};

/**
 * Find nearest technicians
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} pincode - Pincode for fallback
 * @param {number} maxDistanceKm - Radius in KM (default 20)
 * @returns {Promise<Array>} - List of technicians
 */
exports.findNearestTechnicians = async (lat, lng, pincode, maxDistanceKm = 20) => {
    try {
        let query = {
            status: { $in: ['active', 'busy'] },
            verificationStatus: 'approved'
        };

        // 1. Geo Query (Priority)
        if (lat && lng && lat !== 0 && lng !== 0) {
            console.log(`[GeoSearch] Querying for Lat: ${lat}, Lng: ${lng}, MaxDist: ${maxDistanceKm}km`);
            query.location = {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)], // GeoJSON: [lng, lat]
                    },
                    $maxDistance: maxDistanceKm * 1000, // meters
                },
            };
        }
        // 2. Pincode Query (Fallback)
        else if (pincode) {
            console.log(`[GeoSearch] Querying for Pincode: ${pincode}`);
            query.pincode = pincode;
        }
        else {
            return [];
        }

        const technicians = await Technician.find(query).select('_id name phone rating location pincode');
        console.log(`[GeoSearch] Found ${technicians.length} technicians.`);
        return technicians;
    } catch (error) {
        console.error('Geo Search Error:', error);
        return [];
    }
};
