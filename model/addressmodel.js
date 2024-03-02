const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    userid:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    name: {
        type: String,
        required: true
    },
    mobileNumber: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    locality: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    state: {
        type: String,
        required: true
    },
    addressType: {
        type: String,
        enum: ['Home', 'Work'],
        required: true
    }
});

const AddressDb = mongoose.model('addres', schema);

module.exports = AddressDb;