import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { BetHistory } from '../models/BetHistory.js';
import { WinGoBet } from '../models/WinGoBet.js';
import { SystemSetting } from '../models/SystemSetting.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';
import { emitToUser } from '../socket/gameSocket.js';
import {
  computeUserConsistency,
  computePlatformConsistencySummary,
  getDateString,
} from '../utils/userConsistency.js';

const router = express.Router();

// ── Superadmin Authentication Helper ─────────────────────────────────────────
const verifySuperAdmin = async (req, res, next) => {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERADMIN')) {
    return res.status(403).json({ message: 'Access Denied: Super Admin master clearance required.' });
  }
  next();
};

// 1. Super Admin Login (/api/superad/login)
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password are required' });
    }

    const adminUser = await User.findOne({
      username: username.trim(),
      role: { $in: ['ADMIN', 'SUPERADMIN'] },
    });

    if (!adminUser) {
      return res.status(401).json({ message: 'Invalid superadmin credentials or insufficient clearance' });
    }

    if (adminUser.isBlocked) {
      return res.status(403).json({ message: 'Your account is blocked. Contact system root.' });
    }

    const isMatch = await bcrypt.compare(password, adminUser.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid superadmin credentials' });
    }

    const sessionId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    adminUser.currentSessionId = sessionId;
    await adminUser.save();

    emitToUser(adminUser._id, 'session:evicted', {
      message: 'Your superadmin account was logged in from another device. Session terminated.',
      code: 'SESSION_TERMINATED',
    });

    const token = jwt.sign(
      { id: adminUser._id, username: adminUser.username, role: adminUser.role, sessionId },
      process.env.JWT_SECRET,
      { expiresIn: '2d' }
    );

    res.json({
      message: 'Super Admin Access Authorized',
      token,
      user: {
        id: adminUser._id,
        username: adminUser.username,
        role: adminUser.role,
        email: adminUser.email,
        phone: adminUser.phone,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Superadmin login error', error: error.message });
  }
});

// Helper for timeframe dates
const getTimeframeRange = (timeframe, customStart, customEnd) => {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);

  if (timeframe === 'today') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === 'yesterday') {
    start.setDate(now.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(now.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === 'this_week') {
    const dayOfWeek = now.getDay();
    const distanceToMonday = (dayOfWeek + 6) % 7;
    start.setDate(now.getDate() - distanceToMonday);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === 'this_month') {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (timeframe === 'custom' && customStart && customEnd) {
    start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
  } else {
    // Default: Last 7 days
    start.setDate(now.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

// 2. Executive Master Overview & Locked Vault Simulation (/api/superad/overview)
router.get('/overview', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { timeframe = 'today', startDate, endDate } = req.query;
    const { start, end } = getTimeframeRange(timeframe, startDate, endDate);

    // Get excluded test accounts
    const excludedUsers = await User.find({ isExcludedFromStats: true }).select('_id');
    const excludedUserIds = excludedUsers.map((u) => u._id);

    // ── 1. New Users Acquisition Cohort ─────────────────────────────────────
    const newUsersCount = await User.countDocuments({
      createdAt: { $gte: start, $lte: end },
    });
    const newUsers = await User.find({
      createdAt: { $gte: start, $lte: end },
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('username phone email walletBalance role isBlocked isExcludedFromStats createdAt');

    const totalUsersCount = await User.countDocuments({});

    // ── 2. Solvency & Total Float Liabilities ──────────────────────────────
    const allRealUsers = await User.find({ _id: { $nin: excludedUserIds } }).select('walletBalance');
    const totalPlayerLiabilities = allRealUsers.reduce((sum, u) => sum + (Number(u.walletBalance) || 0), 0);

    // ── 3. Realized Cash Flow (Approved Deposits & Withdrawals) ─────────────
    const allTransactions = await WalletTransaction.find({
      userId: { $nin: excludedUserIds },
    });

    let totalApprovedDeposits = 0;
    let totalApprovedWithdrawals = 0;
    let totalPendingWithdrawals = 0;
    let totalPendingDeposits = 0;

    allTransactions.forEach((tx) => {
      if (tx.type === 'DEPOSIT') {
        if (tx.status === 'APPROVED') totalApprovedDeposits += tx.amount;
        if (tx.status === 'PENDING') totalPendingDeposits += tx.amount;
      } else if (tx.type === 'WITHDRAWAL') {
        if (tx.status === 'APPROVED') totalApprovedWithdrawals += tx.amount;
        if (tx.status === 'PENDING') totalPendingWithdrawals += tx.amount;
      }
    });

    const realizedHouseNetProfit = totalApprovedDeposits - totalApprovedWithdrawals;

    // ── 4. Locked Vault Simulation ("Zero Payout / Retained Float Scenario") ──
    // Formula: If we withhold/freeze all pending withdrawals & do not give out current user balance float:
    // Retained House Capital = Realized Net Profit + Total Outstanding Player Float + Total Pending Withdrawals
    const simulatedMaxRetainedProfit = Math.round(
      realizedHouseNetProfit + totalPlayerLiabilities + totalPendingWithdrawals
    );

    // ── 5. Multi-Game House Turnover & Margins (Lifetime) ───────────────────
    const wingoBets = await WinGoBet.find({ userId: { $nin: excludedUserIds } });
    let wingoTurnover = 0;
    let wingoPayout = 0;
    wingoBets.forEach((b) => {
      wingoTurnover += b.totalAmount || 0;
      if (b.status === 'WON') wingoPayout += b.payoutAmount || 0;
    });
    const wingoProfit = wingoTurnover - wingoPayout;

    const aviatorBets = await BetHistory.find({
      userId: { $nin: excludedUserIds },
      gameType: { $in: ['AVIATOR', 'CHICKEN_ROAD'] },
    });
    let aviatorTurnover = 0;
    let aviatorPayout = 0;
    aviatorBets.forEach((b) => {
      aviatorTurnover += b.betAmount || 0;
      if (b.status === 'CASHOUT') aviatorPayout += b.payoutAmount || 0;
    });
    const aviatorProfit = aviatorTurnover - aviatorPayout;

    const totalCasinoTurnover = wingoTurnover + aviatorTurnover;
    const totalCasinoPayouts = wingoPayout + aviatorPayout;
    const totalCasinoGrossProfit = totalCasinoTurnover - totalCasinoPayouts;
    const houseMarginPercent = totalCasinoTurnover > 0 ? ((totalCasinoGrossProfit / totalCasinoTurnover) * 100).toFixed(2) : 0;

    // ── 6. Yesterday's Performance & Top Winning Players ───────────────────
    const yesterdayStart = new Date();
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    yesterdayStart.setHours(0, 0, 0, 0);

    const yesterdayEnd = new Date();
    yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Yesterday's Withdrawals
    const yesterdayWithdrawals = allTransactions.filter(
      (t) =>
        t.type === 'WITHDRAWAL' &&
        t.status === 'APPROVED' &&
        new Date(t.createdAt) >= yesterdayStart &&
        new Date(t.createdAt) <= yesterdayEnd
    );
    const yesterdayTotalWithdrawalsAmount = yesterdayWithdrawals.reduce((sum, t) => sum + t.amount, 0);

    // Yesterday's Game Cashouts (WinGo + Aviator)
    const yesterdayAviatorWins = await BetHistory.aggregate([
      {
        $match: {
          userId: { $nin: excludedUserIds },
          createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
          status: 'CASHOUT',
        },
      },
      {
        $group: {
          _id: '$userId',
          username: { $first: '$username' },
          totalWon: { $sum: '$payoutAmount' },
          totalBet: { $sum: '$betAmount' },
          betsCount: { $sum: 1 },
        },
      },
    ]);

    const yesterdayWinGoWins = await WinGoBet.aggregate([
      {
        $match: {
          userId: { $nin: excludedUserIds },
          createdAt: { $gte: yesterdayStart, $lte: yesterdayEnd },
          status: 'WON',
        },
      },
      {
        $group: {
          _id: '$userId',
          username: { $first: '$username' },
          totalWon: { $sum: '$payoutAmount' },
          totalBet: { $sum: '$totalAmount' },
          betsCount: { $sum: 1 },
        },
      },
    ]);

    // Combine player earnings for yesterday
    const playerEarningsMap = new Map();

    yesterdayAviatorWins.forEach((item) => {
      const uId = String(item._id);
      playerEarningsMap.set(uId, {
        userId: uId,
        username: item.username || 'Player',
        totalWon: item.totalWon || 0,
        totalBet: item.totalBet || 0,
        betsCount: item.betsCount || 0,
      });
    });

    yesterdayWinGoWins.forEach((item) => {
      const uId = String(item._id);
      if (playerEarningsMap.has(uId)) {
        const existing = playerEarningsMap.get(uId);
        existing.totalWon += item.totalWon || 0;
        existing.totalBet += item.totalBet || 0;
        existing.betsCount += item.betsCount || 0;
      } else {
        playerEarningsMap.set(uId, {
          userId: uId,
          username: item.username || 'Player',
          totalWon: item.totalWon || 0,
          totalBet: item.totalBet || 0,
          betsCount: item.betsCount || 0,
        });
      }
    });

    const yesterdayTopWinners = Array.from(playerEarningsMap.values())
      .map((p) => ({
        ...p,
        netProfit: Math.round(p.totalWon - p.totalBet),
        totalWon: Math.round(p.totalWon),
        totalBet: Math.round(p.totalBet),
      }))
      .filter((p) => p.netProfit > 0)
      .sort((a, b) => b.netProfit - a.netProfit)
      .slice(0, 15);

    const yesterdayTotalCashouts = Array.from(playerEarningsMap.values()).reduce(
      (sum, p) => sum + p.totalWon,
      0
    );

    // ── 7.5. Player Return Consistency & Retention Telemetry ───────────────
    const consistencyUsers = await User.find({ _id: { $nin: excludedUserIds } }).select(
      '_id username activeDays lastActiveAt createdAt lastDailyRewardClaim loginStreak maxLoginStreak'
    );
    const usersWithConsistency = consistencyUsers.map((u) => ({
      _id: u._id,
      username: u.username,
      consistency: computeUserConsistency(u),
    }));
    const platformConsistency = computePlatformConsistencySummary(usersWithConsistency);

    // ── 8. Global Settings & Risk Alerts ───────────────────────────────────
    const settings = await SystemSetting.getGlobal();
    const activeRiskAlerts = (settings.riskAlerts || []).filter((a) => !a.isDismissed).slice(0, 20);

    res.json({
      success: true,
      timeframe,
      range: { start, end },
      newUsers: {
        count: newUsersCount,
        users: newUsers,
        totalRegistered: totalUsersCount,
      },
      platformConsistency,
      financials: {
        totalApprovedDeposits: Math.round(totalApprovedDeposits),
        totalApprovedWithdrawals: Math.round(totalApprovedWithdrawals),
        realizedHouseNetProfit: Math.round(realizedHouseNetProfit),
        totalPendingWithdrawals: Math.round(totalPendingWithdrawals),
        totalPendingDeposits: Math.round(totalPendingDeposits),
        totalPlayerLiabilities: Math.round(totalPlayerLiabilities),
        simulatedMaxRetainedProfit,
        solvencyRatio:
          totalPlayerLiabilities > 0
            ? ((realizedHouseNetProfit / totalPlayerLiabilities) * 100).toFixed(1)
            : '100.0',
      },
      casinoStats: {
        totalTurnover: Math.round(totalCasinoTurnover),
        totalPayouts: Math.round(totalCasinoPayouts),
        grossProfit: Math.round(totalCasinoGrossProfit),
        marginPercent: houseMarginPercent,
        wingoProfit: Math.round(wingoProfit),
        aviatorProfit: Math.round(aviatorProfit),
      },
      yesterdayPerformance: {
        totalWithdrawalsAmount: Math.round(yesterdayTotalWithdrawalsAmount),
        totalCashoutsAmount: Math.round(yesterdayTotalCashouts),
        topWinners: yesterdayTopWinners,
      },
      systemStatus: {
        isWithdrawalDisabled: settings.isWithdrawalDisabled || false,
        withdrawalDisabledMessage: settings.withdrawalDisabledMessage,
        isDepositDisabled: settings.isDepositDisabled || false,
      },
      riskAlerts: activeRiskAlerts,
    });
  } catch (error) {
    console.error('[SuperAdmin Overview Error]', error);
    res.status(500).json({ message: 'Error compiling superadmin overview', error: error.message });
  }
});

// 2.5. List All Users with Deep Consistency & Retention Metrics (/api/superad/users)
router.get('/users', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { search = '', filter = 'ALL' } = req.query;
    const query = {};

    if (search) {
      const clean = search.trim();
      query.$or = [
        { username: { $regex: clean, $options: 'i' } },
        { phone: { $regex: clean, $options: 'i' } },
        { email: { $regex: clean, $options: 'i' } },
      ];
    }

    if (filter === 'BLOCKED') query.isBlocked = true;
    if (filter === 'EXCLUDED') query.isExcludedFromStats = true;

    const users = await User.find(query).select('-passwordHash').sort({ createdAt: -1 });

    // Enrich users with consistency telemetry
    let enriched = users.map((u) => {
      const uObj = u.toObject();
      uObj.consistency = computeUserConsistency(u);
      return uObj;
    });

    // Filter by loyalty tier if requested
    if (filter === 'DAILY_VIP') {
      enriched = enriched.filter((u) => u.consistency?.loyaltyTier === 'DAILY_VIP');
    } else if (filter === 'FREQUENT') {
      enriched = enriched.filter((u) => u.consistency?.loyaltyTier === 'FREQUENT');
    } else if (filter === 'OCCASIONAL') {
      enriched = enriched.filter((u) => u.consistency?.loyaltyTier === 'OCCASIONAL');
    } else if (filter === 'DORMANT') {
      enriched = enriched.filter((u) => u.consistency?.loyaltyTier === 'DORMANT');
    } else if (filter === 'HIGH_BALANCE') {
      enriched = enriched.filter((u) => (Number(u.walletBalance) || 0) >= 100);
    }

    res.json({ success: true, count: enriched.length, users: enriched });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching users with consistency', error: error.message });
  }
});

// 3. User 360 Deep Profile Inspection (/api/superad/users/:userId/360)
router.get('/users/:userId/360', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Fetch all Aviator & Chicken Road bets
    const aviatorBets = await BetHistory.find({ userId }).sort({ createdAt: -1 }).limit(100);

    // Fetch all WinGo bets
    const wingoBets = await WinGoBet.find({ userId }).sort({ createdAt: -1 }).limit(100);

    // Fetch all Transactions
    const transactions = await WalletTransaction.find({ userId }).sort({ createdAt: -1 }).limit(100);

    // Extract distinct historical active dates for complete player history
    const historicalDates = new Set();
    aviatorBets.forEach((b) => b.createdAt && historicalDates.add(getDateString(b.createdAt)));
    wingoBets.forEach((b) => b.createdAt && historicalDates.add(getDateString(b.createdAt)));
    transactions.forEach((t) => t.createdAt && historicalDates.add(getDateString(t.createdAt)));

    const consistency = computeUserConsistency(user, historicalDates);

    // Aggregate lifetime statistics
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let pendingWithdrawals = 0;

    transactions.forEach((t) => {
      if (t.type === 'DEPOSIT' && t.status === 'APPROVED') totalDeposited += t.amount;
      if (t.type === 'WITHDRAWAL') {
        if (t.status === 'APPROVED') totalWithdrawn += t.amount;
        if (t.status === 'PENDING') pendingWithdrawals += t.amount;
      }
    });

    let totalTurnover = 0;
    let totalWon = 0;
    let betsPlacedCount = aviatorBets.length + wingoBets.length;

    aviatorBets.forEach((b) => {
      totalTurnover += b.betAmount || 0;
      if (b.status === 'CASHOUT') totalWon += b.payoutAmount || 0;
    });

    wingoBets.forEach((b) => {
      totalTurnover += b.totalAmount || 0;
      if (b.status === 'WON') totalWon += b.payoutAmount || 0;
    });

    const netPlayerProfit = totalWon - totalTurnover;
    const houseNetFromPlayer = totalTurnover - totalWon;

    // Combine and sort all bets chronologically
    const unifiedBets = [
      ...aviatorBets.map((b) => ({
        id: b._id,
        game: b.gameType || 'AVIATOR',
        betAmount: b.betAmount,
        multiplier: b.cashOutMultiplier || b.autoCashOut || 0,
        payoutAmount: b.payoutAmount,
        status: b.status,
        stepReached: b.stepReached,
        createdAt: b.createdAt,
      })),
      ...wingoBets.map((b) => ({
        id: b._id,
        game: `WINGO_${b.mode}`,
        target: `${b.selectType}: ${b.selectValue}`,
        betAmount: b.totalAmount,
        multiplier: b.wonMultiplier || 0,
        payoutAmount: b.payoutAmount,
        status: b.status,
        createdAt: b.createdAt,
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        email: user.email,
        walletBalance: user.walletBalance,
        role: user.role,
        isBlocked: user.isBlocked,
        isExcludedFromStats: user.isExcludedFromStats,
        createdAt: user.createdAt,
      },
      consistency,
      summary: {
        walletBalance: Math.round(user.walletBalance || 0),
        totalDeposited: Math.round(totalDeposited),
        totalWithdrawn: Math.round(totalWithdrawn),
        pendingWithdrawals: Math.round(pendingWithdrawals),
        totalTurnover: Math.round(totalTurnover),
        totalWon: Math.round(totalWon),
        netPlayerProfit: Math.round(netPlayerProfit),
        houseNetFromPlayer: Math.round(houseNetFromPlayer),
        betsPlacedCount,
      },
      unifiedBets,
      transactions,
    });
  } catch (error) {
    console.error('[User 360 Error]', error);
    res.status(500).json({ message: 'Error retrieving user 360 profile', error: error.message });
  }
});

// 4. Block / Unblock User (/api/superad/users/:userId/toggle-block)
router.post('/users/:userId/toggle-block', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isBlocked = !user.isBlocked;
    await user.save();

    res.json({
      success: true,
      message: `User "${user.username}" has been ${user.isBlocked ? 'BLOCKED' : 'UNBLOCKED'} successfully.`,
      isBlocked: user.isBlocked,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling user block status', error: error.message });
  }
});

// 5. Toggle Test Account Exclusion (/api/superad/users/:userId/toggle-exclude)
router.post('/users/:userId/toggle-exclude', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.isExcludedFromStats = !user.isExcludedFromStats;
    await user.save();

    res.json({
      success: true,
      message: `Account "${user.username}" is now ${user.isExcludedFromStats ? 'EXCLUDED from stats (Test Mode)' : 'INCLUDED in stats (Real Player)'}.`,
      isExcludedFromStats: user.isExcludedFromStats,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling test account status', error: error.message });
  }
});

// 6. Global System Settings & Withdrawal Kill-Switch (/api/superad/settings/toggle-withdrawals)
router.post('/settings/toggle-withdrawals', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { isWithdrawalDisabled, withdrawalDisabledMessage } = req.body;
    const settings = await SystemSetting.getGlobal();

    if (typeof isWithdrawalDisabled === 'boolean') {
      settings.isWithdrawalDisabled = isWithdrawalDisabled;
    } else {
      settings.isWithdrawalDisabled = !settings.isWithdrawalDisabled;
    }

    if (withdrawalDisabledMessage) {
      settings.withdrawalDisabledMessage = withdrawalDisabledMessage;
    }

    await settings.save();

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('superad:settings_updated', {
        isWithdrawalDisabled: settings.isWithdrawalDisabled,
        withdrawalDisabledMessage: settings.withdrawalDisabledMessage,
      });
      io.emit('system:status_update', {
        isWithdrawalDisabled: settings.isWithdrawalDisabled,
        withdrawalDisabledMessage: settings.withdrawalDisabledMessage,
      });
    }

    res.json({
      success: true,
      message: settings.isWithdrawalDisabled
        ? 'Global Withdrawals are now STOPPED. Users attempting withdrawal will see maintenance notice.'
        : 'Global Withdrawals are now RESUMED / ACTIVE.',
      isWithdrawalDisabled: settings.isWithdrawalDisabled,
      withdrawalDisabledMessage: settings.withdrawalDisabledMessage,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling withdrawal status', error: error.message });
  }
});

// 7. Dismiss Risk Alert (/api/superad/risk-alerts/:alertId/dismiss)
router.post('/risk-alerts/:alertId/dismiss', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { alertId } = req.params;
    const settings = await SystemSetting.getGlobal();
    const alert = settings.riskAlerts.id(alertId);
    if (alert) {
      alert.isDismissed = true;
      await settings.save();
    }

    res.json({ success: true, message: 'Risk alert dismissed' });
  } catch (error) {
    res.status(500).json({ message: 'Error dismissing risk alert', error: error.message });
  }
});

// 8. Process Transaction (/api/superad/transactions/:transactionId/process)
router.post('/transactions/:transactionId/process', verifyToken, verifySuperAdmin, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { action, adminNote } = req.body;

    if (!['APPROVE', 'REJECT'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action. Must be APPROVE or REJECT' });
    }

    const transaction = await WalletTransaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
    if (transaction.status !== 'PENDING') {
      return res.status(400).json({ message: `Transaction already ${transaction.status}` });
    }

    const user = await User.findById(transaction.userId);
    if (!user) return res.status(404).json({ message: 'Associated user not found' });

    if (action === 'APPROVE') {
      transaction.status = 'APPROVED';
      if (transaction.type === 'DEPOSIT') {
        user.walletBalance += transaction.amount;
        await user.save();
      }
    } else {
      transaction.status = 'REJECTED';
      if (transaction.type === 'WITHDRAWAL') {
        // Refund withheld withdrawal amount back to user's wallet
        user.walletBalance += transaction.amount;
        await user.save();
      }
    }

    transaction.adminNote = adminNote || '';
    transaction.processedBy = req.user._id;
    transaction.processedAt = new Date();
    await transaction.save();

    const io = req.app.get('io');
    if (io) {
      io.to('admin_room').emit('admin:transaction_processed', { transactionId, status: transaction.status });
      io.emit('admin:transaction_processed', { transactionId, status: transaction.status });
    }

    res.json({
      success: true,
      message: `Transaction ${action}D successfully`,
      transaction,
      userNewBalance: user.walletBalance,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing transaction', error: error.message });
  }
});

export default router;
