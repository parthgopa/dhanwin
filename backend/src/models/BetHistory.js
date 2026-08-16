import mongoose from 'mongoose';

const betHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  username: {
    type: String,
    required: true,
  },
  gameId: {
    type: String,
    required: true,
    index: true,
  },
  gameType: {
    type: String,
    enum: ['AVIATOR', 'CHICKEN_ROAD'],
    required: true,
  },
  betAmount: {
    type: Number,
    required: true,
    min: 1,
  },
  autoCashOut: {
    type: Number,
    default: null,
  },
  cashOutMultiplier: {
    type: Number,
    default: null,
  },
  payoutAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['PLACED', 'CASHOUT', 'LOST'],
    default: 'PLACED',
  },
  stepReached: {
    type: Number,
    default: 0, // For Chicken Road
  },
}, { timestamps: true });

export const BetHistory = mongoose.model('BetHistory', betHistorySchema);
