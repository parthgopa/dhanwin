import crypto from 'crypto';
import { WinGoSession } from '../models/WinGoSession.js';
import { WinGoBet } from '../models/WinGoBet.js';
import { Counter } from '../models/Counter.js';
import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';

// Room codes matching reference screenshot style: 20260815100010951
const ROOM_CONFIGS = {
  '30s': { id: '30s', label: 'WinGo 30sec', durationSec: 30, lockSec: 5, roomCode: '10000' },
  '1m': { id: '1m', label: 'WinGo 1 Min', durationSec: 60, lockSec: 5, roomCode: '10001' },
  '3m': { id: '3m', label: 'WinGo 3 Min', durationSec: 180, lockSec: 5, roomCode: '10002' },
  '5m': { id: '5m', label: 'WinGo 5 Min', durationSec: 300, lockSec: 5, roomCode: '10003' },
};

// Winning number classification helper
export const classifyWinGoNumber = (num) => {
  const number = Number(num);
  const size = number >= 5 ? 'BIG' : 'SMALL';
  let color = 'GREEN';
  if (number === 0) color = 'RED_VIOLET';
  else if (number === 5) color = 'GREEN_VIOLET';
  else if ([2, 4, 6, 8].includes(number)) color = 'RED';
  else color = 'GREEN';

  return { number, size, color };
};

// Generates an atomic sequential period ID for the day
export const generatePeriodId = async (mode) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const datePrefix = `${yyyy}${mm}${dd}`;

  const config = ROOM_CONFIGS[mode] || ROOM_CONFIGS['1m'];
  const counterKey = `wingo_${mode}_${datePrefix}`;

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, new: true }
  );

  return `${datePrefix}${config.roomCode}${String(counter.seq).padStart(4, '0')}`;
};

// In-Memory state for all 4 rooms
const roomsState = {
  '30s': null,
  '1m': null,
  '3m': null,
  '5m': null,
};

let ioInstance = null;

// Initialize a fresh round for a room
const initRoomRound = async (mode) => {
  const config = ROOM_CONFIGS[mode];
  const periodId = await generatePeriodId(mode);
  const now = Date.now();
  const endTime = now + (config.durationSec * 1000);

  const serverSeed = crypto.randomBytes(16).toString('hex');
  const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

  const session = await WinGoSession.create({
    periodId,
    mode,
    startTime: new Date(now),
    endTime: new Date(endTime),
    status: 'BETTING',
    serverSeedHash,
  });

  roomsState[mode] = {
    mode,
    periodId,
    startTime: now,
    endTime,
    durationSec: config.durationSec,
    lockSec: config.lockSec,
    status: 'BETTING', // 'BETTING' | 'LOCKED' | 'SETTLING'
    remainingSec: config.durationSec,
    elapsedSec: 0,
    serverSeed,
    serverSeedHash,
    // Live Exposure Tracking (Real Players Only)
    totalPool: 0,
    totalBetsCount: 0,
    bets: [], // Real user bets
    exposure: {
      numbers: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 },
      colors: { RED: 0, GREEN: 0, VIOLET: 0 },
      sizes: { BIG: 0, SMALL: 0 },
    },
    // Admin Override
    manualOverride: null, // null or number 0-9
  };

  // Broadcast new round event
  if (ioInstance) {
    ioInstance.to(`wingo:room:${mode}`).emit('wingo:new_round', {
      mode,
      periodId,
      remainingSec: config.durationSec,
      status: 'BETTING',
      serverSeedHash,
    });
  }

  return roomsState[mode];
};

// Core Lowest Exposure Calculation Algorithm
export const calculateLowestExposureOutcome = (room) => {
  // 1. Admin Manual Override has absolute priority
  if (room.manualOverride !== null && room.manualOverride !== undefined) {
    const overrideNum = Number(room.manualOverride);
    const classified = classifyWinGoNumber(overrideNum);
    return {
      ...classified,
      algorithmMode: 'MANUAL_OVERRIDE',
      isOverridden: true,
      liability: calculateLiabilityForNumber(room, overrideNum),
    };
  }

  // 2. If no bets at all in round, pick via Provably Fair RNG
  if (room.totalPool === 0) {
    const rngHash = crypto.createHash('sha256').update(room.serverSeed + room.periodId).digest('hex');
    const rngNumber = parseInt(rngHash.substring(0, 4), 16) % 10;
    const classified = classifyWinGoNumber(rngNumber);
    return {
      ...classified,
      algorithmMode: 'RNG',
      isOverridden: false,
      liability: 0,
      houseProfit: 0,
    };
  }

  // 3. Evaluate total combined liabilities (Number + Color + Size) for all 10 candidate outcomes (0-9)
  // to pick the outcome that guarantees the MAXIMUM HOUSE PROFIT (lowest total payout liability)
  let lowestLiability = Infinity;
  let candidateOutcomes = [];

  for (let candidate = 0; candidate <= 9; candidate++) {
    const liability = calculateLiabilityForNumber(room, candidate);
    if (liability < lowestLiability) {
      lowestLiability = liability;
      candidateOutcomes = [candidate];
    } else if (Math.abs(liability - lowestLiability) < 0.01) {
      candidateOutcomes.push(candidate);
    }
  }

  // If multiple candidates have the same lowest liability, pick pseudorandomly among them
  const chosenNumber = candidateOutcomes[Math.floor(Math.random() * candidateOutcomes.length)];
  const classified = classifyWinGoNumber(chosenNumber);
  const houseProfit = Math.max(0, room.totalPool - lowestLiability);

  return {
    ...classified,
    algorithmMode: 'LOWEST_EXPOSURE',
    isOverridden: false,
    liability: lowestLiability,
    houseProfit,
  };
};

// Calculate total player payout liability for a given candidate winning number
export const calculateLiabilityForNumber = (room, candidateNum) => {
  const num = Number(candidateNum);
  const isBig = num >= 5;
  const isViolet = (num === 0 || num === 5);
  const isPureRed = [2, 4, 6, 8].includes(num);
  const isPureGreen = [1, 3, 7, 9].includes(num);

  let liability = 0;

  // 1. Number bets on this exact number (3x gross payout, 2% fee -> 2.94x net)
  liability += (room.exposure.numbers[num] || 0) * 2.94;

  // 2. Size bets (2x gross payout, 2% fee -> 1.96x net)
  if (isBig) {
    liability += (room.exposure.sizes.BIG || 0) * 1.96;
  } else {
    liability += (room.exposure.sizes.SMALL || 0) * 1.96;
  }

  // 3. Color bets
  if (isPureGreen) {
    liability += (room.exposure.colors.GREEN || 0) * 1.96;
  } else if (isPureRed) {
    liability += (room.exposure.colors.RED || 0) * 1.96;
  } else if (num === 5) {
    // Green + Violet
    liability += (room.exposure.colors.GREEN || 0) * 1.47;
    liability += (room.exposure.colors.VIOLET || 0) * 4.41;
  } else if (num === 0) {
    // Red + Violet
    liability += (room.exposure.colors.RED || 0) * 1.47;
    liability += (room.exposure.colors.VIOLET || 0) * 4.41;
  }

  return liability;
};

// Settle active round bets and credit winners
const settleRoomRound = async (mode) => {
  const room = roomsState[mode];
  if (!room || room.status === 'SETTLING') return;

  room.status = 'SETTLING';

  // Compute winning outcome
  const outcome = calculateLowestExposureOutcome(room);

  // Settle all user bets in DB
  const bets = await WinGoBet.find({ periodId: room.periodId, status: 'PENDING' });
  let totalPayout = 0;
  const userResultsMap = {}; // userId -> totalWon

  for (const bet of bets) {
    let won = false;
    let multiplier = 0;

    if (bet.selectType === 'NUMBER' && Number(bet.selectValue) === outcome.number) {
      won = true;
      multiplier = 2.94; // 3x gross minus 2% fee
    } else if (bet.selectType === 'SIZE') {
      if (bet.selectValue === outcome.size) {
        won = true;
        multiplier = 1.96; // 2x gross minus 2% fee
      }
    } else if (bet.selectType === 'COLOR') {
      if (outcome.color === 'GREEN_VIOLET') {
        if (bet.selectValue === 'GREEN') { won = true; multiplier = 1.47; }
        else if (bet.selectValue === 'VIOLET') { won = true; multiplier = 4.41; }
      } else if (outcome.color === 'RED_VIOLET') {
        if (bet.selectValue === 'RED') { won = true; multiplier = 1.47; }
        else if (bet.selectValue === 'VIOLET') { won = true; multiplier = 4.41; }
      } else if (bet.selectValue === outcome.color) {
        won = true;
        multiplier = 1.96;
      }
    }

    if (won) {
      const payoutAmount = Math.floor(bet.totalAmount * multiplier * 100) / 100;
      bet.status = 'WON';
      bet.wonMultiplier = multiplier;
      bet.payoutAmount = payoutAmount;
      totalPayout += payoutAmount;
      await bet.save();

      // Credit User Wallet
      await User.findByIdAndUpdate(bet.userId, { $inc: { walletBalance: payoutAmount } });

      userResultsMap[bet.userId.toString()] = (userResultsMap[bet.userId.toString()] || 0) + payoutAmount;
    } else {
      bet.status = 'LOST';
      bet.payoutAmount = 0;
      await bet.save();
      // Ensure user is recorded in map even if 0 won
      if (userResultsMap[bet.userId.toString()] === undefined) {
        userResultsMap[bet.userId.toString()] = 0;
      }
    }
  }

  // Send Personal Outcome Events to Each Bettor in this Round
  if (ioInstance) {
    for (const [userId, wonAmount] of Object.entries(userResultsMap)) {
      const updatedUser = await User.findById(userId).select('walletBalance');
      const isWon = wonAmount > 0;
      ioInstance.to(`user_${userId}`).emit('wingo:user_round_result', {
        mode,
        periodId: room.periodId,
        status: isWon ? 'WON' : 'LOST',
        wonAmount: isWon ? wonAmount : 0,
        winningNumber: outcome.number,
        winningColor: outcome.color,
        winningSize: outcome.size,
        newBalance: updatedUser?.walletBalance ?? 0,
      });
    }
  }

  const netHouseProfit = room.totalPool - totalPayout;

  // Update session record
  await WinGoSession.findOneAndUpdate(
    { periodId: room.periodId },
    {
      winningNumber: outcome.number,
      winningColor: outcome.color,
      winningSize: outcome.size,
      totalPool: room.totalPool,
      totalPayout,
      netHouseProfit,
      totalBetsCount: room.totalBetsCount,
      exposureBreakdown: room.exposure,
      algorithmMode: outcome.algorithmMode,
      isOverridden: outcome.isOverridden,
      forcedOutcome: outcome.isOverridden ? outcome.number : null,
      status: 'COMPLETED',
    }
  );

  // Broadcast winning outcome to room
  if (ioInstance) {
    ioInstance.to(`wingo:room:${mode}`).emit('wingo:round_result', {
      mode,
      periodId: room.periodId,
      winningNumber: outcome.number,
      winningColor: outcome.color,
      winningSize: outcome.size,
      totalPool: room.totalPool,
      totalPayout,
    });
  }

  // Restart next round after 2-second cooldown
  setTimeout(async () => {
    try {
      await initRoomRound(mode);
    } catch (err) {
      console.error(`[WinGo Error] Failed to restart round for ${mode}:`, err.message);
    }
  }, 2000);
};

// 1-Second Master Tick for all 4 rooms
export const startWinGoEngine = async (io) => {
  ioInstance = io;

  // Initialize all 4 rooms on engine boot
  for (const mode of Object.keys(ROOM_CONFIGS)) {
    try {
      await initRoomRound(mode);
    } catch (err) {
      console.error(`[WinGo Init Error] Mode ${mode}:`, err.message);
    }
  }

  // Master 1-Second Tick Loop
  setInterval(() => {
    const now = Date.now();

    for (const mode of Object.keys(ROOM_CONFIGS)) {
      const room = roomsState[mode];
      if (!room) continue;

      const remainingSec = Math.max(0, Math.ceil((room.endTime - now) / 1000));
      const elapsedSec = Math.max(0, Math.floor((now - room.startTime) / 1000));
      room.remainingSec = remainingSec;
      room.elapsedSec = elapsedSec;

      // Lock state broadcast when 5 seconds or less remaining
      if (remainingSec <= room.lockSec && room.status === 'BETTING') {
        room.status = 'LOCKED';
        io.to(`wingo:room:${mode}`).emit('wingo:round_locked', {
          mode,
          periodId: room.periodId,
          remainingSec,
        });
      }

      // Tick broadcast to clients in this room
      io.to(`wingo:room:${mode}`).emit('wingo:tick', {
        mode,
        periodId: room.periodId,
        remainingSec,
        status: room.status,
      });

      // Round ended
      if (remainingSec <= 0 && room.status !== 'SETTLING') {
        settleRoomRound(mode);
      }
    }

    // Broadcast Admin Telemetry every second to wingo:admin_room
    emitWinGoAdminTelemetry(io);
  }, 1000);
};

// Aggregates real-time telemetry across all 4 rooms for the Admin Console
export const emitWinGoAdminTelemetry = (io) => {
  if (!io) return;

  const adminData = {};

  for (const mode of Object.keys(ROOM_CONFIGS)) {
    const room = roomsState[mode];
    if (!room) continue;

    const projectedOutcome = calculateLowestExposureOutcome(room);

    // Count unique player identities (real users who bet)
    const userIds = new Set(room.bets.map(b => b.userId?.toString()).filter(Boolean));
    const playersCount = userIds.size;

    adminData[mode] = {
      mode,
      label: ROOM_CONFIGS[mode].label,
      periodId: room.periodId,
      remainingSec: room.remainingSec,
      status: room.status,
      totalPool: room.totalPool,
      totalBetsCount: room.totalBetsCount,
      playersCount,
      exposure: room.exposure,
      projectedOutcome,
      manualOverride: room.manualOverride,
    };
  }

  io.to('wingo:admin_room').emit('wingo:admin_telemetry', adminData);
};

// WebSocket Event Listeners for WinGo
export const initWinGoSocketHandlers = (io, socket) => {
  // Join a specific WinGo room
  socket.on('wingo:join_room', ({ mode } = {}) => {
    const validMode = ROOM_CONFIGS[mode] ? mode : '30s';

    // Leave other wingo rooms
    Object.keys(ROOM_CONFIGS).forEach(m => socket.leave(`wingo:room:${m}`));
    socket.join(`wingo:room:${validMode}`);

    const room = roomsState[validMode];
    if (room) {
      socket.emit('wingo:room_state', {
        mode: validMode,
        periodId: room.periodId,
        remainingSec: room.remainingSec,
        status: room.status,
        serverSeedHash: room.serverSeedHash,
      });
    }
  });

  // Leave WinGo room
  socket.on('wingo:leave_room', ({ mode }) => {
    if (mode) socket.leave(`wingo:room:${mode}`);
  });

  // Join Admin Room
  socket.on('wingo:join_admin', () => {
    if (socket.user?.role === 'ADMIN') {
      socket.join('wingo:admin_room');
      emitWinGoAdminTelemetry(io);
    }
  });

  // User Place Bet
  socket.on('wingo:place_bet', async (data) => {
    try {
      if (!socket.user) {
        return socket.emit('wingo:bet_error', { message: 'Authentication required' });
      }

      const { mode, selectType, selectValue, unitPrice, multiplier, totalAmount } = data;
      const room = roomsState[mode];

      if (!room || room.status !== 'BETTING' || room.remainingSec <= room.lockSec) {
        return socket.emit('wingo:bet_error', { message: 'Betting is locked for this period' });
      }

      if (!totalAmount || totalAmount <= 0) {
        return socket.emit('wingo:bet_error', { message: 'Invalid bet amount' });
      }

      // Check User Wallet
      const user = await User.findById(socket.user.id);
      if (!user || user.walletBalance < totalAmount) {
        return socket.emit('wingo:bet_error', { message: 'Insufficient wallet balance' });
      }

      // Deduct wallet balance
      user.walletBalance -= totalAmount;
      await user.save();

      const fee = Math.floor(totalAmount * 0.02 * 100) / 100; // 2% platform fee
      const netAmount = totalAmount - fee;

      // Save Bet
      const bet = await WinGoBet.create({
        userId: user._id,
        username: user.username,
        periodId: room.periodId,
        mode,
        selectType,
        selectValue: String(selectValue),
        unitPrice,
        multiplier,
        totalAmount,
        fee,
        netAmount,
        status: 'PENDING',
      });

      // Update in-memory room exposure
      room.totalPool += totalAmount;
      room.totalBetsCount += 1;
      room.bets.push(bet);

      if (selectType === 'NUMBER') {
        const num = Number(selectValue);
        room.exposure.numbers[num] = (room.exposure.numbers[num] || 0) + netAmount;
      } else if (selectType === 'COLOR') {
        const col = String(selectValue).toUpperCase();
        room.exposure.colors[col] = (room.exposure.colors[col] || 0) + netAmount;
      } else if (selectType === 'SIZE') {
        const sz = String(selectValue).toUpperCase();
        room.exposure.sizes[sz] = (room.exposure.sizes[sz] || 0) + netAmount;
      }

      // Confirm to player
      socket.emit('wingo:bet_placed', {
        betId: bet._id,
        periodId: room.periodId,
        selectType,
        selectValue,
        totalAmount,
        newBalance: user.walletBalance,
      });

      // Broadcast admin telemetry update
      emitWinGoAdminTelemetry(io);
    } catch (err) {
      console.error('[WinGo Bet Error]', err.message);
      socket.emit('wingo:bet_error', { message: err.message || 'Failed to place bet' });
    }
  });

  // Admin Override Outcome (Number, Color, Size, or Reset)
  socket.on('wingo:admin_set_override', ({ mode, forcedNumber, forcedColor, forcedSize, clear }) => {
    if (socket.user?.role !== 'ADMIN') return;
    const room = roomsState[mode];
    if (!room) return;

    if (clear) {
      room.manualOverride = null;
    } else if (forcedNumber !== undefined && forcedNumber !== null) {
      room.manualOverride = Number(forcedNumber);
    } else if (forcedColor) {
      const colorNums = forcedColor === 'GREEN' ? [1, 3, 7, 9] : forcedColor === 'RED' ? [2, 4, 6, 8] : [0, 5];
      let bestNum = colorNums[0];
      let bestLiab = Infinity;
      for (const n of colorNums) {
        const liab = calculateLiabilityForNumber(room, n);
        if (liab < bestLiab) {
          bestLiab = liab;
          bestNum = n;
        }
      }
      room.manualOverride = bestNum;
    } else if (forcedSize) {
      const sizeNums = forcedSize === 'BIG' ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4];
      let bestNum = sizeNums[0];
      let bestLiab = Infinity;
      for (const n of sizeNums) {
        const liab = calculateLiabilityForNumber(room, n);
        if (liab < bestLiab) {
          bestLiab = liab;
          bestNum = n;
        }
      }
      room.manualOverride = bestNum;
    }

    emitWinGoAdminTelemetry(io);
    socket.emit('wingo:admin_info', {
      message: `WinGo ${mode} target set to ${room.manualOverride !== null ? `Number ${room.manualOverride}` : 'AUTO'}`,
    });
  });
};

export const getWinGoRoomsState = () => roomsState;
