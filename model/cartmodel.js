const mongoose=require('mongoose');

const schema = new mongoose.Schema( new mongoose.Schema ({
  
    user_id: {
        type: mongoose.Types.ObjectId,
        require: true,
    },
    product: [{
        productId: {
            type: mongoose.Types.ObjectId,
            ref: "Product",
            required: true,
        },
        quantity: {
            type: Number,
            default: 1,
        },

    }],
}));

const CartDb = mongoose.model("cart",schema);
module.exports = CartDb;