const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User, Technician, ServiceRequest, Appliance } = require('./src/models');

dotenv.config();

const cleanup = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const userRes = await User.deleteMany({ email: 'deleteme@test.com' });
        console.log('Deleted Users:', userRes.deletedCount);

        const techRes = await Technician.deleteMany({ email: 'deletetech@test.com' });
        console.log('Deleted Techs:', techRes.deletedCount);

        const reqRes = await ServiceRequest.deleteMany({ issue_desc: 'To be deleted' });
        console.log('Deleted Requests:', reqRes.deletedCount);

        const appRes = await Appliance.deleteMany({ name: 'Test Fridge' });
        console.log('Deleted Appliances:', appRes.deletedCount);

    } catch (err) {
        console.error('Cleanup Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected');
    }
};

cleanup();
