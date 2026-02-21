const mongoose = require('mongoose');
const User = require('./src/models/User');
const Technician = require('./src/models/Technician');
const ServiceRequest = require('./src/models/ServiceRequest');
const Subscription = require('./src/models/Subscription');
const Transaction = require('./src/models/Transaction');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/electrocare';

async function verifyPlansAndCancel() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Create Test User (Now checking if default subscription is created would require hitting API, but here we simulate DB state)
        // We will simulate a user who has Upgraded to Premium (since Gold has 0 free visits)
        const user = await User.create({
            name: 'Test Premium User',
            email: `premuser_${Date.now()}@test.com`,
            phone: `998${Math.floor(Math.random() * 10000000)}`,
            password: 'password123',
            role: 'user',
            wallet_balance: 0
        });

        // Simulate purchasing Premium Plan
        const subscription = await Subscription.create({
            user_id: user._id,
            plan: 'premium',
            start_date: new Date(),
            end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            status: 'active',
            total_visits_limit: 2, // Premium has 2
            free_visits_used: 1, // Start with 1 used
            total_visits_used: 1
        });

        console.log(`User created: ${user.name} (${user._id})`);
        console.log(`Subscription: Used ${subscription.free_visits_used}/${subscription.total_visits_limit}`);

        // 2. Create Test Technician
        const technician = await Technician.create({
            name: 'Test Tech',
            email: `tech_${Date.now()}@test.com`,
            phone: `887${Math.floor(Math.random() * 10000000)}`,
            password: 'password123',
            role: 'technician',
            status: 'active',
            is_available: true,
            wallet_balance: 0,
            location: { type: 'Point', coordinates: [77.2090, 28.6139] }
        });
        console.log(`Technician created: ${technician.name} (${technician._id})`);

        // 3. Create Service Request (Simulate Logic from payment.controller for Free Visit)
        // Scenario: User cancels while "on_the_way" (Should Restore Visit & Pay Tech 75)
        let requestOnWay = await ServiceRequest.create({
            user_id: user._id,
            technician_id: technician._id,
            appliance_id: new mongoose.Types.ObjectId(), // Fake ID
            issue_desc: 'Test Issue On Way',
            status: 'on_the_way',
            visit_fee_paid: true,
            used_free_visit: true, // Key Flag
            address_details: { street: 'Test St', city: 'Test City', pincode: '110001' }
        });
        console.log(`\n[Test 1] Service Request created: ${requestOnWay._id} (Status: on_the_way, Free Visit: true)`);

        // 4. Mimic cancelByUser Logic for 'on_the_way'
        console.log('--- Simulating Cancellation (On The Way) ---');

        if (requestOnWay.used_free_visit && requestOnWay.status === 'on_the_way') {
            // Restore
            await Subscription.findOneAndUpdate(
                { user_id: user._id, status: 'active' },
                { $inc: { free_visits_used: -1, total_visits_used: -1 } }
            );
            console.log('Restored Free Visit');

            // Payout
            if (requestOnWay.technician_id) {
                await Technician.findByIdAndUpdate(requestOnWay.technician_id, { $inc: { wallet_balance: 75 } });
                await Transaction.create({
                    technician_id: requestOnWay.technician_id,
                    amount: 75,
                    type: 'credit',
                    category: 'technician_payout',
                    description: 'Compensation for cancelled Free Visit',
                    status: 'success',
                    related_request_id: requestOnWay._id
                });
                console.log('Paid Technician 75');
            }
        }

        // 5. Verify Results for 'on_the_way'
        let updatedSub = await Subscription.findOne({ user_id: user._id });
        let updatedTech = await Technician.findById(technician._id);
        let payoutTxn = await Transaction.findOne({ related_request_id: requestOnWay._id, category: 'technician_payout' });

        console.log('--- Verification Results (On The Way) ---');
        console.log(`Subscription Free Visits Used: ${updatedSub.free_visits_used} (Expected: 0)`);
        console.log(`Technician Wallet Balance: ${updatedTech.wallet_balance} (Expected: 75)`);
        console.log(`Transaction Amount: ${payoutTxn ? payoutTxn.amount : 'None'} (Expected: 75)`);


        // [Test 2] Scenario: User cancels at "awaiting_approval" (Should NOT Restore Visit, Pay Tech 150)
        // Reset Sub usage for test
        await Subscription.updateOne({ _id: subscription._id }, { free_visits_used: 1, total_visits_used: 1 });
        // Reset Tech balance
        await Technician.updateOne({ _id: technician._id }, { wallet_balance: 0 });

        let requestEstimate = await ServiceRequest.create({
            user_id: user._id,
            technician_id: technician._id,
            appliance_id: new mongoose.Types.ObjectId(),
            issue_desc: 'Test Issue Estimate',
            status: 'awaiting_approval',
            visit_fee_paid: true,
            used_free_visit: true,
            address_details: { street: 'Test St', city: 'Test City', pincode: '110001' }
        });
        console.log(`\n[Test 2] Service Request created: ${requestEstimate._id} (Status: awaiting_approval, Free Visit: true)`);

        console.log('--- Simulating Cancellation (Awaiting Approval) ---');
        if (requestEstimate.used_free_visit && requestEstimate.status === 'awaiting_approval') {
            // Do NOT Restore (implied by absence of code)
            console.log('Use Free Visit (No Restoration)');

            // Payout 150
            if (requestEstimate.technician_id) {
                await Technician.findByIdAndUpdate(requestEstimate.technician_id, { $inc: { wallet_balance: 150 } });
                await Transaction.create({
                    technician_id: requestEstimate.technician_id,
                    amount: 150,
                    type: 'credit',
                    category: 'technician_payout',
                    description: 'Compensation for cancelled Free Visit (At Estimate)',
                    status: 'success',
                    related_request_id: requestEstimate._id
                });
                console.log('Paid Technician 150');
            }
        }

        updatedSub = await Subscription.findOne({ user_id: user._id });
        updatedTech = await Technician.findById(technician._id);

        console.log('--- Verification Results (Awaiting Approval) ---');
        console.log(`Subscription Free Visits Used: ${updatedSub.free_visits_used} (Expected: 1 - No Change)`);
        console.log(`Technician Wallet Balance: ${updatedTech.wallet_balance} (Expected: 150)`);

        if (updatedSub.free_visits_used === 1 && updatedTech.wallet_balance === 150) {
            console.log('✅ TEST 2 PASSED');
        } else {
            console.error('❌ TEST 2 FAILED');
        }

        // Cleanup
        await User.findByIdAndDelete(user._id);
        await Technician.findByIdAndDelete(technician._id);
        await ServiceRequest.deleteMany({ user_id: user._id });
        await Subscription.findByIdAndDelete(subscription._id);
        await Transaction.deleteMany({ technician_id: technician._id });

        mongoose.disconnect();

    } catch (error) {
        console.error('Test Error:', error);
        mongoose.disconnect();
    }
}

verifyPlansAndCancel();
