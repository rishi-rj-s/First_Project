const mongoose=require('mongoose');

const schema = new mongoose.Schema({
    user: {
        type: mongoose.Types.ObjectId,
        required: true,
    },
    product: [{
        productId: {
            type: mongoose.Types.ObjectId,
            ref: "product",
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1,
            max: 5,   // Maximum quantity allowed
        }
    }],
    couponApplied:{
        type: Boolean,
        default: false,
        required: true
    },
    coupon:{
        type: mongoose.Types.ObjectId,
        ref: "coupon",
    },
    couponCode:{
        type: String,
    },
    subtotal: {
        type: Number,
        default: 0
    }
},
{
    timestamps: true
});

const CartDb = mongoose.model("cart",schema);
module.exports = CartDb;