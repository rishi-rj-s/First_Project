const mongoose = require('mongoose');

const walletHistorySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    transactionType: {
        type: String,
        enum: ['Credit', 'Debit'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    },
    order:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'order',
        required: true
    }
});

const WalletHistory = mongoose.model('wallethistory', walletHistorySchema);

module.exports = WalletHistory;