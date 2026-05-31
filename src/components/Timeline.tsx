import { useState, useMemo } from 'react';
import { useTravelStore } from '../store/useTravelStore';
import type { PlaceLog, Trip } from '../types';
import {
  Calendar, Search, Star, Trash2, Edit2, Sparkles, Filter,
  PlusCircle, Compass, ArrowUpDown, Link,
  Globe, Plane, Check, X
} from 'lucide-react';
import { TripMemoryModal } from './TripMemoryModal';

interface TimelineProps {
  onEditPlace: (place: PlaceLog) => void;
  onGenerateMemory: (place: PlaceLog) => void;
  onViewCountry?: (countryCode: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'rating_desc' | 'country_az';

const SORT_LABELS: Record<SortOption, string> = {
  newest: '↓ Newest First',
  oldest: '↑ Oldest First',
  rating_desc: '★ Highest Rated',
  country_az: 'A-Z Country',
};

export const Timeline: React.FC<TimelineProps> = ({ onEditPlace, onGenerateMemory, onViewCountry }) => {
  const { placeLogs, trips, deletePlaceLog, aiMemories, setActiveTab, setSelectedCountryCode } = useTravelStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [minRating, setMinRating] = useState<number | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | 'all'>('all');
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [sortOpen, setSortOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [tripMemoryTarget, setTripMemoryTarget] = useState<Trip | null>(null);

  // Active logs only (non-deleted)
  const activeLogs = useMemo(() => placeLogs.filter(l => !l.deletedAt), [placeLogs]);
  const activeTrips = useMemo(() => trips.filter(t => !t.deletedAt), [trips]);

  // Available years for filter
  const availableYears = useMemo(() => {
    const yrs = Array.from(new Set(activeLogs.map(l => l.visitedAt ? new Date(l.visitedAt).getFullYear().toString() : null).filter(Boolean) as string[]));
    return yrs.sort((a, b) => Number(b) - Number(a));
  }, [activeLogs]);

  // AI memory index for quick badge lookup
  const memoryEntityIds = useMemo(() => new Set(aiMemories.filter(m => !m.deletedAt).map(m => m.entityId)), [aiMemories]);

  // Apply all filters + sort
  const filteredLogs = useMemo(() => {
    let logs = activeLogs.filter(log => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        log.placeName.toLowerCase().includes(q) ||
        log.notes?.toLowerCase().includes(q) ||
        log.cityName?.toLowerCase().includes(q) ||
        log.countryName.toLowerCase().includes(q) ||
        log.tags?.some(t => t.toLowerCase().includes(q));

      // Changed from exact match to minimum threshold
      const matchesRating = minRating === 'all' || (log.rating !== undefined && log.rating >= minRating);
      const matchesYear = selectedYear === 'all' || (log.visitedAt && new Date(log.visitedAt).getFullYear().toString() === selectedYear);

      return matchesSearch && matchesRating && matchesYear;
    });

    switch (sortOption) {
      case 'newest':
        logs = logs.sort((a, b) => (!a.visitedAt ? 1 : !b.visitedAt ? -1 : new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()));
        break;
      case 'oldest':
        logs = logs.sort((a, b) => (!a.visitedAt ? 1 : !b.visitedAt ? -1 : new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime()));
        break;
      case 'rating_desc':
        logs = logs.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'country_az':
        logs = logs.sort((a, b) => a.countryName.localeCompare(b.countryName));
        break;
    }

    return logs;
  }, [activeLogs, searchQuery, minRating, selectedYear, sortOption]);

  // Group by Year (only when sorted newest/oldest)
  const groupedLogs = useMemo(() => {
    const useYearGroups = sortOption === 'newest' || sortOption === 'oldest';
    if (!useYearGroups) return null;
    const map: Record<string, PlaceLog[]> = {};
    filteredLogs.forEach(log => {
      const year = log.visitedAt ? new Date(log.visitedAt).getFullYear().toString() : 'Undated';
      if (!map[year]) map[year] = [];
      map[year].push(log);
    });
    return map;
  }, [filteredLogs, sortOption]);

  const getFlagEmoji = (code: string) => code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');

  const handleDelete = (logId: string) => {
    if (deletingId === logId) {
      deletePlaceLog(logId);
      setDeletingId(null);
    } else {
      setDeletingId(logId);
      // Auto-cancel if not confirmed within 5s
      setTimeout(() => setDeletingId(prev => prev === logId ? null : prev), 5000);
    }
  };

  const handleViewCountry = (countryCode: string) => {
    setSelectedCountryCode(countryCode);
    setActiveTab('globe');
    onViewCountry?.(countryCode);
  };

  const renderPlaceCard = (log: PlaceLog) => {
    const isExpanded = expandedId === log.id;
    const isDeleting = deletingId === log.id;
    const hasMemory = memoryEntityIds.has(log.id);
    const hasPhoto = !!log.photoUrl;
    const hasAlbum = !!log.photoExternalUrl;

    const dateFormatted = log.visitedAt
      ? new Date(log.visitedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
      : 'Date Undefined';

    const dateEnd = log.visitedAtEnd
      ? ` → ${new Date(log.visitedAtEnd).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : '';

    return (
      <div key={log.id} className="relative group">
        {/* Timeline Node */}
        <div className="absolute -left-[41px] md:-left-[57px] top-4 w-6 h-6 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-xs shadow-md group-hover:border-emerald-500/50 group-hover:scale-110 transition-all z-10 select-none">
          {getFlagEmoji(log.countryCode)}
        </div>

        <div
          onClick={() => setExpandedId(isExpanded ? null : log.id)}
          className={`rounded-2xl glass-card text-left cursor-pointer transition-all border select-none overflow-hidden ${isExpanded ? 'bg-slate-900/60 border-white/15 glow-blue' : 'border-white/5'}`}
        >
          {/* Photo hero banner */}
          {hasPhoto && (
            <div className="w-full h-28 sm:h-36 overflow-hidden relative border-b border-white/5 shrink-0">
              <img src={log.photoUrl} alt={log.placeName} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 to-transparent" />
            </div>
          )}

          <div className="p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                {/* Place name + type + badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-slate-100 text-sm hover:text-indigo-300 transition-colors truncate">{log.placeName.split(',')[0]}</h4>
                  <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-slate-400 tracking-wide shrink-0">{log.placeType}</span>
                  {hasMemory && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 flex items-center gap-1 shrink-0">
                      <Sparkles className="w-2.5 h-2.5" /> Memory
                    </span>
                  )}
                  {hasAlbum && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-400 flex items-center gap-1 shrink-0">
                      <Link className="w-2.5 h-2.5" /> Album
                    </span>
                  )}
                </div>

                {/* Date + City */}
                <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400 flex-wrap">
                  <Calendar className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>{dateFormatted}{dateEnd}</span>
                  {log.cityName && (
                    <>
                      <span className="text-slate-600">•</span>
                      <span className="text-indigo-400/80 font-medium">{log.cityName}</span>
                    </>
                  )}
                </div>
              </div>

              {/* Stars */}
              {log.rating && (
                <div className="flex items-center gap-0.5 text-amber-400 shrink-0 self-start">
                  {[1, 2, 3, 4, 5].map(star => {
                    const isFull = star <= Math.floor(log.rating!);
                    const isHalf = star === Math.ceil(log.rating!) && log.rating! % 1 !== 0;
                    return (
                      <span key={star} className="relative w-3.5 h-3.5 flex items-center justify-center">
                        {isHalf ? (
                          <span className="relative w-3.5 h-3.5 block">
                            <Star className="w-3.5 h-3.5 text-slate-700 absolute top-0 left-0" />
                            <span className="absolute top-0 left-0 w-[50%] h-full overflow-hidden block">
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
                            </span>
                          </span>
                        ) : (
                          <Star className={`w-3.5 h-3.5 ${isFull ? 'text-amber-400 fill-current' : 'text-slate-700'}`} />
                        )}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            {log.notes && (
              <p className={`text-slate-400 text-xs leading-relaxed mt-3 pt-3 border-t border-white/5 italic ${isExpanded ? '' : 'line-clamp-2'}`}>
                "{log.notes}"
              </p>
            )}

            {/* Tags */}
            {log.tags && log.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap mt-2.5">
                {log.tags.map((tag, idx) => (
                  <span key={idx} className="text-[9px] font-bold text-indigo-400/80 px-2 py-0.5 rounded-full bg-indigo-500/8 border border-indigo-500/10 tracking-wider">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Expanded action row */}
            {isExpanded && (
              <div onClick={e => e.stopPropagation()} className="mt-4 pt-4 border-t border-white/8 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={() => onGenerateMemory(log)}
                    className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-indigo-500/20 transition-all">
                    <Sparkles className="w-3.5 h-3.5" /> {hasMemory ? 'View AI Memory' : 'AI Souvenir'}
                  </button>
                  <button onClick={() => handleViewCountry(log.countryCode)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-emerald-500/15 transition-all">
                    <Globe className="w-3.5 h-3.5" /> Country AI
                  </button>
                  {hasAlbum && (
                    <a href={log.photoExternalUrl} target="_blank" rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-xs font-semibold flex items-center gap-1.5 cursor-pointer border border-violet-500/15 transition-all">
                      <Link className="w-3.5 h-3.5" /> Photo Album ↗
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                  <button onClick={() => onEditPlace(log)}
                    className="p-2 rounded-xl text-slate-400 hover:bg-white/5 border border-white/5 hover:text-white cursor-pointer transition-all" title="Edit">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Two-step inline delete */}
                  {isDeleting ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleDelete(log.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center gap-1 cursor-pointer border border-red-500/25 hover:bg-red-500/30 transition-all">
                        <Check className="w-3 h-3" /> Move to Bin
                      </button>
                      <button onClick={e => { e.stopPropagation(); setDeletingId(null); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white border border-white/5 cursor-pointer hover:bg-white/5 transition-all">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => handleDelete(log.id)}
                      className="p-2 rounded-xl text-slate-600 hover:text-red-400 hover:bg-red-500/8 border border-white/5 hover:border-red-500/15 cursor-pointer transition-all" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Trip Memory Modal */}
      {tripMemoryTarget && (
        <TripMemoryModal trip={tripMemoryTarget} onClose={() => setTripMemoryTarget(null)} />
      )}

      {/* ── Mobile filter toggle bar ── */}
      <div className="md:hidden flex items-center gap-2 px-4 pt-4 pb-2 shrink-0">
        <button onClick={() => setFiltersOpen(!filtersOpen)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${filtersOpen ? 'bg-indigo-500/20 border-indigo-500/25 text-indigo-400' : 'bg-slate-900/60 border-white/8 text-slate-400 hover:bg-white/5'}`}>
          <Filter className="w-3.5 h-3.5" /> Filters
        </button>
        <div className="relative">
          <button onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900/60 border border-white/8 text-slate-400 hover:bg-white/5 cursor-pointer transition-all">
            <ArrowUpDown className="w-3.5 h-3.5" /> {SORT_LABELS[sortOption].replace(/^[↓↑★] /, '')}
          </button>
          {sortOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setSortOpen(false)} />
              <div className="absolute top-[36px] left-0 z-50 glass-panel-heavy border border-white/10 rounded-xl p-1.5 flex flex-col gap-0.5 w-40 shadow-2xl">
                {Object.entries(SORT_LABELS).map(([k, v]) => (
                  <button key={k} onClick={() => { setSortOption(k as SortOption); setSortOpen(false); }}
                    className={`text-left text-xs px-2.5 py-1.5 rounded-lg font-semibold cursor-pointer transition-all ${sortOption === k ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-400 hover:bg-white/5'}`}>
                    {v}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <span className="text-slate-500 text-[10px] ml-auto font-mono">{filteredLogs.length}/{activeLogs.length}</span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-0 md:gap-6 md:p-6 overflow-hidden">

        {/* ── Filters Sidebar (desktop always visible, mobile collapsible) ── */}
        <div className={`${filtersOpen ? 'flex' : 'hidden'} md:flex md:w-72 shrink-0 flex-col gap-4 p-4 md:p-5 bg-slate-950/40 md:rounded-2xl md:glass-panel md:border md:border-white/8 self-start border-b border-white/5 md:border-b md:border-white/8`}>
          <div className="hidden md:flex items-center gap-2 border-b border-white/5 pb-3">
            <Filter className="w-4 h-4 text-indigo-400" />
            <h3 className="font-bold text-sm text-slate-200 tracking-wide uppercase">Chronicle Filters</h3>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Memories</label>
            <div className="relative">
              <input type="text" placeholder="Search places, notes, tags..."
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full px-3.5 py-2.5 pl-9 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 transition-all" />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-[11px]" />
            </div>
          </div>

          {/* Sort (desktop only) */}
          <div className="hidden md:flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Sort Order
            </label>
            <div className="grid grid-cols-1 gap-1">
              {Object.entries(SORT_LABELS).map(([k, v]) => (
                <button key={k} onClick={() => setSortOption(k as SortOption)}
                  className={`text-left text-xs px-3 py-2 rounded-lg font-semibold cursor-pointer transition-all border ${sortOption === k ? 'bg-indigo-500/15 border-indigo-500/20 text-indigo-300' : 'bg-slate-900/40 text-slate-400 border-white/5 hover:bg-white/5'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Min Rating filter */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Minimum Rating</label>
            <div className="grid grid-cols-6 gap-1">
              <button onClick={() => setMinRating('all')}
                className={`py-2 rounded-lg text-xs font-semibold cursor-pointer border transition-all ${minRating === 'all' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/25' : 'bg-slate-900/40 text-slate-400 border-white/5 hover:bg-white/5'}`}>
                All
              </button>
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} onClick={() => setMinRating(r)}
                  className={`py-2 rounded-lg text-xs font-semibold cursor-pointer border flex items-center justify-center gap-0.5 transition-all ${minRating === r ? 'bg-amber-500/20 text-amber-400 border-amber-500/25' : 'bg-slate-900/40 text-slate-400 border-white/5 hover:bg-white/5'}`}>
                  {r}<Star className="w-2.5 h-2.5 fill-current" />
                </button>
              ))}
            </div>
            {minRating !== 'all' && (
              <p className="text-[9px] text-slate-500">Showing {minRating}★ and above</p>
            )}
          </div>

          {/* Year filter */}
          {availableYears.length > 1 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter by Year</label>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => setSelectedYear('all')}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border transition-all ${selectedYear === 'all' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/25' : 'bg-slate-900/40 text-slate-500 border-white/5 hover:bg-white/5 hover:text-slate-300'}`}>
                  All
                </button>
                {availableYears.map(yr => (
                  <button key={yr} onClick={() => setSelectedYear(yr)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border transition-all ${selectedYear === yr ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/25' : 'bg-slate-900/40 text-slate-500 border-white/5 hover:bg-white/5 hover:text-slate-300'}`}>
                    {yr}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="pt-2 border-t border-white/5 text-[11px] text-slate-500 leading-relaxed">
            Showing <span className="text-slate-300 font-bold">{filteredLogs.length}</span> of {activeLogs.length} memories
            {activeLogs.length === 0 && (
              <button onClick={() => setActiveTab('globe')}
                className="mt-3 w-full py-2.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all text-xs">
                <PlusCircle className="w-3.5 h-3.5" /> Log Your First Memory
              </button>
            )}
          </div>
        </div>

        {/* ── Main Timeline Stream ── */}
        <div className="flex-1 overflow-y-auto px-4 md:px-0 md:pr-2 custom-scrollbar">
          {activeLogs.length === 0 ? (
            <div className="w-full mt-8 flex flex-col items-center justify-center gap-4 glass-panel border border-white/5 rounded-3xl p-10">
              <Compass className="w-12 h-12 text-slate-600 animate-pulse" />
              <h3 className="font-bold text-slate-300">Your travel diary is empty</h3>
              <p className="text-slate-500 text-xs text-center max-w-xs">Go back to the 3D globe and tap '+' to log your first place!</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="w-full mt-8 flex flex-col items-center justify-center gap-3 glass-panel border border-white/5 rounded-3xl p-10">
              <Search className="w-10 h-10 text-slate-600" />
              <h3 className="font-bold text-slate-300">No matching memories</h3>
              <p className="text-slate-500 text-xs text-center">Try adjusting your rating, year, or search query.</p>
            </div>
          ) : (
            <div className="py-4">
              {/* Active Trips Section */}
              {activeTrips.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-4 border-b border-white/5 pb-2">
                    <Plane className="w-4 h-4 text-indigo-400" />
                    <h3 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Logged Trips</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                    {activeTrips.map(trip => {
                      const tripLogs = placeLogs.filter(l => trip.placeLogIds.includes(l.id) && !l.deletedAt);
                      const hasTripMemory = memoryEntityIds.has(trip.id);
                      return (
                        <div key={trip.id} className="p-4 rounded-2xl glass-card border border-white/5 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-100 text-sm truncate">{trip.title}</h4>
                            <p className="text-[10px] text-slate-500 mt-0.5">
                              {tripLogs.length} stop{tripLogs.length !== 1 ? 's' : ''}
                              {trip.startDate && ` · ${new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}`}
                            </p>
                          </div>
                          <button onClick={() => setTripMemoryTarget(trip)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer border transition-all shrink-0 ${hasTripMemory ? 'bg-indigo-500/15 border-indigo-500/20 text-indigo-400' : 'bg-slate-900/60 border-white/8 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/15'}`}>
                            <Sparkles className="w-3.5 h-3.5" />
                            {hasTripMemory ? 'View Trip Memory' : 'AI Trip Memory'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Grouped or flat list */}
              {groupedLogs ? (
                <div className="relative pl-8 md:pl-12 border-l-2 border-slate-800/60 mr-1 md:mr-2">
                  {Object.keys(groupedLogs).map(year => (
                    <div key={year} className="mb-10 relative">
                      <div className="absolute -left-[45px] md:-left-[61px] top-0.5 px-3 py-1 bg-slate-900 border border-slate-700/80 text-[10px] font-black tracking-wider text-slate-300 rounded-full shadow-lg z-10 select-none">
                        {year}
                      </div>
                      <div className="flex flex-col gap-5 pt-8">
                        {groupedLogs[year].map(renderPlaceCard)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-4 pb-4">
                  {filteredLogs.map(renderPlaceCard)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
