import mongoose from 'mongoose';

const gameSessionSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  gameType: {
    type: String,
    enum: ['AVIATOR', 'CHICKEN_ROAD'],
    required: true,
  },
  serverSeed: {
    type: String,
    required: true,
  },
  serverSeedHash: {
    type: String,
    required: true,
    index: true,
  },
  clientSeed: {
    type: String,
    required: true,
  },
  nonce: {
    type: Number,
    required: true,
  },
  crashPoint: {
    type: Number, // Computed or overridden crash point
  },
  pathConfig: {
    type: [Number], // For Chicken Road
  },
  
  // Telemetry Metrics
  totalBetsVolume: { type: Number, default: 0.00 },
  totalPayoutsVolume: { type: Number, default: 0.00 },
  netHouseProfit: { type: Number, default: 0.00 },
  totalBetsCount: { type: Number, default: 0 },

  // Override Audit Trail
  mode: { type: String, enum: ['AUTOMATED', 'OVERRIDE'], default: 'AUTOMATED' },
  isOverridden: { type: Boolean, default: false },
  overrideType: { type: String, enum: ['NONE', 'MANUAL_OVERRIDE', 'RISK_AUTO_CAP'], default: 'NONE' },

  status: {
    type: String,
    enum: ['BETTING', 'RUNNING', 'CRASHED', 'FINISHED'],
    default: 'BETTING',
  },
  endedAt: {
    type: Date,
  },
}, { timestamps: true });

export const GameSession = mongoose.model('GameSession', gameSessionSchema);
