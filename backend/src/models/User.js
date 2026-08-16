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
    default: 10.00, // ₹10.00 Signup Bonus
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
}, { timestamps: true });

export const User = mongoose.model('User', userSchema);
