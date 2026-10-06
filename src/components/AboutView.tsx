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
  Smile,
  Camera,
  Film,
  ArrowRight,
  Lock,
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
          <span>Product Philosophy</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
          Recreate Any Image With AI
        </h1>
        <p className="text-base sm:text-lg text-neutral-600 leading-relaxed">
          Most vision tools merely describe what an image looks like. Image to Prompt reverses the generation process: it deconstructs composition, optics, lighting schemes, and textures into an exact, copy-ready prompt you can feed into Midjourney, Flux, SD 3.5, or Gemini.
        </p>
      </div>

      {/* Core Concept */}
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-6 mb-10">
        <h2 className="text-lg font-bold text-neutral-900 mb-2">
          The Core Value Proposition
        </h2>
        <blockquote className="border-l-2 border-neutral-900 pl-4 my-3 text-neutral-800 font-medium italic text-base">
          “Upload any image → AI analyzes it → Get a detailed prompt you can use to recreate a similar image with Midjourney, Flux, Stable Diffusion, Gemini, or other image generators.”
        </blockquote>
        <p className="text-sm text-neutral-600 leading-relaxed mt-3">
          The goal is not generic descriptive captions like “a cat sitting on a couch”. Our vision pipeline breaks down camera lenses (focal length, depth of field), specific light directionality, artistic genre, colour theory, and materials.
        </p>
      </div>

      {/* Prompt Modes Explained */}
      <div className="mb-10">
        <h2 className="text-xl font-bold text-neutral-900 mb-5">
          8 Precision Prompt Modes
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900 text-sm">Universal</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Standardized prompt designed to perform reliably across all modern image generators (Midjourney, Flux, SD 3.5, Gemini) without tool-specific flags.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-4 h-4 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900 text-sm">Ultra Realistic</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Optical hyper-realism specifying Hasselblad or Sony high-resolution camera rigs, true 85mm optical bokeh, micro skin pores, subsurface scattering, and raw uncompressed photographic realism.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Wand2 className="w-4 h-4 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900 text-sm">Anime / Manga</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Authentic Japanese animation and manga styling: clean cel shading, expressive eyes and dynamic hair, anime color balance, and Makoto Shinkai / Kyoto Animation keyframe backgrounds.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Palette className="w-4 h-4 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900 text-sm">Digital Art</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Stylized digital painting and concept art: rich brushwork texture, volumetric fantasy lighting, Octane render 3D depth, and trending ArtStation aesthetic values.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Smile className="w-4 h-4 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900 text-sm">Cartoon / 3D</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Playful stylized animation: 3D Pixar / Disney style characters with smooth clay subsurface scattering, whimsical proportions, bold outlines, and cheerful theatrical lighting.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900 text-sm">Midjourney</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Formulated for Midjourney v7 syntax. Emphasizes artistic rendering terms, cinematic aesthetics, and includes recommended parameters such as <code className="bg-neutral-100 px-1 py-0.5 rounded text-[11px] font-mono">--ar 16:9</code> and <code className="bg-neutral-100 px-1 py-0.5 rounded text-[11px] font-mono">--v 7 --style raw</code>.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <SlidersHorizontal className="w-4 h-4 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900 text-sm">FLUX 1.1 Pro / SD 3.5 Large</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Tailored for Black Forest Labs FLUX 1.1 Pro (with Ultra and RAW modes) and Stability AI's Stable Diffusion 3.5 Large. Uses natural photographic language, explicit camera specs, and realistic lighting.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-neutral-700" />
              <h3 className="font-semibold text-neutral-900 text-sm">Detailed</h3>
            </div>
            <p className="text-xs text-neutral-600 leading-relaxed">
              Maximum descriptive depth. Captures intricate textures, micro-lighting nuances, layered garments, architectural geometry, and complex environmental backdrops.
            </p>
          </div>
        </div>
      </div>

      {/* Video to Prompt & Negative Prompt Section */}
      <div className="mb-10 p-5 sm:p-6 rounded-2xl bg-blue-50/70 border border-blue-200/80">
        <h2 className="text-base sm:text-lg font-bold text-blue-950 mb-2 flex items-center gap-2">
          <Film className="w-5 h-5 text-blue-600" />
          <span>New: Video to Prompt & Negative Prompt Synthesis</span>
        </h2>
        <p className="text-xs sm:text-sm text-blue-900/90 leading-relaxed mb-4">
          In addition to still images, the engine now supports full multi-frame video reverse-engineering and negative prompt generation for both media formats:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-neutral-800">
          <div className="bg-white/80 p-3.5 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-neutral-900 mb-1">🎬 Video to Prompt Engine</h3>
            <p className="text-neutral-600">
              Extracts cinematic camera trajectories (dolly, orbit, tilt, fpv dive), subject kinematic speed, temporal pacing, and lighting changes across video keyframes for Runway Gen-3, Luma Dream Machine, Sora, and Kling.
            </p>
          </div>
          <div className="bg-white/80 p-3.5 rounded-xl border border-blue-100">
            <h3 className="font-semibold text-neutral-900 mb-1">🛡️ Intelligent Negative Prompts</h3>
            <p className="text-neutral-600">
              Both Image and Video pipelines automatically formulate targeted negative prompts to suppress motion flicker, limb warping, plastic skin, chromatic distortion, and AI morphing artifacts.
            </p>
          </div>
        </div>
      </div>

      {/* Model Engine */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 mb-10">
        <div className="flex items-center gap-2.5 mb-3">
          <Cpu className="w-5 h-5 text-neutral-700" />
          <h2 className="text-base font-bold text-neutral-900">
            Vision Architecture: Multimodal Open & Gemini Models
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-neutral-600 leading-relaxed">
          The reverse-engineering backend leverages vision models including <strong className="text-neutral-900">Ling 3.0 Flash VL</strong> and <strong className="text-neutral-900">Qwen 2.5 VL 72B</strong> routed through OpenRouter, backed by high-throughput multimodal intelligence via Google Gemini 3.8 Flash. This multi-model architecture provides both specialized open-weight reverse engineering and seamless zero-downtime fallback.
        </p>
      </div>

      {/* Internal Navigation Links */}
      <div className="p-6 rounded-2xl bg-neutral-100/80 border border-neutral-200">
        <h2 className="text-sm font-bold text-neutral-900 uppercase tracking-wider mb-3">
          Explore Image to Prompt
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
            <ArrowRight className="w-3.5 h-3.5 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
          </a>
          <a
            href="/video-to-prompt"
            onClick={(e) => {
              e.preventDefault();
              handleNav('video_generator');
            }}
            className="p-3 bg-white rounded-xl border border-neutral-200 hover:border-neutral-400 text-xs font-medium text-neutral-900 flex items-center justify-between transition-colors shadow-2xs group"
          >
            <span>Video to Prompt</span>
            <ArrowRight className="w-3.5 h-3.5 text-blue-500 group-hover:translate-x-0.5 transition-transform" />
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
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
          </a>
        </div>
      </div>
    </div>
  );
};
