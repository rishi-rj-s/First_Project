const mongoose = require("mongoose");
const category = require('./categorymodel')

let schema = new mongoose.Schema({
   category:{
      type: mongoose.Schema.Types.String,
      ref: 'category',
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
     required: [true,"4 images are required"],   
  },
  total_price: {
     type: Number,
  },
  listing: {
   type: String,
   default: "Listed",
   enum: ["Listed", "Unlisted"],
  },
  offerActive: {
   type: Boolean,
   default: false,
  }
},
{
   timestamps: true
});

schema.pre('save', function (next) {
   if (!this.total_price) {
     this.total_price = Math.round(this.price - (this.price * (this.discount / 100)));
   }
 
   next();
 });
 

const ProductDb = mongoose.model("product", schema);

module.exports = ProductDb;
