const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    otp: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'technician', 'user_verification', 'technician_verification'],
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    registrationData: { type: Object, default: null },
  },
  { timestamps: true }
);

/**
 * TTL index
 * MongoDB will automatically delete expired OTP documents
 */
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Otp', OtpSchema);