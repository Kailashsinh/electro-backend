const mongoose = require('mongoose');
const { findNearestTechnicians } = require('./src/utils/geo');
const Technician = require('./src/models/Technician');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function verifyFallback() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        // 1. Find a technician with a known pincode
        const tech = await Technician.findOne({ pincode: { $exists: true, $ne: null } });
        if (!tech) {
            console.log("❌ No technician with pincode found!");
            return;
        }
        console.log(`Testing with Tech: ${tech.name}, Pincode: ${tech.pincode}`);

        // 2. Simulate finding technicians with 0,0 lat/lng and that pincode
        console.log("Simulating search with Lat: 0, Lng: 0, Pincode: " + tech.pincode);
        const matches = await findNearestTechnicians(0, 0, tech.pincode);

        // 3. Verify results
        console.log(`Found ${matches.length} matches.`);
        const found = matches.find(m => m._id.toString() === tech._id.toString());

        if (found) {
            console.log("✅ SUCCESS: Technician matched via Pincode!");
        } else {
            console.log("❌ FAILURE: Technician NOT matched.");
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

verifyFallback();
