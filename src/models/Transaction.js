const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        technician_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Technician',
        },
        amount: {
            type: Number,
            required: true,
        },
        type: {
            type: String,
            enum: ['credit', 'debit'],
            required: true,
        },
        category: {
            type: String,
            enum: [
                'visit_fee_payment', // User Pays 200
                'subscription_purchase', // User Pays Sub
                'visit_fee_refund', // User gets refund (200 or 75)
                'technician_payout', // Tech gets paid (100 or 150)
                'penalty_deduction', // (Optional)
                'service_payment', // Balance payment from User
                'wallet_topup' // User adds money (Dummy)
            ],
            required: true,
        },
        description: {
            type: String,
            default: '',
        },
        status: {
            type: String,
            enum: ['success', 'failed', 'pending'],
            default: 'success',
        },
        related_request_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ServiceRequest',
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
