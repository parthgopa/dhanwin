import express from 'express';
import { WinGoSession } from '../models/WinGoSession.js';
import { WinGoBet } from '../models/WinGoBet.js';
import { verifyToken, verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// ── GET /api/wingo/history/:mode ─────────────────────────────────────────────
// Returns paginated completed game periods for the Game History table (default 10 per page, max 10 pages)
router.get('/history/:mode', async (req, res) => {
  try {
    const { mode } = req.params;
    const page = Math.min(10, Math.max(1, parseInt(req.query.page) || 1));
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const [history, total] = await Promise.all([
      WinGoSession.find({
        mode,
        status: 'COMPLETED',
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('periodId winningNumber winningColor winningSize totalPool totalPayout createdAt'),
      WinGoSession.countDocuments({ mode, status: 'COMPLETED' }),
    ]);

    const totalPages = Math.min(10, Math.ceil(total / limit) || 1);

    res.json({
      success: true,
      history,
      page,
      totalPages,
      total,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/wingo/chart/:mode ───────────────────────────────────────────────
// Returns 100 periods for statistical calculations + paginated period rows (10 per page, max 10 pages)
router.get('/chart/:mode', async (req, res) => {
  try {
    const { mode } = req.params;
    const page = Math.min(10, Math.max(1, parseInt(req.query.page) || 1));
    const limit = 10;
    const skip = (page - 1) * limit;

    const sessions = await WinGoSession.find({
      mode,
      status: 'COMPLETED',
    })
      .sort({ createdAt: -1 })
      .limit(100)
      .select('periodId winningNumber winningColor winningSize createdAt');

    // Chronological order for trend line calculation
    const chronological = [...sessions].reverse();

    // Compute statistics for each number 0-9
    const stats = {};
    for (let n = 0; n <= 9; n++) {
      stats[n] = {
        number: n,
        frequency: 0,
        missing: 0,
        maxConsecutive: 0,
        avgMissing: 0,
        missingSpans: [],
      };
    }

    let currentConsecutive = { number: null, count: 0 };
    let lastSeenIndex = {};

    chronological.forEach((s, idx) => {
      const num = s.winningNumber;
      if (num !== null && num !== undefined && stats[num]) {
        stats[num].frequency += 1;

        // Consecutive tracking
        if (currentConsecutive.number === num) {
          currentConsecutive.count += 1;
        } else {
          currentConsecutive = { number: num, count: 1 };
        }
        if (currentConsecutive.count > stats[num].maxConsecutive) {
          stats[num].maxConsecutive = currentConsecutive.count;
        }

        // Missing gap tracking
        if (lastSeenIndex[num] !== undefined) {
          const gap = idx - lastSeenIndex[num] - 1;
          stats[num].missingSpans.push(gap);
        }
        lastSeenIndex[num] = idx;
      }
    });

    const totalRounds = chronological.length;
    for (let n = 0; n <= 9; n++) {
      // Current missing count from the last round
      if (lastSeenIndex[n] !== undefined) {
        stats[n].missing = (totalRounds - 1) - lastSeenIndex[n];
      } else {
        stats[n].missing = totalRounds;
      }

      // Average missing gap
      if (stats[n].missingSpans.length > 0) {
        const sumGaps = stats[n].missingSpans.reduce((a, b) => a + b, 0);
        stats[n].avgMissing = Math.round(sumGaps / stats[n].missingSpans.length);
      } else {
        stats[n].avgMissing = stats[n].missing || 10;
      }
    }

    const totalPeriodsCount = sessions.length;
    const paginatedPeriods = sessions.slice(skip, skip + limit);
    const totalPages = Math.min(10, Math.ceil(totalPeriodsCount / limit) || 1);

    res.json({
      success: true,
      mode,
      totalPeriods: totalPeriodsCount,
      periods: paginatedPeriods,
      allPeriods: sessions,
      page,
      totalPages,
      stats,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/wingo/my-bets/:mode ─────────────────────────────────────────────
// Returns authenticated user's bet history with pagination
router.get('/my-bets/:mode', verifyToken, async (req, res) => {
  try {
    const { mode } = req.params;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const query = { userId: req.user._id, mode };

    const [bets, total] = await Promise.all([
      WinGoBet.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      WinGoBet.countDocuments(query),
    ]);

    res.json({
      success: true,
      bets,
      total,
      page,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /api/wingo/admin/analytics ───────────────────────────────────────────
// Returns platform-wide retention metrics for WinGo
router.get('/admin/analytics', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { timeRange = 'today' } = req.query;
    let startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (timeRange === 'week') startDate.setDate(startDate.getDate() - 7);
    else if (timeRange === 'month') startDate.setMonth(startDate.getMonth() - 1);
    else if (timeRange === 'all') startDate = new Date(0);

    const agg = await WinGoSession.aggregate([
      { $match: { createdAt: { $gte: startDate }, status: 'COMPLETED' } },
      {
        $group: {
          _id: null,
          totalVolume: { $sum: '$totalPool' },
          totalPayouts: { $sum: '$totalPayout' },
          netHouseProfit: { $sum: '$netHouseProfit' },
          totalRoundsCount: { $sum: 1 },
          totalBetsCount: { $sum: '$totalBetsCount' },
        }
      }
    ]);

    const result = agg[0] || {
      totalVolume: 0,
      totalPayouts: 0,
      netHouseProfit: 0,
      totalRoundsCount: 0,
      totalBetsCount: 0,
    };

    const houseEdgePercentage = result.totalVolume > 0
      ? ((result.netHouseProfit / result.totalVolume) * 100).toFixed(2)
      : '0.00';

    const rtpPercentage = result.totalVolume > 0
      ? ((result.totalPayouts / result.totalVolume) * 100).toFixed(2)
      : '0.00';

    res.json({
      ...result,
      houseEdgePercentage: Number(houseEdgePercentage),
      rtpPercentage: Number(rtpPercentage),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
