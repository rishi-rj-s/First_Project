const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
     type: {
          type: String,
          enum: ['Product', 'Category'],
          required: true
     },
     catId: {
          type: mongoose.Types.ObjectId,
          ref: "categorie",
     },
     pdtId: {
          type: mongoose.Types.ObjectId,
          ref: "product",
     },
     discount: {
          type: Number,
          required: true
     },
});


module.exports = mongoose.model('offer', offerSchema);