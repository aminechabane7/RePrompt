import React from 'react';
import { Sparkles, History, Shield, Info, ArrowUpRight, Infinity, RotateCcw } from 'lucide-react';
import { PageRoute } from '../types';

interface HeaderProps {
  activePage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  generationsRemaining: number;
  maxGenerations: number;
  isUnlimited: boolean;
  onToggleUnlimited: () => void;
  onResetCredits: () => void;
  historyCount: number;
  onOpenHistory: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activePage,
  onNavigate,
  generationsRemaining,
  maxGenerations,
  isUnlimited,
  onToggleUnlimited,
  onResetCredits,
  historyCount,
  onOpenHistory,
}) => {
  return (
    <header id="app-header" className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
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
              <span className="font-semibold text-neutral-900 tracking-tight text-base sm:text-lg">
                Image to Prompt
              </span>
              <span className="hidden lg:inline-block ml-2 text-xs font-mono px-1.5 py-0.5 rounded-sm bg-neutral-100 text-neutral-600 border border-neutral-200">
                v1.0 MVP
              </span>
            </div>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-neutral-200">
            <a
              href="/"
              id="nav-generator"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('generator');
              }}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activePage === 'generator'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <span>Image to Prompt</span>
            </a>
            <a
              href="/video-to-prompt"
              id="nav-video-generator"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('video_generator');
              }}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                activePage === 'video_generator'
                  ? 'bg-blue-50 text-blue-900 font-semibold border border-blue-200'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              <span>Video to Prompt</span>
              <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-semibold bg-blue-600 text-white leading-none">
                NEW
              </span>
            </a>
            <a
              href="/about"
              id="nav-about"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('about');
              }}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                activePage === 'privacy'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Privacy
            </a>
          </nav>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2">
          {/* Generations Limit Tracker & Unlimited Badge */}
          {isUnlimited ? (
            <button
              id="unlimited-credits-badge"
              type="button"
              onClick={onToggleUnlimited}
              title="Unlimited testing credits active. Click to toggle daily limit mode."
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[38px] rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
            >
              <Infinity className="w-4 h-4 text-emerald-600" />
              <span className="hidden xs:inline">Unlimited</span>
              <span className="xs:hidden">∞</span>
            </button>
          ) : (
            <div className="flex items-center gap-1">
              <div
                id="generations-counter"
                title="Anonymous Free Tier Daily Limit"
                className="flex items-center gap-1.5 px-2.5 py-1.5 min-h-[38px] rounded-full text-xs font-medium bg-neutral-100 border border-neutral-200 text-neutral-700"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    generationsRemaining > 0 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`}
                />
                <span className="hidden sm:inline">
                  {generationsRemaining}/{maxGenerations} free
                </span>
                <span className="sm:hidden font-mono">
                  {generationsRemaining}/{maxGenerations}
                </span>
              </div>
              <button
                id="header-reset-credits"
                type="button"
                onClick={onResetCredits}
                title="Regenerate credit to 3"
                className="p-2 sm:px-2 sm:py-1 min-h-[38px] text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md border border-neutral-200 flex items-center justify-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Reset</span>
              </button>
            </div>
          )}

          {/* Prompt History Button */}
          <button
            id="history-drawer-toggle"
            onClick={onOpenHistory}
            className="relative flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 min-h-[38px] rounded-lg border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 text-xs sm:text-sm font-medium transition-all"
            aria-label="View prompt history"
          >
            <History className="w-4 h-4 text-neutral-500" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-neutral-900 text-white font-mono">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Sub-Navigation Bar */}
      <div className="md:hidden border-t border-neutral-200/80 bg-neutral-50/70 px-3 py-1.5 flex items-center justify-around text-xs">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('generator');
          }}
          className={`py-1 px-2 rounded font-medium transition-colors ${
            activePage === 'generator'
              ? 'text-neutral-900 font-bold bg-white shadow-2xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Image
        </a>
        <a
          href="/video-to-prompt"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('video_generator');
          }}
          className={`py-1 px-2 rounded font-medium transition-colors flex items-center gap-1 ${
            activePage === 'video_generator'
              ? 'text-blue-900 font-bold bg-white shadow-2xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          <span>Video</span>
          <span className="text-[9px] bg-blue-600 text-white px-1 py-0.2 rounded-xs font-mono">NEW</span>
        </a>
        <a
          href="/about"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('about');
          }}
          className={`py-1 px-2 rounded font-medium transition-colors ${
            activePage === 'about'
              ? 'text-neutral-900 font-bold bg-white shadow-2xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          About
        </a>
        <a
          href="/privacy"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('privacy');
          }}
          className={`py-1 px-2 rounded font-medium transition-colors ${
            activePage === 'privacy'
              ? 'text-neutral-900 font-bold bg-white shadow-2xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
        >
          Privacy
        </a>
      </div>
    </header>
  );
};
