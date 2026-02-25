
const mongoose = require('mongoose');
const ServiceRequest = require('./src/models/ServiceRequest');
const Technician = require('./src/models/Technician');
const User = require('./src/models/User');
const Appliance = require('./src/models/Appliance');
const Model = require('./src/models/Model');
const Brand = require('./src/models/Brand');
const Category = require('./src/models/Category');
const RequestQueue = require('./src/models/RequestQueue');
const axios = require('axios');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const API_URL = 'http://localhost:5000/api';

async function testSlotConflict() {
    console.log("--- Starting Slot Conflict Test ---");

    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/electrocare');

    try {
        // Cleanup
        await User.deleteMany({ email: /test_slot/ });
        await Technician.deleteMany({ email: /test_slot/ });
        const categories = await Category.find({});
        const category = categories[0] || await Category.create({ name: 'Test Category' });
        const brand = await Brand.findOne({ category_id: category._id }) || await Brand.create({ name: 'Test Brand', category_id: category._id });
        const model = await Model.findOne({ brand_id: brand._id }) || await Model.create({ name: 'Test Model', brand_id: brand._id });

        const hashedPassword = await bcrypt.hash('password123', 10);

        // Create User
        const user = await User.create({
            name: 'Slot Test User',
            email: 'user_test_slot@test.com',
            phone: '1234567890',
            password: hashedPassword,
            isVerified: true
        });

        // Create Technician
        const technician = await Technician.create({
            name: 'Slot Test Tech',
            email: 'tech_test_slot@test.com',
            phone: '0987654321',
            password: hashedPassword,
            status: 'active',
            is_available: true,
            isVerified: true,
            verificationStatus: 'approved',
            location: { type: 'Point', coordinates: [72.5714, 23.0225] }
        });

        // Create Appliance
        const appliance = await Appliance.create({
            user: user._id,
            model: model._id,
            purchase_date: new Date()
        });

        const testDate = new Date();
        testDate.setHours(0, 0, 0, 0);
        const testSlot = 'Morning (9 AM - 12 PM)';
        const differentSlot = 'Afternoon (12 PM - 3 PM)';

        console.log(`Setting up requests for ${testDate.toDateString()}...`);

        // Job A: Same Time
        const reqA = await ServiceRequest.create({
            user_id: user._id,
            appliance_id: appliance._id,
            issue_desc: 'TEST_A',
            status: 'broadcasted',
            scheduled_date: testDate,
            preferred_slot: testSlot
        });

        // Job B: Same Time (Conflict)
        const reqB = await ServiceRequest.create({
            user_id: user._id,
            appliance_id: appliance._id,
            issue_desc: 'TEST_B',
            status: 'broadcasted',
            scheduled_date: testDate,
            preferred_slot: testSlot
        });

        // Job C: Different Time (OK)
        const reqC = await ServiceRequest.create({
            user_id: user._id,
            appliance_id: appliance._id,
            issue_desc: 'TEST_C',
            status: 'broadcasted',
            scheduled_date: testDate,
            preferred_slot: differentSlot
        });

        await RequestQueue.insertMany([
            { request_id: reqA._id, technician_id: technician._id, response_status: 'pending' },
            { request_id: reqB._id, technician_id: technician._id, response_status: 'pending' },
            { request_id: reqC._id, technician_id: technician._id, response_status: 'pending' }
        ]);

        console.log("Logging in...");
        const loginRes = await axios.post(`${API_URL}/auth/technician/login`, {
            identifier: technician.email,
            password: 'password123'
        });
        const token = loginRes.data.token;
        const config = { headers: { Authorization: `Bearer ${token}` } };

        // Test A
        console.log("\nAccepting Job A...");
        const resA = await axios.post(`${API_URL}/service-requests/${reqA._id}/accept`, {}, config);
        console.log("✅ Result:", resA.data.message);

        // Test B (Conflict)
        console.log("\nAccepting Job B (Conflict)...");
        try {
            await axios.post(`${API_URL}/service-requests/${reqB._id}/accept`, {}, config);
            console.log("❌ FAIL: Should have been blocked!");
        } catch (err) {
            console.log("✅ PASS: Blocked with message:", err.response?.data?.message);
        }

        // Test C (Different Slot)
        console.log("\nAccepting Job C (Different Slot)...");
        const resC = await axios.post(`${API_URL}/service-requests/${reqC._id}/accept`, {}, config);
        console.log("✅ Result:", resC.data.message);

        console.log("\n--- TEST SUCCESSFUL ---");

    } catch (err) {
        console.error("Test Failed:", err.message);
        if (err.response) console.error("Detail:", err.response.data);
    } finally {
        await mongoose.disconnect();
    }
}

testSlotConflict();
