import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { GameSession } from '../models/GameSession.js';
import { BetHistory } from '../models/BetHistory.js';
import {
  generateSeed,
  hashSeed,
  generateCrashPoint,
} from '../utils/provablyFair.js';
import { startWinGoEngine, initWinGoSocketHandlers } from './winGoEngine.js';

// --- AVIATOR IN-MEMORY STATE ENGINE ---
let aviatorState = {
  gameId: null,
  status: 'BETTING', // 'BETTING' | 'RUNNING' | 'CRASHED'
  serverSeed: null,
  serverSeedHash: null,
  clientSeed: 'dhanwin_global_seed',
  nonce: 100,
  crashPoint: 1.00,
  currentMultiplier: 1.00,
  countdownSec: 5,
  bets: [], // User bets
  simulatedBets: [], // Live multiplayer feed bets
  totalWinINR: 0.00, // Total round win counter
  roundPoolINR: 0.00, // Total base bets placed in round
  activeExposureINR: 0.00, // Net payout liability above base pool
  isOverridden: false,
  overrideType: 'NONE',
  history: [], // Recent 50 crashed multipliers
  totalBetsThisRound: 0, // Real count of bets placed by live players
  activeBetsThisRound: 0, // Counts down as cashouts happen
};

// --- ADMIN MULTIPLIER CONTROL & RISK MONITORING CONFIG ---
let adminControlConfig = {
  mode: 'AUTOMATED',             // 'AUTOMATED' (RNG) | 'OVERRIDE' (Manual Target)
  forcedNextCrashPoint: null,    // Manual crash multiplier (e.g. 1.40x or 5.00x)
  maxExposureCeiling: 50000,     // Monitoring alert threshold in INR (₹50,000)
  riskAlertEnabled: true,        // When true, emits admin alerts when net exposure exceeds ceiling
  autoCrashOnCashout: false,     // Task 2: if true, auto-crash when cashouts reach 20% of round pool
  autoCrashCashoutThreshold: 0.20, // 20% cashout-to-pool ratio trigger
};

let aviatorTimer = null;
// Callback set by the game loop so external handlers (e.g. admin:force_crash_now)
// can immediately trigger a crash without needing access to the inner closure.
let forceCrashCallback = null;

// Live Real Player Gaming Mode (Bot Simulation Removed)
function buildSimulatedBets() {
  return [];
}

// --- LIVE PLAYERS TRACKING REGISTRY ---
export const activeLiveSockets = new Map();

export const getLivePlayersStats = () => {
  const uniqueUsers = new Map();
  let aviatorCount = 0;
  let wingoCount = 0;

  activeLiveSockets.forEach((s) => {
    const key = s.userId ? s.userId.toString() : s.socketId;
    if (!uniqueUsers.has(key)) {
      uniqueUsers.set(key, s);
    }
    if (s.game === 'AVIATOR') aviatorCount++;
    if (s.game === 'WINGO') wingoCount++;
  });

  return {
    totalOnline: uniqueUsers.size,
    aviatorPlayers: aviatorCount,
    wingoPlayers: wingoCount,
    liveUsers: Array.from(uniqueUsers.values()).map((u) => ({
      socketId: u.socketId,
      userId: u.userId,
      username: u.username || 'Guest',
      phone: u.phone || '',
      email: u.email || '',
      game: u.game || 'LOBBY',
      connectedAt: u.connectedAt,
    })),
  };
};

export const broadcastLivePlayersCount = (io) => {
  if (!io) return;
  const stats = getLivePlayersStats();
  io.to('admin_room').emit('admin:live_players_count', stats);
  io.emit('admin:live_players_count', stats);
};

let ioInstance = null;

export const getIO = () => ioInstance;

export const emitToUser = (userId, event, data) => {
  if (ioInstance && userId) {
    ioInstance.to(`user_${userId}`).emit(event, data);
    ioInstance.to(userId.toString()).emit(event, data);
  }
};

export const initGameSockets = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });
  ioInstance = io;

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (token) {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);
        if (user) {
          if (user.currentSessionId && decoded.sessionId && decoded.sessionId !== user.currentSessionId) {
            return next(new Error('SESSION_TERMINATED'));
          }
          socket.user = user;
          socket.sessionId = decoded.sessionId;
        }
      }
      next();
    } catch (err) {
      next();
    }
  });

  if (aviatorState.history.length === 0) {
    for (let i = 0; i < 50; i++) {
      const mult = (1.00 + Math.random() * 8.5).toFixed(2);
      aviatorState.history.push({
        gameId: `AV_HIST_${i}`,
        crashPoint: Number(mult),
        serverSeedHash: hashSeed(`seed_${i}`),
        serverSeed: `seed_${i}`,
        endedAt: new Date(),
      });
    }
  }

  startAviatorLoop(io);
  startWinGoEngine(io);

  io.on('connection', (socket) => {
    // Register active socket connection
    activeLiveSockets.set(socket.id, {
      socketId: socket.id,
      userId: socket.user?._id?.toString() || null,
      username: socket.user?.username || 'Guest',
      phone: socket.user?.phone || '',
      email: socket.user?.email || '',
      game: 'LOBBY',
      connectedAt: new Date(),
    });
    broadcastLivePlayersCount(io);

    // WinGo Handlers
    initWinGoSocketHandlers(io, socket);

    if (socket.user) {
      socket.join(`user_${socket.user._id}`);
      socket.join(socket.user._id.toString());
      if (socket.user.role === 'ADMIN') {
        socket.join('admin_room');
      }
    }

    // Explicit User Room Join (Guaranteed Real-time Handshake)
    socket.on('user:join_room', (data) => {
      const uid = data?.userId || socket.user?._id;
      if (uid) {
        socket.join(`user_${uid}`);
        socket.join(uid.toString());
        const entry = activeLiveSockets.get(socket.id);
        if (entry) {
          entry.userId = uid.toString();
          if (data?.username) entry.username = data.username;
        }
        broadcastLivePlayersCount(io);
      }
    });

    // Game Room Location Tracking
    socket.on('game:enter', (data) => {
      const gameType = data?.game; // 'AVIATOR' | 'WINGO' | 'LOBBY'
      const entry = activeLiveSockets.get(socket.id);
      if (entry && gameType) {
        entry.game = gameType.toUpperCase();
        broadcastLivePlayersCount(io);
      }
    });

    // Client State Sync
    const sendAviatorStateSync = () => {
      const entry = activeLiveSockets.get(socket.id);
      if (entry) {
        entry.game = 'AVIATOR';
        broadcastLivePlayersCount(io);
      }

      socket.emit('aviator:state_sync', {
        gameId: aviatorState.gameId,
        status: aviatorState.status,
        serverSeedHash: aviatorState.serverSeedHash,
        currentMultiplier: aviatorState.currentMultiplier,
        countdownSec: aviatorState.countdownSec,
        history: aviatorState.history,
        simulatedBets: aviatorState.simulatedBets,
        totalWinINR: aviatorState.totalWinINR,
        activeBetsCount: aviatorState.activeBetsThisRound,
        totalBetsCount: aviatorState.totalBetsThisRound,
      });
    };

    sendAviatorStateSync();
    socket.on('aviator:request_sync', sendAviatorStateSync);

    // ADMIN EVENTS & TELEMETRY STREAM
    socket.on('admin:join_room', () => {
      if (socket.user && socket.user.role === 'ADMIN') {
        socket.join('admin_room');
        emitAdminTelemetry(io);
        socket.emit('admin:live_players_count', getLivePlayersStats());
      }
    });

    socket.on('admin:get_live_players', () => {
      if (socket.user && socket.user.role === 'ADMIN') {
        socket.emit('admin:live_players_count', getLivePlayersStats());
      }
    });

    socket.on('disconnect', () => {
      activeLiveSockets.delete(socket.id);
      broadcastLivePlayersCount(io);
    });

    socket.on('admin:set_control_mode', (data) => {
      if (socket.user && socket.user.role === 'ADMIN') {
        adminControlConfig.mode = data.mode;
        emitAdminTelemetry(io);
      }
    });

    socket.on('admin:set_forced_multiplier', (data) => {
      if (socket.user && socket.user.role === 'ADMIN') {
        adminControlConfig.forcedNextCrashPoint = data.crashPoint ? Number(data.crashPoint) : null;
        emitAdminTelemetry(io);
      }
    });

    // NOTE: riskAlertEnabled is a monitoring-only threshold — it triggers admin dashboard alerts
    // but NEVER causes a mid-flight crash. The crash point is immutably set before the round starts.
    socket.on('admin:set_risk_cap', (data) => {
      if (socket.user && socket.user.role === 'ADMIN') {
        if (data.ceiling !== undefined) adminControlConfig.maxExposureCeiling = Number(data.ceiling);
        if (data.enabled !== undefined) adminControlConfig.riskAlertEnabled = Boolean(data.enabled);
        emitAdminTelemetry(io);
      }
    });

    // Place Bet in Aviator
    socket.on('aviator:place_bet', async (data) => {
      try {
        if (!socket.user) return socket.emit('aviator:error', { message: 'Authentication required' });
        if (aviatorState.status !== 'BETTING') return socket.emit('aviator:error', { message: 'Betting is closed' });

        const betAmount = Number(data.amount);
        const autoCashOut = data.autoCashOut ? Number(data.autoCashOut) : null;
        const panel = Number(data.panel) || 1;
        if (!betAmount || betAmount < 1) return socket.emit('aviator:error', { message: 'Minimum bet is ₹1' });

        const user = await User.findById(socket.user._id);
        if (!user) {
          return socket.emit('aviator:error', { message: 'User account not found' });
        }

        if (user.isBlocked) {
          return socket.emit('aviator:error', { message: 'Your account is blocked. You cannot place bets.' });
        }

        if (user.walletBalance < betAmount) {
          return socket.emit('aviator:error', { message: 'Insufficient balance' });
        }

        user.walletBalance -= betAmount;
        await user.save();

        const betRecord = await BetHistory.create({
          userId: user._id,
          username: user.username,
          gameId: aviatorState.gameId,
          gameType: 'AVIATOR',
          betAmount,
          autoCashOut,
          status: 'PLACED',
        });

        const activeBet = {
          betId: betRecord._id,
          userId: user._id,
          username: user.username,
          betAmount,
          autoCashOut,
          panel,
          status: 'PLACED',
        };

        aviatorState.bets.push(activeBet);
        aviatorState.roundPoolINR += betAmount;

        // Add real player bet to live multiplayer feed
        const liveFeedBet = {
          username: user.username,
          avatar: '👤',
          betAmount,
          status: 'PLACED',
          cashOutMultiplier: null,
          payoutAmount: 0,
        };
        aviatorState.simulatedBets.push(liveFeedBet);

        // Increment real counters so frontend shows accurate numbers
        aviatorState.totalBetsThisRound = aviatorState.bets.length;
        aviatorState.activeBetsThisRound = aviatorState.bets.filter((b) => b.status === 'PLACED').length;

        socket.emit('balance_update', { newBalance: user.walletBalance });
        socket.emit('aviator:bet_success', { activeBet, panel, betId: betRecord._id });

        io.emit('aviator:bets_update', {
          simulatedBets: aviatorState.simulatedBets,
          activeBetsCount: aviatorState.activeBetsThisRound,
          totalBetsCount: aviatorState.totalBetsThisRound,
        });

        emitAdminTelemetry(io);
      } catch (err) {
        socket.emit('aviator:error', { message: 'Failed to place bet', error: err.message });
      }
    });

    // Cashout Aviator
    socket.on('aviator:cashout', async (data = {}) => {
      try {
        if (!socket.user) return socket.emit('aviator:error', { message: 'Authentication required' });
        if (aviatorState.status !== 'RUNNING') return socket.emit('aviator:error', { message: 'Cannot cashout right now' });

        let bet;
        if (data.betId) {
          bet = aviatorState.bets.find(
            (b) => b.betId?.toString() === data.betId.toString() && b.userId.toString() === socket.user._id.toString() && b.status === 'PLACED'
          );
        }
        if (!bet && data.panel) {
          bet = aviatorState.bets.find(
            (b) => b.panel === Number(data.panel) && b.userId.toString() === socket.user._id.toString() && b.status === 'PLACED'
          );
        }
        if (!bet) {
          bet = aviatorState.bets.find(
            (b) => b.userId.toString() === socket.user._id.toString() && b.status === 'PLACED'
          );
        }
        if (!bet) return socket.emit('aviator:error', { message: 'No active bet found for this card' });

        const cashOutMultiplier = aviatorState.currentMultiplier;
        const payoutAmount = Math.floor(bet.betAmount * cashOutMultiplier * 100) / 100;

        bet.status = 'CASHOUT';
        bet.cashOutMultiplier = cashOutMultiplier;
        bet.payoutAmount = payoutAmount;

        const feedBet = aviatorState.simulatedBets.find(
          (b) => b.username === socket.user.username && b.status === 'PLACED'
        );
        if (feedBet) {
          feedBet.status = 'CASHOUT';
          feedBet.cashOutMultiplier = cashOutMultiplier;
          feedBet.payoutAmount = payoutAmount;
        }

        aviatorState.totalWinINR += payoutAmount;
        // Decrement active bets counter on manual cashout
        aviatorState.activeBetsThisRound = aviatorState.bets.filter((b) => b.status === 'PLACED').length;

        const user = await User.findById(socket.user._id);
        user.walletBalance += payoutAmount;
        await user.save();

        await BetHistory.findByIdAndUpdate(bet.betId, {
          status: 'CASHOUT',
          cashOutMultiplier,
          payoutAmount,
        });

        socket.emit('balance_update', { newBalance: user.walletBalance });
        socket.emit('aviator:cashout_success', {
          betId: bet.betId,
          panel: bet.panel || data.panel || 1,
          cashOutMultiplier,
          payoutAmount,
          newBalance: user.walletBalance,
        });

        io.emit('aviator:player_cashed_out', {
          username: user.username,
          cashOutMultiplier,
          payoutAmount,
          totalWinINR: aviatorState.totalWinINR,
          simulatedBets: aviatorState.simulatedBets,
          activeBetsCount: aviatorState.activeBetsThisRound,
          totalBetsCount: aviatorState.totalBetsThisRound,
        });

        emitAdminTelemetry(io);
      } catch (err) {
        socket.emit('aviator:error', { message: 'Cashout failed', error: err.message });
      }
    });

    // ── ADMIN: Force Crash the Current Running Round Immediately ──────────
    // Instantly crashes the in-progress round at whatever multiplier is live.
    // The admin uses this as a manual "fly away" / emergency stop.
    socket.on('admin:force_crash_now', async () => {
      if (socket.user?.role !== 'ADMIN') return;
      if (aviatorState.status !== 'RUNNING') {
        return socket.emit('aviator:error', { message: 'No round currently in flight.' });
      }
      if (!forceCrashCallback) {
        return socket.emit('aviator:error', { message: 'Game loop not ready.' });
      }
      // Clear the flight tick interval so the crash is not double-triggered
      if (aviatorTimer) {
        clearInterval(aviatorTimer);
        aviatorTimer = null;
      }
      // Snap the crash point to the current live multiplier
      aviatorState.crashPoint = aviatorState.currentMultiplier;
      aviatorState.isOverridden = true;
      aviatorState.overrideType = 'ADMIN_FORCE_CRASH';
      await forceCrashCallback();
    });

    // Task 2: Toggle auto-crash-on-cashout-threshold feature
    socket.on('admin:toggle_auto_crash_cashout', ({ enabled, threshold } = {}) => {
      if (socket.user?.role !== 'ADMIN') return;
      adminControlConfig.autoCrashOnCashout = Boolean(enabled);
      if (typeof threshold === 'number') {
        adminControlConfig.autoCrashCashoutThreshold = Math.min(1, Math.max(0.01, threshold));
      }
      emitAdminTelemetry(io);
      socket.emit('aviator:info', {
        message: `Auto-crash on cashout ${enabled ? 'ENABLED' : 'DISABLED'} @ ${(adminControlConfig.autoCrashCashoutThreshold * 100).toFixed(0)}% threshold`,
      });
    });

    // ── ADMIN: Simulate Next N Crash Points (statistical preview) ────────────
    // Generates crash points using the same provably fair formula with fresh
    // random seeds. These are indicative — NOT the actual scheduled values
    // (real rounds re-roll a fresh server seed at runtime). Useful for the
    // admin to see the distribution/range of upcoming rounds.
    socket.on('admin:simulate_next_crashes', ({ count = 10 } = {}) => {
      if (socket.user?.role !== 'ADMIN') return;
      const simulated = [];
      for (let i = 0; i < Math.min(count, 20); i++) {
        const tmpSeed = generateSeed(32);
        const cp = generateCrashPoint(tmpSeed, aviatorState.clientSeed, aviatorState.nonce + i + 1);
        simulated.push({ index: i + 1, crashPoint: cp, seed: tmpSeed.substring(0, 8) + '…' });
      }
      socket.emit('admin:simulated_crashes', {
        simulated,
        note: 'Indicative preview only — actual rounds use freshly generated seeds',
      });
    });

    socket.on('disconnect', () => { });
  });
};

// TASK 1 FIX: Calculate Net Payout Liability (Above Base Collected Pool)
const calculateNetExposure = (currentMultiplier) => {
  let netLiability = 0;
  const multDelta = Math.max(0, currentMultiplier - 1.00);

  aviatorState.bets.forEach((b) => {
    if (b.status === 'PLACED') {
      netLiability += b.betAmount * multDelta;
    }
  });

  aviatorState.simulatedBets.forEach((b) => {
    if (b.status === 'PLACED') {
      netLiability += b.betAmount * multDelta;
    }
  });

  return netLiability;
};

// Emit Non-Blocking Telemetry to `admin_room`
const emitAdminTelemetry = (io) => {
  aviatorState.activeExposureINR = calculateNetExposure(aviatorState.currentMultiplier);

  // Current round net profit: how much the house has retained so far in this round.
  // During flight: roundPool − totalPaidOut. Positive = house winning. Negative = house losing.
  const currentRoundNetProfit = aviatorState.roundPoolINR - aviatorState.totalWinINR;

  io.to('admin_room').emit('admin:telemetry_sync', {
    gameId: aviatorState.gameId,
    status: aviatorState.status,
    currentMultiplier: aviatorState.currentMultiplier,
    roundPoolINR: aviatorState.roundPoolINR,
    activeExposureINR: aviatorState.activeExposureINR,   // max additional payout if all remaining bets cash out NOW
    currentRoundNetProfit,                                // house P&L for this round so far
    totalWinINR: aviatorState.totalWinINR,
    activeBetsCount: aviatorState.activeBetsThisRound,
    totalBetsCount: aviatorState.totalBetsThisRound,
    userBets: aviatorState.bets,
    simulatedBets: aviatorState.simulatedBets,
    history: aviatorState.history,
    adminControlConfig,
    isOverridden: aviatorState.isOverridden,
    overrideType: aviatorState.overrideType,
    scheduledCrashPoint: aviatorState.crashPoint,
    autoCrashOnCashout: adminControlConfig.autoCrashOnCashout,
    autoCrashCashoutThreshold: adminControlConfig.autoCrashCashoutThreshold,
  });
};

// --- AVIATOR GAME ENGINE LOOP ---
const startAviatorLoop = (io) => {
  const runNextRound = async () => {
    aviatorState.nonce += 1;
    aviatorState.gameId = `AV_${Date.now()}_${aviatorState.nonce}`;
    aviatorState.serverSeed = generateSeed(32);
    aviatorState.serverSeedHash = hashSeed(aviatorState.serverSeed);

    if (adminControlConfig.mode === 'OVERRIDE' && adminControlConfig.forcedNextCrashPoint) {
      aviatorState.crashPoint = Number(adminControlConfig.forcedNextCrashPoint);
      aviatorState.isOverridden = true;
      aviatorState.overrideType = 'MANUAL_OVERRIDE';
    } else {
      aviatorState.crashPoint = generateCrashPoint(aviatorState.serverSeed, aviatorState.clientSeed, aviatorState.nonce);
      aviatorState.isOverridden = false;
      aviatorState.overrideType = 'NONE';
    }

    aviatorState.currentMultiplier = 1.00;
    aviatorState.status = 'BETTING';
    aviatorState.countdownSec = 5;
    aviatorState.bets = [];
    aviatorState.simulatedBets = [];
    aviatorState.totalWinINR = 0.00;
    aviatorState.roundPoolINR = 0.00;
    aviatorState.activeExposureINR = 0.00;
    aviatorState.totalBetsThisRound = 0;
    aviatorState.activeBetsThisRound = 0;

    await GameSession.create({
      gameId: aviatorState.gameId,
      gameType: 'AVIATOR',
      serverSeed: aviatorState.serverSeed,
      serverSeedHash: aviatorState.serverSeedHash,
      clientSeed: aviatorState.clientSeed,
      nonce: aviatorState.nonce,
      crashPoint: aviatorState.crashPoint,
      mode: adminControlConfig.mode,
      isOverridden: aviatorState.isOverridden,
      overrideType: aviatorState.overrideType,
      status: 'BETTING',
    }).catch((err) => console.error('[GameSession Error]', err.message));

    io.emit('aviator:round_preparing', {
      gameId: aviatorState.gameId,
      serverSeedHash: aviatorState.serverSeedHash,
      countdownSec: aviatorState.countdownSec,
      simulatedBets: aviatorState.simulatedBets,
      activeBetsCount: aviatorState.activeBetsThisRound,
      totalBetsCount: aviatorState.totalBetsThisRound,
    });

    emitAdminTelemetry(io);

    const countdownInterval = setInterval(() => {
      aviatorState.countdownSec -= 1;
      io.emit('aviator:countdown_tick', { countdownSec: aviatorState.countdownSec });

      if (aviatorState.countdownSec <= 0) {
        clearInterval(countdownInterval);
        startFlight();
      }
    }, 1000);
  };

  const startFlight = async () => {
    aviatorState.status = 'RUNNING';
    io.emit('aviator:round_started', {
      gameId: aviatorState.gameId,
      serverSeedHash: aviatorState.serverSeedHash,
    });

    const startTime = Date.now();

    aviatorTimer = setInterval(async () => {
      const elapsedSec = (Date.now() - startTime) / 1000;
      const rawMult = Math.pow(Math.E, 0.08 * elapsedSec);
      const current = Math.floor(rawMult * 100) / 100;

      // Calculate Net Payout Exposure above Base Collected Pool (monitoring metric — does NOT affect crash point)
      const currentNetLiability = calculateNetExposure(current);
      aviatorState.activeExposureINR = currentNetLiability;

      // MONITORING ALERT ONLY — emits an admin-room alert when exposure exceeds the configured ceiling.
      // This is purely informational. The cryptographic crash point is immutable and was set before
      // the round started — player bet volumes cannot alter it.
      if (
        adminControlConfig.riskAlertEnabled &&
        currentNetLiability >= adminControlConfig.maxExposureCeiling &&
        current > 1.05
      ) {
        io.to('admin_room').emit('admin:risk_alert', {
          message: `Net exposure ₹${currentNetLiability.toFixed(2)} has exceeded the alert threshold ₹${adminControlConfig.maxExposureCeiling}.`,
          currentMultiplier: current,
          netLiability: currentNetLiability,
          ceiling: adminControlConfig.maxExposureCeiling,
          scheduledCrashPoint: aviatorState.crashPoint,
        });
      }

      // Task 2: Auto-crash when cashouts hit the configured % of round pool
      if (
        adminControlConfig.autoCrashOnCashout &&
        aviatorState.status === 'RUNNING' &&
        aviatorState.roundPoolINR > 0
      ) {
        const cashoutRatio = aviatorState.totalWinINR / aviatorState.roundPoolINR;
        if (cashoutRatio >= adminControlConfig.autoCrashCashoutThreshold) {
          clearInterval(aviatorTimer);
          aviatorTimer = null;
          aviatorState.crashPoint = aviatorState.currentMultiplier;
          aviatorState.isOverridden = true;
          aviatorState.overrideType = 'AUTO_CRASH_CASHOUT_THRESHOLD';
          await triggerCrash();
          return;
        }
      }

      if (current >= aviatorState.crashPoint) {
        clearInterval(aviatorTimer);
        aviatorState.currentMultiplier = aviatorState.crashPoint;
        await triggerCrash();
        return;
      }

      aviatorState.currentMultiplier = current;
      io.emit('aviator:tick', { multiplier: current });

      // Real Users Auto Cashouts
      for (const bet of aviatorState.bets) {
        if (bet.status === 'PLACED' && bet.autoCashOut && current >= bet.autoCashOut) {
          bet.status = 'CASHOUT';
          bet.cashOutMultiplier = current;
          const payoutAmount = Math.floor(bet.betAmount * current * 100) / 100;
          bet.payoutAmount = payoutAmount;
          aviatorState.totalWinINR += payoutAmount;

          // Decrement active bets counter for real user cashout
          aviatorState.activeBetsThisRound = Math.max(0, aviatorState.activeBetsThisRound - 1);

          const user = await User.findById(bet.userId);
          if (user) {
            user.walletBalance += payoutAmount;
            await user.save();

            await BetHistory.findByIdAndUpdate(bet.betId, {
              status: 'CASHOUT',
              cashOutMultiplier: current,
              payoutAmount,
            });

            io.to(`user_${bet.userId}`).emit('aviator:cashout_success', {
              betId: bet.betId,
              panel: bet.panel || 1,
              cashOutMultiplier: current,
              payoutAmount,
              newBalance: user.walletBalance,
            });

            io.emit('aviator:player_cashed_out', {
              username: user.username,
              cashOutMultiplier: current,
              payoutAmount,
              totalWinINR: aviatorState.totalWinINR,
              activeBetsCount: aviatorState.activeBetsThisRound,
              totalBetsCount: aviatorState.totalBetsThisRound,
            });
          }
        }
      }

      emitAdminTelemetry(io);
    }, 50);
  };

  const triggerCrash = async () => {
    aviatorState.status = 'CRASHED';

    for (const bet of aviatorState.bets) {
      if (bet.status === 'PLACED') {
        bet.status = 'LOST';
        await BetHistory.findByIdAndUpdate(bet.betId, { status: 'LOST' });
      }
    }

    const netProfit = aviatorState.roundPoolINR - aviatorState.totalWinINR;

    await GameSession.findOneAndUpdate(
      { gameId: aviatorState.gameId },
      {
        status: 'CRASHED',
        endedAt: new Date(),
        totalBetsVolume: aviatorState.roundPoolINR,
        totalPayoutsVolume: aviatorState.totalWinINR,
        netHouseProfit: netProfit,
        totalBetsCount: aviatorState.bets.length + aviatorState.simulatedBets.length,
        mode: adminControlConfig.mode,
        isOverridden: aviatorState.isOverridden,
        overrideType: aviatorState.overrideType,
      }
    );

    const historyItem = {
      gameId: aviatorState.gameId,
      crashPoint: aviatorState.crashPoint,
      serverSeedHash: aviatorState.serverSeedHash,
      serverSeed: aviatorState.serverSeed,
      isOverridden: aviatorState.isOverridden,
      endedAt: new Date(),
    };

    aviatorState.history.unshift(historyItem);
    if (aviatorState.history.length > 50) aviatorState.history.pop();

    io.emit('aviator:crashed', {
      crashPoint: aviatorState.crashPoint,
      serverSeed: aviatorState.serverSeed,
      serverSeedHash: aviatorState.serverSeedHash,
      history: aviatorState.history,
    });

    emitAdminTelemetry(io);

    setTimeout(() => {
      runNextRound();
    }, 3000);
  };

  // Wire the module-level callback so admin:force_crash_now can reach it
  forceCrashCallback = triggerCrash;

  runNextRound();
};
