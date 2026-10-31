import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
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
    <div className="relative z-10 flex flex-col items-center justify-end min-h-screen w-full px-5 md:px-14 lg:px-20 pt-28 pb-24 md:pb-28 text-center">
      <h1 className="sr-only">
        {HERO_CONFIG.headline} — {HERO_CONFIG.eyebrow}
      </h1>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
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
    </div>
  );
}
