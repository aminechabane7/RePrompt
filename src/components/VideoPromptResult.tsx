import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  RotateCw,
  Video,
  ShieldAlert,
  Layers,
  Compass,
  Zap,
  Clock,
  SunMedium,
  Maximize2,
  Palette,
} from 'lucide-react';
import { VideoPromptMode, VideoVisualAnalysis } from '../types';

interface VideoPromptResultProps {
  prompt: string;
  negativePrompt: string;
  cameraMovement: string;
  analysis: VideoVisualAnalysis;
  mode: VideoPromptMode;
  modelUsed: string;
  onRegenerate: () => void;
}

export const VideoPromptResult: React.FC<VideoPromptResultProps> = ({
  prompt,
  negativePrompt,
  cameraMovement,
  analysis,
  mode,
  modelUsed,
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
    const combined = `=== AI VIDEO PROMPT (${mode.toUpperCase()}) ===\nCAMERA MOVEMENT: ${cameraMovement}\n\nFINAL VIDEO PROMPT:\n${prompt}\n\nNEGATIVE VIDEO PROMPT:\n${negativePrompt}`;
    copyToClipboard(combined, 'both');
  };

  const handleDownload = () => {
    const content = `=== AI VIDEO DIRECTOR PROMPT (${mode.toUpperCase()}) ===
CAMERA MOVEMENT: ${cameraMovement}

FINAL VIDEO PROMPT:
${prompt}

NEGATIVE VIDEO PROMPT:
${negativePrompt}

=== CINEMATOGRAPHY BREAKDOWN ===
- Camera Motion: ${analysis.cameraMotion}
- Subject Kinematics: ${analysis.subjectKinematics}
- Temporal Pacing: ${analysis.temporalPacing}
- Lighting & Atmosphere: ${analysis.lightingAtmosphere}
- Cinematic Framing: ${analysis.cinematicFraming}
- Visual Style: ${analysis.visualStyle}

Generated via Video to Prompt AI | Engine: ${modelUsed}`;

    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `video-prompt-${mode}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const charCount = prompt.length;

  return (
    <div id="video-prompt-result" className="w-full space-y-4">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
          <h3 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase">
            Director Video Prompt
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-blue-50 border border-blue-200 text-blue-800 font-medium">
            {mode.replace(/_/g, ' ').toUpperCase()}
          </span>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200 text-xs font-medium">
          <button
            id="video-tab-both"
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
            id="video-tab-positive"
            type="button"
            onClick={() => setActiveTab('positive')}
            className={`px-3 py-1 rounded-lg transition-all ${
              activeTab === 'positive'
                ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Video Prompt
          </button>
          <button
            id="video-tab-negative"
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

      {/* Prompts Container */}
      <div className="space-y-4">
        {/* POSITIVE VIDEO PROMPT BOX */}
        {(activeTab === 'both' || activeTab === 'positive') && (
          <div className="relative rounded-2xl bg-neutral-950 text-neutral-100 border border-neutral-800 p-5 sm:p-6 shadow-md overflow-hidden">
            {/* Header info bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-neutral-200">GENERATED VIDEO PROMPT</span>
              </div>

              {/* Camera Tag Badge */}
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-950 border border-blue-800 text-blue-300 font-mono text-[11px] flex items-center gap-1">
                  <Compass className="w-3 h-3 text-blue-400" />
                  <span>{cameraMovement || 'Cinematic Tracking'}</span>
                </span>
                <span className="text-[11px] text-neutral-500 font-mono">
                  {wordCount}w • {charCount}c
                </span>
              </div>
            </div>

            {/* Prompt Text */}
            <div
              id="generated-video-prompt-text"
              className="text-sm sm:text-base leading-relaxed font-mono selection:bg-blue-900 selection:text-white whitespace-pre-wrap break-words text-neutral-200 min-h-[90px]"
            >
              {prompt}
            </div>

            {/* Actions Toolbar */}
            <div className="mt-5 pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  id="copy-video-prompt-btn"
                  type="button"
                  onClick={handleCopyPositive}
                  className={`px-4 py-2 rounded-xl font-medium text-xs sm:text-sm flex items-center gap-2 transition-all shadow-xs ${
                    copiedType === 'positive'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-neutral-900 hover:bg-neutral-100 hover:scale-[1.02]'
                  }`}
                >
                  {copiedType === 'positive' ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Copied Video Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-neutral-700" />
                      <span>Copy Video Prompt</span>
                    </>
                  )}
                </button>

                <button
                  id="copy-both-video-btn"
                  type="button"
                  onClick={handleCopyBoth}
                  className={`px-3.5 py-2 rounded-xl border border-neutral-700 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs sm:text-sm font-medium transition-all flex items-center gap-2 ${
                    copiedType === 'both' ? 'border-emerald-500 text-emerald-300' : ''
                  }`}
                >
                  {copiedType === 'both' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Copied Pos + Neg!</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4 text-neutral-400" />
                      <span>Copy Both (Pos + Neg)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="regenerate-video-btn"
                  type="button"
                  onClick={onRegenerate}
                  className="px-3 py-2 rounded-xl border border-neutral-800 hover:border-neutral-700 bg-neutral-900/80 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Regenerate</span>
                </button>

                <button
                  id="download-video-prompt-btn"
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

        {/* NEGATIVE VIDEO PROMPT BOX */}
        {(activeTab === 'both' || activeTab === 'negative') && (
          <div
            id="negative-video-prompt-section"
            className="relative rounded-2xl bg-neutral-900/90 text-neutral-100 border border-rose-950/60 p-5 sm:p-6 shadow-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-neutral-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span className="font-semibold text-rose-200">NEGATIVE VIDEO PROMPT</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-950/70 border border-rose-900/80 text-rose-300">
                  Flicker & Morph Suppression
                </span>
              </div>
              <span className="text-[11px] text-neutral-400">
                Prevents jitter, warped limbs & morphing
              </span>
            </div>

            {/* Negative Prompt Text */}
            <div
              id="negative-video-prompt-text"
              className="text-xs sm:text-sm leading-relaxed font-mono selection:bg-rose-900 selection:text-white whitespace-pre-wrap break-words text-neutral-300"
            >
              {negativePrompt}
            </div>

            {/* Actions for Negative Prompt */}
            <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between">
              <button
                id="copy-negative-video-prompt-btn"
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
                    <span>Copied Negative Video Prompt!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-rose-300" />
                    <span>Copy Negative Video Prompt</span>
                  </>
                )}
              </button>
              <span className="text-[11px] text-neutral-500 font-mono hidden sm:inline">
                Model: {modelUsed}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Director Cinematography Breakdown */}
      <div className="mt-6 space-y-3">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-neutral-500" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-neutral-600">
            Reverse-Engineered Cinematography Breakdown
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Camera Motion */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 mb-1.5">
              <Compass className="w-3.5 h-3.5 text-blue-500" />
              <span>Camera Motion</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-mono">
              {analysis.cameraMotion}
            </p>
          </div>

          {/* Subject Kinematics */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 mb-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Subject Kinematics</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-mono">
              {analysis.subjectKinematics}
            </p>
          </div>

          {/* Temporal Pacing */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-500" />
              <span>Temporal Pacing</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-mono">
              {analysis.temporalPacing}
            </p>
          </div>

          {/* Lighting & Atmosphere */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 mb-1.5">
              <SunMedium className="w-3.5 h-3.5 text-orange-500" />
              <span>Lighting & Atmosphere</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-mono">
              {analysis.lightingAtmosphere}
            </p>
          </div>

          {/* Cinematic Framing */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 mb-1.5">
              <Maximize2 className="w-3.5 h-3.5 text-violet-500" />
              <span>Cinematic Framing</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-mono">
              {analysis.cinematicFraming}
            </p>
          </div>

          {/* Visual Style */}
          <div className="p-3.5 rounded-xl border border-neutral-200 bg-white shadow-xs">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 mb-1.5">
              <Palette className="w-3.5 h-3.5 text-pink-500" />
              <span>Visual Style</span>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed font-mono">
              {analysis.visualStyle}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
