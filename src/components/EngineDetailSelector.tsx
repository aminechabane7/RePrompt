import React from 'react';
import { TargetEngine, DetailLevel } from '../types';
import { Sparkles, Sliders, Layers, Cpu } from 'lucide-react';

interface EngineOption {
  id: TargetEngine;
  name: string;
  badge: string;
  description: string;
  syntaxNote: string;
}

const ENGINES: EngineOption[] = [
  {
    id: 'general',
    name: 'Universal',
    badge: 'Standard',
    description: 'Clean visual structure portable across all modern AI generators.',
    syntaxNote: 'Agnostic clauses, no proprietary tags',
  },
  {
    id: 'midjourney',
    name: 'Midjourney v7',
    badge: 'Parameters',
    description: 'Formatted with cinematic descriptors and parameter flags (--ar, --v 7, --style raw).',
    syntaxNote: 'Appends --ar & style flags automatically',
  },
  {
    id: 'flux',
    name: 'FLUX 1.1 Pro',
    badge: 'Natural Lang',
    description: 'Natural language photographic art direction specifying lens look and lighting physics.',
    syntaxNote: 'Detailed prose, no parameter flags',
  },
  {
    id: 'stable_diffusion',
    name: 'SD 3.5 Large',
    badge: 'Positive + Neg',
    description: 'Structured descriptive clauses, camera specifications, and dedicated negative prompt.',
    syntaxNote: 'Weighted clauses & negative tags',
  },
  {
    id: 'dalle3',
    name: 'DALL-E 3',
    badge: 'Prose',
    description: 'Expressive descriptive paragraphs focusing on composition and ambiance.',
    syntaxNote: 'Fluid natural descriptions',
  },
  {
    id: 'imagen',
    name: 'Gemini / Imagen',
    badge: 'Precision',
    description: 'High-clarity visual descriptions with spatial grounding and photorealism.',
    syntaxNote: 'Clean spatial descriptors',
  },
];

interface EngineDetailSelectorProps {
  selectedEngine: TargetEngine;
  onSelectEngine: (engine: TargetEngine) => void;
  selectedDetail: DetailLevel;
  onSelectDetail: (detail: DetailLevel) => void;
  disabled?: boolean;
}

export const EngineDetailSelector: React.FC<EngineDetailSelectorProps> = ({
  selectedEngine,
  onSelectEngine,
  selectedDetail,
  onSelectDetail,
  disabled = false,
}) => {
  return (
    <div id="engine-detail-controls" className="w-full space-y-4">
      {/* Target AI Engine Selection */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-neutral-700" />
            <span>Target AI Engine</span>
          </label>
          <span className="text-[11px] font-mono text-neutral-500">
            Adapts prompt syntax & parameters
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {ENGINES.map((eng) => {
            const isSelected = selectedEngine === eng.id;
            return (
              <button
                key={eng.id}
                type="button"
                id={`target-engine-${eng.id}`}
                disabled={disabled}
                onClick={() => onSelectEngine(eng.id)}
                className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-semibold text-xs leading-tight">
                      {eng.name}
                    </span>
                  </div>
                  <p
                    className={`text-[10px] leading-snug line-clamp-2 ${
                      isSelected ? 'text-neutral-300' : 'text-neutral-500'
                    }`}
                  >
                    {eng.description}
                  </p>
                </div>
                <div className="mt-2 pt-1 border-t border-white/10">
                  <span
                    className={`text-[9px] font-mono block truncate ${
                      isSelected ? 'text-neutral-400' : 'text-neutral-400'
                    }`}
                  >
                    {eng.syntaxNote}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Level Selector */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-neutral-700" />
            <span>Detail Level</span>
          </label>
          <span className="text-[11px] font-mono text-neutral-500">
            Prompt depth and token density
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {(
            [
              {
                id: 'simple',
                label: 'Simple',
                desc: '1-2 concise sentences focusing on core subject and main lighting.',
              },
              {
                id: 'detailed',
                label: 'Detailed',
                desc: 'Balanced 3-4 sentences covering subject, composition, environment, and textures.',
              },
              {
                id: 'professional',
                label: 'Professional',
                desc: 'High-fidelity technical art direction with estimated optics, angles, and finishes.',
              },
            ] as const
          ).map((lvl) => {
            const isSelected = selectedDetail === lvl.id;
            return (
              <button
                key={lvl.id}
                type="button"
                id={`detail-level-${lvl.id}`}
                disabled={disabled}
                onClick={() => onSelectDetail(lvl.id)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                    : 'border-neutral-200 bg-white text-neutral-900 hover:border-neutral-300 hover:bg-neutral-50'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="font-semibold text-xs mb-0.5">{lvl.label}</div>
                <p
                  className={`text-[10px] leading-relaxed ${
                    isSelected ? 'text-neutral-300' : 'text-neutral-500'
                  }`}
                >
                  {lvl.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
