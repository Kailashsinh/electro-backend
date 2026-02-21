const mongoose = require('mongoose');
const Technician = require('./src/models/Technician');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Rate limit helper
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fixPincodes() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Connected to DB");

        const technicians = await Technician.find({});
        console.log(`Found ${technicians.length} technicians.`);

        for (const tech of technicians) {
            if (tech.pincode) {
                console.log(`✅ ${tech.name} already has pincode: ${tech.pincode}`);
                continue;
            }

            if (tech.location && tech.location.coordinates && tech.location.coordinates.length === 2) {
                const [lng, lat] = tech.location.coordinates;
                console.log(`📍 Processing ${tech.name} (${lat}, ${lng})...`);

                try {
                    // Reverse Geocode
                    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
                    const res = await axios.get(url, { headers: { 'User-Agent': 'ElectroCare-FixScript/1.0' } });

                    const address = res.data.address;
                    const pincode = address.postcode;

                    if (pincode) {
                        tech.pincode = pincode;
                        await tech.save();
                        console.log(`   🎉 Updated pincode to: ${pincode}`);
                    } else {
                        console.log(`   ⚠️ No postcode found in response.`);
                    }
                } catch (err) {
                    console.error(`   ❌ Failed to reverse geocode: ${err.message}`);
                }

                // Wait 1s to be nice to Nominatim
                await delay(1000);
            } else {
                console.log(`   ⚠️ No valid location coordinates.`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}

fixPincodes();
