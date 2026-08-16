import express from 'express';
import QRCode from 'qrcode';
import { verifyToken } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';

const router = express.Router();

// ── MINIMUM & MAXIMUM LIMITS CONFIGURATION ──────────────────────────────────────
const MIN_DEPOSIT_AMOUNT = 100;
const MIN_WITHDRAWAL_AMOUNT = 300;
const MAX_WITHDRAWAL_AMOUNT = 5000;

// 1. Initiate Deposit (Generate Dynamic UPI QR Code)
router.post('/deposit/qr', verifyToken, async (req, res) => {
  try {
    const { amount } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount < MIN_DEPOSIT_AMOUNT) {
      return res.status(400).json({ message: `Minimum deposit amount is ₹${MIN_DEPOSIT_AMOUNT}` });
    }

    const upiId = process.env.UPI_ID || 'dhanwin@upi';
    const upiName = process.env.UPI_NAME || 'Dhanwin Platform';

    // Standard Universal UPI Deep Link URL
    const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${numAmount.toFixed(2)}&cu=INR&tn=Deposit_Dhanwin`;

    // Generate Base64 Data URL for display in React Frontend modal
    const qrCodeDataUrl = await QRCode.toDataURL(upiPayload, {
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      width: 300,
    });

    res.json({
      amount: numAmount,
      upiId,
      upiName,
      qrCodeDataUrl,
      instructions: 'Scan with Paytm, PhonePe, Google Pay, or BHIM. After paying, submit your 12-digit UTR/Reference Number.',
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating UPI QR code', error: error.message });
  }
});

// 2. Submit Deposit UTR Number (Auto-Verification & Instant Credit)
router.post('/deposit/submit-utr', verifyToken, async (req, res) => {
  try {
    const { amount, utrNumber } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount < MIN_DEPOSIT_AMOUNT) {
      return res.status(400).json({ message: `Minimum deposit amount is ₹${MIN_DEPOSIT_AMOUNT}` });
    }

    if (!utrNumber) {
      return res.status(400).json({ message: 'UTR / Transaction Reference Number is required' });
    }

    const cleanUTR = utrNumber.toString().trim().replace(/[^0-9]/g, '');

    // Enforce strict 12-digit standard NPCI UPI UTR format
    if (cleanUTR.length !== 12) {
      return res.status(400).json({
        message: 'Invalid UTR format. Please enter the exact 12-digit numeric UTR / UPI Ref ID from your payment receipt.',
      });
    }

    // Check duplicate UTR (Prevent replay attacks)
    const existingTx = await WalletTransaction.findOne({ utrNumber: cleanUTR });
    if (existingTx) {
      return res.status(400).json({ message: 'This UTR number has already been submitted or processed.' });
    }

    const io = req.app.get('io');
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create transaction record
    const transaction = await WalletTransaction.create({
      userId: user._id,
      type: 'DEPOSIT',
      amount: numAmount,
      status: 'PENDING',
      utrNumber: cleanUTR,
    });

    const populatedTx = await WalletTransaction.findById(transaction._id).populate('userId', 'username phone walletBalance');
    if (io) {
      io.to('admin_room').emit('admin:new_transaction', { transaction: populatedTx });
      io.emit('admin:new_transaction', { transaction: populatedTx });
    }

    res.status(201).json({
      message: 'Deposit UTR submitted successfully! Verifying with banking gateway.',
      transaction: populatedTx,
      autoApproved: false,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error submitting deposit UTR', error: error.message });
  }
});

// ── 2B. AUTOMATED BANK / FAMPAY / PAYTM WEBHOOK LISTENER ────────────────────────
// Connect your Payment Gateway / Bank SMS Forwarder / Notification Webhook here
router.post('/webhook/bank-credit', async (req, res) => {
  try {
    const { utrNumber, amount, secretKey } = req.body;
    const configuredSecret = process.env.WEBHOOK_SECRET || 'dhanwin_secure_webhook_key';

    // Verify webhook authentication key
    if (secretKey && secretKey !== configuredSecret) {
      return res.status(401).json({ message: 'Unauthorized webhook request' });
    }

    if (!utrNumber || !amount) {
      return res.status(400).json({ message: 'Missing utrNumber or amount in webhook payload' });
    }

    const cleanUTR = utrNumber.toString().trim().replace(/[^0-9]/g, '');
    const numAmount = Number(amount);

    // Find pending deposit transaction matching UTR & Amount
    const transaction = await WalletTransaction.findOne({
      utrNumber: cleanUTR,
      status: 'PENDING',
      type: 'DEPOSIT',
    });

    if (!transaction) {
      return res.json({
        received: true,
        matched: false,
        message: 'Credit received, but no pending user submission found yet for this UTR.',
      });
    }

    // Verify amount matches
    if (Math.abs(transaction.amount - numAmount) > 0.01) {
      transaction.status = 'REJECTED';
      transaction.adminNote = `Mismatched amount received in bank webhook: Expected ₹${transaction.amount}, Received ₹${numAmount}`;
      await transaction.save();
      return res.status(400).json({ message: 'Amount mismatch' });
    }

    // Approve & Credit User Wallet Immediately
    const targetUser = await User.findById(transaction.userId);
    if (targetUser) {
      targetUser.walletBalance += transaction.amount;
      await targetUser.save();

      transaction.status = 'APPROVED';
      transaction.adminNote = 'Auto-verified and credited via automated Banking Gateway Webhook';
      transaction.processedAt = new Date();
      await transaction.save();

      // Emit Real-time WebSocket Balance Update & Instant Popup to user
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${targetUser._id}`).emit('deposit_approved', {
          transactionId: transaction._id,
          amount: transaction.amount,
          newBalance: targetUser.walletBalance,
          message: `₹${transaction.amount} Added to Your Account!`,
        });
        io.to(`user_${targetUser._id}`).emit('balance_update', {
          newBalance: targetUser.walletBalance,
          message: `🎉 Payment Verified! ₹${transaction.amount} credited to your wallet instantly!`,
        });
      }

      console.log(`[Auto-Deposit Webhook] User ${targetUser.username} auto-credited ₹${transaction.amount} for UTR ${cleanUTR}`);

      return res.json({
        success: true,
        message: `User ${targetUser.username} auto-credited ₹${transaction.amount}`,
        newBalance: targetUser.walletBalance,
      });
    }

    res.json({ success: false, message: 'User not found for transaction' });
  } catch (error) {
    console.error('[Deposit Webhook Error]', error);
    res.status(500).json({ message: 'Internal webhook error', error: error.message });
  }
});

// 3. Request Withdrawal (Min ₹500, Max ₹5000)
router.post('/withdraw', verifyToken, async (req, res) => {
  try {
    const { amount, upiId, accountNumber, ifscCode, accountHolderName } = req.body;
    const numAmount = Number(amount);

    if (!numAmount || numAmount < MIN_WITHDRAWAL_AMOUNT) {
      return res.status(400).json({ message: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}` });
    }

    if (numAmount > MAX_WITHDRAWAL_AMOUNT) {
      return res.status(400).json({ message: `Maximum withdrawal amount is ₹${MAX_WITHDRAWAL_AMOUNT}` });
    }

    if (!upiId && (!accountNumber || !ifscCode)) {
      return res.status(400).json({ message: 'Please provide either UPI ID or complete Bank Account details' });
    }

    // Check user balance and 24-hour account age requirement atomically
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 24-Hour Account Creation Security Check
    const accountAgeMs = Date.now() - new Date(user.createdAt).getTime();
    const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

    if (accountAgeMs < TWENTY_FOUR_HOURS_MS) {
      const hoursRemaining = Math.ceil((TWENTY_FOUR_HOURS_MS - accountAgeMs) / (60 * 60 * 1000));
      return res.status(400).json({
        message: `Withdrawals are only allowed 24 hours after account creation. Please try again in ${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''}.`,
        hoursRemaining,
      });
    }

    // Maximum 2 withdrawals per 24 hours (excluding rejected)
    const twentyFourHoursAgo = new Date(Date.now() - TWENTY_FOUR_HOURS_MS);
    const dailyWithdrawalCount = await WalletTransaction.countDocuments({
      userId: user._id,
      type: 'WITHDRAWAL',
      status: { $in: ['PENDING', 'APPROVED'] },
      createdAt: { $gte: twentyFourHoursAgo },
    });

    if (dailyWithdrawalCount >= 2) {
      return res.status(400).json({
        message: 'Daily withdrawal limit reached. Maximum 2 withdrawals allowed per day. Please try again tomorrow.',
      });
    }

    if (user.walletBalance < numAmount) {
      return res.status(400).json({ message: `Insufficient wallet balance. Available: ₹${user?.walletBalance || 0}` });
    }

    // Hold/Deduct funds temporarily during pending approval
    user.walletBalance -= numAmount;
    await user.save();

    const transaction = await WalletTransaction.create({
      userId: user._id,
      type: 'WITHDRAWAL',
      amount: numAmount,
      status: 'PENDING',
      paymentDetails: {
        upiId: upiId || '',
        accountNumber: accountNumber || '',
        ifscCode: ifscCode || '',
        accountHolderName: accountHolderName || '',
      },
    });

    const populatedTx = await WalletTransaction.findById(transaction._id).populate('userId', 'username phone walletBalance');
    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('admin:new_transaction', { transaction: populatedTx });
      io.emit('admin:new_transaction', { transaction: populatedTx });
    }

    res.status(201).json({
      message: 'Withdrawal request submitted successfully! Processing time: 5-6 hours.',
      notice: 'Processing takes 5-6 hours. Your funds have been locked while the payout is processed.',
      transaction: populatedTx,
      newBalance: user.walletBalance,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error initiating withdrawal', error: error.message });
  }
});

// 4. Get User Transaction History
router.get('/transactions', verifyToken, async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ transactions });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching transactions', error: error.message });
  }
});

// 5. Get Unnotified Approved Deposits (Shown when user logs in or returns to website)
router.get('/unnotified-deposits', verifyToken, async (req, res) => {
  try {
    const unnotifiedDeposits = await WalletTransaction.find({
      userId: req.user._id,
      type: 'DEPOSIT',
      status: 'APPROVED',
      userNotified: { $ne: true },
    }).sort({ createdAt: -1 });

    res.json({ unnotifiedDeposits });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching unnotified deposits', error: error.message });
  }
});

// 6. Mark Approved Deposits As Notified
router.post('/mark-notified', verifyToken, async (req, res) => {
  try {
    const { transactionIds } = req.body;
    if (Array.isArray(transactionIds) && transactionIds.length > 0) {
      await WalletTransaction.updateMany(
        { _id: { $in: transactionIds }, userId: req.user._id },
        { $set: { userNotified: true } }
      );
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Error marking notified', error: error.message });
  }
});

export default router;
