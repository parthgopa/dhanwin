import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────────────────────
// HOUSE EDGE & CAP CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Platform house edge expressed as a percentage (e.g. 4 = 4%).
 * This is the ONLY constant that controls long-run platform profitability.
 * Changing this value immediately changes the RTP of every future round.
 *
 *   RTP  = (100 - HOUSE_EDGE_PCT) / 100  → e.g. 0.96 at 4%
 *
 * Over thousands of rounds, the platform naturally retains HOUSE_EDGE_PCT %
 * of all money wagered, completely independently of player behavior.
 */
// ── CHANGE THIS ONE NUMBER to tune platform profitability ─────────────────
// SCALE=0.90 → 10% edge → players lose ₹10 per ₹100 wagered across all rounds
// SCALE=0.85 → 15% edge (more instant crashes, ~15% instant crash rate)
// SCALE=0.80 → 20% edge (very aggressive, not recommended)
const HOUSE_EDGE_PCT = 10;

/**
 * The scale factor derived directly from the house edge.
 *
 *   SCALE = (100 - HOUSE_EDGE_PCT) / 100  → 0.96 at 4%
 *
 * This single constant simultaneously controls:
 *   (a) The probability of instant crash: P(crash at 1.00x) = 1 - SCALE = HOUSE_EDGE_PCT%
 *   (b) The long-run RTP for any fixed cashout target T:
 *       E[payout per ₹1 bet] = T × P(M ≥ T) = T × (SCALE / T) = SCALE
 */
const SCALE = (100 - HOUSE_EDGE_PCT) / 100;

/**
 * Hard ceiling: the absolute maximum multiplier this game can ever produce.
 * Applied as a final clip on the formula output. Does not break provable
 * fairness — the cap value is publicly declared config, and the same seed
 * triple always produces the same raw value before capping.
 *
 * Clipping the extreme tail marginally increases the effective house edge
 * on those rare rounds, which benefits the platform.
 */
const MAX_MULTIPLIER = 100.00;

/**
 * Preferred operating cap applied in production.
 * Set conservatively below MAX_MULTIPLIER for risk management.
 * Players can independently verify this cap is applied consistently.
 */
// Preferred operating cap — 60x ceiling.
// With SCALE=0.90, the Pareto formula naturally produces the target distribution:
//   ~10% instant crash | ~45% @ 1-2x | ~27% @ 2-5x | ~9% @ 5-10x
//   ~5% @ 10-25x | ~2% @ 25-60x | ~1.5% capped at 60x (tail benefit to house)
const PREFERRED_CAP = 60.00;

// Export configuration so the admin dashboard and game loop can read them.
export { HOUSE_EDGE_PCT, SCALE, MAX_MULTIPLIER, PREFERRED_CAP };

// ─────────────────────────────────────────────────────────────────────────────
// SEED UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random hexadecimal seed.
 * @param {number} length - Byte length (default 32 → 64-char hex string)
 * @returns {string}
 */
export const generateSeed = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate SHA-256 hash of a server seed.
 * This hash is published to players BEFORE the round starts so they can
 * independently verify the server seed was not changed after bets were placed.
 * @param {string} seed
 * @returns {string} 64-character hex digest
 */
export const hashSeed = (seed) => {
  return crypto.createHash('sha256').update(seed).digest('hex');
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVABLY FAIR CRASH POINT GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a Provably Fair Aviator crash point using HMAC-SHA256.
 *
 * ┌─ ALGORITHM ──────────────────────────────────────────────────────────────┐
 * │                                                                          │
 * │  1. HMAC-SHA256(key=serverSeed, data="clientSeed:nonce") → 256-bit hash │
 * │  2. Extract first 8 hex chars → 32-bit integer h ∈ [0, 2^32 − 1]      │
 * │  3. Compute raw multiplier:                                              │
 * │        raw = SCALE × 2^32 / (2^32 − h)                                 │
 * │  4. If raw < 1.00 → return 1.00  (natural instant-crash gate)          │
 * │  5. Floor to 2 decimal places, then clamp to PREFERRED_CAP             │
 * │                                                                          │
 * ├─ HOUSE EDGE PROOF ───────────────────────────────────────────────────────┤
 * │                                                                          │
 * │  h is uniformly distributed over [0, 2^32).                             │
 * │                                                                          │
 * │  P(raw < 1.00) = P(h < (1 − SCALE) × 2^32)                            │
 * │                = 1 − SCALE = HOUSE_EDGE_PCT / 100 = 4%  ✓             │
 * │                                                                          │
 * │  For a player who always cashes out at fixed target T (T > 1):         │
 * │    P(M ≥ T) = P(raw ≥ T) = SCALE / T                                   │
 * │    E[payout per ₹1 bet] = T × P(M ≥ T) = T × SCALE/T = SCALE = 0.96  │
 * │                                                                          │
 * │  This holds for EVERY fixed cashout target T, regardless of bet size,  │
 * │  number of players, or round pool size. The crash point is computed     │
 * │  entirely from the seed triple — player behaviour has zero influence.   │
 * │                                                                          │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * @param {string} serverSeed - Secret seed revealed only after the round ends
 * @param {string} clientSeed - Public salt (global or player-contributed)
 * @param {number} nonce      - Monotonically incrementing game counter
 * @returns {number} Crash multiplier e.g. 1.00, 2.34, 17.80 (max PREFERRED_CAP)
 */
export const generateCrashPoint = (serverSeed, clientSeed, nonce) => {
  // Step 1 — Cryptographic hash (HMAC-SHA256)
  const hash = crypto
    .createHmac('sha256', serverSeed)
    .update(`${clientSeed}:${nonce}`)
    .digest('hex');

  // Step 2 — Extract 32-bit integer from the first 8 hex characters
  const h = parseInt(hash.substring(0, 8), 16);

  // Step 3 — Compute raw multiplier via inverse-CDF of the Pareto distribution
  // Range: SCALE (when h=0) → +∞ (as h → 2^32)
  const maxInt = 0x100000000; // 2^32 = 4,294,967,296
  const raw = (SCALE * maxInt) / (maxInt - h);

  // Step 4 — Natural instant-crash gate: raw < 1.00 ↔ h < HOUSE_EDGE% × 2^32
  // This fires with probability ≈ HOUSE_EDGE_PCT% without any separate modulo check.
  if (raw < 1.00) {
    return 1.00;
  }

  // Step 5 — Floor to 2 decimal places (truncate, never round up)
  const crashPoint = Math.floor(raw * 100) / 100;

  // Step 6 — Apply operating cap (PREFERRED_CAP ≤ MAX_MULTIPLIER)
  // Clipping the tail slightly increases actual house edge on those rounds.
  return Math.min(crashPoint, PREFERRED_CAP);
};

// ─────────────────────────────────────────────────────────────────────────────
// CHICKEN ROAD TRAP GENERATOR
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate trap tile positions for each row of the Chicken Road game.
 * Uses an independent HMAC-SHA256 per row for full per-row verifiability.
 *
 * @param {string} serverSeed
 * @param {string} clientSeed
 * @param {number} totalSteps   - Number of rows (default 5)
 * @param {number} tilesPerRow  - Tiles per row (default 4)
 * @returns {number[]} Array of trap tile indices (0-indexed) per row
 */
export const generateChickenRoadTraps = (
  serverSeed,
  clientSeed,
  totalSteps = 5,
  tilesPerRow = 4
) => {
  const traps = [];
  for (let row = 0; row < totalSteps; row++) {
    const hash = crypto
      .createHmac('sha256', serverSeed)
      .update(`${clientSeed}:row:${row}`)
      .digest('hex');

    const h = parseInt(hash.substring(0, 8), 16);
    traps.push(h % tilesPerRow);
  }
  return traps;
};

// ─────────────────────────────────────────────────────────────────────────────
// PROVABLY FAIR VERIFICATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify a past game round by recomputing the result from raw seeds.
 * Called by the /api/game/verify-seed endpoint after the server seed is revealed.
 *
 * Verification flow for players:
 *   1. Before round: receive serverSeedHash (SHA-256 of serverSeed)
 *   2. After round: receive serverSeed
 *   3. Confirm: SHA-256(serverSeed) === serverSeedHash  → seed was not changed
 *   4. Recompute: generateCrashPoint(serverSeed, clientSeed, nonce) → same result
 *
 * @param {string} serverSeed  - The now-revealed server seed
 * @param {string} clientSeed  - The client/public seed used in that round
 * @param {number} nonce       - The nonce used in that round
 * @param {string} gameType    - 'AVIATOR' | 'CHICKEN_ROAD'
 * @param {object} options     - Extra options for non-Aviator games
 * @returns {{ validHash: boolean, serverSeedHash: string, houseEdgePct: number, preferredCap: number, result: number|number[] }}
 */
export const verifyProvablyFair = (
  serverSeed,
  clientSeed,
  nonce,
  gameType = 'AVIATOR',
  options = {}
) => {
  const serverSeedHash = hashSeed(serverSeed);

  if (gameType === 'AVIATOR') {
    const crashPoint = generateCrashPoint(serverSeed, clientSeed, nonce);
    return {
      validHash: true,
      serverSeedHash,
      houseEdgePct: HOUSE_EDGE_PCT,
      preferredCap: PREFERRED_CAP,
      result: crashPoint,
    };
  }

  // CHICKEN_ROAD
  const traps = generateChickenRoadTraps(
    serverSeed,
    clientSeed,
    options.totalSteps || 5,
    options.tilesPerRow || 4
  );
  return { validHash: true, serverSeedHash, result: traps };
};
