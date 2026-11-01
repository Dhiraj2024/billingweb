const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    visibleIn: { type: String, enum: ['OPEN', 'PACK'], required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
  },
  { timestamps: true }
);

CategorySchema.index({ user: 1, visibleIn: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Category', CategorySchema);
