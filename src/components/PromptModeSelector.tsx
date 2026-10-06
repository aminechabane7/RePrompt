import React from 'react';
import { PromptMode } from '../types';
import {
  Globe,
  Camera,
  Wand2,
  Palette,
  Smile,
  Film,
  Package,
  User,
  Scissors,
  Layers,
  Building2,
  Home,
  Share2,
} from 'lucide-react';

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
  icon: React.ComponentType<{ className?: string }>;
}

const MODES: ModeOption[] = [
  {
    id: 'general',
    name: 'General',
    badge: 'Universal',
    description: 'Balanced visual deconstruction suitable for any AI image generator.',
    icon: Globe,
  },
  {
    id: 'photorealistic',
    name: 'Photorealistic',
    badge: 'Optics',
    description: 'Estimated lens equivalent, natural skin textures, catchlights & lighting falloff.',
    icon: Camera,
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    badge: 'Film Still',
    description: 'Widescreen framing, directional contrast, volumetric haze & film color grading.',
    icon: Film,
  },
  {
    id: 'product_photography',
    name: 'Product Photo',
    badge: 'Studio',
    description: 'Diffused studio lighting, tactile material finishes & clean product isolation.',
    icon: Package,
  },
  {
    id: 'portrait',
    name: 'Portrait',
    badge: 'Close-Up',
    description: 'Facial expressions, estimated focal length look, shallow depth & skin tones.',
    icon: User,
  },
  {
    id: 'fashion',
    name: 'Fashion',
    badge: 'Editorial',
    description: 'Garment fabric drape, haute couture styling, posing & deliberate lighting.',
    icon: Scissors,
  },
  {
    id: 'anime',
    name: 'Anime / Manga',
    badge: 'Japanese',
    description: 'Authentic cel shading, expressive linework & illustrative background depth.',
    icon: Wand2,
  },
  {
    id: 'illustration',
    name: 'Illustration',
    badge: 'Concept Art',
    description: 'Expressive brushwork, textural layering, imaginative palette & stylized tones.',
    icon: Palette,
  },
  {
    id: 'render_3d',
    name: '3D Render',
    badge: 'Raytrace',
    description: 'Ambient occlusion look, subsurface light scattering & physically based materials.',
    icon: Layers,
  },
  {
    id: 'architecture',
    name: 'Architecture',
    badge: 'Structural',
    description: 'Linear perspective, daylight geometry & structural building finishes.',
    icon: Building2,
  },
  {
    id: 'interior_design',
    name: 'Interior',
    badge: 'Staging',
    description: 'Spatial layout, ambient interior illumination, textiles & lived-in atmosphere.',
    icon: Home,
  },
  {
    id: 'social_media',
    name: 'Social Creative',
    badge: 'High Impact',
    description: 'Focal subject, vibrant modern palette, clean contrast & engaging clarity.',
    icon: Share2,
  },
];

export const PromptModeSelector: React.FC<PromptModeSelectorProps> = ({
  selectedMode,
  onSelectMode,
  disabled = false,
}) => {
  return (
    <div id="prompt-mode-selector" className="w-full">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
          <span>Visual Style Mode</span>
        </label>
        <span className="text-[11px] text-neutral-500 font-mono">
          12 specialized visual categories
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {MODES.map((mode) => {
          const isSelected =
            selectedMode === mode.id ||
            (selectedMode === 'universal' && mode.id === 'general') ||
            (selectedMode === 'ultra_realistic' && mode.id === 'photorealistic') ||
            (selectedMode === 'digital_art' && mode.id === 'illustration') ||
            (selectedMode === 'cartoon' && mode.id === 'render_3d');
          const Icon = mode.icon;

          return (
            <button
              key={mode.id}
              type="button"
              id={`mode-option-${mode.id}`}
              disabled={disabled}
              onClick={() => onSelectMode(mode.id)}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isSelected
                  ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                  : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Icon
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isSelected ? 'text-neutral-200' : 'text-neutral-700'
                      }`}
                    />
                    <span className="font-semibold text-xs truncate">
                      {mode.name}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded-sm shrink-0 ${
                      isSelected
                        ? 'bg-neutral-800 text-neutral-300'
                        : 'bg-neutral-100 text-neutral-600'
                    }`}
                  >
                    {mode.badge}
                  </span>
                </div>

                <p
                  className={`text-[10px] leading-snug line-clamp-2 ${
                    isSelected ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  {mode.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
