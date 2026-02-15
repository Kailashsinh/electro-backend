const mongoose = require('mongoose');
require('dotenv').config();

const Technician = require('./src/models/Technician');

async function main() {
    console.log('Script started');
    try {
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI missing');
        }
        console.log('Connecting to DB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected.');

        const latestTech = await Technician.findOne().sort({ createdAt: -1 });
        if (latestTech) {
            console.log('LATEST_TECH_FOUND');
            console.log(JSON.stringify({
                id: latestTech._id,
                name: latestTech.name,
                location: latestTech.location
            }, null, 2));

            
            // const result = await Technician.updateMany(
            //     { _id: { $ne: latestTech._id } },
            //     { location: latestTech.location }
            // );
            // console.log(`Updated ${result.modifiedCount} technicians.`);
        } else {
            console.log('No technicians found.');
        }

    } catch (error) {
        console.error('ERROR:', error);
    } finally {
        console.log('Closing connection');
        await mongoose.connection.close();
        console.log('Done');
    }
}

main();
