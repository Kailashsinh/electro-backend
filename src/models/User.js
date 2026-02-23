const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  address: { type: String, default: null },
  registered_at: { type: Date, default: Date.now },
  loyalty_points: { type: Number, default: 100 },
  rating: { type: Number, min: 0, max: 5, default: null },
  isVerified: { type: Boolean, default: false },
  wallet_balance: { type: Number, default: 0 },
  profile_picture: { type: String, default: null }, // Base64 or URL
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);