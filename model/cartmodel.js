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