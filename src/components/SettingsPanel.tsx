import React, { useState } from 'react';
import { useTravelStore } from '../store/useTravelStore';
import {
  Settings, Download, Upload, Trash2, Globe, Palette, Eye, CheckCircle2,
  AlertCircle, Info, Key, RotateCcw, Zap, ExternalLink, Lock, EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';

export const SettingsPanel: React.FC = () => {
  const { settings, updateSettings, exportData, importData, clearAllData, user, placeLogs, restorePlaceLog } = useTravelStore();
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error' | null; msg: string }>({ type: null, msg: '' });
  const [groqKeyInput, setGroqKeyInput] = useState(settings.groqApiKey || '');
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [testingGroq, setTestingGroq] = useState(false);
  const [groqTestResult, setGroqTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const deletedLogs = placeLogs.filter(l => !!l.deletedAt);

  const handleExport = () => {
    const dataStr = exportData();
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `WorldTracker_Backup_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        const ok = importData(result);
        if (ok) {
          setImportStatus({ type: 'success', msg: 'Travel ledger successfully restored!' });
          confetti({ particleCount: 60, spread: 60 });
        } else {
          setImportStatus({ type: 'error', msg: 'Invalid backup file. Please check the format.' });
        }
      }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const handleReset = () => {
    if (confirm('⚠️ This will permanently delete all your travel memories. Are you sure?')) {
      if (confirm('Final confirmation: All pins, memories, and wishlist items will be erased forever.')) {
        clearAllData();
      }
    }
  };

  const handleSaveGroqKey = () => {
    updateSettings({ groqApiKey: groqKeyInput });
    setGroqTestResult(null);
  };

  const handleTestGroq = async () => {
    const key = groqKeyInput.trim();
    if (!key) { setGroqTestResult({ ok: false, msg: 'Please enter a Groq API key first.' }); return; }
    setTestingGroq(true);
    setGroqTestResult(null);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'user', content: 'Say "OK" in exactly 2 characters.' }],
          max_tokens: 5
        })
      });
      if (res.ok) {
        setGroqTestResult({ ok: true, msg: '✓ Groq API key is valid and live AI is active!' });
        updateSettings({ groqApiKey: key });
        confetti({ particleCount: 30, spread: 40 });
      } else {
        const err = await res.json();
        setGroqTestResult({ ok: false, msg: err?.error?.message || 'Invalid API key. Please check and try again.' });
      }
    } catch {
      setGroqTestResult({ ok: false, msg: 'Network error. Please check your connection.' });
    } finally {
      setTestingGroq(false);
    }
  };

  return (
    <div className="w-full h-full overflow-y-auto custom-scrollbar">
      <div className="max-w-xl mx-auto px-4 sm:px-5 py-6 sm:py-8 flex flex-col gap-5">

        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/15">
            <Settings className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-black text-slate-100 text-base">Settings</h2>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Preferences & Data</p>
          </div>
        </div>

        {/* Account */}
        <section className="p-5 rounded-2xl glass-panel border border-white/8 flex flex-col gap-4">
          <SectionTitle icon={<Globe className="w-4 h-4" />} label="Account" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-base font-black text-indigo-400 shrink-0 select-none">
              {(user?.displayName || 'E')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-100 text-sm truncate">{user?.displayName || 'Explorer'}</div>
              <div className="text-[10px] text-slate-500 truncate font-mono">{user?.email}</div>
            </div>
            <div className="text-[9px] px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 font-bold uppercase tracking-wider shrink-0">Active</div>
          </div>
        </section>

        {/* Groq API Key */}
        <section className="p-5 rounded-2xl glass-panel border border-white/8 flex flex-col gap-4">
          <SectionTitle icon={<Key className="w-4 h-4 text-amber-400" />} label="Groq AI Configuration" className="text-amber-400" />

          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-amber-300/80 leading-relaxed">
                Groq is <strong>free to use</strong> — get your key at{' '}
                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
                  className="underline text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5">
                  console.groq.com <ExternalLink className="w-2.5 h-2.5" />
                </a>.
                Without a key, WorldTracker runs in AI Preview Mode with simulated data.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">API Key</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-[13px]" />
                <input
                  type={showGroqKey ? 'text' : 'password'}
                  value={groqKeyInput}
                  onChange={e => setGroqKeyInput(e.target.value)}
                  placeholder="gsk_..."
                  className="w-full pl-8 pr-10 py-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500/40 font-mono"
                />
                <button type="button" onClick={() => setShowGroqKey(!showGroqKey)}
                  className="absolute right-3 top-[11px] text-slate-500 hover:text-slate-300 cursor-pointer">
                  {showGroqKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button onClick={handleSaveGroqKey}
                className="px-3 py-2.5 rounded-xl bg-slate-900 border border-white/8 text-slate-300 text-xs font-bold hover:bg-white/5 cursor-pointer transition-all shrink-0">
                Save
              </button>
            </div>

            <button onClick={handleTestGroq} disabled={testingGroq}
              className="w-full py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-amber-400 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all disabled:opacity-50">
              {testingGroq
                ? <><span className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" /> Testing Connection…</>
                : <><Zap className="w-3.5 h-3.5" /> Test Groq Connection</>
              }
            </button>

            {groqTestResult && (
              <div className={`p-3 rounded-xl border flex items-center gap-2 text-xs ${groqTestResult.ok ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-300' : 'bg-red-500/8 border-red-500/20 text-red-300'}`}>
                {groqTestResult.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                {groqTestResult.msg}
              </div>
            )}
          </div>

          {settings.groqApiKey && (
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Live Groq AI active — using {settings.groqApiKey.slice(0, 8)}…
            </div>
          )}
        </section>

        {/* Display Preferences */}
        <section className="p-5 rounded-2xl glass-panel border border-white/8 flex flex-col gap-4">
          <SectionTitle icon={<Palette className="w-4 h-4" />} label="Display" />

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Globe Style</label>
            <div className="grid grid-cols-2 gap-2">
              {(['stylized', 'realistic'] as const).map(style => (
                <button key={style} onClick={() => updateSettings({ globeStyle: style })}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer capitalize ${settings.globeStyle === style ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-300'}`}>
                  {style === 'stylized' ? '🌑 Dark Vector' : '🌍 Realistic Satellite'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
              <Eye className="w-3 h-3" /> Default Log Visibility
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['friends', 'private'] as const).map(v => (
                <button key={v} onClick={() => updateSettings({ defaultVisibility: v })}
                  className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${settings.defaultVisibility === v ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300' : 'bg-white/3 border-white/8 text-slate-400 hover:bg-white/5 hover:text-slate-300'}`}>
                  {v === 'friends' ? '👥 Friends' : '🔒 Private'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Backup & Restore */}
        <section className="p-5 rounded-2xl glass-panel border border-white/8 flex flex-col gap-4">
          <SectionTitle icon={<Download className="w-4 h-4" />} label="Backup & Restore" />
          <p className="text-[11px] text-slate-500 leading-relaxed -mt-1">Export your travel data as a JSON file for safekeeping or migration.</p>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={handleExport}
              className="p-4 rounded-xl bg-white/3 border border-white/8 hover:bg-indigo-500/8 hover:border-indigo-500/20 flex flex-col items-center gap-2 text-center cursor-pointer transition-all group">
              <Download className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-slate-200 text-xs">Export</span>
              <span className="text-[9px] text-slate-500">Download .json backup</span>
            </button>

            <label className="p-4 rounded-xl bg-white/3 border border-white/8 hover:bg-emerald-500/8 hover:border-emerald-500/20 flex flex-col items-center gap-2 text-center cursor-pointer transition-all group relative">
              <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
              <Upload className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="font-bold text-slate-200 text-xs">Import</span>
              <span className="text-[9px] text-slate-500">Restore from backup</span>
            </label>
          </div>

          {importStatus.type && (
            <div className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs ${importStatus.type === 'success' ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-300' : 'bg-red-500/8 border-red-500/20 text-red-300'}`}>
              {importStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              {importStatus.msg}
            </div>
          )}
        </section>

        {/* Recycle Bin */}
        {deletedLogs.length > 0 && (
          <section className="p-5 rounded-2xl glass-panel border border-white/8 flex flex-col gap-4">
            <button onClick={() => setShowRecycleBin(!showRecycleBin)}
              className="flex items-center justify-between w-full cursor-pointer">
              <SectionTitle icon={<RotateCcw className="w-4 h-4 text-slate-400" />} label={`Recycle Bin (${deletedLogs.length})`} />
              <span className="text-[10px] text-slate-500 font-mono">{showRecycleBin ? '▲ hide' : '▼ show'}</span>
            </button>

            {showRecycleBin && (
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-slate-500 leading-relaxed -mt-1">
                  Soft-deleted memories. Restore them to bring them back to your timeline.
                </p>
                {deletedLogs.map(log => (
                  <div key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-950/40 border border-white/5">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-300 text-xs truncate">{log.placeName.split(',')[0]}</p>
                      <p className="text-[9px] text-slate-500 font-mono">
                        Deleted {log.deletedAt ? new Date(log.deletedAt).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <button onClick={() => restorePlaceLog(log.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/15 cursor-pointer transition-all shrink-0 flex items-center gap-1">
                      <RotateCcw className="w-3 h-3" /> Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Danger Zone */}
        <section className="p-5 rounded-2xl border border-red-500/12 bg-red-950/5 flex flex-col gap-3">
          <SectionTitle icon={<Trash2 className="w-4 h-4 text-red-400" />} label="Danger Zone" className="text-red-400" />
          <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
            <div>
              <p className="font-semibold text-slate-200 text-xs">Reset All Travel Data</p>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed">Permanently delete all pins, memories, and wishlist items.</p>
            </div>
            <button onClick={handleReset}
              className="px-4 py-2.5 bg-red-500/12 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-bold text-xs rounded-xl cursor-pointer transition-all shrink-0 hover:text-red-300 active:scale-95">
              Clear All Data
            </button>
          </div>
        </section>

      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ReactNode; label: string; className?: string }> = ({ icon, label, className }) => (
  <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-widest ${className || 'text-slate-400'}`}>
    {icon}
    {label}
  </div>
);


