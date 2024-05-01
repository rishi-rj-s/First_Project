const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true
    },
    discountAmount: {
        type: Number,
        required: true
    },
    minimumPurchaseAmount: {
        type: Number, 
        required: true
    },
    isActive: {
        type: Boolean,
        required: true,
        default: true,
    },
    expiryDate :{
        type: Date,
        required: true,
    }
});

const CouponDb = mongoose.model('coupon', couponSchema);

module.exports = CouponDb;