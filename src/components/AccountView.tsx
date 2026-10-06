import React from 'react';
import { User, Shield, Zap, Calendar, LogOut, CheckCircle2, ArrowRight } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { PageRoute } from '../types';

interface AccountViewProps {
  onBack: () => void;
  onNavigate?: (page: PageRoute) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({ onBack, onNavigate }) => {
  const { user, profile, usage, signOut } = useAuth();

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-neutral-600 mb-4">You need to sign in to view your account details.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-semibold"
        >
          Return to Generator
        </button>
      </div>
    );
  }

  const generationsUsed = usage?.generationsUsed ?? 0;
  const generationLimit = usage?.generationLimit ?? 3;
  const remaining = Math.max(0, generationLimit - generationsUsed);
  const planName = (profile?.plan || 'free').toUpperCase();

  return (
    <div id="account-page" className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
      {/* Back button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          ← Back to Generator
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200 p-6 sm:p-8 shadow-xs mb-6">
        {/* User Card */}
        <div className="flex items-start justify-between gap-4 pb-6 border-b border-neutral-100">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-lg shadow-xs">
              {(profile?.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
                {profile?.displayName || 'RePrompt Creator'}
              </h1>
              <p className="text-xs sm:text-sm text-neutral-500 font-mono">
                {user.email}
              </p>
            </div>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-neutral-100 text-neutral-800 border border-neutral-200">
            {planName} PLAN
          </span>
        </div>

        {/* Real Server Usage Card */}
        <div className="py-6 border-b border-neutral-100">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-semibold flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Server-Enforced Usage Allowance</span>
            </h2>
            <span className="text-xs font-semibold text-neutral-900 font-mono">
              {remaining} of {generationLimit} generations left
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-neutral-100 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                remaining === 0 ? 'bg-red-500' : 'bg-neutral-900'
              }`}
              style={{
                width: `${Math.min(100, (generationsUsed / generationLimit) * 100)}%`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-neutral-500 font-mono">
            <span>{generationsUsed} used</span>
            <span>{generationLimit} limit</span>
          </div>
        </div>

        {/* Plan & Security Details */}
        <div className="py-6 space-y-4">
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-start gap-3">
            <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-neutral-600 leading-relaxed">
              <strong className="text-neutral-900 block font-semibold mb-0.5">
                Protected RLS Architecture Active
              </strong>
              Your prompt generations and usage allowances are managed with Supabase Row Level Security. Images are never permanently stored.
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 flex items-center justify-between">
          <button
            type="button"
            onClick={signOut}
            className="px-4 py-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-xs"
          >
            Back to Generator
          </button>
        </div>
      </div>
    </div>
  );
};
