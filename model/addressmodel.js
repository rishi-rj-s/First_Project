const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    name: {
        type: String,
        required: true
    },
    phone: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    locality: {
        type: String,
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