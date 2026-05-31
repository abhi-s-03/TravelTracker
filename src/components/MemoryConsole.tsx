import { useState, useEffect, useRef } from 'react';
import { useTravelStore } from '../store/useTravelStore';
import { generateTravelMemory } from '../services/groq';
import type { PlaceLog, Trip } from '../types';
import {
  Sparkles, Calendar, BookOpen, FileText, Download, Edit3,
  Save, RefreshCw, X, Loader2, Key, AlertTriangle, RotateCcw,
  MessageSquare, Image as ImageIcon
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';

interface MemoryConsoleProps {
  place?: PlaceLog | null;
  trip?: Trip | null;
  onClose: () => void;
}

type MemoryGenre = 'postcard' | 'diary' | 'country_story' | 'missed_spots_letter' | 'trip_diary' | 'year_review';

const PLACE_GENRES = [
  { key: 'postcard', label: 'Vintage Postcard', desc: 'Evocative postcard under 150 words', icon: Calendar },
  { key: 'diary', label: 'Travelogue Diary', desc: 'Vivid narrative ideal for journals', icon: BookOpen },
  { key: 'country_story', label: 'Country Memoir', desc: 'Sweeping story of this country visit', icon: FileText },
  { key: 'missed_spots_letter', label: 'Letter from the Unvisited', desc: 'Playful message from places you skipped', icon: Sparkles },
] as const;

const TRIP_GENRES = [
  { key: 'trip_diary', label: 'Trip Travelogue', desc: 'One flowing story of the whole journey', icon: BookOpen },
  { key: 'year_review', label: 'Year in Review', desc: 'Reflective editorial about your travel year', icon: Sparkles },
] as const;

const MOODS = [
  { value: 'nostalgic', label: '🕰️ Nostalgic' },
  { value: 'adventurous', label: '🎒 Adventurous' },
  { value: 'poetic', label: '✍️ Poetic' },
  { value: 'whimsical', label: '🧚 Whimsical' },
  { value: 'humorous', label: '🎭 Humorous' },
];

export const MemoryConsole: React.FC<MemoryConsoleProps> = ({ place, trip, onClose }) => {
  const { aiMemories, addAIMemory, updateAIMemory, settings, placeLogs } = useTravelStore();
  const isTripMode = !!trip && !place;
  const entityName = isTripMode ? (trip?.title || 'Trip') : (place?.placeName.split(',')[0] || '');

  const genres = isTripMode ? (TRIP_GENRES as readonly any[]) : (PLACE_GENRES as readonly any[]);
  const [genre, setGenre] = useState<MemoryGenre>(isTripMode ? 'trip_diary' : 'postcard');
  const [mood, setMood] = useState('nostalgic');
  const [customContext, setCustomContext] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [editedText, setEditedText] = useState('');
  const [activeMemoryId, setActiveMemoryId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Load existing memory
  useEffect(() => {
    const entityId = isTripMode ? trip?.id : place?.id;
    const existing = aiMemories.find(
      m => m.entityId === entityId && m.memoryType === genre && !m.deletedAt
    );
    if (existing) {
      setGeneratedText(existing.generatedText);
      setEditedText(existing.userEditedText || existing.generatedText);
      setActiveMemoryId(existing.id);
      setIsEditing(false);
    } else {
      setGeneratedText('');
      setEditedText('');
      setActiveMemoryId(null);
      setIsEditing(false);
    }
    setError(null);
  }, [place?.id, trip?.id, genre]);

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedText('');
    setEditedText('');
    setError(null);

    try {
      // Build trip context
      const tripLogs = isTripMode && trip
        ? trip.placeLogIds.map(id => placeLogs.find(l => l.id === id && !l.deletedAt)).filter(Boolean) as PlaceLog[]
        : [];

      const contextData = isTripMode
        ? {
            placeNames: tripLogs.map(l => l.placeName),
            dateRange: trip?.startDate && trip?.endDate
              ? `${new Date(trip.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })} → ${new Date(trip.endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`
              : undefined,
          }
        : {
            notes: place?.notes,
            rating: place?.rating,
            tags: place?.tags,
          };

      const { text, model } = await generateTravelMemory(
        genre,
        isTripMode ? (trip?.id || '') : (place?.id || ''),
        entityName,
        contextData,
        { apiKey: settings.groqApiKey, mood, customContext: customContext.trim() || undefined }
      );

      const entityId = isTripMode ? trip?.id : place?.id;
      const saved = addAIMemory({
        entityType: isTripMode ? 'trip' : 'place',
        entityId: entityId || '',
        memoryType: genre,
        promptUsed: `${mood} ${genre} for ${entityName}`,
        generatedText: text,
        modelUsed: model,
        mood,
      });

      // Typewriter streaming
      let wordIndex = 0;
      const words = text.split(' ');
      let currentText = '';
      const interval = setInterval(() => {
        if (wordIndex < words.length) {
          currentText += words[wordIndex] + ' ';
          setGeneratedText(currentText);
          setEditedText(currentText);
          wordIndex++;
        } else {
          clearInterval(interval);
          setGenerating(false);
          setActiveMemoryId(saved.id);
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        }
      }, 22);

    } catch (err: any) {
      setGenerating(false);
      setError(err?.message || 'AI generation failed. Please try again.');
    }
  };

  const handleSaveEdits = () => {
    if (activeMemoryId) {
      updateAIMemory(activeMemoryId, editedText);
      setIsEditing(false);
      confetti({ particleCount: 30, spread: 40, colors: ['#3b82f6', '#10b981'] });
    }
  };

  const handleDownload = async (format: 'pdf' | 'png') => {
    if (!printRef.current) return;
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 p-4 rounded-xl glass-panel-heavy border border-white/10 z-[9999] flex items-center gap-3 text-xs font-bold text-slate-200 shadow-2xl';
    toast.innerHTML = `<svg class="w-4 h-4 text-emerald-400 animate-spin" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" class="opacity-25" /><path fill="currentColor" d="M4 12a8 8 0 018-8v8z" class="opacity-75" /></svg> Rendering High-Res Export…`;
    document.body.appendChild(toast);

    try {
      const isPortrait = genre === 'diary' || (genre as string) === 'life_memoir' || genre === 'trip_diary' || genre === 'year_review';
      const canvas = await html2canvas(printRef.current, {
        scale: 2.5,
        backgroundColor: '#0f172a',
        useCORS: true,
        logging: false,
      });

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `WorldTracker_${entityName.replace(/[^a-z0-9]/gi, '_')}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const imgData = canvas.toDataURL('image/png');
        const w = canvas.width / 2.5;
        const h = canvas.height / 2.5;
        const pdf = new jsPDF({
          orientation: isPortrait ? 'portrait' : 'landscape',
          unit: 'px',
          format: [w, h],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, w, h);
        pdf.save(`WorldTracker_${entityName.replace(/[^a-z0-9]/gi, '_')}.pdf`);
      }
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      document.body.removeChild(toast);
    }
  };

  const getFlagEmoji = (code: string) =>
    code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('');

  const isSimMode = !settings.groqApiKey;
  const photoUrl = !isTripMode ? place?.photoUrl : undefined;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl glass-panel-heavy border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col shadow-2xl animate-in fade-in slide-in-from-bottom-4 sm:zoom-in-95 duration-250 max-h-[95vh] sm:max-h-[90vh]">

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 border border-indigo-500/20">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base leading-tight">AI Travel Souvenir Studio</h3>
              <p className="text-[10px] text-indigo-300 font-mono tracking-wider mt-0.5">
                {isTripMode ? `TRIP: ${entityName.toUpperCase()}` : `PLACE: ${entityName.toUpperCase()}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSimMode && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold">
                <Key className="w-3 h-3" />
                <span>AI PREVIEW — Add Groq key in Settings for live results</span>
              </div>
            )}
            <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:bg-white/5 cursor-pointer transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile sim mode banner */}
        {isSimMode && (
          <div className="sm:hidden flex items-center gap-2 px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-400 text-[10px] font-bold">
            <Key className="w-3 h-3 shrink-0" />
            <span>AI Preview Mode — Add Groq key in Settings for live AI</span>
          </div>
        )}

        {/* Body: Side-by-side on md+, stacked on mobile */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">

          {/* Controls Sidebar */}
          <div className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-white/5 p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto custom-scrollbar bg-slate-950/20">

            {/* Genre selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Writing Style</label>
              <div className="flex flex-col gap-1.5">
                {genres.map((item: any) => {
                  const Icon = item.icon;
                  return (
                    <button key={item.key} onClick={() => setGenre(item.key as MemoryGenre)} disabled={generating}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${genre === item.key ? 'bg-indigo-500/20 border-indigo-500/25 text-indigo-300 glow-blue' : 'bg-slate-900/40 border-white/5 text-slate-400 hover:bg-white/5 hover:border-white/10'}`}>
                      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-bold text-xs leading-tight">{item.label}</h5>
                        <p className="text-[9px] text-slate-500 mt-0.5 leading-normal">{item.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mood */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Literary Mood</label>
              <div className="grid grid-cols-1 gap-1">
                {MOODS.map(m => (
                  <button key={m.value} onClick={() => setMood(m.value)} disabled={generating}
                    className={`px-3 py-2 rounded-lg border text-left text-[11px] font-semibold cursor-pointer transition-all ${mood === m.value ? 'bg-indigo-500/15 border-indigo-500/25 text-indigo-300' : 'bg-slate-900/30 border-white/5 text-slate-400 hover:bg-white/5'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Context */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Your Notes for AI
                <span className="text-slate-600 normal-case font-normal">(optional)</span>
              </label>
              <textarea
                value={customContext}
                onChange={e => setCustomContext(e.target.value)}
                disabled={generating}
                placeholder="Focus on the food, the rainy evening, the rooftop view..."
                className="w-full h-20 p-2.5 bg-slate-950/60 border border-white/8 rounded-xl text-[11px] leading-relaxed text-slate-300 focus:outline-none focus:border-indigo-500/40 resize-none placeholder-slate-600"
              />
              <p className="text-[9px] text-slate-600 leading-relaxed">The AI will use your notes to make the memory personal and specific.</p>
            </div>

            {/* Generate Button */}
            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all">
              {generating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Drafting Souvenir…</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> {activeMemoryId ? 'Generate New Version' : 'Draft AI Souvenir'}</>
              )}
            </button>
            {activeMemoryId && !generating && (
              <p className="text-[9px] text-slate-600 text-center -mt-2">This will replace the current version</p>
            )}
          </div>

          {/* Preview Pane */}
          <div className="flex-1 p-4 sm:p-5 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">

            {error ? (
              /* Error State */
              <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-100 text-sm">Generation Failed</h4>
                  <p className="text-slate-400 text-xs mt-1 max-w-xs leading-relaxed">{error}</p>
                </div>
                <button onClick={handleGenerate}
                  className="px-5 py-2.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-indigo-500/25 transition-all">
                  <RotateCcw className="w-3.5 h-3.5" /> Try Again
                </button>
              </div>
            ) : generating || generatedText ? (
              <div className="flex-1 flex flex-col gap-4 min-h-0">
                {/* Mode controls */}
                <div className="flex items-center justify-between border-b border-white/5 pb-2.5 shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Souvenir Preview</span>
                  {activeMemoryId && !generating && (
                    <button onClick={() => setIsEditing(!isEditing)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer border transition-all ${isEditing ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500/25' : 'bg-slate-900/60 text-slate-400 border-white/5 hover:bg-white/5'}`}>
                      <Edit3 className="w-3.5 h-3.5" /> {isEditing ? 'View Preview' : 'Edit Text'}
                    </button>
                  )}
                </div>

                <div className="flex-1 min-h-0 flex items-start justify-center">
                  {isEditing ? (
                    <textarea value={editedText} onChange={e => setEditedText(e.target.value)}
                      className="w-full h-full min-h-[280px] p-4 bg-slate-950/60 border border-white/10 rounded-2xl text-xs leading-relaxed text-slate-300 focus:outline-none focus:border-indigo-500/50 resize-none font-mono" />
                  ) : (
                    /* Printable souvenir card */
                    <div ref={printRef}
                      className="w-full max-w-lg p-6 bg-[#0b1120] border border-white/10 rounded-2xl flex flex-col gap-4 shadow-2xl relative overflow-hidden">

                      {/* Postcard stamp decoration */}
                      {genre === 'postcard' && (
                        <div className="absolute top-4 right-4 w-12 h-14 border border-dashed border-slate-600 rounded flex flex-col items-center justify-center bg-slate-900 shadow-sm z-10 rotate-2">
                          {place && <span className="text-xs">{getFlagEmoji(place.countryCode)}</span>}
                          <span className="text-[6px] font-black text-slate-500 tracking-wide mt-1">WORLDPOST</span>
                        </div>
                      )}

                      {/* Photo hero if available */}
                      {photoUrl && (
                        <div className="w-full h-36 rounded-xl overflow-hidden border border-white/10 relative shrink-0">
                          <img src={photoUrl} alt={entityName} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#0b1120]/60" />
                          <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[9px] text-white/70 font-bold">
                            <ImageIcon className="w-3 h-3" /> Your photo
                          </div>
                        </div>
                      )}

                      {/* Card header */}
                      <div className={`flex items-start justify-between ${genre === 'postcard' ? 'pr-14' : ''}`}>
                        <div>
                          <h4 className="font-black text-slate-100 text-sm tracking-wide">{entityName}</h4>
                          <p className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold flex items-center gap-1">
                            {!isTripMode && place && <span>{getFlagEmoji(place.countryCode)}</span>}
                            {!isTripMode ? place?.countryName : 'Trip Chronicle'}
                          </p>
                        </div>
                        {!isTripMode && place?.visitedAt && (
                          <p className="text-[9px] text-slate-500 font-mono shrink-0">
                            {new Date(place.visitedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>

                      {/* AI Text Body */}
                      <div className="flex-1 overflow-visible">
                        <p className="text-[11px] leading-relaxed text-slate-300 italic font-medium whitespace-pre-wrap">
                          {editedText}
                          {generating && <span className="inline-block w-1.5 h-3.5 bg-indigo-400 ml-0.5 animate-pulse" />}
                        </p>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-white/5 pt-3 flex items-center justify-between text-[8px] font-mono tracking-widest text-slate-600 font-bold">
                        <span>WORLDTRACKER · COORDINATE MEMORY</span>
                        {!isTripMode && place?.rating && (
                          <span className="text-amber-500 text-[10px]">{'★'.repeat(Math.floor(place.rating))}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Export / Save footer */}
                <div className="shrink-0 flex items-center justify-end gap-2 border-t border-white/5 pt-3.5 flex-wrap">
                  {isEditing ? (
                    <button onClick={handleSaveEdits}
                      className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-emerald-500/20 transition-all">
                      <Save className="w-3.5 h-3.5" /> Save Edits
                    </button>
                  ) : (
                    <>
                      <button onClick={() => handleDownload('png')}
                        className="px-4 py-2 bg-slate-900 hover:bg-white/5 text-slate-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-white/5 transition-all">
                        <Download className="w-3.5 h-3.5" /> PNG
                      </button>
                      <button onClick={() => handleDownload('pdf')}
                        className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 font-bold text-xs rounded-xl flex items-center gap-1.5 cursor-pointer border border-indigo-500/25 transition-all glow-blue">
                        <Download className="w-3.5 h-3.5" /> Export PDF
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* Empty state */
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8 border border-dashed border-white/5 rounded-2xl">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center">
                  <Sparkles className="w-7 h-7 text-indigo-500/60 animate-pulse" />
                </div>
                <h4 className="font-bold text-slate-300 text-sm">Souvenir Board is Empty</h4>
                <p className="text-slate-500 text-xs max-w-xs leading-relaxed">
                  Choose a writing style, set the mood, and optionally add personal notes — then hit <span className="text-indigo-400 font-semibold">Draft AI Souvenir</span> to create your memory.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
