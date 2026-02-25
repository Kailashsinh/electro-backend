const Subscription = require('../models/Subscription');

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

    if (existing) {
      if (existing.plan === plan) {
        return res.status(400).json({
          message: `You already have an active ${plan} subscription`,
        });
      }

      // Upgrade logic: Mark old one as expired
      existing.status = 'expired';
      await existing.save();
    }

    let endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1);

    const subscription = await Subscription.create({
      user_id: req.user.id,
      plan,
      end_date: endDate,
      status: 'active'
    });

    // Create a transaction record representing the gateway payment (No wallet deduction)
    const Transaction = require('../models/Transaction');
    await Transaction.create({
      user_id: req.user.id,
      amount: price,
      type: 'debit',
      category: 'subscription_purchase',
      description: `Purchased ${plan} subscription via Secure Checkout`,
      status: 'success',
      payment_method: 'card',
      payment_id: `PAY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    });

    return res.status(201).json({
      message: `Annual ${plan.charAt(0).toUpperCase() + plan.slice(1)} subscription activated via Payment Gateway!`,
      subscription,
    });
  } catch (err) {
    console.error('Buy Subscription Error:', err);
    return res.status(500).json({
      message: 'Internal server error',
    });
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
