const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  model_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Model', required: true },
  serial_number: { type: String, unique: true, sparse: true, default: null },
  imei_number: { type: String, unique: true, sparse: true, default: null },
  purchase_date: { type: Date, required: true },
  invoice_url: { type: String, default: null },
  warranty_end: { type: Date, default: null }, // computed from purchase_date + model.warranty_period
}, { timestamps: true });

module.exports = mongoose.model('Product', ProductSchema);