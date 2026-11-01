const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    ownerName: { type: String, required: true, trim: true, maxlength: 100 },
    shopName: { type: String, default: '', trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, minlength: 8, select: false },
    googleId: { type: String, default: null },
    mobNo: { type: String, default: '' },
    address: { type: String, default: '', trim: true, maxlength: 300 },
    endMsg: { type: String, default: 'Thank You! Visit Again', trim: true, maxlength: 160 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', UserSchema);
