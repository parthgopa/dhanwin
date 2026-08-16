import React from 'react';
import { Gamepad2, Zap } from 'lucide-react';

// ── ChickenRoadAdmin — plug-in admin panel for Chicken Road 2 ────────────────
// Wire up socket listeners here when the Chicken Road engine is ready.
export const ChickenRoadAdmin = ({ socket, showToast }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gamepad2 className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-black text-white uppercase tracking-wider">Chicken Road 2 Control Portal</h2>
        <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LIVE</span>
      </div>
      <div className="bg-[#151a23] border border-amber-500/20 rounded-2xl p-12 text-center space-y-3">
        <Gamepad2 className="w-14 h-14 text-amber-400 mx-auto opacity-60" />
        <h3 className="text-base font-bold text-white">Chicken Road 2 Analytics</h3>
        <p className="text-xs text-gray-400 max-w-sm mx-auto">
          Live telemetry and round analytics for Chicken Road 2 will appear here.
          Connect the ChickenRoad socket stream to this panel.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-bold">
          <Zap className="w-3.5 h-3.5" /> Integration Ready — Plug in socket stream
        </div>
      </div>
    </div>
  );
};
