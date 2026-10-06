import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Video,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  AlertCircle,
  Film,
  Camera,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface VideoUploadProps {
  onVideoSelected: (videoData: {
    videoSrc: string;
    videoName: string;
    frames: string[];
    duration: number;
  }) => void;
  onClear: () => void;
  isLoading: boolean;
}

// Sample test clips for instant preview & demonstration
const SAMPLE_VIDEOS = [
  {
    name: 'FPV Drone Mountain Ridge',
    tag: 'Aerial Flyover',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    thumb: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=240&auto=format&fit=crop&q=75&fm=webp',
  },
  {
    name: 'Cinematic City Traffic Blur',
    tag: 'Urban Hyperlapse',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4',
    thumb: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=240&auto=format&fit=crop&q=75&fm=webp',
  },
  {
    name: 'Ocean Waves & Sunset',
    tag: 'Fluid Slow Motion',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=240&auto=format&fit=crop&q=75&fm=webp',
  },
];

export const VideoUpload: React.FC<VideoUploadProps> = ({
  onVideoSelected,
  onClear,
  isLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('');
  const [duration, setDuration] = useState<number>(0);
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [extractedFrames, setExtractedFrames] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Extract keyframes from video element using canvas
  const extractFramesFromVideo = async (
    videoElement: HTMLVideoElement,
    videoDuration: number
  ): Promise<string[]> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return [];

    // Set optimal canvas size for AI inspection (max 640px dimension, high quality compression)
    const maxDim = 640;
    const currentMax = Math.max(videoElement.videoWidth || 640, videoElement.videoHeight || 360);
    const scale = Math.min(1, maxDim / currentMax);
    canvas.width = Math.round((videoElement.videoWidth || 640) * scale);
    canvas.height = Math.round((videoElement.videoHeight || 360) * scale);

    // Frame sample positions (e.g. 15%, 50%, 85% of duration)
    const sampleTimeStamps = [
      Math.max(0.1, videoDuration * 0.15),
      Math.max(0.5, videoDuration * 0.5),
      Math.max(0.9, videoDuration * 0.85),
    ];

    const capturedFrames: string[] = [];

    for (const time of sampleTimeStamps) {
      try {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(() => resolve(), 2500); // 2.5s fallback per frame
          const handleSeeked = () => {
            clearTimeout(timeout);
            videoElement.removeEventListener('seeked', handleSeeked);
            resolve();
          };
          videoElement.addEventListener('seeked', handleSeeked);
          videoElement.currentTime = Math.min(time, Math.max(0, videoDuration - 0.1));
        });

        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        capturedFrames.push(dataUrl);
      } catch (err) {
        console.warn('Frame capture step error:', err);
      }
    }

    // Reset video to start
    videoElement.currentTime = 0;
    return capturedFrames;
  };

  const processVideoSource = (src: string, name: string) => {
    setErrorMsg(null);
    setIsExtractingFrames(true);
    setVideoSrc(src);
    setVideoName(name);

    // Create a hidden video element to measure and extract frames
    const hiddenVid = document.createElement('video');
    hiddenVid.crossOrigin = 'anonymous';
    hiddenVid.src = src;
    hiddenVid.muted = true;
    hiddenVid.playsInline = true;

    hiddenVid.onloadedmetadata = async () => {
      const vidDuration = hiddenVid.duration || 5;
      setDuration(vidDuration);

      try {
        const frames = await extractFramesFromVideo(hiddenVid, vidDuration);
        if (frames.length > 0) {
          setExtractedFrames(frames);
          onVideoSelected({
            videoSrc: src,
            videoName: name,
            frames,
            duration: vidDuration,
          });
        } else {
          setErrorMsg('Could not extract frames from video. Please try a different format.');
        }
      } catch (err: any) {
        setErrorMsg('Failed to process video keyframes: ' + (err.message || 'Unknown error'));
      } finally {
        setIsExtractingFrames(false);
      }
    };

    hiddenVid.onerror = () => {
      setIsExtractingFrames(false);
      setErrorMsg('Cannot load or play this video file. Try a standard MP4 or WebM video.');
    };
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please upload a valid video file (MP4, WebM, MOV).');
      return;
    }

    // Check size limit: 100MB
    if (file.size > 100 * 1024 * 1024) {
      setErrorMsg('Video file is larger than 100MB. Please use a smaller or shorter video clip.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    processVideoSource(objectUrl, file.name);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    if (videoSrc && videoSrc.startsWith('blob:')) {
      URL.revokeObjectURL(videoSrc);
    }
    setVideoSrc(null);
    setVideoName('');
    setExtractedFrames([]);
    setDuration(0);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClear();
  };

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div id="video-upload-component" className="w-full space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/ogg"
        className="hidden"
        onChange={handleInputChange}
        disabled={isLoading || isExtractingFrames}
      />

      {errorMsg && (
        <div
          id="video-error-banner"
          className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Video Preview State */}
      {videoSrc ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
          <div className="relative rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center group">
            <video
              ref={videoRef}
              src={videoSrc}
              playsInline
              loop
              muted
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />

            {/* Play/Pause Overlay */}
            <button
              id="toggle-video-play-btn"
              type="button"
              onClick={togglePlayback}
              className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-neutral-900/70 hover:bg-neutral-900 text-white flex items-center justify-center backdrop-blur-xs transition-transform hover:scale-105"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
            </button>

            {/* Top Video Tag */}
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-neutral-900/80 text-[11px] font-mono text-white backdrop-blur-xs flex items-center gap-1.5">
              <Film className="w-3 h-3 text-emerald-400" />
              <span className="truncate max-w-[200px]">{videoName}</span>
              {duration > 0 && <span>({duration.toFixed(1)}s)</span>}
            </div>
          </div>

          {/* Keyframes Analysis Status */}
          <div className="pt-2 border-t border-neutral-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 text-neutral-700 font-medium">
                <Camera className="w-3.5 h-3.5 text-neutral-500" />
                <span>Extracted Temporal Keyframes</span>
                {isExtractingFrames ? (
                  <span className="text-[11px] text-amber-600 animate-pulse">(Processing...)</span>
                ) : (
                  <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> ({extractedFrames.length} frames ready)
                  </span>
                )}
              </div>

              <button
                id="change-video-btn"
                type="button"
                onClick={handleClear}
                disabled={isLoading || isExtractingFrames}
                className="text-xs text-neutral-500 hover:text-neutral-800 flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Change Video</span>
              </button>
            </div>

            {/* Frame Thumbnails strip */}
            <div className="grid grid-cols-3 gap-2">
              {extractedFrames.length > 0 ? (
                extractedFrames.map((frame, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-lg overflow-hidden border border-neutral-200 aspect-video bg-neutral-100 group"
                  >
                    <img
                      src={frame}
                      alt={`Extracted video temporal keyframe ${idx + 1} (${idx === 0 ? '15% Start' : idx === 1 ? '50% Mid' : '85% Dynamic'} timestamp position)`}
                      width={200}
                      height={112}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-sm bg-neutral-900/80 text-[9px] font-mono text-white">
                      {idx === 0
                        ? '15% Start'
                        : idx === 1
                        ? '50% Mid'
                        : '85% Dynamic'}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 py-3 text-center text-xs text-neutral-400 bg-neutral-50 rounded-lg">
                  Extracting keyframes from video stream...
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Empty Upload State */
        <div className="space-y-3">
          <div
            id="video-dropzone"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-7 sm:p-9 text-center transition-all cursor-pointer select-none flex flex-col items-center justify-center min-h-[220px] ${
              dragActive
                ? 'border-neutral-900 bg-neutral-100/70 scale-[0.99]'
                : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/50 hover:bg-neutral-50'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-white border border-neutral-200 shadow-xs flex items-center justify-center text-neutral-700 mb-3 group-hover:scale-105 transition-transform">
              <Video className="w-6 h-6 text-neutral-800" />
            </div>

            <div className="text-sm font-semibold text-neutral-900 mb-1">
              Upload video to reverse-engineer prompt
            </div>
            <p className="text-xs text-neutral-500 max-w-sm mb-3">
              Drag & drop video clip or click to browse. Analyzes camera trajectory, subject momentum, and lighting pacing.
            </p>

            <div className="flex items-center gap-2 text-[11px] font-mono text-neutral-400">
              <span className="px-2 py-0.5 rounded-md bg-neutral-200/60 text-neutral-600">MP4</span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-200/60 text-neutral-600">WEBM</span>
              <span className="px-2 py-0.5 rounded-md bg-neutral-200/60 text-neutral-600">MOV</span>
              <span>• Max 100MB</span>
            </div>
          </div>

          {/* Quick Sample Video Clips */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-medium text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Or try a sample video clip</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {SAMPLE_VIDEOS.map((sample, idx) => (
                <button
                  id={`sample-video-${idx}`}
                  key={idx}
                  type="button"
                  onClick={() => processVideoSource(sample.url, sample.name)}
                  className="flex items-center gap-2.5 p-2 rounded-xl border border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50 text-left transition-all group"
                >
                  <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0 bg-neutral-100 relative">
                    <img
                      src={sample.thumb}
                      alt={`Sample test video preview: ${sample.name} (${sample.tag})`}
                      width={48}
                      height={36}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-neutral-900/30 flex items-center justify-center">
                      <Play className="w-3 h-3 text-white fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-neutral-800 truncate">
                      {sample.name}
                    </div>
                    <div className="text-[10px] text-neutral-500 font-mono">{sample.tag}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
