const express = require('express');
const Category = require('../models/Category');
const Item = require('../models/Item');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res, next) => {
  try {
    const existingItems = await Item.find({ user: req.user.id }).select('visibleIn category').lean();
    const categoryMap = new Map();
    existingItems.forEach((item) => categoryMap.set(`${item.visibleIn}:${item.category}`, item));
    if (categoryMap.size) {
      await Category.bulkWrite(
        [...categoryMap.values()].map((item) => ({
          updateOne: {
            filter: { user: req.user.id, visibleIn: item.visibleIn, name: item.category },
            update: { $setOnInsert: { user: req.user.id, visibleIn: item.visibleIn, name: item.category } },
            upsert: true,
          },
        }))
      );
    }
    const categories = await Category.find({ user: req.user.id }).sort({ visibleIn: 1, name: 1 });
    res.json(categories);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { visibleIn, name } = req.body;
    if (!['OPEN', 'PACK'].includes(visibleIn) || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'A valid category name and visibility are required' });
    }
    const category = await Category.findOneAndUpdate(
      { user: req.user.id, visibleIn, name: name.trim() },
      { $setOnInsert: { user: req.user.id, visibleIn, name: name.trim() } },
      { upsert: true, new: true, runValidators: true }
    );
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const category = await Category.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    await Item.deleteMany({
      user: req.user.id,
      visibleIn: category.visibleIn,
      category: category.name,
    });
    res.json({ message: 'Category and its items deleted' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
