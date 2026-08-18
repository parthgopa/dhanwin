import mongoose from 'mongoose';

const systemSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    default: 'global_settings',
  },
  isWithdrawalDisabled: {
    type: Boolean,
    default: false,
  },
  withdrawalDisabledMessage: {
    type: String,
    default: 'Withdrawals are temporarily paused due to scheduled banking gateway maintenance / technical issue. Please try again shortly.',
  },
  isDepositDisabled: {
    type: Boolean,
    default: false,
  },
  depositDisabledMessage: {
    type: String,
    default: 'Deposits are temporarily undergoing gateway sync. Please try again in a few minutes.',
  },
  activeOverrides: {
    aviator: {
      isForced: { type: Boolean, default: false },
      forcedMultiplier: { type: Number, default: null },
      updatedAt: { type: Date, default: Date.now },
    },
    wingo: {
      '30s': { isForced: Boolean, value: mongoose.Schema.Types.Mixed },
      '1m': { isForced: Boolean, value: mongoose.Schema.Types.Mixed },
      '3m': { isForced: Boolean, value: mongoose.Schema.Types.Mixed },
      '5m': { isForced: Boolean, value: mongoose.Schema.Types.Mixed },
    },
  },
  riskAlerts: [
    {
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      alertType: {
        type: String,
        enum: ['HIGH_PROFIT_WITHDRAWAL', 'WIN_STREAK_OVERRIDE', 'RAPID_CASHOUT', 'HIGH_ROLLER_ANOMALY'],
        default: 'HIGH_PROFIT_WITHDRAWAL',
      },
      amount: Number,
      message: String,
      details: mongoose.Schema.Types.Mixed,
      createdAt: { type: Date, default: Date.now },
      isDismissed: { type: Boolean, default: false },
    },
  ],
}, { timestamps: true });

// Helper to get or create singleton global settings
systemSettingSchema.statics.getGlobal = async function () {
  let settings = await this.findOne({ key: 'global_settings' });
  if (!settings) {
    settings = await this.create({ key: 'global_settings' });
  }
  return settings;
};

export const SystemSetting = mongoose.model('SystemSetting', systemSettingSchema);
