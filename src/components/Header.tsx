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
    <header id="app-header" className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <button
            id="brand-logo-button"
            onClick={() => onNavigate('generator')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center font-bold tracking-tight shadow-xs transition-transform group-hover:scale-105">
              <Sparkles className="w-4 h-4 text-neutral-200" />
            </div>
            <div>
              <span className="font-semibold text-neutral-900 tracking-tight text-base sm:text-lg">
                Image to Prompt
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono px-1.5 py-0.5 rounded-sm bg-neutral-100 text-neutral-600 border border-neutral-200">
                v1.0 MVP
              </span>
            </div>
          </button>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-neutral-200">
            <button
              id="nav-generator"
              onClick={() => onNavigate('generator')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activePage === 'generator'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Generator
            </button>
            <button
              id="nav-about"
              onClick={() => onNavigate('about')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activePage === 'about'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              About
            </button>
            <button
              id="nav-privacy"
              onClick={() => onNavigate('privacy')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activePage === 'privacy'
                  ? 'bg-neutral-100 text-neutral-900 font-semibold'
                  : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50'
              }`}
            >
              Privacy
            </button>
          </nav>
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-2.5">
          {/* Generations Limit Tracker & Unlimited Badge */}
          {isUnlimited ? (
            <button
              id="unlimited-credits-badge"
              type="button"
              onClick={onToggleUnlimited}
              title="Unlimited testing credits active. Click to toggle daily limit mode."
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 transition-colors shadow-xs"
            >
              <Infinity className="w-4 h-4 text-emerald-600" />
              <span>Unlimited Credits</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <div
                id="generations-counter"
                title="Anonymous Free Tier Daily Limit"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-100 border border-neutral-200 text-neutral-700"
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    generationsRemaining > 0 ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`}
                />
                <span>
                  {generationsRemaining}/{maxGenerations} free today
                </span>
              </div>
              <button
                id="header-reset-credits"
                type="button"
                onClick={onResetCredits}
                title="Regenerate credit to 3"
                className="px-2 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md border border-neutral-200 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Reset to 3</span>
              </button>
              <button
                id="header-set-unlimited"
                type="button"
                onClick={onToggleUnlimited}
                title="Switch to Unlimited Credits"
                className="px-2 py-1 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 flex items-center gap-1 transition-colors"
              >
                <Infinity className="w-3 h-3" />
                <span className="hidden sm:inline">Unlimited</span>
              </button>
            </div>
          )}

          {/* Prompt History Button */}
          <button
            id="history-drawer-toggle"
            onClick={onOpenHistory}
            className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-50 text-sm font-medium transition-all"
            aria-label="View prompt history"
          >
            <History className="w-4 h-4 text-neutral-500" />
            <span className="hidden xs:inline">History</span>
            {historyCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-neutral-900 text-white font-mono">
                {historyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
