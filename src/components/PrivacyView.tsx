import React from 'react';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server, HardDrive, ArrowRight, Sparkles, Film, Info } from 'lucide-react';
import { PageRoute } from '../types';

interface PrivacyViewProps {
  onBack: () => void;
  onNavigate?: (page: PageRoute) => void;
}

export const PrivacyView: React.FC<PrivacyViewProps> = ({ onBack, onNavigate }) => {
  const handleNav = (page: PageRoute) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      onBack();
    }
  };

  return (
    <div id="privacy-page" className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Back button */}
      <a
        href="/"
        id="privacy-back-button"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Generator</span>
      </a>

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium mb-3 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Zero-Storage Guarantee</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-base text-neutral-600 leading-relaxed">
          We built Image to Prompt with a radical privacy-first constraint: we do not store, catalog, train on, or retain your uploaded images or videos.
        </p>
      </div>

      {/* Principles */}
      <h2 className="sr-only">Zero-Storage Architecture Principles</h2>
      <div className="space-y-4 mb-10">
        <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">
              Zero Permanent Storage
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              When you upload an image or video, it is transmitted directly to our vision processing pipeline via secure SSL/TLS. Once the prompt reverse-engineering completes, the media data is discarded from RAM. We do not write your images to disk, S3, or any database.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">
              No Accounts & No Tracking
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              No signup, email, or passwords are required for the free MVP. We do not place third-party advertising cookies or track you across the web. Your daily generation allowance is counted locally in your browser's private <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs font-mono">localStorage</code>.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">
              AI Vision Model Processing
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Image tokens are forwarded strictly for the duration of the prompt generation request. Under our API terms, customer inputs sent via enterprise API endpoints are not used to train foundation models.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">
              Local Prompt History
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              The "History" drawer records your past generated prompts entirely in your browser's local cache. You can wipe this data completely at any time by clicking "Clear" in the History window.
            </p>
          </div>
        </div>
      </div>

      {/* Internal Navigation Links */}
      <div className="p-6 rounded-2xl bg-neutral-100/80 border border-neutral-200 mb-6">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-3">
          Explore Image to Prompt
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNav('generator');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>Image to Prompt</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </a>
          <a
            href="/video-to-prompt"
            onClick={(e) => {
              e.preventDefault();
              handleNav('video_generator');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>Video to Prompt</span>
            <Film className="w-3.5 h-3.5 text-blue-500" />
          </a>
          <a
            href="/about"
            onClick={(e) => {
              e.preventDefault();
              handleNav('about');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>About & Models</span>
            <Info className="w-3.5 h-3.5 text-neutral-600" />
          </a>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 font-mono">
        Last updated: October 2026 • MVP Privacy Standard
      </div>
    </div>
  );
};
