import React, { useState, useEffect } from 'react';
import { Globe, Mail, Lock, User, ArrowRight, Loader2, Eye, EyeOff, ChevronLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import { signInWithEmail, signUpWithEmail, sendPasswordReset, isSupabaseConfigured } from '../services/supabase';

type AuthMode = 'login' | 'signup' | 'reset';

interface FormState {
  email: string;
  password: string;
  confirmPassword: string;
  displayName: string;
}

const WORLD_DOTS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 2 + 1,
  delay: Math.random() * 4,
  duration: Math.random() * 6 + 4,
}));

export const LoginScreen: React.FC = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState<FormState>({
    email: '', password: '', confirmPassword: '', displayName: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const updateField = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(form.email, form.password);
      // Auth listener in store will handle the session update
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      setError(msg.includes('Invalid') ? 'Invalid email or password.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.displayName) {
      setError('Please fill in all required fields.');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await signUpWithEmail(form.email, form.password, form.displayName);
      if (result.user && !result.session) {
        // Email confirmation required
        setSuccess('Account created! Check your email to confirm your address, then sign in.');
        setMode('login');
      }
      // If session exists, auth listener handles it
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      setError(msg.includes('already') ? 'An account with this email already exists.' : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(form.email);
      setSuccess('Password reset email sent! Check your inbox.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Reset failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setForm({ email: form.email, password: '', confirmPassword: '', displayName: '' });
  };

  if (!configured) {
    return (
      <div className="fixed inset-0 bg-[#030712] z-[100] flex items-center justify-center p-4">
        <div className="stars-bg opacity-30" />
        <div className="relative w-full max-w-lg p-8 rounded-3xl auth-panel text-center">
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 inline-flex mb-6">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <h1 className="text-xl font-black text-slate-100 mb-3">Setup Required</h1>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            WorldTracker needs Supabase configured to function. Create a{' '}
            <code className="px-1.5 py-0.5 bg-white/10 rounded text-amber-400 font-mono text-xs">.env</code>{' '}
            file in your project root with the following:
          </p>
          <div className="bg-slate-950/80 rounded-xl p-4 text-left font-mono text-xs text-slate-300 border border-white/10 mb-6">
            <div className="text-slate-500 mb-2"># From Supabase Dashboard → Project Settings → API</div>
            <div><span className="text-emerald-400">VITE_SUPABASE_URL</span>=https://your-project.supabase.co</div>
            <div><span className="text-emerald-400">VITE_SUPABASE_ANON_KEY</span>=your-anon-key</div>
            <div className="mt-2 text-slate-500"># From console.groq.com/keys</div>
            <div><span className="text-indigo-400">VITE_GROQ_API_KEY</span>=your-groq-key</div>
          </div>
          <p className="text-slate-500 text-xs">
            Restart the dev server after creating the file.{' '}
            <span className="text-slate-400">See <code className="text-amber-400 font-mono">.env.example</code> for reference.</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#030712] z-[100] flex items-center justify-center p-4 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="stars-bg opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/30 via-transparent to-emerald-950/10" />

        {/* Floating orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-cyan-600/3 rounded-full blur-2xl animate-float" style={{ animationDelay: '4s' }} />

        {/* Floating constellation dots */}
        {WORLD_DOTS.map(dot => (
          <div
            key={dot.id}
            className="absolute rounded-full bg-indigo-400/20 animate-pulse"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              width: `${dot.size}px`,
              height: `${dot.size}px`,
              animationDelay: `${dot.delay}s`,
              animationDuration: `${dot.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Auth Card */}
      <div
        className={`relative w-full max-w-sm transition-all duration-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Card */}
        <div className="auth-panel rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="relative px-8 pt-8 pb-6 text-center border-b border-white/5">
            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-indigo-500/20 blur-xl animate-pulse-glow" />
                <div className="relative p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <Globe className="w-7 h-7 text-indigo-400 animate-slow-rotate" />
                </div>
              </div>
            </div>

            <h1 className="text-xl font-black text-white tracking-widest uppercase select-none">
              WORLD<span className="text-indigo-400">TRACKER</span>
            </h1>
            <p className="text-slate-500 text-xs mt-1 font-medium">
              {mode === 'login' && 'Sign in to your account'}
              {mode === 'signup' && 'Create your explorer account'}
              {mode === 'reset' && 'Reset your password'}
            </p>
          </div>

          {/* Form area */}
          <div className="px-8 py-6">
            {/* Success/Error messages */}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-emerald-300 text-xs leading-relaxed">{success}</p>
              </div>
            )}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-red-300 text-xs leading-relaxed">{error}</p>
              </div>
            )}

            {/* Login Form */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <AuthInput
                  label="Email address"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  value={form.email}
                  onChange={v => updateField('email', v)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <div className="space-y-1">
                  <AuthInput
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    icon={<Lock className="w-4 h-4" />}
                    value={form.password}
                    onChange={v => updateField('password', v)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    rightAction={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    }
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-[10px] text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                <AuthSubmitButton loading={loading} label="Sign In" />

                <div className="text-center pt-2">
                  <span className="text-slate-500 text-xs">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors"
                  >
                    Create one
                  </button>
                </div>
              </form>
            )}

            {/* Sign Up Form */}
            {mode === 'signup' && (
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <AuthInput
                  label="Explorer name"
                  type="text"
                  icon={<User className="w-4 h-4" />}
                  value={form.displayName}
                  onChange={v => updateField('displayName', v)}
                  placeholder="Your name"
                  autoComplete="name"
                />
                <AuthInput
                  label="Email address"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  value={form.email}
                  onChange={v => updateField('email', v)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
                <AuthInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  icon={<Lock className="w-4 h-4" />}
                  value={form.password}
                  onChange={v => updateField('password', v)}
                  placeholder="Min. 6 characters"
                  autoComplete="new-password"
                  rightAction={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  }
                />
                <AuthInput
                  label="Confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  icon={<Lock className="w-4 h-4" />}
                  value={form.confirmPassword}
                  onChange={v => updateField('confirmPassword', v)}
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                  rightAction={
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  }
                />

                <AuthSubmitButton loading={loading} label="Create Account" />

                <div className="text-center pt-1">
                  <span className="text-slate-500 text-xs">Already have an account? </span>
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            )}

            {/* Password Reset Form */}
            {mode === 'reset' && (
              <form onSubmit={handleReset} className="space-y-4">
                <p className="text-slate-400 text-xs leading-relaxed">
                  Enter your email and we'll send you a link to reset your password.
                </p>
                <AuthInput
                  label="Email address"
                  type="email"
                  icon={<Mail className="w-4 h-4" />}
                  value={form.email}
                  onChange={v => updateField('email', v)}
                  placeholder="you@example.com"
                  autoComplete="email"
                />

                <AuthSubmitButton loading={loading} label="Send Reset Link" />

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1 mx-auto transition-colors"
                  >
                    <ChevronLeft className="w-3 h-3" /> Back to sign in
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-600 text-[10px] mt-4 select-none">
          WorldTracker © {new Date().getFullYear()} · Your entire travel life on a globe
        </p>
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface AuthInputProps {
  label: string;
  type: string;
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoComplete?: string;
  rightAction?: React.ReactNode;
}

const AuthInput: React.FC<AuthInputProps> = ({ label, type, icon, value, onChange, placeholder, autoComplete, rightAction }) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">{label}</label>
    <div className="relative group">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors pointer-events-none">
        {icon}
      </div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="w-full pl-9 pr-8 py-2.5 bg-white/5 border border-white/8 rounded-xl text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/8 transition-all"
      />
      {rightAction && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {rightAction}
        </div>
      )}
    </div>
  </div>
);

interface AuthSubmitButtonProps {
  loading: boolean;
  label: string;
}

const AuthSubmitButton: React.FC<AuthSubmitButtonProps> = ({ loading, label }) => (
  <button
    type="submit"
    disabled={loading}
    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] mt-2"
  >
    {loading ? (
      <>
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Please wait…</span>
      </>
    ) : (
      <>
        <span>{label}</span>
        <ArrowRight className="w-4 h-4" />
      </>
    )}
  </button>
);
