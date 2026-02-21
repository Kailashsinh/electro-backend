const mongoose = require('mongoose');
const ServiceRequest = require('./src/models/ServiceRequest');
const Technician = require('./src/models/Technician');
const RequestQueue = require('./src/models/RequestQueue');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const fs = require('fs');

function log(msg) {
    console.log(msg);
    fs.appendFileSync('debug_state.log', msg + '\n');
}

async function debugState() {
    fs.writeFileSync('debug_state.log', ''); // Clear file
    try {
        await mongoose.connect(process.env.MONGO_URI);
        log("Connected to DB");

        // 1. Get Latest Service Request
        const request = await ServiceRequest.findOne().sort({ createdAt: -1 });
        if (!request) {
            log("❌ No Service Request found!");
            return;
        }
        log("\n--- Latest Service Request ---");
        log(`ID: ${request._id}`);
        log(`Status: ${request.status}`);
        log(`Location: ` + JSON.stringify(request.location));
        log(`Address: ` + JSON.stringify(request.address_details));
        log(`Broadcasted To: ${request.broadcasted_to.length} technicians`);
        log(`IDs: ${request.broadcasted_to.join(', ')}`);

        // 2. Get All Technicians
        const technicians = await Technician.find({});
        log(`\n--- Technicians (${technicians.length}) ---`);

        for (const tech of technicians) {
            log(`\nTech: ${tech.name} (${tech._id})`);
            log(`Status: ${tech.status}, Available: ${tech.is_available}`);
            log(`Pincode: ${tech.pincode}`);
            log(`Location: ` + JSON.stringify(tech.location));

            // Calculate distance if both have location
            if (request.location?.coordinates && tech.location?.coordinates) {
                const [reqLng, reqLat] = request.location.coordinates;
                const [techLng, techLat] = tech.location.coordinates;

                const dist = getDistanceFromLatLonInKm(reqLat, reqLng, techLat, techLng);
                log(`Distance to Request: ${dist.toFixed(2)} km`);

                if (dist < 20) {
                    log("✅ Within 20km range");
                    const wasBroadcasted = request.broadcasted_to.map(id => id.toString()).includes(tech._id.toString());
                    log(`Was Broadcasted? ${wasBroadcasted ? "YES" : "NO"}`);

                    if (!wasBroadcasted) {
                        log("⚠️ WHY MISSED? Check if tech was available at creation time.");
                    }
                } else {
                    log("❌ Out of range (>20km)");
                }
            } else {
                log("⚠️ Location data missing for distance calc");
            }
        }

        // 3. Check RequestQueue
        log("\n--- Request Queue Entries ---");
        const queue = await RequestQueue.find({ request_id: request._id });
        log(`Found ${queue.length} queue entries for this request.`);
        queue.forEach(q => log(`- Tech: ${q.technician_id}, Status: ${q.response_status}`));

    } catch (err) {
        log("ERROR: " + err.stack);
    } finally {
        await mongoose.disconnect();
    }
}

function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371; // Radius of the earth in km
    var dLat = deg2rad(lat2 - lat1);  // deg2rad below
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Distance in km
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

debugState();
