const mongoose = require('mongoose');

const schema = new mongoose.Schema({
    user_id:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'user',
        required:true
    },
    name: {
        type: String,
    },
    phone: {
        type: String,
    },
    pincode: {
        type: String,
    },
    locality: {
        type: String,
    },
    address: {
        type: String,
    },
    city: {
        type: String,
    },
    state: {
        type: String,
    },
    addressType: {
        type: String,
        enum: ['Home', 'Work'],
    }
});

const AddressDb = mongoose.model('address', schema);

module.exports = AddressDb;