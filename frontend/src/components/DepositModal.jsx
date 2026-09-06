import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Copy,
  RefreshCw,
  Wallet,
  ExternalLink,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  Smartphone,
  Check,
  Info,
  ChevronDown,
  Sparkles,
  Radio,
  Search,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ethers } from 'ethers';
import { walletAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import {
  ADMIN_CRYPTO_WALLET_ADDRESS,
  SUPPORTED_CHAINS,
  ERC20_ABI,
  USDT_INR_RATE,
  buildCryptoEIP681Uri,
  buildWalletDeepLink,
} from '../config/cryptoConfig';

// ── MINIMUM LIMIT (Supports micro amounts e.g. 0.05, 0.5 USDT for low deposits) ──
export const MIN_DEPOSIT_AMOUNT_USDT = 0.0001;

export const DepositModal = ({ isOpen, onClose }) => {
  const { user, showToast, refreshUser, updateBalance } = useAuth();

  // Steps: 1: Amount & Network, 2: Scan QR & Auto-Detect, 3: Manual Verifying, 4: Confirmed & Credited
  const [step, setStep] = useState(1);
  const [usdtAmount, setUsdtAmount] = useState(1); // Default 1 USDT
  const [selectedChain, setSelectedChain] = useState('bsc'); // Default 'bsc' (BNB Smart Chain BEP-20)
  const [networkDropdownOpen, setNetworkDropdownOpen] = useState(false);
  const [qrFormat, setQrFormat] = useState('plain'); // 'plain' (0x...) is 100% compatible with all mobile cameras, or 'uri' (ethereum:0x...)
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [manualChecking, setManualChecking] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [txHash, setTxHash] = useState('');
  const [manualTxHash, setManualTxHash] = useState('');
  const [loading, setLoading] = useState(false);
  const [listeningStatus, setListeningStatus] = useState('Connecting to blockchain network...');
  const [verifiedTxData, setVerifiedTxData] = useState(null);
  const [isPaymentCredited, setIsPaymentCredited] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copiedAdminAddress, setCopiedAdminAddress] = useState(false);

  // Dedicated HD Deposit Address per User (EVM & TRON)
  const [myDepositAddress, setMyDepositAddress] = useState('');
  const [myTronDepositAddress, setMyTronDepositAddress] = useState('');
  const [myDepositIndex, setMyDepositIndex] = useState(null);
  const [fetchingAddress, setFetchingAddress] = useState(false);
  const [liveUsdtRate, setLiveUsdtRate] = useState(USDT_INR_RATE);
  const [networkSearchQuery, setNetworkSearchQuery] = useState('');

  const dropdownRef = useRef(null);

  // Close network dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setNetworkDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── ELAPSED TIMER FOR STEP 2 (Shows user active monitoring progress) ──
  useEffect(() => {
    if (!isOpen || step !== 2) {
      setElapsedSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, step]);

  // ── FETCH USER'S DEDICATED HD DEPOSIT ADDRESS ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchAddress = async () => {
      setFetchingAddress(true);
      try {
        const res = await walletAPI.getMyCryptoDepositAddress();
        if (isMounted && res) {
          if (res.depositAddress) {
            setMyDepositAddress(res.depositAddress);
            setMyDepositIndex(res.index);
          }
          if (res.tronDepositAddress) {
            setMyTronDepositAddress(res.tronDepositAddress);
          }
          if (res.usdtInrRate) {
            setLiveUsdtRate(res.usdtInrRate);
          }
        }
      } catch (err) {
        console.warn('[DepositModal] Failed to fetch personal HD address:', err.message);
      } finally {
        if (isMounted) setFetchingAddress(false);
      }
    };
    fetchAddress();
    return () => { isMounted = false; };
  }, [isOpen]);

  // ── REAL-TIME WEBSOCKET DEPOSIT APPROVAL LISTENER ─────────────────────────
  useEffect(() => {
    if (!isOpen || step === 4) return;
    const socket = getSocket();
    const currentUserId = user?.id || user?._id;

    const handleRealtimeDeposit = (data) => {
      console.log('[DepositModal] Real-time deposit_approved socket event received!', data);
      setIsPaymentCredited(true);
      if (data.newBalance !== undefined && updateBalance) {
        updateBalance(data.newBalance);
      }
      setVerifiedTxData({
        ...data,
        amountCredited: data.amount,
        amountUSDT: data.amountUSDT || usdtAmount,
        txHash: data.txHash,
        chain: data.chain,
        walletBalance: data.newBalance,
      });
      setStep(4);
      showToast(data.message || 'Payment Received & Credited in Real-Time via WebSockets!', 'success');
      if (refreshUser) refreshUser();
    };

    socket.on('deposit_approved', handleRealtimeDeposit);
    if (currentUserId) {
      socket.on(`deposit_approved_${currentUserId}`, handleRealtimeDeposit);
    }

    return () => {
      socket.off('deposit_approved', handleRealtimeDeposit);
      if (currentUserId) {
        socket.off(`deposit_approved_${currentUserId}`, handleRealtimeDeposit);
      }
    };
  }, [isOpen, step, user?.id, user?._id, updateBalance, refreshUser, showToast, usdtAmount]);

  // ── AUTOMATIC INCOMING PAYMENT POLLER (Runs while QR code is shown in Step 2) ──
  useEffect(() => {
    if (!isOpen || step !== 2) return;

    let isMounted = true;
    console.log('[DepositModal] Starting live blockchain deposit auto-detection poller for chain:', selectedChain);

    const pollInterval = setInterval(async () => {
      try {
        const res = await walletAPI.checkIncomingCryptoDeposit(selectedChain);
        if (res && res.credited && isMounted) {
          console.log('[DepositModal] Incoming payment automatically detected on-chain!', res);
          clearInterval(pollInterval);
          setIsPaymentCredited(true);
          if (res.walletBalance !== undefined && updateBalance) {
            updateBalance(res.walletBalance);
          }
          setVerifiedTxData(res);
          setStep(4);
          showToast(res.message || 'Payment Auto-Detected & Credited Successfully!', 'success');
          if (refreshUser) refreshUser();
        }
      } catch (err) {
        // Silently continue polling
      }
    }, 4000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [isOpen, step, selectedChain, refreshUser, updateBalance, showToast]);

  // ── MANUAL CHECK STATUS NOW (Instant on-demand check without waiting) ──
  const handleCheckStatusNow = async () => {
    setManualChecking(true);
    try {
      const res = await walletAPI.checkIncomingCryptoDeposit(selectedChain);
      if (res && res.credited) {
        setIsPaymentCredited(true);
        if (res.walletBalance !== undefined && updateBalance) {
          updateBalance(res.walletBalance);
        }
        setVerifiedTxData(res);
        setStep(4);
        showToast(res.message || 'Payment Confirmed & Credited Successfully!', 'success');
        if (refreshUser) await refreshUser();
      } else {
        showToast(res?.message || 'Scanning blockchain... Blocks take 15–30 seconds to confirm. Please keep this screen open!', 'info');
      }
    } catch (err) {
      showToast('Awaiting block confirmation. Please keep this screen open.', 'info');
    } finally {
      setManualChecking(false);
    }
  };

  // Helper to safely proceed to step 2 ensuring address is fetched
  const handleProceedToStep2 = async () => {
    if (!myDepositAddress || !myTronDepositAddress) {
      setFetchingAddress(true);
      try {
        const res = await walletAPI.getMyCryptoDepositAddress();
        if (res) {
          if (res.depositAddress) {
            setMyDepositAddress(res.depositAddress);
            setMyDepositIndex(res.index);
          }
          if (res.tronDepositAddress) {
            setMyTronDepositAddress(res.tronDepositAddress);
          }
          if (res.usdtInrRate) {
            setLiveUsdtRate(res.usdtInrRate);
          }
        }
      } catch (err) {
        console.warn('[DepositModal] Failed to ensure personal HD address:', err.message);
      } finally {
        setFetchingAddress(false);
      }
    }
    setStep(2);
  };

  // Close & refresh user balance on success without breaking session with hard reload
  const handleDoneAndRefresh = async () => {
    try {
      onClose();
      resetModal();
      if (refreshUser) {
        await refreshUser();
      }
    } catch (e) {
      console.warn('[DepositModal] Error refreshing user on close:', e.message);
    }
  };

  // Smart close handler: prompts if payment is pending, closes & updates if payment was credited
  const handleCloseModal = () => {
    if (isPaymentCredited || step === 4 || verifiedTxData) {
      handleDoneAndRefresh();
      return;
    }

    if ((step === 2 && elapsedSeconds >= 5) || step === 3) {
      setShowCloseConfirm(true);
      return;
    }

    resetModal();
  };

  // Reset modal state
  const resetModal = () => {
    if (isPaymentCredited || step === 4 || verifiedTxData) {
      handleDoneAndRefresh();
      return;
    }
    setStep(1);
    setUsdtAmount(1);
    setSelectedChain('bsc');
    setNetworkDropdownOpen(false);
    setWalletAddress('');
    setTxHash('');
    setManualTxHash('');
    setVerifiedTxData(null);
    setIsPaymentCredited(false);
    setShowCloseConfirm(false);
    setShowHelpModal(false);
    if (refreshUser) refreshUser();
    onClose();
  };

  // Automatic safeguard: if modal unmounts after deposit was completed, reload to sync balance everywhere
  useEffect(() => {
    if (!isOpen && isPaymentCredited) {
      window.location.reload();
    }
  }, [isOpen, isPaymentCredited]);

  if (!isOpen) return null;

  const currentChain = SUPPORTED_CHAINS[selectedChain] || SUPPORTED_CHAINS.bsc;
  const isTron = currentChain?.isTron || selectedChain === 'tron';
  const activeDepositAddress = isTron
    ? (myTronDepositAddress || 'TNCMadKceLTooNwUnveB18KDYSuCK2uhyX')
    : (myDepositAddress || ADMIN_CRYPTO_WALLET_ADDRESS);
  const numUSDT = Number(usdtAmount || 0);
  const rawInr = numUSDT * liveUsdtRate;
  const inrConverted = rawInr < 1 && rawInr > 0 ? rawInr.toFixed(2) : Math.round(rawInr).toLocaleString('en-IN');
  const eip681QrUri = isTron
    ? activeDepositAddress
    : (currentChain.chainId && currentChain.chainId !== 1
      ? `ethereum:${activeDepositAddress}@${currentChain.chainId}`
      : `ethereum:${activeDepositAddress}`);
  const walletDeepLink = isTron
    ? `https://link.trustwallet.com/send?address=${activeDepositAddress}`
    : buildWalletDeepLink(activeDepositAddress);

  // Helper to get formatted QR code string
  const getQrValue = () => {
    if (isTron) {
      return activeDepositAddress;
    }
    if (qrFormat === 'uri') {
      return eip681QrUri;
    }
    return activeDepositAddress;
  };

  // ── COPY HELPER ─────────────────────────────────────────────────────────────
  const handleCopyDepositAddress = () => {
    navigator.clipboard.writeText(activeDepositAddress);
    setCopiedAdminAddress(true);
    setTimeout(() => setCopiedAdminAddress(false), 2000);
  };

  // ── DIRECT BROWSER EXTENSION / INJECTED WEB3 TRANSFER ───────────────────────
  const handleConnectAndTransferWeb3 = async () => {
    const num = Number(usdtAmount);
    if (!num || num < MIN_DEPOSIT_AMOUNT_USDT) {
      showToast(`Minimum deposit is ${MIN_DEPOSIT_AMOUNT_USDT} USDT`, 'error');
      return;
    }

    if (isTron) {
      setStep(2);
      showToast('For TRON (TRC-20), please scan the QR code using your exchange (Binance, CoinDCX) or Trust Wallet!', 'info');
      return;
    }

    if (!window.ethereum) {
      setStep(2);
      showToast('Scan the QR code below using your crypto wallet app!', 'info');
      return;
    }

    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      if (!accounts || accounts.length === 0) {
        throw new Error('No account authorized in wallet');
      }
      setWalletAddress(accounts[0]);

      // Check / switch blockchain network
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== currentChain.chainId) {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: currentChain.chainIdHex }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: currentChain.chainIdHex,
                  chainName: currentChain.name,
                  nativeCurrency: currentChain.nativeCurrency,
                  rpcUrls: currentChain.rpcUrls,
                  blockExplorerUrls: [currentChain.explorerUrl],
                },
              ],
            });
          } else {
            throw switchError;
          }
        }
      }

      const signer = await provider.getSigner();
      const usdtContract = new ethers.Contract(currentChain.usdtContract, ERC20_ABI, signer);
      const rawUnits = ethers.parseUnits(num.toString(), currentChain.usdtDecimals);

      showToast(`Please confirm the ${num} USDT transfer in your wallet...`, 'info');

      const tx = await usdtContract.transfer(activeDepositAddress, rawUnits);
      setTxHash(tx.hash);
      setStep(3);
      setListeningStatus(`Transaction broadcasted: ${tx.hash.slice(0, 10)}... Listening for on-chain confirmation...`);

      // Wait for confirmation
      await tx.wait(1);
      setListeningStatus('Blockchain confirmation received! Verifying and crediting wallet...');

      await handleVerifyOnChainTx(tx.hash, selectedChain);
    } catch (err) {
      console.error('[Web3 Transfer Error]', err);
      showToast(err.reason || err.message || 'Wallet interaction cancelled or failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── ON-CHAIN TX VERIFICATION ────────────────────────────────────────────────
  const handleVerifyOnChainTx = async (hashToVerify, chainKey = selectedChain) => {
    const cleanHash = (hashToVerify || manualTxHash || '').trim();
    if (!cleanHash || !cleanHash.startsWith('0x') || cleanHash.length !== 66) {
      showToast('Please enter a valid 66-character transaction hash starting with 0x', 'error');
      return;
    }

    setLoading(true);
    setStep(3);
    setListeningStatus('Querying blockchain RPC nodes and ledger confirmation across all networks...');

    try {
      const res = await walletAPI.verifyCryptoDeposit({
        txHash: cleanHash,
        chain: chainKey,
      });

      setIsPaymentCredited(true);
      if (res.walletBalance !== undefined && updateBalance) {
        updateBalance(res.walletBalance);
      }
      setVerifiedTxData(res);
      setStep(4);
      showToast(res.message || 'Deposit Verified & Credited Successfully!', 'success');
      if (refreshUser) await refreshUser();
    } catch (err) {
      console.error('[Verification Failed]', err);
      showToast(err.message || 'Verification failed. Please check TxHash.', 'error');
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#151a23] via-[#0f131a] to-[#0a0d13] border border-[#263147] rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl text-white max-h-[94dvh] sm:max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── CONFIRM CLOSE WARNING MODAL (PREVENTS ACCIDENTAL EXIT DURING 15-30s CONFIRMATION) ── */}
        {showCloseConfirm && (
          <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col items-center justify-center text-center space-y-3 sm:space-y-4 animate-fadeIn">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-500/20 text-amber-400 border-2 border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Info className="w-7 h-7 sm:w-9 sm:h-9" />
            </div>
            <div className="space-y-1.5 sm:space-y-2">
              <h4 className="text-base sm:text-lg font-black text-white">Payment Still Confirming on Blockchain!</h4>
              <p className="text-xs text-gray-300 max-w-sm leading-relaxed">
                If you have already sent crypto from your wallet, please <strong>keep this screen open</strong>. Blockchain blocks take roughly <strong>15–30 seconds</strong> to confirm.
              </p>
              <p className="text-[11px] text-amber-400/90 font-mono">
                Your wallet balance will be credited automatically once the block is mined!
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-2.5 w-full max-w-xs pt-1 sm:pt-2">
              <button
                type="button"
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-2.5 sm:py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs rounded-xl transition shadow-lg cursor-pointer"
              >
                Keep Screen Open (Wait)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCloseConfirm(false);
                  resetModal();
                }}
                className="py-2.5 sm:py-3 px-4 bg-gray-800/80 hover:bg-gray-700 text-gray-300 font-bold text-xs rounded-xl transition border border-gray-700 cursor-pointer"
              >
                Close Anyway
              </button>
            </div>
          </div>
        )}

        {/* ── HOW TO MAKE PAYMENT POPUP MODAL ── */}
        {showHelpModal && (
          <div className="absolute inset-0 z-50 bg-black/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 flex flex-col justify-between text-left space-y-3 sm:space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-[#232b3b] pb-2.5 sm:pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                <h4 className="text-sm sm:text-base font-black text-white">
                  {isTron ? 'How to Deposit via TRON (TRC-20)' : 'How to Scan & Pay via Wallet'}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 sm:space-y-3 pr-1 custom-scrollbar text-xs text-gray-300 leading-relaxed">
              {isTron ? (
                <ol className="space-y-2 sm:space-y-2.5 pl-4 list-decimal">
                  <li>Open <strong>CoinDCX, Binance, WazirX, SunCrypto</strong>, or <strong>Trust Wallet</strong>.</li>
                  <li>Go to <strong>Withdraw / Send USDT</strong> and select network <strong>TRON (TRC-20)</strong>.</li>
                  <li>Scan the QR code displayed on the screen, or copy your personal deposit address (starts with <strong>T</strong>).</li>
                  <li>Enter the USDT amount and confirm withdrawal.</li>
                  <li>Your balance updates automatically within seconds once broadcasted!</li>
                </ol>
              ) : (
                <ol className="space-y-2 sm:space-y-2.5 pl-4 list-decimal">
                  <li>Open <strong>Trust Wallet</strong>, <strong>MetaMask</strong>, or any crypto wallet on your phone.</li>
                  <li>Select USDT on <strong>{currentChain.name}</strong>.</li>
                  <li>Tap <strong>Send</strong>.</li>
                  <li>Tap the <strong>Camera / Scan icon</strong> inside the <em>Recipient Address</em> box.</li>
                  <li>Point camera at this QR code — deposit address is pasted instantly with zero errors!</li>
                  <li>Confirm the transfer. Your balance will be credited automatically.</li>
                </ol>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 sm:py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-black text-xs rounded-xl transition shadow-lg cursor-pointer"
            >
              Got It, Back to QR Code
            </button>
          </div>
        )}

        {/* ── HEADER ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-[#232b3b] pb-2.5 sm:pb-3 mb-3 sm:mb-4 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20 shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5 font-black" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-lg font-black text-white font-sans flex items-center gap-1.5 sm:gap-2 truncate">
                <span>USDT Deposit</span>
                <span className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40">
                  AUTO-CREDIT
                </span>
              </h3>
              <p className="text-[11px] sm:text-xs text-gray-400 truncate">Instant Balance Update</p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 sm:p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800/80 transition cursor-pointer shrink-0 ml-2"
            title="Close"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* ── SCROLLABLE BODY ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-0.5 custom-scrollbar">

          {/* ════ STEP 1: AMOUNT INPUT & NETWORK SELECTION ════ */}
          {step === 1 && (
            <div className="space-y-3.5 sm:space-y-4">
              {/* Amount Input */}
              <div>
                <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                  <label className="text-[11px] sm:text-xs font-bold text-gray-300">
                    Enter Deposit Amount (USDT)
                  </label>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <span className="text-[10px] text-gray-300 font-medium flex items-center gap-1 sm:gap-1.5 bg-white/5 px-1.5 sm:px-2 py-0.5 rounded-lg border border-gray-800 shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Live: 1 USDT ≈ ₹{liveUsdtRate}
                    </span>
                    <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400">
                      = ₹{inrConverted} Credits
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-1.5 font-mono font-bold text-amber-400">
                    <span className="text-sm sm:text-base">₮</span>
                    <span className="text-xs text-gray-400 border-r border-gray-700 pr-1.5 sm:pr-2">USDT</span>
                  </div>
                  <input
                    type="number"
                    min={MIN_DEPOSIT_AMOUNT_USDT}
                    step="any"
                    placeholder="10"
                    value={usdtAmount}
                    onChange={(e) => setUsdtAmount(e.target.value)}
                    className="w-full bg-[#090d14] border border-[#263147] focus:border-amber-500 rounded-xl sm:rounded-2xl py-2.5 sm:py-3 pl-16 sm:pl-20 pr-3 sm:pr-4 text-lg sm:text-xl font-mono font-black text-white outline-none transition"
                  />
                </div>
              </div>

              {/* Preset Amount Chips */}
              <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
                {[1, 5, 10, 25].map((preset) => (
                  <button
                    type="button"
                    key={preset}
                    onClick={() => setUsdtAmount(preset)}
                    className={`py-1.5 sm:py-2 rounded-xl text-xs font-mono font-bold border transition cursor-pointer ${Number(usdtAmount) === preset
                        ? 'border-amber-500 bg-amber-500/20 text-amber-400 shadow-md shadow-amber-500/10'
                        : 'border-[#232b3b] bg-[#0b0e14] text-gray-300 hover:border-gray-600'
                      }`}
                  >
                    {preset} USDT
                  </button>
                ))}
              </div>

              {/* Blockchain Network Selector (Custom Web3 Dropdown) */}
              <div className="space-y-1.5 relative" ref={dropdownRef}>
                <label className="text-[11px] sm:text-xs font-bold text-gray-300 flex items-center justify-between">
                  <span>Select Blockchain Network</span>
                  <span className="text-[10px] text-amber-400 font-normal">Compatible with all wallets</span>
                </label>

                {/* Dropdown Trigger Button */}
                <button
                  type="button"
                  onClick={() => setNetworkDropdownOpen(!networkDropdownOpen)}
                  className="w-full bg-[#090d14] border border-[#263147] hover:border-amber-500/60 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center justify-between text-left transition cursor-pointer shadow-md"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    {currentChain.logoUrl ? (
                      <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-[#141b27] border border-[#2e3b52] flex items-center justify-center p-1 sm:p-1.5 shrink-0 shadow-inner">
                        <img
                          src={currentChain.logoUrl}
                          alt={currentChain.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <span className="text-xl sm:text-2xl">{currentChain.icon || '⚡'}</span>
                    )}
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                        <span>{currentChain.shortName}</span>
                        {currentChain.isTron && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                            TRC-20
                          </span>
                        )}
                        {currentChain.isTestnet && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                            TESTNET
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-amber-400/90 font-mono mt-0.5 truncate">{currentChain.tag}</div>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-400 transition-transform duration-200 shrink-0 ml-1 ${networkDropdownOpen ? 'rotate-180 text-amber-400' : ''
                      }`}
                  />
                </button>

                {/* Dropdown Options Menu */}
                {networkDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-2 z-40 bg-[#0d121c] border border-[#2a364f] rounded-2xl shadow-2xl backdrop-blur-xl animate-fadeIn overflow-hidden flex flex-col max-h-60 sm:max-h-80">
                    {/* Fixed Search Bar Header (Never scrolls, solid background) */}
                    <div className="p-2 sm:p-2.5 bg-[#0d121c] border-b border-[#2a364f]/80 shrink-0">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          placeholder="Search 'Tron', 'Polygon', 'Base', 'Scroll'..."
                          value={networkSearchQuery}
                          onChange={(e) => setNetworkSearchQuery(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full bg-[#141b27] border border-[#2a364f] rounded-xl pl-8 pr-7 py-1.5 sm:py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/80 transition"
                        />
                        {networkSearchQuery && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNetworkSearchQuery('');
                            }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Scrollable Network List */}
                    <div className="p-1.5 overflow-y-auto custom-scrollbar space-y-1 flex-1">
                      {Object.values(SUPPORTED_CHAINS)
                        .filter((ch) => {
                          if (!networkSearchQuery.trim()) return true;
                          const q = networkSearchQuery.toLowerCase().trim();
                          return (
                            ch.name.toLowerCase().includes(q) ||
                            ch.shortName.toLowerCase().includes(q) ||
                            (ch.tag && ch.tag.toLowerCase().includes(q)) ||
                            ch.id.toLowerCase().includes(q) ||
                            (ch.nativeCurrency?.symbol && ch.nativeCurrency.symbol.toLowerCase().includes(q))
                          );
                        })
                        .map((ch) => {
                          const isSelected = selectedChain === ch.id;
                          return (
                            <button
                              type="button"
                              key={ch.id}
                              onClick={() => {
                                setSelectedChain(ch.id);
                                setNetworkDropdownOpen(false);
                                setNetworkSearchQuery('');
                              }}
                              className={`w-full p-2 sm:p-2.5 rounded-xl text-left flex items-center justify-between transition cursor-pointer ${isSelected
                                  ? 'bg-amber-500/15 border border-amber-500/40 text-white'
                                  : 'hover:bg-white/5 border border-transparent text-gray-300'
                                }`}
                            >
                              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                {ch.logoUrl ? (
                                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#141b27] border border-[#2e3b52] flex items-center justify-center p-1 shrink-0 shadow-sm">
                                    <img
                                      src={ch.logoUrl}
                                      alt={ch.name}
                                      className="w-full h-full object-contain"
                                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                  </div>
                                ) : (
                                  <span className="text-lg sm:text-xl">{ch.icon || '⚡'}</span>
                                )}
                                <div className="min-w-0">
                                  <div className="text-xs font-bold truncate flex items-center gap-1.5">
                                    <span>{ch.shortName}</span>
                                    {ch.isTron && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 border border-red-500/30">
                                        TRC-20
                                      </span>
                                    )}
                                    {ch.isTestnet && (
                                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-pink-500/20 text-pink-300 border border-pink-500/30">
                                        DEV
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-gray-400 font-mono truncate">{ch.tag}</div>
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0 ml-1" />}
                            </button>
                          );
                        })}

                      {Object.values(SUPPORTED_CHAINS).filter((ch) => {
                        if (!networkSearchQuery.trim()) return true;
                        const q = networkSearchQuery.toLowerCase().trim();
                        return (
                          ch.name.toLowerCase().includes(q) ||
                          ch.shortName.toLowerCase().includes(q) ||
                          (ch.tag && ch.tag.toLowerCase().includes(q)) ||
                          ch.id.toLowerCase().includes(q) ||
                          (ch.nativeCurrency?.symbol && ch.nativeCurrency.symbol.toLowerCase().includes(q))
                        );
                      }).length === 0 && (
                        <div className="p-4 text-center text-xs text-gray-400">
                          No blockchain networks found matching "{networkSearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Personal Dedicated HD Receiving Address Card */}
              <div className="bg-[#090d14] border border-[#232b3b] rounded-xl sm:rounded-2xl p-2.5 sm:p-3 space-y-1 sm:space-y-1.5">
                <div className="flex items-center justify-between text-[11px] flex-wrap gap-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">
                      Your {isTron ? 'TRON (TRC-20)' : 'EVM'} Deposit Address:
                    </span>
                    {myDepositIndex !== null && (
                      <span className="text-[9px] sm:text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Acc #{myDepositIndex}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDepositAddress}
                    className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer ml-auto"
                  >
                    {copiedAdminAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAdminAddress ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
                <div className="font-mono text-[11px] sm:text-xs text-gray-200 break-all bg-black/40 p-2 rounded-xl border border-gray-800/80">
                  {fetchingAddress ? (
                    <span className="text-gray-500 text-xs italic">Allocating dedicated address...</span>
                  ) : (
                    activeDepositAddress
                  )}
                </div>
              </div>

              {/* Notice */}
              <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[11px] sm:text-xs text-amber-300 leading-relaxed">
                <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  {isTron
                    ? <>Send USDT (TRC-20) from <strong>CoinDCX, Binance, WazirX, SunCrypto</strong> or Trust Wallet. Your permanent Tron address begins with <strong>T</strong>.</>
                    : <>Send USDT via <strong>{currentChain.name}</strong> or scan the QR code from any wallet.</>}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleProceedToStep2}
                  disabled={loading || !usdtAmount || Number(usdtAmount) < MIN_DEPOSIT_AMOUNT_USDT}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-black py-3 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-xl shadow-amber-500/20 transition flex items-center justify-center gap-2 text-xs sm:text-sm cursor-pointer disabled:opacity-50 active:scale-[0.98]"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Proceed to Scan QR Code ({usdtAmount} USDT)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                {window.ethereum && (
                  <button
                    type="button"
                    onClick={handleConnectAndTransferWeb3}
                    disabled={loading}
                    className="w-full bg-[#1b2230] hover:bg-[#253045] text-amber-300 border border-amber-500/40 font-bold py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>1-Click Pay with Wallet Extension</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ════ STEP 2: QR CODE SCANNER & AUTO-DETECTION ════ */}
          {step === 2 && (
            <div className="space-y-3 sm:space-y-4 text-center">

              {/* ⚠️ HIGH-VISIBILITY WARNING & TIMER BANNER */}
              <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl sm:rounded-2xl p-2.5 sm:p-3 flex items-center justify-between text-left shadow-md">
                <div className="flex items-center gap-2 sm:gap-2.5">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
                  </span>
                  <span className="text-xs sm:text-sm font-bold text-amber-300 tracking-wide">
                    ⚠️ Do Not Close Screen or Refresh
                  </span>
                </div>
                <span className="text-[11px] sm:text-xs font-mono font-bold text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 sm:px-2.5 py-0.5 rounded-full">
                  ⏱️ {elapsedSeconds}s
                </span>
              </div>

              {/* Dynamic QR Code Card */}
              <div className="bg-[#090d14] border border-[#263147] rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-3 sm:space-y-3.5 shadow-xl">
                <div className="text-center space-y-1">
                  <span className="text-[10px] sm:text-xs font-bold text-gray-300 uppercase tracking-wider">
                    Scan With Any Crypto Wallet
                  </span>
                  <div className="text-sm sm:text-base font-black text-amber-400 font-mono flex items-center justify-center gap-2 flex-wrap">
                    {currentChain.logoUrl && (
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-[#141b27] border border-[#2e3b52] p-0.5 sm:p-1 flex items-center justify-center shrink-0 shadow-sm">
                        <img
                          src={currentChain.logoUrl}
                          alt={currentChain.name}
                          className="w-full h-full object-contain"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                    )}
                    <span>Send {usdtAmount} USDT on {currentChain.name}</span>
                  </div>
                  <div className="text-[11px] sm:text-xs text-emerald-400 font-mono font-bold flex items-center justify-center gap-1.5">
                    <span>≈ ₹{inrConverted} INR</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-400 font-normal">(@ Live ₹{liveUsdtRate}/USDT)</span>
                  </div>

                  {/* QR Code Format Switcher (Shown for EVM chains) */}
                  {!isTron && (
                    <div className="flex items-center justify-center p-0.5 sm:p-1 bg-[#0b0e14] border border-[#232b3b] rounded-xl max-w-sm mx-auto gap-1 text-[10px] sm:text-[11px] mt-1">
                      <button
                        type="button"
                        onClick={() => setQrFormat('plain')}
                        className={`flex-1 py-1 sm:py-1.5 px-2 rounded-lg font-bold transition cursor-pointer truncate ${
                          qrFormat === 'plain'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        ✨ Universal Address
                      </button>
                      <button
                        type="button"
                        onClick={() => setQrFormat('uri')}
                        className={`flex-1 py-1 sm:py-1.5 px-2 rounded-lg font-bold transition cursor-pointer truncate ${
                          qrFormat === 'uri'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        📲 Mobile App URI
                      </button>
                    </div>
                  )}
                </div>

                {/* QR Code Container */}
                <div className="inline-block p-3 sm:p-4 bg-white rounded-2xl sm:rounded-3xl shadow-2xl border-2 sm:border-4 border-amber-500/40 max-w-full">
                  <QRCodeSVG
                    value={getQrValue()}
                    size={175}
                    level="M"
                    includeMargin={false}
                    className="w-36 h-36 sm:w-48 sm:h-48 max-w-full"
                  />
                </div>

                {/* How to Make Payment Pop-up Trigger */}
                <div>
                  <button
                    type="button"
                    onClick={() => setShowHelpModal(true)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center justify-center gap-1.5 py-1.5 px-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition cursor-pointer shadow-sm active:scale-98"
                  >
                    <Info className="w-3.5 h-3.5 text-amber-400" />
                    <span>How to make payment?</span>
                  </button>
                </div>

                {/* Deposit Address Quick Display & Copy */}
                <div className="flex items-center justify-between bg-black/50 border border-gray-800 rounded-xl sm:rounded-2xl px-2.5 sm:px-3 py-2 text-left">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="text-[9px] sm:text-[10px] text-gray-400 font-medium flex items-center gap-1 sm:gap-1.5 flex-wrap">
                      <span>Personal {isTron ? 'TRON (TRC-20)' : 'EVM'} Address:</span>
                      {myDepositIndex !== null && (
                        <span className="text-[8px] sm:text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Acc #{myDepositIndex}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] sm:text-xs text-amber-300 truncate">{activeDepositAddress}</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyDepositAddress}
                    className="px-2.5 sm:px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-bold text-xs rounded-xl flex items-center gap-1 sm:gap-1.5 transition cursor-pointer shrink-0"
                  >
                    {copiedAdminAddress ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedAdminAddress ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Mobile Deep Link & Quick Action */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5 sm:pt-1">
                  <a
                    href={walletDeepLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2 sm:py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow cursor-pointer"
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Open in Wallet App</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>

                  <button
                    type="button"
                    onClick={handleConnectAndTransferWeb3}
                    disabled={loading}
                    className="py-2 sm:py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>1-Click Extension Pay</span>
                  </button>
                </div>
              </div>

              {/* Instant TxHash Auto-Paste Submission */}
              <div className="bg-[#0b0e14] border border-[#232b3b] rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 space-y-2 text-left">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Optional: Instant TxHash Verification</span>
                  </label>
                  <span className="text-[9px] sm:text-[10px] text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
                    Instant 1-Second Credit
                  </span>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Paste TxHash (0x...)"
                    value={manualTxHash}
                    onChange={(e) => {
                      const val = e.target.value;
                      setManualTxHash(val);
                      const clean = val.trim();
                      if (clean.startsWith('0x') && clean.length === 66 && !loading) {
                        handleVerifyOnChainTx(clean);
                      }
                    }}
                    className="flex-1 min-w-0 bg-[#05070a] border border-[#263147] focus:border-amber-500 rounded-xl py-2 px-2.5 sm:px-3 text-xs font-mono text-amber-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleVerifyOnChainTx(manualTxHash)}
                    disabled={loading || !manualTxHash}
                    className="px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Verify Now'}
                  </button>
                </div>
              </div>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-xs text-gray-400 hover:text-white font-bold transition flex items-center justify-center gap-1 mx-auto cursor-pointer py-1"
              >
                <span>&larr; Change Amount or Network</span>
              </button>
            </div>
          )}

          {/* ════ STEP 3: LISTENING ON-CHAIN & VERIFYING ════ */}
          {step === 3 && (
            <div className="py-6 sm:py-8 text-center space-y-4 sm:space-y-5">
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20 animate-ping" />
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/15 border-2 border-amber-500 rounded-full flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/20">
                  <RefreshCw className="w-8 h-8 sm:w-10 sm:h-10 animate-spin" />
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-black text-white">Verifying Blockchain Confirmation</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto font-mono">
                  {listeningStatus}
                </p>
              </div>

              {txHash && (
                <div className="bg-[#0b0e14] p-3 rounded-xl sm:rounded-2xl border border-[#232b3b] text-xs font-mono text-gray-300 max-w-md mx-auto space-y-1">
                  <div className="text-[10px] text-gray-500 uppercase">TxHash Broadcasted</div>
                  <div className="text-amber-400 truncate font-bold">{txHash}</div>
                  <a
                    href={`${currentChain.explorerUrl}/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-[11px] flex items-center justify-center gap-1 pt-1"
                  >
                    <span>View on {currentChain.name} Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ════ STEP 4: CONFIRMED & CREDITED ════ */}
          {step === 4 && (
            <div className="text-center py-4 sm:py-6 space-y-3 sm:space-y-4 animate-fadeIn">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500 shadow-xl shadow-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg sm:text-xl font-black text-white flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                  <span>Payment Successful!</span>
                </h4>
                <p className="text-xs text-gray-300">
                  Successfully received{' '}
                  <strong className="text-amber-400 font-mono font-bold">
                    {verifiedTxData?.amountUSDT || usdtAmount} USDT
                  </strong>{' '}
                  on blockchain.
                </p>
              </div>

              <div className="p-3.5 sm:p-4 bg-gradient-to-tr from-emerald-950/40 to-[#0b0e14] border border-emerald-500/40 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs space-y-2 text-left font-mono">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <span className="text-gray-400">Wallet Credited:</span>
                  <span className="text-sm sm:text-base font-black text-emerald-400 font-mono">
                    +₹{(verifiedTxData?.amountCredited || inrConverted).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Current Balance:</span>
                  <span className="text-amber-300 font-bold">
                    ₹{(user?.walletBalance !== undefined ? user.walletBalance : verifiedTxData?.walletBalance || 0).toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Blockchain Network:</span>
                  <span className="text-white font-bold">{verifiedTxData?.chain || currentChain.name}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Tx Hash:</span>
                  <a
                    href={`${currentChain.explorerUrl}/tx/${verifiedTxData?.txHash || txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline flex items-center gap-1 max-w-[140px] sm:max-w-[200px] truncate"
                  >
                    <span className="truncate">{verifiedTxData?.txHash || txHash}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              <button
                type="button"
                onClick={handleDoneAndRefresh}
                className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-black py-3 sm:py-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-black" />
                <span>Done • Start Playing</span>
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

