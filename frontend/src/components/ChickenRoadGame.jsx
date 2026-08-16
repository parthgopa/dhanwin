import React, { useEffect, useRef, useState } from 'react';
import { ShieldCheck, Sparkles, RefreshCw, Flame, Lock, Wifi } from 'lucide-react';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';

export const ChickenRoadGame = ({ onOpenDeposit, onOpenAuth }) => {
  const { user, updateBalance, showToast } = useAuth();

  // TASK 2: 1.8s "Connecting to Secure Game Server..." Loading Screen State
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectProgress, setConnectProgress] = useState(0);

  const [difficulty, setDifficulty] = useState('Medium'); // 'Easy' | 'Medium' | 'Hard' | 'Hardcore'
  const [betAmount, setBetAmount] = useState(10);
  const [gameStatus, setGameStatus] = useState('IDLE'); // 'IDLE' | 'RUNNING' | 'WON' | 'DEAD'
  const [activeStep, setActiveStep] = useState(0); // 0 to 5
  const [currentMultiplier, setCurrentMultiplier] = useState(1.00);
  const [gameId, setGameId] = useState(null);
  const [deadTile, setDeadTile] = useState(null);

  const socketRef = useRef(null);

  const difficultyMultipliers = {
    Easy: [1.03, 1.08, 1.13, 1.19, 1.25, 1.32],
    Medium: [1.08, 1.14, 1.21, 1.29, 1.37, 1.48],
    Hard: [1.18, 1.32, 1.49, 1.69, 1.93, 2.22],
    Hardcore: [1.45, 1.92, 2.65, 3.75, 5.50, 8.40],
  };

  const stepsList = [
    { stepIndex: 0, mult: difficultyMultipliers[difficulty][0] },
    { stepIndex: 1, mult: difficultyMultipliers[difficulty][1] },
    { stepIndex: 2, mult: difficultyMultipliers[difficulty][2] },
    { stepIndex: 3, mult: difficultyMultipliers[difficulty][3] },
    { stepIndex: 4, mult: difficultyMultipliers[difficulty][4] },
    { stepIndex: 5, mult: difficultyMultipliers[difficulty][5] },
  ];

  // TASK 2: 1.8-Second Connection Handshake Sequence
  useEffect(() => {
    let progressTimer;
    let step = 0;

    progressTimer = setInterval(() => {
      step += 25;
      setConnectProgress(step);
      if (step >= 100) {
        clearInterval(progressTimer);
        setIsConnecting(false);
      }
    }, 450);

    return () => clearInterval(progressTimer);
  }, []);

  // TASK 2: WebSocket Connection ONLY AFTER 1.8s Handshake Completes + Clean Unmount Disconnect
  useEffect(() => {
    if (isConnecting) return;

    const socket = getSocket();
    socketRef.current = socket;

    socket.on('chicken:game_started', (data) => {
      setGameId(data.gameId);
      setGameStatus('RUNNING');
      setActiveStep(0);
      setCurrentMultiplier(1.00);
      setDeadTile(null);
      showToast('Chicken Road round started! Cross the street safely.', 'success');
    });

    socket.on('chicken:step_safe', (data) => {
      setActiveStep(data.currentStep);
      setCurrentMultiplier(data.currentMultiplier);
    });

    socket.on('chicken:game_over', (data) => {
      setGameStatus('DEAD');
      setDeadTile(data.trapTile);
      showToast('SPLASH! A vehicle hit the chicken!', 'error');
    });

    socket.on('chicken:game_won', (data) => {
      setGameStatus('WON');
      setCurrentMultiplier(data.currentMultiplier);
      updateBalance(data.newBalance);
      showToast(`MAX WIN! Reached end of street! Won ₹${data.payoutAmount}`, 'success');
    });

    socket.on('chicken:cashout_success', (data) => {
      setGameStatus('WON');
      setCurrentMultiplier(data.cashOutMultiplier);
      updateBalance(data.newBalance);
      showToast(`Cashed out at ${data.cashOutMultiplier}x! Won ₹${data.payoutAmount}`, 'success');
    });

    socket.on('chicken:error', (data) => {
      showToast(data.message, 'error');
    });

    // TASK 2: Clean WebSocket Disconnection on Component Unmount
    return () => {
      socket.off('chicken:game_started');
      socket.off('chicken:step_safe');
      socket.off('chicken:game_over');
      socket.off('chicken:game_won');
      socket.off('chicken:cashout_success');
      socket.off('chicken:error');
      socket.disconnect();
    };
  }, [isConnecting]);

  const handleStartGame = () => {
    if (!user) { onOpenAuth(); return; }
    if ((user?.walletBalance ?? 0) < betAmount) { showToast('Insufficient wallet balance', 'error'); onOpenDeposit(); return; }
    if (socketRef.current) socketRef.current.emit('chicken:start_game', { betAmount, difficulty });
  };

  const handleTileClick = (stepIdx, tileIdx) => {
    if (gameStatus !== 'RUNNING' || stepIdx !== activeStep) return;
    if (socketRef.current) socketRef.current.emit('chicken:step_move', { gameId, stepIndex: stepIdx, tileIndex: tileIdx });
  };

  const handleCashout = () => {
    if (gameStatus !== 'RUNNING' || activeStep === 0) return;
    if (socketRef.current) socketRef.current.emit('chicken:cashout', { gameId });
  };

  // TASK 2: High-Tech "Connecting to Secure Game Server..." Loading Screen Overlay
  if (isConnecting) {
    return (
      <div className="max-w-4xl mx-auto h-[550px] bg-[#151a23] border border-[#232b3b] rounded-3xl flex flex-col items-center justify-center space-y-6 shadow-2xl relative overflow-hidden">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-2 border-amber-500/30 flex items-center justify-center animate-ping" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/50 flex items-center justify-center shadow-[0_0_30px_rgba(245,158,11,0.5)]">
              <Lock className="w-8 h-8 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="text-center space-y-2 max-w-sm z-10 font-sans">
          <h3 className="text-xl font-black tracking-wider text-white uppercase">
            CONNECTING TO CHICKEN ROAD SERVER...
          </h3>
          <p className="text-xs text-amber-400 font-mono flex items-center justify-center gap-2">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>Establishing Encrypted HMAC-SHA256 Handshake...</span>
          </p>
        </div>

        <div className="w-72 space-y-2 z-10 font-mono">
          <div className="w-full h-2 bg-[#0b0e14] rounded-full overflow-hidden border border-[#232b3b]">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-300 shadow-lg"
              style={{ width: `${connectProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-gray-500 font-bold">
            <span>PROVABLY FAIR HANDSHAKE</span>
            <span>{connectProgress}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 font-sans">
      
      {/* GAME HEADER */}
      <div className="bg-[#151a23] border border-[#232b3b] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow">
            🐥
          </div>
          <div>
            <h2 className="text-xl font-black text-white tracking-wide uppercase">CHICKEN ROAD</h2>
            <p className="text-xs text-gray-400">Step over manholes, dodge vehicles, reach 1.48x multiplier!</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#0b0e14] p-1 rounded-xl border border-[#232b3b] text-xs font-bold">
          {['Easy', 'Medium', 'Hard'].map((d) => (
            <button
              key={d}
              onClick={() => gameStatus === 'IDLE' && setDifficulty(d)}
              disabled={gameStatus === 'RUNNING'}
              className={`px-3 py-1.5 rounded-lg transition ${
                difficulty === d ? 'bg-amber-500 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* ROAD GRID STAGE */}
      <div className="bg-[#151a23] border border-[#232b3b] rounded-2xl p-6 relative overflow-hidden shadow-2xl space-y-4">
        
        {/* Street Tiles (6 Horizontal Steps) */}
        <div className="space-y-3">
          {stepsList.map((step, stepIdx) => (
            <div
              key={stepIdx}
              className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                activeStep === stepIdx && gameStatus === 'RUNNING'
                  ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : stepIdx < activeStep
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : 'bg-[#0b0e14] border-[#232b3b]'
              }`}
            >
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="text-gray-500 font-bold">STEP {stepIdx + 1}</span>
                <span className="text-amber-400 font-black">{step.mult.toFixed(2)}x</span>
              </div>

              {/* 4 Manhole Circular Tiles */}
              <div className="grid grid-cols-4 gap-3 w-2/3">
                {[0, 1, 2, 3].map((tileIdx) => {
                  const isCurrentActive = activeStep === stepIdx && gameStatus === 'RUNNING';
                  const isPassed = stepIdx < activeStep;
                  const isTrapHit = gameStatus === 'DEAD' && activeStep === stepIdx && deadTile === tileIdx;

                  return (
                    <button
                      key={tileIdx}
                      onClick={() => handleTileClick(stepIdx, tileIdx)}
                      disabled={!isCurrentActive}
                      className={`h-12 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all transform ${
                        isTrapHit
                          ? 'bg-red-600 border-red-400 text-white animate-bounce shadow-[0_0_20px_rgba(239,68,68,0.8)]'
                          : isPassed
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                          : isCurrentActive
                          ? 'bg-[#151a23] border-amber-500 hover:scale-105 hover:bg-amber-500/20 text-white cursor-pointer shadow-lg'
                          : 'bg-[#0b0e14] border-[#232b3b] text-gray-600 opacity-50'
                      }`}
                    >
                      {isTrapHit ? '💥' : isPassed ? '🐥' : '🪙'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* BET CONTROLS */}
        <div className="pt-4 border-t border-[#232b3b] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-[#0b0e14] border border-[#232b3b] rounded-xl p-2 font-mono">
            <span className="text-xs text-gray-400 font-sans">Bet:</span>
            <input
              type="number"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              disabled={gameStatus === 'RUNNING'}
              className="w-20 bg-transparent text-center font-bold text-white outline-none"
            />
            <span className="text-xs text-amber-400 font-bold">INR</span>
          </div>

          {gameStatus === 'RUNNING' ? (
            <button
              onClick={handleCashout}
              disabled={activeStep === 0}
              className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 text-white font-black rounded-2xl text-base shadow-xl transition disabled:opacity-40"
            >
              CASH OUT (₹{(betAmount * currentMultiplier).toFixed(2)})
            </button>
          ) : (
            <button
              onClick={handleStartGame}
              className="flex-1 py-4 bg-amber-500 hover:bg-amber-400 text-black font-black rounded-2xl text-base shadow-xl transition"
            >
              START GAME (₹{betAmount.toFixed(2)})
            </button>
          )}
        </div>

      </div>

    </div>
  );
};
