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
import { DepositModal } from './components/DepositModal';
import { WithdrawModal } from './components/WithdrawModal';
import { AuthModal } from './components/AuthModal';
import { UserWalletDrawer } from './components/UserWalletDrawer';

function MainApp() {
  const { user, notification, depositPopup } = useAuth();
  
  // Isolated Route/View Manager: 'home' | 'aviator' | 'chicken' | 'wingo' | 'admin' | 'admin-login'
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname;
    if (path === '/game/aviator') return 'aviator';
    if (path === '/game/chicken') return 'chicken';
    if (path === '/game/wingo') return 'wingo';
    if (path === '/admin') return 'admin';
    if (path === '/admin-login') return 'admin-login';
    return 'home';
  });

  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authInitialMode, setAuthInitialMode] = useState('login');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);

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
      else setActiveTab('home');
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const isAdminView = activeTab === 'admin' || activeTab === 'admin-login';

  return (
    <div className="min-h-screen bg-[#070210] text-gray-100 flex flex-col selection:bg-amber-500 selection:text-black font-sans">
      
      {/* Real-time Global Toast Notification (Error / Success / Info) */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] pointer-events-none w-full max-w-[92vw] sm:max-w-md px-3 animate-fadeIn">
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 text-xs font-bold backdrop-blur-xl ${
              notification.type === 'error'
                ? 'bg-[#1e070c]/95 border-red-500/80 text-red-100 shadow-red-950/50'
                : notification.type === 'success'
                ? 'bg-[#061e14]/95 border-emerald-500/80 text-emerald-100 shadow-emerald-950/50'
                : 'bg-[#1f1505]/95 border-amber-500/80 text-amber-100 shadow-amber-950/50'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                notification.type === 'error'
                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                  : notification.type === 'success'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-amber-500/20 border-amber-500/40 text-amber-400'
              }`}
            >
              {notification.type === 'error' ? (
                <AlertCircle className="w-5 h-5" />
              ) : notification.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={`text-[10px] font-black uppercase tracking-wider ${
                  notification.type === 'error'
                    ? 'text-red-400'
                    : notification.type === 'success'
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {notification.type === 'error' ? 'Notice' : notification.type === 'success' ? 'Success' : 'Notification'}
              </div>
              <div className="text-white text-xs font-semibold leading-snug break-words">
                {notification.message || notification.text}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Instant User Deposit Success Notification Card */}
      {depositPopup && (
        <div
          className={`fixed top-4 left-1/2 z-[99999] pointer-events-none px-5 py-3.5 rounded-2xl shadow-2xl border flex items-center gap-3 text-sm font-bold
            bg-emerald-950/95 border-emerald-500/60 text-emerald-300 backdrop-blur-lg
            ${depositPopup.animClass}`}
          style={{ transform: 'translateX(-50%)' }}
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 font-mono font-black text-base">
            ✓
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">Deposit Credited!</div>
            <div className="text-white font-mono font-bold">
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
          user && user.role === 'ADMIN' ? (
            <AdminDashboard onNavigate={navigateTo} />
          ) : (
            <AdminLogin onLoginSuccess={() => navigateTo('admin')} />
          )
        )}

        {activeTab === 'admin-login' && (
          <AdminLogin onLoginSuccess={() => navigateTo('admin')} />
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
