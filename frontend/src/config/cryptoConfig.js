// ── WEB3 & CRYPTO USDT CONFIGURATION ──────────────────────────────────────────
export const ADMIN_CRYPTO_WALLET_ADDRESS =
  (import.meta.env.VITE_ADMIN_CRYPTO_WALLET_ADDRESS ||
  '0xe1024983d55C14497b7d5396A15748FeC0F2A7cd').trim();

// Compatibility alias
export const ADMIN_TRUST_WALLET_ADDRESS = ADMIN_CRYPTO_WALLET_ADDRESS;

// Live exchange rate fallback (dynamically updated from API)
export const USDT_INR_RATE = 94.5;

const MAINNET_CHAINS = {
  tron: {
    id: 'tron',
    name: 'TRON (TRC-20)',
    shortName: 'TRON (TRC-20)',
    chainId: 728126428,
    explorerUrl: 'https://tronscan.org/#/address',
    nativeCurrency: { name: 'TRX', symbol: 'TRX', decimals: 6 },
    usdtContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    usdtDecimals: 6,
    badgeColor: 'from-red-600 to-rose-700 text-white',
    tag: '🔥 Binance / CoinDCX / WazirX Preferred',
    icon: '🔴',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/tron/info/logo.png',
    isTron: true,
  },
  bsc: {
    id: 'bsc',
    name: 'BNB Smart Chain',
    shortName: 'BNB Smart Chain (BEP-20)',
    chainId: 56,
    chainIdHex: '0x38',
    rpcUrls: [
      'https://bsc-dataseed.binance.org/',
      'https://binance.llamarpc.com',
      'https://bsc-dataseed1.defibit.io/',
    ],
    explorerUrl: 'https://bscscan.com',
    nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
    usdtContract: '0x55d398326f99059fF775485246999027B3197955',
    usdtDecimals: 18,
    badgeColor: 'from-amber-400 to-yellow-500 text-black',
    tag: '⭐ Lowest Gas Fee (~₹2)',
    icon: '⚡',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/binance/info/logo.png',
  },
  polygon: {
    id: 'polygon',
    name: 'Polygon PoS',
    shortName: 'Polygon PoS (POL)',
    chainId: 137,
    chainIdHex: '0x89',
    rpcUrls: [
      'https://polygon.llamarpc.com',
      'https://1rpc.io/matic',
    ],
    explorerUrl: 'https://polygonscan.com',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    usdtContract: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    usdtDecimals: 6,
    badgeColor: 'from-purple-500 to-indigo-600 text-white',
    tag: '⚡ Fast & Ultra-Low Gas (~₹1)',
    icon: '🟣',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/polygon/info/logo.png',
  },
  arbitrum: {
    id: 'arbitrum',
    name: 'Arbitrum One',
    shortName: 'Arbitrum One (L2)',
    chainId: 42161,
    chainIdHex: '0xa4b1',
    rpcUrls: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum.llamarpc.com',
    ],
    explorerUrl: 'https://arbiscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    usdtContract: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    usdtDecimals: 6,
    badgeColor: 'from-sky-500 to-blue-600 text-white',
    tag: '⚡ Ethereum L2 (~₹3)',
    icon: '🔵',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/arbitrum/info/logo.png',
  },
  base: {
    id: 'base',
    name: 'Base',
    shortName: 'Base (Coinbase L2)',
    chainId: 8453,
    chainIdHex: '0x2105',
    rpcUrls: [
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
    ],
    explorerUrl: 'https://basescan.org',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    usdtContract: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    usdtDecimals: 6,
    badgeColor: 'from-blue-600 to-indigo-700 text-white',
    tag: '⚡ Coinbase L2 (~₹2)',
    icon: '🔷',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/base/info/logo.png',
  },
  optimism: {
    id: 'optimism',
    name: 'Optimism (OP Mainnet)',
    shortName: 'Optimism (OP)',
    chainId: 10,
    chainIdHex: '0xa',
    rpcUrls: [
      'https://mainnet.optimism.io',
      'https://optimism.llamarpc.com',
    ],
    explorerUrl: 'https://optimistic.etherscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    usdtContract: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    usdtDecimals: 6,
    badgeColor: 'from-red-500 to-rose-600 text-white',
    tag: '⚡ Ethereum L2 (~₹3)',
    icon: '🔴',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/optimism/info/logo.png',
  },
  linea: {
    id: 'linea',
    name: 'Linea',
    shortName: 'Linea (ConsenSys zkEVM)',
    chainId: 59144,
    chainIdHex: '0xe708',
    rpcUrls: [
      'https://rpc.linea.build',
      'https://linea.blockpi.network/v1/rpc/public',
    ],
    explorerUrl: 'https://lineascan.build',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    usdtContract: '0xA219439258ca9da29E9Cc4cE5596924745e12B93',
    usdtDecimals: 6,
    badgeColor: 'from-zinc-700 to-neutral-900 text-white',
    tag: '⚡ MetaMask zkEVM (~₹2)',
    icon: '⬛',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/linea/info/logo.png',
  },
  scroll: {
    id: 'scroll',
    name: 'Scroll',
    shortName: 'Scroll (zkRollup)',
    chainId: 534352,
    chainIdHex: '0x82750',
    rpcUrls: [
      'https://rpc.scroll.io',
      'https://scroll.blockpi.network/v1/rpc/public',
    ],
    explorerUrl: 'https://scrollscan.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    usdtContract: '0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df',
    usdtDecimals: 6,
    badgeColor: 'from-amber-600 to-orange-700 text-white',
    tag: '⚡ Native zkEVM (~₹2)',
    icon: '📜',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/scroll/info/logo.png',
  },
  zksync: {
    id: 'zksync',
    name: 'zkSync Era',
    shortName: 'zkSync Era',
    chainId: 324,
    chainIdHex: '0x144',
    rpcUrls: [
      'https://mainnet.era.zksync.io',
    ],
    explorerUrl: 'https://explorer.zksync.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    usdtContract: '0x493257fD37EDB34451f62EDf8D2a0C418852bA4C',
    usdtDecimals: 6,
    badgeColor: 'from-violet-600 to-purple-800 text-white',
    tag: '⚡ Zero Knowledge (~₹3)',
    icon: '🔮',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/zksync/info/logo.png',
  },
  blast: {
    id: 'blast',
    name: 'Blast',
    shortName: 'Blast (Native Yield L2)',
    chainId: 81457,
    chainIdHex: '0x13e31',
    rpcUrls: [
      'https://rpc.blast.io',
      'https://blast.blockpi.network/v1/rpc/public',
    ],
    explorerUrl: 'https://blastscan.io',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    usdtContract: '0x4300000000000000000000000000000000000003',
    usdtDecimals: 18,
    badgeColor: 'from-yellow-400 to-amber-500 text-black',
    tag: '⚡ Yield Bearing L2 (~₹2)',
    icon: '💥',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/blast/info/logo.png',
  },
  sonic: {
    id: 'sonic',
    name: 'Sonic (Fantom)',
    shortName: 'Sonic (Fantom)',
    chainId: 146,
    chainIdHex: '0x92',
    rpcUrls: [
      'https://rpc.soniclabs.com',
    ],
    explorerUrl: 'https://sonicscan.org',
    nativeCurrency: { name: 'Sonic', symbol: 'S', decimals: 18 },
    usdtContract: '0x6041071e6A0f66675e8d975D49e4975e53FE2456',
    usdtDecimals: 6,
    badgeColor: 'from-blue-500 to-cyan-600 text-white',
    tag: '⚡ 10k TPS Sub-Second (~₹0.5)',
    icon: '💨',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/sonic/info/logo.png',
  },
  avalanche: {
    id: 'avalanche',
    name: 'Avalanche C-Chain',
    shortName: 'Avalanche (AVAX)',
    chainId: 43114,
    chainIdHex: '0xa86a',
    rpcUrls: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche.public-rpc.com',
    ],
    explorerUrl: 'https://snowtrace.io',
    nativeCurrency: { name: 'AVAX', symbol: 'AVAX', decimals: 18 },
    usdtContract: '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7',
    usdtDecimals: 6,
    badgeColor: 'from-rose-500 to-red-600 text-white',
    tag: '⚡ Fast & Low Fees',
    icon: '🔺',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/avalanchec/info/logo.png',
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum (ERC-20)',
    chainId: 1,
    chainIdHex: '0x1',
    rpcUrls: [
      'https://cloudflare-eth.com',
      'https://eth.llamarpc.com',
    ],
    explorerUrl: 'https://etherscan.com',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    usdtContract: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    usdtDecimals: 6,
    badgeColor: 'from-slate-500 to-gray-700 text-white',
    tag: 'Standard ERC-20',
    icon: '💎',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
  },
};

const TESTNET_CHAINS = {
  sepolia: {
    id: 'sepolia',
    name: 'Ethereum Sepolia Testnet',
    shortName: 'Sepolia (Dev Testnet)',
    chainId: 11155111,
    chainIdHex: '0xaa36a7',
    rpcUrls: [
      'https://ethereum-sepolia-rpc.publicnode.com',
      'https://sepolia.gateway.tenderly.co',
    ],
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
    usdtContract: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06',
    usdtDecimals: 6,
    badgeColor: 'from-pink-500 to-rose-600 text-white',
    tag: '🧪 Dev Testing Only',
    icon: '🧪',
    logoUrl: 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/info/logo.png',
    isTestnet: true,
  },
};

export const SUPPORTED_CHAINS = {
  ...MAINNET_CHAINS,
  ...(import.meta.env.VITE_ALLOW_CRYPTO_TESTNET === 'true' ? TESTNET_CHAINS : {}),
};

// Standard Minimal ERC-20 ABI
export const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function balanceOf(address owner) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

/**
 * Returns clean Universal Address for QR code scanning.
 * Standard EVM hex addresses are 100% compatible with ALL wallet cameras
 * (Trust Wallet, Binance, MetaMask, OKX, CoinDCX, Bybit, Phantom).
 */
/**
 * Returns formatted URI for QR code scanning.
 * Standard EVM hex addresses are 100% compatible with all wallet and exchange cameras.
 */
export const buildCryptoEIP681Uri = (chainKey, usdtAmount, customAddress = null) => {
  const chain = SUPPORTED_CHAINS[chainKey];
  const target = customAddress || ADMIN_CRYPTO_WALLET_ADDRESS;
  if (chain?.isTron) {
    return target; // Plain Tron address (T...) is universally compatible with CoinDCX, Binance, Trust Wallet, TronLink
  }
  if (!chain) return `ethereum:${target}`;
  if (chain.chainId && chain.chainId !== 1) {
    return `ethereum:${target}@${chain.chainId}`;
  }
  return `ethereum:${target}`;
};

export const buildTrustWalletEIP681Uri = buildCryptoEIP681Uri;

/**
 * Builds mobile Trust Wallet deep link to prefill recipient address directly in app
 */
export const buildWalletDeepLink = (address = ADMIN_CRYPTO_WALLET_ADDRESS) => {
  return `https://link.trustwallet.com/send?address=${address}`;
};

export const buildTrustWalletDeepLink = buildWalletDeepLink;
