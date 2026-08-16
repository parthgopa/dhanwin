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
  const [isWalletDrawerOpen, setIsWalletDrawerOpen] = useState(false);

  // Sync window URL path when navigating
  const navigateTo = (tab) => {
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
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-transparent text-white selection:bg-amber-500 selection:text-black font-sans">
      
      {/* ── 1.5s MAX DEPOSIT SUCCESS POPUP (Floating Top Notification) ── */}
      {depositPopup && (
        <div className="fixed top-4 sm:top-6 left-1/2 -translate-x-1/2 z-[999999] pointer-events-none transition-all duration-300 transform scale-100 opacity-100">
          <div className="bg-gradient-to-r from-[#072415]/95 via-[#0d3320]/95 to-[#072415]/95 border-2 border-emerald-400 rounded-2xl px-5 py-3 shadow-[0_0_35px_rgba(16,185,129,0.55)] backdrop-blur-xl flex items-center gap-3 text-white">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-black font-black shadow-lg shrink-0">
              <CheckCircle2 className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Deposit Approved</span>
              </div>
              <div className="text-sm sm:text-base font-black text-white font-mono">
                +₹{depositPopup.amount} Added to your account!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── STANDARD TOAST NOTIFICATIONS ── */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-[99999] max-w-sm pointer-events-none transition-all duration-300">
          <div
            className={`p-3.5 rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-2.5 text-xs font-bold border ${
              notification.type === 'error'
                ? 'bg-red-950/90 border-red-500/50 text-red-200'
                : notification.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200'
                  : 'bg-blue-950/90 border-blue-500/50 text-blue-200'
            }`}
          >
            {notification.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            ) : notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span>{notification.message}</span>
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
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenWalletDrawer={() => setIsWalletDrawerOpen(true)}
        />
      )}

      {/* Main View Area (Strict Component Isolation) */}
      <main
        className={`flex-1 w-full mx-auto ${
          isAdminView
            ? 'overflow-hidden flex flex-col max-w-none p-0'
            : activeTab === 'aviator' || activeTab === 'chicken'
              ? 'overflow-hidden flex flex-col max-w-7xl px-2 sm:px-4 pt-2 sm:pt-3'
              : 'overflow-y-auto max-w-7xl p-2 sm:p-4 space-y-4'
        }`}
      >
        
        {/* LOBBY PAGE: Zero WebSockets / 0 Game Overhead */}
        {activeTab === 'home' && (
          <HomePage
            onSelectGame={(game) => navigateTo(game)}
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {/* ISOLATED AVIATOR ROUTE */}
        {activeTab === 'aviator' && (
          <AviatorGame
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {/* ISOLATED CHICKEN ROAD ROUTE */}
        {activeTab === 'chicken' && (
          <ChickenRoadGame
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
          />
        )}

        {/* ISOLATED WINGO ROUTE */}
        {activeTab === 'wingo' && (
          <WinGoGame
            onOpenDeposit={() => setIsDepositOpen(true)}
            onOpenAuth={() => setIsAuthOpen(true)}
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

      {/* Modals & Drawers */}
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
