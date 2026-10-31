import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { HERO_CONFIG } from '@/config/hero';

/**
 * Hero copy sits in the lower part of the hero so the wordmark in the
 * background video stays visible above it. The text is real HTML (H1, CTAs)
 * so the page works for search engines, screen readers, and visitors whose
 * video never loads.
 */
export function HeroContent() {
  const scrollToWorkspace = () => {
    document.querySelector('#sandbox-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-end min-h-screen w-full px-5 md:px-14 lg:px-20 pt-28 pb-28 md:pb-32 text-center">
      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-forge-amber/30 bg-black/30 backdrop-blur-sm text-xs font-medium text-forge-amber mb-5">
        <span className="w-1.5 h-1.5 rounded-full bg-forge-amber" aria-hidden="true" />
        {HERO_CONFIG.eyebrow}
      </span>

      <h1 className="max-w-3xl text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white [text-wrap:balance]">
        {HERO_CONFIG.headline}
      </h1>

      <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-white/75 [text-wrap:pretty]">
        {HERO_CONFIG.description}
      </p>

      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/projects/new"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-forge-amber text-[#0B0D10] text-sm font-semibold whitespace-nowrap hover:bg-forge-amber/90 transition-colors"
        >
          {HERO_CONFIG.primaryCta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <button
          type="button"
          onClick={scrollToWorkspace}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-white/20 bg-black/20 backdrop-blur-sm text-white/90 text-sm font-medium whitespace-nowrap hover:border-white/40 hover:text-white transition-colors"
        >
          {HERO_CONFIG.secondaryCta}
        </button>
      </div>

      <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {HERO_CONFIG.proofPoints.map((point) => (
          <li key={point} className="flex items-center gap-2 text-sm text-white/65">
            <Check className="h-4 w-4 text-forge-amber" aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
