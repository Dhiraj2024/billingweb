const express = require('express');
const multer = require('multer');
const Item = require('../models/Item');
const Category = require('../models/Category');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 1024 * 1024 } });

router.use(authMiddleware);

// @route GET /api/items  -> all items grouped is done client-side; return flat list
router.get('/', async (req, res) => {
  try {
    const items = await Item.find({ user: req.user.id }).sort({ category: 1, name: 1 });
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route POST /api/items  -> add single item (creates category implicitly)
router.post('/', async (req, res) => {
  try {
    const { visibleIn, category, name, price, unit } = req.body;
    if (!['OPEN', 'PACK'].includes(visibleIn) || !category?.trim() || !name?.trim() ||
        !Number.isFinite(Number(price)) || Number(price) < 0 ||
        !['Kg', 'Piece', 'Liter'].includes(unit)) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    const item = await Item.create({
      user: req.user.id,
      visibleIn,
      category: category.trim(),
      name: name.trim(),
      price: Number(price),
      unit,
    });
    await Category.updateOne(
      { user: req.user.id, visibleIn, name: category.trim() },
      { $setOnInsert: { user: req.user.id, visibleIn, name: category.trim() } },
      { upsert: true }
    );
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: 'Unable to create item' });
  }
});

// @route PUT /api/items/:id  -> edit item
router.put('/:id', async (req, res) => {
  try {
    const { visibleIn, category, name, price, unit } = req.body;
    if (!['OPEN', 'PACK'].includes(visibleIn) || !category?.trim() || !name?.trim() ||
        !Number.isFinite(Number(price)) || Number(price) < 0 ||
        !['Kg', 'Piece', 'Liter'].includes(unit)) {
      return res.status(400).json({ message: 'Invalid item details' });
    }
    const item = await Item.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { visibleIn, category: category.trim(), name: name.trim(), price: Number(price), unit },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    await Category.updateOne(
      { user: req.user.id, visibleIn, name: category.trim() },
      { $setOnInsert: { user: req.user.id, visibleIn, name: category.trim() } },
      { upsert: true }
    );
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route DELETE /api/items/:id
router.delete('/:id', async (req, res) => {
  try {
    const item = await Item.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route DELETE /api/items/category/:visibleIn/:category -> delete whole category
router.delete('/category/:visibleIn/:category', async (req, res) => {
  try {
    const { visibleIn, category } = req.params;
    if (!['OPEN', 'PACK'].includes(visibleIn)) {
      return res.status(400).json({ message: 'Invalid visibility type' });
    }
    await Item.deleteMany({ user: req.user.id, visibleIn, category });
    await Category.deleteOne({ user: req.user.id, visibleIn, name: category });
    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// @route POST /api/items/bulk-upload (.txt file)
// Format per line: VISIBLE_TYPE, CATEGORY, ITEM_NAME, PRICE, UNIT
router.post('/bulk-upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const text = req.file.buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    const docs = [];
    const errors = [];

    lines.forEach((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts.length < 5) {
        errors.push(`Line ${idx + 1}: Invalid format`);
        return;
      }
      const [visibleIn, category, name, priceStr, unit] = parts;
      const price = parseFloat(priceStr);
      const visibleUpper = visibleIn.toUpperCase();

      if (!['OPEN', 'PACK'].includes(visibleUpper)) {
        errors.push(`Line ${idx + 1}: Invalid VISIBLE_TYPE "${visibleIn}"`);
        return;
      }
      if (!['Kg', 'Piece', 'Liter'].includes(unit)) {
        errors.push(`Line ${idx + 1}: Invalid UNIT "${unit}"`);
        return;
      }
      if (!Number.isFinite(price) || price < 0) {
        errors.push(`Line ${idx + 1}: Invalid PRICE "${priceStr}"`);
        return;
      }
      if (!category || !name) {
        errors.push(`Line ${idx + 1}: CATEGORY and ITEM_NAME are required`);
        return;
      }

      docs.push({
        user: req.user.id,
        visibleIn: visibleUpper,
        category,
        name,
        price,
        unit,
      });
    });

    let inserted = [];
    if (docs.length > 0) {
      inserted = await Item.insertMany(docs);
      const categoryKeys = new Map();
      docs.forEach((doc) => categoryKeys.set(`${doc.visibleIn}:${doc.category}`, doc));
      await Category.bulkWrite(
        [...categoryKeys.values()].map((doc) => ({
          updateOne: {
            filter: { user: req.user.id, visibleIn: doc.visibleIn, name: doc.category },
            update: { $setOnInsert: { user: req.user.id, visibleIn: doc.visibleIn, name: doc.category } },
            upsert: true,
          },
        }))
      );
    }

    res.json({
      message: `Inserted ${inserted.length} items`,
      insertedCount: inserted.length,
      errors,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
