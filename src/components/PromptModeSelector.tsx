import React from 'react';
import { PromptMode } from '../types';
import { Globe, Layers, SlidersHorizontal, Sparkles, Palette, Wand2, Smile, Camera } from 'lucide-react';

interface PromptModeSelectorProps {
  selectedMode: PromptMode;
  onSelectMode: (mode: PromptMode) => void;
  disabled?: boolean;
}

interface ModeOption {
  id: PromptMode;
  name: string;
  badge: string;
  description: string;
  targetEngines: string;
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: ModeOption[] = [
  {
    id: 'universal',
    name: 'Universal',
    badge: 'Recommended',
    description: 'Clean, balanced prompt effective across any AI image generator.',
    targetEngines: 'Midjourney v7, FLUX, SD 3.5, Gemini',
    icon: Globe,
  },
  {
    id: 'ultra_realistic',
    name: 'Ultra Realistic',
    badge: 'Photoreal',
    description: 'Hyper-authentic optical physics, skin pores, natural imperfections & RAW optics.',
    targetEngines: 'Hasselblad/Sony optics, 8K RAW, Leica look',
    icon: Camera,
  },
  {
    id: 'anime',
    name: 'Anime / Manga',
    badge: 'Niji Style',
    description: 'Japanese animation aesthetic, vibrant cel shading, clean linework & dramatic lighting.',
    targetEngines: 'Midjourney Niji, NovelAI, Anime SDXL',
    icon: Wand2,
  },
  {
    id: 'digital_art',
    name: 'Digital Art',
    badge: 'Concept Art',
    description: 'Stylized digital painting, expressive brushwork, volumetric concept art & Octane depth.',
    targetEngines: 'ArtStation trending, Octane, Procreate',
    icon: Palette,
  },
  {
    id: 'cartoon',
    name: 'Cartoon / 3D',
    badge: 'Animation',
    description: 'Playful character silhouettes, Pixar/Disney 3D clay subsurface rendering & vivid charm.',
    targetEngines: '3D Pixar/Disney style, 2D Toon, Claymation',
    icon: Smile,
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    badge: 'v7 Style',
    description: 'Optimized for Midjourney v7 syntax, atmospheric descriptors & modern parameters.',
    targetEngines: 'Midjourney v7 / v8 / Niji',
    icon: Sparkles,
  },
  {
    id: 'flux',
    name: 'Flux 1.1 / SD 3.5',
    badge: 'Latest Gen',
    description: 'Structured photographic & art direction for FLUX 1.1 Pro and SD 3.5 Large.',
    targetEngines: 'FLUX 1.1 Pro, FLUX.1, SD 3.5 Large',
    icon: SlidersHorizontal,
  },
  {
    id: 'detailed',
    name: 'Detailed',
    badge: 'Max Depth',
    description: 'Maximum visual detail, exhaustive textures, material finishes & micro nuances.',
    targetEngines: 'High-detail renders & descriptive engines',
    icon: Layers,
  },
];

export const PromptModeSelector: React.FC<PromptModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div id="prompt-mode-selector" className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-semibold text-neutral-900 flex items-center gap-2">
          <span>Prompt Style</span>
        </label>
        <span className="text-xs text-neutral-500 font-mono">
          8 specialized generation styles
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {MODES.map((mode) => {
          const isSelected = selectedMode === mode.id;
          const Icon = mode.icon;

          return (
            <button
              key={mode.id}
              id={`mode-card-${mode.id}`}
              type="button"
              disabled={disabled}
              onClick={() => onSelectMode(mode.id)}
              className={`text-left p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-sm'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50/70 text-neutral-800'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-neutral-800 text-white'
                        : 'bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                        : 'bg-neutral-100 text-neutral-600 border border-neutral-200'
                    }`}
                  >
                    {mode.badge}
                  </span>
                </div>

                <h4
                  className={`text-sm font-bold tracking-tight mb-1 ${
                    isSelected ? 'text-white' : 'text-neutral-900'
                  }`}
                >
                  {mode.name}
                </h4>

                <p
                  className={`text-xs leading-relaxed ${
                    isSelected ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  {mode.description}
                </p>
              </div>

              <div
                className={`mt-3 pt-2.5 border-t text-[11px] font-mono truncate ${
                  isSelected
                    ? 'border-neutral-800 text-neutral-400'
                    : 'border-neutral-100 text-neutral-400'
                }`}
              >
                {mode.targetEngines}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
