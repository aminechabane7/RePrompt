import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  Layers,
  SlidersHorizontal,
  Globe,
  ShieldCheck,
  Cpu,
  Palette,
  Wand2,
  Camera,
  Film,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { PageRoute } from '../types';

interface AboutViewProps {
  onBack: () => void;
  onNavigate?: (page: PageRoute) => void;
}

export const AboutView: React.FC<AboutViewProps> = ({ onBack, onNavigate }) => {
  const handleNav = (page: PageRoute) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      onBack();
    }
  };

  return (
    <div id="about-page" className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Back button */}
      <a
        href="/"
        id="about-back-button"
        onClick={(e) => {
          e.preventDefault();
          onBack();
        }}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Generator</span>
      </a>

      {/* Header */}
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Product Overview</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
          About RePrompt
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 leading-relaxed">
          RePrompt is a visual reverse-engineering engine for AI creators. Rather than providing generic image captions, it deconstructs composition, estimated optics, lighting schemes, materials, and textures into prompts tailored to recreate visually similar results in modern AI image generators.
        </p>
      </div>

      {/* Core Concept */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-6 mb-10">
        <h2 className="text-base font-bold text-neutral-900 mb-2">
          Visual Reproduction Architecture
        </h2>
        <blockquote className="border-l-2 border-neutral-900 pl-4 my-3 text-neutral-800 font-medium italic text-sm sm:text-base">
          “Upload an image → Deconstruct visual dimensions → Receive a prompt formatted for Midjourney, FLUX, SD 3.5, or Gemini.”
        </blockquote>
        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed mt-3">
          Our vision pipeline focuses on visual characteristics that impact image generation: estimated lens looks, depth-of-field appearance, key and rim lighting direction, color temperature, and surface finishes.
        </p>
      </div>

      {/* Target Engines */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-neutral-700" />
          <span>Supported Target AI Engines</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Midjourney v7</h3>
            <p className="text-xs text-neutral-600">
              Concise visual language with automatic parameters (<code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">--ar</code>, <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">--v 7</code>, and <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">--style raw</code> for photography).
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">FLUX 1.1 Pro</h3>
            <p className="text-xs text-neutral-600">
              Natural descriptive language art direction, optical descriptions, and lighting physics without parameter flags.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Stable Diffusion 3.5 Large</h3>
            <p className="text-xs text-neutral-600">
              Structured descriptive clauses, balanced lighting modifiers, and focused negative prompts to prevent anatomical glitches.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">DALL-E 3 & Gemini</h3>
            <p className="text-xs text-neutral-600">
              Fluent descriptive paragraphs emphasizing spatial relationships, ambiance, and subject appearance.
            </p>
          </div>
        </div>
      </div>

      {/* Detail Levels */}
      <div className="mb-10">
        <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-neutral-700" />
          <span>Detail Level Options</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Simple</h3>
            <p className="text-xs text-neutral-600">
              Short, high-impact prompt (1-2 sentences) prioritizing the primary subject, main style, and lighting.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Detailed</h3>
            <p className="text-xs text-neutral-600">
              Balanced prompt (3-4 sentences) covering subject, composition, environment, colors, and textures.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <h3 className="font-semibold text-neutral-900 text-sm mb-1">Professional</h3>
            <p className="text-xs text-neutral-600">
              Structured high-fidelity prompt with technical visual details, estimated lens look, and surface finishes.
            </p>
          </div>
        </div>
      </div>

      {/* Cross Links */}
      <div className="p-6 rounded-2xl bg-neutral-100/80 border border-neutral-200 mb-6">
        <h2 className="text-xs font-bold text-neutral-900 uppercase tracking-wider mb-3">
          Explore Other Pages
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              handleNav('generator');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>Image to Prompt</span>
            <Sparkles className="w-3.5 h-3.5 text-neutral-600" />
          </a>
          <a
            href="/privacy"
            onClick={(e) => {
              e.preventDefault();
              handleNav('privacy');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>Privacy Policy</span>
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-600" />
          </a>
          <a
            href="/contact"
            onClick={(e) => {
              e.preventDefault();
              handleNav('contact');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>Contact</span>
            <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
          </a>
        </div>
      </div>
    </div>
  );
};
