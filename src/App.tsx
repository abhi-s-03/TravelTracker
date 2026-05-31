import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTravelStore } from './store/useTravelStore';
import { Globe3D } from './components/Globe3D';
import { Timeline } from './components/Timeline';
import { DashboardStats } from './components/DashboardStats';
import { SettingsPanel } from './components/SettingsPanel';
import { LogPlaceModal } from './components/LogPlaceModal';
import { CountryPanel } from './components/CountryPanel';
import { MemoryConsole } from './components/MemoryConsole';
import { LoginScreen } from './components/LoginScreen';
import { AuthCallback } from './components/AuthCallback';
import { LoadingScreen } from './components/LoadingScreen';
import type { PlaceLog, Badge } from './types';
import { Compass, Calendar, Trophy, Settings, Plus, Globe, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

// ─── Protected App Shell ──────────────────────────────────────────────────────

function AppShell() {
  const {
    activeTab,
    setActiveTab,
    setSelectedCountryCode,
    user,
    logout,
  } = useTravelStore();

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingPlace, setEditingPlace] = useState<PlaceLog | null>(null);
  const [selectedPlaceForMemory, setSelectedPlaceForMemory] = useState<PlaceLog | null>(null);
  const [unlockedBadge, setUnlockedBadge] = useState<Badge | null>(null);

  // Badge celebration listener
  useEffect(() => {
    const handleBadgeUnlocked = (e: Event) => {
      const badge = (e as CustomEvent).detail as Badge;
      setUnlockedBadge(badge);

      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 25, spread: 360, ticks: 50, zIndex: 10000 };
      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);
        const particleCount = 40 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);
    };

    window.addEventListener('badge-unlocked', handleBadgeUnlocked);
    return () => window.removeEventListener('badge-unlocked', handleBadgeUnlocked);
  }, []);

  const handleEditPlace = (place: PlaceLog) => {
    setEditingPlace(place);
    setIsLogModalOpen(true);
  };

  const handleGenerateMemory = (place: PlaceLog) => {
    setSelectedPlaceForMemory(place);
  };

  return (
    <div className="w-screen h-screen flex flex-col relative overflow-hidden bg-[#030712]">
      {/* Starry Background */}
      <div className="stars-bg" />

      {/* ── Top Header ─────────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 w-full z-[35] flex items-center justify-between p-3.5 pointer-events-none select-none">
        {/* Brand + User */}
        <div className="flex items-center gap-3 px-3.5 py-2 rounded-2xl glass-panel border border-white/10 shadow-xl pointer-events-auto backdrop-blur-md">
          <div className="flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-indigo-400 animate-slow-rotate" />
            <h1 className="font-black text-slate-100 text-sm tracking-widest uppercase">
              World<span className="text-indigo-400">Tracker</span>
            </h1>
          </div>
          <div className="h-4 w-px bg-white/15" />
          <div className="flex items-center gap-2 text-slate-400 text-[10px] font-bold font-mono">
            <span className="text-slate-300">👤 {user?.displayName || 'Explorer'}</span>
            <button
              onClick={() => logout()}
              className="text-[9px] px-2 py-0.5 rounded-md bg-white/5 border border-white/5 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 cursor-pointer transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Quick Log Button */}
        <button
          onClick={() => { setEditingPlace(null); setIsLogModalOpen(true); }}
          className="px-3 sm:px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-2xl shadow-indigo-500/20 transition-all hover:scale-[1.03] active:scale-[0.97] glow-blue pointer-events-auto min-h-[44px]"
        >
          <Plus className="w-4 h-4" />
          <span className="sm:inline">Log</span>
          <span className="hidden sm:inline"> Place</span>
        </button>
      </header>

      {/* ── Main Viewport ──────────────────────────────────────────────── */}
      <main className="flex-1 w-full h-full relative z-0 pt-[64px] pb-[80px]">
        {activeTab === 'globe' && (
          <div className="w-full h-full">
            <Globe3D onSelectPlace={handleEditPlace} />
          </div>
        )}
        {activeTab === 'timeline' && (
          <div className="w-full h-full overflow-hidden">
            <Timeline onEditPlace={handleEditPlace} onGenerateMemory={handleGenerateMemory} />
          </div>
        )}
        {activeTab === 'dashboard' && (
          <div className="w-full h-full overflow-hidden">
            <DashboardStats onGenerateMemory={handleGenerateMemory} />
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="w-full h-full overflow-hidden">
            <SettingsPanel />
          </div>
        )}
      </main>

      {/* ── Country Drawer ─────────────────────────────────────────────── */}
      <CountryPanel />

      {/* ── Bottom Navigation Bar ─────────────────────────────────────── */}
      <nav className="fixed bottom-4 sm:bottom-5 left-1/2 -translate-x-1/2 z-[35] px-1.5 py-1.5 rounded-2xl glass-panel border border-white/10 shadow-2xl backdrop-blur-xl flex items-center gap-0.5 select-none">
        {[
          { id: 'globe', label: 'Globe', icon: Compass },
          { id: 'timeline', label: 'Timeline', icon: Calendar },
          { id: 'dashboard', label: 'Dashboard', icon: Trophy },
          { id: 'settings', label: 'Settings', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`nav-${tab.id}`}
              onClick={() => {
                setActiveTab(tab.id as typeof activeTab);
                if (tab.id !== 'globe') setSelectedCountryCode(null);
              }}
              className={`
                relative min-w-[56px] sm:min-w-[72px] min-h-[48px] px-3 sm:px-5 py-2.5 rounded-xl text-xs font-bold
                flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2
                cursor-pointer transition-all duration-200
                ${isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'}
              `}
            >
              {isActive && (
                <span className="absolute inset-0 rounded-xl bg-indigo-500/20 border border-indigo-500/25 shadow-sm shadow-indigo-500/10" />
              )}
              <Icon className={`relative w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : ''}`} />
              <span className="relative text-[9px] sm:text-xs">{tab.label}</span>
            </button>
          );
        })}
      </nav>


      {/* ── Modals ─────────────────────────────────────────────────────── */}
      {isLogModalOpen && (
        <LogPlaceModal
          onClose={() => setIsLogModalOpen(false)}
          editPlace={editingPlace}
        />
      )}

      {selectedPlaceForMemory && (
        <MemoryConsole
          place={selectedPlaceForMemory}
          onClose={() => setSelectedPlaceForMemory(null)}
        />
      )}

      {/* ── Badge Celebration ──────────────────────────────────────────── */}
      {unlockedBadge && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[55] flex items-center justify-center p-4">
          <div className="p-6 md:p-8 rounded-3xl glass-panel-heavy border border-white/15 max-w-xs text-center flex flex-col items-center gap-4 shadow-2xl animate-in zoom-in-95 duration-250">
            <span className="text-6xl animate-bounce select-none">{unlockedBadge.icon}</span>
            <div>
              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest font-mono flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 fill-current" /> MILESTONE UNLOCKED!
              </span>
              <h3 className="text-lg font-black text-slate-100 mt-1">{unlockedBadge.label}</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">{unlockedBadge.description}</p>
            </div>
            <button
              onClick={() => setUnlockedBadge(null)}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-lg active:scale-95 transition-all"
            >
              Magnificent! ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Route Guard ──────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useTravelStore();

  if (authLoading) {
    return <LoadingScreen message="Checking authentication…" />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useTravelStore();

  if (authLoading) {
    return <LoadingScreen message="Initializing WorldTracker…" />;
  }

  // If already logged in, redirect to app
  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// ─── Root App with Router ─────────────────────────────────────────────────────

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth pages */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginScreen />
            </PublicRoute>
          }
        />

        {/* Email confirmation callback */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected app */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        />

        {/* Catch-all → redirect to home (ProtectedRoute handles auth check) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
