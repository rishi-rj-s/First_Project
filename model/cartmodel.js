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
            default: 1
        }
    }],
    subtotal: {
        type: Number,
        default: 0
    }
});

const CartDb = mongoose.model("cart",schema);
module.exports = CartDb;