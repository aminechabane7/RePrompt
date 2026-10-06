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
  PlusCircle,
  Cpu,
} from 'lucide-react';
import { PromptMode, TargetEngine, DetailLevel } from '../types';

interface PromptResultProps {
  prompt: string;
  negativePrompt?: string;
  mode: PromptMode;
  targetEngine?: TargetEngine;
  detailLevel?: DetailLevel;
  detectedStyle?: string;
  aspectRatio?: string;
  modelUsed: string;
  isImproving: boolean;
  onImprovePrompt: () => void;
  onRegenerate: () => void;
  onNewImage?: () => void;
}

export const PromptResult: React.FC<PromptResultProps> = ({
  prompt,
  negativePrompt = '',
  mode,
  targetEngine = 'general',
  detailLevel = 'detailed',
  detectedStyle,
  aspectRatio = '16:9',
  modelUsed,
  isImproving,
  onImprovePrompt,
  onRegenerate,
  onNewImage,
}) => {
  const [activeTab, setActiveTab] = useState<'positive' | 'negative' | 'both'>('positive');
  const [copiedType, setCopiedType] = useState<'positive' | 'negative' | 'both' | null>(null);

  const hasNegative = Boolean(negativePrompt && negativePrompt.trim().length > 0);

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
  const handleCopyNegative = () => {
    if (negativePrompt) copyToClipboard(negativePrompt, 'negative');
  };

  const handleDownload = () => {
    let content = `=== REPROMPT GENERATED PROMPT ===\nEngine: ${targetEngine.toUpperCase()}\nMode: ${mode.toUpperCase()}\nDetail Level: ${detailLevel.toUpperCase()}\nAspect Ratio: ${aspectRatio}\nDetected Style: ${detectedStyle || mode}\nModel: ${modelUsed}\n\n=== POSITIVE PROMPT ===\n${prompt}`;
    if (hasNegative) {
      content += `\n\n=== NEGATIVE PROMPT ===\n${negativePrompt}`;
    }
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `reprompt-${targetEngine}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;

  return (
    <div id="prompt-result-card" className="w-full space-y-4">
      {/* Card Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-neutral-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-neutral-900 uppercase">
            Generated Prompt
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-50 border border-blue-200 text-blue-800 font-semibold">
            {targetEngine.toUpperCase()}
          </span>
          {detectedStyle && (
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700">
              {detectedStyle}
            </span>
          )}
          <span className="px-1.5 py-0.5 rounded-sm text-xs font-mono bg-neutral-100 text-neutral-600">
            {aspectRatio}
          </span>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center gap-2">
          {hasNegative && (
            <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab('positive')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'positive'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Positive
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('negative')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'negative'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Negative
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('both')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeTab === 'both'
                    ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Both
              </button>
            </div>
          )}

          {onNewImage && (
            <button
              type="button"
              onClick={onNewImage}
              className="px-3 py-1.5 rounded-xl border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>New Image</span>
            </button>
          )}
        </div>
      </div>

      {/* POSITIVE PROMPT BOX */}
      {(activeTab === 'positive' || activeTab === 'both' || !hasNegative) && (
        <div className="relative rounded-2xl bg-neutral-950 text-neutral-100 border border-neutral-800 p-5 sm:p-6 shadow-md overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs font-mono text-neutral-400">
            <div className="flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-neutral-200">
                AI IMAGE PROMPT ({targetEngine.toUpperCase()})
              </span>
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
                    : 'bg-white text-neutral-900 hover:bg-neutral-100 hover:scale-[1.01]'
                }`}
              >
                {copiedType === 'positive' ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-neutral-700" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </button>

              {/* Improve Prompt */}
              <button
                id="improve-prompt-btn"
                type="button"
                onClick={onImprovePrompt}
                disabled={isImproving}
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
                <span>Regenerate</span>
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

      {/* NEGATIVE PROMPT BOX */}
      {hasNegative && (activeTab === 'negative' || activeTab === 'both') && (
        <div
          id="negative-prompt-section"
          className="relative rounded-2xl bg-neutral-900/90 text-neutral-100 border border-red-950/60 p-5 sm:p-6 shadow-xs overflow-hidden"
        >
          <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs font-mono">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="font-semibold text-red-300">NEGATIVE PROMPT</span>
            </div>
            <span className="text-[11px] text-neutral-500">
              Suppresses distortion & artifacts for {targetEngine.toUpperCase()}
            </span>
          </div>

          <p className="text-sm leading-relaxed font-mono text-neutral-300 whitespace-pre-wrap break-words min-h-[48px]">
            {negativePrompt}
          </p>

          <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between">
            <button
              id="copy-negative-prompt-btn"
              type="button"
              onClick={handleCopyNegative}
              className={`px-3.5 py-1.5 rounded-xl font-medium text-xs flex items-center gap-1.5 transition-all ${
                copiedType === 'negative'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
              }`}
            >
              {copiedType === 'negative' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied Negative!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Negative Prompt</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
