
const mongoose = require('mongoose');

const TechnicianPaymentSchema = new mongoose.Schema({
  technician_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  amount: { type: Number, required: true },
  paid_at: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('TechnicianPayment', TechnicianPaymentSchema);