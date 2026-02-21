const mongoose = require('mongoose');

const TechnicianSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, trim: true, lowercase: true },
  pincode: { type: String, trim: true }, // For manual address matching
  profile_picture: {
    type: String,
    default: "",
  },

  password: { type: String, required: true }, // ✅ REQUIRED

  skills: [{ type: String }],
  rating: { type: Number, min: 0, max: 5, default: null },
  status: { type: String, enum: ['active', 'busy', 'inactive', 'suspended'], default: 'active' },
  loyalty_points: {
    type: Number,
    default: 100,
  },
  wallet_balance: {
    type: Number,
    default: 0,
  },
  suspended_until: {
    type: Date,
    default: null,
  },
  cancel_count: {
    type: Number,
    default: 0,
  },
  completed_jobs: {
    type: Number,
    default: 0,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true,
    },
  },

  is_available: {
    type: Boolean,
    default: true,
  },
  isVerified: { type: Boolean, default: false }, // Email Verification

  aadhaar_number: { type: String, unique: true, sparse: true, trim: true }, // Unique & Required for verification

  // Background Check Fields
  verificationStatus: {
    type: String,
    enum: ['pending', 'submitted', 'approved', 'rejected'],
    default: 'pending' // 'pending' = initial, 'submitted' = docs uploaded
  },
  documents: {
    id_proof: { type: String, default: "" }, // Aadhaar Card Image
    live_photo: { type: String, default: "" }, // Webcam Capture
    certification: { type: String, default: "" }, // Certification Image
    rejection_reason: { type: String, default: "" }
  },
}, { timestamps: true });

TechnicianSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Technician', TechnicianSchema);