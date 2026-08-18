import React, { useState, useEffect } from 'react';
import { CheckCircle2, Sparkles, AlertCircle, Info, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { AviatorGame } from './components/AviatorGame';
import { ChickenRoadGame } from './components/ChickenRoadGame';
import { WinGoGame } from './components/WinGoGame';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminLogin } from './pages/AdminLogin';
import { SuperAdminDashboard } from './pages/SuperAdminDashboard';
import { SuperAdminLogin } from './pages/SuperAdminLogin';
import { DepositModal } from './components/DepositModal';
import { WithdrawModal } from './components/WithdrawModal';
import { AuthModal } from './components/AuthModal';
import { UserWalletDrawer } from './components/UserWalletDrawer';
import { DailyRewardModal } from './components/DailyRewardModal';
import { walletAPI } from './services/api';

function MainApp() {
  const { user, notification, depositPopup } = useAuth();
  
  // Isolated Route/View Manager: 'home' | 'aviator' | 'chicken' | 'wingo' | 'admin' | 'admin-login' | 'superad' | 'superad-login'
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname;
    if (path === '/game/aviator') return 'aviator';
    if (path === '/game/chicken') return 'chicken';
    if (path === '/game/wingo') return 'wingo';
    if (path === '/admin') return 'admin';
    if (path === '/admin-login') return 'admin-login';
    if (path === '/superad') return 'superad';
    if (path === '/superad-login') return 'superad-login';
    return 'home';
  });

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);
  const [isDailyRewardOpen, setIsDailyRewardOpen] = useState(false);

  // Automatically pop up Daily Reward Modal if unclaimed on login or platform open
  useEffect(() => {
    if (!user) return;
    const userId = user.id || user._id;
    if (!userId) return;

    const checkAndPopupDailyReward = async () => {
      try {
        const sessionKey = `daily_reward_checked_${userId}_${new Date().toDateString()}`;
        if (sessionStorage.getItem(sessionKey)) return;

        const res = await walletAPI.getDailyRewardStatus();
        if (res?.canClaim && res.availableReward > 0) {
          // Delay briefly (1.2s) for smooth page loading, then pop up modal
          setTimeout(() => {
            setIsDailyRewardOpen(true);
            sessionStorage.setItem(sessionKey, 'true');
          }, 1200);
        }
      } catch (err) {
        console.warn('[Daily Reward Auto Check]', err?.message);
      }
    };

    checkAndPopupDailyReward();
  }, [user?.id, user?._id]);

  const handleOpenAuth = (param = 'login') => {
    const mode = typeof param === 'string' ? param : (param?.mode || 'login');
    setAuthInitialMode(mode);
    setIsAuthOpen(true);
  };

  // Sync window URL path when navigating
  const navigateTo = (tab) => {
    if (tab === 'aviator' && activeTab !== 'aviator') {
      window.location.href = '/game/aviator';
      return;
    }
    setActiveTab(tab);
    if (tab === 'aviator') window.history.pushState({}, '', '/game/aviator');
    else if (tab === 'chicken') window.history.pushState({}, '', '/game/chicken');
    else if (tab === 'wingo') window.history.pushState({}, '', '/game/wingo');
    else if (tab === 'admin') window.history.pushState({}, '', '/admin');
    else if (tab === 'admin-login') window.history.pushState({}, '', '/admin-login');
    else if (tab === 'superad') window.history.pushState({}, '', '/superad');
    else if (tab === 'superad-login') window.history.pushState({}, '', '/superad-login');
    else window.history.pushState({}, '', '/');
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/game/aviator') setActiveTab('aviator');
      else if (path === '/game/chicken') setActiveTab('chicken');
      else if (path === '/game/wingo') setActiveTab('wingo');
      else if (path === '/admin') setActiveTab('admin');
      else if (path === '/admin-login') setActiveTab('admin-login');
      else if (path === '/superad') setActiveTab('superad');
      else if (path === '/superad-login') setActiveTab('superad-login');
      else setActiveTab('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdminView = activeTab === 'admin' || activeTab === 'admin-login' || activeTab === 'superad' || activeTab === 'superad-login';

  return (
    <div className="min-h-screen bg-[#070210] text-gray-100 flex flex-col selection:bg-amber-500 selection:text-black font-sans">
      
      {/* Real-time Global Toast Notification (Error / Success / Info) */}
      {notification && (
        <div className="fixed top-16 sm:top-5 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none w-auto max-w-[94vw] sm:max-w-md px-2 sm:px-3 animate-fadeIn">
          <div
            className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-2xl shadow-2xl border flex items-center gap-2.5 sm:gap-3 text-xs font-bold backdrop-blur-xl ${
              notification.type === 'error'
                ? 'bg-[#1e070c]/95 border-red-500/80 text-red-100 shadow-red-950/50'
                : notification.type === 'success'
                ? 'bg-[#061e14]/95 border-emerald-500/80 text-emerald-100 shadow-emerald-950/50'
                : 'bg-[#1f1505]/95 border-amber-500/80 text-amber-100 shadow-amber-950/50'
            }`}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 border ${
                notification.type === 'error'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : notification.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              {notification.type === 'error' ? (
                <AlertCircle className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              ) : notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              ) : (
                <Info className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider ${
                  notification.type === 'error'
                    ? 'text-red-400'
                    : notification.type === 'success'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {notification.type === 'error' ? 'Notice' : notification.type === 'success' ? 'Success' : 'Notification'}
              </div>
              <div className="text-white text-[11px] sm:text-xs font-semibold leading-snug break-words">
                {notification.message || notification.text}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instant User Deposit Success Notification Card */}
      {depositPopup && (
        <div
          className={`fixed top-16 sm:top-5 left-1/2 z-[99999] pointer-events-none px-3.5 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl shadow-2xl border flex items-center gap-2.5 text-xs sm:text-sm font-bold
            bg-emerald-950/95 border-emerald-500/60 text-emerald-300 backdrop-blur-lg
            ${depositPopup.animClass}`}
          style={{ transform: 'translateX(-50%)' }}
        >
          <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 font-mono font-black text-sm sm:text-base">
            ✓
          </div>
          <div>
            <div className="text-[9px] sm:text-[10px] text-emerald-400 font-black uppercase tracking-wider">Deposit Credited!</div>
            <div className="text-white font-mono font-bold text-xs sm:text-sm">
              +₹{depositPopup.amount} Added to your account!
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar - Hidden in Admin Portal */}
      {!isAdminView && (
        <Navbar
          activeTab={activeTab}
          setActiveTab={navigateTo}
          onOpenDeposit={() => setIsDepositOpen(true)}
          onOpenWithdraw={() => setIsWithdrawOpen(true)}
          onOpenAuth={handleOpenAuth}
          onOpenWalletDrawer={() => setIsWalletDrawerOpen(true)}
          onOpenDailyReward={() => setIsDailyRewardOpen(true)}
          mobileMenuOpen={isMobileMenuOpen}
          setMobileMenuOpen={setIsMobileMenuOpen}
        />
      )}

      {/* Main View Area (Strict Component Isolation) */}
      <main
        className={`flex-1 w-full mx-auto ${
          isAdminView
            ? 'flex flex-col max-w-none p-0'
            : activeTab === 'aviator' || activeTab === 'chicken'
              ? 'flex flex-col max-w-7xl px-2 sm:px-4 pt-2 sm:pt-3'
              : 'max-w-7xl p-2 sm:p-4 space-y-4'
        }`}
      >
        
        {/* LOBBY PAGE: Zero WebSockets / 0 Game Overhead */}
        {activeTab === 'home' && (
          <HomePage
            onSelectGame={(game) => navigateTo(game)}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenAuth={handleOpenAuth}
            onOpenSidebar={() => setIsMobileMenuOpen(true)}
          />
        )}

        {/* ISOLATED AVIATOR ROUTE */}
        {activeTab === 'aviator' && (
          <AviatorGame
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {/* ISOLATED CHICKEN ROAD ROUTE */}
        {activeTab === 'chicken' && (
          <ChickenRoadGame
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {/* ISOLATED WINGO ROUTE */}
        {activeTab === 'wingo' && (
          <WinGoGame
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenAuth={handleOpenAuth}
          />
        )}

        {/* ISOLATED ADMIN ROUTE */}
        {activeTab === 'admin' && (
          user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN') ? (
            <AdminDashboard onNavigate={navigateTo} />
          ) : (
            <AdminLogin onLoginSuccess={() => navigateTo('admin')} />
          )
        )}

        {activeTab === 'admin-login' && (
          <AdminLogin onLoginSuccess={() => navigateTo('admin')} />
        )}

        {/* ISOLATED SUPER ADMIN ROUTE (/superad) */}
        {activeTab === 'superad' && (
          user && (user.role === 'ADMIN' || user.role === 'SUPERADMIN') ? (
            <SuperAdminDashboard onNavigate={navigateTo} />
          ) : (
            <SuperAdminLogin onLoginSuccess={() => navigateTo('superad')} />
          )
        )}

        {activeTab === 'superad-login' && (
          <SuperAdminLogin onLoginSuccess={() => navigateTo('superad')} />
        )}

      </main>

      {/* Global Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />

      <WithdrawModal
        isOpen={isWithdrawOpen}
        onClose={() => setIsWithdrawOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        initialMode={authInitialMode}
        onClose={() => setIsAuthOpen(false)}
      />

      <UserWalletDrawer
        isOpen={isWalletDrawerOpen}
        onClose={() => setIsWalletDrawerOpen(false)}
        onOpenDeposit={() => setIsDepositOpen(true)}
        onOpenWithdraw={() => setIsWithdrawOpen(true)}
        onOpenDailyReward={() => setIsDailyRewardOpen(true)}
      />

      <DailyRewardModal
        isOpen={isDailyRewardOpen}
        onClose={() => setIsDailyRewardOpen(false)}
      />

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
