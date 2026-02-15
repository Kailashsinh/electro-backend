const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    technician_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Technician',
      required: true,
    },

    request_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceRequest',
      required: true,
    },

    submitted_by: {
      type: String,
      enum: ['user', 'technician'],
      required: true,
    },

    rating: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },

    comment: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at' },
  }
);

module.exports = mongoose.model('Feedback', FeedbackSchema);
