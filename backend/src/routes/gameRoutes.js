import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import { GameSession } from '../models/GameSession.js';
import { BetHistory } from '../models/BetHistory.js';
import { verifyProvablyFair } from '../utils/provablyFair.js';

const router = express.Router();

// Get Recent Multipliers / Past Rounds for Aviator
router.get('/aviator/history', async (req, res) => {
  try {
    const history = await GameSession.find({ gameType: 'AVIATOR', status: 'CRASHED' })
      .select('gameId serverSeedHash serverSeed crashPoint endedAt')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ history });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching Aviator history', error: error.message });
  }
});

// Get User's Bet History
router.get('/my-bets', verifyToken, async (req, res) => {
  try {
    const bets = await BetHistory.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ bets });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bet history', error: error.message });
  }
});

// Verify Provably Fair Seed for a Game Round
router.post('/verify-seed', async (req, res) => {
  try {
    const { serverSeed, clientSeed, nonce, gameType } = req.body;

    if (!serverSeed || !clientSeed || nonce === undefined) {
      return res.status(400).json({ message: 'Server seed, client seed, and nonce are required' });
    }

    const verification = verifyProvablyFair(serverSeed, clientSeed, Number(nonce), gameType || 'AVIATOR');
    res.json({ verification });
  } catch (error) {
    res.status(500).json({ message: 'Error verifying seed', error: error.message });
  }
});

export default router;
