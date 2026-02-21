const axios = require('axios');
const mongoose = require('mongoose');
const Technician = require('./src/models/Technician');
const { findNearestTechnicians } = require('./src/utils/geo');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
console.log("Dotenv loaded from:", path.resolve(__dirname, '.env'));

const TEST_ADDRESS = "B-12, Ambika Park Society, Near Shiv Vidhyalay, Vasna Barej Road, City: Ahmedabad, Pin: 380007";

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('verification.log', msg + '\n');
}

async function verifyFlow() {
    fs.writeFileSync('verification.log', ''); // Clear file
    log("🚀 Starting Verification Flow for Address: " + TEST_ADDRESS);

    if (!process.env.MONGO_URI) {
        log("❌ MONGO_URI is undefined! Check .env file.");
        return;
    } else {
        log("✅ MONGO_URI found (starts with): " + process.env.MONGO_URI.substring(0, 15));
    }

    // 1. Simulate Frontend Geocoding
    console.log("\n--- Step 1: Simulating Frontend Geocoding ---");
    let coords = { lat: 0, lng: 0 };
    try {
        const query = "B-12, Ambika Park Society, Near Shiv Vidhyalay, Vasna Barej Road, Ahmedabad, 380007";
        // Using a slightly cleaner query string for better nominatim results, similar to how a user might enter or how we'd format it
        // Actually, let's use the exact raw string user gave, but maybe split by comma for better search if raw fails?
        // Let's try the user's specific string first.

        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(TEST_ADDRESS)}`;
        console.log("Fetching:", url);

        const res = await axios.get(url, { headers: { 'User-Agent': 'ElectroCare-Test/1.0' } });

        if (res.data && res.data.length > 0) {
            coords.lat = parseFloat(res.data[0].lat);
            coords.lng = parseFloat(res.data[0].lon);
            console.log("✅ Geocoding Successful!");
            console.log(`   Found: ${res.data[0].display_name}`);
            console.log(`   Coordinates: Lat ${coords.lat}, Lng ${coords.lng}`);
        } else {
            console.log("❌ Geocoding Failed (No results). Nominatim might be strict.");
            console.log("   Trying fallback query (City + Pincode)...");
            const fallbackUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent("Ahmedabad 380007")}`;
            const resFallback = await axios.get(fallbackUrl, { headers: { 'User-Agent': 'ElectroCare-Test/1.0' } });
            if (resFallback.data && resFallback.data.length > 0) {
                coords.lat = parseFloat(resFallback.data[0].lat);
                coords.lng = parseFloat(resFallback.data[0].lon);
                console.log("✅ Fallback Geocoding Successful!");
                console.log(`   Coordinates: Lat ${coords.lat}, Lng ${coords.lng}`);
            } else {
                console.error("❌ All Geocoding Failed. Cannot proceed with coordinate test.");
                return;
            }
        }
    } catch (err) {
        console.error("❌ Geocoding Error:", err.message);
        return;
    }

    // 2. Connect to DB
    console.log("\n--- Step 2: Connecting to Backend DB ---");
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB");

    // 3. Create Dummy Technician nearby (e.g., 2km away)
    // Simple math: 1 deg lat ~= 111km. 0.01 deg ~= 1.1km.
    // Let's position tech at lat + 0.01, lng + 0.01 (approx 1.5km away)
    const techLat = coords.lat + 0.01;
    const techLng = coords.lng + 0.01;

    console.log(`\n--- Step 3: Creating Test Technician at Lat ${techLat}, Lng ${techLng} ---`);
    const testTechEmail = `test_tech_${Date.now()}@electrocare.com`;
    const testTech = await Technician.create({
        name: "Test Scenerio Tech",
        email: testTechEmail,
        phone: `999${Date.now().toString().slice(-7)}`,
        password: "hashedpassword123",
        skills: ["AC"],
        status: "active",
        is_available: true,
        location: {
            type: 'Point',
            coordinates: [techLng, techLat] // GeoJSON is [lng, lat]
        },
        pincode: "380007"
    });
    log("✅ Test Technician Created: " + testTech._id);

    // 4. Test Matching Logic
    log("\n--- Step 4: Testing Matching Logic ---");
    try {
        // Matching by GPS
        log("Testing GPS matching...");
        const matches = await findNearestTechnicians(coords.lat, coords.lng, undefined, 20); // 20km radius

        const found = matches.find(t => t._id.toString() === testTech._id.toString());
        if (found) {
            log("🎉 SUCCESS: Technician was found via GPS matching!");
        } else {
            log("⚠️ WARNING: Technician NOT found via GPS. Check distance.");
            log("Matches found: " + matches.map(m => m.name).join(', '));

            // Debug distance
            // ...
        }

        // Matching by Pincode (Fallback test)
        log("\nTesting Pincode matching (Simulating GPS failure)...");
        const pincodeMatches = await findNearestTechnicians(0, 0, "380007");
        const foundPincode = pincodeMatches.find(t => t._id.toString() === testTech._id.toString());
        if (foundPincode) {
            log("🎉 SUCCESS: Technician was found via Pincode matching!");
        } else {
            log("⚠️ WARNING: Technician NOT found via Pincode.");
        }

    } catch (err) {
        log("Matching Error: " + err.stack);
    }

    // 5. Cleanup
    log("\n--- Step 5: Cleanup ---");
    await Technician.findByIdAndDelete(testTech._id);
    log("Test Technician Deleted");
    await mongoose.disconnect();
    log("Done.");
}

verifyFlow().catch(err => log("FATAL ERROR: " + err.stack));
