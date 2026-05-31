import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { getSupabaseClient } from '../services/supabase';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your session…');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const client = getSupabaseClient();

        // Handle the URL hash from Supabase email confirmation
        const { data, error } = await client.auth.getSession();

        if (error) {
          setStatus('error');
          setMessage('Verification failed. The link may have expired.');
          setTimeout(() => navigate('/'), 3000);
          return;
        }

        if (data.session) {
          setStatus('success');
          setMessage('Email confirmed! Taking you to WorldTracker…');
          setTimeout(() => navigate('/'), 1500);
        } else {
          // Try exchanging code from URL
          const urlParams = new URLSearchParams(window.location.search);
          const code = urlParams.get('code');

          if (code) {
            const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              setStatus('error');
              setMessage('Verification failed. The link may have expired.');
              setTimeout(() => navigate('/'), 3000);
            } else {
              setStatus('success');
              setMessage('Email confirmed! Taking you to WorldTracker…');
              setTimeout(() => navigate('/'), 1500);
            }
          } else {
            // No code and no session — redirect to login
            navigate('/');
          }
        }
      } catch {
        setStatus('error');
        setMessage('Something went wrong. Redirecting…');
        setTimeout(() => navigate('/'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="fixed inset-0 bg-[#030712] flex items-center justify-center p-4">
      <div className="stars-bg opacity-25" />
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/20 via-transparent to-emerald-950/10 pointer-events-none" />

      <div className="relative text-center space-y-6 animate-in fade-in duration-500">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <Globe className="w-8 h-8 text-indigo-400 animate-slow-rotate" />
          </div>
        </div>

        <div>
          <h1 className="text-lg font-black text-white tracking-widest uppercase">
            WORLD<span className="text-indigo-400">TRACKER</span>
          </h1>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-3">
          {status === 'loading' && (
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          )}
          {status === 'success' && (
            <CheckCircle2 className="w-8 h-8 text-emerald-400 animate-in zoom-in duration-300" />
          )}
          {status === 'error' && (
            <AlertCircle className="w-8 h-8 text-red-400 animate-in zoom-in duration-300" />
          )}

          <p className={`text-sm font-medium ${
            status === 'success' ? 'text-emerald-300' :
            status === 'error' ? 'text-red-300' :
            'text-slate-400'
          }`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
};
