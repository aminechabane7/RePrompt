import React from 'react';
import { Sparkles, History, User, LogIn, Zap, LogOut } from 'lucide-react';
import { PageRoute } from '../types';
import { useAuth } from '../lib/AuthContext';

interface HeaderProps {
  activePage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  onOpenHistory: () => void;
  onOpenAuthModal: (mode: 'signin' | 'signup') => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onNavigate,
  onOpenHistory,
  onOpenAuthModal,
}) => {
  const { user, profile, usage, isConfigured } = useAuth();

  const remaining = usage ? Math.max(0, usage.generationLimit - usage.generationsUsed) : 3;
  const isFreePlan = (profile?.plan || 'free') === 'free';

  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4 sm:gap-6">
          <a
            href="/"
            id="brand-logo-button"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('generator');
            }}
            className="flex items-center gap-2.5 text-left focus:outline-none group py-1"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold tracking-tight shadow-xs transition-transform group-hover:scale-105">
              <Sparkles className="w-4 h-4 text-neutral-200" />
            </div>
            <div>
              <span className="font-bold text-neutral-900 tracking-tight text-base sm:text-lg">
                RePrompt
              </span>
              <span className="hidden sm:inline-block ml-2 text-[11px] font-mono px-1.5 py-0.5 rounded-sm bg-neutral-100 text-neutral-600 border border-neutral-200">
                AI Vision
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-neutral-200 text-xs sm:text-sm font-medium">
            <a
              href="/"
              id="nav-generator"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('generator');
              }}
              className={`px-3 py-2 rounded-md transition-colors ${
                activePage === 'generator'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Image to Prompt
            </a>
            <a
              href="/video-to-prompt"
              id="nav-video-generator"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('video_generator');
              }}
              className={`px-3 py-2 rounded-md transition-colors ${
                activePage === 'video_generator'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Video to Prompt
            </a>
            <a
              href="/about"
              id="nav-about"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('about');
              }}
              className={`px-3 py-2 rounded-md transition-colors ${
                activePage === 'about'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              About
            </a>
            <a
              href="/privacy"
              id="nav-privacy"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('privacy');
              }}
              className={`px-3 py-2 rounded-md transition-colors ${
                activePage === 'privacy'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Privacy
            </a>
            <a
              href="/terms"
              id="nav-terms"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('terms');
              }}
              className={`px-3 py-2 rounded-md transition-colors ${
                activePage === 'terms'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Terms
            </a>
          </nav>
        </div>

        {/* Right Tools (Auth + History + Usage) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real Server Usage Badge (when logged in) */}
          {user && (
            <div
              id="server-usage-badge"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-800 text-xs font-mono"
            >
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>
                <strong>{remaining}</strong> left
              </span>
            </div>
          )}

          {/* History Button */}
          <button
            id="header-history-button"
            type="button"
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-800 text-xs font-medium transition-colors shadow-2xs"
            aria-label="Open prompt history"
          >
            <History className="w-3.5 h-3.5 text-neutral-600" />
            <span className="hidden xs:inline">History</span>
          </button>

          {/* Authentication Controls */}
          {user ? (
            /* Logged In User Pill */
            <button
              id="header-account-button"
              type="button"
              onClick={() => onNavigate('account' as any)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-semibold text-neutral-900 transition-colors shadow-2xs"
            >
              <div className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-[11px] font-bold">
                {(profile?.displayName?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </div>
              <span className="max-w-[100px] truncate hidden sm:inline">
                {profile?.displayName || user.email?.split('@')[0]}
              </span>
            </button>
          ) : (
            /* Logged Out Actions */
            <div className="flex items-center gap-1.5">
              <button
                id="header-signin-button"
                type="button"
                onClick={() => onOpenAuthModal('signin')}
                className="px-3 py-1.5 rounded-xl text-neutral-700 hover:text-neutral-900 text-xs font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                id="header-signup-button"
                type="button"
                onClick={() => onOpenAuthModal('signup')}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-colors shadow-xs"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
