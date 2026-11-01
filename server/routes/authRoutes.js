const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.SECRET_KEY, { expiresIn: '30d' });
};

const sanitizeUser = (user) => ({
  id: user._id,
  ownerName: user.ownerName,
  shopName: user.shopName,
  email: user.email,
  mobNo: user.mobNo,
  address: user.address,
  endMsg: user.endMsg,
});

// @route POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { ownerName, email, password, confirmPassword } = req.body;

    if (typeof ownerName !== 'string' || !ownerName.trim() ||
        typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email) ||
        typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      ownerName: ownerName.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    const token = generateToken(user._id);
    res.status(201).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email already registered' });
    console.error('Signup failed:', err);
    res.status(500).json({ message: 'Unable to create account' });
  }
});

// @route POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user || !user.password) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Login failed:', err);
    res.status(500).json({ message: 'Unable to sign in' });
  }
});

// @route POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ message: 'idToken is required' });
    const audiences = [
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_ANDROID_CLIENT_ID,
      process.env.GOOGLE_IOS_CLIENT_ID,
    ].filter(Boolean);
    if (!audiences.length) {
      return res.status(503).json({ message: 'Google authentication is not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: audiences,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name } = payload || {};
    if (!googleId || !email) return res.status(401).json({ message: 'Google token did not contain an email' });

    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        ownerName: name || 'Shop Owner',
        email: email.toLowerCase(),
        googleId,
      });
    } else if (!user.googleId) {
      user.googleId = googleId;
      await user.save();
    }

    const token = generateToken(user._id);
    res.json({ token, user: sanitizeUser(user) });
  } catch (err) {
    console.error('Google authentication failed:', err.message);
    res.status(401).json({ message: 'Google authentication failed' });
  }
});

// @route GET /api/auth/me
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    console.error('Loading profile failed:', err);
    res.status(500).json({ message: 'Unable to load profile' });
  }
});

// @route PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { ownerName, shopName, mobNo, email, address, endMsg } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (ownerName !== undefined) user.ownerName = String(ownerName).trim();
    if (shopName !== undefined) user.shopName = String(shopName).trim();
    if (mobNo !== undefined) user.mobNo = String(mobNo).trim();
    if (email !== undefined) {
      if (typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email)) {
        return res.status(400).json({ message: 'A valid email is required' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (address !== undefined) user.address = String(address).trim();
    if (endMsg !== undefined) user.endMsg = String(endMsg).trim();

    await user.save();
    res.json({ user: sanitizeUser(user) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Email is already in use' });
    console.error('Updating profile failed:', err);
    res.status(500).json({ message: 'Unable to update profile' });
  }
});

module.exports = router;
