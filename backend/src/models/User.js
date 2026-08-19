import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    default: '',
    trim: true,
    lowercase: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  walletBalance: {
    type: Number,
    default: 1.00, // ₹1.00 Signup Bonus
    min: 0,
  },
  role: {
    type: String,
    enum: ['USER', 'ADMIN'],
    default: 'USER',
  },
  clientSeed: {
    type: String,
    default: 'bhagya_client_seed_default',
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isExcludedFromStats: {
    type: Boolean,
    default: false,
  },
  currentSessionId: {
    type: String,
    default: null,
  },
  lastDailyRewardClaim: {
    type: Date,
    default: null,
  },
  totalDailyRewardsClaimed: {
    type: Number,
    default: 0,
  },
  lastActiveAt: {
    type: Date,
    default: Date.now,
  },
  activeDays: [{
    type: String, // YYYY-MM-DD date strings
  }],
  loginStreak: {
    type: Number,
    default: 1,
  },
  maxLoginStreak: {
    type: Number,
    default: 1,
  },
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
