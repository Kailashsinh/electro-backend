const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { getReportData } = require('./src/controllers/admin.controller');

dotenv.config();

const runVerification = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const req = { query: { type: 'revenue' } };
        const res = {
            status: (code) => {
                console.log('Status:', code);
                return { json: (data) => console.log('Error Data:', data) };
            },
            json: (data) => {
                console.log('Success! Revenue Data Length:', data.length);
                if (data.length > 0) {
                    console.log('Sample Row:', data[0]);
                }
            }
        };

        await getReportData(req, res);

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        await mongoose.connection.close();
    }
};

runVerification();
