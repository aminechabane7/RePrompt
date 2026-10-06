import React from 'react';
import { ArrowLeft, ShieldCheck, Lock, EyeOff, Server, HardDrive, Sparkles, Film, Info, FileText } from 'lucide-react';
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
          <span>Privacy & Data Handling</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
          Privacy Policy
        </h1>
        <p className="text-base text-neutral-600 leading-relaxed">
          Transparent disclosure of exactly what data RePrompt processes, where it goes, and what is stored.
        </p>
      </div>

      {/* Principles */}
      <div className="space-y-4 mb-10">
        <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 text-sm mb-1">
              What Happens to Uploaded Images
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Uploaded images are held transiently in server RAM only for the duration of the AI analysis call. We do not persist uploaded images to a database, cloud storage bucket (e.g. S3 or GCS), or physical disk. Once the prompt generation completes, the image buffer is garbage collected.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
            <Server className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 text-sm mb-1">
              Third-Party AI Processors
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              To reverse-engineer visual prompts, image pixel data is transmitted securely via HTTPS to enterprise AI providers (Google Gemini API). Data transmitted to commercial API tiers is governed by provider privacy commitments and is not used to train public foundation models.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 text-sm mb-1">
              Local Browser Storage (Zero Image Storage)
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Your "Prompt History" stores only lightweight text metadata in your private browser <code className="bg-neutral-100 px-1 py-0.5 rounded text-xs font-mono">localStorage</code> (such as the generated prompt string, selected mode, target engine, and timestamp). In accordance with our privacy hardening, <strong>original images and Base64 thumbnails are never saved in localStorage</strong>. You can wipe this local history at any time with the "Clear" button.
            </p>
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-neutral-200 bg-white flex items-start gap-4">
          <div className="w-9 h-9 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 shrink-0">
            <EyeOff className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-semibold text-neutral-900 text-sm mb-1">
              Server Logs & IP Addresses
            </h2>
            <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
              Standard web server logs may temporarily record connection IP addresses and request timestamps solely for security defense, DDoS mitigation, and server-side rate-limit enforcement. We do not track users across external websites or sell analytical data to advertising brokers.
            </p>
          </div>
        </div>
      </div>

      {/* Internal Navigation Links */}
      <div className="p-6 rounded-2xl bg-neutral-100/80 border border-neutral-200 mb-6">
        <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
          Related Documentation
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
            <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
          </a>
          <a
            href="/terms"
            onClick={(e) => {
              e.preventDefault();
              handleNav('terms');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>Terms of Use</span>
            <FileText className="w-3.5 h-3.5 text-neutral-600" />
          </a>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              handleNav('contact');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>Contact</span>
            <Info className="w-3.5 h-3.5 text-neutral-600" />
          </a>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 font-mono">
        Last updated: October 2026 • RePrompt Production Privacy Standard
      </div>
    </div>
  );
};
