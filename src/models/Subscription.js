const mongoose = require('mongoose');

const SubscriptionSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    plan: {
      type: String,
      enum: ['basic', 'gold', 'premium', 'premium_pro'],
      required: true,
    },

    start_date: {
      type: Date,
      default: Date.now,
    },

    end_date: {
      type: Date,
      required: true,
    },

    total_visits_used: {
      type: Number,
      default: 0,
    },

    free_visits_used: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ['active', 'expired'],
      default: 'active',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', SubscriptionSchema);