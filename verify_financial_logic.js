const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');
const Technician = require('./src/models/Technician');
const ServiceRequest = require('./src/models/ServiceRequest');
const Transaction = require('./src/models/Transaction');
const { cancelByUser, cancelByTechnician, verifyOtpAndPay } = require('./src/controllers/serviceRequest.controller');

dotenv.config();

// Mock Response
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        res.data = data;
        return res;
    };
    return res;
};

const runVerification = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Setup Test Data
        const user = await User.create({ name: 'Test User Fin', email: `testuserfin_${Date.now()}@example.com`, password: 'password123', phone: '9999999999', wallet_balance: 1000, loyalty_points: 100, isVerified: true });
        const tech = await Technician.create({
            name: 'Test Tech Fin',
            email: `testtechfin_${Date.now()}@example.com`,
            password: 'password123',
            phone: '8888888888',
            wallet_balance: 500,
            loyalty_points: 100,
            isVerified: true,
            status: 'active',
            is_available: true,
            location: { type: 'Point', coordinates: [72.8777, 19.0760] }
        });

        const dummyApplianceId = new mongoose.Types.ObjectId();

        console.log('--- SCENARIO 1: User Cancel Before On The Way ---');
        let req1 = await ServiceRequest.create({
            user_id: user._id,
            technician_id: tech._id,
            status: 'accepted',
            visit_fee_paid: true,
            appliance_type: 'AC',
            appliance_id: dummyApplianceId,
            issue_desc: 'Test Issue',
            preferred_slot: 'Morning (9 AM - 12 PM)'
        });

        await cancelByUser({ params: { requestId: req1._id }, user: { id: user._id } }, mockRes());

        const user1 = await User.findById(user._id);
        console.log(`User Wallet (Should be 1200): ${user1.wallet_balance}`);

        console.log('--- SCENARIO 2: User Cancel After On The Way ---');
        let req2 = await ServiceRequest.create({
            user_id: user._id,
            technician_id: tech._id,
            status: 'on_the_way',
            visit_fee_paid: true,
            appliance_type: 'AC',
            appliance_id: dummyApplianceId,
            issue_desc: 'Test Issue',
            preferred_slot: 'Morning (9 AM - 12 PM)'
        });

        await cancelByUser({ params: { requestId: req2._id }, user: { id: user._id } }, mockRes());

        const user2 = await User.findById(user._id);
        console.log(`User Wallet (Should be 1200 - Unchanged): ${user2.wallet_balance}`);
        console.log(`User Points (Should be 85 - Deducted 15): ${user2.loyalty_points}`);

        console.log('--- SCENARIO 3: User Cancel After Estimate ---');
        // Reset wallet for clarity
        await User.findByIdAndUpdate(user._id, { wallet_balance: 1000 });
        await Technician.findByIdAndUpdate(tech._id, { wallet_balance: 500 });

        let req3 = await ServiceRequest.create({
            user_id: user._id,
            technician_id: tech._id,
            status: 'awaiting_approval',
            visit_fee_paid: true,
            estimated_service_cost: 500,
            appliance_type: 'AC',
            appliance_id: dummyApplianceId,
            issue_desc: 'Test Issue',
            preferred_slot: 'Morning (9 AM - 12 PM)'
        });

        await cancelByUser({ params: { requestId: req3._id }, user: { id: user._id } }, mockRes());

        const user3 = await User.findById(user._id);
        const tech3 = await Technician.findById(tech._id);

        console.log(`User Wallet (Should be 1075): ${user3.wallet_balance}`);
        console.log(`Tech Wallet (Should be 600): ${tech3.wallet_balance}`);

        console.log('--- SCENARIO 4: Technician Cancel After On The Way ---');
        await User.findByIdAndUpdate(user._id, { wallet_balance: 1000 });
        await Technician.findByIdAndUpdate(tech._id, { wallet_balance: 500, loyalty_points: 100 });

        let req4 = await ServiceRequest.create({
            user_id: user._id,
            technician_id: tech._id,
            status: 'on_the_way',
            visit_fee_paid: true,
            appliance_type: 'AC',
            appliance_id: dummyApplianceId,
            issue_desc: 'Test Issue',
            preferred_slot: 'Morning (9 AM - 12 PM)'
        });

        await cancelByTechnician({ params: { requestId: req4._id }, user: { id: tech._id } }, mockRes());

        const user4 = await User.findById(user._id);
        const tech4 = await Technician.findById(tech._id);
        const req4_updated = await ServiceRequest.findById(req4._id);

        console.log(`User Wallet (Should be 1200): ${user4.wallet_balance}`);
        console.log(`Tech Points (Should be 85): ${tech4.loyalty_points}`);
        console.log(`Request Status (Should be cancelled): ${req4_updated.status}`);

        console.log('--- SCENARIO 5: Completion Logic ---');
        await User.findByIdAndUpdate(user._id, { wallet_balance: 1000 });
        await Technician.findByIdAndUpdate(tech._id, { wallet_balance: 500 });

        let req5 = await ServiceRequest.create({
            user_id: user._id,
            technician_id: tech._id,
            status: 'completed', // Pre-set for verifyOtp
            visit_fee_paid: true,
            estimated_service_cost: 500, // Total 500. Paid 200. Balance 300.
            completion_otp: '123456',
            appliance_type: 'AC',
            appliance_id: dummyApplianceId,
            issue_desc: 'Test Issue',
            preferred_slot: 'Morning (9 AM - 12 PM)'
        });

        await verifyOtpAndPay({ params: { requestId: req5._id }, body: { otp: '123456' } }, mockRes());

        const tech5 = await Technician.findById(tech._id);
        console.log(`Tech Wallet (Should be 650 - 500+150): ${tech5.wallet_balance}`);

        const balanceTx = await Transaction.findOne({ related_request_id: req5._id, category: 'service_payment' });
        console.log(`Balance Transaction Amount (Should be 300): ${balanceTx ? balanceTx.amount : 'NOT FOUND'}`);

    } catch (err) {
        console.error('Verification Error:', err);
    } finally {
        await mongoose.connection.close();
    }
};

runVerification();
