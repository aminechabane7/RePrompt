import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  Wand2,
  RotateCw,
  Terminal,
  ShieldAlert,
  Sparkles,
  SlidersHorizontal,
  Layers,
} from 'lucide-react';
import { PromptMode } from '../types';

interface PromptResultProps {
  prompt: string;
  negativePrompt?: string;
  mode: PromptMode;
  modelUsed: string;
  isImproving: boolean;
  onImprovePrompt: () => void;
  onRegenerate: () => void;
}

export const PromptResult: React.FC<PromptResultProps> = ({
  prompt,
  negativePrompt = 'blurry, low quality, distorted anatomy, extra limbs, bad hands, text, watermark, oversaturated, deformed features, low resolution',
  mode,
  modelUsed,
  isImproving,
  onImprovePrompt,
  onRegenerate,
}) => {
  const [activeTab, setActiveTab] = useState<'both' | 'positive' | 'negative'>('both');
  const [copiedType, setCopiedType] = useState<'positive' | 'negative' | 'both' | null>(null);

  const copyToClipboard = async (text: string, type: 'positive' | 'negative' | 'both') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    }
  };

  const handleCopyPositive = () => copyToClipboard(prompt, 'positive');
  const handleCopyNegative = () => copyToClipboard(negativePrompt, 'negative');

  const handleCopyBoth = () => {
    let combined = '';
    if (mode === 'midjourney') {
      // Format with Midjourney --no parameter
      const cleanNeg = negativePrompt
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
        .join(' ');
      combined = `${prompt} --no ${cleanNeg}`;
    } else {
      combined = `POSITIVE PROMPT:\n${prompt}\n\nNEGATIVE PROMPT:\n${negativePrompt}`;
    }
    copyToClipboard(combined, 'both');
  };

  const handleDownload = () => {
    const content = `=== POSITIVE PROMPT (${mode.toUpperCase()}) ===\n${prompt}\n\n=== NEGATIVE PROMPT ===\n${negativePrompt}\n\nGenerated via Image to Prompt MVP | Model: ${modelUsed}`;
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `prompt-${mode}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;
  const negativeTokens = negativePrompt
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div id="prompt-result-card" className="w-full space-y-4">
      {/* Card Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase">
            Generated Prompts
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-neutral-100 border border-neutral-200 text-neutral-700 font-medium">
            {mode.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-medium">
          <button
            id="tab-view-both"
            type="button"
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'both'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            All Prompts
          </button>
          <button
            id="tab-view-positive"
            type="button"
            onClick={() => setActiveTab('positive')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'positive'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Positive Only
          </button>
          <button
            id="tab-view-negative"
            type="button"
            onClick={() => setActiveTab('negative')}
            className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'negative'
                ? 'bg-white text-red-700 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
            <span>Negative Prompt</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="space-y-4">
        {/* POSITIVE PROMPT BOX */}
        {(activeTab === 'both' || activeTab === 'positive') && (
          <div className="relative rounded-2xl bg-neutral-950 text-neutral-100 border border-neutral-800 p-5 sm:p-6 shadow-md overflow-hidden">
            {/* Box Header */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs font-mono text-neutral-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-semibold text-neutral-200">POSITIVE IMAGE PROMPT</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} chars</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline px-1.5 py-0.5 rounded-sm bg-neutral-900 text-neutral-400 border border-neutral-800">
                  {modelUsed}
                </span>
              </div>
            </div>

            {/* Prompt Content */}
            <div
              id="generated-prompt-text"
              className="text-sm sm:text-base leading-relaxed font-mono selection:bg-neutral-700 selection:text-white whitespace-pre-wrap break-words text-neutral-200 min-h-[80px]"
            >
              {prompt}
            </div>

            {/* Positive Prompt Actions Toolbar */}
            <div className="mt-5 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  id="copy-prompt-btn"
                  type="button"
                  onClick={handleCopyPositive}
                  className={`px-4 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs ${
                    copiedType === 'positive'
                      ? 'bg-emerald-500 text-white'
                      : 'bg-white text-neutral-900 hover:bg-neutral-100 hover:scale-[1.02]'
                  }`}
                >
                  {copiedType === 'positive' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied Positive!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-neutral-700" />
                      <span>Copy Positive Prompt</span>
                    </>
                  )}
                </button>

                {/* Improve Prompt */}
                <button
                  id="improve-prompt-btn"
                  type="button"
                  onClick={onImprovePrompt}
                  disabled={isImproving}
                  title="Enhance prompt with deeper sensory textures and cinematic camera nuances"
                  className="px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Wand2 className={`w-3.5 h-3.5 text-amber-400 ${isImproving ? 'animate-spin' : ''}`} />
                  <span>{isImproving ? 'Enhancing...' : 'Improve'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="regenerate-btn"
                  type="button"
                  onClick={onRegenerate}
                  className="px-3 py-2 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>

                <button
                  id="download-prompt-btn"
                  type="button"
                  onClick={handleDownload}
                  className="px-3 py-2 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>.txt</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEGATIVE PROMPT BOX (Requested Feature) */}
        {(activeTab === 'both' || activeTab === 'negative') && (
          <div
            id="negative-prompt-section"
            className="relative rounded-2xl bg-neutral-900/90 text-neutral-100 border border-red-950/60 p-5 sm:p-6 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="font-semibold text-rose-200">NEGATIVE PROMPT</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-950/70 border border-rose-900/80 text-rose-300">
                  Defect & Artifact Suppression
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Tailored for {mode.replace(/_/g, ' ')}
              </span>
            </div>

            {/* Negative Prompt Text */}
            <div
              id="negative-prompt-text"
              className="text-xs sm:text-sm leading-relaxed font-mono selection:bg-rose-900 selection:text-white whitespace-pre-wrap break-words text-neutral-300"
            >
              {negativePrompt}
            </div>

            {/* Token Chips */}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {negativeTokens.slice(0, 10).map((token, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-neutral-800 text-neutral-300 border border-neutral-700"
                >
                  -{token}
                </span>
              ))}
              {negativeTokens.length > 10 && (
                <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-neutral-800 text-neutral-400">
                  +{negativeTokens.length - 10} more
                </span>
              )}
            </div>

            {/* Action Buttons for Negative Prompt */}
            <div className="mt-5 pt-4 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  id="copy-negative-prompt-btn"
                  type="button"
                  onClick={handleCopyNegative}
                  className={`px-4 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs ${
                    copiedType === 'negative'
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-950/50 hover:bg-rose-900/60 border border-rose-800 text-rose-200 hover:scale-[1.02]'
                  }`}
                >
                  {copiedType === 'negative' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied Negative Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-rose-300" />
                      <span>Copy Negative Prompt</span>
                    </>
                  )}
                </button>

                {/* Combined Copy (Positive + Negative) */}
                <button
                  id="copy-both-prompts-btn"
                  type="button"
                  onClick={handleCopyBoth}
                  className={`px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                    copiedType === 'both' ? 'border-emerald-500 text-emerald-300' : ''
                  }`}
                >
                  {copiedType === 'both' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied Both!</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-neutral-400" />
                      <span>
                        {mode === 'midjourney' ? 'Copy With --no Flags' : 'Copy Both (Pos + Neg)'}
                      </span>
                    </>
                  )}
                </button>
              </div>

              <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
                Paste into SD, FLUX, or WebUI negative prompt box
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
