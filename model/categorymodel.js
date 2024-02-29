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
  }
});

const CatDb = mongoose.model("categorie", schema);

module.exports = CatDb;
