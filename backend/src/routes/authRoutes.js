import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { User } from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';
import { emitToUser } from '../socket/gameSocket.js';

const router = express.Router();

// Email Transporter for OTP Delivery
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'dhanwin0912@gmail.com',
    pass: (process.env.EMAIL_PASS || 'tubknncwfkvkzhdh').replace(/\s+/g, ''),
  },
});

const sendOtpEmail = async (toEmail, otp) => {
  const mailOptions = {
    from: `"Dhanwin Official" <${process.env.EMAIL_USER || 'dhanwin0912@gmail.com'}>`,
    to: toEmail,
    subject: `Dhanwin Registration OTP: ${otp}`,
    html: `
      <div style="background-color: #0b0e14; padding: 30px; font-family: 'Segoe UI', Arial, sans-serif; color: #ffffff; max-width: 500px; margin: auto; border-radius: 16px; border: 1px solid rgba(245, 158, 11, 0.3);">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #f59e0b; margin: 0; font-size: 26px; letter-spacing: 2px;">❖ DHANWIN</h1>
          <p style="color: #94a3b8; font-size: 13px; margin-top: 4px;">Play Smarter, Win Bigger</p>
        </div>
        <div style="background: rgba(26, 14, 54, 0.7); padding: 24px; border-radius: 12px; text-align: center; border: 1px solid rgba(168, 85, 247, 0.3);">
          <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 12px;">Your email verification code for Dhanwin registration is:</p>
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #fbbf24; background: #000000; padding: 12px 20px; border-radius: 8px; display: inline-block; border: 1px solid #f59e0b; margin: 10px 0;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">⏱️ This OTP is valid for <strong>5 minutes</strong>. Do not share this code with anyone.</p>
        </div>
        <div style="text-align: center; margin-top: 24px; color: #64748b; font-size: 11px;">
          &copy; ${new Date().getFullYear()} Dhanwin Platform. All rights reserved.
        </div>
      </div>
    `,
  };

  return transporter.sendMail(mailOptions);
};

// In-memory OTP Store for 2FA verification (5-minute TTL)
const otpStore = new Map();

// 1. Send OTP for Registration (Email & Phone Verification)
router.post('/send-otp', async (req, res) => {
  try {
    const { username, phone, email } = req.body;

    if (!phone || !email) {
      return res.status(400).json({ message: 'Mobile number and Email address are required' });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email.toLowerCase().trim();
    const effectiveUsername = (username && username.trim()) ? username.trim() : `user_${cleanPhone.slice(-4)}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ message: 'Please enter a valid email address' });
    }

    // Check if phone, email, or username already exists
    const existingPhone = await User.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: `+91${cleanPhone}` },
        { phone: `91${cleanPhone}` },
        { phone: { $regex: `${cleanPhone}$` } },
      ],
    });
    if (existingPhone) {
      return res.status(400).json({ message: 'Mobile number is already registered' });
    }

    const existingEmail = await User.findOne({ email: cleanEmail });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email address is already registered' });
    }

    const existingUser = await User.findOne({ username: effectiveUsername });
    if (existingUser) {
      return res.status(400).json({ message: 'Username is already taken' });
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const tempToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    otpStore.set(tempToken, {
      username: effectiveUsername,
      phone: cleanPhone,
      email: cleanEmail,
      otp,
      expiresAt,
    });

    console.log(`[Email OTP] Sending OTP to ${cleanEmail}: ${otp} (TempToken: ${tempToken})`);

    // Dispatch Email via Gmail SMTP
    try {
      await sendOtpEmail(cleanEmail, otp);
      console.log(`[Email OTP] Successfully delivered email to ${cleanEmail}`);
    } catch (mailError) {
      console.error('[Email OTP Send Failed]', mailError.message);
      // In case of SMTP auth error, log details but let frontend test if needed
    }

    res.json({
      message: `OTP sent to registered email (${cleanEmail})`,
      tempToken,
      email: cleanEmail,
    });
  } catch (error) {
    console.error('[send-otp Error]', error);
    res.status(500).json({ message: 'Error generating OTP', error: error.message });
  }
});

// 2. Register User (Verifies Email OTP & Credits ₹1 Signup Bonus)
router.post('/register', async (req, res) => {
  try {
    const { username, phone, email, password, otp, tempToken } = req.body;

    if (!password || !otp || !tempToken) {
      return res.status(400).json({ message: 'Password and OTP verification are required' });
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
      return res.status(400).json({ message: 'Incorrect OTP code. Please check your email and try again.' });
    }

    const regPhone = phone ? phone.trim().replace(/[^0-9]/g, '').slice(-10) : otpData.phone;
    const regEmail = email ? email.toLowerCase().trim() : otpData.email;
    const regUsername = username ? username.trim() : otpData.username;

    // Clear OTP after successful verification
    otpStore.delete(tempToken);

    // Double check user duplication
    const existingPhone = await User.findOne({
      $or: [
        { phone: regPhone },
        { phone: `+91${regPhone}` },
        { phone: `91${regPhone}` },
        { phone: { $regex: `${regPhone}$` } },
      ],
    });
    if (existingPhone) {
      return res.status(400).json({ message: 'Mobile number is already registered' });
    }

    const existingEmail = await User.findOne({ email: regEmail });
    if (existingEmail) {
      return res.status(400).json({ message: 'Email address is already registered' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

    // Create user with ₹1.00 Signup Bonus
    const newUser = await User.create({
      username: regUsername,
      phone: regPhone,
      email: regEmail,
      passwordHash,
      role: 'USER',
      walletBalance: 1.00, // ₹1 Signup Bonus
      currentSessionId: sessionId,
    });

    const token = jwt.sign(
      { id: newUser._id, username: newUser.username, role: newUser.role, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '15d' }
    );

    res.status(201).json({
      message: 'Account verified & created successfully! ₹1 Signup Bonus credited.',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        phone: newUser.phone,
        email: newUser.email,
        walletBalance: newUser.walletBalance,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error('[Registration Error]', error);
    if (error.code === 11000) {
      if (error.keyPattern?.phone) {
        return res.status(400).json({ message: 'Mobile number is already registered' });
      }
      if (error.keyPattern?.email) {
        return res.status(400).json({ message: 'Email address is already registered' });
      }
      if (error.keyPattern?.username) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
      return res.status(400).json({ message: 'Mobile number or Email is already registered' });
    }
    res.status(500).json({ message: 'Error completing registration', error: error.message });
  }
});

// 3. User Login (Supports Username, Phone or Email)
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Mobile/Email and password are required' });
    }

    const cleanIdentifier = identifier.trim();
    const user = await User.findOne({
      $or: [
        { username: cleanIdentifier },
        { phone: cleanIdentifier },
        { email: cleanIdentifier.toLowerCase() },
      ]
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
    }

    // Generate new unique sessionId and evict previous device session
    const sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    user.currentSessionId = sessionId;
    await user.save();

    emitToUser(user._id, 'session:evicted', {
      message: 'You have been logged out because your account was accessed from another device.',
      code: 'SESSION_TERMINATED',
    });

    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '15d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        walletBalance: user.walletBalance,
        role: user.role,
        isBlocked: user.isBlocked,
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

    if (adminUser.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    adminUser.currentSessionId = sessionId;
    await adminUser.save();

    emitToUser(adminUser._id, 'session:evicted', {
      message: 'Your admin account was logged in from another device. Session terminated.',
      code: 'SESSION_TERMINATED',
    });

    const token = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: 'ADMIN', sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    res.json({
      message: 'Admin access granted',
      token,
      user: {
        id: adminUser._id,
        username: adminUser.username,
        role: 'ADMIN',
        isBlocked: adminUser.isBlocked,
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
        isBlocked: req.user.isBlocked,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error: error.message });
  }
});

export default router;
