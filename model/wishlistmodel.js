const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'product',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const WishlistDb = mongoose.model('wishlist', schema);

module.exports = WishlistDb;