import React, { useEffect, useState, useRef } from 'react';
import { Wifi, RefreshCw, AlertCircle } from 'lucide-react';
import { forceFreshConnection, subscribeConnectionState } from '../../services/socket';

/**
 * GameConnectionWatchdog
 * - Automatically recovers frozen/stuck WebSockets
 * - Detects when tab/app was backgrounded/inactive for > 1 minute
 * - Seamlessly re-syncs without requiring app restart
 */
export const GameConnectionWatchdog = ({
  gameName = 'Game',
  onReconnect,
  lastEventTimestamp = Date.now(),
  stuckThresholdMs = 6000,
}) => {
  const [showAwayModal, setShowAwayModal] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [isStalled, setIsStalled] = useState(false);

  const blurTimestampRef = useRef(null);
  const lastSyncTimeRef = useRef(Date.now());

  const handleTriggerReconnect = async () => {
    setIsReconnecting(true);
    try {
      forceFreshConnection();
      if (onReconnect) {
        await onReconnect();
      }
    } catch (err) {
      console.error('[Watchdog Reconnect Error]', err);
    } finally {
      setTimeout(() => {
        setIsReconnecting(false);
        setShowAwayModal(false);
        setIsStalled(false);
        lastSyncTimeRef.current = Date.now();
      }, 700);
    }
  };

  // 1. Listen to global socket connection state
  useEffect(() => {
    const unsub = subscribeConnectionState((state) => {
      setIsConnected(state === 'connected');
      if (state === 'connected') {
        setIsStalled(false);
      }
    });
    return unsub;
  }, []);

  // 2. Detect Tab/Screen Focus & Inactivity > 1 minute
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        blurTimestampRef.current = Date.now();
      } else if (document.visibilityState === 'visible') {
        const awayDuration = blurTimestampRef.current ? Date.now() - blurTimestampRef.current : 0;
        blurTimestampRef.current = null;

        // If screen was off/backgrounded for > 60 seconds (1 minute)
        if (awayDuration >= 60000) {
          setShowAwayModal(true);
          handleTriggerReconnect();
        } else {
          // Quick tab switch (< 1 min): silently re-sync to ensure no stuck frame
          handleTriggerReconnect();
        }
      }
    };

    const handleWindowFocus = () => {
      if (blurTimestampRef.current && Date.now() - blurTimestampRef.current >= 60000) {
        setShowAwayModal(true);
        handleTriggerReconnect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // 3. Heartbeat Watchdog: Check if game ticks stopped arriving
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') return;

      const timeSinceLastEvent = Date.now() - lastEventTimestamp;
      if (timeSinceLastEvent > stuckThresholdMs && !isReconnecting) {
        setIsStalled(true);
        // Automatically attempt silent recovery
        if (Date.now() - lastSyncTimeRef.current > 4000) {
          lastSyncTimeRef.current = Date.now();
          if (onReconnect) onReconnect();
        }
      } else if (timeSinceLastEvent <= stuckThresholdMs) {
        setIsStalled(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [lastEventTimestamp, stuckThresholdMs, isReconnecting, onReconnect]);

  return (
    <>
      {/* ── STALLED / DISCONNECTED FLOATING TOAST ───────────────────────────── */}
      {(isStalled || !isConnected) && !showAwayModal && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 animate-fadeIn">
          <button
            onClick={handleTriggerReconnect}
            disabled={isReconnecting}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/90 hover:bg-amber-500 text-black font-extrabold text-xs shadow-lg backdrop-blur-md border border-amber-300 transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>{isReconnecting ? 'Reconnecting...' : 'Connection Paused • Tap to Refresh'}</span>
          </button>
        </div>
      )}

      {/* ── SCREEN OFF > 1 MINUTE RECONNECT POPUP MODAL ────────────────────── */}
      {showAwayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn select-none">
          <div className="relative w-full max-w-xs bg-gradient-to-b from-[#1c1836] to-[#0e0b1c] border border-amber-500/40 rounded-3xl p-6 text-center shadow-2xl space-y-4 animate-scaleBounce">
            
            {/* Pulsing Icon */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400">
              <Wifi className="w-7 h-7 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Welcome Back!</h3>
              <p className="text-xs text-gray-400">
                Screen was inactive for over 1 minute. Reconnecting {gameName} to live round...
              </p>
            </div>

            <button
              onClick={handleTriggerReconnect}
              disabled={isReconnecting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-black font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span>{isReconnecting ? 'Syncing Live Engine...' : 'Reconnect Now'}</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default GameConnectionWatchdog;
