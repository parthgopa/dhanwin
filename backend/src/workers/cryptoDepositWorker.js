import { ethers } from 'ethers';
import { User } from '../models/User.js';
import { WalletTransaction } from '../models/WalletTransaction.js';
import { CHAINS_CONFIG, verifyBlockchainTransaction, scanIncomingTransactions } from '../utils/cryptoVerifier.js';
import { getIO } from '../socket/gameSocket.js';
import { getLiveUsdtInrRate } from '../utils/exchangeRates.js';

const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

let isWorkerRunning = false;
let workerInterval = null;

// Track last inspected block per chain to avoid re-scanning
const lastScannedBlocks = {};

const workerInFlightHashes = new Set();

/**
 * Process and credit a detected deposit atomically
 */
const creditDetectedDeposit = async (txHash, chainKey, targetAddress, io) => {
  const cleanTxHash = txHash.toLowerCase();
  if (workerInFlightHashes.has(cleanTxHash)) return;

  // Check if already credited in DB
  const existingTx = await WalletTransaction.findOne({ utrNumber: cleanTxHash });
  if (existingTx) return;

  workerInFlightHashes.add(cleanTxHash);

  try {
    // Find the user who owns this deposit address (EVM or TRON)
    const user = await User.findOne({
      $or: [
        { cryptoDepositAddress: targetAddress.toLowerCase() },
        { tronDepositAddress: targetAddress },
      ],
    });
    if (!user) {
      console.log(`[Crypto Worker] Transfer to ${targetAddress} found, but no matching user in DB.`);
      return;
    }

    // Verify transaction on-chain
    const verified = await verifyBlockchainTransaction(cleanTxHash, chainKey, targetAddress);
    if (!verified || !verified.verified) return;

    const currentRate = getLiveUsdtInrRate();
    const rawInr = verified.amountUSDT * currentRate;
    const inrAmount = Number((Math.max(0.01, rawInr)).toFixed(2));

    let transaction;
    try {
      transaction = await WalletTransaction.create({
        userId: user._id,
        type: 'DEPOSIT',
        amount: inrAmount,
        status: 'APPROVED',
        utrNumber: cleanTxHash,
        adminNote: `Auto-Detected HD Web3 Deposit (${verified.chainName}) • ${verified.amountUSDT} USDT (User #${user.cryptoDepositIndex})`,
        paymentDetails: {
          accountHolderName: `Web3: ${verified.from.slice(0, 8)}...${verified.from.slice(-6)}`,
          accountNumber: cleanTxHash,
          upiId: verified.to,
          qrReference: verified.contract,
          chain: verified.chain,
        },
        processedAt: new Date(),
      });

      // Atomically update user balance
      user.walletBalance = Math.round(((user.walletBalance || 0) + inrAmount) * 100) / 100;
      await user.save();
    } catch (createErr) {
      if (createErr.code === 11000) {
        return; // Already processed by parallel request
      }
      throw createErr;
    }

  console.log(`[Crypto Worker] ⭐ Successfully credited ₹${inrAmount} (${verified.amountUSDT} USDT) to user ${user.username} (${user._id})!`);

  const activeIO = io || getIO();
  if (activeIO) {
    const populatedTx = await WalletTransaction.findById(transaction._id).populate(
      'userId',
      'username phone walletBalance'
    );

    // Emit real-time deposit approval to user's private room & direct channel
    const depositPayload = {
      amount: inrAmount,
      newBalance: user.walletBalance,
      amountUSDT: verified.amountUSDT,
      txHash: cleanTxHash,
      chain: verified.chainName,
      message: `Payment Confirmed! ₹${inrAmount.toLocaleString('en-IN')} (${verified.amountUSDT} USDT) added to your balance.`,
      transaction: populatedTx,
    };

    activeIO.to(`user_${user._id}`).emit('deposit_approved', depositPayload);
    activeIO.to(user._id.toString()).emit('deposit_approved', depositPayload);
    activeIO.emit(`deposit_approved_${user._id}`, depositPayload);

    activeIO.to(`user_${user._id}`).emit('wallet:updated', {
      balance: user.walletBalance,
      transaction: populatedTx,
    });

    activeIO.emit(`wallet:updated:${user._id}`, { balance: user.walletBalance });
    activeIO.to('admin_room').emit('admin:new_transaction', { transaction: populatedTx });
    activeIO.emit('admin:new_transaction', { transaction: populatedTx });
  }
  } finally {
    workerInFlightHashes.delete(cleanTxHash);
  }
};

/**
 * Scans active chains for incoming deposits across all users in a single batch
 */
export const scanBlockchainDepositBlocks = async (io) => {
  if (isWorkerRunning) return;
  isWorkerRunning = true;

  try {
    // 1. Get all assigned user deposit addresses from MongoDB
    const usersWithAddresses = await User.find({
      cryptoDepositAddress: { $exists: true, $ne: null },
    }).select('_id cryptoDepositAddress').lean();

    if (!usersWithAddresses || usersWithAddresses.length === 0) {
      isWorkerRunning = false;
      return;
    }

    const targetAddressSet = new Set(
      usersWithAddresses.map((u) => u.cryptoDepositAddress.toLowerCase())
    );

    const allowTestnet = process.env.ALLOW_CRYPTO_TESTNET !== 'false';

    // Prioritize active networks: BSC, Polygon, Arbitrum, Base, Sepolia (if enabled)
    const priorityChains = ['bsc', 'polygon', 'arbitrum', 'base'];
    if (allowTestnet) {
      priorityChains.push('sepolia');
    }

    for (const chainKey of priorityChains) {
      const chain = CHAINS_CONFIG[chainKey];
      if (!chain || chain.isTron || !Array.isArray(chain.rpcUrls) || (chain.isTestnet && !allowTestnet)) continue;

      const rpcUrl = chain.rpcUrls[0];
      if (!rpcUrl) continue;

      try {
        const provider = new ethers.JsonRpcProvider(
          rpcUrl,
          { name: chain.name, chainId: chain.chainId },
          { staticNetwork: true }
        );

        const currentBlock = await Promise.race([
          provider.getBlockNumber(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000)),
        ]);

        if (!currentBlock) continue;

        const lastBlock = lastScannedBlocks[chainKey] || (currentBlock - 4);
        const fromBlock = Math.max(lastBlock + 1, currentBlock - 10);
        const toBlock = currentBlock;

        if (fromBlock > toBlock) continue;

        // Fetch all ERC-20 transfer logs in this block window
        const logs = await Promise.race([
          provider.getLogs({
            fromBlock,
            toBlock,
            topics: [TRANSFER_EVENT_TOPIC],
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 4000)),
        ]);

        lastScannedBlocks[chainKey] = toBlock;

        if (Array.isArray(logs)) {
          for (const log of logs) {
            if (log.topics && log.topics.length >= 3) {
              const recipient = '0x' + log.topics[2].slice(26).toLowerCase();
              if (targetAddressSet.has(recipient)) {
                console.log(`[Crypto Worker] Detected incoming transfer to user deposit address ${recipient} on ${chain.name}! Tx: ${log.transactionHash}`);
                await creditDetectedDeposit(log.transactionHash, chainKey, recipient, io);
              }
            }
          }
        }
      } catch (chainErr) {
        // Silently skip if RPC provider timed out on this tick
      }
    }

    // Scan active EVM user deposit addresses via Blockscout explorer APIs (catches native ETH/BNB/MATIC + token transfers)
    if (usersWithAddresses && usersWithAddresses.length > 0) {
      for (const u of usersWithAddresses.slice(0, 10)) {
        try {
          const evmHashes = await scanIncomingTransactions(u.cryptoDepositAddress);
          for (const eh of evmHashes) {
            await creditDetectedDeposit(eh, allowTestnet ? 'sepolia' : 'polygon', u.cryptoDepositAddress, io);
          }
        } catch {
          // Silently continue
        }
      }
    }

    // Scan active TRON user deposit addresses
    const usersWithTron = await User.find({
      tronDepositAddress: { $exists: true, $ne: null },
    }).select('_id tronDepositAddress').lean();

    if (usersWithTron && usersWithTron.length > 0) {
      for (const u of usersWithTron.slice(0, 10)) {
        try {
          const tronHashes = await scanIncomingTransactions(u.tronDepositAddress);
          for (const th of tronHashes) {
            await creditDetectedDeposit(th, 'tron', u.tronDepositAddress, io);
          }
        } catch {
          // Silently continue
        }
      }
    }
  } catch (err) {
    console.error('[Crypto Worker Error]', err.message);
  } finally {
    isWorkerRunning = false;
  }
};

/**
 * Initializes the background blockchain deposit worker
 */
export const startCryptoDepositWorker = (io) => {
  if (workerInterval) clearInterval(workerInterval);

  console.log('[Crypto Worker] Starting centralized multi-user blockchain deposit scanner (every 5s)...');
  
  // Run first scan after 3 seconds
  setTimeout(() => {
    scanBlockchainDepositBlocks(io);
  }, 3000);

  // Periodic scanner every 5 seconds
  workerInterval = setInterval(() => {
    scanBlockchainDepositBlocks(io);
  }, 5000);

  return workerInterval;
};
