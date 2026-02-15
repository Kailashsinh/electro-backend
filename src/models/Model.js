const mongoose = require('mongoose');

const ModelSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  brand_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Brand', required: true },
  warranty_period: { type: Number, default: null }, // months
}, { timestamps: true });

ModelSchema.index({ name: 1, brand_id: 1 }, { unique: true });

module.exports = mongoose.model('Model', ModelSchema);