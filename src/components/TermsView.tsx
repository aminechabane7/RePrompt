import React from 'react';
import { ArrowLeft, FileText, CheckCircle, AlertTriangle, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import { PageRoute } from '../types';

interface TermsViewProps {
  onBack: () => void;
  onNavigate?: (page: PageRoute) => void;
}

export const TermsView: React.FC<TermsViewProps> = ({ onBack, onNavigate }) => {
  const handleNav = (page: PageRoute) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      onBack();
    }
  };

  return (
    <div id="terms-page" className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* Back button */}
      <a
        href="/"
        id="terms-back-button"
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-800 text-xs font-medium mb-3 border border-neutral-200">
          <FileText className="w-3.5 h-3.5 text-neutral-700" />
          <span>Usage Agreement</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight mb-4">
          Terms of Use
        </h1>
        <p className="text-base text-neutral-600 leading-relaxed">
          Please review the terms and responsibilities governing use of RePrompt, an AI-powered visual reverse-engineering and prompt generation utility.
        </p>
      </div>

      {/* Terms Content Sections */}
      <div className="space-y-6 text-sm text-neutral-700 leading-relaxed mb-12">
        <section className="p-5 rounded-2xl border border-neutral-200 bg-white">
          <h2 className="text-base font-bold text-neutral-900 mb-2">
            1. Service Purpose & Scope
          </h2>
          <p>
            RePrompt provides automated computer vision analysis to reverse-engineer prompts designed to recreate visually similar results in modern AI image generators. The service outputs generated prompt text and visual metadata based on inferable pixel attributes.
          </p>
        </section>

        <section className="p-5 rounded-2xl border border-neutral-200 bg-white">
          <h2 className="text-base font-bold text-neutral-900 mb-2">
            2. User Responsibilities & Acceptable Use
          </h2>
          <p className="mb-2">
            You agree not to upload content or use the service for:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-neutral-600">
            <li>Any unlawful, defamatory, harassing, or sexually explicit content involving minors.</li>
            <li>Images infringing on third-party intellectual property or privacy rights without authorization.</li>
            <li>Automated abuse, Denial-of-Service attacks, or attempting to circumvent server rate limits.</li>
            <li>Reverse-engineering the underlying AI model endpoints or infrastructure.</li>
          </ul>
        </section>

        <section className="p-5 rounded-2xl border border-neutral-200 bg-white">
          <h2 className="text-base font-bold text-neutral-900 mb-2">
            3. AI Output Limitations
          </h2>
          <p>
            Generated prompts are artificial estimations created by multimodal vision models. RePrompt does not guarantee that generated prompts will produce an exact reproduction or recover the original prompt used to create a reference image. Outputs are provided for creative assistance and research purposes on an "as-is" basis.
          </p>
        </section>

        <section className="p-5 rounded-2xl border border-neutral-200 bg-white">
          <h2 className="text-base font-bold text-neutral-900 mb-2">
            4. Intellectual Property
          </h2>
          <p>
            You retain rights to the original images you upload. You are free to use, copy, modify, and distribute the generated prompt text produced for your requests. RePrompt does not claim ownership over the generated prompt strings.
          </p>
        </section>

        <section className="p-5 rounded-2xl border border-neutral-200 bg-white">
          <h2 className="text-base font-bold text-neutral-900 mb-2">
            5. Service Availability & Rate Limits
          </h2>
          <p>
            RePrompt is provided free of charge subject to server-side rate limits and operational capacity. We reserve the right to modify, throttle, or temporarily suspend access to protect infrastructure from automated abuse or excessive compute costs.
          </p>
        </section>

        <section className="p-5 rounded-2xl border border-neutral-200 bg-white">
          <h2 className="text-base font-bold text-neutral-900 mb-2">
            6. Limitation of Liability
          </h2>
          <p>
            To the maximum extent permitted by applicable law, RePrompt and its developers shall not be liable for any indirect, incidental, or consequential damages resulting from your use of or inability to use the service or any AI generation outputs.
          </p>
        </section>
      </div>

      {/* Contact & Footer notice */}
      <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-500 font-mono">
        Last updated: October 2026 • RePrompt Terms of Service
      </div>
    </div>
  );
};
