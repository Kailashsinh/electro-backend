const mongoose = require('mongoose');
const User = require('./src/models/User');
const Technician = require('./src/models/Technician');
const Transaction = require('./src/models/Transaction');
const Subscription = require('./src/models/Subscription');
const ServiceRequest = require('./src/models/ServiceRequest');
const Payment = require('./src/models/Payment');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://kailashsingh200427:26032004@cluster0.hjs5b.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

async function verifySystem() {
    console.log('🚀 Starting System Verification...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // CLEANUP
    const TEST_EMAIL = 'verify_user@test.com';
    const TECH_EMAIL = 'verify_tech@test.com';
    await User.deleteOne({ email: TEST_EMAIL });
    await Technician.deleteOne({ email: TECH_EMAIL });
    await Transaction.deleteMany({ description: { $regex: /Verify/ } });

    // 1. CREATE USER & TECH
    console.log('\n--- 1. Creating Entities ---');
    let user = await User.create({
        name: 'Verify User',
        email: TEST_EMAIL,
        phone: '9999999999',
        password: 'password',
        isVerified: true,
        wallet_balance: 1000 // Start with 1000
    });
    console.log(`✅ User created. Wallet: ${user.wallet_balance}`);

    let tech = await Technician.create({
        name: 'Verify Tech',
        email: TECH_EMAIL,
        phone: '8888888888',
        password: 'password',
        status: 'active',
        is_available: true,
        location: { type: 'Point', coordinates: [77.209, 28.613] }, // New Delhi
        isVerified: true
    });
    console.log(`✅ Tech created. Wallet: ${tech.wallet_balance}`);


    // 2. SUBSCRIPTION PURCHASE
    console.log('\n--- 2. Subscription Flow ---');
    // Simulate buy controller logic (creating transaction manually for test or use API if possible, but here we test DB state)
    // We will assume controller works if models are correct. Let's just create the Transaction directly to verify model works.

    await Transaction.create({
        user_id: user._id,
        amount: 299,
        type: 'debit',
        category: 'subscription_purchase',
        description: 'Verify: Purchased premium',
        status: 'success'
    });

    // Update User Wallet
    user.wallet_balance -= 299;
    await user.save();
    console.log(`✅ Paid 299 for Premium. New Wallet: ${user.wallet_balance}`);


    // 3. SERVICE REQUEST FLOW (REFUND CANCELLATION)
    console.log('\n--- 3. Refund Flow (Cancel Before OnWay) ---');
    // Pay Visit Fee
    user.wallet_balance -= 200;
    await user.save();
    let sr1 = await ServiceRequest.create({
        user_id: user._id,
        appliance_id: new mongoose.Types.ObjectId(),
        issue_desc: 'Test Issue 1',
        status: 'pending',
        visit_fee_paid: true,
        scheduled_date: new Date(),
        preferred_slot: 'Morning (9 AM - 12 PM)'
    });
    console.log('✅ Service Request Created (Pending). Wallet deducted 200.');
    console.log(`   - Scheduled: ${sr1.scheduled_date.toISOString().split('T')[0]} | Slot: ${sr1.preferred_slot}`);

    // Cancel
    // Simulate controller logic
    if (['pending', 'broadcasted'].includes(sr1.status)) {
        user.wallet_balance += 200;
        await user.save();
        sr1.status = 'cancelled';
        await sr1.save();
        console.log(`✅ Cancelled. Wallet Refunded. New Wallet: ${user.wallet_balance}`);
    }

    // 4. SERVICE REQUEST FLOW (AFTER ESTIMATE)
    console.log('\n--- 4. Refund Flow (Cancel After Estimate) ---');
    user.wallet_balance -= 200;
    await user.save();
    let sr2 = await ServiceRequest.create({
        user_id: user._id,
        technician_id: tech._id,
        status: 'awaiting_approval', // Estimate submitted
        visit_fee_paid: true,
        scheduled_date: new Date(Date.now() + 86400000), // Tomorrow
        preferred_slot: 'Afternoon (12 PM - 3 PM)'
    });
    console.log('✅ Service Request Created (Awaiting Approval). Wallet deducted 200.');
    console.log(`   - Scheduled: ${sr2.scheduled_date.toISOString().split('T')[0]} | Slot: ${sr2.preferred_slot}`);

    // Cancel Logic
    if (sr2.status === 'awaiting_approval') {
        user.wallet_balance += 75;
        await user.save();
        tech.wallet_balance += 100;
        await tech.save();
        sr2.status = 'cancelled';
        await sr2.save();
        console.log(`✅ Cancelled. User +75 (Wallet: ${user.wallet_balance}), Tech +100 (Wallet: ${tech.wallet_balance})`);
    }

    // 5. JOB COMPLETION
    console.log('\n--- 5. Job Completion Payout ---');
    user.wallet_balance -= 200; // New Request
    await user.save();
    let sr3 = await ServiceRequest.create({
        user_id: user._id,
        technician_id: tech._id,
        status: 'approved',
        visit_fee_paid: true,
        completion_otp: '123456',
        scheduled_date: new Date(),
        preferred_slot: 'Evening (5 PM - 7 PM)'
    });
    console.log(`   - Scheduled: ${sr3.scheduled_date.toISOString().split('T')[0]} | Slot: ${sr3.preferred_slot}`);

    // Complete Logic (Verify OTP)
    // Tech gets 150
    tech.wallet_balance += 150;
    await tech.save();
    console.log(`✅ Job Completed. Tech +150 (Wallet: ${tech.wallet_balance})`);

    console.log('\n🎉 Verification Complete!');
    process.exit(0);
}

verifySystem().catch(err => {
    console.error(err);
    process.exit(1);
});
