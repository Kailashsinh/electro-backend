const mongoose = require('mongoose');

const RequestQueueSchema = new mongoose.Schema({
  request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceRequest', required: true },
  technician_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  response_status: { type: String, enum: ['pending','accepted','rejected','expired'], default: 'pending' },
  response_time: { type: Date, default: null },
}, { timestamps: true });

RequestQueueSchema.index({ request_id: 1, technician_id: 1 }, { unique: true });

module.exports = mongoose.model('RequestQueue', RequestQueueSchema);