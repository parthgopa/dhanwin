import { ethers } from 'ethers';

export const getAdminCryptoWallet = () =>
  (process.env.ADMIN_CRYPTO_WALLET_ADDRESS || '0xe1024983d55C14497b7d5396A15748FeC0F2A7cd').toLowerCase();

export const ADMIN_CRYPTO_WALLET = getAdminCryptoWallet();

export const CHAINS_CONFIG = {
  bsc: {
    name: 'BNB Smart Chain',
    chainId: 56,
    rpcUrls: [
      'https://bsc-dataseed.binance.org/',
      'https://binance.llamarpc.com',
      'https://bsc-dataseed1.defibit.io/',
    ],
    usdtContract: '0x55d398326f99059fF775485246999027B3197955'.toLowerCase(),
    usdtDecimals: 18,
    symbol: 'BNB',
    nativeToUsdtRate: 600,
  },
  polygon: {
    name: 'Polygon PoS',
    chainId: 137,
    rpcUrls: [
      'https://polygon.llamarpc.com',
      'https://1rpc.io/matic',
      'https://polygon-bor-rpc.publicnode.com',
    ],
    usdtContract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'POL',
    nativeToUsdtRate: 0.5,
  },
  arbitrum: {
    name: 'Arbitrum One',
    chainId: 42161,
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
    ],
    usdtContract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'ETH',
    nativeToUsdtRate: 2500,
  },
  base: {
    name: 'Base',
    chainId: 8453,
    rpcUrls: [
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
    ],
    usdtContract: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'ETH',
    nativeToUsdtRate: 2500,
  },
  optimism: {
    name: 'Optimism',
    chainId: 10,
    rpcUrls: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
    ],
    usdtContract: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'ETH',
    nativeToUsdtRate: 2500,
  },
  avalanche: {
    name: 'Avalanche C-Chain',
    chainId: 43114,
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.public-rpc.com',
    ],
    usdtContract: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'AVAX',
    nativeToUsdtRate: 25,
  },
  ethereum: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrls: [
      'https://cloudflare-eth.com',
      'https://eth.llamarpc.com',
      'https://ethereum-rpc.publicnode.com',
    ],
    usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'ETH',
    nativeToUsdtRate: 2500,
  },
  sepolia: {
    name: 'Ethereum Sepolia Testnet',
    chainId: 11155111,
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.gateway.tenderly.co',
      'https://1rpc.io/sepolia',
    ],
    usdtContract: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'SepoliaETH',
    nativeToUsdtRate: 2500,
    isTestnet: true,
  },
  bsc_testnet: {
    name: 'BNB Smart Chain Testnet',
    chainId: 97,
    rpcUrls: [
      'https://bsc-testnet.publicnode.com',
      'https://data-seed-prebsc-1-s1.binance.org:8545/',
    ],
    usdtContract: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd'.toLowerCase(),
    usdtDecimals: 18,
    symbol: 'tBNB',
    nativeToUsdtRate: 600,
    isTestnet: true,
  },
  linea: {
    name: 'Linea',
    chainId: 59144,
    rpcUrls: [
      'https://rpc.linea.build',
      'https://linea.blockpi.network/v1/rpc/public',
    ],
    usdtContract: '0xA219439258ca9da29E9Cc4cE5596924745e12B93'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'ETH',
    nativeToUsdtRate: 2500,
  },
  scroll: {
    name: 'Scroll',
    chainId: 534352,
    rpcUrls: [
      'https://rpc.scroll.io',
      'https://scroll.blockpi.network/v1/rpc/public',
    ],
    usdtContract: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'ETH',
    nativeToUsdtRate: 2500,
  },
  zksync: {
    name: 'zkSync Era',
    chainId: 324,
    rpcUrls: [
      'https://mainnet.era.zksync.io',
    ],
    usdtContract: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'ETH',
    nativeToUsdtRate: 2500,
  },
  blast: {
    name: 'Blast',
    chainId: 81457,
    rpcUrls: [
      'https://rpc.blast.io',
      'https://blast.blockpi.network/v1/rpc/public',
    ],
    usdtContract: '0x4300000000000000000000000000000000000003'.toLowerCase(),
    usdtDecimals: 18,
    symbol: 'ETH',
    nativeToUsdtRate: 2500,
  },
  sonic: {
    name: 'Sonic',
    chainId: 146,
    rpcUrls: [
      'https://rpc.soniclabs.com',
    ],
    usdtContract: '0x6041071e6A0f66675e8d975D49e4975e53FE2456'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'S',
    nativeToUsdtRate: 0.6,
  },
  fantom: {
    name: 'Fantom Opera',
    chainId: 250,
    rpcUrls: [
      'https://1rpc.io/ftm',
    ],
    usdtContract: '0x049d68029688eAbF473097ac27CB571289380771'.toLowerCase(),
    usdtDecimals: 6,
    symbol: 'FTM',
    nativeToUsdtRate: 0.6,
  },
  tron: {
    name: 'TRON (TRC-20)',
    chainId: 728126428,
    usdtContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    usdtDecimals: 6,
    symbol: 'TRX',
    nativeToUsdtRate: 0.16,
    isTron: true,
  },
};

// Standard ERC20 Transfer event signature: Transfer(address,address,uint256)
const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

/**
 * Scans TronScan API for recent incoming TRC-20 USDT token transfers to a specific Tron address
 */
export const scanIncomingTronTransactions = async (tronAddress) => {
  if (!tronAddress || !tronAddress.startsWith('T')) return [];

  const detectedHashes = new Set();
  const now = Date.now();
  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

  try {
    const res = await fetch(
      `https://apilist.tronscanapi.com/api/token_trc20/transfers?limit=15&start=0&relatedAddress=${tronAddress}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.token_transfers)) {
        for (const t of data.token_transfers) {
          if (
            t.transaction_id &&
            t.to_address === tronAddress &&
            (t.contractRet === 'SUCCESS' || t.finalResult === 'SUCCESS')
          ) {
            const txTime = t.block_ts || now;
            if (now - txTime <= FIFTEEN_MINUTES_MS) {
              detectedHashes.add(t.transaction_id.toLowerCase());
            }
          }
        }
      }
    }
  } catch {
    // Silently skip on network glitch
  }

  return Array.from(detectedHashes);
};

/**
 * Scans public blockchain APIs for recent incoming transactions and token transfers to the Admin Wallet or user address.
 * If preferredChain is supplied, prioritizes/scans that specific network to avoid unnecessary rate limits.
 *
 * @param {string} adminAddress - EVM (0x...) or TRON (T...) deposit address
 * @param {string} preferredChain - 'sepolia', 'bsc', 'polygon', 'arbitrum', 'base', 'optimism', 'ethereum', 'tron', etc.
 * @returns {Promise<string[]>} Array of clean txHashes received recently
 */
export const scanIncomingTransactions = async (adminAddress = getAdminCryptoWallet(), preferredChain = null) => {
  if (adminAddress && adminAddress.startsWith('T')) {
    return await scanIncomingTronTransactions(adminAddress);
  }

  const target = adminAddress.toLowerCase();
  const allowTestnet = process.env.ALLOW_CRYPTO_TESTNET !== 'false';

  const BROWSER_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
  };

  const NETWORK_ENDPOINTS = {
    polygon: { name: 'Polygon', url: `https://polygon.blockscout.com/api/v2/addresses/${target}` },
    arbitrum: { name: 'Arbitrum', url: `https://arbitrum.blockscout.com/api/v2/addresses/${target}` },
    base: { name: 'Base', url: `https://base.blockscout.com/api/v2/addresses/${target}` },
    optimism: { name: 'Optimism', url: `https://optimism.blockscout.com/api/v2/addresses/${target}` },
    ethereum: { name: 'Ethereum', url: `https://eth.blockscout.com/api/v2/addresses/${target}` },
    scroll: { name: 'Scroll', url: `https://scroll.blockscout.com/api/v2/addresses/${target}` },
    sepolia: { name: 'Sepolia', url: `https://eth-sepolia.blockscout.com/api/v2/addresses/${target}` },
  };

  const endpoints = [];

  // If a preferred chain is specified (e.g. 'sepolia'), ALWAYS scan it directly
  if (preferredChain && NETWORK_ENDPOINTS[preferredChain]) {
    endpoints.push(NETWORK_ENDPOINTS[preferredChain]);
  } else {
    // If no specific chain requested, scan major EVM chains
    endpoints.push(
      NETWORK_ENDPOINTS.polygon,
      NETWORK_ENDPOINTS.arbitrum,
      NETWORK_ENDPOINTS.base,
      NETWORK_ENDPOINTS.optimism,
      NETWORK_ENDPOINTS.ethereum,
      NETWORK_ENDPOINTS.scroll
    );
    if (allowTestnet || preferredChain === 'sepolia') {
      endpoints.push(NETWORK_ENDPOINTS.sepolia);
    }
  }

  const detectedHashes = new Set();
  const now = Date.now();
  const MAX_AGE_MS = 30 * 60 * 1000; // Look back up to 30 minutes for live uncredited deposits

  await Promise.allSettled(
    endpoints.map(async (ep) => {
      try {
        const [txRes, tokRes] = await Promise.all([
          fetch(`${ep.url}/transactions`, {
            headers: BROWSER_HEADERS,
            signal: AbortSignal.timeout(6000),
          }).then((r) => (r.ok ? r.json() : null)).catch((e) => {
            console.warn(`[Blockscout] ${ep.name} /transactions fetch warning:`, e.message);
            return null;
          }),
          fetch(`${ep.url}/token-transfers`, {
            headers: BROWSER_HEADERS,
            signal: AbortSignal.timeout(6000),
          }).then((r) => (r.ok ? r.json() : null)).catch((e) => {
            console.warn(`[Blockscout] ${ep.name} /token-transfers fetch warning:`, e.message);
            return null;
          }),
        ]);

        if (txRes && Array.isArray(txRes.items)) {
          for (const item of txRes.items) {
            if (
              item.hash &&
              item.status === 'ok' &&
              item.to?.hash?.toLowerCase() === target &&
              item.value && item.value !== '0'
            ) {
              const txTime = item.timestamp ? new Date(item.timestamp).getTime() : now;
              if (now - txTime <= MAX_AGE_MS) {
                detectedHashes.add(item.hash.toLowerCase());
              }
            }
          }
        }

        if (tokRes && Array.isArray(tokRes.items)) {
          for (const item of tokRes.items) {
            const hash = item.tx_hash || item.transaction_hash;
            if (
              hash &&
              item.to?.hash?.toLowerCase() === target &&
              item.total?.value && item.total.value !== '0'
            ) {
              const txTime = item.timestamp ? new Date(item.timestamp).getTime() : now;
              if (now - txTime <= MAX_AGE_MS) {
                detectedHashes.add(hash.toLowerCase());
              }
            }
          }
        }
      } catch (err) {
        console.warn(`[Blockscout] ${ep.name} scan error:`, err.message);
      }
    })
  );

  return Array.from(detectedHashes);
};

/**
 * Verifies a TRON (TRC-20 or TRX) transaction on-chain via TronScan and TronGrid APIs.
 *
 * @param {string} txHash - 64-character TRON transaction hash (with or without 0x)
 * @param {string} expectedTargetAddress - User's Tron deposit address (T...)
 * @returns {Promise<Object>}
 */
export const verifyTronTransaction = async (txHash, expectedTargetAddress = null) => {
  if (!txHash) {
    throw new Error('Transaction hash is required.');
  }

  let cleanHash = txHash.trim();
  if (cleanHash.startsWith('0x') || cleanHash.startsWith('0X')) {
    cleanHash = cleanHash.slice(2);
  }
  cleanHash = cleanHash.toLowerCase();

  if (cleanHash.length !== 64 || !/^[0-9a-f]{64}$/.test(cleanHash)) {
    throw new Error('Invalid TRON transaction hash format. Must be a 64-character hex string.');
  }

  console.log(`[TronVerifier] Verifying tx ${cleanHash} for target: ${expectedTargetAddress || 'ANY'}`);

  let data = null;
  try {
    const res = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${cleanHash}`, {
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      data = await res.json();
    }
  } catch (e) {
    console.warn('[TronVerifier] TronScan API error:', e.message);
  }

  if (!data || !data.hash) {
    throw new Error('TRON transaction not found on network. It may still be confirming on Tron. Please wait 15-30 seconds and try again.');
  }

  if (data.contractRet !== 'SUCCESS' && data.finalResult !== 'SUCCESS') {
    throw new Error(`TRON transaction failed or was reverted (Status: ${data.contractRet || data.finalResult || 'FAILED'}).`);
  }

  const validTargets = new Set();
  if (expectedTargetAddress) {
    validTargets.add(expectedTargetAddress.trim());
  }

  // 1. Check TRC-20 USDT transfer
  if (Array.isArray(data.trc20TransferInfo) && data.trc20TransferInfo.length > 0) {
    for (const transfer of data.trc20TransferInfo) {
      const toAddr = transfer.to_address;
      if (validTargets.size === 0 || validTargets.has(toAddr)) {
        const decimals = transfer.decimals || 6;
        const amountUSDT = Number(transfer.amount_str) / (10 ** decimals);

        return {
          verified: true,
          chain: 'tron',
          chainName: 'TRON (TRC-20)',
          txHash: cleanHash,
          blockNumber: data.block,
          from: transfer.from_address,
          to: toAddr,
          amountUSDT,
          contract: transfer.contract_address,
          isNative: false,
        };
      }
    }
  }

  // 2. Check native TRX transfer
  if (data.contractData) {
    const toAddr = data.contractData.to_address;
    if (validTargets.size === 0 || validTargets.has(toAddr)) {
      const rawSun = Number(data.contractData.amount || 0);
      const trxAmount = rawSun / 1e6;
      const amountUSDT = Math.max(0.0001, Number((trxAmount * 0.16).toFixed(4)));

      return {
        verified: true,
        chain: 'tron',
        chainName: 'TRON (TRX)',
        txHash: cleanHash,
        blockNumber: data.block,
        from: data.ownerAddress,
        to: toAddr,
        amountUSDT,
        contract: 'NATIVE_TRX',
        isNative: true,
      };
    }
  }

  throw new Error(`TRON transaction verified on-chain, but the recipient does not match your assigned Tron deposit address (${expectedTargetAddress}).`);
};

/**
 * Verifies a crypto deposit transaction on-chain across all supported networks.
 * If preferredChain is provided, checks that chain first; otherwise scans all chains.
 * Supports both ERC-20 USDT transfers, TRC-20 USDT transfers, and native coin deposits.
 *
 * @param {string} txHash - Transaction hash (66 chars for EVM, 64 chars for Tron)
 * @param {string} preferredChain - 'tron', 'bsc', 'polygon', 'arbitrum', 'base', 'optimism', 'avalanche', 'ethereum', etc.
 * @returns {Promise<Object>} Verification details including amountUSDT, from, to, chain, and status
 */
export const verifyBlockchainTransaction = async (txHash, preferredChain = 'bsc', expectedTargetAddress = null) => {
  const cleanStr = (txHash || '').trim();
  const isTron = preferredChain === 'tron' ||
    (expectedTargetAddress && expectedTargetAddress.startsWith('T')) ||
    (cleanStr.length === 64 && !cleanStr.startsWith('0x'));

  if (isTron) {
    return await verifyTronTransaction(cleanStr, expectedTargetAddress);
  }

  if (!cleanStr.startsWith('0x') || cleanStr.length !== 66) {
    throw new Error('Invalid transaction hash format. Must be a 66-character hex string starting with 0x.');
  }

  const cleanTxHash = cleanStr.toLowerCase();
  const adminTarget = getAdminCryptoWallet();
  const validTargets = new Set([adminTarget]);
  if (expectedTargetAddress && expectedTargetAddress.startsWith('0x')) {
    validTargets.add(expectedTargetAddress.trim().toLowerCase());
  }

  const allowTestnet = process.env.ALLOW_CRYPTO_TESTNET !== 'false';

  // Build list of chains to scan: preferred chain first, then all remaining chains
  const chainsToScan = [];
  if (preferredChain && CHAINS_CONFIG[preferredChain]) {
    chainsToScan.push(preferredChain);
  }
  for (const key of Object.keys(CHAINS_CONFIG)) {
    if (!chainsToScan.includes(key)) {
      chainsToScan.push(key);
    }
  }

  console.log(`[CryptoVerifier] Scanning tx ${cleanTxHash} for valid targets [${Array.from(validTargets).join(', ')}] across chains:`, chainsToScan);

  let verifiedResult = null;
  let foundReceiptWithoutAdminMatch = false;

  for (const chainKey of chainsToScan) {
    const chain = CHAINS_CONFIG[chainKey];
    if (!chain || chain.isTron || !Array.isArray(chain.rpcUrls)) continue;

    // Security Gate: Reject/skip testnets if ALLOW_CRYPTO_TESTNET is explicitly disabled
    // (Never skip if user explicitly selected this testnet chain)
    if (chain.isTestnet && !allowTestnet && preferredChain !== chainKey) {
      continue;
    }

    for (const rpcUrl of chain.rpcUrls) {
      try {
        const provider = new ethers.JsonRpcProvider(
          rpcUrl,
          { name: chain.name, chainId: chain.chainId },
          { staticNetwork: true }
        );

        // Fast RPC fetch with timeout
        const receipt = await Promise.race([
          provider.getTransactionReceipt(cleanTxHash),
          new Promise((_, reject) => setTimeout(() => reject(new Error('RPC_TIMEOUT')), 3500)),
        ]);

        // If receipt is null, the transaction does NOT exist on this chain. Move immediately to next chain.
        if (!receipt) {
          break;
        }

        console.log(`[CryptoVerifier] Receipt found on ${chain.name} (${chainKey}), status: ${receipt.status}`);

        if (receipt.status !== 1) {
          throw new Error(`Transaction failed or was reverted on ${chain.name}.`);
        }

        // 1. Check for ERC-20 Transfer logs to Admin or User Deposit Wallet
        let matchedTransfer = null;
        for (const log of receipt.logs || []) {
          if (log.topics && log.topics[0] === TRANSFER_EVENT_TOPIC && log.topics.length >= 3) {
            const recipient = '0x' + log.topics[2].slice(26).toLowerCase();
            if (validTargets.has(recipient)) {
              const sender = '0x' + log.topics[1].slice(26).toLowerCase();
              const rawValue = BigInt(log.data);
              const amountUSDT = Number(ethers.formatUnits(rawValue, chain.usdtDecimals));

              matchedTransfer = {
                from: sender,
                to: recipient,
                contract: log.address.toLowerCase(),
                amountUSDT,
                rawValue: rawValue.toString(),
                isNative: false,
              };
              break;
            }
          }
        }

        // 2. Fallback: Check for Native Currency Transfer (ETH, Sepolia ETH, BNB, POL)
        if (!matchedTransfer) {
          const rawTx = await Promise.race([
            provider.getTransaction(cleanTxHash),
            new Promise((_, reject) => setTimeout(() => reject(new Error('RPC_TIMEOUT')), 3500)),
          ]);

          if (rawTx && rawTx.to && validTargets.has(rawTx.to.toLowerCase()) && rawTx.value > 0n) {
            const nativeAmount = Number(ethers.formatEther(rawTx.value));
            const calculatedUSDT = Math.max(0.0001, nativeAmount * chain.nativeToUsdtRate);

            matchedTransfer = {
              from: rawTx.from.toLowerCase(),
              to: rawTx.to.toLowerCase(),
              contract: `NATIVE_${chain.symbol}`,
              amountUSDT: Number(calculatedUSDT.toFixed(4)),
              rawValue: rawTx.value.toString(),
              isNative: true,
            };
          }
        }

        if (matchedTransfer) {
          verifiedResult = {
            verified: true,
            chain: chainKey,
            chainName: chain.name,
            txHash: cleanTxHash,
            blockNumber: receipt.blockNumber,
            from: matchedTransfer.from,
            to: matchedTransfer.to,
            amountUSDT: matchedTransfer.amountUSDT,
            contract: matchedTransfer.contract,
            isNative: matchedTransfer.isNative,
          };
          break;
        } else {
          foundReceiptWithoutAdminMatch = true;
        }
      } catch (err) {
        if (err.message?.includes('reverted')) {
          throw err;
        }
        // Try next RPC or next chain
      }
    }

    if (verifiedResult) break;
  }

  if (verifiedResult) {
    console.log(`[CryptoVerifier] Transaction Verified:`, verifiedResult);
    return verifiedResult;
  }

  if (foundReceiptWithoutAdminMatch) {
    throw new Error(
      `Transaction was found, but neither USDT nor native currency was sent to Admin Address (${ADMIN_CRYPTO_WALLET}).`
    );
  }

  throw new Error(
    `Transaction not found on any supported network (BSC, Polygon, Ethereum Mainnet, or Sepolia Testnet). It may still be pending in the mempool. Please wait 15-30 seconds and try again.`
  );
};
