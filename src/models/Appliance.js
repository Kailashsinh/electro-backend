const mongoose = require('mongoose');

const ApplianceSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  model: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Model',
    required: true,
  },
  serial_number: {
    type: String,
    unique: true,
    sparse: true
  },
  purchase_date: {
    type: Date,
    required: true,
  },
  invoice_url: {
    type: String,
  },
  warranty_end: {
    type: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model('Appliance', ApplianceSchema);