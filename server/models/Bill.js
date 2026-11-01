const mongoose = require('mongoose');

const BillItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: '', trim: true },
    visibleIn: { type: String, enum: ['OPEN', 'PACK'], required: true },
    unit: { type: String, enum: ['Kg', 'Piece', 'Liter'], required: true },
    price: { type: Number, min: 0, required: true },
    qty: { type: Number, min: 0.001, required: true },
    amount: { type: Number, min: 0, required: true },
  },
  { _id: false }
);

const BillSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    billNo: { type: Number, required: true },
    items: [BillItemSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    format: { type: String, enum: ['TXT', 'PDF'], default: 'TXT' },
  },
  { timestamps: true }
);

BillSchema.index({ user: 1, createdAt: -1 });
BillSchema.index({ user: 1, billNo: 1 }, { unique: true });

module.exports = mongoose.model('Bill', BillSchema);
