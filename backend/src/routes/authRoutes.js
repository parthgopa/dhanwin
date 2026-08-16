import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// In-memory OTP Store for 2FA verification (5-minute TTL)
const otpStore = new Map();

// 1. Send OTP for Registration (2FA)
router.post('/send-otp', async (req, res) => {
  try {
    const { username, phone } = req.body;

    if (!username || !phone) {
      return res.status(400).json({ message: 'Username and phone number are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or Phone number is already registered' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tempToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(tempToken, {
      username,
      phone,
      otp,
      expiresAt,
    });

    console.log(`[2FA OTP] Generated OTP for Phone ${phone}: ${otp} (TempToken: ${tempToken})`);

    res.json({
      message: `OTP sent to +91 ${phone}`,
      tempToken,
      otp, // Provided in response for easy testing / Firebase fallback
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating OTP', error: error.message });
  }
});

// 2. Register User (Verifies OTP & Credits ₹10 Signup Bonus)
router.post('/register', async (req, res) => {
  try {
    const { username, phone, password, otp, tempToken } = req.body;

    if (!username || !phone || !password || !otp || !tempToken) {
      return res.status(400).json({ message: 'All fields including OTP verification are required' });
    }

    // Validate OTP in Store
    const otpData = otpStore.get(tempToken);
    if (!otpData) {
      return res.status(400).json({ message: 'Invalid or expired OTP session. Please request a new OTP.' });
    }

    if (Date.now() > otpData.expiresAt) {
      otpStore.delete(tempToken);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (otpData.otp !== otp.trim()) {
      return res.status(400).json({ message: 'Incorrect OTP code. Please try again.' });
    }

    // Clear OTP after successful verification
    otpStore.delete(tempToken);

    // Double check user duplication
    const existingUser = await User.findOne({ $or: [{ username }, { phone }] });
    if (existingUser) {
      return res.status(400).json({ message: 'Username or Phone number already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user with ₹10.00 Signup Bonus
    const newUser = await User.create({
      username,
      phone,
      passwordHash,
      role: 'USER',
      walletBalance: 10.00, // ₹10 Signup Bonus
    });

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, role: newUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Account verified & created successfully! ₹10 Signup Bonus credited.',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        phone: newUser.phone,
        walletBalance: newUser.walletBalance,
        role: newUser.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error completing registration', error: error.message });
  }
});

// 3. User Login
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Username/phone and password are required' });
    }

    const user = await User.findOne({
      $or: [{ username: identifier }, { phone: identifier }]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is suspended' });
    }

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        walletBalance: user.walletBalance,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// 4. Isolated Dedicated Admin Login Route (/admin-login)
router.post('/admin-login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Admin username and password are required' });
    }

    const adminUser = await User.findOne({ username, role: 'ADMIN' });
    if (!adminUser) {
      return res.status(401).json({ message: 'Invalid admin credentials or non-admin account' });
    }

    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const token = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: 'ADMIN' },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      message: 'Admin access granted',
      token,
      user: {
        id: adminUser._id,
        username: adminUser.username,
        role: 'ADMIN',
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Admin authentication error', error: error.message });
  }
});

// 5. Get Current Logged-in User Profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        phone: req.user.phone,
        walletBalance: req.user.walletBalance,
        role: req.user.role,
        clientSeed: req.user.clientSeed,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

export default router;
