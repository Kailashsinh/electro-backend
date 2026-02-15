var mongoose = require('mongoose');
var Technician = require('./src/models/Technician');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected.');
    const techs = await Technician.find({}).sort({ createdAt: -1 });
    console.log(`Found ${techs.length} technicians.`);
    techs.forEach(t => {
        console.log(`- ${t.name} (${t._id}): ${JSON.stringify(t.location)}`);
    });
    process.exit();
}).catch(err => console.error(err));
