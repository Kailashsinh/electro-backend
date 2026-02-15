const Subscription = require('../models/Subscription');

exports.buySubscription = async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['gold', 'premium', 'premium_pro'].includes(plan)) {
      return res.status(400).json({
        message: 'Invalid subscription plan',
      });
    }

    
    const existing = await Subscription.findOne({
      user_id: req.user.id,
      status: 'active',
    });

    if (existing) {
      return res.status(400).json({
        message: 'You already have an active subscription',
      });
    }

    let endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 1); 

    const subscription = await Subscription.create({
      user_id: req.user.id,
      plan,
      end_date: endDate,
    });

    const Transaction = require('../models/Transaction');
    await Transaction.create({
      user_id: req.user.id,
      amount: plan === 'gold' ? 0 : (plan === 'premium' ? 249 : 849), 
      type: 'debit',
      category: 'subscription_purchase',
      description: `Purchased ${plan} subscription`,
      status: 'success'
    });

    return res.status(201).json({
      message: 'Subscription purchased successfully',
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
