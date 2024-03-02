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

const OrdersDb = mongoose.model("order", schema);

module.exports = OrdersDb;
