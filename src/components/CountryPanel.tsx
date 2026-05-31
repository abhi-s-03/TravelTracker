import React, { useEffect, useState } from 'react';
import { useTravelStore } from '../store/useTravelStore';
import { generateCountryIntel } from '../services/groq';
import type { CountryIntelligence } from '../types';
import { X, Trophy, Sparkles, Compass, Star, Heart, Calendar, Loader2 } from 'lucide-react';
import confetti from 'canvas-confetti';

export const CountryPanel: React.FC = () => {
  const { 
    selectedCountryCode, 
    setSelectedCountryCode, 
    placeLogs, 
    wishlist,
    addWishlistItem,
    countryIntelligence,
    cacheCountryIntel,
    settings
  } = useTravelStore();

  const [intel, setIntel] = useState<Omit<CountryIntelligence, 'id' | 'generatedAt'> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeLogs = placeLogs.filter(log => !log.deletedAt);
  const countryLogs = activeLogs.filter(log => log.countryCode === selectedCountryCode);
  const countryName = countryLogs[0]?.countryName || selectedCountryCode || '';

  // Calculate country stats
  const totalVisited = countryLogs.length;
  const ratingAverage = totalVisited > 0 
    ? parseFloat((countryLogs.reduce((sum, log) => sum + (log.rating || 0), 0) / countryLogs.filter(l => l.rating).length || 0).toFixed(1))
    : 0;

  // Trigger loading country intelligence
  useEffect(() => {
    if (!selectedCountryCode) {
      setIntel(null);
      return;
    }

    // Check store cache first (7-day TTL check)
    const cached = countryIntelligence[selectedCountryCode];
    if (cached && new Date(cached.expiresAt).getTime() > Date.now()) {
      setIntel(cached);
      return;
    }

    // Fetch new intelligence
    const fetchIntel = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await generateCountryIntel(
          selectedCountryCode,
          countryName || selectedCountryCode,
          countryLogs,
          settings.groqApiKey
        );
        
        // Cache result in store
        const newIntel: CountryIntelligence = {
          ...result,
          id: `intel-${selectedCountryCode}`,
          generatedAt: new Date().toISOString()
        };
        cacheCountryIntel(newIntel);
        setIntel(newIntel);
      } catch (err) {
        console.error(err);
        setError('Failed to gather AI Intelligence. Please check your network or Groq Key.');
      } finally {
        setLoading(false);
      }
    };

    fetchIntel();
  }, [selectedCountryCode, countryName]);

  if (!selectedCountryCode) return null;

  // Add missed spot to wishlist
  const handleAddToWishlist = (spot: { name: string; description: string }) => {
    // Check if already in wishlist
    const exists = wishlist.some(w => w.placeName.toLowerCase() === spot.name.toLowerCase() && !w.deletedAt);
    if (exists) return;

    // Approximate coordinate based on country centroid (or general offset)
    // We will place it nearby the country average or guess coordinates
    const baseLat = countryLogs[0]?.latitude || 20;
    const baseLng = countryLogs[0]?.longitude || 0;
    
    // Add small random noise to prevent stacking wishlists in the exact same spot
    const offsetLat = baseLat + (Math.random() - 0.5) * 2;
    const offsetLng = baseLng + (Math.random() - 0.5) * 2;

    addWishlistItem({
      placeName: spot.name,
      countryCode: selectedCountryCode,
      latitude: offsetLat,
      longitude: offsetLng,
      priority: 1, // High priority
      notes: spot.description,
      aiSuggestionSource: 'country_panel'
    });

    // Fire tiny celebrate confetti!
    confetti({
      particleCount: 40,
      spread: 60,
      origin: { y: 0.8 }
    });
  };

  const getFlagEmoji = (code: string) => {
    return code
      .toUpperCase()
      .split('')
      .map(char => String.fromCodePoint(127397 + char.charCodeAt(0)))
      .join('');
  };

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[480px] glass-panel-heavy border-l border-white/10 z-40 flex flex-col shadow-2xl animate-in slide-in-from-right duration-350 overflow-hidden">
      {/* Drawer Header */}
      <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/40">
        <div className="flex items-center gap-2">
          <span className="text-2xl select-none">{getFlagEmoji(selectedCountryCode)}</span>
          <div>
            <h3 className="font-bold text-slate-100 tracking-wide text-sm md:text-base">
              {countryName || 'Explore Country'}
            </h3>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider">COUNTRY INTELLIGENCE REPORT</p>
          </div>
        </div>
        <button 
          onClick={() => setSelectedCountryCode(null)}
          className="p-2 rounded-xl text-slate-400 hover:bg-white/5 cursor-pointer transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-6">
        
        {/* Your stats card */}
        <div className="p-4 rounded-2xl glass-card border border-white/5 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
            <Trophy className="w-3.5 h-3.5" /> Your Profile Stats
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
              <span className="text-xl font-black text-slate-100 font-mono">{totalVisited}</span>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Places Logged</p>
            </div>
            
            <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5">
              <span className="text-xl font-black text-slate-100 font-mono flex items-center justify-center gap-1">
                {ratingAverage || '-'} <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              </span>
              <p className="text-[10px] text-slate-500 font-semibold mt-1">Average Rating</p>
            </div>
          </div>

          {/* List items logged */}
          {totalVisited > 0 ? (
            <div className="flex flex-col gap-1.5 pt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logged Coordinates</span>
              <div className="flex flex-wrap gap-1.5">
                {countryLogs.map((log) => (
                  <span key={log.id} className="text-[10px] font-medium text-slate-300 px-2.5 py-1 rounded-lg bg-slate-900 border border-white/5">
                    📍 {log.placeName.split(',')[0]}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic mt-1 text-center">You have not logged any coordinates in this country yet.</p>
          )}
        </div>

        {/* AI Missed Spots Section */}
        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" /> AI Intelligence Explorer
            </div>
            {!settings.groqApiKey && (
              <span className="text-[9px] font-bold text-slate-500 px-2 py-0.5 rounded-full border border-white/5 font-mono">
                SIMULATION MODE
              </span>
            )}
          </div>

          {loading ? (
            <div className="h-60 flex flex-col items-center justify-center gap-3 glass-panel rounded-2xl border border-white/5 p-8 text-center animate-pulse">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <h4 className="text-slate-200 text-xs font-bold">Scanning Global Archives...</h4>
              <p className="text-slate-500 text-[10px] max-w-xs">
                Analyzing unexplored geographical nodes and plotting high-density tourist clusters.
              </p>
            </div>
          ) : error ? (
            <div className="p-5 text-center bg-red-950/20 border border-red-500/20 rounded-2xl">
              <p className="text-xs text-red-300">{error}</p>
            </div>
          ) : intel ? (
            <div className="flex flex-col gap-5">
              
              {/* Coverage speed dial */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/5 to-indigo-500/5 border border-white/5 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <h4 className="font-bold text-slate-200 text-xs tracking-wide">Country Coverage Score</h4>
                  <p className="text-slate-400 text-[10px] leading-normal mt-0.5">
                    Based on your visited destinations compared against standard national travel scorecards.
                  </p>
                </div>

                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" className="stroke-slate-800" strokeWidth="4" fill="transparent" />
                    <circle 
                      cx="32" 
                      cy="32" 
                      r="28" 
                      className="stroke-emerald-400 glow-emerald" 
                      strokeWidth="4" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 28}
                      strokeDashoffset={2 * Math.PI * 28 * (1 - intel.coverageScore / 100)}
                    />
                  </svg>
                  <span className="absolute text-xs font-black text-slate-100 font-mono">{intel.coverageScore}%</span>
                </div>
              </div>

              {/* List of Missed Spots */}
              <div className="flex flex-col gap-3">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Top 5 Unexplored spots</span>
                <div className="flex flex-col gap-3">
                  {intel.missedSpots.map((spot, idx) => {
                    const isWishlisted = wishlist.some(w => w.placeName.toLowerCase() === spot.name.toLowerCase() && !w.deletedAt);
                    return (
                      <div key={idx} className="p-3.5 rounded-xl bg-slate-950/30 border border-white/5 hover:border-white/10 transition-all flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <h5 className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                            <span className="text-indigo-400 font-mono">{idx + 1}.</span> {spot.name}
                          </h5>
                          <p className="text-slate-400 text-[10px] mt-0.5 leading-normal">{spot.description}</p>
                          <p className="text-slate-500 italic text-[10px] mt-1.5 leading-relaxed pt-1.5 border-t border-white/5">
                            💡 {spot.whyVisit}
                          </p>
                        </div>

                        <button 
                          onClick={() => handleAddToWishlist(spot)}
                          disabled={isWishlisted}
                          className={`p-2 rounded-xl border shrink-0 transition-all cursor-pointer flex items-center justify-center ${isWishlisted ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:text-amber-400 hover:bg-white/5 hover:border-white/10'}`}
                          title={isWishlisted ? 'Added to Wishlist' : 'Add to Wishlist'}
                        >
                          <Heart className={`w-3.5 h-3.5 ${isWishlisted ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Day Itinerary */}
              {intel.suggestedRoute && (
                <div className="p-4 rounded-2xl glass-card border border-white/5 flex flex-col gap-2 bg-slate-950/20">
                  <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider border-b border-white/5 pb-2">
                    <Compass className="w-3.5 h-3.5" /> AI 3-Day Custom Route
                  </div>
                  <div className="text-[11px] text-slate-350 leading-relaxed font-normal custom-scrollbar max-h-80 overflow-y-auto pr-1">
                    {intel.suggestedRoute.split('\n').map((line, idx) => {
                      if (line.startsWith('###')) {
                        return null; // hide header
                      }
                      if (line.startsWith('*   **Day')) {
                        const dayPart = line.match(/\*\*Day \d+:[^*]+\*\*/)?.[0] || 'Day Itinerary';
                        const textPart = line.replace(/\*   \*\*Day \d+:[^*]+\*\*/, '');
                        return (
                          <div key={idx} className="mb-3.5">
                            <h6 className="font-bold text-slate-200 flex items-center gap-1.5 text-xs text-indigo-300">
                              <Calendar className="w-3 h-3 text-indigo-400 shrink-0" /> {dayPart.replace(/\*\*/g, '')}
                            </h6>
                            <p className="mt-1 text-slate-400 pl-4.5">{textPart}</p>
                          </div>
                        );
                      }
                      return <p key={idx} className="my-1.5">{line}</p>;
                    })}
                  </div>
                </div>
              )}

            </div>
          ) : (
            <p className="text-xs text-slate-500 italic mt-4 text-center">No intelligence profile generated yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};
