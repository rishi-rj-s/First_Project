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
          required: true,
          validate: [
               function () {
                    return !this.catName && !!this.pdtName || !!this.catName && !this.pdtName;
               },
               'Either CatId or PdtId is required'
          ]
     },
     pdtId: {
          type: mongoose.Types.ObjectId,
          ref: "product",
          required: true,
          validate: [
               function () {
                    return !this.catName && !!this.pdtName || !!this.catName && !this.pdtName;
               },
               'Either CatId or PdtId is required'
          ]
     },
     discount: {
          type: Number,
          required: true
     },
     maxAmount: {
          type: Number,
     },
     isActive: {
          type: String,
          required: true,
          default: "Active",
          enum: ['Active', 'Inactive']
     }
});


module.exports = mongoose.model('offer', offerSchema);