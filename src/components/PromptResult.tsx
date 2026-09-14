import React, { useState } from 'react';
import { Copy, Check, Download, Wand2, RotateCw, Sparkles, Terminal } from 'lucide-react';
import { PromptMode } from '../types';

interface PromptResultProps {
  prompt: string;
  mode: PromptMode;
  modelUsed: string;
  isImproving: boolean;
  onImprovePrompt: () => void;
  onRegenerate: () => void;
}

export const PromptResult: React.FC<PromptResultProps> = ({
  prompt,
  mode,
  modelUsed,
  isImproving,
  onImprovePrompt,
  onRegenerate,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = prompt;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([prompt], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `prompt-${mode}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;

  return (
    <div id="prompt-result-card" className="w-full">
      {/* Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase">
            Your Generated Prompt
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-neutral-100 border border-neutral-200 text-neutral-600">
            {mode.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-500 font-mono">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} chars</span>
          <span className="hidden sm:inline">•</span>
          <span className="hidden sm:inline px-2 py-0.5 rounded-sm bg-neutral-100 text-neutral-600">
            {modelUsed}
          </span>
        </div>
      </div>

      {/* Dark Result Panel */}
      <div className="relative rounded-2xl bg-neutral-950 text-neutral-100 border border-neutral-800 p-5 sm:p-6 shadow-md overflow-hidden">
        {/* Terminal subtle header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs font-mono text-neutral-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-neutral-500" />
            <span>ready-to-use image prompt</span>
          </div>
          <span className="text-[11px] text-neutral-500">Reverse-engineered</span>
        </div>

        {/* Prompt Content */}
        <div
          id="generated-prompt-text"
          className="text-sm sm:text-base leading-relaxed font-mono selection:bg-neutral-700 selection:text-white whitespace-pre-wrap break-words text-neutral-200 min-h-[90px]"
        >
          {prompt}
        </div>

        {/* Action Toolbar */}
        <div className="mt-6 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
          {/* Main Copy Action */}
          <div className="flex items-center gap-2">
            <button
              id="copy-prompt-btn"
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white text-neutral-900 hover:bg-neutral-100 hover:scale-[1.02]'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied to Clipboard!</span>
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
              title="Enhance prompt with deeper sensory textures and cinematic camera nuances"
              className="px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              <Wand2 className={`w-3.5 h-3.5 text-amber-400 ${isImproving ? 'animate-spin' : ''}`} />
              <span>{isImproving ? 'Enhancing...' : 'Improve Prompt'}</span>
            </button>
          </div>

          {/* Secondary Actions */}
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
    </div>
  );
};
