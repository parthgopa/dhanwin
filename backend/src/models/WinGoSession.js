import mongoose from 'mongoose';

const winGoSessionSchema = new mongoose.Schema({
  periodId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  mode: {
    type: String,
    enum: ['30s', '1m', '3m', '5m'],
    required: true,
    index: true,
  },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  
  // Winning Result (0-9)
  winningNumber: { type: Number, min: 0, max: 9 },
  winningColor: { type: String, enum: ['RED', 'GREEN', 'VIOLET', 'RED_VIOLET', 'GREEN_VIOLET'] },
  winningSize: { type: String, enum: ['BIG', 'SMALL'] },

  // Telemetry & Pool Totals
  totalPool: { type: Number, default: 0.00 },
  totalPayout: { type: Number, default: 0.00 },
  netHouseProfit: { type: Number, default: 0.00 },
  totalBetsCount: { type: Number, default: 0 },
  
  // Breakdown of Bets by Option
  exposureBreakdown: {
    numbers: { type: Object, default: {} },
    colors: {
      RED: { type: Number, default: 0 },
      GREEN: { type: Number, default: 0 },
      VIOLET: { type: Number, default: 0 }
    },
    sizes: {
      BIG: { type: Number, default: 0 },
      SMALL: { type: Number, default: 0 }
    }
  },

  // Audit Trail & Overrides
  algorithmMode: { type: String, enum: ['LOWEST_EXPOSURE', 'RNG', 'MANUAL_OVERRIDE'], default: 'LOWEST_EXPOSURE' },
  isOverridden: { type: Boolean, default: false },
  forcedOutcome: { type: Number, default: null },

  status: {
    type: String,
    enum: ['BETTING', 'LOCKED', 'COMPLETED'],
    default: 'BETTING',
    index: true,
  },
  serverSeedHash: { type: String },
}, { timestamps: true });

export const WinGoSession = mongoose.model('WinGoSession', winGoSessionSchema);
