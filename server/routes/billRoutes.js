const express = require('express');
const Bill = require('../models/Bill');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const VALID_UNITS = ['Kg', 'Piece', 'Liter'];

router.use(authMiddleware);

const indiaDayRange = (dateString) => {
  const start = new Date(`${dateString}T00:00:00.000+05:30`);
  if (Number.isNaN(start.getTime())) return null;
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
};

const isValidDate = (dateString) => {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

router.post('/', async (req, res) => {
  try {
    const { items, totalAmount, format = 'TXT' } = req.body;
    if (!Array.isArray(items) || items.length === 0 || items.length > 500) {
      return res.status(400).json({ message: 'A bill must contain between 1 and 500 items' });
    }
    if (!['TXT', 'PDF'].includes(format) || !Number.isFinite(Number(totalAmount)) || Number(totalAmount) < 0) {
      return res.status(400).json({ message: 'Invalid bill format or total' });
    }

    const validatedItems = [];
    for (const item of items) {
      const price = Number(item.price);
      const qty = Number(item.qty);
      if (typeof item.name !== 'string' || !item.name.trim() ||
          !['OPEN', 'PACK'].includes(item.visibleIn) || !VALID_UNITS.includes(item.unit) ||
          !Number.isFinite(price) || price < 0 || !Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ message: 'Bill contains an invalid item' });
      }
      validatedItems.push({
        name: item.name.trim(),
        category: typeof item.category === 'string' ? item.category.trim() : '',
        visibleIn: item.visibleIn,
        unit: item.unit,
        price,
        qty,
        amount: Math.round(price * qty * 100) / 100,
      });
    }

    const calculatedTotal = Math.round(validatedItems.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    if (Math.abs(calculatedTotal - Number(totalAmount)) > 0.01) {
      return res.status(400).json({ message: 'Bill total does not match its items' });
    }

    let bill;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const lastBill = await Bill.findOne({ user: req.user.id }).sort({ billNo: -1 }).select('billNo');
      try {
        bill = await Bill.create({
          user: req.user.id,
          billNo: lastBill ? lastBill.billNo + 1 : 1,
          items: validatedItems,
          totalAmount: calculatedTotal,
          format,
        });
        break;
      } catch (err) {
        if (err.code !== 11000 || attempt === 2) throw err;
      }
    }
    res.status(201).json(bill);
  } catch (err) {
    if (err.name === 'ValidationError') return res.status(400).json({ message: 'Bill data is invalid' });
    console.error('Unable to save bill:', err);
    res.status(500).json({ message: 'Unable to save bill' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { date, today } = req.query;
    let range;
    if (today === 'true') {
      const todayInIndia = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
      range = indiaDayRange(todayInIndia);
    } else if (date !== undefined) {
      if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: 'Date must be in YYYY-MM-DD format' });
      }
      range = indiaDayRange(date);
      if (!range || !isValidDate(date)) {
        return res.status(400).json({ message: 'Date is invalid' });
      }
    }

    const query = { user: req.user.id };
    if (range) query.createdAt = { $gte: range.start, $lte: range.end };
    const bills = await Bill.find(query).sort({ createdAt: -1 });
    res.json(bills);
  } catch (err) {
    console.error('Unable to fetch bills:', err);
    res.status(500).json({ message: 'Unable to fetch bills' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, user: req.user.id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json(bill);
  } catch (err) {
    if (err.name === 'CastError') return res.status(400).json({ message: 'Invalid bill ID' });
    res.status(500).json({ message: 'Unable to fetch bill' });
  }
});

module.exports = router;
