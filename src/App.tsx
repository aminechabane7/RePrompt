/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PromptModeSelector } from './components/PromptModeSelector';
import { PromptResult } from './components/PromptResult';
import { AnalysisPanel } from './components/AnalysisPanel';
import { HistoryModal } from './components/HistoryModal';
import { AboutView } from './components/AboutView';
import { PrivacyView } from './components/PrivacyView';
import { VideoGeneratorView } from './components/VideoGeneratorView';
import { PromptMode, VisualAnalysis, PromptHistoryItem, PageRoute, GeneratePromptResponse } from './types';
import { Sparkles, ArrowRight, AlertCircle, RefreshCw, Cpu, Layers, Infinity, RotateCcw, Film } from 'lucide-react';

const MAX_FREE_GENERATIONS = 3;
const STORAGE_USAGE_KEY = 'i2p_daily_usage';
const STORAGE_HISTORY_KEY = 'i2p_prompt_history';
const STORAGE_UNLIMITED_KEY = 'i2p_unlimited_mode';

const PAGE_METADATA: Record<PageRoute, { path: string; title: string; desc: string }> = {
  generator: {
    path: '/',
    title: 'Image to Prompt – Recreate Any Image & Video With AI',
    desc: 'Upload any image or video to reverse-engineer detailed, copy-ready AI prompts and negative prompts for Midjourney, FLUX, SD 3.5, Runway, Luma, and Sora.',
  },
  video_generator: {
    path: '/video-to-prompt',
    title: 'Video to Prompt – AI Cinematography & Video Prompt Generator',
    desc: 'Upload any video clip to extract camera motion trajectories, subject kinetics, and temporal lighting for Runway Gen-3, Luma Dream Machine, Sora, and Kling.',
  },
  about: {
    path: '/about',
    title: 'About Image to Prompt – AI Prompt Reverse-Engineering Engine',
    desc: 'Learn how Image to Prompt deconstructs composition, optics, lighting schemes, and textures into precision prompts for top AI generators.',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy – Zero-Storage Architecture | Image to Prompt',
    desc: 'Our zero-storage guarantee ensures your uploaded images and video frames are never stored, saved to disk, or used for model training.',
  },
};

export default function App() {
  const [activePage, setActivePage] = useState<PageRoute>('generator');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{ name: string; size: string; width?: number; height?: number } | null>(null);
  const [promptMode, setPromptMode] = useState<PromptMode>('universal');

  // Credit and usage settings - Unlimited mode default as requested
  const [isUnlimited, setIsUnlimited] = useState<boolean>(true);
  const [generationsCount, setGenerationsCount] = useState<number>(0);

  // Generation state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [isImproving, setIsImproving] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<VisualAnalysis | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // History state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [history, setHistory] = useState<PromptHistoryItem[]>([]);

  // Synchronize URL, canonical, title, and meta tags
  const navigateTo = (page: PageRoute, replace = false) => {
    setActivePage(page);
    const meta = PAGE_METADATA[page] || PAGE_METADATA.generator;

    if (replace) {
      window.history.replaceState(null, '', meta.path);
    } else if (window.location.pathname !== meta.path) {
      window.history.pushState(null, '', meta.path);
    }

    // Document title
    document.title = meta.title;

    // Canonical link
    const canonicalLink = document.querySelector("link[rel='canonical']");
    if (canonicalLink) {
      const origin = window.location.origin || 'https://ais-dev-rm22uo2fga7gls7427qhmd-266588492875.europe-west2.run.app';
      canonicalLink.setAttribute('href', `${origin}${meta.path === '/' ? '/' : meta.path}`);
    }

    // Meta descriptions
    const metaDesc = document.querySelector("meta[name='description']");
    if (metaDesc) metaDesc.setAttribute('content', meta.desc);
    const ogDesc = document.querySelector("meta[property='og:description']");
    if (ogDesc) ogDesc.setAttribute('content', meta.desc);
    const twDesc = document.querySelector("meta[name='twitter:description']");
    if (twDesc) twDesc.setAttribute('content', meta.desc);

    // Meta titles
    const ogTitle = document.querySelector("meta[property='og:title']");
    if (ogTitle) ogTitle.setAttribute('content', meta.title);
    const twTitle = document.querySelector("meta[name='twitter:title']");
    if (twTitle) twTitle.setAttribute('content', meta.title);

    // OG URL
    const ogUrl = document.querySelector("meta[property='og:url']");
    if (ogUrl) {
      const origin = window.location.origin || 'https://ais-dev-rm22uo2fga7gls7427qhmd-266588492875.europe-west2.run.app';
      ogUrl.setAttribute('content', `${origin}${meta.path === '/' ? '/' : meta.path}`);
    }
  };

  // Detect URL slug and popstate listener
  useEffect(() => {
    const detectPage = (): PageRoute => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('/video-to-prompt') || p.includes('/video')) return 'video_generator';
      if (p.includes('/about')) return 'about';
      if (p.includes('/privacy')) return 'privacy';
      return 'generator';
    };

    const initial = detectPage();
    navigateTo(initial, true);

    const onPopState = () => {
      const detected = detectPage();
      setActivePage(detected);
      const meta = PAGE_METADATA[detected] || PAGE_METADATA.generator;
      document.title = meta.title;
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Load history, usage & unlimited preference from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory));
      }

      // Check unlimited mode preference (defaults to true)
      const savedUnlimited = localStorage.getItem(STORAGE_UNLIMITED_KEY);
      if (savedUnlimited !== null) {
        setIsUnlimited(savedUnlimited === 'true');
      } else {
        setIsUnlimited(true);
        localStorage.setItem(STORAGE_UNLIMITED_KEY, 'true');
      }

      // Reset credit usage count to 0 so the user immediately has full 3/3 credits
      const today = new Date().toISOString().slice(0, 10);
      setGenerationsCount(0);
      localStorage.setItem(STORAGE_USAGE_KEY, JSON.stringify({ date: today, count: 0 }));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, []);

  const generationsRemaining = Math.max(0, MAX_FREE_GENERATIONS - generationsCount);

  // Increment usage
  const incrementUsage = () => {
    const today = new Date().toISOString().slice(0, 10);
    const newCount = generationsCount + 1;
    setGenerationsCount(newCount);
    try {
      localStorage.setItem(STORAGE_USAGE_KEY, JSON.stringify({ date: today, count: newCount }));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  };

  const handleResetUsage = () => {
    const today = new Date().toISOString().slice(0, 10);
    setGenerationsCount(0);
    localStorage.setItem(STORAGE_USAGE_KEY, JSON.stringify({ date: today, count: 0 }));
    setErrorMsg(null);
  };

  const handleToggleUnlimited = () => {
    const next = !isUnlimited;
    setIsUnlimited(next);
    try {
      localStorage.setItem(STORAGE_UNLIMITED_KEY, String(next));
    } catch (e) {
      console.warn('Save unlimited mode error:', e);
    }
    setErrorMsg(null);
  };

  // Save item to history
  const saveToHistory = (
    promptText: string,
    analysisObj: VisualAnalysis,
    model: string,
    negPrompt?: string
  ) => {
    if (!selectedImage) return;
    const newItem: PromptHistoryItem = {
      id: `prompt-${Date.now()}`,
      timestamp: Date.now(),
      thumbnail: selectedImage,
      mode: promptMode,
      prompt: promptText,
      negativePrompt: negPrompt,
      analysis: analysisObj,
      modelUsed: model,
    };

    const updated = [newItem, ...history].slice(0, 25);
    setHistory(updated);
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save history to localStorage', e);
    }
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_HISTORY_KEY);
    } catch (e) {
      console.warn('Clear history error:', e);
    }
  };

  const handleSelectHistoryPrompt = (item: PromptHistoryItem) => {
    setSelectedImage(item.thumbnail);
    setImageInfo({ name: 'Loaded from history', size: 'History item' });
    setPromptMode(item.mode);
    setGeneratedPrompt(item.prompt);
    setNegativePrompt(item.negativePrompt || '');
    setAnalysis(item.analysis);
    setModelUsed(item.modelUsed);
    setActivePage('generator');
  };

  // Main Generation Action
  const handleGeneratePrompt = async () => {
    if (!selectedImage) {
      setErrorMsg('Please upload an image or select a sample image first.');
      return;
    }

    if (!isUnlimited && generationsRemaining <= 0) {
      setErrorMsg("You've used today's 3 free generations. Click 'Reset to 3' or switch to Unlimited mode above to continue.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setLoadingStep('Uploading & verifying image payload...');

    const stepTimer1 = setTimeout(() => {
      setLoadingStep('AI vision model analyzing composition & lighting...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('Reverse-engineering optics, textures & camera specs...');
    }, 2800);

    const stepTimer3 = setTimeout(() => {
      setLoadingStep(`Formatting copy-ready prompt for ${promptMode.toUpperCase()}...`);
    }, 4500);

    try {
      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage,
          mode: promptMode,
        }),
      });

      const data: GeneratePromptResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze image and generate prompt.');
      }

      setGeneratedPrompt(data.prompt);
      setNegativePrompt(data.negativePrompt || '');
      setAnalysis(data.analysis);
      setModelUsed(data.modelUsed || 'llava-1.5-7b-hf');
      incrementUsage();
      saveToHistory(
        data.prompt,
        data.analysis,
        data.modelUsed || 'llava-1.5-7b-hf',
        data.negativePrompt
      );

      // Scroll to results smoothly
      setTimeout(() => {
        const resultEl = document.getElementById('results-section');
        resultEl?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Generation failed:', err);
      setErrorMsg(err.message || 'An unexpected error occurred while analyzing the image.');
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  // Improve Prompt Action
  const handleImprovePrompt = async () => {
    if (!generatedPrompt) return;
    setIsImproving(true);
    try {
      const response = await fetch('/api/improve-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: generatedPrompt,
          mode: promptMode,
        }),
      });

      const data = await response.json();
      if (data.success && data.improvedPrompt) {
        setGeneratedPrompt(data.improvedPrompt);
        if (analysis) {
          saveToHistory(data.improvedPrompt, analysis, `${modelUsed} + Improved`);
        }
      }
    } catch (err) {
      console.error('Error improving prompt:', err);
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-neutral-900 selection:bg-neutral-200 overflow-x-hidden">
      {/* App Header */}
      <Header
        activePage={activePage}
        onNavigate={(page) => {
          navigateTo(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        generationsRemaining={generationsRemaining}
        maxGenerations={MAX_FREE_GENERATIONS}
        isUnlimited={isUnlimited}
        onToggleUnlimited={handleToggleUnlimited}
        onResetCredits={handleResetUsage}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {activePage === 'about' && (
          <AboutView
            onBack={() => {
              navigateTo('generator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigate={(page) => {
              navigateTo(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activePage === 'privacy' && (
          <PrivacyView
            onBack={() => {
              navigateTo('generator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNavigate={(page) => {
              navigateTo(page);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activePage === 'video_generator' && (
          <VideoGeneratorView
            isUnlimited={isUnlimited}
            generationsRemaining={generationsRemaining}
            onIncrementUsage={incrementUsage}
            onSwitchToImage={() => {
              navigateTo('generator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activePage === 'generator' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Top Feature Switcher */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center p-1 rounded-2xl bg-neutral-200/70 border border-neutral-300/80 shadow-xs">
                <a
                  href="/"
                  id="tab-image-mode-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('generator');
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-neutral-900 shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-neutral-800" />
                  <span>Image to Prompt</span>
                </a>
                <a
                  href="/video-to-prompt"
                  id="tab-video-mode-btn"
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('video_generator');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-all flex items-center gap-1.5"
                >
                  <Film className="w-4 h-4 text-blue-600" />
                  <span>Video to Prompt</span>
                  <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-bold bg-blue-600 text-white">
                    NEW
                  </span>
                </a>
              </div>
            </div>

            {/* Hero Section */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold uppercase tracking-wider mb-4 border border-neutral-200">
                <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                <span>Image → Ready-To-Use AI Prompt</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight leading-[1.15] mb-4">
                Turn Any Image Into an AI Prompt
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                Upload an image and instantly generate a detailed prompt for recreating its style, composition, lighting, subject, camera setup, and visual details with Midjourney v7, FLUX 1.1 Pro, SD 3.5 Large, or Gemini.
              </p>
            </div>

            {/* Unlimited Status / Daily Usage Banner */}
            {isUnlimited ? (
              <div
                id="unlimited-credits-banner"
                className="mb-8 p-3.5 sm:p-4 rounded-2xl bg-emerald-50/90 border border-emerald-200 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 shrink-0">
                    <Infinity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-semibold text-xs sm:text-sm text-emerald-950 flex items-center gap-1.5">
                      Unlimited Credits Enabled
                    </div>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      You have unlimited prompt generations for full testing freedom.
                    </p>
                  </div>
                </div>
                <button
                  id="switch-to-limited-button"
                  type="button"
                  onClick={handleToggleUnlimited}
                  className="text-xs font-medium text-emerald-800 hover:text-emerald-950 underline self-start sm:self-auto transition-colors"
                >
                  Test 3-Credit Limit Mode
                </button>
              </div>
            ) : generationsRemaining === 0 ? (
              <div
                id="limit-reached-banner"
                className="mb-8 p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs"
              >
                <div>
                  <div className="font-semibold text-sm flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    You've used today's 3 free generations
                  </div>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Click below to restore your 3 credits instantly, or switch to Unlimited testing mode.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    id="reset-counter-button"
                    type="button"
                    onClick={handleResetUsage}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Regenerate to 3</span>
                  </button>
                  <button
                    id="enable-unlimited-button"
                    type="button"
                    onClick={handleToggleUnlimited}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-medium transition-colors flex items-center gap-1"
                  >
                    <Infinity className="w-3 h-3" />
                    <span>Make Unlimited</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                id="credits-status-banner"
                className="mb-8 p-3 rounded-2xl bg-neutral-50 border border-neutral-200 text-neutral-700 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>
                    <strong className="text-neutral-900 font-semibold">{generationsRemaining} of {MAX_FREE_GENERATIONS}</strong> credits available
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    id="banner-reset-button"
                    type="button"
                    onClick={handleResetUsage}
                    className="text-neutral-600 hover:text-neutral-900 font-medium underline transition-colors"
                  >
                    Reset to 3
                  </button>
                  <span>•</span>
                  <button
                    id="banner-unlimited-button"
                    type="button"
                    onClick={handleToggleUnlimited}
                    className="text-emerald-700 hover:text-emerald-900 font-medium underline transition-colors"
                  >
                    Make Unlimited
                  </button>
                </div>
              </div>
            )}

            {/* Main Interactive Workspace Card */}
            <h2 className="sr-only">Image Prompt Generation Workspace</h2>
            <div className="bg-white rounded-3xl border border-neutral-200/90 p-5 sm:p-8 shadow-xs space-y-6 sm:space-y-8">
              {/* Step 1: Image Upload */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-semibold">
                    Step 1: Upload Image
                  </h3>
                  <span className="text-xs text-neutral-500 font-medium">
                    {selectedImage ? 'Image uploaded' : 'Select image'}
                  </span>
                </div>

                <ImageUploader
                  selectedImage={selectedImage}
                  imageInfo={imageInfo}
                  onImageSelected={(dataUrl, info) => {
                    setSelectedImage(dataUrl);
                    setImageInfo(info);
                    setErrorMsg(null);
                  }}
                  onClearImage={() => {
                    setSelectedImage(null);
                    setImageInfo(null);
                    setGeneratedPrompt(null);
                    setAnalysis(null);
                  }}
                  isLoading={isLoading}
                />
              </div>

              {/* Step 2: Prompt Mode Selector */}
              <div className="pt-6 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-semibold">
                    Step 2: Choose Generator Target
                  </h3>
                  <span className="text-xs text-neutral-500 font-medium">
                    8 tuned models
                  </span>
                </div>

                <PromptModeSelector
                  selectedMode={promptMode}
                  onSelectMode={(mode) => setPromptMode(mode)}
                  disabled={isLoading}
                />
              </div>

              {/* Step 3: Action Trigger */}
              <div className="pt-6 border-t border-neutral-100 flex flex-col items-center">
                <h3 className="sr-only">Step 3: Generate AI Prompt</h3>
                {errorMsg && (
                  <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <button
                  id="generate-prompt-submit"
                  type="button"
                  disabled={isLoading || !selectedImage}
                  onClick={handleGeneratePrompt}
                  className={`w-full sm:w-auto min-w-[240px] px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md ${
                    isLoading || !selectedImage
                      ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                      : 'bg-neutral-900 hover:bg-neutral-800 text-white hover:scale-[1.01] active:scale-[0.99]'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
                      <span>{loadingStep || 'Analyzing Image...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Generate Prompt</span>
                      <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
                    </>
                  )}
                </button>

                {isLoading && (
                  <p className="text-xs text-neutral-500 font-mono mt-3 animate-pulse">
                    Running vision deconstruction pipeline...
                  </p>
                )}
              </div>
            </div>

            {/* Results Section */}
            {generatedPrompt && analysis && (
              <div id="results-section" className="mt-10 sm:mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <h2 className="sr-only">Reverse-Engineered Prompt Results & Visual Analysis</h2>
                {/* Generated Prompt Card with Negative Prompt Support */}
                <PromptResult
                  prompt={generatedPrompt}
                  negativePrompt={negativePrompt}
                  mode={promptMode}
                  modelUsed={modelUsed}
                  isImproving={isImproving}
                  onImprovePrompt={handleImprovePrompt}
                  onRegenerate={handleGeneratePrompt}
                />

                {/* Reverse-Engineered Analysis Breakdown */}
                <AnalysisPanel analysis={analysis} />
              </div>
            )}

            {/* Internal Cross-Linking Promotional Section */}
            <div className="mt-12 p-6 rounded-2xl bg-neutral-100/70 border border-neutral-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="font-semibold text-neutral-900 text-sm flex items-center gap-1.5">
                    <Film className="w-4 h-4 text-blue-600" />
                    <span>Try Video to Prompt Director Engine</span>
                    <span className="px-1.5 py-0.2 rounded-xs text-[10px] font-mono font-bold bg-blue-600 text-white">NEW</span>
                  </div>
                  <p className="text-xs text-neutral-600 mt-1">
                    Reverse-engineer video keyframes into camera trajectory and kinetics prompts for Runway Gen-3, Luma Dream Machine, Sora, and Kling.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <a
                    href="/video-to-prompt"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('video_generator');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <span>Open Video to Prompt</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                  <a
                    href="/about"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('about');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-3 py-2 rounded-xl bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-medium transition-colors"
                  >
                    Prompt Modes Guide
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* History Drawer Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectPrompt={handleSelectHistoryPrompt}
        onClearHistory={handleClearHistory}
      />

      {/* Minimal Footer with Semantic Internal Links */}
      <footer id="app-footer" className="mt-auto border-t border-neutral-200 bg-white/70 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">Image & Video to Prompt</span>
            <span>•</span>
            <span>Zero Image/Video Storage Guarantee</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('generator');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-neutral-900 transition-colors"
            >
              Image to Prompt
            </a>
            <a
              href="/video-to-prompt"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('video_generator');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-neutral-900 transition-colors"
            >
              Video to Prompt
            </a>
            <a
              href="/about"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('about');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-neutral-900 transition-colors"
            >
              About
            </a>
            <a
              href="/privacy"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('privacy');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-neutral-900 transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 transition-colors"
            >
              Sitemap
            </a>
            <a
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 transition-colors"
            >
              llms.txt
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
