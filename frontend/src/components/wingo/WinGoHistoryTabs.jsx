import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { wingoAPI } from '../../services/api';
import { WinGoBall } from './WinGoBall';

export const WinGoHistoryTabs = ({ activeMode = '30s', lastRoundResult = null }) => {
  const [activeTab, setActiveTab] = useState('GAME_HISTORY'); // 'GAME_HISTORY' | 'CHART' | 'MY_HISTORY'

  // Tab 1: Game History state & pagination (10 per page, max 10 pages)
  const [gameHistory, setGameHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Tab 2: Chart state & pagination (10 per page, max 10 pages)
  const [chartData, setChartData] = useState(null);
  const [chartPage, setChartPage] = useState(1);
  const [chartTotalPages, setChartTotalPages] = useState(1);

  // Tab 3: My History state & pagination (10 per page)
  const [myBets, setMyBets] = useState([]);
  const [myBetsPage, setMyBetsPage] = useState(1);
  const [myBetsTotalPages, setMyBetsTotalPages] = useState(1);

  const [expandedBetId, setExpandedBetId] = useState(null);
  const [loading, setLoading] = useState(false);

  // Fetch Game History
  const fetchGameHistory = async (page = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wingo/history/${activeMode}?page=${page}&limit=10`).then(r => r.json());
      if (res.success) {
        setGameHistory(res.history);
        setHistoryPage(res.page);
        setHistoryTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Chart Data
  const fetchChart = async (page = 1) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/wingo/chart/${activeMode}?page=${page}&limit=10`).then(r => r.json());
      if (res.success) {
        setChartData(res);
        setChartPage(res.page);
        setChartTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch User Bets
  const fetchMyBets = async (page = 1) => {
    try {
      setLoading(true);
      const res = await wingoAPI.getMyBets(activeMode, page, 10);
      if (res.success) {
        setMyBets(res.bets);
        setMyBetsPage(res.page);
        setMyBetsTotalPages(res.totalPages || 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial and reactive load on tab or mode change
  useEffect(() => {
    setHistoryPage(1);
    setChartPage(1);
    setMyBetsPage(1);

    if (activeTab === 'GAME_HISTORY') fetchGameHistory(1);
    else if (activeTab === 'CHART') fetchChart(1);
    else if (activeTab === 'MY_HISTORY') fetchMyBets(1);
  }, [activeMode, activeTab, lastRoundResult]);

  return (
    <div className="bg-[#17132c] border border-purple-950/60 rounded-3xl p-3 sm:p-4 space-y-4 shadow-xl select-none">

      {/* ── TOP 3 TABS ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 bg-[#120e24] p-1.5 rounded-2xl border border-purple-900/30">
        {[
          { id: 'GAME_HISTORY', label: 'Game history' },
          { id: 'CHART', label: 'Chart' },
          { id: 'MY_HISTORY', label: 'My history' },
        ].map((tab) => {
          const isSel = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all ${isSel
                  ? 'bg-gradient-to-b from-[#fcd34d] via-[#f59e0b] to-[#d97706] text-black shadow-lg scale-[1.02]'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: GAME HISTORY TABLE (10 PER PAGE, MAX 10 PAGES) ─────────── */}
      {activeTab === 'GAME_HISTORY' && (
        <div className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="bg-[#fcd34d] text-black uppercase font-black text-[11px] rounded-xl">
                  <th className="p-3 rounded-l-xl">Period</th>
                  <th className="p-3 text-center">Number</th>
                  <th className="p-3 text-center">Big/Small</th>
                  <th className="p-3 text-center rounded-r-xl">Color</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/30 text-gray-200 font-sans">
                {gameHistory.map((item) => (
                  <tr key={item._id || item.periodId} className="hover:bg-white/5 transition">
                    <td className="p-3 font-mono font-bold text-gray-300 text-xs">
                      {item.periodId}
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex justify-center">
                        <WinGoBall num={item.winningNumber} size="sm" />
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${item.winningSize === 'BIG'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        }`}>
                        {item.winningSize === 'BIG' ? 'Big' : 'Small'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {item.winningColor === 'RED_VIOLET' ? (
                          <>
                            <span className="w-3 h-3 rounded-full bg-red-500" />
                            <span className="w-3 h-3 rounded-full bg-purple-500" />
                          </>
                        ) : item.winningColor === 'GREEN_VIOLET' ? (
                          <>
                            <span className="w-3 h-3 rounded-full bg-emerald-500" />
                            <span className="w-3 h-3 rounded-full bg-purple-500" />
                          </>
                        ) : (
                          <span className={`w-3.5 h-3.5 rounded-full ${item.winningColor === 'RED' ? 'bg-red-500' : 'bg-emerald-500'}`} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {gameHistory.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-500">Loading game history...</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls (< 1/10 >) */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              disabled={historyPage <= 1}
              onClick={() => fetchGameHistory(historyPage - 1)}
              className="p-2 rounded-xl bg-[#251f3e] hover:bg-[#342e5c] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-gray-300">
              {historyPage} / {historyTotalPages}
            </span>
            <button
              disabled={historyPage >= historyTotalPages}
              onClick={() => fetchGameHistory(historyPage + 1)}
              className="p-2 rounded-xl bg-[#251f3e] hover:bg-[#342e5c] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 2: CHART (TREND LINE & 100-PERIOD STATS WITH PAGINATION) ───── */}
      {activeTab === 'CHART' && (
        <div className="space-y-4">

          {/* Header Bar */}
          <div className="grid grid-cols-12 bg-[#fcd34d] text-black font-black text-xs p-2.5 rounded-xl uppercase">
            <div className="col-span-4 pl-2">Period</div>
            <div className="col-span-8 text-center">Number</div>
          </div>

          {/* Statistical Summary Header (Last 100 Periods) */}
          {chartData?.stats && (
            <div className="bg-[#120e24] p-3 rounded-2xl border border-purple-900/40 space-y-1.5 text-[11px] font-mono">
              <div className="text-gray-400 font-bold mb-1">Statistic (last 100 Periods)</div>

              {/* Numbers Header */}
              <div className="grid grid-cols-12 text-center font-bold text-red-400">
                <div className="col-span-3 text-left font-sans text-gray-300">Winning Numbers</div>
                <div className="col-span-9 grid grid-cols-10">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <span key={n} className="text-amber-400 font-bold">{n}</span>
                  ))}
                </div>
              </div>

              {/* Missing */}
              <div className="grid grid-cols-12 text-center text-gray-300">
                <div className="col-span-3 text-left font-sans text-gray-400">Missing</div>
                <div className="col-span-9 grid grid-cols-10">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <span key={n}>{chartData.stats[n]?.missing ?? 0}</span>
                  ))}
                </div>
              </div>

              {/* Avg Missing */}
              <div className="grid grid-cols-12 text-center text-gray-300">
                <div className="col-span-3 text-left font-sans text-gray-400">Avg missing</div>
                <div className="col-span-9 grid grid-cols-10">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <span key={n}>{chartData.stats[n]?.avgMissing ?? 0}</span>
                  ))}
                </div>
              </div>

              {/* Frequency */}
              <div className="grid grid-cols-12 text-center text-gray-300">
                <div className="col-span-3 text-left font-sans text-gray-400">Frequency</div>
                <div className="col-span-9 grid grid-cols-10">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <span key={n} className="text-emerald-400 font-bold">{chartData.stats[n]?.frequency ?? 0}</span>
                  ))}
                </div>
              </div>

              {/* Max Consecutive */}
              <div className="grid grid-cols-12 text-center text-gray-300">
                <div className="col-span-3 text-left font-sans text-gray-400">Max consecutive</div>
                <div className="col-span-9 grid grid-cols-10">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
                    <span key={n}>{chartData.stats[n]?.maxConsecutive ?? 0}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 10 Paginated Trend Rows */}
          <div className="relative overflow-x-auto border border-purple-900/30 rounded-2xl bg-[#120e24] p-2">
            <div className="space-y-2">
              {(chartData?.periods || []).map((p, idx) => (
                <div key={p.periodId || idx} className="grid grid-cols-12 items-center text-xs font-mono py-1.5 border-b border-purple-900/20">

                  {/* Period ID */}
                  <div className="col-span-4 text-gray-300 font-bold truncate pl-1">
                    {p.periodId}
                  </div>

                  {/* 10 Number Nodes 0–9 */}
                  <div className="col-span-7 grid grid-cols-10 text-center items-center">
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((colNum) => {
                      const isWinner = p.winningNumber === colNum;
                      return (
                        <div key={colNum} className="flex items-center justify-center">
                          {isWinner ? (
                            <WinGoBall num={colNum} size="xs" />
                          ) : (
                            <span className="w-4 h-4 rounded-full border border-purple-900/40 text-gray-600 text-[10px] flex items-center justify-center">
                              {colNum}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Big/Small Badge */}
                  <div className="col-span-1 text-right pr-1">
                    <span className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-black ${p.winningSize === 'BIG'
                        ? 'bg-amber-500 text-black'
                        : 'bg-blue-500 text-white'
                      }`}>
                      {p.winningSize === 'BIG' ? 'B' : 'S'}
                    </span>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* Chart Pagination Controls (< 1/10 >) */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              disabled={chartPage <= 1}
              onClick={() => fetchChart(chartPage - 1)}
              className="p-2 rounded-xl bg-[#251f3e] hover:bg-[#342e5c] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-gray-300">
              {chartPage} / {chartTotalPages}
            </span>
            <button
              disabled={chartPage >= chartTotalPages}
              onClick={() => fetchChart(chartPage + 1)}
              className="p-2 rounded-xl bg-[#251f3e] hover:bg-[#342e5c] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── TAB 3: MY HISTORY (10 PER PAGE) ───────────────────────────────── */}
      {activeTab === 'MY_HISTORY' && (
        <div className="space-y-3">

          {/* Bet Cards List */}
          <div className="space-y-2.5">
            {myBets.map((bet) => {
              const isWon = bet.status === 'WON';
              const isExpanded = expandedBetId === bet._id;
              const isNumberBet = !isNaN(Number(bet.selectValue)) && bet.selectValue !== '' && bet.selectValue !== null;

              return (
                <div
                  key={bet._id}
                  className="bg-[#1d1836] border border-purple-900/40 rounded-2xl overflow-hidden shadow-md transition"
                >
                  {/* Summary Header */}
                  <div
                    onClick={() => setExpandedBetId(isExpanded ? null : bet._id)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-white/5"
                  >
                    <div className="flex items-center gap-3">
                      {/* Badge Icon */}
                      {isNumberBet ? (
                        <WinGoBall num={bet.selectValue} size="md" />
                      ) : (
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs text-white shadow-md ${bet.selectValue === 'BIG' ? 'bg-amber-500' :
                            bet.selectValue === 'SMALL' ? 'bg-blue-500' :
                              bet.selectValue === 'RED' ? 'bg-red-500' :
                                bet.selectValue === 'GREEN' ? 'bg-emerald-500' :
                                  'bg-purple-600'
                          }`}>
                          {bet.selectValue}
                        </div>
                      )}

                      {/* Period & Date */}
                      <div>
                        <div className="flex items-center gap-1 text-sm font-mono font-black text-white">
                          <span>{bet.periodId}</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {new Date(bet.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Win / Loss Status & Net P&L */}
                    <div className="text-right">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase ${isWon
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-red-500/20 text-red-400 border-red-500/40'
                        }`}>
                        {isWon ? 'Win' : 'Lose'}
                      </span>
                      <div className={`font-mono font-black text-sm mt-0.5 ${isWon ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                        {isWon ? `+₹${Math.round(bet.payoutAmount)}` : `-₹${Math.round(bet.totalAmount)}`}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Accordion Details */}
                  {isExpanded && (
                    <div className="bg-[#120e24] px-4 py-3 border-t border-purple-900/30 text-xs space-y-1.5 font-mono">
                      <div className="flex justify-between text-gray-400">
                        <span>Select Option:</span>
                        <strong className="text-white font-sans">{bet.selectType} ({bet.selectValue})</strong>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Unit Amount:</span>
                        <span className="text-white">₹{Math.round(bet.unitPrice)}</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Quantity / Multiplier:</span>
                        <span className="text-white">{bet.multiplier}x</span>
                      </div>
                      <div className="flex justify-between text-gray-400">
                        <span>Total Bet:</span>
                        <span className="text-amber-400 font-bold">₹{Math.round(bet.totalAmount)}</span>
                      </div>
                      {isWon && (
                        <div className="flex justify-between text-emerald-400 font-bold border-t border-purple-900/30 pt-1.5">
                          <span>Winning Payout:</span>
                          <span>+₹{Math.round(bet.payoutAmount)}</span>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}

            {myBets.length === 0 && (
              <div className="text-center py-10 text-gray-500 text-xs">
                No bets found for this mode. Place a bet to see your history!
              </div>
            )}
          </div>

          {/* Pagination Controls (< 1/10 >) */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              disabled={myBetsPage <= 1}
              onClick={() => fetchMyBets(myBetsPage - 1)}
              className="p-2 rounded-xl bg-[#251f3e] hover:bg-[#342e5c] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-gray-300">
              {myBetsPage} / {myBetsTotalPages}
            </span>
            <button
              disabled={myBetsPage >= myBetsTotalPages}
              onClick={() => fetchMyBets(myBetsPage + 1)}
              className="p-2 rounded-xl bg-[#251f3e] hover:bg-[#342e5c] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
