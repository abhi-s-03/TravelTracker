import { useState, useEffect, useRef } from 'react';
import { useTravelStore } from '../store/useTravelStore';
import { searchPlaces } from '../services/geocoding';
import { uploadPhoto } from '../services/supabase';
import type { GeocodeResult } from '../services/geocoding';
import {
  X, Search, Calendar, Star, Tag, Compass, MapPin, Plus,
  Loader2, ChevronLeft, ChevronRight, Image, Link, Eye, EyeOff, Trash2
} from 'lucide-react';
import confetti from 'canvas-confetti';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

interface LogPlaceModalProps {
  onClose: () => void;
  editPlace?: any;
}

interface CalendarPickerProps {
  label: string;
  value: string;
  onChange: (date: string) => void;
  maxDate?: string;
  minDate?: string;
}

const CalendarPicker: React.FC<CalendarPickerProps> = ({ label, value, onChange, maxDate, minDate }) => {
  const [open, setOpen] = useState(false);
  const [calMonth, setCalMonth] = useState(() => value ? new Date(value + 'T00:00:00').getMonth() : new Date().getMonth());
  const [calYear, setCalYear] = useState(() => value ? new Date(value + 'T00:00:00').getFullYear() : new Date().getFullYear());

  const displayVal = value
    ? new Date(value + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : 'Select date';

  return (
    <div className="flex flex-col gap-1.5 relative">
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
        <Calendar className="w-3.5 h-3.5 text-slate-500" /> {label}
      </label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 flex items-center justify-between cursor-pointer hover:border-white/20 transition-all text-left h-[42px] focus:outline-none focus:border-indigo-500/50"
      >
        <span className={value ? 'text-slate-200' : 'text-slate-500'}>{displayVal}</span>
        <Calendar className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-[68px] left-0 z-50 w-72 glass-panel-heavy border border-white/12 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl select-none">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/5 pb-2 text-xs font-black text-slate-100">
              <button type="button" onClick={() => { calMonth === 0 ? (setCalMonth(11), setCalYear(y => y - 1)) : setCalMonth(m => m - 1); }}
                className="p-1 rounded hover:bg-white/5 cursor-pointer text-slate-400 hover:text-slate-200">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <div className="flex items-center gap-1">
                <select value={calMonth} onChange={e => setCalMonth(Number(e.target.value))}
                  className="bg-transparent hover:bg-white/5 px-1.5 py-0.5 rounded-lg text-slate-200 font-bold border-0 cursor-pointer focus:outline-none text-xs">
                  {MONTH_NAMES.map((m, i) => <option key={m} value={i} className="bg-slate-950 text-slate-200">{m}</option>)}
                </select>
                <input type="number" value={calYear} onChange={e => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) setCalYear(v); }}
                  min={1900} max={new Date().getFullYear() + 5}
                  className="bg-white/5 hover:bg-white/10 px-1.5 py-0.5 rounded-lg text-slate-200 font-bold border border-white/10 w-16 text-center focus:outline-none text-xs focus:border-indigo-500/50" />
              </div>
              <button type="button" onClick={() => { calMonth === 11 ? (setCalMonth(0), setCalYear(y => y + 1)) : setCalMonth(m => m + 1); }}
                className="p-1 rounded hover:bg-white/5 cursor-pointer text-slate-400 hover:text-slate-200">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 mt-2 text-center text-[9px] font-black text-slate-500 uppercase tracking-wider">
              {WEEK_DAYS.map(d => <div key={d} className="py-0.5">{d}</div>)}
            </div>
            {/* Day grid */}
            <div className="grid grid-cols-7 gap-1 mt-1 text-center">
              {(() => {
                const days = getDaysInMonth(calYear, calMonth);
                const firstDay = getFirstDayOfMonth(calYear, calMonth);
                const cells = [];
                for (let i = 0; i < firstDay; i++) cells.push(<div key={`pad-${i}`} className="h-7 w-7" />);
                for (let d = 1; d <= days; d++) {
                  const ds = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const isSelected = value === ds;
                  const isToday = new Date().toISOString().split('T')[0] === ds;
                  const isDisabled = !!((maxDate && ds > maxDate) || (minDate && ds < minDate));
                  cells.push(
                    <button key={`day-${d}`} type="button" onClick={() => { if (!isDisabled) { onChange(ds); setOpen(false); } }}
                      disabled={isDisabled}
                      className={`h-7 w-7 rounded-full text-[10px] font-bold flex items-center justify-center cursor-pointer transition-all
                        ${isDisabled ? 'text-slate-700 cursor-not-allowed' : ''}
                        ${isSelected ? 'bg-indigo-600 text-white font-black scale-105' : isToday ? 'border border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/10' : !isDisabled ? 'text-slate-300 hover:bg-white/5' : ''}`}>
                      {d}
                    </button>
                  );
                }
                return cells;
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export const LogPlaceModal: React.FC<LogPlaceModalProps> = ({ onClose, editPlace }) => {
  const { addPlaceLog, updatePlaceLog, user, settings } = useTravelStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodeResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<GeocodeResult | null>(null);

  // Form Fields
  const [visitedAt, setVisitedAt] = useState(new Date().toISOString().split('T')[0]);
  const [visitedAtEnd, setVisitedAtEnd] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [notes, setNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<'friends' | 'private'>(settings.defaultVisibility);

  // Photo state
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [photoExternalUrl, setPhotoExternalUrl] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<any>(null);

  useEffect(() => {
    if (editPlace) {
      setSelectedLocation({
        placeName: editPlace.placeName,
        placeType: editPlace.placeType,
        countryCode: editPlace.countryCode,
        countryName: editPlace.countryName,
        stateName: editPlace.stateName,
        cityName: editPlace.cityName,
        latitude: editPlace.latitude,
        longitude: editPlace.longitude
      });
      setVisitedAt(editPlace.visitedAt || new Date().toISOString().split('T')[0]);
      setVisitedAtEnd(editPlace.visitedAtEnd || '');
      setRating(editPlace.rating ?? 5);
      setNotes(editPlace.notes || '');
      setTags(editPlace.tags || []);
      setVisibility(editPlace.visibility || settings.defaultVisibility);
      setPhotoPreview(editPlace.photoUrl || '');
      setPhotoExternalUrl(editPlace.photoExternalUrl || '');
    }
  }, [editPlace]);

  const handleStarClick = (starVal: number) => {
    if (rating === starVal) setRating(0);
    else setRating(starVal);
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 3) { setSearchResults([]); return; }
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setSearching(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        const results = await searchPlaces(val);
        setSearchResults(results);
      } catch (err) {
        console.error(err);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  const handleAddTag = (input?: string) => {
    const raw = (input ?? tagInput).toLowerCase().replace(/#/g, '');
    // Support comma-separated tags
    const newTags = raw.split(',').map(t => t.trim()).filter(t => t && !tags.includes(t));
    if (newTags.length > 0) {
      setTags(prev => [...prev, ...newTags]);
      setTagInput('');
    }
  };

  const handlePhotoSelect = (file: File) => {
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = e => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = async () => {
    if (!selectedLocation) return;

    let finalPhotoUrl = editPlace?.photoUrl || '';

    // Upload new photo if selected
    if (photoFile && user) {
      setUploadingPhoto(true);
      const logId = editPlace?.id || `log-${Date.now()}`;
      const url = await uploadPhoto(photoFile, user.id, logId);
      if (url) finalPhotoUrl = url;
      setUploadingPhoto(false);
    }

    const placeLogData = {
      placeName: selectedLocation.placeName,
      placeType: selectedLocation.placeType as any,
      countryCode: selectedLocation.countryCode,
      countryName: selectedLocation.countryName,
      stateName: selectedLocation.stateName,
      cityName: selectedLocation.cityName,
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
      visitedAt: visitedAt || undefined,
      visitedAtEnd: visitedAtEnd || undefined,
      rating: rating > 0 ? rating : undefined,
      notes: notes || undefined,
      tags: tags.length > 0 ? tags : undefined,
      visibility,
      photoUrl: finalPhotoUrl || undefined,
      photoExternalUrl: photoExternalUrl || undefined,
    };

    if (editPlace) {
      updatePlaceLog(editPlace.id, placeLogData);
    } else {
      addPlaceLog(placeLogData);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
    }

    onClose();
  };

  const getFlagEmoji = (code: string) =>
    code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-xl glass-panel-heavy border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 max-h-[95vh] sm:max-h-[90vh]">

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20">
              <MapPin className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight">
                {editPlace ? 'Edit Travel Memory' : 'Log a Visited Place'}
              </h3>
              <p className="text-[10px] text-slate-500 font-mono tracking-wider mt-0.5">
                {editPlace ? 'UPDATE PIN DATA' : 'DROP NEW COORDINATE PIN'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-white/5 cursor-pointer transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 custom-scrollbar flex flex-col gap-4">

          {/* Search block */}
          {!editPlace && (
            <div className="flex flex-col gap-1.5 relative">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Search Location</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Kyoto, Eiffel Tower, Costa Rica..."
                  value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  className="w-full px-3.5 py-3 pl-9 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
                {searching ? <Loader2 className="w-4 h-4 text-indigo-400 absolute left-3 top-3.5 animate-spin" /> : <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />}
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-[66px] left-0 w-full glass-panel border border-white/10 rounded-xl max-h-60 overflow-y-auto z-50 custom-scrollbar shadow-2xl p-1.5 flex flex-col gap-1">
                  {searchResults.map((res, idx) => (
                    <button key={idx} onClick={() => { setSelectedLocation(res); setSearchResults([]); setSearchQuery(''); }}
                      className="w-full p-2.5 rounded-lg text-left cursor-pointer transition-all hover:bg-white/5 flex items-start gap-2.5">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <h5 className="font-bold text-xs text-slate-200 truncate">{res.placeName.split(',')[0]}</h5>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {res.countryCode && (
                            <span className="text-[9px] text-slate-300">{getFlagEmoji(res.countryCode)} {res.countryName}</span>
                          )}
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 border border-white/5 text-slate-400 capitalize">{res.placeType}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Selected Location HUD */}
          {selectedLocation ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/8 to-indigo-500/8 border border-white/10 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider font-mono">SELECTED LOCATION</span>
                <h4 className="font-bold text-slate-100 text-sm mt-0.5 leading-snug truncate">{selectedLocation.placeName.split(',')[0]}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-slate-400 text-[10px]">{getFlagEmoji(selectedLocation.countryCode)} {selectedLocation.countryName}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800/60 border border-white/5 text-slate-400 capitalize">{selectedLocation.placeType}</span>
                </div>
                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-600 font-mono">
                  <span>LAT: {selectedLocation.latitude.toFixed(4)}</span>
                  <span>LNG: {selectedLocation.longitude.toFixed(4)}</span>
                </div>
              </div>
              <Compass className="w-9 h-9 text-emerald-500/20 shrink-0 animate-slow-rotate" />
            </div>
          ) : (
            <div className="p-5 text-center border border-dashed border-white/8 rounded-2xl flex flex-col items-center justify-center gap-2">
              <Compass className="w-8 h-8 text-slate-700" />
              <p className="text-slate-500 text-xs">Search and select a location above to begin.</p>
            </div>
          )}

          {selectedLocation && (
            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">

              {/* Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CalendarPicker label="Visit Start Date" value={visitedAt} onChange={setVisitedAt} maxDate={visitedAtEnd || new Date().toISOString().split('T')[0]} />
                <CalendarPicker label="End Date (optional)" value={visitedAtEnd} onChange={setVisitedAtEnd} minDate={visitedAt} />
              </div>

              {/* Star Rating */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-slate-500" /> Star Rating
                  {rating > 0 && <span className="ml-1 text-amber-400 font-mono">{rating}/5</span>}
                </label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-slate-950/40 border border-white/5 rounded-xl h-[46px]">
                  {[1, 2, 3, 4, 5].map(star => {
                    const isFull = star <= Math.floor(rating);
                    const isHalf = star === Math.ceil(rating) && rating % 1 !== 0;
                    return (
                      <button key={star} type="button" onClick={() => handleStarClick(star)}
                        className="cursor-pointer transition-all hover:scale-125 active:scale-95 w-7 h-7 flex items-center justify-center shrink-0">
                        {isHalf ? (
                          <span className="relative w-6 h-6 block">
                            <Star className="w-6 h-6 text-slate-700 absolute top-0 left-0" />
                            <span className="absolute top-0 left-0 w-[50%] h-full overflow-hidden block">
                              <Star className="w-6 h-6 text-amber-400 fill-current" />
                            </span>
                          </span>
                        ) : (
                          <Star className={`w-6 h-6 ${isFull ? 'text-amber-400 fill-current' : 'text-slate-700'}`} />
                        )}
                      </button>
                    );
                  })}
                  {rating > 0 && (
                    <button type="button" onClick={() => setRating(0)} className="ml-auto text-[9px] text-slate-600 hover:text-slate-400 transition-colors cursor-pointer">Clear</button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Diary Notes</label>
                <textarea
                  placeholder="What did you do? What did you eat? Memorable moments..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={1000}
                  className="w-full h-24 p-3.5 bg-slate-950/60 border border-white/10 rounded-2xl text-xs leading-relaxed text-slate-300 focus:outline-none focus:border-indigo-500/50 resize-none"
                />
                <span className="text-[9px] text-slate-600 font-mono text-right">{notes.length}/1000</span>
              </div>

              {/* Tags */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500" /> Travel Tags
                  <span className="text-slate-600 normal-case font-normal ml-1">(comma-separate for multiple)</span>
                </label>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. food, solo, beach"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                    className="flex-1 px-3.5 py-2 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-indigo-500/50" />
                  <button type="button" onClick={() => handleAddTag()}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 border border-white/5 text-slate-300 text-xs font-bold hover:bg-white/5 cursor-pointer active:scale-95 transition-all">
                    Add
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {tags.map((tag, idx) => (
                      <span key={idx} className="text-[9px] font-bold text-indigo-400 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/15 flex items-center gap-1">
                        #{tag}
                        <button type="button" onClick={() => setTags(tags.filter((_, i) => i !== idx))} className="hover:text-red-400 font-bold ml-0.5 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Photo Section */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Image className="w-3.5 h-3.5 text-slate-500" /> Cover Photo
                  <span className="text-slate-600 normal-case font-normal ml-1">(optional, max 5MB)</span>
                </label>

                {photoPreview ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 group">
                    <img src={photoPreview} alt="Preview" className="w-full h-40 object-cover" />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button type="button" onClick={handleRemovePhoto}
                        className="p-2 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 cursor-pointer hover:bg-red-500/30 transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <label className="p-2 rounded-xl bg-white/10 border border-white/15 text-slate-300 cursor-pointer hover:bg-white/15 transition-all">
                        <Image className="w-4 h-4" />
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                          onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
                      </label>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-3 p-6 border-2 border-dashed border-white/10 rounded-2xl hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                    <Image className="w-6 h-6 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    <div className="text-center">
                      <p className="text-xs font-semibold text-slate-400 group-hover:text-slate-300 transition-colors">Click to add a photo</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">JPG, PNG, WEBP · Auto-compressed to 800px</p>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
                  </label>
                )}

                {/* External Photo Album URL */}
                <div className="flex items-center gap-2 mt-1">
                  <Link className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <input type="url" placeholder="Link photo album (Google Drive, iCloud, Dropbox...)"
                    value={photoExternalUrl}
                    onChange={e => setPhotoExternalUrl(e.target.value)}
                    className="flex-1 px-3 py-2 bg-slate-950/60 border border-white/8 rounded-xl text-[11px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50" />
                </div>
              </div>

              {/* Visibility Toggle */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  {visibility === 'friends' ? <Eye className="w-3.5 h-3.5 text-slate-500" /> : <EyeOff className="w-3.5 h-3.5 text-slate-500" />}
                  Visibility
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['friends', 'private'] as const).map(v => (
                    <button key={v} type="button" onClick={() => setVisibility(v)}
                      className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${visibility === v ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-300'}`}>
                      {v === 'friends' ? <><Eye className="w-3 h-3" /> Friends</> : <><EyeOff className="w-3 h-3" /> Private</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <button type="button" onClick={handleSave} disabled={uploadingPhoto}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer hover:brightness-110 active:scale-[0.98] transition-all mt-1 shadow-lg disabled:opacity-60">
                {uploadingPhoto ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Uploading Photo...</>
                ) : (
                  <><Plus className="w-4 h-4" /> {editPlace ? 'Update Memory' : 'Drop Coordinate Pin'}</>
                )}
              </button>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
