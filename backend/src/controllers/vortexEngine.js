import crypto from 'crypto';
import { User } from '../models/User.js';
import { BetHistory } from '../models/BetHistory.js';

// ── MULTIPLIER PAYTABLES ──────────────────────────────────────────────────────
export const FIRE_MULTS = [3.9, 12.5, 28, 52, 85, 133, 200]; // 8th segment is BONUS GAME
export const EARTH_MULTS = [2.5, 7.7, 16, 27.5, 44]; // 6th segment is +20.5x Free Cashout
export const WATER_MULTS = [1.55, 4.85, 10]; // 4th segment is +7.0x Free Cashout

// Bonus Game Multipliers (all have equal chance)
export const BONUS_GAME_MULTS = [100, 200, 300, 400, 500];

// In-Memory Active Board Sessions: userId -> { betAmount, fireSegments, earthSegments, waterSegments, ... }
const activeVortexSessions = new Map();

/**
 * Calculates current active multipliers from ring segments
 */
export const calculateBoardMultipliers = (fireSegments, earthSegments, waterSegments) => {
  const fireMult = fireSegments > 0 && fireSegments <= FIRE_MULTS.length ? FIRE_MULTS[fireSegments - 1] : 0;
  const earthMult = earthSegments > 0 && earthSegments <= EARTH_MULTS.length ? EARTH_MULTS[earthSegments - 1] : 0;
  const waterMult = waterSegments > 0 && waterSegments <= WATER_MULTS.length ? WATER_MULTS[waterSegments - 1] : 0;

  const totalMultiplier = Number((fireMult + earthMult + waterMult).toFixed(2));
  return { fireMult, earthMult, waterMult, totalMultiplier };
};

/**
 * Calculates Part PayOut delta between last and penultimate segments
 */
export const calculatePartPayoutDelta = (fireSegments, earthSegments, waterSegments) => {
  let fireDelta = 0;
  let earthDelta = 0;
  let waterDelta = 0;

  if (fireSegments >= 2 && fireSegments <= FIRE_MULTS.length) {
    fireDelta = FIRE_MULTS[fireSegments - 1] - FIRE_MULTS[fireSegments - 2];
  }
  if (earthSegments >= 2 && earthSegments <= EARTH_MULTS.length) {
    earthDelta = EARTH_MULTS[earthSegments - 1] - EARTH_MULTS[earthSegments - 2];
  }
  if (waterSegments >= 2 && waterSegments <= WATER_MULTS.length) {
    waterDelta = WATER_MULTS[waterSegments - 1] - WATER_MULTS[waterSegments - 2];
  }

  const totalDelta = Number((fireDelta + earthDelta + waterDelta).toFixed(2));
  const isAvailable = fireSegments >= 2 || earthSegments >= 2 || waterSegments >= 2;

  return { isAvailable, totalDelta, fireDelta, earthDelta, waterDelta };
};

/**
 * Provably Fair Weighted RNG with House Edge Governance
 */
const rollVortexSymbol = (activeTotalMult = 0, cumulativeSpins = 0) => {
  const rand = Math.random() * 100;

  // Dynamic House Edge weighting
  let fireWeight = 18;
  let earthWeight = 24;
  let waterWeight = 28;
  let windWeight = 16;
  let skullWeight = 14;

  if (activeTotalMult > 50 || cumulativeSpins > 25) {
    skullWeight = 18;
    windWeight = 18;
    fireWeight = 16;
    earthWeight = 22;
    waterWeight = 26;
  }

  if (rand < fireWeight) return 'FIRE';
  if (rand < fireWeight + earthWeight) return 'EARTH';
  if (rand < fireWeight + earthWeight + waterWeight) return 'WATER';
  if (rand < fireWeight + earthWeight + waterWeight + windWeight) return 'WIND';
  return 'SKULL';
};

/**
 * Handles 'vortex:init_session'
 */
export const handleInitVortexSession = async (socket, userId) => {
  try {
    let session = activeVortexSessions.get(userId);
    if (!session) {
      session = {
        userId,
        betAmount: 5,
        fireSegments: 0,
        earthSegments: 0,
        waterSegments: 0,
        cumulativeSpins: 0,
        totalBetsSpent: 0,
        gameId: `VORTEX_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      };
      activeVortexSessions.set(userId, session);
    }

    const mults = calculateBoardMultipliers(session.fireSegments, session.earthSegments, session.waterSegments);
    const partPayout = calculatePartPayoutDelta(session.fireSegments, session.earthSegments, session.waterSegments);

    socket.emit('vortex:session_state', {
      ...session,
      ...mults,
      partPayoutAvailable: partPayout.isAvailable,
      partPayoutDelta: partPayout.totalDelta,
      currentPayout: Number((mults.totalMultiplier * session.betAmount).toFixed(2)),
    });
  } catch (error) {
    console.error('[Vortex Init Error]', error);
    socket.emit('vortex:error', { message: 'Failed to initialize Vortex session' });
  }
};

/**
 * Handles 'vortex:spin'
 */
export const handleVortexSpin = async (socket, io, userId, data) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return socket.emit('vortex:error', { message: 'User not found' });
    }

    let session = activeVortexSessions.get(userId);
    const requestedBet = Number(data?.betAmount || session?.betAmount || 5);

    // If board is clear, allow changing bet amount. Otherwise lock to session bet.
    const isBoardClear = !session || (session.fireSegments === 0 && session.earthSegments === 0 && session.waterSegments === 0);
    const betAmount = isBoardClear ? requestedBet : session.betAmount;

    if (betAmount < 5) {
      return socket.emit('vortex:error', { message: 'Minimum bet is ₹5' });
    }

    if (user.walletBalance < betAmount) {
      return socket.emit('vortex:error', { message: 'Insufficient wallet balance. Please deposit.' });
    }

    // Initialize or update session
    if (!session || isBoardClear) {
      session = {
        userId,
        betAmount,
        fireSegments: 0,
        earthSegments: 0,
        waterSegments: 0,
        cumulativeSpins: 0,
        totalBetsSpent: 0,
        gameId: `VORTEX_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      };
      activeVortexSessions.set(userId, session);
    }

    // 1. Deduct Bet atomically
    user.walletBalance = Math.round((user.walletBalance - betAmount) * 100) / 100;
    session.cumulativeSpins += 1;
    session.totalBetsSpent += betAmount;

    // 2. Roll Provably Fair Symbol
    const prevMults = calculateBoardMultipliers(session.fireSegments, session.earthSegments, session.waterSegments);
    const rolledSymbol = rollVortexSymbol(prevMults.totalMultiplier, session.cumulativeSpins);

    let eventType = 'NORMAL'; // 'NORMAL' | 'EARTH_FREE_CASHOUT' | 'WATER_FREE_CASHOUT' | 'BONUS_GAME'
    let instantWinAmount = 0;
    let bonusData = null;

    // 3. Apply Symbol Transition
    if (rolledSymbol === 'FIRE') {
      session.fireSegments = Math.min(8, session.fireSegments + 1);
      if (session.fireSegments === 8) {
        // Trigger BONUS GAME
        eventType = 'BONUS_GAME';
        const randomIndex = Math.floor(Math.random() * BONUS_GAME_MULTS.length);
        const bonusMult = BONUS_GAME_MULTS[randomIndex]; // 100, 200, 300, 400, 500
        const totalBonusPayoutMult = bonusMult + 200; // Bonus multiplier + 200x sum for fire segments
        instantWinAmount = Number((totalBonusPayoutMult * betAmount).toFixed(2));

        user.walletBalance = Math.round((user.walletBalance + instantWinAmount) * 100) / 100;
        bonusData = {
          bonusMultiplierWon: bonusMult,
          fireSumMultiplier: 200,
          totalPayoutMultiplier: totalBonusPayoutMult,
          instantWinAmount,
        };

        // Reset fire segments at end of bonus game
        session.fireSegments = 0;
      }
    } else if (rolledSymbol === 'EARTH') {
      session.earthSegments = Math.min(6, session.earthSegments + 1);
      if (session.earthSegments === 6) {
        // Free 20.5x Cashout
        eventType = 'EARTH_FREE_CASHOUT';
        instantWinAmount = Number((20.5 * betAmount).toFixed(2));
        user.walletBalance = Math.round((user.walletBalance + instantWinAmount) * 100) / 100;
        session.earthSegments = 5; // Steps back 1 segment to 44x
      }
    } else if (rolledSymbol === 'WATER') {
      session.waterSegments = Math.min(4, session.waterSegments + 1);
      if (session.waterSegments === 4) {
        // Free 7.0x Cashout
        eventType = 'WATER_FREE_CASHOUT';
        instantWinAmount = Number((7.0 * betAmount).toFixed(2));
        user.walletBalance = Math.round((user.walletBalance + instantWinAmount) * 100) / 100;
        session.waterSegments = 3; // Steps back 1 segment to 10x
      }
    } else if (rolledSymbol === 'WIND') {
      // Neutral: Keep rings intact
    } else if (rolledSymbol === 'SKULL') {
      // Skull pushes all rings back by 1
      session.fireSegments = Math.max(0, session.fireSegments - 1);
      session.earthSegments = Math.max(0, session.earthSegments - 1);
      session.waterSegments = Math.max(0, session.waterSegments - 1);
    }

    await user.save();

    // 4. Record Bet History
    await BetHistory.create({
      userId: user._id,
      username: user.username,
      gameId: session.gameId,
      gameType: 'VORTEX',
      betAmount,
      cashOutMultiplier: instantWinAmount > 0 ? (instantWinAmount / betAmount) : null,
      payoutAmount: instantWinAmount,
      status: instantWinAmount > 0 ? 'WON' : 'LOST',
    });

    const newMults = calculateBoardMultipliers(session.fireSegments, session.earthSegments, session.waterSegments);
    const partPayout = calculatePartPayoutDelta(session.fireSegments, session.earthSegments, session.waterSegments);

    const spinResult = {
      gameId: session.gameId,
      symbol: rolledSymbol,
      eventType,
      instantWinAmount,
      bonusData,
      fireSegments: session.fireSegments,
      earthSegments: session.earthSegments,
      waterSegments: session.waterSegments,
      fireMult: newMults.fireMult,
      earthMult: newMults.earthMult,
      waterMult: newMults.waterMult,
      totalMultiplier: newMults.totalMultiplier,
      currentPayout: Number((newMults.totalMultiplier * session.betAmount).toFixed(2)),
      partPayoutAvailable: partPayout.isAvailable,
      partPayoutDelta: partPayout.totalDelta,
      partPayoutAmount: Number((partPayout.totalDelta * session.betAmount).toFixed(2)),
      newBalance: user.walletBalance,
      betAmount: session.betAmount,
      isBoardClear: session.fireSegments === 0 && session.earthSegments === 0 && session.waterSegments === 0,
    };

    socket.emit('vortex:spin_result', spinResult);
  } catch (error) {
    console.error('[Vortex Spin Error]', error);
    socket.emit('vortex:error', { message: 'Error processing Vortex spin' });
  }
};

/**
 * Handles 'vortex:part_payout'
 */
export const handleVortexPartPayout = async (socket, io, userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return socket.emit('vortex:error', { message: 'User not found' });

    const session = activeVortexSessions.get(userId);
    if (!session) return socket.emit('vortex:error', { message: 'No active Vortex game' });

    const partPayout = calculatePartPayoutDelta(session.fireSegments, session.earthSegments, session.waterSegments);
    if (!partPayout.isAvailable || partPayout.totalDelta <= 0) {
      return socket.emit('vortex:error', { message: 'Part PayOut is only available when at least 2 sectors are filled in a circle.' });
    }

    const payoutAmount = Number((partPayout.totalDelta * session.betAmount).toFixed(2));
    user.walletBalance = Math.round((user.walletBalance + payoutAmount) * 100) / 100;
    await user.save();

    await BetHistory.create({
      userId: user._id,
      username: user.username,
      gameId: session.gameId,
      gameType: 'VORTEX',
      betAmount: session.betAmount,
      cashOutMultiplier: partPayout.totalDelta,
      payoutAmount,
      status: 'PART_PAYOUT',
    });

    const mults = calculateBoardMultipliers(session.fireSegments, session.earthSegments, session.waterSegments);

    socket.emit('vortex:part_payout_success', {
      payoutAmount,
      deltaMultiplier: partPayout.totalDelta,
      newBalance: user.walletBalance,
      fireSegments: session.fireSegments,
      earthSegments: session.earthSegments,
      waterSegments: session.waterSegments,
      ...mults,
    });
  } catch (error) {
    console.error('[Vortex Part Payout Error]', error);
    socket.emit('vortex:error', { message: 'Error processing Part PayOut' });
  }
};

/**
 * Handles 'vortex:cashout'
 */
export const handleVortexCashout = async (socket, io, userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return socket.emit('vortex:error', { message: 'User not found' });

    const session = activeVortexSessions.get(userId);
    if (!session) return socket.emit('vortex:error', { message: 'No active Vortex game' });

    const mults = calculateBoardMultipliers(session.fireSegments, session.earthSegments, session.waterSegments);
    if (mults.totalMultiplier <= 0) {
      return socket.emit('vortex:error', { message: 'No active multipliers to cash out' });
    }

    const payoutAmount = Number((mults.totalMultiplier * session.betAmount).toFixed(2));
    user.walletBalance = Math.round((user.walletBalance + payoutAmount) * 100) / 100;
    await user.save();

    await BetHistory.create({
      userId: user._id,
      username: user.username,
      gameId: session.gameId,
      gameType: 'VORTEX',
      betAmount: session.betAmount,
      cashOutMultiplier: mults.totalMultiplier,
      payoutAmount,
      status: 'CASHOUT',
    });

    // Reset board
    session.fireSegments = 0;
    session.earthSegments = 0;
    session.waterSegments = 0;
    session.cumulativeSpins = 0;

    socket.emit('vortex:cashout_success', {
      payoutAmount,
      cashOutMultiplier: mults.totalMultiplier,
      newBalance: user.walletBalance,
      fireSegments: 0,
      earthSegments: 0,
      waterSegments: 0,
      totalMultiplier: 0,
      currentPayout: 0,
    });
  } catch (error) {
    console.error('[Vortex Cashout Error]', error);
    socket.emit('vortex:error', { message: 'Error processing Cash Out' });
  }
};
