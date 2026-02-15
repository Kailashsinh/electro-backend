const mongoose = require('mongoose');

const BrandSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
}, { timestamps: true });

BrandSchema.index({ name: 1, category_id: 1 }, { unique: true });

module.exports = mongoose.model('Brand', BrandSchema);