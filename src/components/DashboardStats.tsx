import { useState, useEffect } from 'react';
import { useTravelStore } from '../store/useTravelStore';
import type { PlaceLog } from '../types';
import { Trophy, Globe, MapPin, Sparkles, Calendar, Clock, Compass, Star, Trash2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DashboardStatsProps {
  onGenerateMemory: (place: PlaceLog) => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ onGenerateMemory }) => {
  const { placeLogs, badges, aiMemories, wishlist, user, deleteWishlistItem } = useTravelStore();

  const [onThisDayMatches, setOnThisDayMatches] = useState<PlaceLog[]>([]);

  // Active data
  const activeLogs = placeLogs.filter(log => !log.deletedAt);
  const activeWishlist = wishlist.filter(w => !w.deletedAt);

  // Stats
  const totalLogs = activeLogs.length;
  const uniqueCountries = new Set(activeLogs.map(l => l.countryCode)).size;
  const uniqueCities = new Set(activeLogs.map(l => l.cityName).filter(Boolean)).size;
  const totalMemories = aiMemories.filter(m => !m.deletedAt).length;
  const worldPercent = parseFloat(((uniqueCountries / 195) * 100).toFixed(1));

  // On This Day
  useEffect(() => {
    const today = new Date();
    const matches = activeLogs.filter(log => {
      if (!log.visitedAt) return false;
      const d = new Date(log.visitedAt);
      return d.getFullYear() !== today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    });
    setOnThisDayMatches(matches);
  }, [placeLogs]);

  const handleBadgeClick = (badge: any) => {
    if (badge.earnedAt) {
      confetti({ particleCount: 50, spread: 50, colors: ['#a78bfa', '#ec4899', '#f59e0b'] });
    }
  };

  const getFlagEmoji = (code: string) => code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');

  return (
    <div className="w-full h-full p-4 sm:p-6 overflow-y-auto custom-scrollbar flex flex-col gap-5 max-w-5xl mx-auto">

      {/* Welcome HUD */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-emerald-500/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl relative overflow-hidden shrink-0">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-500/10 to-transparent pointer-events-none" />
        <div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-black text-slate-100 tracking-wide">
            Welcome back, {user?.displayName || 'Explorer'} 🌍
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm mt-1 leading-normal">
            Your travel coordinate ledger is active. You've mapped {worldPercent}% of the world.
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-white/10 rounded-2xl shadow-xl shrink-0 self-start sm:self-center">
          <Globe className="w-4 h-4 text-emerald-400 animate-slow-rotate" />
          <span className="text-xs font-bold text-slate-200 font-mono tracking-wider">{worldPercent}% WORLD MAPPED</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 shrink-0">
        {[
          { label: 'Countries Mapped', val: uniqueCountries, color: 'text-emerald-400 border-emerald-500/15', icon: Globe },
          { label: 'Cities Cataloged', val: uniqueCities, color: 'text-indigo-400 border-indigo-500/15', icon: MapPin },
          { label: 'Coordinate Logs', val: totalLogs, color: 'text-purple-400 border-purple-500/15', icon: Compass },
          { label: 'AI Souvenirs', val: totalMemories, color: 'text-amber-400 border-amber-500/15', icon: Sparkles },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className={`p-4 rounded-2xl glass-card border flex items-center justify-between gap-3 ${item.color}`}>
              <div>
                <span className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.label}</span>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-100 font-mono mt-1">{item.val}</h3>
              </div>
              <div className="p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-white/5 shrink-0">
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Badges */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-white/5 pb-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Travel Milestones</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {badges.map(badge => {
              const isEarned = !!badge.earnedAt;
              const progress = badge.progress ?? 0;
              const target = badge.target ?? 1;
              const pct = Math.min(100, Math.round((progress / target) * 100));

              return (
                <div
                  key={badge.key}
                  onClick={() => handleBadgeClick(badge)}
                  className={`p-4 rounded-2xl border text-left flex items-start gap-3 transition-all select-none ${isEarned ? 'glass-panel border-white/10 cursor-pointer hover:scale-[1.02] glow-purple' : 'bg-slate-950/20 border-white/5 opacity-60'}`}
                >
                  <span className="text-2xl shrink-0 select-none">{badge.icon}</span>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-slate-100 text-xs">{badge.label}</h5>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{badge.description}</p>
                    {isEarned ? (
                      <span className="text-[8px] font-mono text-indigo-400 mt-1.5 font-bold block uppercase tracking-wider">✓ UNLOCKED</span>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-slate-500 shrink-0">{progress}/{target}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Flashbacks + Wishlist */}
        <div className="lg:col-span-2 flex flex-col gap-5">

          {/* Travel Flashbacks */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Travel Flashbacks</h3>
            </div>

            {onThisDayMatches.length > 0 ? (
              <div className="flex flex-col gap-3">
                {onThisDayMatches.map(log => {
                  const yearsAgo = new Date().getFullYear() - new Date(log.visitedAt!).getFullYear();
                  return (
                    <div key={log.id} className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 flex flex-col gap-3">
                      <span className="text-[9px] font-bold text-indigo-400 uppercase font-mono flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> ON THIS DAY — {yearsAgo} {yearsAgo === 1 ? 'YEAR' : 'YEARS'} AGO
                      </span>
                      <div>
                        <h4 className="font-bold text-slate-100 text-sm">📍 {log.placeName.split(',')[0]}</h4>
                        <p className="text-slate-400 text-xs mt-0.5">{log.countryName}</p>
                        {log.notes && <p className="text-slate-400 text-xs italic mt-2 border-t border-white/5 pt-2 leading-relaxed">"{log.notes}"</p>}
                      </div>
                      <button onClick={() => onGenerateMemory(log)}
                        className="py-2 px-3 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-semibold flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-500/20 transition-all text-xs">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> Write AI Memory for this Day
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-5 text-center glass-panel border border-white/5 rounded-2xl flex flex-col items-center gap-2">
                <Clock className="w-7 h-7 text-slate-700 animate-pulse" />
                <h5 className="font-bold text-slate-400 text-xs">No Flashbacks Today</h5>
                <p className="text-slate-600 text-[10px] max-w-[200px] leading-relaxed">
                  Keep logging trips to unlock daily travel flashbacks on their anniversaries!
                </p>
              </div>
            )}
          </div>

          {/* Dream Destinations (Wishlist) */}
          {activeWishlist.length > 0 && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <Star className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs text-slate-200 uppercase tracking-wider">Dream Destinations</h3>
                <span className="ml-auto text-[9px] font-mono text-slate-500">{activeWishlist.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {activeWishlist.slice(0, 5).map(item => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-950/40 border border-white/5 hover:border-amber-500/15 transition-all group">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm select-none shrink-0">{getFlagEmoji(item.countryCode)}</span>
                      <div className="min-w-0">
                        <p className="font-bold text-slate-200 text-xs truncate">{item.placeName}</p>
                        {item.notes && <p className="text-slate-500 text-[9px] truncate">{item.notes}</p>}
                      </div>
                    </div>
                    <button onClick={() => deleteWishlistItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-700 group-hover:text-red-400 group-hover:bg-red-500/10 cursor-pointer transition-all shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {activeWishlist.length > 5 && (
                  <p className="text-[9px] text-slate-500 text-center font-mono">+{activeWishlist.length - 5} more in your wishlist</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
