/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { PromptModeSelector } from './components/PromptModeSelector';
import { EngineDetailSelector } from './components/EngineDetailSelector';
import { PromptResult } from './components/PromptResult';
import { AnalysisPanel } from './components/AnalysisPanel';
import { HistoryModal } from './components/HistoryModal';
import { AuthModal } from './components/AuthModal';
import { AccountView } from './components/AccountView';
import { AboutView } from './components/AboutView';
import { PrivacyView } from './components/PrivacyView';
import { TermsView } from './components/TermsView';
import { ContactView } from './components/ContactView';
import { VideoGeneratorView } from './components/VideoGeneratorView';
import { ResetPasswordView } from './components/ResetPasswordView';
import { useAuth } from './lib/AuthContext';
import {
  MAX_SAFE_REQUEST_BYTES,
  measureJsonPayloadBytes,
  optimizeImageForUpload,
} from './lib/clientImageOptimizer';
import {
  PromptMode,
  TargetEngine,
  DetailLevel,
  VisualAnalysis,
  PromptHistoryItem,
  PageRoute,
  GeneratePromptResponse,
} from './types';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  Film,
  Lock,
  Zap,
} from 'lucide-react';

const PAGE_METADATA: Record<PageRoute | 'account', { path: string; title: string; desc: string }> = {
  generator: {
    path: '/',
    title: 'RePrompt – Image to Prompt Generator for AI Visuals',
    desc: 'Upload any image to reverse-engineer detailed, copy-ready AI prompts and negative prompts for Midjourney v7, FLUX 1.1 Pro, SD 3.5 Large, and Gemini.',
  },
  video_generator: {
    path: '/video-to-prompt',
    title: 'Video to Prompt – AI Cinematography & Video Prompt Generator | RePrompt',
    desc: 'Upload any video clip to extract camera trajectories, subject kinetics, and temporal lighting for Runway Gen-3, Luma Dream Machine, Sora, and Kling.',
  },
  about: {
    path: '/about',
    title: 'About RePrompt – AI Prompt Reverse-Engineering Engine',
    desc: 'Learn how RePrompt deconstructs composition, estimated optics, lighting schemes, and textures into precision prompts for top AI generators.',
  },
  privacy: {
    path: '/privacy',
    title: 'Privacy Policy – Zero-Storage Architecture | RePrompt',
    desc: 'Our zero-storage guarantee ensures your uploaded images and video frames are never stored, written to disk, or used for model training.',
  },
  terms: {
    path: '/terms',
    title: 'Terms of Use | RePrompt',
    desc: 'Terms of service and acceptable use agreement for the RePrompt AI image-to-prompt generation tool.',
  },
  contact: {
    path: '/contact',
    title: 'Contact & Support | RePrompt',
    desc: 'Get in touch with the RePrompt team for questions, feedback, or support regarding AI prompt reverse-engineering.',
  },
  account: {
    path: '/account',
    title: 'My Account & Usage | RePrompt',
    desc: 'Manage your RePrompt account, view server-enforced usage allowances, and plan details.',
  },
};

export default function App() {
  const {
    user,
    session,
    usage,
    loading,
    refreshUsage,
    getAccessToken,
    isConfigured,
    isPasswordRecovery,
    recoveryError,
    clearPasswordRecovery,
  } = useAuth();

  const [activePage, setActivePage] = useState<PageRoute | 'account'>('generator');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<{ name: string; size: string; width?: number; height?: number } | null>(null);

  // Core generation controls
  const [promptMode, setPromptMode] = useState<PromptMode>('general');
  const [targetEngine, setTargetEngine] = useState<TargetEngine>('general');
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('detailed');

  // Generation execution state
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [isImproving, setIsImproving] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [analysis, setAnalysis] = useState<VisualAnalysis | null>(null);
  const [detectedStyle, setDetectedStyle] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [modelUsed, setModelUsed] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Synchronize URL, canonical, title, and meta tags
  const navigateTo = (page: PageRoute | 'account', replace = false) => {
    setActivePage(page);
    const meta = PAGE_METADATA[page] || PAGE_METADATA.generator;

    if (replace) {
      window.history.replaceState(null, '', meta.path);
    } else if (window.location.pathname !== meta.path) {
      window.history.pushState(null, '', meta.path);
    }

    document.title = meta.title;

    const canonicalLink = document.querySelector("link[rel='canonical']");
    if (canonicalLink) {
      const origin = window.location.origin;
      canonicalLink.setAttribute('href', `${origin}${meta.path === '/' ? '/' : meta.path}`);
    }

    const metaDesc = document.querySelector("meta[name='description']");
    if (metaDesc) metaDesc.setAttribute('content', meta.desc);
    const ogDesc = document.querySelector("meta[property='og:description']");
    if (ogDesc) ogDesc.setAttribute('content', meta.desc);
    const twDesc = document.querySelector("meta[name='twitter:description']");
    if (twDesc) twDesc.setAttribute('content', meta.desc);

    const ogTitle = document.querySelector("meta[property='og:title']");
    if (ogTitle) ogTitle.setAttribute('content', meta.title);
    const twTitle = document.querySelector("meta[name='twitter:title']");
    if (twTitle) twTitle.setAttribute('content', meta.title);

    const ogUrl = document.querySelector("meta[property='og:url']");
    if (ogUrl) {
      const origin = window.location.origin;
      ogUrl.setAttribute('content', `${origin}${meta.path === '/' ? '/' : meta.path}`);
    }
  };

  // URL route listener
  useEffect(() => {
    const detectPage = (): PageRoute | 'account' => {
      const p = window.location.pathname.toLowerCase();
      if (p.includes('/video-to-prompt') || p.includes('/video')) return 'video_generator';
      if (p.includes('/about')) return 'about';
      if (p.includes('/privacy')) return 'privacy';
      if (p.includes('/terms')) return 'terms';
      if (p.includes('/contact')) return 'contact';
      if (p.includes('/account')) return 'account';
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

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'forgot') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  const handleSelectHistoryPrompt = (item: PromptHistoryItem) => {
    setPromptMode(item.mode);
    if (item.targetEngine) setTargetEngine(item.targetEngine);
    if (item.detailLevel) setDetailLevel(item.detailLevel);
    if (item.detectedStyle) setDetectedStyle(item.detectedStyle);
    if (item.aspectRatio) setAspectRatio(item.aspectRatio);
    setGeneratedPrompt(item.prompt);
    setNegativePrompt(item.negativePrompt || '');
    setAnalysis(item.analysis);
    setModelUsed(item.modelUsed);
    setActivePage('generator');
  };

  // Main Generation Action with Auth & Server Credit Enforcement
  const handleGeneratePrompt = async () => {
    if (!selectedImage) {
      setErrorMsg('Please upload an image or select a sample image first.');
      return;
    }

    // 1. If auth is still loading, wait for initialization
    if (loading) {
      setErrorMsg('Checking authentication status, please wait a moment...');
      return;
    }

    // 2. Authoritative asynchronous token retrieval at action time
    const token = await getAccessToken();

    // 3. If Supabase is configured and no valid token is found, open Sign In
    if (isConfigured && !token) {
      handleOpenAuth('signin');
      setErrorMsg('Please sign in or create an account to generate prompts.');
      return;
    }

    // 4. Pre-check client usage state
    if (usage && usage.remaining <= 0) {
      setErrorMsg('Free generation limit reached (3/3 used). Please check your account.');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setLoadingStep('Uploading & verifying image payload...');

    const stepTimer1 = setTimeout(() => {
      setLoadingStep('AI vision model analyzing composition & lighting...');
    }, 1200);

    const stepTimer2 = setTimeout(() => {
      setLoadingStep('Deconstructing optics, textures & visual depth...');
    }, 2800);

    const stepTimer3 = setTimeout(() => {
      setLoadingStep(`Formatting prompt for ${targetEngine.toUpperCase()} (${detailLevel})...`);
    }, 4500);

    try {
      // 5. Client image optimization & payload measurement
      let imagePayload = selectedImage;
      let payloadBody = {
        image: imagePayload,
        mode: promptMode,
        targetEngine,
        detailLevel,
      };

      let serializedBytes = measureJsonPayloadBytes(payloadBody);

      if (serializedBytes > MAX_SAFE_REQUEST_BYTES) {
        setLoadingStep('Optimizing payload to fit safe transmission budget...');
        const reOpt = await optimizeImageForUpload(imagePayload, 'image.jpg', 2.5 * 1024 * 1024);
        imagePayload = reOpt.dataUrl;
        payloadBody = {
          image: imagePayload,
          mode: promptMode,
          targetEngine,
          detailLevel,
        };
        serializedBytes = measureJsonPayloadBytes(payloadBody);
      }

      if (serializedBytes > MAX_SAFE_REQUEST_BYTES) {
        throw new Error(`The image payload (${(serializedBytes / (1024 * 1024)).toFixed(2)} MB) exceeds the safe 3.5 MB request budget. Please select a smaller image.`);
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      } else if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers,
        body: JSON.stringify(payloadBody),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text.includes('<!doctype') ? 'Server route error. Please reload or try again.' : text || 'Server returned an invalid response.');
      }

      if (!response.ok || !data?.success) {
        if (response.status === 401) {
          handleOpenAuth('signin');
          throw new Error('Please sign in to generate prompts.');
        }
        if (response.status === 403 || data?.code === 'LIMIT_REACHED') {
          await refreshUsage();
          throw new Error('Free generation limit reached (3 of 3 free generations used).');
        }
        throw new Error(data?.error || 'Failed to analyze image and generate prompt.');
      }

      setGeneratedPrompt(data.prompt);
      setNegativePrompt(data.negativePrompt || '');
      setAnalysis(data.analysis);
      setDetectedStyle(data.detectedStyle || '');
      setAspectRatio(data.aspectRatio || '16:9');
      setModelUsed(data.modelUsed || 'Gemini Vision');

      // Refresh real server-side credit counter
      await refreshUsage();

      setTimeout(() => {
        const resultEl = document.getElementById('results-section');
        resultEl?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while analyzing the image.');
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
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      const token = await getAccessToken();
      const activeToken = token || session?.access_token;
      if (activeToken) {
        headers['Authorization'] = `Bearer ${activeToken}`;
      }

      const response = await fetch('/api/improve-prompt', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: generatedPrompt,
          mode: promptMode,
          targetEngine,
          detailLevel,
        }),
      });

      const contentType = response.headers.get('content-type') || '';
      let data: any = null;
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text.includes('<!doctype') ? 'Server route error. Please try again.' : text || 'Server returned an invalid response.');
      }

      if (data?.success && data?.improvedPrompt) {
        setGeneratedPrompt(data.improvedPrompt);
      } else {
        throw new Error(data?.error || 'Failed to improve prompt.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to improve prompt.');
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] text-neutral-900 selection:bg-neutral-200 overflow-x-hidden">
      {/* App Header */}
      <Header
        activePage={activePage as PageRoute}
        onNavigate={(page) => {
          navigateTo(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenAuthModal={handleOpenAuth}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {isPasswordRecovery || recoveryError ? (
          <div className="py-12 sm:py-20 px-4 sm:px-6 flex items-center justify-center">
            <ResetPasswordView
              onComplete={() => {
                clearPasswordRecovery();
                navigateTo('generator');
              }}
              onRequestNewLink={() => {
                clearPasswordRecovery();
                handleOpenAuth('forgot');
              }}
            />
          </div>
        ) : (
          <>
            {activePage === 'account' && (
          <AccountView
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

        {activePage === 'terms' && (
          <TermsView
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

        {activePage === 'contact' && (
          <ContactView
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
            onSwitchToImage={() => {
              navigateTo('generator');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {activePage === 'generator' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
            {/* Top Switcher */}
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
                  <Film className="w-4 h-4 text-neutral-600" />
                  <span>Video to Prompt</span>
                </a>
              </div>
            </div>

            {/* Hero Section */}
            <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold uppercase tracking-wider mb-4 border border-neutral-200">
                <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                <span>Visual Reverse-Engineering</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight leading-[1.15] mb-4">
                Turn Any Image Into an AI Prompt
              </h1>
              <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
                Upload an image to reverse-engineer its visual DNA. Generates structured, tailored prompts designed to recreate similar visuals in Midjourney v7, FLUX 1.1 Pro, SD 3.5 Large, DALL-E, or Gemini.
              </p>
            </div>

            {/* Usage Status Pill for logged in users */}
            {user && usage && (
              <div className="mb-6 p-3 rounded-2xl bg-white border border-neutral-200 flex items-center justify-between text-xs shadow-2xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="font-medium text-neutral-700">
                    Server Credits: <strong>{Math.max(0, usage.generationLimit - usage.generationsUsed)}</strong> of {usage.generationLimit} remaining
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigateTo('account')}
                  className="text-neutral-500 hover:text-neutral-900 underline font-medium"
                >
                  Manage Account
                </button>
              </div>
            )}

            {/* Main Interactive Workspace Card */}
            <div className="bg-white rounded-3xl border border-neutral-200 p-5 sm:p-8 shadow-xs space-y-6 sm:space-y-8">
              {/* Step 1: Upload Image */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-semibold">
                    Step 1: Upload Image
                  </h2>
                  <span className="text-xs text-neutral-500 font-medium">
                    {selectedImage ? 'Image verified' : 'Select image'}
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

              {/* Step 2: Target Engine & Detail Level */}
              <div className="pt-6 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-semibold">
                    Step 2: Choose Target AI Engine & Depth
                  </h2>
                </div>

                <EngineDetailSelector
                  selectedEngine={targetEngine}
                  onSelectEngine={setTargetEngine}
                  selectedDetail={detailLevel}
                  onSelectDetail={setDetailLevel}
                  disabled={isLoading}
                />
              </div>

              {/* Step 3: Style Mode Selection */}
              <div className="pt-6 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-mono uppercase tracking-wider text-neutral-500 font-semibold">
                    Step 3: Visual Style Focus
                  </h2>
                </div>

                <PromptModeSelector
                  selectedMode={promptMode}
                  onSelectMode={(mode) => setPromptMode(mode)}
                  disabled={isLoading}
                />
              </div>

              {/* Step 4: Action Trigger */}
              <div className="pt-6 border-t border-neutral-100 flex flex-col items-center">
                {errorMsg && (
                  <div className="w-full mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                    {!user && isConfigured && (
                      <button
                        type="button"
                        onClick={() => handleOpenAuth('signup')}
                        className="px-2.5 py-1 rounded-lg bg-neutral-900 text-white font-semibold text-xs shrink-0"
                      >
                        Sign Up Free
                      </button>
                    )}
                  </div>
                )}

                <button
                  id="generate-prompt-submit"
                  type="button"
                  disabled={isLoading || !selectedImage}
                  onClick={handleGeneratePrompt}
                  className={`w-full sm:w-auto min-w-[260px] px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md ${
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
              </div>
            </div>

            {/* Results Section */}
            {generatedPrompt && analysis && (
              <div id="results-section" className="mt-10 sm:mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {/* Prompt Result Box */}
                <PromptResult
                  prompt={generatedPrompt}
                  negativePrompt={negativePrompt}
                  mode={promptMode}
                  targetEngine={targetEngine}
                  detailLevel={detailLevel}
                  detectedStyle={detectedStyle}
                  aspectRatio={aspectRatio}
                  modelUsed={modelUsed}
                  isImproving={isImproving}
                  onImprovePrompt={handleImprovePrompt}
                  onRegenerate={handleGeneratePrompt}
                  onNewImage={() => {
                    setSelectedImage(null);
                    setImageInfo(null);
                    setGeneratedPrompt(null);
                    setAnalysis(null);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />

                {/* Technical Deconstruction Panel */}
                <AnalysisPanel analysis={analysis} />
              </div>
            )}
          </div>
        )}
          </>
        )}
      </main>

      {/* History Drawer Modal (Cloud-Synced with Supabase) */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onSelectPrompt={handleSelectHistoryPrompt}
        onOpenAuthModal={() => handleOpenAuth('signin')}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
      />

      {/* Minimal Footer with Semantic Internal Links */}
      <footer id="app-footer" className="mt-auto border-t border-neutral-200 bg-white/70 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-bold text-neutral-800">RePrompt</span>
            <span>•</span>
            <span>Image to Prompt Generator</span>
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
              href="/terms"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('terms');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-neutral-900 transition-colors"
            >
              Terms of Use
            </a>
            <a
              href="/contact"
              onClick={(e) => {
                e.preventDefault();
                navigateTo('contact');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="hover:text-neutral-900 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
