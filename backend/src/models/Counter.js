import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.Mixed,
    },
    key: {
      type: String,
      index: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  {
    strict: false,
    timestamps: true,
  }
);

export const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);
export default Counter;
