const mongoose =require('mongoose');

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
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true
        },
        status: {
            type: String,
            default: "Pending",
            enum: ['Pending', 'Shipped', 'Processing', 'Delivered', 'Cancelled', 'Returned']
        },
        returned: {
            type: Boolean,
            default: false
        }
    }],
    deliveryDate: {
        type: Date,
        default: null
    },
    payment: {
        type: mongoose.Types.ObjectId
    },
    // paymentStatus: {
    //     type: String,
    //     enum: ['Pending', 'Processing', 'Completed', 'Failed', 'Refunded'],
    //     default: 'Pending',
    // },
    paymentMethod: {
        type: String,
        required: true,
        enum: ['Cash On Delivery','Wallet','Razorpay']
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
    totalAmount: {
        type: Number,
        required: true
    }
});


const OrderDb = mongoose.model('order', schema)

module.exports = OrderDb;