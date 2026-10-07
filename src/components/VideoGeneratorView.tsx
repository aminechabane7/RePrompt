import React, { useState } from 'react';
import { VideoUpload } from './VideoUpload';
import { VideoPromptModeSelector } from './VideoPromptModeSelector';
import { VideoPromptResult } from './VideoPromptResult';
import { VideoPromptMode, VideoVisualAnalysis, GenerateVideoPromptResponse } from '../types';
import { useAuth } from '../lib/AuthContext';
import {
  MAX_SAFE_REQUEST_BYTES,
  measureJsonPayloadBytes,
  optimizeVideoKeyframes,
} from '../lib/clientImageOptimizer';
import {
  Video,
  Sparkles,
  ArrowRight,
  AlertCircle,
  Film,
} from 'lucide-react';

interface VideoGeneratorViewProps {
  onSwitchToImage: () => void;
}

export const VideoGeneratorView: React.FC<VideoGeneratorViewProps> = ({
  onSwitchToImage,
}) => {
  const { user, getAccessToken } = useAuth();
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

    setErrorMsg(null);
    setIsLoading(true);
    setLoadingStep('Uploading & verifying video keyframes...');

    const step1 = setTimeout(() => {
      setLoadingStep('Reverse-engineering camera trajectory & physics...');
    }, 1500);

    const step2 = setTimeout(() => {
      setLoadingStep('Analyzing subject kinetics, temporal pacing & lighting...');
    }, 3500);

    const step3 = setTimeout(() => {
      setLoadingStep(`Formatting director prompt for ${videoMode.replace(/_/g, ' ').toUpperCase()}...`);
    }, 5500);

    try {
      // Measure total combined serialized JSON payload
      let candidateFrames = frames;
      let payloadBody = {
        frames: candidateFrames,
        mode: videoMode,
      };

      let serializedBytes = measureJsonPayloadBytes(payloadBody);

      if (serializedBytes > MAX_SAFE_REQUEST_BYTES) {
        setLoadingStep('Optimizing video keyframes for safe transmission...');
        candidateFrames = await optimizeVideoKeyframes(frames, 2.5 * 1024 * 1024);
        payloadBody = {
          frames: candidateFrames,
          mode: videoMode,
        };
        serializedBytes = measureJsonPayloadBytes(payloadBody);
      }

      if (serializedBytes > MAX_SAFE_REQUEST_BYTES) {
        throw new Error(`The video keyframes payload (${(serializedBytes / (1024 * 1024)).toFixed(2)} MB) exceeds the safe 3.5 MB request budget. Please select a shorter or lower-resolution video.`);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = await getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('/api/generate-video-prompt', {
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
        throw new Error(text.includes('<!doctype') ? 'Server route error. Please try again.' : text || 'Server returned an invalid response.');
      }

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to analyze video and generate prompt.');
      }

      setGeneratedPrompt(data.prompt);
      setNegativePrompt(data.negativePrompt);
      setCameraMovement(data.cameraMovement);
      setAnalysis(data.analysis);
      setModelUsed(data.modelUsed || 'Gemini Vision Video');

      setTimeout(() => {
        const resultEl = document.getElementById('video-results-section');
        resultEl?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
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
            <Film className="w-4 h-4 text-neutral-800" />
            <span>Video to Prompt</span>
          </button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-semibold uppercase tracking-wider mb-4 border border-neutral-200">
          <Video className="w-3.5 h-3.5 text-neutral-700" />
          <span>Cinematography Reverse-Engineering</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight leading-[1.15] mb-4">
          Turn Video Clips Into AI Prompts
        </h1>
        <p className="text-sm sm:text-base text-neutral-600 leading-relaxed">
          Upload a video clip to extract camera trajectory, subject momentum, and lighting dynamics. Generates copy-ready prompts for Runway Gen-3, Luma Dream Machine, Sora, and Kling.
        </p>
      </div>

      {/* Main Form Stack */}
      <div className="space-y-6">
        {/* Step 1: Video Engine Mode */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-3">
          <VideoPromptModeSelector
            selectedMode={videoMode}
            onSelectMode={setVideoMode}
            disabled={isLoading}
          />
        </div>

        {/* Step 2: Video Upload / Keyframes */}
        <div className="p-4 sm:p-6 rounded-2xl bg-white border border-neutral-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-neutral-900 text-white text-[11px] font-bold flex items-center justify-center">
                2
              </span>
              <h2 className="text-sm font-semibold text-neutral-900 uppercase tracking-wide">
                Upload Video Clip
              </h2>
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

        {/* Action Button */}
        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex justify-center pt-2">
          <button
            id="generate-video-prompt-btn"
            type="button"
            disabled={isLoading || frames.length === 0}
            onClick={handleGenerateVideoPrompt}
            className={`w-full sm:w-auto min-w-[240px] px-8 py-3.5 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all shadow-md ${
              isLoading || frames.length === 0
                ? 'bg-neutral-200 text-neutral-400 cursor-not-allowed shadow-none'
                : 'bg-neutral-900 hover:bg-neutral-800 text-white hover:scale-[1.01] active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <span>{loadingStep || 'Analyzing Keyframes...'}</span>
            ) : (
              <>
                <Film className="w-4 h-4" />
                <span>Generate Video Prompt</span>
                <ArrowRight className="w-4 h-4 ml-1 opacity-70" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Results */}
      {generatedPrompt && analysis && (
        <div id="video-results-section" className="mt-10 sm:mt-12 space-y-6 animate-in fade-in duration-300">
          <VideoPromptResult
            prompt={generatedPrompt}
            negativePrompt={negativePrompt}
            cameraMovement={cameraMovement}
            mode={videoMode}
            modelUsed={modelUsed}
            analysis={analysis}
            onRegenerate={handleGenerateVideoPrompt}
          />
        </div>
      )}
    </div>
  );
};
