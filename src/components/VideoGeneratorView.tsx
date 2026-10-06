import React, { useState } from 'react';
import { VideoUpload } from './VideoUpload';
import { VideoPromptModeSelector } from './VideoPromptModeSelector';
import { VideoPromptResult } from './VideoPromptResult';
import { VideoPromptMode, VideoVisualAnalysis, GenerateVideoPromptResponse } from '../types';
import {
  Video,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Film,
  Compass,
  Layers,
  Infinity,
} from 'lucide-react';

interface VideoGeneratorViewProps {
  isUnlimited: boolean;
  generationsRemaining: number;
  onIncrementUsage: () => void;
  onSwitchToImage: () => void;
}

export const VideoGeneratorView: React.FC<VideoGeneratorViewProps> = ({
  isUnlimited,
  generationsRemaining,
  onIncrementUsage,
  onSwitchToImage,
}) => {
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [frames, setFrames] = useState<string[]>([]);
  const [videoMode, setVideoMode] = useState<VideoPromptMode>('universal_video');

  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [negativePrompt, setNegativePrompt] = useState<string>('');
  const [cameraMovement, setCameraMovement] = useState<string>('');
  const [analysis, setAnalysis] = useState<VideoVisualAnalysis | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVideoSelected = (data: {
    videoSrc: string;
    videoName: string;
    frames: string[];
    duration: number;
  }) => {
    setVideoSrc(data.videoSrc);
    setVideoName(data.videoName);
    setFrames(data.frames);
    setDuration(data.duration);
    setErrorMsg(null);
  };

  const handleClearVideo = () => {
    setVideoSrc(null);
    setVideoName('');
    setFrames([]);
    setDuration(0);
    setGeneratedPrompt(null);
    setAnalysis(null);
    setErrorMsg(null);
  };

  const handleGenerateVideoPrompt = async () => {
    if (frames.length === 0) {
      setErrorMsg('Please upload a video or select a sample video clip first.');
      return;
    }

    if (!isUnlimited && generationsRemaining <= 0) {
      setErrorMsg("You've used today's free generations. Toggle unlimited mode to continue.");
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    setLoadingStep('Ingesting keyframes & measuring temporal velocity...');

    const step1 = setTimeout(() => {
      setLoadingStep('Reverse-engineering camera trajectory & physics...');
    }, 1200);

    const step2 = setTimeout(() => {
      setLoadingStep('Analyzing subject kinetics, temporal pacing & volumetric lighting...');
    }, 2800);

    const step3 = setTimeout(() => {
      setLoadingStep(`Formatting director prompt for ${videoMode.replace(/_/g, ' ').toUpperCase()}...`);
    }, 4500);

    try {
      const response = await fetch('/api/generate-video-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          mode: videoMode,
        }),
      });

      const data: GenerateVideoPromptResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to analyze video and generate prompt.');
      }

      setGeneratedPrompt(data.prompt);
      setNegativePrompt(data.negativePrompt);
      setCameraMovement(data.cameraMovement);
      setAnalysis(data.analysis);
      setModelUsed(data.modelUsed || 'Gemini Vision Video');
      onIncrementUsage();

      setTimeout(() => {
        const resultEl = document.getElementById('video-results-section');
        resultEl?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Video prompt generation failed:', err);
      setErrorMsg(err.message || 'An error occurred while analyzing the video.');
    } finally {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(step3);
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div id="video-generator-view" className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Top Feature Switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center p-1 rounded-2xl bg-neutral-200/70 border border-neutral-300/80 shadow-xs">
          <button
            id="switch-to-image-mode-btn"
            type="button"
            onClick={onSwitchToImage}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-medium text-neutral-600 hover:text-neutral-900 transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-neutral-500" />
            <span>Image to Prompt</span>
          </button>
          <button
            id="current-video-mode-btn"
            type="button"
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-white text-neutral-900 shadow-xs flex items-center gap-1.5"
          >
            <Film className="w-4 h-4 text-blue-600" />
            <span>Video to Prompt</span>
            <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-mono font-bold bg-blue-600 text-white">
              NEW
            </span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-200">
          <Video className="w-3.5 h-3.5 text-blue-600" />
          <span>AI Cinematography Reverse-Engineering</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-neutral-900 tracking-tight leading-[1.15] mb-4">
          Turn Any Video Into an AI Video Prompt
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
          Upload any video clip to extract camera motion trajectories, subject kinetics, temporal pacing, and lighting dynamics. Generates ready-to-use prompts and artifact-suppression negative prompts for Runway Gen-3, Luma Dream Machine, Sora, Kling, and Pika.
        </p>
      </div>

      {/* Main Form Stack */}
      <h2 className="sr-only">Video Reverse-Engineering Pipeline</h2>
      <div className="space-y-6">
        {/* Step 1: Video Engine Mode */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-neutral-200/90 shadow-xs space-y-3">
          <VideoPromptModeSelector
            selectedMode={videoMode}
            onSelectMode={setVideoMode}
            disabled={isLoading}
          />
        </div>

        {/* Step 2: Video Upload / Keyframes */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-neutral-200/90 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <h3 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
                Step 2: Upload Video Clip
              </h3>
            </div>
            {duration > 0 && (
              <span className="text-xs font-mono text-neutral-500">
                Duration: {duration.toFixed(1)}s
              </span>
            )}
          </div>

          <VideoUpload
            onVideoSelected={handleVideoSelected}
            onClear={handleClearVideo}
            isLoading={isLoading}
          />
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div
            id="video-error-alert"
            className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-start gap-2.5 shadow-xs"
          >
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-red-900">Analysis Notice</p>
              <p className="mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Generate Button */}
        <div className="pt-2">
          <button
            id="generate-video-prompt-btn"
            type="button"
            disabled={isLoading || frames.length === 0}
            onClick={handleGenerateVideoPrompt}
            className={`w-full py-4 px-6 rounded-2xl font-semibold text-sm sm:text-base flex items-center justify-center gap-3 transition-all shadow-md ${
              isLoading || frames.length === 0
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300'
                : 'bg-neutral-900 text-white hover:bg-black hover:scale-[1.005] active:scale-[0.99] border border-neutral-800'
            }`}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="truncate">{loadingStep || 'Analyzing video kinetics...'}</span>
              </>
            ) : (
              <>
                <Video className="w-5 h-5 text-blue-400" />
                <span>Generate Video Director Prompt</span>
                <ArrowRight className="w-4 h-4 text-neutral-400" />
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        {generatedPrompt && analysis && (
          <div id="video-results-section" className="pt-6 space-y-6">
            <h2 className="sr-only">Video Prompt Results & Cinematography Breakdown</h2>
            <VideoPromptResult
              prompt={generatedPrompt}
              negativePrompt={negativePrompt}
              cameraMovement={cameraMovement}
              analysis={analysis}
              mode={videoMode}
              modelUsed={modelUsed}
              onRegenerate={handleGenerateVideoPrompt}
            />
          </div>
        )}

        {/* Internal Cross-Linking Section */}
        <div className="mt-12 p-6 rounded-2xl bg-neutral-100/70 border border-neutral-200 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-neutral-900">Need still image prompt reverse engineering?</p>
              <p className="text-neutral-500 mt-0.5">Switch to the Image to Prompt engine for FLUX 1.1, Midjourney v7, and SD 3.5 Large.</p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onSwitchToImage();
                }}
                className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white font-medium hover:bg-black transition-colors"
              >
                Go to Image to Prompt
              </a>
              <a
                href="/about"
                onClick={(e) => {
                  e.preventDefault();
                  window.history.pushState(null, '', '/about');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-neutral-200 text-neutral-700 font-medium hover:bg-neutral-50 transition-colors"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
