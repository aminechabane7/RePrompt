import React, { useState } from 'react';
import { VisualAnalysis } from '../types';
import {
  ChevronDown,
  ChevronUp,
  User,
  Layout,
  Sun,
  Camera,
  Palette,
  Eye,
  TreePine,
  Layers,
  Sparkles,
} from 'lucide-react';

interface AnalysisPanelProps {
  analysis: VisualAnalysis;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
  const [isOpen, setIsOpen] = useState(false);

  const fullSections = [
    { key: 'subject', title: 'Subject & Appearance', icon: User, text: analysis.subject },
    { key: 'secondary', title: 'Secondary Elements', icon: Sparkles, text: analysis.secondarySubjects },
    { key: 'composition', title: 'Composition & Framing', icon: Layout, text: analysis.composition },
    { key: 'environment', title: 'Environment & Atmosphere', icon: TreePine, text: analysis.environment },
    { key: 'lighting', title: 'Lighting & Contrast', icon: Sun, text: analysis.lighting },
    { key: 'camera', title: 'Estimated Optics Look', icon: Camera, text: analysis.camera },
    { key: 'style', title: 'Aesthetic Medium & Genre', icon: Eye, text: analysis.style },
    { key: 'colors', title: 'Color Palette & Mood', icon: Palette, text: analysis.colors },
    { key: 'details', title: 'Textures & Micro Details', icon: Layers, text: analysis.details },
  ].filter((sec) => Boolean(sec.text && sec.text !== 'None'));

  return (
    <div id="analysis-panel-container" className="w-full bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs">
      {/* Collapsible Trigger */}
      <button
        type="button"
        id="toggle-analysis-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none focus:ring-2 focus:ring-neutral-900 rounded-lg p-1"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold tracking-wide text-neutral-900 uppercase">
              Technical Visual Deconstruction
            </h3>
            <p className="text-[11px] text-neutral-500">
              {isOpen ? 'Click to collapse dimension breakdown' : 'Click to inspect reverse-engineered layers (optics, lighting, textures)'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-neutral-500 font-medium px-2 py-1 rounded-md bg-neutral-50 border border-neutral-200">
          <span>{isOpen ? 'Hide' : 'Expand'}</span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </div>
      </button>

      {/* Expandable Breakdown Grid */}
      {isOpen && (
        <div className="mt-4 pt-4 border-t border-neutral-100 grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-200">
          {fullSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.key}
                className="p-3.5 rounded-xl border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-3.5 h-3.5 text-neutral-600 shrink-0" />
                  <span className="text-xs font-semibold text-neutral-900">
                    {sec.title}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 leading-relaxed pl-5.5">
                  {sec.text}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
