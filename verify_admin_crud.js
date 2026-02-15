const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { User, Technician, ServiceRequest } = require('./src/models');
const { updateUser, deleteUser, updateTechnician, deleteTechnician, deleteServiceRequest } = require('./src/controllers/admin.controller');

dotenv.config();

const runVerification = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Create Dummy Data
        const dummyUser = await User.create({
            name: 'Delete Me',
            email: 'deleteme@test.com',
            password: 'password123',
            phone: '9998887776',
            role: 'user',
            wallet_balance: 100
        });
        console.log('Created Dummy User:', dummyUser._id);

        const dummyTech = await Technician.create({
            name: 'Delete Tech',
            email: 'deletetech@test.com',
            password: 'password123',
            phone: '9998887779',
            role: 'technician',
            status: 'active',
            location: {
                type: 'Point',
                coordinates: [77.2090, 28.6139] // Delhi
            }
        });
        console.log('Created Dummy Tech:', dummyTech._id);

        // Dummy Request with Fake Appliance ID
        const fakeApplianceId = new mongoose.Types.ObjectId();
        const dummyReq = await ServiceRequest.create({
            user_id: dummyUser._id,
            appliance_id: fakeApplianceId,
            issue_desc: 'To be deleted',
            status: 'pending',
            location: { coordinates: [0, 0] }
        });
        console.log('Created Dummy Request:', dummyReq._id);

        // MOCK REQUEST/RESPONSE objects
        const mockRes = () => {
            const res = {};
            res.status = (code) => {
                res.statusCode = code;
                return res;
            };
            res.json = (data) => {
                res.jsonData = data;
                return res;
            };
            return res;
        };

        // Test Update User
        console.log('\n--- Testing Update User ---');
        let req = { params: { id: dummyUser._id }, body: { wallet_balance: 500, name: 'Updated Name' } };
        let res = mockRes();
        await updateUser(req, res);
        console.log('Update User Result:', res.jsonData);
        if (res.jsonData.wallet_balance === 500 && res.jsonData.name === 'Updated Name') {
            console.log('✅ Update User Passed');
        } else {
            console.error('❌ Update User Failed');
        }

        // Test Update Tech
        console.log('\n--- Testing Update Tech ---');
        req = { params: { id: dummyTech._id }, body: { status: 'suspended' } };
        res = mockRes();
        await updateTechnician(req, res);
        console.log('Update Tech Result:', res.jsonData);
        if (res.jsonData.status === 'suspended') {
            console.log('✅ Update Tech Passed');
        } else {
            console.error('❌ Update Tech Failed');
        }

        // Test Delete Request
        console.log('\n--- Testing Delete Request ---');
        req = { params: { id: dummyReq._id } };
        res = mockRes();
        await deleteServiceRequest(req, res);
        console.log('Delete Request Result:', res.jsonData);
        const checkReq = await ServiceRequest.findById(dummyReq._id);
        if (!checkReq) {
            console.log('✅ Delete Request Passed');
        } else {
            console.error('❌ Delete Request Failed');
        }

        // Test Delete Tech
        console.log('\n--- Testing Delete Tech ---');
        req = { params: { id: dummyTech._id } };
        res = mockRes();
        await deleteTechnician(req, res);
        console.log('Delete Tech Result:', res.jsonData);
        const checkTech = await Technician.findById(dummyTech._id);
        if (!checkTech) {
            console.log('✅ Delete Tech Passed');
        } else {
            console.error('❌ Delete Tech Failed');
        }

        // Test Delete User
        console.log('\n--- Testing Delete User ---');
        req = { params: { id: dummyUser._id } };
        res = mockRes();
        await deleteUser(req, res);
        console.log('Delete User Result:', res.jsonData);
        const checkUser = await User.findById(dummyUser._id);
        if (!checkUser) {
            console.log('✅ Delete User Passed');
        } else {
            console.error('❌ Delete User Failed');
        }


    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        await mongoose.connection.close();
        console.log('Disconnected');
    }
};

runVerification();
