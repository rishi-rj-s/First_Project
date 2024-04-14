const mongoose = require("mongoose");

let schema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    unique: true,
  },
  listing: {
    type: Boolean,
    required: true,
    default: true,
  },
   offerDiscount: {
    type: Number,
    default: 0,
   },
   offerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'offer'
   },
   offerActive: {
    type: Boolean,
    default: false,
    required: true
   },
});

const CatDb = mongoose.model("categorie", schema);

module.exports = CatDb;
