const { geocodeAddress, findNearestTechnicians } = require('./src/utils/geo');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

async function test() {
    let output = "";
    function log(msg) {
        console.log(msg);
        output += msg + "\n";
    }

    log("--- Testing Geocoding Utility ---");
    const address = {
        street: "radhe accomidation,elisbridge",
        city: "ahmedabad",
        pincode: "380006"
    };

    const coords = await geocodeAddress(address);
    if (coords) {
        log(`✅ Geocoding works: Lat ${coords[0]}, Lng ${coords[1]}`);

        await mongoose.connect(process.env.MONGO_URI);
        log("Connected to DB");

        log("\n--- Testing Radius Search with result ---");
        // Radius of 20km
        const techs = await findNearestTechnicians(coords[0], coords[1], address.pincode, 20);
        log(`Found ${techs.length} technicians.`);
        techs.forEach(t => log(`- ${t.name} (${t.pincode}) at ${JSON.stringify(t.location.coordinates)}`));

        await mongoose.disconnect();
    } else {
        log("❌ Geocoding failed.");
    }
    fs.writeFileSync('verify_output.log', output);
    console.log("Verification log written to verify_output.log");
}

test().catch(console.error);
