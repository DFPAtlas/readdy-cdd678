import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';

const CONFIDENCE_POINTS = ['No vendor lock-in', 'Source-code ownership', 'AI-assisted workflow'];

export function FinalCta() {
  return (
    <section
      id="build"
      className="relative py-24 md:py-32 bg-[#0B0D10] overflow-hidden border-t border-forge-border-subtle"
    >
      {/* Restrained amber lighting */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, hsl(var(--brand-amber) / 0.12), transparent 70%)',
        }}
      />

      <div className="relative max-w-4xl mx-auto px-5 md:px-6 text-center">
        <span className="inline-block text-xs font-semibold uppercase tracking-[0.2em] text-forge-amber mb-5">
          Ready to build?
        </span>

        <h2 className="text-3xl md:text-5xl font-bold text-forge-text-primary tracking-tight">
          Turn the idea into something real.
        </h2>

        <p className="mt-5 text-forge-text-secondary max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
          Plan the project, work with AI, preview the result and keep control of the code — all
          inside Forge.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/projects/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-forge-amber text-forge-text-inverse font-medium text-sm hover:bg-forge-amber-dim transition-colors whitespace-nowrap cursor-pointer"
          >
            Start building
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md border border-forge-border-subtle text-forge-text-primary font-medium text-sm hover:border-forge-amber/25 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
          >
            View pricing
          </Link>
        </div>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {CONFIDENCE_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2 text-sm text-forge-text-secondary">
              <Check className="h-4 w-4 text-forge-amber" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>

        <p className="mt-6 text-[13px] text-forge-text-muted">
          Built for developers who want AI assistance without surrendering the development
          workflow.
        </p>
      </div>
    </section>
  );
}