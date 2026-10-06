import React, { useState, useRef } from 'react';
import { X, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';
import { TurnstileWidget } from './TurnstileWidget';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup' | 'forgot';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'signin',
}) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cloudflare Turnstile token lifecycle state (strictly in-memory, never persisted)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const resetTurnstileRef = useRef<(() => void) | null>(null);

  // Retrieve frontend-safe Turnstile Site Key from Vite environment variables
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

  if (!isOpen) return null;

  const handleModeChange = (newMode: 'signin' | 'signup' | 'forgot') => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setTurnstileToken(null);
    resetTurnstileRef.current?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isSupabaseConfigured || !supabase) {
      setErrorMsg('Supabase is not yet configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY to your environment variables.');
      return;
    }

    // Sign up Turnstile token validation guard
    if (mode === 'signup') {
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }

      // If Turnstile Site Key is configured, require successful verification before sending request
      if (turnstileSiteKey && !turnstileToken) {
        setErrorMsg('Please complete the security check.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'signup') {
        const signUpOptions: {
          data: { full_name: string };
          captchaToken?: string;
        } = {
          data: {
            full_name: displayName.trim(),
          },
        };

        // Pass Turnstile CAPTCHA token to Supabase Auth
        if (turnstileToken) {
          signUpOptions.captchaToken = turnstileToken;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: signUpOptions,
        });

        if (error) {
          // Reset Turnstile token & widget immediately on error
          setTurnstileToken(null);
          resetTurnstileRef.current?.();

          // User-friendly error sanitization
          if (
            error.message.toLowerCase().includes('captcha') ||
            error.message.toLowerCase().includes('security check') ||
            error.message.toLowerCase().includes('turnstile')
          ) {
            throw new Error('Security verification failed. Please complete the security check again.');
          }
          if (
            error.message.toLowerCase().includes('already registered') ||
            error.message.toLowerCase().includes('already exists')
          ) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
          throw new Error(error.message || 'Unable to create account. Please try again.');
        }

        // Successfully consumed token: reset in-memory state
        setTurnstileToken(null);

        if (data.session) {
          setSuccessMsg('Account created successfully! Welcome to RePrompt.');
          setTimeout(() => onClose(), 1200);
        } else if (data.user && !data.session) {
          setSuccessMsg('Account registered! Please check your email inbox to verify your account.');
        }
      } else if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password.');
          }
          if (error.message.includes('Email not confirmed')) {
            throw new Error('Please check your email to confirm your account before signing in.');
          }
          throw error;
        }

        setSuccessMsg('Signed in successfully.');
        setTimeout(() => onClose(), 800);
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/`,
        });

        if (error) throw error;

        setSuccessMsg('Password recovery link sent! Please check your email.');
      }
    } catch (err: any) {
      setTurnstileToken(null);
      resetTurnstileRef.current?.();
      setErrorMsg(err.message || 'An authentication error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Sign up button is disabled while processing or if Turnstile check is incomplete
  const isSubmitDisabled =
    loading || (mode === 'signup' && Boolean(turnstileSiteKey) && !turnstileToken);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-md w-full border border-neutral-200 shadow-2xl overflow-hidden p-6 sm:p-8 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center mx-auto mb-3 shadow-xs">
            <UserIcon className="w-6 h-6" />
          </div>
          <h2 id="auth-modal-title" className="text-2xl font-extrabold text-neutral-900 tracking-tight">
            {mode === 'signin' && 'Welcome Back to RePrompt'}
            {mode === 'signup' && 'Create Your Account'}
            {mode === 'forgot' && 'Reset Password'}
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 mt-1">
            {mode === 'signin' && 'Sign in to access your server-backed generations & history'}
            {mode === 'signup' && 'Get 3 free generation credits and cloud-synced prompt history'}
            {mode === 'forgot' && 'Enter your email to receive a secure password reset link'}
          </p>
        </div>

        {/* Notification Banners */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Your Name
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => handleModeChange('forgot')}
                    className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-300 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900"
                />
              </div>
            </div>
          )}

          {/* Cloudflare Turnstile CAPTCHA (Sign Up Only) */}
          {mode === 'signup' && (
            <div className="pt-1">
              <TurnstileWidget
                siteKey={turnstileSiteKey}
                onVerify={(token) => {
                  setTurnstileToken(token);
                  setErrorMsg(null);
                }}
                onExpire={() => {
                  setTurnstileToken(null);
                  setErrorMsg('Security check expired. Please complete the verification again.');
                }}
                onError={() => {
                  setTurnstileToken(null);
                  setErrorMsg('Security verification could not load. Please check your connection or ad blocker.');
                }}
                resetRef={resetTurnstileRef}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                </span>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </>
            )}
          </button>
        </form>

        {/* Mode Toggle Footer */}
        <div className="mt-6 pt-5 border-t border-neutral-100 text-center text-xs text-neutral-500">
          {mode === 'signin' && (
            <p>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('signup')}
                className="font-semibold text-neutral-900 underline hover:text-neutral-700"
              >
                Create one now
              </button>
            </p>
          )}

          {mode === 'signup' && (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                className="font-semibold text-neutral-900 underline hover:text-neutral-700"
              >
                Sign in
              </button>
            </p>
          )}

          {mode === 'forgot' && (
            <p>
              Remembered your password?{' '}
              <button
                type="button"
                onClick={() => handleModeChange('signin')}
                className="font-semibold text-neutral-900 underline hover:text-neutral-700"
              >
                Back to Sign in
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
