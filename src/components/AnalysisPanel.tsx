import React, { useState } from 'react';
import { VisualAnalysis } from '../types';
import {
  CheckCircle2,
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
} from 'lucide-react';

interface AnalysisPanelProps {
  analysis: VisualAnalysis;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({ analysis }) => {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [showFullBreakdown, setShowFullBreakdown] = useState(true);

  const checklistItems = [
    { key: 'subject', label: 'Subject', icon: User, value: analysis.subject },
    { key: 'composition', label: 'Composition', icon: Layout, value: analysis.composition },
    { key: 'lighting', label: 'Lighting', icon: Sun, value: analysis.lighting },
    { key: 'camera', label: 'Camera', icon: Camera, value: analysis.camera },
    { key: 'style', label: 'Style', icon: Eye, value: analysis.style },
    { key: 'colors', label: 'Colors', icon: Palette, value: analysis.colors },
  ];

  const fullSections = [
    { key: 'subject', title: 'Subject & Appearance', icon: User, text: analysis.subject },
    { key: 'composition', title: 'Composition & Framing', icon: Layout, text: analysis.composition },
    { key: 'environment', title: 'Environment & Atmosphere', icon: TreePine, text: analysis.environment },
    { key: 'lighting', title: 'Lighting & Contrast', icon: Sun, text: analysis.lighting },
    { key: 'camera', title: 'Camera Optics & Depth', icon: Camera, text: analysis.camera },
    { key: 'style', title: 'Aesthetic & Style Medium', icon: Eye, text: analysis.style },
    { key: 'colors', title: 'Color Palette & Tones', icon: Palette, text: analysis.colors },
    { key: 'details', title: 'Textures & Micro Details', icon: Layers, text: analysis.details },
  ].filter((sec) => Boolean(sec.text));

  return (
    <div id="analysis-panel-container" className="w-full bg-white rounded-2xl border border-neutral-200/90 p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase">
            Visual Analysis Breakdown
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Key reverse-engineered layers synthesized into your prompt
          </p>
        </div>

        {/* Quick Check Bar */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {checklistItems.map((item) => (
            <span
              key={item.key}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-neutral-50 border border-neutral-200 text-neutral-700"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{item.label}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Toggle Details Button */}
      <div className="mt-4 flex items-center justify-between">
        <span className="text-xs font-semibold text-neutral-600 uppercase tracking-wider">
          Reverse-Engineered Blueprint
        </span>
        <button
          id="toggle-breakdown-button"
          type="button"
          onClick={() => setShowFullBreakdown(!showFullBreakdown)}
          className="text-xs text-neutral-600 hover:text-neutral-900 font-medium flex items-center gap-1 transition-colors"
        >
          <span>{showFullBreakdown ? 'Collapse Layers' : 'Expand Layers'}</span>
          {showFullBreakdown ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Detailed Layer Cards Grid */}
      {showFullBreakdown && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {fullSections.map((sec) => {
            const Icon = sec.icon;
            return (
              <div
                key={sec.key}
                id={`analysis-card-${sec.key}`}
                className="p-3.5 rounded-xl border border-neutral-200/80 bg-neutral-50/50 hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-6 h-6 rounded-md bg-white border border-neutral-200 flex items-center justify-center text-neutral-700">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
                    {sec.title}
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-neutral-600 pl-8">
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
