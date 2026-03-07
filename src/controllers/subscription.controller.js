const Subscription = require('../models/Subscription');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.buySubscription = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['premium', 'premium_pro'].includes(plan)) {
      return res.status(400).json({
        message: 'Invalid subscription plan',
      });
    }

    const priceMap = {
      gold: 0,
      premium: 299,
      premium_pro: 849
    };
    const price = priceMap[plan];

    const existing = await Subscription.findOne({
      user_id: req.user.id,
      status: 'active',
    });

    if (existing && existing.plan === plan) {
      return res.status(400).json({
        message: `You already have an active ${plan} subscription`,
      });
    }

    // Create Razorpay Order
    const options = {
      amount: price * 100,
      currency: "INR",
      receipt: `sub_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      order,
      plan
    });
  } catch (err) {
    console.error('Buy Subscription Error:', err);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};

exports.verifySubscription = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      plan
    } = req.body;

    const shasum = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ message: 'Transaction not legitimate!' });
    }

    // Mark old ones as expired
    await Subscription.updateMany(
      { user_id: req.user.id, status: 'active' },
      { status: 'expired' }
    );

    let endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await Subscription.create({
      user_id: req.user.id,
      plan,
      end_date: endDate,
      status: 'active'
    });

    const Transaction = require('../models/Transaction');
    await Transaction.create({
      user_id: req.user.id,
      amount: plan === 'premium' ? 299 : 849,
      type: 'debit',
      category: 'subscription_purchase',
      description: `Purchased ${plan} subscription via Razorpay`,
      status: 'success',
      payment_method: 'razorpay',
      payment_id: razorpay_payment_id
    });

    return res.status(201).json({
      message: `Annual ${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription activated!`,
      subscription,
    });
  } catch (err) {
    console.error('Verify Subscription Error:', err);
    return res.status(500).json({ message: 'Verification failed' });
  }
};

exports.getMySubscription = async (req, res) => {
  try {
    const subscription = await Subscription.findOne({
      user_id: req.user.id,
      status: 'active',
    });

    if (!subscription) {
      return res.json({
        plan: 'gold',
        message: 'No active subscription',
      });
    }

    return res.json(subscription);
  } catch (err) {
    console.error('Get Subscription Error:', err);
    return res.status(500).json({
      message: 'Internal server error',
    });
  }
};
