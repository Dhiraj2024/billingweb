const mongoose = require('mongoose');

const ItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visibleIn: { type: String, enum: ['OPEN', 'PACK'], required: true },
    category: { type: String, required: true, trim: true, maxlength: 80 },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    price: { type: Number, required: true, min: 0 },
    unit: { type: String, enum: ['Kg', 'Piece', 'Liter'], required: true },
  },
  { timestamps: true }
);

ItemSchema.index({ user: 1, visibleIn: 1, category: 1 });

module.exports = mongoose.model('Item', ItemSchema);
