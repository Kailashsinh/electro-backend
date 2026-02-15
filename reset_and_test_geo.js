var mongoose = require('mongoose');
var Technician = require('./src/models/Technician');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected.');

    
    await Technician.updateMany({}, { status: 'active', is_available: true, location: { type: 'Point', coordinates: [0, 0] } });
    console.log('Reset all technicians to active, available, and at [0,0].');

    const latestTech = await Technician.findOne().sort({ createdAt: -1 });
    if (latestTech) {
        console.log(`Latest Tech: ${latestTech.name}, Location: ${JSON.stringify(latestTech.location)}`);

        
    } else {
        console.log('No technicians found.');
    }

    const found = await Technician.find({
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates: [lng, lat],
                },
                $maxDistance: maxDistanceKm * 1000,
            },
        },
        status: 'active',
        is_available: true,
    });

    console.log(`Geo Query Found: ${found.length} technicians.`);
    found.forEach(t => console.log(`- ${t.name}`));

    process.exit();
}).catch(err => console.error(err));
