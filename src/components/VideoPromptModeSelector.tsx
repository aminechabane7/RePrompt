import React from 'react';
import { VideoPromptMode } from '../types';
import { Film, Video, PlaySquare, Sparkles, Orbit, Compass } from 'lucide-react';

interface VideoPromptModeSelectorProps {
  selectedMode: VideoPromptMode;
  onSelectMode: (mode: VideoPromptMode) => void;
  disabled?: boolean;
}

interface VideoModeOption {
  id: VideoPromptMode;
  name: string;
  tagline: string;
  badge: string;
  icon: React.ReactNode;
}

const VIDEO_MODES: VideoModeOption[] = [
  {
    id: 'universal_video',
    name: 'Universal Video',
    tagline: 'Standard cinematic director prompt for all AI generators',
    badge: 'Universal',
    icon: <Film className="w-4 h-4 text-emerald-500" />,
  },
  {
    id: 'runway_gen3',
    name: 'Runway Gen-3 Alpha',
    tagline: 'Includes bracketed camera directives & motion speeds',
    badge: 'Gen-3 Alpha',
    icon: <PlaySquare className="w-4 h-4 text-blue-500" />,
  },
  {
    id: 'luma_dream_machine',
    name: 'Luma Dream Machine',
    tagline: 'Emphasizes continuous camera physics & velocity vectors',
    badge: 'Luma',
    icon: <Orbit className="w-4 h-4 text-violet-500" />,
  },
  {
    id: 'kling',
    name: 'Kling 1.5 / Hailuo',
    tagline: 'Focuses on character kinetics, mass & atmospheric light',
    badge: 'Kling 1.5',
    icon: <Video className="w-4 h-4 text-amber-500" />,
  },
  {
    id: 'sora',
    name: 'OpenAI Sora',
    tagline: 'Dense narrative cinematography with complex physics',
    badge: 'Sora',
    icon: <Sparkles className="w-4 h-4 text-cyan-500" />,
  },
  {
    id: 'pika',
    name: 'Pika 2.0',
    tagline: 'Formats with camera pan/zoom parameters & motion strength',
    badge: 'Pika 2.0',
    icon: <Compass className="w-4 h-4 text-pink-500" />,
  },
];

export const VideoPromptModeSelector: React.FC<VideoPromptModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div id="video-prompt-mode-selector" className="w-full space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Step 1: Target Video Engine
        </h3>
        <span className="text-[11px] text-neutral-400 font-mono">
          Engine: {VIDEO_MODES.find((m) => m.id === selectedMode)?.name}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {VIDEO_MODES.map((option) => {
          const isSelected = selectedMode === option.id;
          return (
            <button
              id={`video-mode-${option.id}`}
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(option.id)}
              className={`text-left p-3 rounded-xl border transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-neutral-900 border-neutral-700 text-white shadow-sm ring-1 ring-neutral-700'
                  : 'bg-white border-neutral-200/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/80'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div
                  className={`p-1.5 rounded-lg ${
                    isSelected ? 'bg-neutral-800' : 'bg-neutral-100 group-hover:bg-neutral-200/70'
                  }`}
                >
                  {option.icon}
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md font-medium ${
                    isSelected
                      ? 'bg-neutral-800 text-neutral-300'
                      : 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {option.badge}
                </span>
              </div>

              <div className="text-xs font-medium tracking-tight truncate">{option.name}</div>
              <p
                className={`text-[11px] mt-0.5 line-clamp-1 leading-snug ${
                  isSelected ? 'text-neutral-400' : 'text-neutral-500'
                }`}
              >
                {option.tagline}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
