import crypto from 'crypto';
import { ethers } from 'ethers';
import { User } from '../models/User.js';
import { Counter } from '../models/Counter.js';

let cachedBaseNode = null;
let cachedBaseTronNode = null;

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

/**
 * Encodes a buffer/hex string using standard Base58Check encoding with 4-byte double-SHA256 checksum
 */
export const toBase58Check = (hexWithoutChecksum) => {
  const payload = Buffer.from(hexWithoutChecksum.replace(/^0x/, ''), 'hex');
  const hash1 = crypto.createHash('sha256').update(payload).digest();
  const hash2 = crypto.createHash('sha256').update(hash1).digest();
  const checksum = hash2.subarray(0, 4);
  const bytes = Buffer.concat([payload, checksum]);

  const digits = [0];
  for (let i = 0; i < bytes.length; i++) {
    for (let j = 0; j < digits.length; j++) digits[j] <<= 8;
    digits[0] += bytes[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  for (let i = 0; i < bytes.length && bytes[i] === 0; i++) digits.push(0);
  return digits.reverse().map((d) => BASE58_ALPHABET[d]).join('');
};

/**
 * Cleans and sanitizes a 12- or 24-word BIP-39 mnemonic phrase.
 * Strips quotes, dots/periods, special symbols, and collapses whitespace.
 */
export const cleanMnemonic = (raw) => {
  if (!raw) return '';
  return raw
    .replace(/["']/g, '')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .join(' ')
    .toLowerCase();
};

/**
 * Returns the cached BIP-44 base HD Node at path m/44'/60'/0'/0 for EVM
 */
export const getBaseHDNode = () => {
  if (cachedBaseNode) return cachedBaseNode;

  const raw = process.env.MASTER_WALLET_MNEMONIC || '';
  const mnemonic = cleanMnemonic(raw);
  if (!mnemonic) {
    throw new Error('MASTER_WALLET_MNEMONIC is not configured in backend environment.');
  }

  // Standard EVM Account Node: m/44'/60'/0'/0
  cachedBaseNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/60'/0'/0");
  return cachedBaseNode;
};

/**
 * Returns the cached BIP-44 base HD Node at path m/44'/195'/0'/0 for TRON
 */
export const getBaseTronHDNode = () => {
  if (cachedBaseTronNode) return cachedBaseTronNode;

  const raw = process.env.MASTER_WALLET_MNEMONIC || '';
  const mnemonic = cleanMnemonic(raw);
  if (!mnemonic) {
    throw new Error('MASTER_WALLET_MNEMONIC is not configured in backend environment.');
  }

  // Standard TRON BIP-44 Account Node: m/44'/195'/0'/0
  cachedBaseTronNode = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, "m/44'/195'/0'/0");
  return cachedBaseTronNode;
};

/**
 * Derives a deterministic EVM deposit address for a specific sequential user index
 * Path: m/44'/60'/0'/0/{index}
 *
 * @param {number} index - Sequential non-negative integer
 * @returns {{ address: string, checksumAddress: string, index: number }}
 */
export const deriveUserDepositAddress = (index) => {
  const base = getBaseHDNode();
  const child = base.deriveChild(index);
  return {
    address: child.address.toLowerCase(),
    checksumAddress: child.address,
    index,
  };
};

/**
 * Derives a deterministic TRON deposit address (T...) for a specific sequential user index
 * Path: m/44'/195'/0'/0/{index}
 *
 * @param {number} index - Sequential non-negative integer
 * @returns {{ address: string, hexAddress: string, index: number }}
 */
export const deriveUserTronAddress = (index) => {
  const base = getBaseTronHDNode();
  const child = base.deriveChild(index);

  // Uncompressed public key (0x04 + 64 bytes)
  const signingKey = new ethers.SigningKey(child.privateKey);
  const uncompressedPub = signingKey.publicKey;
  const pubBytes = ethers.getBytes('0x' + uncompressedPub.slice(4));

  // keccak256 hash
  const hash = ethers.keccak256(pubBytes);

  // Prefix 0x41 + last 20 bytes (last 40 hex chars)
  const hexAddress = '41' + hash.slice(-40);
  const address = toBase58Check(hexAddress);

  return {
    address,
    hexAddress: '0x' + hash.slice(-40),
    index,
  };
};

/**
 * Returns the private key for a child address (internal server use only for admin sweeping)
 */
export const deriveUserPrivateKey = (index) => {
  const base = getBaseHDNode();
  const child = base.deriveChild(index);
  return child.privateKey;
};

/**
 * Returns the Tron private key for a child address (internal server use only for admin sweeping)
 */
export const deriveUserTronPrivateKey = (index) => {
  const base = getBaseTronHDNode();
  const child = base.deriveChild(index);
  return child.privateKey;
};

/**
 * Retrieves the user's permanent deposit addresses (EVM and TRON), or atomically allocates the next sequential
 * index and stores both permanently on the user document in MongoDB.
 *
 * @param {string|Object} userOrId - Mongoose User document or User ID
 * @returns {Promise<{ address: string, checksumAddress: string, tronAddress: string, index: number }>}
 */
export const getOrCreateUserDepositAddress = async (userOrId) => {
  let user = typeof userOrId === 'string' ? await User.findById(userOrId) : userOrId;
  if (!user) {
    throw new Error('User not found');
  }

  // If user already has both allocated addresses, return immediately
  if (user.cryptoDepositAddress && user.tronDepositAddress && user.cryptoDepositIndex !== undefined) {
    return {
      address: user.cryptoDepositAddress.toLowerCase(),
      checksumAddress: ethers.getAddress(user.cryptoDepositAddress),
      tronAddress: user.tronDepositAddress,
      index: user.cryptoDepositIndex,
    };
  }

  let allocatedIndex = user.cryptoDepositIndex;

  // If user had an index previously but missing tronDepositAddress (legacy migration)
  if (allocatedIndex !== undefined && allocatedIndex !== null) {
    const tronDerived = deriveUserTronAddress(allocatedIndex);
    user.tronDepositAddress = tronDerived.address;
    if (!user.cryptoDepositAddress) {
      const evmDerived = deriveUserDepositAddress(allocatedIndex);
      user.cryptoDepositAddress = evmDerived.address;
    }
    await user.save();
    return {
      address: user.cryptoDepositAddress.toLowerCase(),
      checksumAddress: ethers.getAddress(user.cryptoDepositAddress),
      tronAddress: user.tronDepositAddress,
      index: allocatedIndex,
    };
  }

  // Atomically allocate the next sequential index using Counter
  const counter = await Counter.findByIdAndUpdate(
    'crypto_deposit_index',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  allocatedIndex = counter.seq;
  const evmDerived = deriveUserDepositAddress(allocatedIndex);
  const tronDerived = deriveUserTronAddress(allocatedIndex);

  user.cryptoDepositIndex = allocatedIndex;
  user.cryptoDepositAddress = evmDerived.address;
  user.tronDepositAddress = tronDerived.address;
  await user.save();

  console.log(`[HD Wallet] Allocated dedicated deposit addresses for user ${user.username || user._id}: EVM ${evmDerived.address}, TRON ${tronDerived.address} (Index #${allocatedIndex})`);

  return {
    address: evmDerived.address,
    checksumAddress: evmDerived.checksumAddress,
    tronAddress: tronDerived.address,
    index: allocatedIndex,
  };
};
