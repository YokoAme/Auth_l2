const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const Model = mongoose.model;

module.exports = {};

module.exports.user = Model('users', new Schema({
    id: { type: Number },
    email: { type: String },
    login: { type: String },
    pass: { type: String },

    name: { type: String, default: "" },
    gender: { type: String, default: "" },
    phone: { type: String, default: "" },
    
    avatar: { type: String, default: 'null' },
    created: { type: Number, default: Date.now() },
}))