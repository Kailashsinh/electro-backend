var mongoose = require('mongoose');
var Technician = require('./src/models/Technician');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to DB');
    const techs = await Technician.find({});
    console.log(`Total Technicians: ${techs.length}`);
    const activeAvailable = techs.filter(t => t.status === 'active' && t.is_available);
    console.log(`Active & Available: ${activeAvailable.length}`);
    activeAvailable.forEach(t => console.log(`- ${t.name} (${t.location.coordinates})`));
    console.log('--- All Techs ---');
    techs.forEach(t => console.log(`${t.name}: ${t.status}, ${t.is_available}`));
    const latestRequest = await mongoose.model('ServiceRequest', new mongoose.Schema({
        broadcasted_to: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Technician' }],
        status: String
    }, { strict: false })).findOne().sort({ _id: -1 }).populate('broadcasted_to');

    if (latestRequest) {
        console.log('Latest Request:', latestRequest._id);
        console.log('Status:', latestRequest.status);
        console.log('Broadcasted To:', latestRequest.broadcasted_to.length, 'technicians');
        latestRequest.broadcasted_to.forEach(t => console.log(`- ${t.name} (${t._id})`));
    } else {
        console.log('No Service Requests found.');
    }
    process.exit();
}).catch(err => console.error(err));
