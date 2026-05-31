import React from 'react';
import { Globe } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  message = 'Initializing WorldTracker…'
}) => {
  return (
    <div className="fixed inset-0 bg-[#030712] z-[200] flex flex-col items-center justify-center gap-8">
      <div className="stars-bg opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-emerald-950/10 pointer-events-none" />

      {/* Globe logo with rings */}
      <div className="relative flex items-center justify-center">
        {/* Outer pulse ring */}
        <div className="absolute w-24 h-24 rounded-full border border-indigo-500/10 animate-ping" />
        {/* Mid ring */}
        <div className="absolute w-20 h-20 rounded-full border border-indigo-500/15 animate-pulse" />
        {/* Inner glow */}
        <div className="absolute w-16 h-16 rounded-full bg-indigo-600/5 blur-xl animate-pulse" />

        {/* Icon container */}
        <div className="relative p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 shadow-xl shadow-indigo-500/5">
          <Globe className="w-9 h-9 text-indigo-400 animate-slow-rotate" />
        </div>
      </div>

      {/* Brand */}
      <div className="text-center space-y-1.5">
        <h1 className="text-base font-black text-white tracking-[0.25em] uppercase select-none">
          WORLD<span className="text-indigo-400">TRACKER</span>
        </h1>
        <p className="text-slate-600 text-xs font-medium select-none">
          {message}
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-48 h-px bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-600 to-violet-600 loading-bar-animate" />
      </div>
    </div>
  );
};
