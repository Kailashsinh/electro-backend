const Technician = require('../models/Technician');

/**
 * Find nearest technicians
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} maxDistanceKm - Radius in KM (default 20)
 * @returns {Promise<Array>} - List of technicians
 */
exports.findNearestTechnicians = async (lat, lng, pincode, maxDistanceKm = 20) => {
    try {
        let query = {
            status: 'active',
            is_available: true,
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
