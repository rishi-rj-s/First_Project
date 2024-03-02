const mongoose = require("mongoose");

let schema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
     type: String,
  },
  name: {
     type: String,
     required: true,
  }
});

const CartDb = mongoose.model("cart", schema);

module.exports = CartDb;
