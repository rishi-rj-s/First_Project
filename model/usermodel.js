const mongoose = require("mongoose");

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

let schema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Need the name"],
  },
  email: {
    type: String,
    required: [true, "Need the email"],
    unique: true,
    validate: {
      validator: function (value) {
        return emailRegex.test(value);
      },
      message: "Invalid email format",

    },
  },
  password: {
    type: String,
    required: [true, "Need a password"],
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
},
{
     timestamps: true
});

const Userdb = mongoose.model("user", schema);

module.exports = Userdb;
