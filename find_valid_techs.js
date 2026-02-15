const mongoose = require('mongoose');
require('dotenv').config();
const Technician = require('./src/models/Technician');

async function main() {
    try {
        await mongoose.connect(process.env.MONGO_URI);

        
        const validTechs = await Technician.find({
            'location.coordinates': { $elemMatch: { $ne: 0 } }
        });

        if (validTechs.length > 0) {
            const best = validTechs[validTechs.length - 1]; 
            console.log('VALID_TECH_FOUND');
            console.log(JSON.stringify(best.location));

            
            await Technician.updateMany(
                { 'location.coordinates': { $all: [0, 0] } },
                { location: best.location }
            );
            console.log('Updated zero-location technicians to match valid one.');
        } else {
            console.log('NO_VALID_TECH_FOUND');
            
            const defaultLoc = { type: 'Point', coordinates: [72.5714, 23.0225] };
            await Technician.updateMany(
                { 'location.coordinates': { $all: [0, 0] } },
                { location: defaultLoc }
            );
            console.log('Updated all zero-location technicians to default [72.5714, 23.0225].');
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.connection.close();
    }
}
main();
