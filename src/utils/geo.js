const Technician = require('../models/Technician');

/**
 * Find nearest technicians
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} maxDistanceKm - Radius in KM (default 20)
 * @returns {Promise<Array>} - List of technicians
 */
exports.findNearestTechnicians = async (lat, lng, maxDistanceKm = 20) => {
    try {
        // 1. Ensure coordinates are valid numbers
        if (!lat || !lng) return [];

        // 2. Query
        console.log(`[GeoSearch] Querying for Lat: ${lat}, Lng: ${lng}, MaxDist: ${maxDistanceKm}km`);
        const technicians = await Technician.find({
            location: {
                $near: {
                    $geometry: {
                        type: 'Point',
                        coordinates: [parseFloat(lng), parseFloat(lat)], // GeoJSON: [lng, lat]
                    },
                    $maxDistance: maxDistanceKm * 1000, // meters
                },
            },
            status: 'active',      // Only active
            is_available: true,    // Only available
        }).select('_id name phone rating location');

        console.log(`[GeoSearch] Found ${technicians.length} technicians.`);
        return technicians;
    } catch (error) {
        console.error('Geo Search Error:', error);
        return [];
    }
};
