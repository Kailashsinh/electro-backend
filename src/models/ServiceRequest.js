const mongoose = require('mongoose');

const ServiceRequestSchema = new mongoose.Schema(
  {
    /* ---------------- CORE ---------------- */
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    appliance_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appliance',
      required: true,
    },

    technician_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Technician',
      default: null,
    },

    broadcasted_to: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Technician',
      },
    ],

    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: false, // Optional for now, but recommended
      },
    },

    /* ---------------- SERVICE INFO ---------------- */
    issue_desc: {
      type: String,
      required: true,
    },

    preferred_slot: {
      type: String,
      enum: ['Morning (9 AM - 12 PM)', 'Afternoon (12 PM - 3 PM)', 'Evening (5 PM - 7 PM)', 'Night (7 PM - 9 PM)'],
      default: 'Morning (9 AM - 12 PM)',
    },

    scheduled_date: {
      type: Date,
      required: true,
      default: Date.now
    },

    /* ---------------- STATUS FLOW ---------------- */
    status: {
      type: String,
      enum: [
        'pending',
        'broadcasted',
        'accepted',
        'on_the_way',        // technician started travel
        'awaiting_approval',// cost shared
        'approved',
        'in_progress',
        'completed',
        'cancelled',
      ],
      default: 'pending',
    },

    /* ---------------- VISIT FEE LOGIC ---------------- */
    visit_fee_paid: {
      type: Boolean,
      default: false,
    },

    visit_fee_amount: {
      type: Number,
      default: 200,
    },

    technician_visit_share: {
      type: Number,
      default: 150,
    },

    platform_visit_share: {
      type: Number,
      default: 50,
    },

    /* ---------------- COST & DISCOUNT ---------------- */
    estimated_service_cost: {
      type: Number,
      default: 0,
    },

    discount_applied: {
      type: Number,
      default: 0,
    },

    /* ---------------- OTP CONFIRMATION ---------------- */
    completion_otp: {
      type: String,
    },

    otp_verified: {
      type: Boolean,
      default: false,
    },
    subscription_plan: {
      type: String,
      enum: ['basic', 'premium', 'premium_pro'],
      default: 'basic',
    },

    priority_level: {
      type: Number,
      default: 1, // basic
    },

    /* ---------------- TIMESTAMPS ---------------- */
    accepted_at: Date,
    on_the_way_at: Date,
    completed_at: Date,
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
  }
);

module.exports = mongoose.model('ServiceRequest', ServiceRequestSchema);
