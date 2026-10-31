import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { HERO_CONFIG } from '@/config/hero';
import type { HeroVideoStatus } from '@/components/feature/HeroVideo';

/**
 * Hero copy sits in the lower part of the hero so the wordmark in the
 * background video stays visible above it.
 *
 * The H1 is always in the page for search engines and screen readers. It is
 * drawn on screen only when the video isn't playing (reduced motion, autoplay
 * blocked, slow or failed load), because then the video's own wordmark and
 * message are missing.
 */
export function HeroContent({ videoStatus = 'pending' }: { videoStatus?: HeroVideoStatus }) {
  const showHeadline = videoStatus === 'unavailable';

  const scrollToWorkspace = () => {
    document.querySelector('#sandbox-workspace')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative z-10 flex flex-col items-center justify-end min-h-screen w-full px-5 md:px-14 lg:px-20 pt-28 pb-24 md:pb-28 text-center">
      {showHeadline ? (
        <div className="animate-hero-fade-in">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-forge-amber/30 bg-black/30 backdrop-blur-sm text-xs font-medium text-forge-amber mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-forge-amber" aria-hidden="true" />
            {HERO_CONFIG.eyebrow}
          </span>
          <h1 className="max-w-3xl mx-auto text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-white [text-wrap:balance] [text-shadow:0_2px_24px_rgba(0,0,0,0.6)]">
            {HERO_CONFIG.headline}
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-base md:text-lg leading-relaxed text-white/80 [text-wrap:pretty] [text-shadow:0_1px_12px_rgba(0,0,0,0.6)]">
            {HERO_CONFIG.description}
          </p>
        </div>
      ) : (
        <h1 className="sr-only">
          {HERO_CONFIG.headline} — {HERO_CONFIG.eyebrow}
        </h1>
      )}

      <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 ${showHeadline ? 'mt-8' : ''}`}>
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
