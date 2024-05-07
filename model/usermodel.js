const mongoose = require("mongoose");

let schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Need the name"],
  },
  email: {
    type: String,
    unique: true,
  },
  password: {
    type: String,
  },
  gender: {
    type: String,
  },
  mobile: {
    type: Number,
    validate: {
      validator: function (v) {
        // Convert number to string to check length
        const mobileNumber = v.toString();
        return mobileNumber.length >= 10 && mobileNumber.length <= 15; // Example min and max lengths
      },
      message: (props) => `${props.value} is not a valid mobile number!`,
    },
  },
  status: {
    type: String,
    default: "active",
    enum: ["active", "blocked"],
  },
  wallet: {
    type: Number,
    default: 0,
  },
  refCode: {
    type: String,
    unique: true,
    required: true,
  }
},
  {
    timestamps: true
  }
);

const Userdb = mongoose.model("user", schema);

module.exports = Userdb;