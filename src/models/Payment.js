const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
    },

    amount: {
      type: Number,
      required: true,
    },

    type: {
      type: String,
      enum: [
        'visit_fee',      // ₹200 upfront
        'service_payment' // remaining payment
      ],
      required: true,
    },

    method: {
      type: String,
      enum: ['UPI', 'Card', 'Net Banking'],
      required: true,
    },

    status: {
      type: String,
      enum: ['pending', 'success', 'failed'],
      default: 'pending',
    },

    technician_share: {
      type: Number,
      default: 0,
    },

    platform_share: {
      type: Number,
      default: 0,
    },

    paid_at: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', PaymentSchema);
