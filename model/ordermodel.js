const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    user_id: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    },
    orderedItems: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product',
            required: true
        },
        pname: {
            type: String,
            required: true
        },
        pimages: {
            type: [String],
            required: true
        },
        originalPrice: {
            type: Number,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        }
    }],
    status: {
        type: String,
        default: "Pending",
        enum: ['Pending', 'Shipped', 'Processing', 'Delivered', 'Cancelled', 'Returned']
    },
    returned: {
        type: Boolean,
        default: false
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Cancelled', 'Refunded'],
        default: 'Pending',
    },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['COD', 'Wallet', 'RazorPay']
    },
    shippingAddress: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Address',
        required: true
    },
    orderDate: {
        type: Date,
        default: Date.now
    },
    couponApplied: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'coupon',
        default: null,
    },
    totalAmount: {
        type: Number,
        required: true
    }
});


const OrderDb = mongoose.model('order', schema)

module.exports = OrderDb;