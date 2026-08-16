import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, Search, Cpu, Hash } from 'lucide-react';
import { gameAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export const ProvablyFairModal = ({ isOpen, onClose }) => {
  const { user, showToast } = useAuth();
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState(user?.clientSeed || 'bhagya_client_seed_default');
  const [nonce, setNonce] = useState(101);
  const [gameType, setGameType] = useState('AVIATOR');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!serverSeed.trim()) {
      showToast('Please enter the unrevealed Server Seed', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await gameAPI.verifySeed({
        serverSeed: serverSeed.trim(),
        clientSeed: clientSeed.trim(),
        nonce: Number(nonce),
        gameType,
      });
      setResult(res.verification);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-[#151a23] border border-[#232b3b] rounded-2xl p-6 shadow-2xl text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#232b3b] pb-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-sans">Provably Fair SHA-256 Verifier</h3>
              <p className="text-xs text-gray-400">Verify 100% Cryptographic Randomness</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explanation Card */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-300 mb-4 space-y-1">
          <p><strong>How Provably Fair Works:</strong> Before every round starts, the server commits to an unalterable <code>serverSeedHash = SHA256(serverSeed)</code>. Once the round ends, the server seed is revealed so you can mathematically verify the exact crash point or grid traps!</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          
          {/* Game Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#0b0e14] border border-[#232b3b] rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setGameType('AVIATOR')}
              className={`py-2 rounded-lg transition ${gameType === 'AVIATOR' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Aviator Crash
            </button>
            <button
              type="button"
              onClick={() => setGameType('CHICKEN_ROAD')}
              className={`py-2 rounded-lg transition ${gameType === 'CHICKEN_ROAD' ? 'bg-blue-500 text-white shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Chicken Road Grid
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-400 mb-1">Revealed Server Seed</label>
            <input
              type="text"
              placeholder="e.g. 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"
              value={serverSeed}
              onChange={(e) => setServerSeed(e.target.value)}
              className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl py-2.5 px-3 text-xs font-mono text-blue-300 outline-none placeholder:text-gray-600"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Client Seed</label>
              <input
                type="text"
                value={clientSeed}
                onChange={(e) => setClientSeed(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl py-2 px-3 text-xs font-mono text-gray-300 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-1">Nonce</label>
              <input
                type="number"
                value={nonce}
                onChange={(e) => setNonce(e.target.value)}
                className="w-full bg-[#0b0e14] border border-[#232b3b] rounded-xl py-2 px-3 text-xs font-mono text-gray-300 outline-none"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 text-xs"
          >
            <Cpu className="w-4 h-4" />
            <span>{loading ? 'Computing HMAC-SHA256...' : 'Verify Cryptographic Result'}</span>
          </button>
        </form>

        {/* Verification Result Output */}
        {result && (
          <div className="mt-4 p-4 bg-[#0b0e14] border border-emerald-500/40 rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>SHA-256 Hash Verification Passed!</span>
            </div>
            
            <div className="text-gray-300 space-y-1 font-mono text-[11px] break-all">
              <div><span className="text-gray-500">SHA256(ServerSeed):</span> {result.serverSeedHash}</div>
              <div className="text-amber-400 font-bold text-sm pt-1">
                Calculated Outcome: {gameType === 'AVIATOR' ? `${result.result}x Crash Point` : `Traps on rows [${result.result.join(', ')}]`}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
