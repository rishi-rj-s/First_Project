const mongoose = require("mongoose");
const category = require('./categorymodel')

let schema = new mongoose.Schema({
   category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'categorie',
      required: true
   },
   p_name: {
      type: String,
      required: [true, "Need the name"],
   },
   price: {
      type: Number,
      required: true,
   },
   description: {
      type: String,
      required: true
   },
   discount: {
      type: Number,
      required: true,
   },
   stock: {
      type: Number,
      required: true,
   },
   images: {
      type: [String],
      minlength: 4,
      maxlength: 4,
      required: [true, "4 images are required"],
   },
   total_price: {
      type: Number,
   },
   listing: {
      type: String,
      default: "Listed",
      enum: ["Listed", "Unlisted"],
   },
   offerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'offer',
   },
   offerActive: {
      type: Boolean,
      required: true,
      default: false
   },
   offerDiscount: {
      type: Number,
      default: 0,
      required: true
   }
},
   {
      timestamps: true
   });

// Pre save middleware
schema.pre('save', function (next) {
   if (!this.total_price) {
      const discountPrice = Math.round(this.price - (this.price * (this.discount / 100)));
      const offerDiscountPrice = Math.round(discountPrice - (discountPrice * (this.offerDiscount / 100)));
      this.total_price = offerDiscountPrice;
   }
   next();
});

const ProductDb = mongoose.model("product", schema);

module.exports = ProductDb;
