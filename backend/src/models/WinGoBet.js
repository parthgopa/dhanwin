import mongoose from 'mongoose';

const winGoBetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  username: { type: String, required: true },
  periodId: { type: String, required: true, index: true },
  mode: { type: String, enum: ['30s', '1m', '3m', '5m'], required: true },
  
  // Bet Target
  selectType: { type: String, enum: ['NUMBER', 'COLOR', 'SIZE'], required: true },
  selectValue: { type: String, required: true }, // '0'..'9', 'RED'/'GREEN'/'VIOLET', 'BIG'/'SMALL'
  
  unitPrice: { type: Number, required: true, min: 1 },
  multiplier: { type: Number, required: true, min: 1, default: 1 },
  totalAmount: { type: Number, required: true },
  fee: { type: Number, default: 0 },
  netAmount: { type: Number, required: true },

  // Resolution
  status: { type: String, enum: ['PENDING', 'WON', 'LOST'], default: 'PENDING', index: true },
  payoutAmount: { type: Number, default: 0.00 },
  wonMultiplier: { type: Number, default: 0 },
}, { timestamps: true });

export const WinGoBet = mongoose.model('WinGoBet', winGoBetSchema);
